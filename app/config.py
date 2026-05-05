import os
import datetime
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'fallback-secret-key-super-forte-obrigatória')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///database.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Uploads
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    
    # Sessão
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_ENV') == 'production'
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = datetime.timedelta(days=7)
    
    # Email
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')
    
    # APIs Externas
    ADMIN_PAYSUITE_API_KEY = os.environ.get('ADMIN_PAYSUITE_API_KEY')
    PAYSUITE_WEBHOOK_SECRET = os.environ.get('PAYSUITE_WEBHOOK_SECRET')
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL')
    
    # SMS Portal (Substituindo Twilio)
    SMSPORTAL_CLIENT_ID = os.environ.get('SMSPORTAL_CLIENT_ID')
    SMSPORTAL_SECRET = os.environ.get('SMSPORTAL_SECRET')
    
    # Meta
    FB_ACCESS_TOKEN = os.environ.get('FB_ACCESS_TOKEN')
    FB_AD_ACCOUNT_ID = os.environ.get('FB_AD_ACCOUNT_ID')
    FB_PAGE_ID = os.environ.get('FB_PAGE_ID')