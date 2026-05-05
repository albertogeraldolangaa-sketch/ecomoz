// app/static/js/public/modules/auth.js

class AuthManager {
    constructor() {
        this.currentUser = JSON.parse(localStorage.getItem('buyer_user')) || null;
        this.init();
    }

    init() {
        this.updateUI();
        this.bindEvents();
    }

    bindEvents() {
        // Abrir Modal
        document.getElementById('btn-buyer-login')?.addEventListener('click', () => {
            if (this.currentUser) {
                this.showProfileView();
            } else {
                this.showLoginView();
            }
            uiManager.openModal('auth-modal');
        });

        // Tabs Toggle
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        const formLogin = document.getElementById('form-buyer-login');
        const formRegister = document.getElementById('form-buyer-register');

        if (tabLogin && tabRegister) {
            tabLogin.addEventListener('click', () => {
                this.toggleTabs(tabLogin, tabRegister, formLogin, formRegister);
            });
            tabRegister.addEventListener('click', () => {
                this.toggleTabs(tabRegister, tabLogin, formRegister, formLogin);
            });
        }

        // Submissão Login
        formLogin?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin();
        });

        // Submissão Registo
        formRegister?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister();
        });

        // Logout
        document.getElementById('btn-buyer-logout')?.addEventListener('click', () => {
            this.handleLogout();
        });
    }

    toggleTabs(activeTab, inactiveTab, showForm, hideForm) {
        activeTab.style.borderBottom = "2px solid var(--theme-primary)";
        activeTab.style.color = "var(--theme-primary)";
        inactiveTab.style.borderBottom = "2px solid transparent";
        inactiveTab.style.color = "#888";
        
        showForm.style.display = "block";
        hideForm.style.display = "none";
    }

    async handleLogin() {
        const phone = document.getElementById('login-phone').value;
        const pass = document.getElementById('login-pass').value;
        const btn = document.querySelector('#form-buyer-login button');
        
        try {
            btn.textContent = "A entrar...";
            btn.disabled = true;
            
            const result = await ShopAPI.loginBuyer(phone, pass);
            this.loginSuccess(result);
            
        } catch (error) {
            alert(error.message);
        } finally {
            btn.textContent = "Entrar";
            btn.disabled = false;
        }
    }

    async handleRegister() {
        const nome = document.getElementById('reg-name').value;
        const phone = document.getElementById('reg-phone').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-pass').value;
        const btn = document.querySelector('#form-buyer-register button');

        try {
            btn.textContent = "A criar conta...";
            btn.disabled = true;
            
            const result = await ShopAPI.registerBuyer(nome, phone, email, pass);
            
            // Auto-login após registo (ou apenas login success se a API retornar user)
            // Assumindo que register retorna { message, buyer_id }
            alert('Conta criada! Faça login.');
            this.toggleTabs(
                document.getElementById('tab-login'), 
                document.getElementById('tab-register'), 
                document.getElementById('form-buyer-login'), 
                document.getElementById('form-buyer-register')
            );
            
        } catch (error) {
            alert(error.message);
        } finally {
            btn.textContent = "Criar Conta";
            btn.disabled = false;
        }
    }

    loginSuccess(data) {
        // Data deve conter { buyer_id, nome, token? }
        this.currentUser = data;
        localStorage.setItem('buyer_user', JSON.stringify(data));
        
        this.updateUI();
        uiManager.closeModal(document.getElementById('auth-modal'));
        
        // Preencher dados automáticos no checkout se estiver no meio de um
        if (document.getElementById('client-name')) {
            document.getElementById('client-name').value = data.nome;
            document.getElementById('client-phone').value = data.telefone || ''; // Se a API retornar
        }
        
        // Carregar histórico se necessário
        if (window.ticketsManager) {
            // ticketsManager.loadRemoteHistory(data.buyer_id); // Futuro: carregar do servidor
        }
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('buyer_user');
        this.updateUI();
        this.showLoginView(); // Reset modal view
    }

    updateUI() {
        const btnLabel = document.getElementById('buyer-name-display');
        if (this.currentUser) {
            btnLabel.textContent = this.currentUser.nome.split(' ')[0]; // Primeiro nome
        } else {
            btnLabel.textContent = "Entrar";
        }
    }

    showLoginView() {
        document.getElementById('form-buyer-login').parentElement.style.display = 'block'; // Container dos forms
        document.getElementById('buyer-profile-view').style.display = 'none';
        document.querySelector('.flex.border-b').style.display = 'flex'; // Tabs
    }

    showProfileView() {
        document.getElementById('form-buyer-login').style.display = 'none';
        document.getElementById('form-buyer-register').style.display = 'none';
        document.querySelector('.flex.border-b').style.display = 'none'; // Tabs
        
        const profileView = document.getElementById('buyer-profile-view');
        profileView.style.display = 'block';
        
        document.getElementById('profile-name').textContent = this.currentUser.nome;
        // document.getElementById('profile-phone').textContent = this.currentUser.telefone; // Se tiver
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});