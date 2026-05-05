// Lógica Principal e Inicialização
class ShopCore {
    constructor() {
        this.initialized = false;
        this.init();
    }
    
    init() {
        if (this.initialized) return;
        
        this.initializeUI();
        this.bindGlobalEvents();
        this.setupStoreObservers();
        this.loadInitialData();
        this.setupErrorHandling();
        
        this.initialized = true;
        console.log('Shop Public Interface initialized successfully');
    }
    
    initializeUI() {
        const businessModel = ShopConfig.businessModel;
        
        if (businessModel === 'delivery') {
            this.setupDeliveryUI();
        } else {
            this.setupAgendamentoUI();
        }
        
        this.setupAccessibility();
        this.setupManagers();
    }
    
    setupDeliveryUI() {
        try {
            this.updateUITexts();
            this.reconfigureCtaButtons();
            this.setupDeliveryVisibility();
            this.setupDeliveryEvents();
        } catch (error) {
            console.error('Error setting up delivery UI:', error);
        }
    }
    
    setupAgendamentoUI() {
        try {
            const deliveryDetailsContainer = document.getElementById('delivery-details-container');
            const calendarContainer = document.getElementById('calendar-container');
            
            if (deliveryDetailsContainer) deliveryDetailsContainer.style.display = 'none';
            if (calendarContainer) calendarContainer.style.display = 'block';
        } catch (error) {
            console.error('Error setting up agendamento UI:', error);
        }
    }
    
    updateUITexts() {
        const updates = [
            {
                selector: '[data-modal-target="schedule-modal"] span',
                text: 'Fazer Encomenda'
            },
            {
                selector: '.cta-button[data-modal-target="schedule-modal"]',
                text: 'Fazer Encomenda Agora'
            }
        ];
        
        updates.forEach(update => {
            document.querySelectorAll(update.selector).forEach(el => {
                el.textContent = update.text;
            });
        });
        
        const titleUpdates = [
            { selector: '#schedule-modal .modal-title', text: 'Finalizar Encomenda' },
            { selector: '#step-1-services .section-title', text: 'Rever Carrinho' },
            { selector: '#step-2-datetime .step-title', text: 'Detalhes da Encomenda' }
        ];
        
        titleUpdates.forEach(update => {
            const element = document.querySelector(update.selector);
            if (element) element.textContent = update.text;
        });
    }
    
    reconfigureCtaButtons() {
        document.querySelectorAll('.cta-button[data-modal-target="schedule-modal"]').forEach(trigger => {
            trigger.dataset.modalTarget = 'products-modal';
        });
    }
    
    setupDeliveryVisibility() {
        const elements = [
            { id: 'delivery-details-container', display: 'block' },
            { id: 'calendar-container', display: 'none' },
            { id: 'time-slots-container', display: 'none' }
        ];
        
        elements.forEach(element => {
            const el = document.getElementById(element.id);
            if (el) el.style.display = element.display;
        });
    }
    
    setupDeliveryEvents() {
        // Eventos específicos do delivery já configurados nos managers
    }
    
