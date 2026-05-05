// Gestão de Tickets e Reservas
class TicketsManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.bindTicketEvents();
    }
    
    bindTicketEvents() {
        // Os eventos são vinculados quando os tickets são renderizados
    }
    
    // Carregar tickets do localStorage
    loadClientBookings() {
        const localTicketsList = document.getElementById('local-tickets-list');
        if (!localTicketsList) return;
        
        const allBookings = JSON.parse(localStorage.getItem('my_bookings') || '{}');
        const shopBookings = allBookings[ShopConfig.shopSlug] || [];
        
        localTicketsList.innerHTML = '';
        
        if (shopBookings.length === 0) {
            this.showEmptyTicketsState();
            return;
        }
        
        // Ordenar por data (mais recentes primeiro)
        shopBookings.sort((a, b) => {
            return new Date(b.data_hora || b.created_at) - new Date(a.data_hora || a.created_at);
        });
        
        shopBookings.forEach(ticket => {
            const ticketElement = this.createTicketElement(ticket);
            localTicketsList.appendChild(ticketElement);
        });
        
        this.bindTicketActions();
    }
    
    showEmptyTicketsState() {
        const localTicketsList = document.getElementById('local-tickets-list');
        if (localTicketsList) {
            localTicketsList.innerHTML = `
                <div class="empty-state">
                    <div class="icon"><i class="fa-solid fa-ticket"></i></div>
                    <h3>Sem Tickets</h3>
                    <p>Ainda não fez marcações nesta loja.</p>
                </div>
            `;
        }
    }
    
    createTicketElement(ticket) {
        const div = document.createElement('div');
        div.className = 'ticket-item';
        
        const dateObj = new Date(ticket.data_hora || ticket.created_at);
        const dateFriendly = ShopUtils.formatDate(ticket.data_hora || ticket.created_at);
        const timeFriendly = ticket.data_hora ? 
            dateObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) :
            `(Encomenda ${ticket.order_type || ''})`;
        
        const status = (ticket.status || 'Pendente').replace(/\s+/g, '');
        const statusClass = `ticket-status-${status}`;
        
        let footerActions = this.getTicketFooterActions(ticket, status);
        
        div.innerHTML = `
            <div class="ticket-item-header">
                <span class="ticket-status ${statusClass}">${ticket.status}</span>
                <span class="ticket-number">${ticket.ticket_number}</span>
            </div>
            <div class="ticket-item-body">
                <p><strong>Item:</strong> ${ticket.item_nome}</p>
                <p><strong>Data:</strong> ${dateFriendly}</p>
                <p><strong>Hora:</strong> ${timeFriendly}</p>
                ${ticket.order_type ? `<p><strong>Tipo:</strong> ${this.formatOrderType(ticket.order_type)}</p>` : ''}
            </div>
            ${footerActions ? `<div class="ticket-item-footer">${footerActions}</div>` : ''}
        `;
        
        return div;
    }
    
    getTicketFooterActions(ticket, status) {
        let actions = '';
        
        if (status === 'Pendente' || status === 'Aguardando') {
            actions = `
                <button class="btn-cancel-booking" data-ticket="${ticket.ticket_number}">
                    <i class="fa-solid fa-times" style="margin-right: 5px;"></i>Cancelar
                </button>`;
        } else if (status === 'Concluido') {
            actions = `
                <button class="btn-review-booking" data-ticket="${ticket.ticket_number}">
                    <i class="fa-solid fa-star" style="margin-right: 5px;"></i>Avaliar
                </button>`;
        }
        
        // Sempre mostrar botão de detalhes
        actions += `
            <button class="btn-ticket-details" data-ticket="${ticket.ticket_number}">
                <i class="fa-solid fa-info-circle" style="margin-right: 5px;"></i>Detalhes
            </button>`;
            
        return actions;
    }
    
    formatOrderType(orderType) {
        const types = {
            'delivery': 'Entrega',
            'takeaway': 'Recolha',
            'local': 'No Local'
        };
        
        return types[orderType] || orderType;
    }
    
    bindTicketActions() {
        // Cancelar booking
        document.querySelectorAll('.btn-cancel-booking').forEach(btn => {
            btn.addEventListener('click', async () => {
                const ticketNumber = btn.dataset.ticket;
                await this.cancelBooking(ticketNumber);
            });
        });
        
        // Avaliar booking
        document.querySelectorAll('.btn-review-booking').forEach(btn => {
            btn.addEventListener('click', () => {
                const ticketNumber = btn.dataset.ticket;
                this.openReviewModal(ticketNumber);
            });
        });
        
        // Detalhes do ticket
        document.querySelectorAll('.btn-ticket-details').forEach(btn => {
            btn.addEventListener('click', () => {
                const ticketNumber = btn.dataset.ticket;
                this.showTicketDetails(ticketNumber);
            });
        });
    }
    
    async cancelBooking(ticketNumber) {
        if (!confirm(`Tem a certeza que quer cancelar o ticket ${ticketNumber}?`)) {
            return;
        }
        
        try {
            const result = await ShopAPI.cancelBooking(ticketNumber);
            
            // Atualizar localStorage
            this.updateLocalStorageTicketStatus(ticketNumber, 'Cancelado');
            
            // Recarregar lista
            this.loadClientBookings();
            
            // Mostrar mensagem de sucesso
            this.showNotification('Reserva cancelada com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao cancelar:', error);
            this.showNotification(`Não foi possível cancelar a marcação: ${error.message}`, 'error');
        }
    }
    
    updateLocalStorageTicketStatus(ticketNumber, newStatus) {
        const allBookings = JSON.parse(localStorage.getItem('my_bookings') || '{}');
        const shopBookings = allBookings[ShopConfig.shopSlug] || [];
        
        const updatedBookings = shopBookings.map(ticket => {
            if (ticket.ticket_number === ticketNumber) {
                return { ...ticket, status: newStatus };
            }
            return ticket;
        });
        
        allBookings[ShopConfig.shopSlug] = updatedBookings;
        localStorage.setItem('my_bookings', JSON.stringify(allBookings));
    }
    
    openReviewModal(ticketNumber) {
        // Implementar modal de avaliação
        const ticket = this.getTicketByNumber(ticketNumber);
        if (ticket) {
            this.showReviewForm(ticket);
        }
    }
    
    showTicketDetails(ticketNumber) {
        const ticket = this.getTicketByNumber(ticketNumber);
        if (ticket) {
            this.displayTicketDetails(ticket);
        }
    }
    
    getTicketByNumber(ticketNumber) {
        const allBookings = JSON.parse(localStorage.getItem('my_bookings') || '{}');
        const shopBookings = allBookings[ShopConfig.shopSlug] || [];
        return shopBookings.find(ticket => ticket.ticket_number === ticketNumber);
    }
    
    displayTicketDetails(ticket) {
        const detailsHTML = `
            <div class="booking-summary">
                <p><strong>Nº do Ticket:</strong> ${ticket.ticket_number}</p>
                <p><strong>Item:</strong> ${ticket.item_nome}</p>
                <p><strong>Status:</strong> ${ticket.status}</p>
                ${ticket.data_hora ? `<p><strong>Data:</strong> ${ShopUtils.formatDate(ticket.data_hora)}</p>` : ''}
                ${ticket.data_hora ? `<p><strong>Hora:</strong> ${new Date(ticket.data_hora).toLocaleTimeString('pt-PT')}</p>` : ''}
                ${ticket.order_type ? `<p><strong>Tipo:</strong> ${this.formatOrderType(ticket.order_type)}</p>` : ''}
                ${ticket.total_price ? `<p><strong>Preço Total:</strong> ${ShopUtils.formatCurrency(ticket.total_price)}</p>` : ''}
                ${ticket.payment_method ? `<p><strong>Método de Pagamento:</strong> ${this.formatPaymentMethod(ticket.payment_method)}</p>` : ''}
            </div>
        `;
        
        // Usar um modal simples para mostrar detalhes
        this.showModal('Detalhes do Ticket', detailsHTML);
    }
    
    formatPaymentMethod(method) {
        const methods = {
            'local': 'Pagar no Local',
            'online': 'Pagamento Online'
        };
        
        return methods[method] || method;
    }
    
    showReviewForm(ticket) {
        const reviewHTML = `
            <div class="review-form">
                <h3 style="margin-bottom: 20px;">Avaliar ${ticket.item_nome}</h3>
                <div class="form-group">
                    <label>Avaliação (1-5 estrelas)</label>
                    <div class="star-rating">
                        ${[1, 2, 3, 4, 5].map(star => `
                            <i class="fa-regular fa-star" data-rating="${star}"></i>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label for="review-comment">Comentário (Opcional)</label>
                    <textarea id="review-comment" rows="4" placeholder="Partilhe a sua experiência..."></textarea>
                </div>
                <div class="cta-container">
                    <button class="cta-button" id="submit-review-btn">Enviar Avaliação</button>
                </div>
            </div>
        `;
        
        this.showModal('Deixar Avaliação', reviewHTML);
        this.setupReviewForm(ticket);
    }
    
    setupReviewForm(ticket) {
        const stars = document.querySelectorAll('.star-rating .fa-star');
        let selectedRating = 0;
        
        stars.forEach(star => {
            star.addEventListener('mouseover', () => this.hoverStars(stars, parseInt(star.dataset.rating)));
            star.addEventListener('mouseout', () => this.resetStars(stars, selectedRating));
            star.addEventListener('click', () => {
                selectedRating = parseInt(star.dataset.rating);
                this.selectStars(stars, selectedRating);
            });
        });
        
        document.getElementById('submit-review-btn')?.addEventListener('click', () => {
            this.submitReview(ticket, selectedRating);
        });
    }
    
    hoverStars(stars, rating) {
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('fa-solid');
                star.classList.remove('fa-regular');
            } else {
                star.classList.add('fa-regular');
                star.classList.remove('fa-solid');
            }
        });
    }
    
    resetStars(stars, selectedRating) {
        this.selectStars(stars, selectedRating);
    }
    
    selectStars(stars, rating) {
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('fa-solid');
                star.classList.remove('fa-regular');
                star.style.color = '#f59e0b';
            } else {
                star.classList.add('fa-regular');
                star.classList.remove('fa-solid');
                star.style.color = '#ccc';
            }
        });
    }
    
    async submitReview(ticket, rating) {
        if (rating === 0) {
            alert('Por favor, selecione uma avaliação de 1 a 5 estrelas.');
            return;
        }
        
        const comment = document.getElementById('review-comment')?.value || '';
        
        try {
            // Placeholder - implementar chamada API real
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showNotification('Avaliação enviada com sucesso! Obrigado.', 'success');
            this.closeModal();
            
            // Atualizar ticket para mostrar que já foi avaliado
            this.updateLocalStorageTicketStatus(ticket.ticket_number, 'Avaliado');
            
        } catch (error) {
            console.error('Erro ao enviar avaliação:', error);
            this.showNotification('Erro ao enviar avaliação. Tente novamente.', 'error');
        }
    }
    
    showModal(title, content) {
        // Implementação simples de modal para detalhes e avaliações
        const modalHTML = `
            <div class="modal-overlay active" id="temp-modal">
                <div class="modal-header">
                    <button class="modal-back-btn" onclick="ticketsManager.closeModal()">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2 class="modal-title">${title}</h2>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('temp-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.classList.add('modal-active');
    }
    
    closeModal() {
        const modal = document.getElementById('temp-modal');
        if (modal) {
            modal.remove();
            document.body.classList.remove('modal-active');
        }
    }
    
    showNotification(message, type = 'info') {
        // Implementação simples de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fa-solid fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Estilos básicos para notificação
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'info': 'info-circle',
            'warning': 'exclamation-triangle'
        };
        return icons[type] || 'info-circle';
    }
    
    getNotificationColor(type) {
        const colors = {
            'success': '#28a745',
            'error': '#dc3545',
            'info': '#17a2b8',
            'warning': '#ffc107'
        };
        return colors[type] || '#17a2b8';
    }
    
    // Método para salvar novo ticket
    saveNewBooking(bookingData) {
        const allBookings = JSON.parse(localStorage.getItem('my_bookings') || '{}');
        const shopSlug = ShopConfig.shopSlug;
        
        if (!allBookings[shopSlug]) {
            allBookings[shopSlug] = [];
        }
        
        allBookings[shopSlug].push(bookingData);
        localStorage.setItem('my_bookings', JSON.stringify(allBookings));
        
        // Invalidar cache de bookings
        shopStore.setLoadingState('bookings', false);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.ticketsManager = new TicketsManager();
});