// 
// ---- LÓGICA PRINCIPAL DA APLICAÇÃO ----

let l1Links = [];
let l2Links = [];
let l2NavContent = null;
let contentArea = null;
let pageTitle = null;
let mobileMenuButton = null;
let l2Sidebar = null;
let currentPage = '';

// Inicialização do Dashboard
async function initDashboard() {
    // Inicializar elementos DOM
    l1Links = Array.from(document.querySelectorAll('.l1-link'));
    l2NavContent = document.getElementById('l2-nav-content');
    contentArea = document.getElementById('content-area');
    pageTitle = document.getElementById('page-title');
    mobileMenuButton = document.getElementById('mobile-menu-button');
    l2Sidebar = document.getElementById('sidebar');

    // Carregar dados iniciais
    try {
        shopData = await apiFetch('/api/dashboard/details');
        await loadMetricasPage(); // Página inicial
    } catch (error) {
        console.error('Erro ao inicializar dashboard:', error);
        showToast('Erro ao carregar dados iniciais', 'error');
    }

    // Configurar eventos
    setupEventListeners();
    
    // Inicializar ícones
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function setupEventListeners() {
    // Menu mobile
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            l2Sidebar.classList.toggle('-translate-x-full');
        });
    }

    // Tema dark/light
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Fechar sidebar ao clicar fora (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 768 && 
            !l2Sidebar.contains(e.target) && 
            !mobileMenuButton.contains(e.target)) {
            l2Sidebar.classList.add('-translate-x-full');
        }
    });
}

function toggleTheme() {
    const html = document.documentElement;
    html.classList.toggle('dark');
    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
}

function showSubMenu(menuKey) {
    // Atualizar L1 active state
    l1Links.forEach(link => {
        // CORREÇÃO: Verifica se o onclick existe antes de converter para string
        // Isto previne o erro em links que não têm onclick (ex: logout)
        const hasClick = link.onclick;
        const isActive = hasClick && link.onclick.toString().includes(menuKey);
        link.classList.toggle('active', !!isActive);
    });

    // Gerar conteúdo L2
    const menu = menuItems[menuKey];
    if (!menu) return;

    let html = '';
    menu.forEach(item => {
        if (item.type === 'heading') {
            html += `<div class="sidebar-heading">${item.text}</div>`;
        } else if (item.type === 'link') {
            html += `
                <a class="sidebar-link ${currentPage === item.page ? 'active' : ''}" 
                   onclick="navigateTo('${item.page}')">
                    <i data-lucide="${item.icon}" class="w-5 h-5 mr-3"></i>
                    ${item.text}
                </a>`;
        } else if (item.type === 'link-externo') {
            html += `
                <a class="sidebar-link" href="${item.url}" target="_blank">
                    <i data-lucide="${item.icon}" class="w-5 h-5 mr-3"></i>
                    ${item.text}
                </a>`;
        }
    });

    l2NavContent.innerHTML = html;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Mostrar sidebar no mobile
    if (window.innerWidth < 768) {
        l2Sidebar.classList.remove('-translate-x-full');
    }
}

function navigateTo(page) {
    currentPage = page;
    updatePageTitle(page);
    
    // Atualizar active state nos links L2
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelectorAll(`.sidebar-link[onclick="navigateTo('${page}')"]`).forEach(link => {
        link.classList.add('active');
    });

    // Carregar conteúdo da página
    switch(page) {
        case 'metricas':
            loadMetricasPage();
            break;
        case 'encomendas':
            loadEncomendasPage();
            break;
        case 'calendar':
            loadCalendarPage();
            break;
        case 'chat':
            loadChatPage();
            break;
        case 'servicos':
            loadServicosPage();
            break;
        case 'produtos':
            loadProdutosPage();
            break;
        case 'equipa':
            loadEquipaPage();
            break;
        case 'blog':
            loadBlogPage();
            break;
        case 'clientes':
            loadClientesPage();
            break;
        case 'orcamentos':
            loadOrcamentosPage();
            break;
        case 'avaliacoes':
            loadAvaliacoesPage();
            break;
        case 'cupons':
            loadCuponsPage();
            break;
        case 'impulsionar':
            loadImpulsionarPage();
            break;
        case 'personalizar':
            loadPersonalizarPage();
            break;
        case 'horario':
            loadHorarioPage();
            break;
        case 'carteira':
            loadCarteiraPage();
            break;
        case 'dominio':
            loadDominioPage();
            break;
        case 'reports':
            loadReportsPage();
            break;
        case 'verificacao':
            loadVerificacaoPage();
            break;
        case 'promover':
            loadPromoverPage();
            break;
        default:
            contentArea.innerHTML = `<p class="text-gray-500 p-8">Página ${page} em desenvolvimento</p>`;
    }

    // Fechar sidebar no mobile após navegação
    if (window.innerWidth < 768) {
        l2Sidebar.classList.add('-translate-x-full');
    }
}

function updatePageTitle(page) {
    const titles = {
        'metricas': 'Métricas',
        'encomendas': 'Encomendas',
        'calendar': 'Agenda',
        'chat': 'Chat Ao Vivo',
        'servicos': 'Serviços',
        'produtos': 'Produtos',
        'equipa': 'Equipa',
        'blog': 'Blog',
        'clientes': 'Clientes (CRM)',
        'orcamentos': 'Pedidos de Orçamento',
        'avaliacoes': 'Avaliações',
        'cupons': 'Cupões de Desconto',
        'impulsionar': 'Marketing & Ads',
        'personalizar': 'Personalizar Loja',
        'horario': 'Horário de Funcionamento',
        'carteira': 'Carteira & Pagamentos',
        'dominio': 'Domínio Personalizado',
        'verificacao': 'Verificação & Planos',
        'reports': 'Relatórios',
        'promover': 'Promover Loja (QR)'
    };
    
    const title = titles[page] || 'Dashboard';
    document.getElementById('page-title').textContent = title;
    pageTitle = title;
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initDashboard);