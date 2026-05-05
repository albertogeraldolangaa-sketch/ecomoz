// ECOMOZ FINAL/app/static/js/dashboard/api.js

// ---- 1. ESTRUTURA DO MENU (ORGANIZADA) ----
const menuItems = {
    'gestao': [
        // --- VISÃO GERAL ---
        { type: 'heading', text: 'Visão Geral' },
        { type: 'link', text: 'Métricas', page: 'metricas', icon: 'layout-dashboard' },

        // --- ATENDIMENTO ---
        { type: 'heading', text: 'Atendimento' },
        { type: 'link', text: 'Chat Ao Vivo', page: 'chat', icon: 'message-circle' },
        { type: 'link', text: 'Clientes (CRM)', page: 'clientes', icon: 'users' },
        { type: 'link', text: 'Orçamentos', page: 'orcamentos', icon: 'file-text' },
        { type: 'link', text: 'Avaliações', page: 'avaliacoes', icon: 'star' },

        // --- OPERAÇÕES ---
        { type: 'heading', text: 'Operações' },
        { type: 'link', text: 'Encomendas', page: 'encomendas', icon: 'shopping-cart' },
        { type: 'link', text: 'Agenda', page: 'calendar', icon: 'calendar' },
        { type: 'link-externo', text: 'Ecrã de Tickets (KDS)', url: '/kds', icon: 'monitor' },

        // --- ANÁLISE ---
        { type: 'heading', text: 'Análise' },
        { type: 'link', text: 'Relatórios', page: 'reports', icon: 'bar-chart-3' },
    ],
    'catalogo': [
        { type: 'heading', text: 'Catálogo da Loja' },
        { type: 'link', text: 'Serviços', page: 'servicos', icon: 'briefcase' },
        { type: 'link', text: 'Produtos', page: 'produtos', icon: 'package' },
        { type: 'link', text: 'Equipa (Staff)', page: 'equipa', icon: 'users-2' },
    ],
    'marketing': [
        { type: 'heading', text: 'Marketing' },
        { type: 'link', text: 'Promover (QR Code)', page: 'promover', icon: 'qr-code' },
        { type: 'link', text: 'Impulsionar (Ads)', page: 'impulsionar', icon: 'megaphone' },
        { type: 'link', text: 'Cupões de Desconto', page: 'cupons', icon: 'ticket' },
        { type: 'link', text: 'Blog / Posts', page: 'blog', icon: 'file-text' },
    ],
    'config': [
        { type: 'heading', text: 'Configuração' },
        { type: 'link', text: 'Personalizar Página', page: 'personalizar', icon: 'settings-2' },
        { type: 'link', text: 'Horário', page: 'horario', icon: 'clock' },
        { type: 'link', text: 'Carteira & Pagamentos', page: 'carteira', icon: 'wallet' },
        { type: 'link', text: 'Domínio & Email', page: 'dominio', icon: 'globe' },
        { type: 'link', text: 'Verificação & Planos', page: 'verificacao', icon: 'shield-check' },
    ]
};

// ---- 2. VARIÁVEIS GLOBAIS DE DADOS ----
let shopData = {};
let socket = null;
let activeChatSessionId = null;
let globalCategories = [];

// ---- 3. FUNÇÕES DE API E UTILITÁRIAS ----

// Helper de Fetch
async function apiFetch(url, options = {}) {
    const defaultHeaders = {};
    
    if (!(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
        if (options.body) {
            options.body = JSON.stringify(options.body);
        }
    }

    options.headers = { ...defaultHeaders, ...options.headers };
    options.credentials = 'same-origin';

    try {
        const response = await fetch(url, options);
        
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        const data = await response.json();
        
        // Lógica de Limite do Plano
        if (response.status === 403 && data.upgrade_required) {
            if (typeof showUpgradeModal === 'function') {
                showUpgradeModal(data.error);
            } else {
                alert(data.error);
            }
            throw new Error("Upgrade necessário");
        }
        
        if (!response.ok) {
            throw new Error(data.error || 'Ocorreu um erro na API');
        }
        
        return data;
    } catch (error) {
        if (error.message !== "Upgrade necessário") {
            console.error(`Erro no fetch para ${url}:`, error);
            showToast(error.message || 'Erro de conexão', 'error');
        }
        throw error;
    }
}

// Helper de Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    toast.textContent = message;
    toast.className = ''; // Limpar classes anteriores
    toast.classList.add(type);
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}