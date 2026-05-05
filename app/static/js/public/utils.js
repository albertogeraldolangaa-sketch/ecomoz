// Utilitários para formatação e helpers
class ShopUtils {
    static formatCurrency(amount, currency = 'MZN') {
        return `${parseFloat(amount).toFixed(2)} ${currency}`;
    }
    
    static formatDate(dateString, options = {}) {
        const date = new Date(dateString);
        const defaultOptions = { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        };
        return date.toLocaleDateString('pt-PT', { ...defaultOptions, ...options });
    }
    
    static formatTime(timeString) {
        return timeString; // Pode ser expandido para formatação mais complexa
    }
    
    static getEmptyStateHTML(icon, title, message) {
        return `
            <div class="empty-state">
                <div class="icon"><i class="fa-solid ${icon}"></i></div>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>`;
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static validatePhone(phone) {
        // Validação básica de telefone - pode ser ajustada conforme necessário
        const re = /^[+]?[1-9][-\s\.]?\(?[\d]{1,4}\)?[-\s\.]?[\d]{1,4}[-\s\.]?[\d]{1,9}$/;
        return re.test(phone.replace(/\s/g, ''));
    }
}