from datetime import datetime
from flask_login import UserMixin
from app.extensions import db, bcrypt, login_manager

# Tabela de ligação Muitos-para-Muitos
staff_services_link = db.Table('staff_services_link',
    db.Column('staff_id', db.Integer, db.ForeignKey('staff_member.id'), primary_key=True),
    db.Column('service_id', db.Integer, db.ForeignKey('service.id'), primary_key=True)
)

variant_options_link = db.Table('variant_options_link',
    db.Column('variant_id', db.Integer, db.ForeignKey('product_variant.id'), primary_key=True),
    db.Column('option_value_id', db.Integer, db.ForeignKey('product_option_value.id'), primary_key=True)
)

# --- Modelos Globais ---
class ShopCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    icon = db.Column(db.String(50))
    shops = db.relationship('Shop', backref='category', lazy=True)

class ProductCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    products = db.relationship('Product', backref='local_category', lazy=True)

class SubscriptionPlan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    display_name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    features = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    shops = db.relationship('Shop', backref='plan', lazy=True)

class ShopSubscription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plan.id'), nullable=False)
    status = db.Column(db.String(20), default='active')
    start_date = db.Column(db.DateTime, default=datetime.utcnow)
    end_date = db.Column(db.DateTime)
    auto_renew = db.Column(db.Boolean, default=True)

