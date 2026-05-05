import datetime
import random
from flask import Blueprint, request, jsonify, url_for, current_app
from flask_login import login_user, logout_user, login_required, current_user
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature

# Importar a função de envio (agora usa SMSPortal)
# Mantivemos o nome do ficheiro 'twilio_notifications' para compatibilidade
from twilio_notifications import send_sms

from app.models import User, Shop, Schedule, Payment, Service, Product, Buyer
from app.extensions import db, limiter, mail
from app.utils import normalize_phone_number, validate_password_strength
from app.config import Config

# O prefixo '/api' aplica-se a todas as rotas deste ficheiro
bp = Blueprint('auth', __name__, url_prefix='/api')

# =============================================================================
# ARMAZENAMENTO TEMPORÁRIO DE OTP (Em memória)
# Nota: Em produção, o ideal seria usar Redis ou Banco de Dados para persistência.
# Estrutura: {'+258841234567': {'code': '123456', 'timestamp': datetime object}}
# =============================================================================
otp_storage = {}

# =============================================================================
# FUNÇÕES AUXILIARES
# =============================================================================

def send_password_reset_email(user):
    """Gera token e envia email de recuperação."""
    if not user.email:
        return False # Não é possível enviar se não tiver email
        
    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    token = serializer.dumps(user.email, salt='password-reset')
    
    # A URL aponta para a página HTML de reset no blueprint 'main'
    reset_url = url_for('main.reset_password_page', token=token, _external=True)
    
    email_body = f"""Olá {user.nome},

Alguém (esperemos que você) solicitou a redefinição da sua password na Ecomoz.

Clique no link abaixo para definir uma nova password:
{reset_url}

Este link expira em 1 hora.
Se não foi você, ignore este email.
"""
    try:
        msg = Message(
            subject="Recuperação de Password - Ecomoz",
            recipients=[user.email],
            body=email_body
        )
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Erro ao enviar email: {str(e)}")
        return False

# =============================================================================
# ROTAS DE LOGIN POR SMS (OTP)
# =============================================================================

@bp.route('/auth/send-otp', methods=['POST'])
@limiter.limit("5 per minute")
def send_otp():
    """Gera código OTP e envia via SMSPortal."""
    data = request.get_json()
    raw_phone = data.get('phone')
    role = data.get('role', 'buyer') # 'buyer' ou 'owner'
    
    if not raw_phone: 
        return jsonify({'error': 'Número de telefone obrigatório.'}), 400
    
    phone = normalize_phone_number(raw_phone)
    if not phone: 
        return jsonify({'error': 'Número de telefone inválido.'}), 400

    try:
        # 1. Gerar Código de 6 dígitos
        code = str(random.randint(100000, 999999))
        
        # 2. Guardar em memória (com timestamp para expiração futura)
        # Sobrescreve qualquer código anterior para este número
        otp_storage[phone] = {
            'code': code,
            'timestamp': datetime.datetime.now()
        }
        
        # 3. Enviar via SMSPortal (usando a função wrapper)
        msg_body = f"Seu codigo Ecomoz e: {code}"
        
        # Nota: send_sms retorna True se enviado, False se falhou
        sent = send_sms(phone, msg_body)
        
        if sent:
            return jsonify({
                'message': 'Código enviado com sucesso', 
                'status': 'pending', 
                'phone': phone
            }), 200
        else:
            # Se falhar o envio, removemos o código da memória por segurança
            if phone in otp_storage:
                del otp_storage[phone]
            return jsonify({'error': 'Falha no envio do SMS. Verifique o número ou tente mais tarde.'}), 500
        
    except Exception as e:
        print(f"Erro Interno Auth: {e}")
        return jsonify({'error': 'Erro ao processar pedido.'}), 500