    setupAccessibility() {
        // Melhorar acessibilidade
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.addSkipLinks();
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Fechar modais com ESC
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            
            // Navegação por tab em modais
            if (e.key === 'Tab' && document.body.classList.contains('modal-active')) {
                this.handleModalTabNavigation(e);
            }
        });
    }
    
    setupFocusManagement() {
        // Manter foco dentro do modal quando aberto
        document.addEventListener('focusin', (e) => {
            if (document.body.classList.contains('modal-active')) {
                const activeModal = document.querySelector('.modal-overlay.active');
                if (activeModal && !activeModal.contains(e.target)) {
                    e.preventDefault();
                    this.focusFirstElement(activeModal);
                }
            }
        });
    }
    
    addSkipLinks() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Saltar para conteúdo principal';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--theme-primary);
            color: white;
            padding: 8px;
            z-index: 10000;
            text-decoration: none;
            border-radius: 4px;
            transition: top 0.3s ease;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
    
    setupManagers() {
        const managers = [
            { name: 'uiManager', class: UIManager },
            { name: 'bookingManager', class: BookingManager },
            { name: 'productsManager', class: ProductsManager },
            { name: 'cartManager', class: CartManager },
            { name: 'ticketsManager', class: TicketsManager },
            { name: 'reviewsManager', class: ReviewsManager },
            { name: 'blogManager', class: BlogManager },
            { name: 'infoManager', class: InfoManager }
        ];
        
        managers.forEach(manager => {
            if (!window[manager.name]) {
                try {
                    window[manager.name] = new manager.class();
                    console.log(`✅ ${manager.name} initialized successfully`);
                } catch (error) {
                    console.error(`❌ Failed to initialize ${manager.name}:`, error);
                }
            }
        });
    }
    
    closeAllModals() {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.classList.remove('modal-active');
    }
    
    handleModalTabNavigation(e) {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (!activeModal) return;
        
        const focusableElements = activeModal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
    
    focusFirstElement(container) {
        const focusable = container.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable) focusable.focus();
    }
    
    bindGlobalEvents() {
        this.bindModalLoadEvents();
        this.bindFormEvents();
        this.bindCouponEvents();
        this.bindErrorEvents();
        this.bindPerformanceEvents();
    }
    
    bindModalLoadEvents() {
        document.addEventListener('modalOpened', (e) => {
            this.handleModalOpened(e.detail.modalId);
        });
    }
    
    handleModalOpened(modalId) {
        const loadHandlers = {
            'schedule-modal': () => {
                if (ShopConfig.businessModel === 'agendamento' && 
                    !shopStore.loadingStates.services) {
                    this.loadServices();
                    shopStore.setLoadingState('services', true);
                }
            },
            'products-modal': () => {
                if (!shopStore.loadingStates.products) {
                    productsManager.loadProducts();
                    shopStore.setLoadingState('products', true);
                }
            },
            'bookings-modal': () => {
                if (!shopStore.loadingStates.bookings) {
                    ticketsManager.loadClientBookings();
                    shopStore.setLoadingState('bookings', true);
                }
            },
            'reviews-modal': () => {
                if (!shopStore.loadingStates.reviews) {
                    reviewsManager.loadReviews();
                    shopStore.setLoadingState('reviews', true);
                }
            },
            'blog-modal': () => {
                if (!shopStore.loadingStates.blog) {
                    blogManager.loadBlogPosts();
                    shopStore.setLoadingState('blog', true);
                }
            },
            'info-modal': () => {
                // Info modal não precisa de carregamento adicional
                console.log('Info modal opened');
            },
            'quote-modal': () => {
                // Quote modal não precisa de carregamento adicional
                console.log('Quote modal opened');
            }
        };
        
        if (loadHandlers[modalId]) {
            loadHandlers[modalId]();
        }
    }
    
    bindFormEvents() {
        const forms = {
            'confirmation-form': (e) => {
                e.preventDefault();
                // Submissão tratada pelo BookingManager
            },
            'quote-form': (e) => {
                e.preventDefault();
                this.handleQuoteSubmission();
            }
        };
        
        Object.entries(forms).forEach(([formId, handler]) => {
            const form = document.getElementById(formId);
            if (form) {
                form.addEventListener('submit', handler);
            }
        });
    }
    
    bindCouponEvents() {
        const applyCouponBtn = document.getElementById('apply-coupon-btn');
        if (applyCouponBtn) {
            applyCouponBtn.addEventListener('click', () => {
                this.applyCoupon();
            });
        }
    }
    
    bindErrorEvents() {
        window.addEventListener('error', (e) => {
            this.handleGlobalError(e.error);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.handlePromiseRejection(e.reason);
        });
    }
    
    bindPerformanceEvents() {
        // Monitorar performance de carregamento
        window.addEventListener('load', () => {
            this.reportPerformance();
        });
        
        // Monitorar mudanças de visibilidade da página
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }
    
    setupStoreObservers() {
        shopStore.subscribe('loadingStateChanged', (data) => {
            this.handleLoadingStateChange(data);
        });
        
        shopStore.subscribe('bookingStateChanged', () => {
            this.handleBookingStateChange();
        });
        
        shopStore.subscribe('cartUpdated', () => {
            this.handleCartUpdate();
        });
    }
    
    handleLoadingStateChange(data) {
        // Pode ser usado para mostrar/ocultar loaders globais
        if (data && data.key && data.state !== undefined) {
            console.log(`🔄 Loading state changed: ${data.key} = ${data.state}`);
            
            // Mostrar/ocultar loader global baseado no estado
            this.toggleGlobalLoader(data.key, data.state);
        }
    }
    
    handleBookingStateChange() {
        // Atualizar UI baseada em mudanças no estado de booking
        const bookingState = shopStore.getBookingState();
        
        // Log para debug (pode ser removido em produção)
        if (bookingState.service || bookingState.product) {
            console.log('📅 Booking state updated:', {
                service: bookingState.service?.nome,
                product: bookingState.product?.nome,
                date: bookingState.date,
                time: bookingState.time
            });
        }
    }
    
    handleCartUpdate() {
        const shoppingCart = shopStore.getShoppingCart();
        console.log(`🛒 Cart updated: ${shoppingCart.length} items`);
        
        // Disparar evento customizado para atualizações de UI
        document.dispatchEvent(new CustomEvent('cartStateChanged', {
            detail: { itemCount: shoppingCart.length }
        }));
    }
    
    toggleGlobalLoader(resource, isLoading) {
        // Implementar loader global se necessário
        const globalLoader = document.getElementById('global-loader');
        
        if (!globalLoader && isLoading) {
            // Criar loader global se não existir
            this.createGlobalLoader();
        } else if (globalLoader && !this.anyResourceLoading()) {
            // Remover loader global se nenhum recurso estiver carregando
            globalLoader.remove();
        }
    }
    
    createGlobalLoader() {
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.innerHTML = `
            <div class="global-loader-overlay">
                <div class="global-loader-content">
                    <div class="loader"></div>
                    <p>A carregar...</p>
                </div>
            </div>
        `;
        
        // Adicionar estilos inline
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
        `;
        
        document.body.appendChild(loader);
    }
    
    anyResourceLoading() {
        const states = shopStore.loadingStates;
        return Object.values(states).some(state => state === true);
    }
    
    setupErrorHandling() {
        this.setupNetworkMonitoring();
        this.setupPerformanceMonitoring();
        this.setupOfflineDetection();
    }
    
    setupNetworkMonitoring() {
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                this.handleNetworkChange();
            });
        }
    }
    
    setupPerformanceMonitoring() {
        // Monitorar performance básica
        if ('performance' in window) {
            this.performanceMetrics = {
                navigationStart: performance.timing.navigationStart
            };
        }
    }
    
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.showNotification('Ligação restaurada', 'success');
            document.documentElement.classList.remove('offline');
        });
        
        window.addEventListener('offline', () => {
            this.showNotification('Sem ligação à internet', 'warning');
            document.documentElement.classList.add('offline');
        });
    }
    
    handleNetworkChange() {
        if (navigator.connection) {
            const effectiveType = navigator.connection.effectiveType;
            const downlink = navigator.connection.downlink;
            
            console.log(`🌐 Network changed: ${effectiveType} (${downlink} Mbps)`);
            
            if (effectiveType === 'slow-2g' || effectiveType === '2g') {
                this.showNotification('Ligação de internet lenta detectada', 'warning');
                this.enableLowBandwidthMode();
            } else {
                this.disableLowBandwidthMode();
            }
        }
    }
    
    enableLowBandwidthMode() {
        // Reduzir qualidade de imagens, desativar animações, etc.
        document.documentElement.classList.add('low-bandwidth');
        console.log('🔻 Low bandwidth mode enabled');
    }
    
    disableLowBandwidthMode() {
        document.documentElement.classList.remove('low-bandwidth');
        console.log('🔺 Low bandwidth mode disabled');
    }
    
    handleGlobalError(error) {
        console.error('🚨 Global error caught:', error);
        
        // Não mostrar notificação para erros de resource loading
        if (error instanceof Error && error.message.includes('Loading')) {
            return;
        }
        
        this.showNotification('Ocorreu um erro inesperado', 'error');
        
        // Reportar erro para analytics (se configurado)
        this.reportError(error);
    }
    
    handlePromiseRejection(reason) {
        console.error('🚨 Unhandled promise rejection:', reason);
        this.showNotification('Operação falhou', 'error');
        
        // Reportar rejeição para analytics
        this.reportError(new Error(`Unhandled Promise Rejection: ${reason}`));
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('📱 Page hidden');
            this.onPageHidden();
        } else {
            console.log('📱 Page visible');
            this.onPageVisible();
        }
    }
    
    onPageHidden() {
        // Pausar operações desnecessárias quando a página não está visível
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
    }
    
    onPageVisible() {
        // Retomar operações quando a página se torna visível
        this.setupAutoSave();
    }
    
    loadInitialData() {
        // Carregar dados iniciais se necessário
        this.checkCachedData();
        this.setupAutoSave();
        this.initializeAnalytics();
    }
    
    checkCachedData() {
        // Verificar se há dados em cache que possam ser úteis
        const cachedBookings = localStorage.getItem('my_bookings');
        if (cachedBookings) {
            console.log('💾 Cached bookings found');
        }
        
        const cachedCart = localStorage.getItem('shopping_cart');
        if (cachedCart) {
            console.log('💾 Cached cart found');
        }
    }
    
    setupAutoSave() {
        // Salvar estado automaticamente periodicamente
        this.autoSaveInterval = setInterval(() => {
            this.autoSaveState();
        }, 30000); // Salvar a cada 30 segundos
    }
    
    autoSaveState() {
        try {
            const state = {
                shoppingCart: shopStore.getShoppingCart(),
                bookingState: shopStore.getBookingState(),
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem('shop_auto_save', JSON.stringify(state));
        } catch (error) {
            console.error('Error auto-saving state:', error);
        }
    }
    
    initializeAnalytics() {
        // Inicializar analytics/tracking se necessário
        console.log('📊 Analytics initialized');
    }
    
    reportPerformance() {
        if ('performance' in window) {
            const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
            const domReadyTime = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
            
            console.log('⚡ Performance metrics:', {
                pageLoad: `${loadTime}ms`,
                domReady: `${domReadyTime}ms`,
                readyState: document.readyState
            });
            
            // Reportar para analytics
            this.trackEvent('performance', 'page_load', {
                load_time: loadTime,
                dom_ready_time: domReadyTime
            });
        }
    }
    
    reportError(error) {
        // Reportar erro para serviço de analytics
        this.trackEvent('error', 'unhandled_error', {
            message: error.message,
            stack: error.stack,
            url: window.location.href
        });
    }
    
    trackEvent(category, action, label = null) {
        // Implementar tracking de eventos
        console.log(`🎯 Event tracked: ${category}.${action}`, label);
        
        // Exemplo com Google Analytics (descomentar se configurado)
        /*
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                event_category: category,
                event_label: label
            });
        }
        */
    }
    
    // Carregamento de Dados
    async loadServices() {
        const serviceList = document.getElementById('service-list');
        if (!serviceList) return;
        
        uiManager.showLoader(serviceList);
        
        try {
            const services = await ShopAPI.getServices();
            this.renderServices(services);
            
        } catch (error) {
            console.error('Erro ao carregar serviços:', error);
            uiManager.showEmptyState(
                serviceList,
                'fa-triangle-exclamation',
                'Erro',
                'Não foi possível carregar os serviços.'
            );
        }
    }
    
    renderServices(services) {
        const serviceList = document.getElementById('service-list');
        if (!serviceList) return;
        
        serviceList.innerHTML = '';
        
        if (services.length === 0) {
            uiManager.showEmptyState(
                serviceList,
                'fa-scissors',
                'Sem Serviços',
                'Esta loja não tem serviços de agendamento disponíveis.'
            );
            return;
        }
        
        services.forEach(service => {
            const serviceElement = this.createServiceElement(service);
            serviceList.appendChild(serviceElement);
        });
    }
    
    createServiceElement(service) {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.dataset.service = JSON.stringify(service);
        
        const priceDisplay = service.payment_mode === 'deposito' && service.deposit_value > 0 ?
            `${service.deposit_value.toFixed(2)} MZN (Sinal)` :
            `${service.preco.toFixed(2)} MZN`;
        
        li.innerHTML = `
            <div class="list-item-content">
                <span class="list-item-icon"><i class="fa-solid fa-cut"></i></span>
                <span class="list-item-label">${service.nome}</span>
            </div>
            <div class="list-item-details">
                <span class="list-item-price">${priceDisplay}</span>
                <span class="list-item-sub">${service.duracao_min} min</span>
            </div>
        `;
        
        li.addEventListener('click', () => {
            bookingManager.selectService(li, service);
        });
        
        return li;
    }
    
    // Cupões
    applyCoupon() {
        const couponCode = document.getElementById('coupon-code')?.value;
        if (!couponCode) {
            this.showNotification('Por favor, insira um código de cupão.', 'warning');
            return;
        }
        
        // Placeholder - implementar lógica real de cupão
        this.showNotification(`Cupão ${couponCode} aplicado! (Funcionalidade em desenvolvimento)`, 'info');
        
        // Track coupon attempt
        this.trackEvent('coupon', 'apply_attempt', { code: couponCode });
    }
    
    // Pedido de Orçamento
    async handleQuoteSubmission() {
        const nome = document.getElementById('quote-name')?.value;
        const telefone = document.getElementById('quote-phone')?.value;
        const details = document.getElementById('quote-details')?.value;
        
        if (!nome || !telefone || !details) {
            this.showNotification('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }
        
        if (!ShopUtils.validatePhone(telefone)) {
            this.showNotification('Por favor, insira um número de telemóvel válido.', 'warning');
            return;
        }
        
        const submitBtn = document.getElementById('submit-quote-btn');
        const originalText = submitBtn?.textContent;
        
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'A enviar...';
        }
        
        try {
            // Placeholder - implementar chamada API real
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showNotification('Pedido de orçamento enviado com sucesso! Entraremos em contacto em breve.', 'success');
            
            // Track successful quote submission
            this.trackEvent('quote', 'submission_success', {
                name_length: nome.length,
                details_length: details.length
            });
            
            // Limpar formulário
            document.getElementById('quote-form').reset();
            
        } catch (error) {
            console.error('Erro ao enviar pedido:', error);
            this.showNotification('Erro ao enviar pedido. Por favor, tente novamente.', 'error');
            
            // Track failed submission
            this.trackEvent('quote', 'submission_failed', { error: error.message });
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }
    
    // Utilitários
    showNotification(message, type = 'info') {
        // Usar o sistema de notificação do TicketsManager se disponível
        if (window.ticketsManager && typeof ticketsManager.showNotification === 'function') {
            ticketsManager.showNotification(message, type);
        } else {
            // Fallback simples
            console.log(`[${type.toUpperCase()}] ${message}`);
            
            // Fallback visual básico
            this.showFallbackNotification(message, type);
        }
    }
    
    showFallbackNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `fallback-notification fallback-notification-${type}`;
        notification.innerHTML = `
            <div class="fallback-notification-content">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
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
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
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
    
    // Método para debug e desenvolvimento
    enableDebugMode() {
        window.debugShop = {
            config: ShopConfig,
            store: shopStore,
            managers: {
                ui: uiManager,
                booking: bookingManager,
                products: productsManager,
                cart: cartManager,
                tickets: ticketsManager,
                reviews: reviewsManager,
                blog: blogManager,
                info: infoManager
            },
            utils: ShopUtils,
            api: ShopAPI,
            core: this
        };
        
        console.log('🐛 Debug mode enabled. Access via window.debugShop');
        
        // Adicionar estilos de debug
        this.addDebugStyles();
    }
    
    addDebugStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .debug-outline * {
                outline: 1px solid rgba(255,0,0,0.1) !important;
            }
            .debug-outline *:hover {
                outline: 1px solid rgba(255,0,0,0.3) !important;
            }
        `;
        document.head.appendChild(style);
        
        // Ativar/desativar outlines com duplo clique em Ctrl
        let ctrlClickCount = 0;
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                ctrlClickCount++;
                if (ctrlClickCount === 2) {
                    document.body.classList.toggle('debug-outline');
                    ctrlClickCount = 0;
                    console.log('🔍 Debug outlines toggled');
                }
                
                setTimeout(() => {
                    ctrlClickCount = 0;
                }, 1000);
            }
        });
    }
    
    // Método para restaurar estado salvo (útil para desenvolvimento)
    restoreState() {
        try {
            const savedState = localStorage.getItem('shop_auto_save');
            if (savedState) {
                const state = JSON.parse(savedState);
                console.log('💾 Restoring saved state:', state);
                
                // Restaurar carrinho
                if (state.shoppingCart) {
                    shopStore.shoppingCart = state.shoppingCart;
                    shopStore.notifyObservers('cartUpdated');
                }
                
                // Restaurar estado de booking
                if (state.bookingState) {
                    shopStore.setBookingState(state.bookingState);
                }
                
                this.showNotification('Estado restaurado', 'success');
            }
        } catch (error) {
            console.error('Error restoring state:', error);
        }
    }
    
    // Método para limpar todos os dados locais
    clearAllData() {
        if (confirm('Tem a certeza que quer limpar todos os dados locais? Esta ação não pode ser revertida.')) {
            localStorage.clear();
            sessionStorage.clear();
            shopStore.shoppingCart = [];
            shopStore.setBookingState({
                service: null,
                product: null,
                staff: null,
                date: null,
                time: null,
                amount_to_pay_now: 0.0
            });
            
            this.showNotification('Todos os dados locais foram limpos', 'success');
            location.reload();
        }
    }
}

// Inicialização robusta da aplicação
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.shopCore = new ShopCore();
        
        // Habilitar debug mode em desenvolvimento
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.search.includes('debug=true')) {
            shopCore.enableDebugMode();
        }
        
        // Adicionar comandos globais para desenvolvimento
        window.__SHOP_COMMANDS__ = {
            debug: () => shopCore.enableDebugMode(),
            restore: () => shopCore.restoreState(),
            clear: () => shopCore.clearAllData(),
            state: () => console.log('Store state:', shopStore),
            config: () => console.log('Shop config:', ShopConfig)
        };
        
    } catch (error) {
        console.error('❌ Failed to initialize shop core:', error);
        
        // Mostrar mensagem de erro amigável para o usuário
        this.showFatalError(error);
    }
});

// Tratamento de erros fatais
function showFatalError(error) {
    const errorMessage = document.createElement('div');
    errorMessage.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #dc3545;
        color: white;
        padding: 20px;
        text-align: center;
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
    `;
    errorMessage.innerHTML = `
        <h3 style="margin: 0 0 10px 0;">❌ Erro ao carregar a aplicação</h3>
        <p style="margin: 0 0 15px 0; opacity: 0.9;">
            Ocorreu um erro inesperado. Por favor, recarregue a página.
        </p>
        <button onclick="location.reload()" style="
            background: white;
            color: #dc3545;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
        ">
            🔄 Recarregar Página
        </button>
        <details style="margin-top: 15px; text-align: left; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px;">
            <summary style="cursor: pointer; font-size: 0.9em;">Detalhes do erro (para desenvolvedores)</summary>
            <pre style="font-size: 0.8em; margin: 10px 0 0 0; white-space: pre-wrap;">${error.stack || error.message}</pre>
        </details>
    `;
    
    document.body.appendChild(errorMessage);
    
    // Reportar erro fatal
    if (window.shopCore) {
        shopCore.trackEvent('error', 'fatal_error', {
            message: error.message,
            stack: error.stack
        });
    }
}

// Export para uso em módulos (se usando modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShopCore };
}

// Polyfill para funcionalidades antigas de browsers
if (typeof NodeList.prototype.forEach === 'undefined') {
    NodeList.prototype.forEach = Array.prototype.forEach;
}

if (typeof Object.entries === 'undefined') {
    Object.entries = function(obj) {
        return Object.keys(obj).map(key => [key, obj[key]]);
    };
}