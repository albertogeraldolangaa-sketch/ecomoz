import os
import json
import datetime
from datetime import time as datetime_time, date
import random
import hmac     
import hashlib  
import requests 
from flask import Flask, render_template, request, redirect, url_for, jsonify, flash, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename # Necessário para uploads
from sqlalchemy import or_, and_, func # Necessário para queries complexas

# --- NOVO: Importações para Email & Tokens ---
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature
# --- FIM DAS NOVAS IMPORTAÇÕES ---

load_dotenv() 

app = Flask(__name__)

# Configurações da App (Database, Secret Key, etc.)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'fallback-secret-key-mude-isto')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# --- NOVO: Configuração do Flask-Mail (lido do .env) ---
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True').lower() in ['true', 'on', '1']
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')
# --- FIM DA CONFIGURAÇÃO DE EMAIL ---

# Chaves API (lidas do .env)
ADMIN_PAYSUITE_API_KEY = os.environ.get('ADMIN_PAYSUITE_API_KEY')
PAYSUITE_WEBHOOK_SECRET = os.environ.get('PAYSUITE_WEBHOOK_SECRET')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL') # Necessário para o AdminView

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
migrate = Migrate(app, db)
CORS(app, resources={r"/api/loja/*": {"origins": "*"}})

# --- NOVO: Instâncias para Email & Tokens ---
mail = Mail(app)
# Usamos um "sal" ('password-reset') para que este token seja diferente de outros
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY']) 
# --- FIM DAS NOVAS INSTÂNCIAS ---

login_manager = LoginManager(app)
login_manager.login_view = 'login_page'
login_manager.login_message = 'Por favor, faça login para aceder a esta página.'

# --- Modelos da Base de Dados ---

# (O seu código de Modelos da BD ... ProductOption, ProductOptionValue, etc...
# ... permanece exatamente igual ... )

# --- INÍCIO DOS MODELOS ... ---
class ProductOption(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    name = db.Column(db.String(50), nullable=False) # Ex: "Tamanho"
    values = db.relationship('ProductOptionValue', backref='option', lazy=True, cascade="all, delete-orphan")

class ProductOptionValue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    option_id = db.Column(db.Integer, db.ForeignKey('product_option.id'), nullable=False)
    value = db.Column(db.String(50), nullable=False) # Ex: "Pequeno"

variant_options_link = db.Table('variant_options_link',
    db.Column('variant_id', db.Integer, db.ForeignKey('product_variant.id'), primary_key=True),
    db.Column('option_value_id', db.Integer, db.ForeignKey('product_option_value.id'), primary_key=True)
)

class ProductVariant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    preco = db.Column(db.Float, nullable=False) # O Preço vive aqui!
    stock = db.Column(db.Integer, default=99)
    sku = db.Column(db.String(100), nullable=True) # Código de stock
    option_values = db.relationship('ProductOptionValue', secondary=variant_options_link)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    ticket_number = db.Column(db.String(10), unique=True, nullable=False)
    nome_cliente = db.Column(db.String(100), nullable=False)
    telefone_cliente = db.Column(db.String(20), nullable=True)
    order_type = db.Column(db.String(20), nullable=False) # 'delivery' ou 'takeaway'
    delivery_address = db.Column(db.Text, nullable=True) # Morada (só para delivery)
    total_price = db.Column(db.Float, nullable=False, default=0.0)
    amount_paid = db.Column(db.Float, nullable=False, default=0.0) # Valor pago (integral ou depósito)
    status = db.Column(db.String(30), default='Aguardando Pagamento') # Ex: Pendente, Em Preparação, Entregue
    payout_status = db.Column(db.String(30), default='Pendente')
    commission_amount = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    product_name = db.Column(db.String(100), nullable=False) # Guarda o nome + variantes (Ex: Camisa P, Vermelha)
    quantity = db.Column(db.Integer, default=1)
    unit_price = db.Column(db.Float, nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=True)
    product_variant_id = db.Column(db.Integer, db.ForeignKey('product_variant.id'), nullable=True)

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    shop = db.relationship('Shop', backref='owner', uselist=False, lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

class Shop(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    nome_loja = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False) 
    business_model = db.Column(db.String(20), default='agendamento', nullable=False)
    allow_delivery = db.Column(db.Boolean, default=True)
    allow_takeaway = db.Column(db.Boolean, default=True)
    descricao = db.Column(db.Text, nullable=True, default='Bem-vindo ao meu negócio.')
    telefone = db.Column(db.String(20), nullable=True)
    morada = db.Column(db.String(200), nullable=True)
    profile_image_url = db.Column(db.String(255), nullable=True)
    profile_banner_url = db.Column(db.String(255), nullable=True) # Banner do Perfil
    theme_color = db.Column(db.String(7), default='#3b82f6') # Cor do Botão
    background_color = db.Column(db.String(7), default='#F0F2F5') # Cor de Fundo
    product_layout_style = db.Column(db.String(20), default='lista') 
    layout_style = db.Column(db.String(20), default='default') # Layout do Dashboard (antigo)
    show_products = db.Column(db.Boolean, default=True)
    show_schedule = db.Column(db.Boolean, default=True) 
    show_bookings = db.Column(db.Boolean, default=True) 
    show_info = db.Column(db.Boolean, default=True)     
    social_whatsapp = db.Column(db.String(100), nullable=True)
    social_facebook = db.Column(db.String(100), nullable=True)
    social_instagram = db.Column(db.String(100), nullable=True)
    other_sites = db.Column(db.Text, nullable=True)
    announcement_url = db.Column(db.String(255), nullable=True) # Banner do KDS
    services = db.relationship('Service', backref='shop', lazy=True, cascade="all, delete-orphan")
    schedules = db.relationship('Schedule', backref='shop', lazy=True, cascade="all, delete-orphan")
    bookings = db.relationship('Booking', backref='shop', lazy=True, cascade="all, delete-orphan")
    products = db.relationship('Product', backref='shop', lazy=True, cascade="all, delete-orphan")
    visits = db.relationship('ShopVisit', backref='shop', lazy=True, cascade="all, delete-orphan")
    orders = db.relationship('Order', backref='shop', lazy=True, cascade="all, delete-orphan")

class Payment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False, unique=True)
    shop = db.relationship('Shop', backref=db.backref('payment', uselist=False), lazy=True)
    allow_booking_now = db.Column(db.Boolean, default=True)
    allow_booking_later = db.Column(db.Boolean, default=True)
    allow_payment_local = db.Column(db.Boolean, default=True)
    allow_payment_online = db.Column(db.Boolean, default=True)
    payout_method = db.Column(db.String(50), default='mpesa') 
    payout_number = db.Column(db.String(100), nullable=True)  
    payout_bank_details = db.Column(db.Text, nullable=True)  

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    preco = db.Column(db.Float, nullable=True, default=0.0) # Preço (se for 'simples')
    image_url = db.Column(db.String(255), nullable=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    payment_mode = db.Column(db.String(20), default='integral') # Opções: 'integral' ou 'deposito'
    deposit_value = db.Column(db.Float, nullable=True, default=0.0)
    product_type = db.Column(db.String(20), default='simples', nullable=False) # 'simples' ou 'variavel'
    variants = db.relationship('ProductVariant', backref='product', lazy=True, cascade="all, delete-orphan")
    options = db.relationship('ProductOption', backref='product', lazy=True, cascade="all, delete-orphan")

class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    duracao_min = db.Column(db.Integer, nullable=False, default=30)
    preco = db.Column(db.Float, nullable=False, default=0.0) # PREÇO TOTAL
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    bookings = db.relationship('Booking', backref='service', lazy=True)
    payment_mode = db.Column(db.String(20), default='integral') # Opções: 'integral' ou 'deposito'
    deposit_value = db.Column(db.Float, nullable=True, default=0.0)

class Schedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dia_semana = db.Column(db.Integer, nullable=False)
    hora_inicio = db.Column(db.String(5), nullable=True)
    hora_fim = db.Column(db.String(5), nullable=True)
    esta_aberto = db.Column(db.Boolean, default=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)

class Booking(db.Model): 
    id = db.Column(db.Integer, primary_key=True)
    nome_cliente = db.Column(db.String(100), nullable=False)
    email_cliente = db.Column(db.String(100), nullable=True)
    telefone_cliente = db.Column(db.String(20), nullable=True)
    data_hora_inicio = db.Column(db.DateTime, nullable=False)
    data_hora_fim = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='Pendente') 
    payout_status = db.Column(db.String(30), default='N/A')
    commission_amount = db.Column(db.Float, nullable=True)
    ticket_number = db.Column(db.String(10), unique=True, nullable=False) 
    total_price = db.Column(db.Float, nullable=False, default=0.0) # Preço TOTAL do serviço
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('service.id'), nullable=True)
    
    # Relação para obter o nome do serviço (se houver)
    # --- CORREÇÃO DO SAWarning ---
    service_details = db.relationship('Service', overlaps="bookings,service")

