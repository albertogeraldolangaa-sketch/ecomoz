from flask import Blueprint, request, jsonify
from sqlalchemy import or_, func, desc
from app.models import ShopCategory, Shop, Product, ShopVisit, Booking, Order, Schedule
from app.utils import calculate_shop_rating, is_shop_open_now
import datetime

# Criação do Blueprint
bp = Blueprint('marketplace', __name__, url_prefix='/api')

# =============================================================================
# API: MARKETPLACE GLOBAL & CATEGORIAS
# =============================================================================

@bp.route('/global/categories', methods=['GET'])
def api_get_global_categories():
    """
    Retorna todas as categorias globais para dropdowns (ex: no Dashboard).
    """
    cats = ShopCategory.query.all()
    return jsonify([{'id': c.id, 'name': c.name, 'icon': c.icon} for c in cats]), 200

@bp.route('/marketplace/categories', methods=['GET'])
def api_get_marketplace_categories():
    """
    Retorna categorias com contagem de lojas para a página principal do Marketplace.
    """
    categories = ShopCategory.query.all()
    return jsonify({
        'categories': [{
            'id': cat.id,
            'name': cat.name,
            'icon': cat.icon,
            'shop_count': Shop.query.filter_by(shop_category_id=cat.id).count(),
            'slug': cat.name.lower().replace(' ', '-')
        } for cat in categories]
    }), 200

@bp.route('/marketplace/shops', methods=['GET'])
def api_get_marketplace_shops():
    """
    Lista lojas do marketplace com filtros (pesquisa, categoria, ordenação).
    Apenas lojas com status 'Verificado' são listadas.
    """
    search_query = request.args.get('search', '')
    category_id = request.args.get('category_id')
    sort_by = request.args.get('sort', 'popular')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 12))
    
    # Filtro base: Apenas lojas verificadas
    query = Shop.query.filter_by(verification_status='Verificado')
    
    # Filtro por Categoria
    if category_id:
        query = query.filter_by(shop_category_id=category_id)
    
    # Filtro de Pesquisa (Nome ou Descrição)
    if search_query:
        search_term = f"%{search_query}%"
        query = query.filter(
            or_(
                Shop.nome_loja.ilike(search_term),
                Shop.descricao.ilike(search_term)
            )
        )
    
    # Ordenação
    if sort_by == 'new':
        query = query.order_by(Shop.id.desc())
    elif sort_by == 'name':
        query = query.order_by(Shop.nome_loja.asc())
    else:
        # Popularidade (default) - poderia ser baseado em reviews ou visitas
        query = query.order_by(Shop.id.desc())
    
    # Paginação
    shops = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'shops': [{
            'id': shop.id,
            'nome': shop.nome_loja,
            'slug': shop.slug,
            'descricao': shop.descricao,
            'logo_url': shop.profile_image_url or '/static/images/default-shop.png',
            'banner_url': shop.profile_banner_url,
            'categoria': shop.category.name if shop.category else 'Geral',
            'rating': calculate_shop_rating(shop.id),
            'review_count': len(shop.reviews),
            'is_open': is_shop_open_now(shop.id)
        } for shop in shops.items],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': shops.total,
            'pages': shops.pages
        }
    }), 200

@bp.route('/marketplace/shops/<string:slug>', methods=['GET'])
def api_get_marketplace_shop_profile(slug):
    """
    Retorna o perfil público completo de uma loja para o Marketplace.
    Inclui estatísticas e horário de hoje.
    """
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    
    total_visits = ShopVisit.query.filter_by(shop_id=shop.id).count()
    total_orders = Order.query.filter_by(shop_id=shop.id).count()
    total_bookings = Booking.query.filter_by(shop_id=shop.id).count()
    
    today = datetime.datetime.now().weekday()
    today_schedule = Schedule.query.filter_by(shop_id=shop.id, dia_semana=today).first()
    
    return jsonify({
        'shop': {
            'id': shop.id,
            'nome': shop.nome_loja,
            'slug': shop.slug,
            'descricao': shop.descricao,
            'telefone': shop.telefone,
            'morada': shop.morada,
            'logo_url': shop.profile_image_url,
            'banner_url': shop.profile_banner_url,
            'theme_color': shop.theme_color,
            'verification_status': shop.verification_status,
            'business_model': shop.business_model,
            'categoria': {
                'id': shop.category.id if shop.category else None,
                'name': shop.category.name if shop.category else 'Geral'
            },
            'social': {
                'whatsapp': shop.social_whatsapp,
                'facebook': shop.social_facebook,
                'instagram': shop.social_instagram
            },
            'stats': {
                'visits': total_visits,
                'orders': total_orders,
                'bookings': total_bookings,
                'rating': calculate_shop_rating(shop.id),
                'review_count': len(shop.reviews)
            },
            'schedule_today': {
                'is_open': today_schedule.esta_aberto if today_schedule else False,
                'hours': f"{today_schedule.hora_inicio} - {today_schedule.hora_fim}" if today_schedule else "Fechado"
            } if today_schedule else {'is_open': False, 'hours': 'Fechado'},
            'services_count': len(shop.services),
            'products_count': len(shop.products)
        }
    }), 200

@bp.route('/marketplace/featured', methods=['GET'])
def api_marketplace_featured():
    """
    Retorna lista de lojas em destaque (ex: as primeiras 5 verificadas).
    """
    featured = Shop.query.filter_by(verification_status='Verificado').limit(5).all()
    
    return jsonify([{
        'nome': s.nome_loja,
        'slug': s.slug,
        'logo_url': s.profile_image_url
    } for s in featured]), 200

@bp.route('/marketplace/products/search', methods=['GET'])
def api_marketplace_search_products():
    """
    Pesquisa global de produtos em todas as lojas verificadas.
    """
    query_text = request.args.get('q', '')
    category_id = request.args.get('category_id')
    
    # Join com Shop para garantir que só pesquisamos em lojas verificadas
    query = Product.query.join(Shop).filter(Shop.verification_status == 'Verificado')
    
    if query_text:
        search = f"%{query_text}%"
        query = query.filter(
            or_(
                Product.nome.ilike(search),
                Product.descricao.ilike(search)
            )
        )
        
    if category_id:
        # Assume que products têm product_category_id local, 
        # ou filtra pela categoria da loja (shop_category_id) se for o caso.
        # Aqui filtramos pela categoria global da loja associada ao produto:
        query = query.filter(Shop.shop_category_id == category_id)
        
    products = query.limit(50).all()
    
    return jsonify([{
        'id': p.id,
        'nome': p.nome,
        'preco': p.preco,
        'image_url': p.image_url,
        'shop_name': p.shop.nome_loja,
        'shop_slug': p.shop.slug,
        'shop_logo': p.shop.profile_image_url
    } for p in products]), 200