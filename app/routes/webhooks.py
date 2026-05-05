import hmac
import hashlib
import requests
from flask import Blueprint, request, jsonify
from app.config import Config
from app.extensions import db
from app.models import Order, Booking, WalletTransaction

bp = Blueprint('webhooks', __name__, url_prefix='/api')

def call_payout_api(shop, amount, reference):
    """
    Processa o pagamento automático ao lojista (Payout) via API externa.
    """
    if not Config.ADMIN_PAYSUITE_API_KEY:
        print("ERRO PAYOUT: Chave API Admin não definida")
        return False
        
    payout_details = shop.payment
    if not payout_details or not payout_details.payout_number:
        print(f"ERRO PAYOUT: Loja {shop.id} não tem número de payout.")
        return False
        
    payout_payload = {
        "network": payout_details.payout_method,
        "recipient": payout_details.payout_number,
        "amount": str(amount),
        "reference": f"PAYOUT{reference}",
        "description": f"Pagamento da sua marcação/venda {reference}"
    }
    
    headers = {
        "Authorization": f"Bearer {Config.ADMIN_PAYSUITE_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    payout_url = "https://paysuite.tech/api/v1/payouts"
    
    try:
        response = requests.post(payout_url, json=payout_payload, headers=headers, timeout=15)
        response_data = response.json()
        
        if response.status_code == 201 and response_data.get('status') == 'success':
            print(f"PAYOUT BEM-SUCEDIDO: {amount} para {payout_details.payout_number} (Ref: {reference})")
            return True
        else:
            print(f"ERRO PAYOUT (API): {response.status_code} - {response_data.get('message')}")
            return False
            
    except Exception as e:
        print(f"EXCEÇÃO PAYOUT (Loja {shop.id}): {str(e)}")
        return False

@bp.route('/webhook-paysuite', methods=['POST'])
def paysuite_webhook():
    """
    Endpoint que recebe notificações da gateway de pagamento.
    Valida a assinatura e atualiza o estado das transações.
    """
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.data
    
    # 1. Validações de Segurança
    if not signature:
        return jsonify({'error': 'Cabeçalho de assinatura em falta'}), 400
        
    if not Config.PAYSUITE_WEBHOOK_SECRET:
        print("ERRO CRÍTICO: PAYSUITE_WEBHOOK_SECRET não definido no .env")
        return jsonify({'error': 'Webhook não configurado no servidor'}), 500
        
    try:
        # Recalcula a assinatura para garantir que o pedido veio da PaySuite
        calculated_signature = hmac.new(
            Config.PAYSUITE_WEBHOOK_SECRET.encode('utf-8'), 
            payload, 
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(calculated_signature, signature):
            return jsonify({'error': 'Assinatura inválida'}), 401
            
    except Exception as e:
        return jsonify({'error': f'Erro na validação da assinatura: {str(e)}'}), 500
        
    # 2. Processamento do Evento
    try:
        data = request.get_json()
        event_type = data.get('event')
        reference = data['data']['reference'] # Ticket number ou WALLET-ID
        
        # --- CASO A: PAGAMENTO BEM-SUCEDIDO ---
        if event_type == 'payment.success':
            amount_paid_online = float(data['data']['amount'])
            
            # 2.1. Verificar se é um carregamento de Carteira
            if reference.startswith('WALLET-'):
                try:
                    trans_id = int(reference.split('-')[1])
                    transaction = WalletTransaction.query.get(trans_id)
                    
                    if transaction and transaction.status == 'pending':
                        transaction.status = 'completed'
                        transaction.description = 'Carregamento de Carteira (Confirmado)'
                        db.session.commit()
                        print(f"WEBHOOK: Carteira carregada. Ref: {reference}")
                    elif not transaction:
                        print(f"WEBHOOK AVISO: Transação de carteira não encontrada: {reference}")
                except Exception as e:
                    print(f"WEBHOOK ERRO (Wallet): {str(e)}")
            
            # 2.2. Verificar se é uma Encomenda ou Marcação
            else:
                order = Order.query.filter_by(ticket_number=reference).first()
                booking = Booking.query.filter_by(ticket_number=reference).first()

                item_to_process = None
                
                # Identificar qual o tipo de item e se está à espera de pagamento
                if order and order.status == 'Aguardando Pagamento':
                    order.status = 'Pendente' # Passa a Pendente para o lojista aceitar/preparar
                    item_to_process = order
                elif booking and booking.status == 'Aguardando Pagamento':
                    booking.status = 'Confirmado' # Marcações online geralmente auto-confirmam o slot
                    item_to_process = booking
                
                if item_to_process:
                    # Lógica de Comissão e Split de Pagamento
                    commission_rate = 0.10 # 10% comissão da plataforma (exemplo)
                    
                    commission = amount_paid_online * commission_rate
                    payout_amount = amount_paid_online - commission
                    
                    item_to_process.commission_amount = commission
                    
                    # Tentar enviar o dinheiro para o lojista (M-Pesa/Banco)
                    try:
                        payout_success = call_payout_api(item_to_process.shop, payout_amount, item_to_process.ticket_number)
                        if payout_success:
                            item_to_process.payout_status = 'Pago'
                        else:
                            item_to_process.payout_status = 'Falhado (API Payout)'
                            # TODO: Adicionar lógica de retentativa ou crédito na carteira virtual
                    except Exception as e:
                        print(f"Erro na API de Payout: {str(e)}")
                        item_to_process.payout_status = 'Falhado (Exceção)'
                    
                    db.session.commit()
                    print(f"WEBHOOK: Pedido {reference} processado com sucesso.")

        # --- CASO B: PAGAMENTO FALHADO ---
        elif event_type == 'payment.failed':
            
            # 2.1 Falha na Carteira
            if reference.startswith('WALLET-'):
                try:
                    trans_id = int(reference.split('-')[1])
                    transaction = WalletTransaction.query.get(trans_id)
                    if transaction and transaction.status == 'pending':
                        transaction.status = 'failed'
                        transaction.description = 'Falha no Carregamento'
                        db.session.commit()
                except: pass
            
            # 2.2 Falha no Pedido
            else:
                order = Order.query.filter_by(ticket_number=reference).first()
                booking = Booking.query.filter_by(ticket_number=reference).first()
                
                if order and order.status == 'Aguardando Pagamento':
                    order.status = 'Cancelado'
                    order.payout_status = 'Falhado'
                    db.session.commit()
                elif booking and booking.status == 'Aguardando Pagamento':
                    booking.status = 'Cancelado'
                    booking.payout_status = 'Falhado'
                    db.session.commit()

        return jsonify({'status': 'received'}), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"WEBHOOK ERRO GERAL: {str(e)}")
        return jsonify({'error': f'Erro de processamento interno: {str(e)}'}), 500