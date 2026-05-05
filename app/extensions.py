from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_mail import Mail
from flask_socketio import SocketIO
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
bcrypt = Bcrypt()
migrate = Migrate()
mail = Mail()
socketio = SocketIO(cors_allowed_origins="*")
login_manager = LoginManager()

# Configuração do Login Manager
login_manager.login_view = 'main.login_page'
login_manager.login_message = 'Por favor, faça login para aceder.'

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)