@bp.route('/auth/verify-otp', methods=['POST'])
@limiter.limit("10 per minute")
def verify_otp():
    """Verifica o código OTP armazenado em memória e realiza login."""
    data = request.get_json()
    phone = normalize_phone_number(data.get('phone'))
    code = data.get('code')
    role = data.get('role', 'buyer')
    nome = data.get('nome') # Usado para criar Buyer se não existir
    
    if not phone or not code: 
        return jsonify({'error': 'Dados incompletos'}), 400

    # 1. Verificar se existe código para este número
    stored_data = otp_storage.get(phone)
    
    if not stored_data:
        return jsonify({'error': 'Nenhum código solicitado ou expirado.'}), 400
        
    # 2. Verificar validade (Ex: 5 minutos = 300 segundos)
    time_diff = (datetime.datetime.now() - stored_data['timestamp']).total_seconds()
    if time_diff > 300:
        del otp_storage[phone]
        return jsonify({'error': 'Código expirado. Peça um novo.'}), 400

    # 3. Validar Código
    if stored_data['code'] == str(code).strip():
        # Sucesso! Limpar código usado para não ser reutilizado
        del otp_storage[phone]
        
        try:
            # --- Lógica para Comprador (Buyer) ---
            if role == 'buyer':
                user = Buyer.query.filter_by(telefone=phone).first()
                if not user:
                    # Cria conta automaticamente para comprador
                    user = Buyer(
                        nome=nome or f"Cliente {phone[-4:]}", 
                        telefone=phone, 
                        password_hash="otp_login" # Placeholder
                    )
                    db.session.add(user)
                
                user.last_login = datetime.datetime.utcnow()
                db.session.commit()
                
                return jsonify({
                    'message': 'Login efetuado', 
                    'user_id': user.id, 
                    'nome': user.nome,
                    'role': 'buyer'
                }), 200
            
            # --- Lógica para Lojista (Owner) ---
            elif role == 'owner':
                user = User.query.filter_by(telefone=phone).first()
                if user:
                    login_user(user, remember=True)
                    return jsonify({
                        'message': 'Bem-vindo de volta!', 
                        'status': 'success', 
                        'redirect': '/dashboard'
                    }), 200
                else:
                    # Retorna status para o frontend mostrar formulário de conclusão de registo
                    return jsonify({
                        'message': 'Número verificado. Prossiga com o registo.', 
                        'status': 'new_user'
                    }), 200
        
        except Exception as e:
             return jsonify({'error': f'Erro de base de dados: {str(e)}'}), 500
    
    # Se chegou aqui, o código está incorreto
    return jsonify({'error': 'Código inválido.'}), 400

# =============================================================================
# ROTAS DE REGISTO E LOGIN (LOJISTA)
# =============================================================================