class CustomDomain(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    domain_name = db.Column(db.String(100), unique=True, nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=False)
    dns_records = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ShopEmail(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    email_address = db.Column(db.String(100), unique=True, nullable=False)
    forward_to = db.Column(db.String(100), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class WalletTransaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    type = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(255))
    status = db.Column(db.String(20), default='completed')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# --- Modelos de Utilizador ---

class Buyer(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    telefone = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(100), nullable=True)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    favorites = db.relationship('Favorite', backref='buyer', lazy=True)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    telefone = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=True)
    password_hash = db.Column(db.String(128), nullable=False)
    shops = db.relationship('Shop', backref='owner', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

@login_manager.user_loader
def load_user(user_id):
    user = db.session.get(User, int(user_id))
    if user: return user
    return db.session.get(Buyer, int(user_id))

class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('buyer.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (
        db.UniqueConstraint('buyer_id', 'product_id', name='unique_product_fav'),
        db.UniqueConstraint('buyer_id', 'shop_id', name='unique_shop_fav'),
    )

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    type = db.Column(db.String(20), default='info')
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# --- Modelos de Negócio ---

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
    profile_banner_url = db.Column(db.String(255), nullable=True)
    theme_color = db.Column(db.String(7), default='#3b82f6')
    background_color = db.Column(db.String(7), default='#F0F2F5')
    product_layout_style = db.Column(db.String(20), default='lista')
    layout_style = db.Column(db.String(20), default='default')
    show_products = db.Column(db.Boolean, default=True)
    show_schedule = db.Column(db.Boolean, default=True)
    show_bookings = db.Column(db.Boolean, default=True)
    show_info = db.Column(db.Boolean, default=True)
    social_whatsapp = db.Column(db.String(100), nullable=True)
    social_facebook = db.Column(db.String(100), nullable=True)
    social_instagram = db.Column(db.String(100), nullable=True)
    other_sites = db.Column(db.Text, nullable=True)
    announcement_url = db.Column(db.String(255), nullable=True)
    verification_status = db.Column(db.String(30), default='Não Verificado')
    onboarding_completed = db.Column(db.Boolean, default=False)
    delivery_fee = db.Column(db.Float, default=0.0)
    min_order_value = db.Column(db.Float, default=0.0)
    service_fee = db.Column(db.Float, default=0.0)
    plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plan.id'), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    shop_category_id = db.Column(db.Integer, db.ForeignKey('shop_category.id'), nullable=True)

    services = db.relationship('Service', backref='shop', lazy=True, cascade="all, delete-orphan")
    schedules = db.relationship('Schedule', backref='shop', lazy=True, cascade="all, delete-orphan")
    bookings = db.relationship('Booking', backref='shop', lazy=True, cascade="all, delete-orphan")
    products = db.relationship('Product', backref='shop', lazy=True, cascade="all, delete-orphan")
    visits = db.relationship('ShopVisit', backref='shop', lazy=True, cascade="all, delete-orphan")
    orders = db.relationship('Order', backref='shop', lazy=True, cascade="all, delete-orphan")
    blog_posts = db.relationship('BlogPost', backref='shop', lazy=True, cascade="all, delete-orphan")
    staff_members = db.relationship('StaffMember', backref='shop', lazy=True, cascade="all, delete-orphan")
    chat_sessions = db.relationship('ChatSession', backref='shop', lazy=True, cascade="all, delete-orphan")
    verification_docs = db.relationship('ShopVerificationDoc', backref='shop', lazy=True, cascade="all, delete-orphan")
    clients = db.relationship('Client', backref='shop', lazy=True, cascade="all, delete-orphan")
    quotes = db.relationship('Quote', backref='shop', lazy=True, cascade="all, delete-orphan")
    coupons = db.relationship('Coupon', backref='shop', lazy=True, cascade="all, delete-orphan")
    reviews = db.relationship('Review', backref='shop', lazy=True, cascade="all, delete-orphan")
    campaigns = db.relationship('Campaign', backref='shop', lazy=True, cascade="all, delete-orphan")

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
    preco = db.Column(db.Float, nullable=True, default=0.0)
    image_url = db.Column(db.String(255), nullable=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    payment_mode = db.Column(db.String(20), default='integral')
    deposit_value = db.Column(db.Float, nullable=True, default=0.0)
    product_type = db.Column(db.String(20), default='simples', nullable=False)
    product_category_id = db.Column(db.Integer, db.ForeignKey('product_category.id'), nullable=True)
    variants = db.relationship('ProductVariant', backref='product', lazy=True, cascade="all, delete-orphan")
    options = db.relationship('ProductOption', backref='product', lazy=True, cascade="all, delete-orphan")

class ProductOption(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    values = db.relationship('ProductOptionValue', backref='option', lazy=True, cascade="all, delete-orphan")

class ProductOptionValue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    option_id = db.Column(db.Integer, db.ForeignKey('product_option.id'), nullable=False)
    value = db.Column(db.String(50), nullable=False)

class ProductVariant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    preco = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, default=99)
    sku = db.Column(db.String(100), nullable=True)
    option_values = db.relationship('ProductOptionValue', secondary=variant_options_link)

class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    duracao_min = db.Column(db.Integer, nullable=False, default=30)
    preco = db.Column(db.Float, nullable=False, default=0.0)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    payment_mode = db.Column(db.String(20), default='integral')
    deposit_value = db.Column(db.Float, nullable=True, default=0.0)
    bookings = db.relationship('Booking', backref='service', lazy=True)

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
    total_price = db.Column(db.Float, nullable=False, default=0.0)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('service.id'), nullable=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('staff_member.id'), nullable=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey('buyer.id'), nullable=True)
    # NOTA: service_details removido para evitar conflito de relacionamento. 
    # Usar 'booking.service' que é providenciado pelo backref em Service.

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    ticket_number = db.Column(db.String(10), unique=True, nullable=False)
    nome_cliente = db.Column(db.String(100), nullable=False)
    telefone_cliente = db.Column(db.String(20), nullable=True)
    order_type = db.Column(db.String(20), nullable=False)
    delivery_address = db.Column(db.Text, nullable=True)
    total_price = db.Column(db.Float, nullable=False, default=0.0)
    amount_paid = db.Column(db.Float, nullable=False, default=0.0)
    status = db.Column(db.String(30), default='Aguardando Pagamento')
    payout_status = db.Column(db.String(30), default='Pendente')
    commission_amount = db.Column(db.Float, nullable=True)
    delivery_lat = db.Column(db.Float, nullable=True)
    delivery_lng = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    buyer_id = db.Column(db.Integer, db.ForeignKey('buyer.id'), nullable=True)
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    product_name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    unit_price = db.Column(db.Float, nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=True)
    product_variant_id = db.Column(db.Integer, db.ForeignKey('product_variant.id'), nullable=True)

class ShopVisit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    ip_address = db.Column(db.String(45), nullable=True)

class BlogPost(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(255), nullable=True)
    is_published = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class StaffMember(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(100), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    services = db.relationship('Service', secondary=staff_services_link, lazy='dynamic', backref=db.backref('assigned_staff', lazy=True))

class ChatSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    client_session_id = db.Column(db.String(100), unique=True, nullable=False)
    client_name = db.Column(db.String(100), nullable=True)
    last_message_at = db.Column(db.DateTime, default=datetime.utcnow)
    shop_read = db.Column(db.Boolean, default=True)
    client_read = db.Column(db.Boolean, default=True)
    messages = db.relationship('ChatMessage', backref='session', lazy=True, cascade="all, delete-orphan")

class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('chat_session.id'), nullable=False)
    sender_type = db.Column(db.String(10), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class ShopVerificationDoc(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    document_type = db.Column(db.String(50), nullable=False)
    file_url = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(20), default='Pendente')
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)

class Client(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    nome = db.Column(db.String(100), nullable=False)
    telefone = db.Column(db.String(30), nullable=True, unique=True)
    email = db.Column(db.String(100), nullable=True, unique=True)
    notas = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Quote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    nome_cliente = db.Column(db.String(100), nullable=False)
    telefone_cliente = db.Column(db.String(30), nullable=False)
    details = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Coupon(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    code = db.Column(db.String(50), nullable=False)
    type = db.Column(db.String(20), nullable=False, default='percent')
    value = db.Column(db.Float, nullable=False)
    usage_limit = db.Column(db.Integer, default=0)
    usage_count = db.Column(db.Integer, default=0)
    __table_args__ = (db.UniqueConstraint('shop_id', 'code'),)

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    booking_id = db.Column(db.Integer, db.ForeignKey('booking.id'), nullable=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=True)
    client_name = db.Column(db.String(100), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    text = db.Column(db.Text, nullable=True)
    reply = db.Column(db.Text, nullable=True)
    is_published = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Campaign(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shop_id = db.Column(db.Integer, db.ForeignKey('shop.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    budget = db.Column(db.Float, nullable=False)
    target = db.Column(db.String(100), nullable=False)
    facebook_ad_id = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)