class ShopVisit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    ip_address = db.Column(db.String(45), nullable=True) 
# --- FIM DOS MODELOS ---

# --- Configuração do Login ---
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- Rotas Principais (Views) ---

@app.route('/')
def index():
    try:
        return render_template('landing.html')
    except Exception as e:
        return f"Erro ao renderizar landing.html: {e}. Certifique-se que está na pasta 'templates'."

@app.route('/login')
def login_page():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    try:
        return render_template('login.html')
    except Exception as e:
        return f"Erro ao renderizar login.html: {e}. Certifique-se que está na pasta 'templates'."

# --- NOVAS ROTAS DE PASSWORD ---
@app.route('/forgot-password')
def forgot_password_page():
    try:
        return render_template('forgot_password.html')
    except Exception as e:
        return f"Erro ao renderizar forgot_password.html: {e}."

@app.route('/reset-password/<token>')
def reset_password_page(token):
    # Apenas renderiza a página. A validação será feita pela API
    try:
        return render_template('reset_password.html', token=token)
    except Exception as e:
        return f"Erro ao renderizar reset_password.html: {e}."
# --- FIM DAS NOVAS ROTAS DE PASSWORD ---

@app.route('/dashboard')
@login_required 
def dashboard():
    try:
        return render_template('dashboard.html', user_nome=current_user.nome)
    except Exception as e:
        return f"Erro ao renderizar dashboard.html: {e}. Certifique-se que está na pasta 'templates'."

@app.route('/kds') 
@login_required
def kds_display():
    shop = current_user.shop
    if not shop:
        flash("Loja não encontrada.")
        return redirect(url_for('dashboard'))
    try:
        return render_template('kds.html', 
                               shop_name=shop.nome_loja, 
                               announcement_url=shop.announcement_url)
    except Exception as e:
        return f"Erro ao renderizar kds.html: {e}. Certifique-se que está na pasta 'templates'."

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login_page'))

@app.route('/loja/<string:slug>')
def public_shop_page(slug):
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    
    # (O seu código de Log de Visitas ... permanece igual ...)
    try:
        visitor_ip = request.remote_addr
        last_visit = ShopVisit.query.filter_by(shop_id=shop.id, ip_address=visitor_ip).order_by(ShopVisit.timestamp.desc()).first()
        if not last_visit or (datetime.datetime.utcnow() - last_visit.timestamp) > datetime.timedelta(hours=1):
            new_visit = ShopVisit(shop_id=shop.id, ip_address=visitor_ip)
            db.session.add(new_visit)
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao logar visita: {e}") 

    try:
        payment_settings = shop.payment
        if not payment_settings:
            payment_settings = Payment(shop_id=shop.id)
            db.session.add(payment_settings)
            db.session.commit()
            
        return render_template('public_shop.html', 
                               shop=shop, 
                               payment_settings=payment_settings,
                               business_model=shop.business_model,
                               product_layout_style=shop.product_layout_style)
    except Exception as e:
         return f"Erro ao renderizar public_shop.html: {e}. Certifique-se que está na pasta 'templates'."


