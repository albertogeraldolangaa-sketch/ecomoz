import datetime
from flask import Blueprint, render_template, redirect, url_for, send_from_directory, current_app, request, flash
from flask_login import login_required, logout_user, current_user
from app.extensions import db
from app.models import Shop, ShopVisit, Payment

bp = Blueprint('main', __name__)

# =============================================================================
# PÁGINAS PÚBLICAS (LANDING PAGE E LOGIN)a
# =============================================================================

@bp.route('/')
def index():
    """Página inicial (Landing Page)."""
    return render_template('landing.html')

@bp.route('/login')
def login_page():
    """Página de Login / Registo."""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('login.html')

@bp.route('/forgot-password')
def forgot_password_page():
    """Página de pedido de recuperação de password."""
    return render_template('forgot_password.html')

@bp.route('/reset-password/<token>')
def reset_password_page(token):
    """Página de definição de nova password."""
    return render_template('reset_password.html', token=token)

# =============================================================================
# ÁREA PRIVADA (DASHBOARD E GESTÃO)
# =============================================================================

@bp.route('/dashboard')
@login_required
def dashboard():
    """Painel de controlo principal do lojista."""
    # Garante que o utilizador tem nome para exibir
    user_nome = current_user.nome if hasattr(current_user, 'nome') else 'Lojista'
    # CORREÇÃO: O caminho deve incluir a pasta 'dashboard'
    return render_template('dashboard/base.html', user_nome=user_nome)

@bp.route('/kds')
@login_required
def kds_display():
    """Ecrã de Cozinha / Pedidos (Kitchen Display System)."""
    # Verifica se o utilizador tem loja associada
    if not current_user.shops:
        flash("Nenhuma loja associada a este utilizador.")
        return redirect(url_for('main.dashboard'))
    
    # Assume a primeira loja
    shop = current_user.shops[0]
    
    return render_template(
        'kds.html',
        shop_name=shop.nome_loja,
        announcement_url=shop.announcement_url
    )

@bp.route('/logout')
@login_required
def logout():
    """Termina a sessão e redireciona para o login."""
    logout_user()
    return redirect(url_for('main.login_page'))

# =============================================================================
# PÁGINA DA LOJA DO CLIENTE (PÚBLICA)
# =============================================================================

@bp.route('/loja/<string:slug>')
def public_shop_page(slug):
    """
    Renderiza a página pública da loja para os clientes.
    Inclui lógica de contagem de visitas e inicialização de pagamentos.
    """
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    
    # 1. Log de Visitas (Lógica trazida do app.py)
    try:
        visitor_ip = request.remote_addr
        # Verifica a última visita deste IP para esta loja
        last_visit = ShopVisit.query.filter_by(shop_id=shop.id, ip_address=visitor_ip)\
            .order_by(ShopVisit.timestamp.desc()).first()
        
        # Se nunca visitou ou visitou há mais de 1 hora, conta nova visita
        if not last_visit or (datetime.datetime.utcnow() - last_visit.timestamp) > datetime.timedelta(hours=1):
            new_visit = ShopVisit(shop_id=shop.id, ip_address=visitor_ip)
            db.session.add(new_visit)
            db.session.commit()
    except Exception as e:
        # Não falhar a página se o log de visita der erro
        db.session.rollback()
        print(f"Erro ao logar visita: {e}")

    # 2. Garantir Configuração de Pagamento (Self-healing)
    try:
        payment_settings = shop.payment
        if not payment_settings:
            payment_settings = Payment(shop_id=shop.id)
            db.session.add(payment_settings)
            db.session.commit()
            
        return render_template(
            'public/shop.html',
            shop=shop,
            payment_settings=payment_settings,
            business_model=shop.business_model,
            product_layout_style=shop.product_layout_style
        )
    except Exception as e:
        return f"Erro ao carregar loja: {str(e)}", 500

# =============================================================================
# SERVIR FICHEIROS ESTÁTICOS (UPLOADS)
# =============================================================================

@bp.route('/uploads/<path:filename>')
def uploaded_file(filename):
    """Serve ficheiros carregados pelos utilizadores (imagens, docs)."""
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)