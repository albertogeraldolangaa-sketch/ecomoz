import os
import requests
import base64
import logging
from datetime import datetime

# Configurar Logger para erros
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_smsportal_token():
    """
    Autentica na API do SMSPortal e retorna o Bearer Token.
    """
    client_id = os.environ.get('SMSPORTAL_CLIENT_ID')
    secret = os.environ.get('SMSPORTAL_SECRET')
    
    if not client_id or not secret:
        logger.warning("Credenciais SMSPortal não encontradas no .env")
        return None
    
    auth_str = f"{client_id}:{secret}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    
    try:
        response = requests.get(
            "https://rest.smsportal.com/v1/Authentication",
            headers={"Authorization": f"Basic {b64_auth}"},
            timeout=10
        )
        
        if response.status_code == 200:
            return response.json().get('token')
        else:
            logger.error(f"Erro autenticação SMSPortal: {response.text}")
            return None
    except Exception as e:
        logger.error(f"Exceção na autenticação SMSPortal: {str(e)}")
        return None

def send_sms(to_number, body_text):
    """
    Função genérica para enviar um único SMS via SMSPortal.
    """
    # ====================================================================
    #  IMPRESSÃO NO TERMINAL (CONSOLE)
    # ====================================================================
    print("\n" + "="*40)
    print(f"📨  [SIMULAÇÃO DE SMS]")
    print(f"📞  Para: {to_number}")
    print(f"📝  Mensagem: {body_text}")
    print("="*40 + "\n")
    # ====================================================================

    token = get_smsportal_token()
    
    # Se não houver token (ex: em desenvolvimento local sem credenciais),
    # retornamos True para o sistema achar que enviou e não dar erro.
    if not token:
        logger.info("Token não obtido. SMS apenas impresso no terminal.")
        return True

    # Normalizar número
    clean_number = to_number.replace('+', '')

    payload = {
        "messages": [
            {
                "content": body_text,
                "destination": clean_number
            }
        ]
    }

    try:
        response = requests.post(
            "https://rest.smsportal.com/v1/BulkMessages",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        
        if response.status_code == 200:
            logger.info(f"SMS enviado para {to_number}")
            return True
        else:
            logger.error(f"Erro ao enviar SMS para {to_number}: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Exceção ao enviar SMS para {to_number}: {str(e)}")
        return False

def notify_new_order(order):
    """
    Envia notificações de nova encomenda para o Lojista e para o Cliente.
    Recebe um objeto 'Order' (do SQLAlchemy).
    """
    try:
        # --- 1. Preparar Dados ---
        shop = order.shop
        
        # Formatar data e hora (Ex: 25/10/2023 14:30)
        data_hora = order.created_at.strftime('%d/%m/%Y às %H:%M')
        
        # Formatar lista de produtos
        product_names = [f"{item.product_name} (x{item.quantity})" for item in order.items]
        products_str = ", ".join(product_names)
        
        # Localização (Link Google Maps Clicável)
        coords_link = ""
        if order.delivery_lat and order.delivery_lng:
            # Cria um link direto para o Google Maps
            coords_link = f" Mapa: http://maps.google.com/?q={order.delivery_lat},{order.delivery_lng}"
            
        distrito = order.delivery_address or "Local não especificado"
        valor = f"{order.total_price:.2f} MZN"

        # --- 2. Mensagem para o LOJISTA ---
        if shop.telefone:
            msg_lojista = (
                f"Nova Venda! {valor}. "
                f"Cliente: {order.nome_cliente} ({order.telefone_cliente}). "
                f"Items: {products_str}. "
                f"Local: {distrito}.{coords_link}"
            )
            # Cortar mensagem se for muito longa
            if len(msg_lojista) > 160 and not coords_link: 
                msg_lojista = msg_lojista[:157] + "..."
                
            send_sms(shop.telefone, msg_lojista)
        else:
            logger.warning(f"Loja {shop.id} sem telefone configurado para notificações.")

        # --- 3. Mensagem para o CLIENTE ---
        if order.telefone_cliente:
            msg_cliente = (
                f"Ola {order.nome_cliente}. Compra confirmada na {shop.nome_loja}. "
                f"Valor: {valor}. "
                f"Duvidas ligue: {shop.telefone}."
            )
            send_sms(order.telefone_cliente, msg_cliente)
        
        return True

    except Exception as e:
        logger.error(f"Erro ao processar notificações da encomenda {order.ticket_number}: {str(e)}")
        return False