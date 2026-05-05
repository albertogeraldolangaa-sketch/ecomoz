import datetime
from datetime import time as datetime_time, date
import requests
from flask import Blueprint, jsonify, request, current_app
from sqlalchemy import or_, and_, func

# [ATUALIZADO] Adicionados StaffMember e BlogPost aos imports
from app.models import (
    Shop, Service, Product, Schedule, Booking, Order, OrderItem, 
    Review, Coupon, Quote, Buyer, Favorite, WalletTransaction, 
    ProductOption, ProductVariant, StaffMember, BlogPost
)
from app.extensions import db, socketio
from app.utils import generate_ticket_number, is_shop_open_now, haversine
from app.config import Config

# Tentativa de importar notificações Twilio se existirem, senão define função dummy
try:
    from twilio_notifications import notify_new_order
except ImportError:
    def notify_new_order(order):
        pass

bp = Blueprint('public', __name__, url_prefix='/api')

# =============================================================================
# ROTAS PÚBLICAS DA LOJA (INFO, PRODUTOS, SERVIÇOS)
# =============================================================================

@bp.route('/loja/<string:slug>/info', methods=['GET'])
def shop_info(slug):
    """Retorna informações públicas da loja, taxas e horários."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    
    # Verificar se está aberta agora
    now = datetime.datetime.now()
    dia_semana = now.weekday()
    schedule = Schedule.query.filter_by(shop_id=shop.id, dia_semana=dia_semana).first()
    
    is_open = False
    today_schedule_str = "Fechado"
    
    if schedule and schedule.esta_aberto and schedule.hora_inicio and schedule.hora_fim:
        current_time = now.time()
        try:
            start = datetime.datetime.strptime(schedule.hora_inicio, "%H:%M").time()
            end = datetime.datetime.strptime(schedule.hora_fim, "%H:%M").time()
            if start <= current_time <= end:
                is_open = True
            today_schedule_str = f"{schedule.hora_inicio} - {schedule.hora_fim}"
        except ValueError:
            pass

    # Obter configurações de pagamento
    payment_local = True
    payment_online = False
    if shop.payment:
        payment_local = shop.payment.allow_payment_local
        payment_online = shop.payment.allow_payment_online

    return jsonify({
        'id': shop.id,
        'nome': shop.nome_loja,
        'descricao': shop.descricao,
        'telefone': shop.telefone,
        'morada': shop.morada,
        'delivery_fee': shop.delivery_fee,
        'service_fee': shop.service_fee,
        'min_order_value': shop.min_order_value,
        'is_open': is_open,
        'today_schedule': today_schedule_str,
        'accepts_delivery': shop.allow_delivery,
        'accepts_takeaway': shop.allow_takeaway,
        'business_model': shop.business_model,
        'logo_url': shop.profile_image_url,
        'banner_url': shop.profile_banner_url,
        'theme_color': shop.theme_color,
        'social': {
            'whatsapp': shop.social_whatsapp,
            'instagram': shop.social_instagram,
            'facebook': shop.social_facebook
        },
        'payment_methods': {
            'local': payment_local,
            'online': payment_online
        }
    }), 200

@bp.route('/loja/<string:slug>/services', methods=['GET'])
def get_services(slug):
    """Lista serviços da loja para agendamento."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    services = []
    for s in shop.services:
        services.append({
            'id': s.id,
            'nome': s.nome,
            'duracao_min': s.duracao_min,
            'preco': s.preco,
            'payment_mode': s.payment_mode,
            'deposit_value': s.deposit_value,
            # Se tiver staff associado, pode ser útil saber, mas a lógica de staff é tratada no booking
            'requires_staff': True 
        })
    return jsonify(services), 200

