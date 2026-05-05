// Configurações Globais do Dashboard
const DashboardConfig = {
    // Configurações de API
    API: {
        BASE_URL: '/api/dashboard',
        TIMEOUT: 30000,
        RETRY_ATTEMPTS: 3
    },

    // Configurações de UI
    UI: {
        THEME: {
            default: 'light',
            storageKey: 'dashboard-theme'
        },
        LANGUAGE: {
            default: 'pt',
            available: ['pt', 'en']
        },
        NOTIFICATIONS: {
            enabled: true,
            sound: true,
            desktop: false
        }
    },

    // Configurações de Funcionalidades
    FEATURES: {
        REAL_TIME_UPDATES: true,
        OFFLINE_MODE: false,
        ADVANCED_ANALYTICS: true,
        MULTI_SHOP: true
    },

    // Configurações de Performance
    PERFORMANCE: {
        CACHE_ENABLED: true,
        LAZY_LOADING: true,
        DEBOUNCE_DELAY: 300
    },

    // Configurações de Segurança
    SECURITY: {
        SESSION_TIMEOUT: 60 * 60 * 1000, // 1 hora
        PASSWORD_POLICY: {
            minLength: 8,
            requireNumbers: true,
            requireSpecialChars: true
        }
    }
};

// Gerenciador de Configurações
class ConfigManager {
    constructor() {
        this.config = DashboardConfig;
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.applyConfig();
    }

    loadFromStorage() {
        // Carregar tema
        const savedTheme = localStorage.getItem(this.config.UI.THEME.storageKey);
        if (savedTheme) {
            this.config.UI.THEME.default = savedTheme;
        }

        // Carregar outras configurações...
    }

    saveToStorage() {
        localStorage.setItem(this.config.UI.THEME.storageKey, this.config.UI.THEME.default);
    }

    applyConfig() {
        // Aplicar tema
        if (this.config.UI.THEME.default === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Aplicar outras configurações...
    }

    updateConfig(key, value) {
        const keys = key.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        this.saveToStorage();
        this.applyConfig();
    }

    getConfig(key) {
        const keys = key.split('.');
        let current = this.config;
        
        for (const k of keys) {
            if (current[k] === undefined) return undefined;
            current = current[k];
        }
        
        return current;
    }

    resetConfig() {
        localStorage.removeItem(this.config.UI.THEME.storageKey);
        this.config = { ...DashboardConfig };
        this.applyConfig();
        showToast('Configurações restauradas', 'success');
    }
}

// Inicializar gerenciador de configurações
let configManager;

document.addEventListener('DOMContentLoaded', function() {
    configManager = new ConfigManager();
});