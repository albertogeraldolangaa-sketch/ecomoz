// Sistema de Notificações em Tempo Real
class NotificationSystem {
    constructor() {
        this.notificationCount = 0;
        this.socket = null;
        this.init();
    }

    init() {
        this.setupSocket();
        this.setupNotificationBell();
    }

    setupSocket() {
        // Conectar ao Socket.IO para notificações em tempo real
        this.socket = io('/', {
            transports: ['websocket']
        });

        this.socket.on('new_booking', (data) => {
            this.showNotification('Nova Encomenda', `Nova encomenda de ${data.client_name}`, 'shopping-cart');
            this.incrementNotificationCount();
        });

        this.socket.on('new_chat_message', (data) => {
            this.showNotification('Nova Mensagem', `Mensagem de ${data.client_name}`, 'message-circle');
            this.incrementNotificationCount();
        });

        this.socket.on('new_review', (data) => {
            this.showNotification('Nova Avaliação', `Nova avaliação de ${data.client_name}`, 'star');
            this.incrementNotificationCount();
        });

        this.socket.on('booking_status_changed', (data) => {
            this.showNotification('Estado Alterado', `Encomenda #${data.booking_id} está agora ${data.status}`, 'calendar');
        });
    }

    setupNotificationBell() {
        const bell = document.querySelector('[onclick="showNotificationsDropdown()"]');
        if (bell) {
            bell.addEventListener('click', this.showNotificationsDropdown.bind(this));
        }
    }

    showNotification(title, message, icon) {
        // Criar notificação toast
        showToast(message, 'info');
        
        // Adicionar à lista de notificações
        this.addToNotificationList(title, message, icon);
    }

    addToNotificationList(title, message, icon) {
        // Esta função adicionaria a notificação a um dropdown de notificações
        // Implementação depende do design específico
        console.log('Notification:', { title, message, icon });
    }

    incrementNotificationCount() {
        this.notificationCount++;
        this.updateNotificationBadge();
    }

    updateNotificationBadge() {
        const bell = document.querySelector('[onclick="showNotificationsDropdown()"]');
        if (bell) {
            let badge = bell.querySelector('.notification-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'notification-badge absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center';
                bell.appendChild(badge);
            }
            badge.textContent = this.notificationCount > 9 ? '9+' : this.notificationCount;
            badge.style.display = this.notificationCount > 0 ? 'flex' : 'none';
        }
    }

    showNotificationsDropdown() {
        // Implementar dropdown de notificações
        alert('Dropdown de notificações - Em desenvolvimento');
        // Aqui seria implementado um dropdown com a lista de notificações
    }

    markAsRead(notificationId) {
        // Marcar notificação como lida
        this.notificationCount = Math.max(0, this.notificationCount - 1);
        this.updateNotificationBadge();
    }

    clearAll() {
        this.notificationCount = 0;
        this.updateNotificationBadge();
    }
}

// Inicializar sistema de notificações
let notificationSystem;

document.addEventListener('DOMContentLoaded', function() {
    notificationSystem = new NotificationSystem();
});