@bp.route('/loja/<string:slug>/products', methods=['GET'])
def get_products(slug):
    """Lista produtos da loja."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    prods = []
    for p in shop.products:
        prods.append({
            'id': p.id, 
            'nome': p.nome, 
            'descricao': p.descricao,
            'preco': p.preco, 
            'image_url': p.image_url,
            'product_type': p.product_type, 
            'payment_mode': p.payment_mode,
            'deposit_value': p.deposit_value
        })
    return jsonify(prods), 200

@bp.route('/loja/<string:slug>/products/<int:id>/details', methods=['GET'])
def product_details(slug, id):
    """Retorna detalhes complexos de um produto (variantes e opções)."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    product = Product.query.filter_by(id=id, shop_id=shop.id).first_or_404()
    
    options = [{'id': o.id, 'name': o.name, 'values': [{'id': v.id, 'value': v.value} for v in o.values]} for o in product.options]
    
    variants = []
    for v in product.variants:
        variants.append({
            'id': v.id, 
            'preco': v.preco, 
            'stock': v.stock, 
            'sku': v.sku,
            'option_value_ids': [ov.id for ov in v.option_values],
            'name': " / ".join([ov.value for ov in v.option_values])
        })
    
    return jsonify({
        'id': product.id, 
        'nome': product.nome, 
        'descricao': product.descricao,
        'image_url': product.image_url,
        'product_type': product.product_type,
        'payment_mode': product.payment_mode,
        'deposit_value': product.deposit_value,
        'options': options, 
        'variants': variants
    }), 200

# [NOVO] Rota para Staff (Equipa)
@bp.route('/loja/<string:slug>/staff', methods=['GET'])
def get_public_staff(slug):
    """Lista membros da equipa disponíveis para agendamento."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    staff_members = []
    
    for member in shop.staff_members:
        staff_members.append({
            'id': member.id,
            'name': member.name,
            'title': member.title,
            'avatar_url': member.avatar_url
        })
        
    return jsonify(staff_members), 200

# [NOVO] Rota para Blog
@bp.route('/loja/<string:slug>/blog', methods=['GET'])
def get_public_blog_posts(slug):
    """Lista posts do blog publicados."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    
    # Filtrar apenas posts publicados
    posts = BlogPost.query.filter_by(shop_id=shop.id, is_published=True)\
            .order_by(BlogPost.created_at.desc()).all()
            
    blog_data = []
    for post in posts:
        # Criar um excerto (resumo) se não houver um campo específico
        excerpt = post.content[:150] + '...' if post.content and len(post.content) > 150 else (post.content or "")
        
        blog_data.append({
            'id': post.id,
            'title': post.title,
            'excerpt': excerpt,
            'content': post.content, # Conteúdo completo para o modal
            'image_url': post.image_url,
            'created_at': post.created_at.isoformat(),
            'author': shop.nome_loja # Ou nome do autor se implementado
        })
        
    return jsonify(blog_data), 200

# =============================================================================
# AGENDAMENTO E DISPONIBILIDADE
# =============================================================================