@bp.route('/auth/register-owner', methods=['POST'])
@limiter.limit("10 per hour")
def register_owner():
    """
    Regista um novo Lojista e cria a sua Loja inicial.
    URL ajustada para: /api/auth/register-owner
    """
    data = request.get_json()
    
    phone = normalize_phone_number(data.get('phone'))
    nome = data.get('nome')
    nome_loja = data.get('nome_loja')
    slug = data.get('slug')
    password = data.get('password')
    email = data.get('email')
    business_model = data.get('business_model', 'agendamento')
    
    if not all([phone, nome, nome_loja, slug, password]):
        return jsonify({'error': 'Campos obrigatórios em falta.'}), 400
        
    is_valid, msg = validate_password_strength(password)
    if not is_valid: 
        return jsonify({'error': msg}), 400
    
    if User.query.filter_by(telefone=phone).first(): 
        return jsonify({'error': 'Este número de telemóvel já está registado.'}), 409
        
    if email and User.query.filter_by(email=email).first():
        return jsonify({'error': 'Este email já está registado.'}), 409
        
    if Shop.query.filter_by(slug=slug).first(): 
        return jsonify({'error': 'Este URL de loja já existe. Escolha outro.'}), 409
    
    try:
        # 1. Criar Utilizador
        user = User(telefone=phone, nome=nome, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.flush() # Para obter o ID
        
        # 2. Criar Loja
        shop = Shop(
            nome_loja=nome_loja, 
            slug=slug, 
            user_id=user.id,
            business_model=business_model,
            descricao='Bem-vindo ao meu negócio!',
            theme_color='#3b82f6',
            background_color='#F0F2F5'
        )
        db.session.add(shop)
        db.session.flush()
        
        # 3. Configurações Padrão (Horário, Pagamento, Serviço/Produto Exemplo)
        # Horário: Seg-Sex 09-18
        for i in range(7):
            db.session.add(Schedule(
                shop_id=shop.id, dia_semana=i, 
                hora_inicio="09:00", hora_fim="18:00", 
                esta_aberto=(i < 5)
            ))
            
        # Pagamento
        db.session.add(Payment(
            shop_id=shop.id, 
            allow_payment_local=True,
            allow_payment_online=True, # Default ativo para incentivar uso
            allow_booking_now=True
        ))
        
        # Item Exemplo
        if shop.business_model == 'agendamento':
            db.session.add(Service(
                nome="Corte de Cabelo (Exemplo)", 
                duracao_min=30, 
                preco=500, 
                shop_id=shop.id
            ))
        else:
            db.session.add(Product(
                nome="Produto Exemplo", 
                preco=1000, 
                descricao="Descrição do produto...", 
                shop_id=shop.id
            ))
            
        db.session.commit()
        
        # Login automático
        login_user(user)
        return jsonify({'message': 'Conta criada com sucesso!', 'redirect': '/dashboard'}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro no registo: {str(e)}'}), 500

@bp.route('/login-password', methods=['POST'])
@limiter.limit("10 per minute")
def login_password():
    """
    Login tradicional com senha (APENAS TELEMÓVEL).
    URL ajustada para: /api/login-password
    """
    data = request.get_json()
    # Aceitamos 'identifier' ou 'phone' para compatibilidade, mas tratamos sempre como telefone
    raw_phone = data.get('phone') or data.get('identifier')
    password = data.get('password')
    
    if not raw_phone or not password:
        return jsonify({'error': 'Telemóvel e senha são obrigatórios.'}), 400
    
    # Normaliza o número (adiciona +258 se necessário)
    phone = normalize_phone_number(raw_phone)
    if not phone:
        return jsonify({'error': 'Número de telemóvel inválido.'}), 400
        
    # Busca apenas pelo telefone (Email removido da lógica de login)
    user = User.query.filter_by(telefone=phone).first()
        
    if user and user.check_password(password):
        login_user(user, remember=True)
        return jsonify({'message': 'Login efetuado com sucesso', 'redirect': '/dashboard'}), 200
        
    return jsonify({'error': 'Credenciais inválidas.'}), 401

@bp.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
    """Logout via API."""
    logout_user()
    return jsonify({'message': 'Sessão terminada.', 'redirect': '/login'}), 200

# =============================================================================
# RECUPERAÇÃO DE PASSWORD
# =============================================================================

@bp.route('/forgot-password', methods=['POST'])
@limiter.limit("5 per hour")
def forgot_password():
    """Solicita link de recuperação de password."""
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email é obrigatório para recuperação.'}), 400
        
    user = User.query.filter_by(email=email).first()
    
    # Se o utilizador existe e tem email configurado
    if user and user.email:
        send_password_reset_email(user)
        
    # Retorna sempre sucesso por segurança
    return jsonify({'message': 'Se o email estiver associado a uma conta, receberá um link em breve.'}), 200

@bp.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    """Define nova password usando o token."""
    data = request.get_json()
    new_password = data.get('password')
    
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'A nova password deve ter pelo menos 6 caracteres.'}), 400

    serializer = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    
    try:
        email = serializer.loads(token, salt='password-reset', max_age=3600) # 1 hora
    except SignatureExpired:
        return jsonify({'error': 'O link expirou. Peça um novo.'}), 400
    except (BadTimeSignature, Exception):
        return jsonify({'error': 'Link inválido.'}), 400
        
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'Utilizador não encontrado.'}), 404
        
    try:
        user.set_password(new_password)
        db.session.commit()
        return jsonify({'message': 'Password atualizada com sucesso! Pode fazer login.'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# =============================================================================
# GESTÃO DE COMPRADORES (BUYERS)
# =============================================================================

@bp.route('/buyer/register', methods=['POST'])
def buyer_register():
    """Registo explícito de comprador (via senha)."""
    data = request.get_json()
    phone = normalize_phone_number(data.get('telefone'))
    
    if Buyer.query.filter_by(telefone=phone).first():
        return jsonify({'error': 'Este número já está registado.'}), 400
    
    try:
        buyer = Buyer(
            nome=data['nome'],
            telefone=phone,
            email=data.get('email')
        )
        buyer.set_password(data['password'])
        db.session.add(buyer)
        db.session.commit()
        return jsonify({'message': 'Conta criada com sucesso!', 'buyer_id': buyer.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/buyer/login', methods=['POST'])
def buyer_login():
    """Login de comprador via senha."""
    data = request.get_json()
    phone = normalize_phone_number(data.get('telefone'))
    
    buyer = Buyer.query.filter_by(telefone=phone).first()
    
    if buyer and buyer.check_password(data.get('password')):
        buyer.last_login = datetime.datetime.utcnow()
        db.session.commit()
        return jsonify({
            'message': 'Login com sucesso',
            'buyer_id': buyer.id,
            'nome': buyer.nome
        }), 200
        
    return jsonify({'error': 'Credenciais inválidas'}), 401

@bp.route('/buyer/profile', methods=['GET'])
def get_buyer_profile():
    """Retorna perfil do comprador (busca por ID ou Telefone)."""
    buyer_id = request.args.get('buyer_id')
    telefone = request.args.get('telefone')
    
    buyer = None
    if buyer_id:
        buyer = Buyer.query.get(buyer_id)
    elif telefone:
        phone = normalize_phone_number(telefone)
        buyer = Buyer.query.filter_by(telefone=phone).first()
        
    if not buyer:
        return jsonify({'error': 'Cliente não encontrado'}), 404
        
    return jsonify({
        'id': buyer.id,
        'nome': buyer.nome,
        'telefone': buyer.telefone,
        'email': buyer.email
    }), 200

@bp.route('/buyer/profile/update', methods=['POST'])
def update_buyer_profile():
    """Atualiza dados do comprador."""
    data = request.get_json()
    buyer_id = data.get('buyer_id')
    
    if not buyer_id:
        return jsonify({'error': 'ID do cliente obrigatório'}), 400
        
    buyer = Buyer.query.get(buyer_id)
    if not buyer:
        return jsonify({'error': 'Cliente não encontrado'}), 404
        
    try:
        if data.get('nome'): buyer.nome = data['nome']
        if data.get('email'): buyer.email = data['email']
        
        db.session.commit()
        return jsonify({'message': 'Perfil atualizado com sucesso'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500