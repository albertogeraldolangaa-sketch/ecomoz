 
# Ecomoz Core Backend & Dashboard

Este repositório contém o núcleo da infraestrutura da plataforma **Ecomoz**, desenvolvida em Flask, com suporte para gestão de serviços, produtos, pagamentos e comunicação em tempo real.

##  Funcionalidades Principais

* **Arquitetura Modular:** Estrutura baseada em blueprints para escalabilidade (`Dashboard`, `API`, e Webhooks).
* **Comunicação em Tempo Real:** Integração com *Flask-SocketIO* para notificações e chats entre lojistas e clientes.
* **Segurança e Limitação:** Proteção de endpoints com `Flask-Limiter` e autenticação com `Flask-Login` e `Bcrypt`.
* **Gestão de Lojas e Catálogo:** Modelos de dados robustos para serviços, produtos, variantes e campanhas de marketing.
* **Frontend Integrado:** Dashboard administrativo com interface moderna construída com Tailwind CSS e ícones dinâmicos.

---

## Tecnologias Utilizadas

* **Backend:** Python 3.1x + Flask
* **Base de Dados:** SQLAlchemy (SQLite / PostgreSQL)
* **Websockets:** Flask-SocketIO
* **Frontend UI:** Tailwind CSS, Lucide Icons e QRCode.js

---

## ⚙️ Pré-requisitos e Configuração

### 1. Clonar o repositório

```bash
git clone https://github.com/albertogeraldolangaa-sketch/ecomoz.git
cd ecomoz 
```

### 2. Configurar o Ambiente Virtual

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
```

### 3. Instalar dependências

```bash
pip install -r requirements.txt
```

### 4. Configurar Variáveis de Ambiente

Crie um ficheiro `.ini` ou `.env` na raiz do projeto com base no ficheiro `config.py`:

```ini
FLASK_APP=run.py
FLASK_ENV=development
SECRET_KEY=sua-chave-secreta-muito-forte
DATABASE_URL=sqlite:///database.db
ADMIN_EMAIL=admin@ecomoz.co.mz
MAIL_SERVER=smtp.exemplo.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=seu-email
MAIL_PASSWORD=sua-password
```

### 5. Executar a Aplicação

```bash
python run.py
```

A aplicação estará disponível em `http://localhost:5000`.

---

## 🤝 Contribuição

Este projeto foi desenvolvido de forma independente como parte de inovações tecnológicas para o mercado moçambicano.
 
---

## 📄 Licença

Este projeto está licenciado sob a licença **Proprietária**. Para mais informações, consulte o ficheiro `LICENSE` incluído no repositório.

--- 

*Desenvolvido por **Alberto Langa***
