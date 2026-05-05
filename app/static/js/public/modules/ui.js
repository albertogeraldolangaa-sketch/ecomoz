// Manipulação de UI, modais e tabs
class UIManager {
    constructor() {
        this.modalTriggers = document.querySelectorAll('[data-modal-target]');
        this.modalBackBtns = document.querySelectorAll('.modal-back-btn');
        this.body = document.body;
        
        this.init();
    }
    
    init() {
        this.bindModalEvents();
        this.bindBackButtonEvents();
    }
    
    bindModalEvents() {
        this.modalTriggers.forEach(trigger => {
            trigger.addEventListener('click', () => {
                const targetId = trigger.dataset.modalTarget;
                this.openModal(targetId);
            });
        });
    }
    
    bindBackButtonEvents() {
        this.modalBackBtns.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal-overlay');
                this.closeModal(modal);
            });
        });
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            this.body.classList.add('modal-active');
            
            // Dispara evento customizado
            document.dispatchEvent(new CustomEvent('modalOpened', { 
                detail: { modalId } 
            }));
        }
    }
    
    closeModal(modal) {
        modal.classList.remove('active');
        this.body.classList.remove('modal-active');
        
        const modalId = modal.id;
        document.dispatchEvent(new CustomEvent('modalClosed', { 
            detail: { modalId } 
        }));
    }
    
    showStep(stepId) {
        const steps = document.querySelectorAll('.booking-step');
        steps.forEach(step => {
            step.classList.toggle('active', step.id === stepId);
        });
        
        // Scroll para o topo
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) modalBody.scrollTo(0, 0);
        
        document.dispatchEvent(new CustomEvent('stepChanged', { 
            detail: { stepId } 
        }));
    }
    
    updateCtaButton(text, disabled = false) {
        const ctaButton = document.getElementById('cta-button');
        const ctaContainer = document.getElementById('schedule-cta-container');
        
        if (!ctaButton) return;
        
        if (text === null) {
            ctaContainer.style.display = 'none';
        } else {
            ctaContainer.style.display = 'block';
            ctaButton.textContent = text;
            ctaButton.disabled = disabled;
        }
    }
    
    showLoader(element) {
        element.innerHTML = '<div class="loader"></div>';
    }
    
    showEmptyState(element, icon, title, message) {
        element.innerHTML = ShopUtils.getEmptyStateHTML(icon, title, message);
    }
    
    toggleElement(element, show) {
        element.style.display = show ? 'block' : 'none';
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.uiManager = new UIManager();
});