@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# --- API: Autenticação ---

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json()
    email, nome_loja, slug, password, nome_dono = (
        data.get('email'), data.get('nome_loja'), data.get('slug'),
        data.get('password'), data.get('nome')
    )
    business_model = data.get('business_model', 'agendamento')
    
    if not all([email, nome_loja, slug, password, nome_dono]):
        return jsonify({'error': 'Todos os campos são obrigatórios.'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Este email já está registado.'}), 409
    if Shop.query.filter_by(slug=slug).first():
        return jsonify({'error': 'Este URL de loja já está a ser usado.'}), 409

    try:
        new_user = User(email=email, nome=nome_dono)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.flush()

        new_shop = Shop(
            nome_loja=nome_loja, slug=slug, user_id=new_user.id,
            descricao='Bem-vindo ao meu negócio!',
            theme_color='#3b82f6',
            background_color='#F0F2F5',
            product_layout_style='lista',
            layout_style='default',
            show_products=True, show_schedule=True, show_bookings=True, show_info=True,
            business_model=business_model
        )
        db.session.add(new_shop)
        db.session.flush()

        # (O seu código para criar Horário Padrão, Pagamentos e Itens de Exemplo ...
        # ... permanece exatamente igual ...)
        dias = range(7)
        for i in dias:
            schedule = Schedule(
                shop_id=new_shop.id, dia_semana=i,
                hora_inicio="09:00", hora_fim="18:00",
                esta_aberto=(i < 5) 
            )
            db.session.add(schedule)
            
        new_payment = Payment(
            shop_id=new_shop.id, 
            allow_payment_local=True, 
            allow_payment_online=True,
            allow_booking_now=True,
            allow_booking_later=True,
            payout_method='mpesa',
            payout_number=None
        )
        db.session.add(new_payment)

        if business_model == 'agendamento':
            db.session.add(Service(nome="Serviço de Exemplo", duracao_min=30, preco=10.0, shop_id=new_shop.id, payment_mode='integral'))
        else: # 'delivery'
            db.session.add(Product(nome="Produto de Exemplo", descricao="Descrição do produto", preco=25.0, shop_id=new_shop.id, payment_mode='integral', product_type='simples'))
        
        db.session.commit()
        
        login_user(new_user)
        return jsonify({'message': 'Registo bem-sucedido!', 'redirect': url_for('dashboard')}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    if user and user.check_password(data.get('password')):
        login_user(user, remember=True)
        return jsonify({'message': 'Login bem-sucedido!', 'redirect': url_for('dashboard')}), 200
    return jsonify({'error': 'Email ou password inválidos.'}), 401

# --- NOVO: API de Recuperação de Password ---

def send_password_reset_email(user, token):
    """Envia o email de redefinição de password."""
    reset_url = url_for('reset_password_page', token=token, _external=True)
    
    # Texto simples do email
    email_body = f"""Olá {user.nome},

Alguém (esperemos que você) solicitou a redefinição da sua password para a sua conta na MarcaçãoPro.

Se foi você, clique no link abaixo para definir uma nova password:
{reset_url}

Este link expira em 1 hora.

Se não foi você, por favor ignore este email.

Obrigado,
Equipa MarcaçãoPro
"""
    
    try:
        msg = Message(
            subject="Recuperação de Password - MarcaçãoPro",
            recipients=[user.email],
            body=email_body
        )
        mail.send(msg)
    except Exception as e:
        print(f"Erro ao enviar email: {str(e)}")
        # Lidar com falha no envio de email (ex: logar)
        pass

@app.route('/api/forgot-password', methods=['POST'])
def api_forgot_password():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email é obrigatório.'}), 400
        
    user = User.query.filter_by(email=email).first()
    
    if user:
        # Gerar o token (expira em 3600 segundos = 1 hora)
        token = serializer.dumps(user.email, salt='password-reset')
        
        # Enviar o email
        send_password_reset_email(user, token)
        
    # NOTA DE SEGURANÇA:
    # Sempre retorne uma mensagem de sucesso, mesmo que o email não exista.
    # Isto impede que atacantes descubram quais emails estão registados.
    return jsonify({'message': 'Se o seu email estiver registado, receberá um link de recuperação em breve.'}), 200

@app.route('/api/reset-password/<token>', methods=['POST'])
def api_reset_password(token):
    data = request.get_json()
    new_password = data.get('password')
    
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'A password deve ter pelo menos 6 caracteres.'}), 400

    try:
        # Validar o token e verificar se expira (max_age=3600)
        email = serializer.loads(token, salt='password-reset', max_age=3600)
        
    except SignatureExpired:
        return jsonify({'error': 'O link de recuperação expirou. Por favor, peça um novo.'}), 400
    except (BadTimeSignature, Exception):
        return jsonify({'error': 'O link de recuperação é inválido.'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Utilizador não encontrado.'}), 404
        
    try:
        # Atualizar a password
        user.set_password(new_password)
        db.session.commit()
        
        return jsonify({'message': 'Password atualizada com sucesso! Pode fazer login.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao atualizar password: {str(e)}'}), 500
# --- FIM DA API DE PASSWORD ---


# --- API: Página Pública (Cliente) ---

# (O seu código da API Pública ... /api/loja/...
# ... permanece exatamente igual ...)

@app.route('/api/loja/<string:slug>/services', methods=['GET'])
def api_get_public_services(slug):
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    services = []
    for s in shop.services:
        services.append({
            'id': s.id,
            'nome': s.nome,
            'duracao_min': s.duracao_min, 
            'preco': s.preco,
            'payment_mode': s.payment_mode,
            'deposit_value': s.deposit_value
        })
    return jsonify(services), 200

@app.route('/api/loja/<string:slug>/products', methods=['GET'])
def api_get_public_products(slug):
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    products = []
    for p in shop.products:
        products.append({
            'id': p.id,
            'nome': p.nome,
            'descricao': p.descricao,
            'preco': p.preco, 
            'image_url': p.image_url,
            'product_type': p.product_type,
            'payment_mode': p.payment_mode,
            'deposit_value': p.deposit_value
        })
    return jsonify(products), 200

@app.route('/api/loja/<string:slug>/availability', methods=['GET'])
def api_get_availability(slug):
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    date_str = request.args.get('date')
    service_id = request.args.get('service_id')
    
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

        start_time = datetime_time.fromisoformat(schedule.hora_inicio)
        end_time = datetime_time.fromisoformat(schedule.hora_fim)
        
        start_of_day = datetime.datetime.combine(target_date, datetime_time.min)
        end_of_day = start_of_day + datetime.timedelta(days=1)
        
        existing_bookings = Booking.query.filter(
            Booking.shop_id == shop.id,
            Booking.data_hora_inicio >= start_of_day,
            Booking.data_hora_inicio < end_of_day,
            Booking.status.in_(['Pendente', 'Confirmado', 'Aguardando Pagamento'])
        ).all()
        
        occupied_slots = set()
        for booking in existing_bookings:
            start_minutes = booking.data_hora_inicio.hour * 60 + booking.data_hora_inicio.minute
            end_minutes = booking.data_hora_fim.hour * 60 + booking.data_hora_fim.minute
            for i in range(start_minutes, end_minutes):
                occupied_slots.add(i)

        available_slots = []
        current_time = datetime.datetime.combine(target_date, start_time)
        end_datetime = datetime.datetime.combine(target_date, end_time)
        now = datetime.datetime.now()
        
        while current_time + datetime.timedelta(minutes=duration_min) <= end_datetime:
            slot_start_time = current_time
            slot_end_time = current_time + datetime.timedelta(minutes=duration_min)
            
            if slot_start_time < now:
                current_time += datetime.timedelta(minutes=15) 
                continue
            
            is_occupied = False
            slot_start_minutes = slot_start_time.hour * 60 + slot_start_time.minute
            slot_end_minutes = slot_end_time.hour * 60 + slot_end_time.minute
            
            for i in range(slot_start_minutes, slot_end_minutes):
                if i in occupied_slots:
                    is_occupied = True
                    break
            
            if not is_occupied:
                available_slots.append(slot_start_time.strftime('%H:%M'))
            
            current_time += datetime.timedelta(minutes=15) 

        return jsonify(available_slots), 200
        
    except Exception as e:
        print(f"Erro ao calcular horários: {str(e)}")
        return jsonify({'error': f'Erro ao calcular horários: {str(e)}'}), 500

def generate_ticket_number(shop_id):
    last_booking = db.session.query(Booking.id, Booking.ticket_number).filter_by(shop_id=shop_id).order_by(Booking.id.desc()).first()
    last_order = db.session.query(Order.id, Order.ticket_number).filter_by(shop_id=shop_id).order_by(Order.id.desc()).first()
    
    prefix = chr(65 + (shop_id % 26))
    
    last_num = 0
    if last_booking and last_booking.ticket_number:
        try:
            last_num = int(last_booking.ticket_number.lstrip('ABCDEFGHIJKLMNOPQRSTUVWXYZ-'))
        except:
            pass 
            
    if last_order and last_order.ticket_number:
        try:
            last_order_num = int(last_order.ticket_number.lstrip('ABCDEFGHIJKLMNOPQRSTUVWXYZ-'))
            if last_order_num > last_num:
                last_num = last_order_num
        except:
            pass
            
    new_num = last_num + 1
    return f"{prefix}{new_num:03d}"

@app.route('/api/loja/<string:slug>/book', methods=['POST'])
def api_create_booking(slug):
    # (O seu código de /api/loja/book ... permanece exatamente igual ...)
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    if shop.business_model != 'agendamento':
        return jsonify({'error': 'Esta loja não aceita agendamentos.'}), 403
        
    data = request.get_json()
    payment_method = data.get('payment_method', 'local')
    
    payment_settings = shop.payment
    if not payment_settings:
        payment_settings = Payment(shop_id=shop.id)
        db.session.add(payment_settings)
        db.session.commit()

    try:
        service_id = data.get('service_id')
        product_id = data.get('product_id') 
        
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
        
        else:
            return jsonify({'error': 'Nenhum serviço selecionado.'}), 400

        if item_to_book.payment_mode == 'deposito' and item_to_book.deposit_value > 0:
            amount_to_charge_online = item_to_book.deposit_value 
        else:
            amount_to_charge_online = item_to_book.preco 

        data_hora_inicio = datetime.datetime.fromisoformat(data['data_hora'])
        data_hora_fim = data_hora_inicio + datetime.timedelta(minutes=duration_min)
        
        new_ticket_number = generate_ticket_number(shop.id)

        if payment_method == 'online' and payment_settings.allow_payment_online:
            initial_status = 'Aguardando Pagamento'
            initial_payout_status = 'Pendente'
        else:
            initial_status = 'Pendente'
            initial_payout_status = 'N/A' 

        new_booking = Booking(
            nome_cliente=data['nome'], email_cliente=data.get('email'), telefone_cliente=data['telefone'],
            data_hora_inicio=data_hora_inicio, data_hora_fim=data_hora_fim, status=initial_status,
            payout_status=initial_payout_status, ticket_number=new_ticket_number, 
            total_price=total_price, 
            shop_id=shop.id, service_id=service_id
        )
        db.session.add(new_booking)
        db.session.commit() 
        
        if payment_method == 'online' and payment_settings.allow_payment_online:
            if not ADMIN_PAYSUITE_API_KEY:
                print("ERRO CRÍTICO: ADMIN_PAYSUITE_API_KEY não definida no .env")
                return jsonify({'error': 'Ocorreu um erro no processamento do pagamento.'}), 500
                
            payload = {
                "amount": str(amount_to_charge_online), 
                "reference": new_booking.ticket_number,
                "description": f"{shop.nome_loja}: {item_nome} ({new_booking.ticket_number})",
                "return_url": f"{request.host_url}loja/{shop.slug}", 
                "callback_url": f"{request.host_url}api/webhook-paysuite"
            }
            headers = {"Authorization": f"Bearer {ADMIN_PAYSUITE_API_KEY}", "Content-Type": "application/json", "Accept": "application/json"}
            
            try:
                response = requests.post("https://paysuite.tech/api/v1/payments", json=payload, headers=headers, timeout=10)
                response_data = response.json()
                
                if response.status_code == 201 and response_data.get('status') == 'success':
                    return jsonify({'action': 'redirect_to_payment', 'checkout_url': response_data['data']['checkout_url']}), 201
                else:
                    db.session.delete(new_booking)
                    db.session.commit()
                    print(f"Erro PaySuite: {response_data.get('message')}")
                    return jsonify({'error': f"Erro do gateway de pagamento: {response_data.get('message')}"}), 500
            except Exception as e:
                db.session.delete(new_booking)
                db.session.commit()
                return jsonify({'error': f'Erro ao contactar o gateway: {str(e)}'}), 500
        else: 
            return jsonify({
                'action': 'show_success_page',
                'booking': {
                    'id': new_booking.id,
                    'ticket_number': new_booking.ticket_number, 'item_nome': item_nome,
                    'data_hora': new_booking.data_hora_inicio.isoformat(), 'status': new_booking.status,
                    'total_price': new_booking.total_price,
                    'amount_paid': 0 
                }
            }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao criar marcação: {str(e)}'}), 500

@app.route('/api/loja/<string:slug>/create-order', methods=['POST'])
def api_create_order(slug):
    # (O seu código de /api/loja/create-order ... permanece exatamente igual ...)
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    if shop.business_model != 'delivery':
        return jsonify({'error': 'Esta loja não aceita encomendas.'}), 403
        
    data = request.get_json() 

    payment_settings = shop.payment
    if not payment_settings or not payment_settings.allow_payment_online:
         return jsonify({'error': 'Pagamento online está desativado para esta loja.'}), 403

    try:
        total_price = 0.0
        amount_to_charge_online = 0.0
        order_items_to_create = []

        for item in data['cart']:
            product = Product.query.get(item['id'])
            if not product: continue
            
            item_total = product.preco * item['qty']
            total_price += item_total
            
            if product.payment_mode == 'deposito' and product.deposit_value > 0:
                amount_to_charge_online += (product.deposit_value * item['qty'])
            else:
                amount_to_charge_online += item_total 

            order_items_to_create.append(OrderItem(
                product_id=product.id,
                product_name=product.nome, 
                quantity=item['qty'],
                unit_price=product.preco
            ))
            
        new_ticket_number = generate_ticket_number(shop.id)

        new_order = Order(
            shop_id=shop.id,
            ticket_number=new_ticket_number,
            nome_cliente=data['customer']['nome'],
            telefone_cliente=data['customer']['telefone'],
            order_type=data['order_type'],
            delivery_address=data.get('address'),
            total_price=total_price,
            amount_paid=amount_to_charge_online, 
            status='Aguardando Pagamento',
            payout_status='Pendente'
        )
        db.session.add(new_order)
        for item_obj in order_items_to_create:
            new_order.items.append(item_obj)
            
        db.session.commit()

        payload = {
            "amount": str(amount_to_charge_online),
            "reference": new_ticket_number,
            "description": f"Encomenda em {shop.nome_loja} ({new_ticket_number})",
            "return_url": f"{request.host_url}loja/{shop.slug}", 
            "callback_url": f"{request.host_url}api/webhook-paysuite"
        }
        headers = {"Authorization": f"Bearer {ADMIN_PAYSUITE_API_KEY}", "Content-Type": "application/json", "Accept": "application/json"}
        
        try:
            response = requests.post("https://paysuite.tech/api/v1/payments", json=payload, headers=headers, timeout=10)
            response_data = response.json()
            
            if response.status_code == 201 and response_data.get('status') == 'success':
                return jsonify({'action': 'redirect_to_payment', 'checkout_url': response_data['data']['checkout_url']}), 201
            else:
                db.session.delete(new_order) 
                db.session.commit()
                print(f"Erro PaySuite: {response_data.get('message')}")
                return jsonify({'error': f"Erro do gateway de pagamento: {response_data.get('message')}"}), 500
        except Exception as e:
            db.session.delete(new_order)
            db.session.commit()
            return jsonify({'error': f'Erro ao contactar o gateway: {str(e)}'}), 500
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao criar encomenda: {str(e)}'}), 500


@app.route('/api/webhook-paysuite', methods=['POST'])
def paysuite_webhook():
    # (O seu código de /api/webhook-paysuite ... permanece exatamente igual ...)
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.data
    if not signature: return jsonify({'error': 'No signature header'}), 400
    if not PAYSUITE_WEBHOOK_SECRET:
        print("ERRO CRÍTICO: PAYSUITE_WEBHOOK_SECRET não definido no .env")
        return jsonify({'error': 'Webhook not configured'}), 500
        
    try:
        calculated_signature = hmac.new(PAYSUITE_WEBHOOK_SECRET.encode('utf-8'), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(calculated_signature, signature):
            return jsonify({'error': 'Invalid signature'}), 401
    except Exception as e:
        return jsonify({'error': f'Signature validation error: {str(e)}'}), 500
        
    try:
        data = request.get_json()
        if data['event'] == 'payment.success':
            ticket_ref = data['data']['reference'] 
            amount_paid_online = float(data['data']['amount'])
            
            order = Order.query.filter_by(ticket_number=ticket_ref).first()
            booking = Booking.query.filter_by(ticket_number=ticket_ref).first()

            item_to_process = None
            
            if order and order.status == 'Aguardando Pagamento':
                order.status = 'Pendente' 
                item_to_process = order
            elif booking and booking.status == 'Aguardando Pagamento':
                booking.status = 'Confirmado'
                item_to_process = booking
            
            if item_to_process:
                commission_rate = 0.10 
                
                commission = amount_paid_online * commission_rate
                payout_amount = amount_paid_online - commission
                
                item_to_process.commission_amount = commission
                
                try:
                    payout_success = call_payout_api(item_to_process.shop, payout_amount, item_to_process.ticket_number)
                    if payout_success: 
                        item_to_process.payout_status = 'Pago'
                    else: 
                        item_to_process.payout_status = 'Falhado (API Payout)'
                except Exception as e:
                    print(f"Erro na API de Payout: {str(e)}")
                    item_to_process.payout_status = 'Falhado (Exceção)'
                
                db.session.commit()
                
        elif data['event'] == 'payment.failed':
            ticket_ref = data['data']['reference']
            order = Order.query.filter_by(ticket_number=ticket_ref).first()
            booking = Booking.query.filter_by(ticket_number=ticket_ref).first()
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
        return jsonify({'error': f'Webhook processing error: {str(e)}'}), 500

def call_payout_api(shop, amount, reference):
    # (O seu código de call_payout_api ... permanece exatamente igual ...)
    if not ADMIN_PAYSUITE_API_KEY:
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
        "description": f"Pagamento da sua marcação {reference}"
    }
    headers = {"Authorization": f"Bearer {ADMIN_PAYSUITE_API_KEY}", "Content-Type": "application/json", "Accept": "application/json"}
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

@app.route('/api/loja/<string:slug>/cancel', methods=['POST'])
def api_cancel_booking(slug):
    # (O seu código de /api/loja/cancel ... permanece exatamente igual ...)
    shop = Shop.query.filter_by(slug=slug).first_or_404()
    data = request.get_json()
    ticket_number = data.get('ticket_number')
    if not ticket_number: return jsonify({'error': 'Número do ticket não fornecido'}), 400
    
    booking = Booking.query.filter_by(shop_id=shop.id, ticket_number=ticket_number).first()
    order = Order.query.filter_by(shop_id=shop.id, ticket_number=ticket_number).first()
    
    item_to_cancel = None
    if booking: item_to_cancel = booking
    elif order: item_to_cancel = order
    else: return jsonify({'error': 'Ticket não encontrado'}), 404
    
    if item_to_cancel.status == 'Cancelado': 
        return jsonify({'message': 'Ticket já estava cancelado'}), 200
        
    if item_to_cancel.status != 'Pendente':
        return jsonify({'error': 'Não é possível cancelar uma marcação/encomenda já confirmada. Contacte a loja.'}), 403
        
    item_to_cancel.status = 'Cancelado'
    db.session.commit()
    return jsonify({'message': 'Marcação cancelada com sucesso'}), 200

# --- API: Dashboard (Dono da Loja) ---

# (O seu código da API do Dashboard ... /api/dashboard/...
# ... permanece exatamente igual ...)

@app.route('/api/dashboard/details', methods=['GET'])
@login_required
def api_get_dashboard_details():
    shop = current_user.shop
    if not shop:
        return jsonify({'error': 'Loja não encontrada.'}), 404

    schedules_query = Schedule.query.filter_by(shop_id=shop.id).order_by(Schedule.dia_semana.asc()).all()
    schedules_list = []
    if len(schedules_query) == 7:
        for s in schedules_query:
            schedules_list.append({'inicio': s.hora_inicio, 'fim': s.hora_fim, 'aberto': s.esta_aberto})
    else:
        schedules_list = [ {'inicio': '09:00', 'fim': '18:00', 'aberto': i < 5} for i in range(7) ]
        
    try:
        other_sites = json.loads(shop.other_sites) if shop.other_sites else []
    except json.JSONDecodeError:
        other_sites = []
        
    payment = shop.payment
    if not payment:
        payment = Payment(shop_id=shop.id)
        db.session.add(payment)
        db.session.commit()
        
    payment_data = {
        'allow_payment_local': payment.allow_payment_local,
        'allow_payment_online': payment.allow_payment_online,
        'allow_booking_now': payment.allow_booking_now,
        'allow_booking_later': payment.allow_booking_later,
        'payout_method': payment.payout_method,
        'payout_number': payment.payout_number,
        'payout_bank_details': payment.payout_bank_details
    }
        
    return jsonify({
        'profile': {
            'nome_loja': shop.nome_loja, 'slug': shop.slug, 'descricao': shop.descricao,
            'telefone': shop.telefone, 'morada': shop.morada,
            'profile_image_url': shop.profile_image_url, 'announcement_url': shop.announcement_url,
            'profile_banner_url': shop.profile_banner_url,
            'business_model': shop.business_model 
        },
        'social': {
            'whatsapp': shop.social_whatsapp, 'facebook': shop.social_facebook,
            'instagram': shop.social_instagram, 'other_sites': other_sites
        },
        'customization': {
            'theme_color': shop.theme_color, 
            'layout_style': shop.layout_style, 
            'show_products': shop.show_products, 'show_schedule': shop.show_schedule,
            'show_bookings': shop.show_bookings, 'show_info': shop.show_info,
            'background_color': shop.background_color,
            'product_layout_style': shop.product_layout_style,
            'allow_delivery': shop.allow_delivery,
            'allow_takeaway': shop.allow_takeaway
        },
        'payment': payment_data,
        'schedules': schedules_list
    }), 200

@app.route('/api/dashboard/update', methods=['POST'])
@login_required
def api_update_dashboard():
    shop = current_user.shop
    if not shop:
        return jsonify({'error': 'Loja não encontrada.'}), 404
        
    data = request.get_json()

    try:
        profile = data.get('profile', {})
        social = data.get('social', {})
        novo_slug = profile.get('slug')
        if novo_slug and novo_slug != shop.slug:
            if Shop.query.filter(Shop.slug == novo_slug, Shop.id != shop.id).first():
                return jsonify({'error': 'Esse URL de loja já está a ser usado.'}), 409
            shop.slug = novo_slug
        shop.nome_loja = profile.get('nome_loja', shop.nome_loja)
        shop.descricao = profile.get('descricao', shop.descricao)
        shop.telefone = profile.get('telefone', shop.telefone)
        shop.morada = profile.get('morada', shop.morada)
        shop.profile_image_url = profile.get('profile_image_url', shop.profile_image_url)
        shop.announcement_url = profile.get('announcement_url', shop.announcement_url)
        shop.profile_banner_url = profile.get('profile_banner_url', shop.profile_banner_url)
        
        shop.social_whatsapp = social.get('whatsapp', shop.social_whatsapp)
        shop.social_facebook = social.get('facebook', shop.social_facebook)
        shop.social_instagram = social.get('instagram', shop.social_instagram)
        shop.other_sites = json.dumps(social.get('other_sites', []))

        custom = data.get('customization', {})
        shop.theme_color = custom.get('theme_color', shop.theme_color) 
        shop.layout_style = custom.get('layout_style', shop.layout_style)
        shop.show_products = custom.get('show_products', shop.show_products)
        shop.show_schedule = custom.get('show_schedule', shop.show_schedule)
        shop.show_bookings = custom.get('show_bookings', shop.show_bookings)
        shop.show_info = custom.get('show_info', shop.show_info)
        shop.background_color = custom.get('background_color', shop.background_color)
        shop.product_layout_style = custom.get('product_layout_style', shop.product_layout_style)
        shop.allow_delivery = custom.get('allow_delivery', shop.allow_delivery)
        shop.allow_takeaway = custom.get('allow_takeaway', shop.allow_takeaway)

        payment_data = data.get('payment', {})
        payment = shop.payment
        if not payment:
             payment = Payment(shop_id=shop.id)
             db.session.add(payment)
             
        payment.allow_payment_local = payment_data.get('allow_payment_local', payment.allow_payment_local)
        payment.allow_payment_online = payment_data.get('allow_payment_online', payment.allow_payment_online)
        payment.allow_booking_now = payment_data.get('allow_booking_now', payment.allow_booking_now)
        payment.allow_booking_later = payment_data.get('allow_booking_later', payment.allow_booking_later)
        payment.payout_method = payment_data.get('payout_method', payment.payout_method)
        payment.payout_number = payment_data.get('payout_number', payment.payout_number)
        payment.payout_bank_details = payment_data.get('payout_bank_details', payment.payout_bank_details)

        horarios_list = data.get('schedules')
        if horarios_list and len(horarios_list) == 7:
            for index, valores in enumerate(horarios_list):
                dia_semana_int = index 
                schedule_db = Schedule.query.filter_by(shop_id=shop.id, dia_semana=dia_semana_int).first()
                if schedule_db:
                    schedule_db.esta_aberto = valores['aberto']
                    schedule_db.hora_inicio = valores['inicio']
                    schedule_db.hora_fim = valores['fim']
                else:
                    new_schedule = Schedule(
                        shop_id=shop.id, dia_semana=dia_semana_int,
                        esta_aberto = valores['aberto'],
                        hora_inicio = valores['inicio'],
                        hora_fim = valores['fim']
                    )
                    db.session.add(new_schedule)
        
        db.session.commit()
        return jsonify({'message': 'Alterações guardadas com sucesso!'}), 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao guardar: {str(e)}'}), 500

@app.route('/api/dashboard/metrics', methods=['GET'])
@login_required
def api_get_metrics():
    shop_id = current_user.shop.id
    business_model = current_user.shop.business_model
    total_revenue = 0.0
    total_bookings = 0
    pending_count = 0
    if business_model == 'agendamento':
        total_revenue_query = db.session.query(func.sum(Booking.total_price)).filter(
            Booking.shop_id == shop_id,
            Booking.status == 'Confirmado'
        ).scalar()
        total_revenue = total_revenue_query or 0.0
        total_bookings = Booking.query.filter_by(shop_id=shop_id).count()
        pending_count = Booking.query.filter_by(shop_id=shop_id, status='Pendente').count()
    elif business_model == 'delivery':
        total_revenue_query = db.session.query(func.sum(Order.total_price)).filter(
            Order.shop_id == shop_id,
            Order.status.in_(['Confirmado', 'Pendente', 'Entregue']) 
        ).scalar()
        total_revenue = total_revenue_query or 0.0
        total_bookings = Order.query.filter_by(shop_id=shop_id).count()
        pending_count = Order.query.filter_by(shop_id=shop_id, status='Pendente').count()
    visitor_count = ShopVisit.query.filter_by(shop_id=shop_id).count()
    return jsonify({
        'total_revenue': total_revenue,
        'total_bookings': total_bookings,
        'pending_count': pending_count,
        'visitor_count': visitor_count
    }), 200

@app.route('/api/dashboard/bookings', methods=['GET'])
@login_required
def api_get_dashboard_bookings():
    shop = current_user.shop
    status = request.args.get('status', 'Pendente')
    results = []
    if shop.business_model == 'agendamento':
        bookings = Booking.query.filter_by(shop_id=shop.id, status=status).order_by(Booking.data_hora_inicio.asc()).all()
        for b in bookings:
            results.append({
                'id': b.id,
                'ticket_number': b.ticket_number,
                'nome_cliente': b.nome_cliente,
                'item_nome': b.service_details.nome if b.service_details else "Serviço Removido",
                'total_price': b.total_price,
                'data_hora': b.data_hora_inicio.isoformat(),
                'status': b.status
            })
    else: # 'delivery'
        orders = Order.query.filter_by(shop_id=shop.id, status=status).order_by(Order.created_at.asc()).all()
        for o in orders:
            item_nome = o.items[0].product_name if o.items else "N/A"
            if len(o.items) > 1:
                item_nome = f"{item_nome} e mais {len(o.items) - 1}..."
            results.append({
                'id': o.id,
                'ticket_number': o.ticket_number,
                'nome_cliente': o.nome_cliente,
                'item_nome': item_nome,
                'total_price': o.total_price,
                'created_at': o.created_at.isoformat(), 
                'order_type': o.order_type,
                'status': o.status
            })
    return jsonify(results), 200

@app.route('/api/dashboard/bookings/update-status', methods=['POST'])
@login_required
def api_update_booking_status():
    shop = current_user.shop
    data = request.get_json()
    item_id = data.get('id')
    new_status = data.get('status')
    if not item_id or not new_status:
        return jsonify({'error': 'Dados incompletos'}), 400
    item_to_update = None
    if shop.business_model == 'agendamento':
        item_to_update = Booking.query.filter_by(id=item_id, shop_id=shop.id).first()
    else: # 'delivery'
        item_to_update = Order.query.filter_by(id=item_id, shop_id=shop.id).first()
    if not item_to_update:
        return jsonify({'error': 'Item não encontrado'}), 404
    try:
        item_to_update.status = new_status
        db.session.commit()
        return jsonify({'message': f'Status atualizado para {new_status}'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao atualizar: {str(e)}'}), 500

@app.route('/api/dashboard/upload-image', methods=['POST'])
@login_required
def api_upload_image():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum ficheiro enviado'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nome do ficheiro vazio'}), 400
    if file:
        filename = secure_filename(f"{current_user.id}_{datetime.datetime.utcnow().timestamp()}_{file.filename}")
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        try:
            file.save(filepath)
            file_url = url_for('uploaded_file', filename=filename, _external=True)
            return jsonify({'message': 'Upload bem-sucedido', 'file_url': file_url}), 201
        except Exception as e:
            return jsonify({'error': f'Não foi possível guardar o ficheiro: {str(e)}'}), 500
    return jsonify({'error': 'Tipo de ficheiro inválido'}), 400

@app.route('/api/dashboard/kds-tickets', methods=['GET'])
@login_required
def api_get_kds_tickets():
    shop = current_user.shop
    today = date.today()
    start_of_day = datetime.datetime.combine(today, datetime.time.min)
    end_of_day = datetime.datetime.combine(today, datetime.time.max)
    tickets = []
    bookings_today = Booking.query.filter(
        Booking.shop_id == shop.id,
        Booking.status.in_(['Pendente', 'Confirmado']),
        Booking.data_hora_inicio >= start_of_day,
        Booking.data_hora_inicio <= end_of_day
    ).all()
    for b in bookings_today:
        tickets.append({
            'ticket_number': b.ticket_number,
            'nome_cliente': b.nome_cliente,
            'hora': b.data_hora_inicio.strftime('%H:%M'), 
            'status': b.status
        })
    orders_today = Order.query.filter(
        Order.shop_id == shop.id,
        Order.status.in_(['Pendente', 'Confirmado']),
        Order.created_at >= start_of_day,
        Order.created_at <= end_of_day
    ).all()
    for o in orders_today:
        tickets.append({
            'ticket_number': o.ticket_number,
            'nome_cliente': o.nome_cliente,
            'hora': o.order_type.upper(), 
            'status': o.status
        })
    tickets.sort(key=lambda x: x['ticket_number'])
    return jsonify(tickets), 200

@app.route('/api/dashboard/services', methods=['GET'])
@login_required
def api_get_services():
    services = Service.query.filter_by(shop_id=current_user.shop.id).all()
    return jsonify([{
        'id': s.id, 'nome': s.nome, 'preco': s.preco, 'duracao_min': s.duracao_min,
        'payment_mode': s.payment_mode, 'deposit_value': s.deposit_value
    } for s in services]), 200

@app.route('/api/dashboard/services/<int:id>', methods=['GET'])
@login_required
def api_get_service(id):
    service = Service.query.filter_by(id=id, shop_id=current_user.shop.id).first_or_404()
    return jsonify({
        'id': service.id, 'nome': service.nome, 'preco': service.preco, 'duracao_min': service.duracao_min,
        'payment_mode': service.payment_mode, 'deposit_value': service.deposit_value
    }), 200

@app.route('/api/dashboard/services', methods=['POST'])
@login_required
def api_create_service():
    data = request.get_json()
    try:
        new_service = Service(
            nome=data['nome'],
            preco=float(data['preco']),
            duracao_min=int(data['duracao_min']),
            payment_mode=data.get('payment_mode', 'integral'),
            deposit_value=float(data.get('deposit_value', 0.0)),
            shop_id=current_user.shop.id
        )
        db.session.add(new_service)
        db.session.commit()
        return jsonify({'message': 'Serviço criado com sucesso!', 'id': new_service.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao criar serviço: {str(e)}'}), 500

@app.route('/api/dashboard/services/<int:id>', methods=['PUT'])
@login_required
def api_update_service(id):
    service = Service.query.filter_by(id=id, shop_id=current_user.shop.id).first_or_404()
    data = request.get_json()
    try:
        service.nome = data['nome']
        service.preco = float(data['preco'])
        service.duracao_min = int(data['duracao_min'])
        service.payment_mode = data.get('payment_mode', 'integral')
        service.deposit_value = float(data.get('deposit_value', 0.0))
        db.session.commit()
        return jsonify({'message': 'Serviço atualizado com sucesso!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao atualizar serviço: {str(e)}'}), 500

@app.route('/api/dashboard/services/<int:id>', methods=['DELETE'])
@login_required
def api_delete_service(id):
    service = Service.query.filter_by(id=id, shop_id=current_user.shop.id).first_or_404()
    try:
        db.session.delete(service)
        db.session.commit()
        return jsonify({'message': 'Serviço apagado com sucesso!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao apagar serviço. Verifique se existem marcações ativas. ({str(e)})'}), 500

@app.route('/api/dashboard/products', methods=['GET'])
@login_required
def api_get_products():
    products = Product.query.filter_by(shop_id=current_user.shop.id).all()
    return jsonify([{
        'id': p.id, 'nome': p.nome, 'preco': p.preco, 'descricao': p.descricao,
        'image_url': p.image_url, 'product_type': p.product_type,
        'payment_mode': p.payment_mode, 'deposit_value': p.deposit_value
    } for p in products]), 200

@app.route('/api/dashboard/products/<int:id>', methods=['GET'])
@login_required
def api_get_product(id):
    product = Product.query.filter_by(id=id, shop_id=current_user.shop.id).first_or_404()
    return jsonify({
        'id': product.id, 'nome': product.nome, 'preco': product.preco, 'descricao': product.descricao,
        'image_url': product.image_url, 'product_type': product.product_type,
        'payment_mode': product.payment_mode, 'deposit_value': product.deposit_value
    }), 200

@app.route('/api/dashboard/products', methods=['POST'])
@login_required
def api_create_product():
    data = request.get_json()
    try:
        new_product = Product(
            nome=data['nome'],
            preco=float(data['preco']),
            descricao=data.get('descricao'),
            image_url=data.get('image_url'),
            payment_mode=data.get('payment_mode', 'integral'),
            deposit_value=float(data.get('deposit_value', 0.0)),
            product_type='simples', 
            shop_id=current_user.shop.id
        )
        db.session.add(new_product)
        db.session.commit()
        return jsonify({'message': 'Produto criado com sucesso!', 'id': new_product.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao criar produto: {str(e)}'}), 500

@app.route('/api/dashboard/products/<int:id>', methods=['PUT'])
@login_required
def api_update_product(id):
    product = Product.query.filter_by(id=id, shop_id=current_user.shop.id).first_or_404()
    data = request.get_json()
    try:
        product.nome = data['nome']
        product.preco = float(data['preco'])
        product.descricao = data.get('descricao')
        product.image_url = data.get('image_url')
        product.payment_mode = data.get('payment_mode', 'integral')
        product.deposit_value = float(data.get('deposit_value', 0.0))
        db.session.commit()
        return jsonify({'message': 'Produto atualizado com sucesso!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao atualizar produto: {str(e)}'}), 500

@app.route('/api/dashboard/products/<int:id>', methods=['DELETE'])
@login_required
def api_delete_product(id):
    product = Product.query.filter_by(id=id, shop_id=current_user.shop.id).first_or_404()
    try:
        db.session.delete(product)
        db.session.commit()
        return jsonify({'message': 'Produto apagado com sucesso!'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro ao apagar produto: {str(e)}'}), 500

# --- Configuração do Flask-Admin (Opcional, mas boa prática) ---
class SecureModelView(ModelView):
    def is_accessible(self):
        return current_user.is_authenticated and current_user.email == ADMIN_EMAIL
    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('login_page'))

admin = Admin(app, name='MarcaçãoPro Admin')
admin.add_view(SecureModelView(User, db.session))
admin.add_view(SecureModelView(Shop, db.session))
admin.add_view(SecureModelView(Booking, db.session))
admin.add_view(SecureModelView(Order, db.session))
admin.add_view(SecureModelView(Service, db.session))
admin.add_view(SecureModelView(Product, db.session))
admin.add_view(SecureModelView(Payment, db.session))

# --- Execução da App ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all() 
    app.run(debug=True, host='0.0.0.0', port=5000)