@bp.route('/loja/<string:slug>/availability', methods=['GET'])
def get_availability(slug):
    """Calcula horários disponíveis para agendamento."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    date_str = request.args.get('date')
    service_id = request.args.get('service_id')
    staff_id = request.args.get('staff_id')
    
    if not date_str:
        return jsonify({'error': 'Data obrigatória'}), 400
    
    try:
        duration_min = 30
        if service_id:
            service = Service.query.get(service_id)
            if service:
                duration_min = service.duracao_min
        
        target_date = datetime.date.fromisoformat(date_str)
        dia_semana = target_date.weekday()
        
        schedule = Schedule.query.filter_by(shop_id=shop.id, dia_semana=dia_semana).first()
        if not schedule or not schedule.esta_aberto or not schedule.hora_inicio or not schedule.hora_fim:
            return jsonify([]), 200

        start_time = datetime.datetime.strptime(schedule.hora_inicio, "%H:%M").time()
        end_time = datetime.datetime.strptime(schedule.hora_fim, "%H:%M").time()
        
        start_of_day = datetime.datetime.combine(target_date, datetime_time.min)
        end_of_day = start_of_day + datetime.timedelta(days=1)
        
        # Buscar marcações existentes
        bookings_query = Booking.query.filter(
            Booking.shop_id == shop.id,
            Booking.data_hora_inicio >= start_of_day,
            Booking.data_hora_inicio < end_of_day,
            Booking.status.in_(['Pendente', 'Confirmado', 'Aguardando Pagamento'])
        )
        
        if staff_id and staff_id != 'any':
            bookings_query = bookings_query.filter(Booking.staff_id == staff_id)
        
        existing_bookings = bookings_query.all()
        
        occupied_slots = set()
        for booking in existing_bookings:
            # Simplificação: ocupar os minutos do dia
            start_minutes = booking.data_hora_inicio.hour * 60 + booking.data_hora_inicio.minute
            end_minutes = booking.data_hora_fim.hour * 60 + booking.data_hora_fim.minute
            for i in range(start_minutes, end_minutes):
                occupied_slots.add(i)

        available_slots = []
        current_time = datetime.datetime.combine(target_date, start_time)
        end_datetime = datetime.datetime.combine(target_date, end_time)
        now = datetime.datetime.now()
        
        # Gerar slots de 15 em 15 minutos (ou baseado na duração)
        step_minutes = 15 
        
        while current_time + datetime.timedelta(minutes=duration_min) <= end_datetime:
            slot_start_time = current_time
            slot_end_time = current_time + datetime.timedelta(minutes=duration_min)
            
            # Ignorar passado
            if slot_start_time < now:
                current_time += datetime.timedelta(minutes=step_minutes)
                continue
            
            is_occupied = False
            slot_start_minutes = slot_start_time.hour * 60 + slot_start_time.minute
            slot_end_minutes = slot_end_time.hour * 60 + slot_end_time.minute
            
            # Verificar colisão
            for i in range(slot_start_minutes, slot_end_minutes):
                if i in occupied_slots:
                    is_occupied = True
                    break
            
            if not is_occupied:
                available_slots.append(slot_start_time.strftime('%H:%M'))
            
            current_time += datetime.timedelta(minutes=step_minutes)

        return jsonify(available_slots), 200
        
    except Exception as e:
        print(f"Erro ao calcular horários: {str(e)}")
        return jsonify({'error': f'Erro ao calcular horários: {str(e)}'}), 500

@bp.route('/loja/<string:slug>/book', methods=['POST'])
def create_booking(slug):
    """Cria uma nova marcação."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    if shop.business_model != 'agendamento':
        return jsonify({'error': 'Esta loja não aceita agendamentos.'}), 403
        
    data = request.get_json()
    
    # Validar campos obrigatórios
    if not data.get('nome') or not data.get('telefone') or not data.get('data_hora'):
        return jsonify({'error': 'Dados incompletos.'}), 400

    try:
        payment_method = data.get('payment_method', 'local')
        staff_id = data.get('staff_id')
        buyer_id = data.get('buyer_id')
        service_id = data.get('service_id')
        product_id = data.get('product_id') # Possível agendar produto (ex: aluguer)
        
        item_nome = ""
        total_price = 0.0
        duration_min = 30
        amount_to_charge_online = 0.0
        item_to_book = None
        
        if service_id:
            service = Service.query.get(service_id)
            if not service: return jsonify({'error': 'Serviço não encontrado.'}), 404
            item_nome = service.nome
            total_price = service.preco
            duration_min = service.duracao_min
            item_to_book = service
        elif product_id:
             # Fallback para produtos agendáveis
             product = Product.query.get(product_id)
             if not product: return jsonify({'error': 'Produto não encontrado.'}), 404
             item_nome = product.nome
             total_price = product.preco
             item_to_book = product
        else:
            return jsonify({'error': 'Nenhum serviço selecionado.'}), 400

        # Lógica de Depósito
        if item_to_book.payment_mode == 'deposito' and item_to_book.deposit_value > 0:
            amount_to_charge_online = item_to_book.deposit_value
        else:
            amount_to_charge_online = total_price

        data_hora_inicio = datetime.datetime.fromisoformat(data['data_hora'])
        data_hora_fim = data_hora_inicio + datetime.timedelta(minutes=duration_min)
        
        new_ticket_number = generate_ticket_number(shop.id)

        # Estado inicial baseado no pagamento
        payment_settings = shop.payment
        allow_online = payment_settings.allow_payment_online if payment_settings else False
        
        if payment_method == 'online' and allow_online:
            initial_status = 'Aguardando Pagamento'
            initial_payout_status = 'Pendente'
        else:
            initial_status = 'Pendente'
            initial_payout_status = 'N/A'

        # Buscar dados do Buyer se logado
        nome_cliente = data['nome']
        telefone_cliente = data['telefone']
        email_cliente = data.get('email')
        
        if buyer_id:
            buyer = Buyer.query.get(buyer_id)
            if buyer:
                # Prioridade aos dados do formulário, mas linka ao buyer
                pass 

        new_booking = Booking(
            nome_cliente=nome_cliente, 
            email_cliente=email_cliente, 
            telefone_cliente=telefone_cliente,
            data_hora_inicio=data_hora_inicio, 
            data_hora_fim=data_hora_fim, 
            status=initial_status,
            payout_status=initial_payout_status, 
            ticket_number=new_ticket_number,
            total_price=total_price,
            shop_id=shop.id,
            service_id=service_id,
            staff_id=staff_id if staff_id and staff_id != 'any' else None,
            buyer_id=buyer_id
        )
        db.session.add(new_booking)
        db.session.commit()
        
        # Notificação SocketIO para o Dashboard
        socketio.emit('new_booking', {'ticket_number': new_ticket_number, 'shop_id': shop.id}, room=f"shop_{shop.id}")

        # Processar Pagamento Online (PaySuite)
        if payment_method == 'online' and allow_online:
            if not Config.ADMIN_PAYSUITE_API_KEY:
                return jsonify({'error': 'Configuração de pagamentos em falta no servidor.'}), 500
                
            payload = {
                "amount": str(amount_to_charge_online),
                "reference": new_booking.ticket_number,
                "description": f"{shop.nome_loja}: {item_nome}",
                "return_url": f"{request.host_url}loja/{shop.slug}",
                "callback_url": f"{request.host_url}api/webhook-paysuite"
            }
            headers = {"Authorization": f"Bearer {Config.ADMIN_PAYSUITE_API_KEY}", "Content-Type": "application/json", "Accept": "application/json"}
            
            try:
                response = requests.post("https://paysuite.tech/api/v1/payments", json=payload, headers=headers, timeout=15)
                response_data = response.json()
                
                if response.status_code == 201 and response_data.get('status') == 'success':
                    return jsonify({'action': 'redirect_to_payment', 'checkout_url': response_data['data']['checkout_url']}), 201
                else:
                    # Reverter em caso de erro no gateway
                    db.session.delete(new_booking)
                    db.session.commit()
                    return jsonify({'error': f"Erro do gateway: {response_data.get('message')}"}), 500
            except Exception as e:
                db.session.delete(new_booking)
                db.session.commit()
                return jsonify({'error': f'Erro de conexão: {str(e)}'}), 500
        else:
            # Sucesso Imediato (Pagamento Local)
            return jsonify({
                'action': 'show_success_page',
                'booking': {
                    'id': new_booking.id,
                    'ticket_number': new_booking.ticket_number, 
                    'item_nome': item_nome,
                    'data_hora': new_booking.data_hora_inicio.isoformat(), 
                    'status': new_booking.status
                }
            }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao criar marcação: {str(e)}'}), 500

# =============================================================================
# ENCOMENDAS E CHECKOUT (DELIVERY)
# =============================================================================

@bp.route('/loja/<string:slug>/create-order', methods=['POST'])
def create_order(slug):
    """Cria uma nova encomenda."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    if shop.business_model != 'delivery':
        return jsonify({'error': 'Esta loja não aceita encomendas.'}), 403
        
    data = request.get_json()
    buyer_id = data.get('buyer_id')
    cart = data.get('cart', [])
    
    if not cart:
        return jsonify({'error': 'Carrinho vazio.'}), 400

    try:
        payment_method = data.get('payment_method', 'local')
        payment_settings = shop.payment
        allow_online = payment_settings.allow_payment_online if payment_settings else False
        
        total_price = 0.0
        amount_to_charge_online = 0.0
        order_items_to_create = []

        # Processar itens do carrinho
        for item in cart:
            product = Product.query.get(item['id'])
            if not product: continue
            
            # Se tiver variante
            unit_price = product.preco
            variant_id = item.get('variant_id') # Novo: suporte a variantes
            if variant_id:
                variant = ProductVariant.query.get(variant_id)
                if variant:
                    unit_price = variant.preco
            
            qty = int(item['qty'])
            item_total = unit_price * qty
            total_price += item_total
            
            # Lógica de depósito
            if product.payment_mode == 'deposito' and product.deposit_value > 0:
                amount_to_charge_online += (product.deposit_value * qty)
            else:
                amount_to_charge_online += item_total

            order_items_to_create.append(OrderItem(
                product_id=product.id,
                product_name=product.nome + (f" ({item.get('variant_name')})" if item.get('variant_name') else ""),
                quantity=qty,
                unit_price=unit_price,
                product_variant_id=variant_id
            ))
            
        # Aplicar Taxa de Entrega se aplicável
        delivery_fee = 0
        if data.get('order_type') == 'delivery':
             # Se já foi calculado no frontend/API, usar? Idealmente recalcular.
             # Por simplicidade, usamos a base da loja + cálculo simples se coords presentes
             delivery_fee = shop.delivery_fee
             # Poderíamos chamar calculate_delivery_fee aqui, mas assumimos que o cliente aceitou
             # Vamos somar ao total
             total_price += delivery_fee
             amount_to_charge_online += delivery_fee

        # Aplicar Cupão
        coupon_code = data.get('coupon')
        if coupon_code:
            coupon = Coupon.query.filter_by(shop_id=shop.id, code=coupon_code).first()
            if coupon and (coupon.usage_limit == 0 or coupon.usage_count < coupon.usage_limit):
                discount = 0
                if coupon.type == 'percent':
                    discount = (coupon.value / 100) * total_price
                else:
                    discount = coupon.value
                
                # Desconto não pode ser maior que total
                discount = min(discount, total_price)
                total_price -= discount
                amount_to_charge_online -= discount # Desconto aplica-se ao online também
                if amount_to_charge_online < 0: amount_to_charge_online = 0
                
                coupon.usage_count += 1

        new_ticket_number = generate_ticket_number(shop.id)

        initial_status = 'Aguardando Pagamento' if (payment_method == 'online' and allow_online) else 'Pendente'
        
        new_order = Order(
            shop_id=shop.id,
            ticket_number=new_ticket_number,
            nome_cliente=data['customer']['nome'],
            telefone_cliente=data['customer']['telefone'],
            order_type=data.get('order_type', 'takeaway'),
            delivery_address=data.get('address'),
            total_price=total_price,
            amount_paid=amount_to_charge_online if payment_method == 'online' else 0.0,
            status=initial_status,
            payout_status='Pendente' if payment_method == 'online' else 'N/A',
            buyer_id=buyer_id
        )
        
        db.session.add(new_order)
        for item_obj in order_items_to_create:
            new_order.items.append(item_obj)
            
        db.session.commit()

        # Notificações
        notify_new_order(new_order) # SMS
        socketio.emit('new_order', {'ticket_number': new_ticket_number, 'shop_id': shop.id}, room=f"shop_{shop.id}")

        # Pagamento Online
        if payment_method == 'online' and allow_online:
             if not Config.ADMIN_PAYSUITE_API_KEY:
                return jsonify({'error': 'Erro configuração servidor.'}), 500
                
             payload = {
                "amount": str(amount_to_charge_online),
                "reference": new_ticket_number,
                "description": f"Enc. {shop.nome_loja} ({new_ticket_number})",
                "return_url": f"{request.host_url}loja/{shop.slug}",
                "callback_url": f"{request.host_url}api/webhook-paysuite"
             }
             headers = {"Authorization": f"Bearer {Config.ADMIN_PAYSUITE_API_KEY}", "Content-Type": "application/json", "Accept": "application/json"}
             
             try:
                response = requests.post("https://paysuite.tech/api/v1/payments", json=payload, headers=headers, timeout=15)
                response_data = response.json()
                
                if response.status_code == 201 and response_data.get('status') == 'success':
                    return jsonify({'action': 'redirect_to_payment', 'checkout_url': response_data['data']['checkout_url']}), 201
                else:
                    db.session.delete(new_order)
                    db.session.commit()
                    return jsonify({'error': f"Erro gateway: {response_data.get('message')}"}), 500
             except Exception as e:
                db.session.delete(new_order)
                db.session.commit()
                return jsonify({'error': str(e)}), 500
        
        else:
            return jsonify({
                'action': 'show_success_page',
                'order': {
                    'id': new_order.id,
                    'ticket_number': new_ticket_number,
                    'item_nome': f"{len(cart)} itens",
                    'status': new_order.status
                }
            }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao criar encomenda: {str(e)}'}), 500

@bp.route('/loja/<string:slug>/calculate-delivery', methods=['POST'])
def calculate_delivery_fee(slug):
    """Calcula taxa de entrega baseada na distância."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    data = request.get_json()
    
    client_lat = data.get('lat')
    client_lng = data.get('lng')
    
    base_fee = shop.delivery_fee
    
    if not shop.latitude or not shop.longitude or not client_lat:
        return jsonify({'fee': base_fee}), 200
        
    try:
        distance = haversine(shop.latitude, shop.longitude, float(client_lat), float(client_lng))
        # Exemplo: Base + 10 MZN por Km
        fee = base_fee + (distance * 10)
        return jsonify({'distance_km': round(distance, 2), 'fee': round(fee, 2)}), 200
    except:
        return jsonify({'fee': base_fee}), 200

@bp.route('/loja/<string:slug>/validate-coupon', methods=['POST'])
def validate_coupon(slug):
    """Verifica se um cupão é válido."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    data = request.get_json()
    code = data.get('code', '').upper()
    cart_total = float(data.get('cart_total', 0))
    
    coupon = Coupon.query.filter_by(shop_id=shop.id, code=code).first()
    
    if not coupon:
        return jsonify({'valid': False, 'message': 'Cupão inválido.'}), 200
        
    if coupon.usage_limit > 0 and coupon.usage_count >= coupon.usage_limit:
        return jsonify({'valid': False, 'message': 'Limite de usos atingido.'}), 200
    
    discount_amount = 0
    if coupon.type == 'percent':
        discount_amount = (coupon.value / 100) * cart_total
    else:
        discount_amount = coupon.value
        
    discount_amount = min(discount_amount, cart_total)
    
    return jsonify({
        'valid': True,
        'discount_amount': discount_amount,
        'message': f'Desconto de {discount_amount:.2f} MZN aplicado!'
    }), 200

@bp.route('/loja/<string:slug>/cancel', methods=['POST'])
def cancel_booking(slug):
    """Permite ao cliente cancelar uma marcação pendente."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    data = request.get_json()
    ticket_number = data.get('ticket_number')
    
    booking = Booking.query.filter_by(shop_id=shop.id, ticket_number=ticket_number).first()
    order = Order.query.filter_by(shop_id=shop.id, ticket_number=ticket_number).first()
    
    item = booking or order
    
    if not item:
        return jsonify({'error': 'Ticket não encontrado.'}), 404
        
    if item.status != 'Pendente' and item.status != 'Aguardando Pagamento':
        return jsonify({'error': 'Apenas itens pendentes podem ser cancelados.'}), 403
        
    item.status = 'Cancelado'
    db.session.commit()
    
    return jsonify({'message': 'Cancelado com sucesso.'}), 200

# =============================================================================
# AVALIAÇÕES, ORÇAMENTOS E OUTROS
# =============================================================================

@bp.route('/loja/<string:slug>/reviews', methods=['GET'])
def get_public_reviews(slug):
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    reviews = Review.query.filter_by(shop_id=shop.id, is_published=True).order_by(Review.created_at.desc()).all()
    return jsonify([{
        'id': r.id, 'client_name': r.client_name, 'rating': r.rating, 
        'text': r.text, 'reply': r.reply, 'created_at': r.created_at.isoformat()
    } for r in reviews]), 200

@bp.route('/loja/<string:slug>/reviews/add', methods=['POST'])
def add_public_review(slug):
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    data = request.get_json()
    
    if not data.get('rating') or not data.get('client_name'):
        return jsonify({'error': 'Dados insuficientes.'}), 400
        
    review = Review(
        shop_id=shop.id,
        client_name=data['client_name'],
        rating=int(data['rating']),
        text=data.get('text', ''),
        is_published=True # Publicação automática (pode mudar para False se quiser moderação)
    )
    db.session.add(review)
    db.session.commit()
    
    socketio.emit('new_review', {'message': 'Nova avaliação!'}, room=f"shop_{shop.id}")
    return jsonify({'message': 'Obrigado pela avaliação!'}), 201

@bp.route('/loja/<string:slug>/create-quote', methods=['POST'])
def create_quote(slug):
    """Envia um pedido de orçamento."""
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    data = request.get_json()
    
    quote = Quote(
        shop_id=shop.id,
        nome_cliente=data.get('nome'),
        telefone_cliente=data.get('telefone'),
        details=data.get('details'),
        is_read=False
    )
    db.session.add(quote)
    db.session.commit()
    
    socketio.emit('new_quote', {'id': quote.id}, room=f"shop_{shop.id}")
    return jsonify({'message': 'Pedido enviado com sucesso!'}), 201

# =============================================================================
# ROTAS DO COMPRADOR (BUYER)
# Inseridas aqui para completar a API pública da app cliente
# =============================================================================

@bp.route('/buyer/favorites/toggle', methods=['POST'])
def toggle_favorite():
    data = request.get_json()
    buyer_id = data.get('buyer_id')
    
    if not buyer_id: return jsonify({'error': 'Login necessário'}), 401
    
    product_id = data.get('product_id')
    shop_id = data.get('shop_id')
    
    fav = None
    if product_id:
        fav = Favorite.query.filter_by(buyer_id=buyer_id, product_id=product_id).first()
        if fav:
            db.session.delete(fav)
            action = 'removed'
        else:
            new_fav = Favorite(buyer_id=buyer_id, product_id=product_id)
            db.session.add(new_fav)
            action = 'added'
    elif shop_id:
        fav = Favorite.query.filter_by(buyer_id=buyer_id, shop_id=shop_id).first()
        if fav:
            db.session.delete(fav)
            action = 'removed'
        else:
            new_fav = Favorite(buyer_id=buyer_id, shop_id=shop_id)
            db.session.add(new_fav)
            action = 'added'
    else:
        return jsonify({'error': 'Alvo inválido'}), 400
        
    db.session.commit()
    return jsonify({'status': 'success', 'action': action}), 200

@bp.route('/buyer/<int:buyer_id>/favorites', methods=['GET'])
def get_favorites(buyer_id):
    favs = Favorite.query.filter_by(buyer_id=buyer_id).all()
    products = []
    shops = []
    for f in favs:
        if f.product_id:
            p = Product.query.get(f.product_id)
            if p: products.append({'id': p.id, 'nome': p.nome, 'preco': p.preco, 'image': p.image_url, 'shop_slug': p.shop.slug})
        elif f.shop_id:
            s = Shop.query.get(f.shop_id)
            if s: shops.append({'id': s.id, 'nome': s.nome_loja, 'logo': s.profile_image_url, 'slug': s.slug})
            
    return jsonify({'products': products, 'shops': shops}), 200

@bp.route('/buyer/<int:buyer_id>/history', methods=['GET'])
def get_buyer_history(buyer_id):
    """Histórico unificado de bookings e orders."""
    buyer = Buyer.query.get_or_404(buyer_id)
    
    bookings = Booking.query.filter_by(buyer_id=buyer_id).order_by(Booking.data_hora_inicio.desc()).all()
    orders = Order.query.filter_by(buyer_id=buyer_id).order_by(Order.created_at.desc()).all()
    
    history = []
    for b in bookings:
        history.append({
            'type': 'booking',
            'id': b.id,
            'ticket': b.ticket_number,
            'shop_name': b.shop.nome_loja,
            'item': b.service.nome if b.service else 'Serviço',
            'date': b.data_hora_inicio.isoformat(),
            'status': b.status,
            'total': b.total_price
        })
    for o in orders:
        item_name = o.items[0].product_name if o.items else 'Produto'
        history.append({
            'type': 'order',
            'id': o.id,
            'ticket': o.ticket_number,
            'shop_name': o.shop.nome_loja,
            'item': item_name,
            'date': o.created_at.isoformat(),
            'status': o.status,
            'total': o.total_price
        })
        
    # Ordenar por data (recente primeiro)
    history.sort(key=lambda x: x['date'], reverse=True)
    
    return jsonify({'buyer': buyer.nome, 'history': history}), 200