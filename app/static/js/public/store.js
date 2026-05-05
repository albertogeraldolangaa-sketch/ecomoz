// Gestão de estado da aplicação
class ShopStore {
    constructor() {
        this.bookingState = {
            service: null,
            product: null,
            staff: null,
            date: null,
            time: null,
            amount_to_pay_now: 0.0
        };
        
        this.shoppingCart = [];
        this.currentCalendarDate = new Date();
        this.currentProductData = null;
        
        // Estado de carregamento
        this.loadingStates = {
            services: false,
            products: false,
            bookings: false,
            blog: false,
            staff: false
        };
        
        // Estado do modal de detalhes
        this.complexProductDetails = {
            options: [],
            variants: [],
            selectedVariant: null
        };

        // CORREÇÃO: Inicializar os observadores imediatamente
        this.initObservers();
    }
    
    // Getters
    getBookingState() {
        return { ...this.bookingState };
    }
    
    getShoppingCart() {
        return [...this.shoppingCart];
    }
    
    getComplexProductDetails() {
        return { ...this.complexProductDetails };
    }
    
    // Setters
    setBookingState(newState) {
        this.bookingState = { ...this.bookingState, ...newState };
        this.notifyObservers('bookingStateChanged');
    }
    
    setComplexProductDetails(details) {
        this.complexProductDetails = { ...details };
        this.notifyObservers('productDetailsChanged');
    }
    
    // Carrinho methods
    addToCart(product, quantity = 1, variant = null) {
        const itemToAdd = {
            product: variant ? {
                ...product,
                variant_id: variant.id,
                nome: `${product.nome} (${variant.name})`,
                preco: variant.preco
            } : product,
            quantity: quantity
        };
        
        const existingIndex = this.shoppingCart.findIndex(item => 
            (item.product.variant_id && item.product.variant_id === itemToAdd.product.variant_id) ||
            (!item.product.variant_id && item.product.id === itemToAdd.product.id)
        );
        
        if (existingIndex > -1) {
            this.shoppingCart[existingIndex].quantity += quantity;
        } else {
            this.shoppingCart.push(itemToAdd);
        }
        
        this.notifyObservers('cartUpdated');
    }
    
    removeFromCart(index) {
        this.shoppingCart.splice(index, 1);
        this.notifyObservers('cartUpdated');
    }
    
    clearCart() {
        this.shoppingCart = [];
        this.notifyObservers('cartUpdated');
    }
    
    getCartTotal() {
        return this.shoppingCart.reduce((total, item) => {
            return total + (item.product.preco * item.quantity);
        }, 0);
    }
    
    getCartItemsCount() {
        return this.shoppingCart.reduce((count, item) => count + item.quantity, 0);
    }
    
    // Loading states
    setLoadingState(key, state) {
        this.loadingStates[key] = state;
        this.notifyObservers('loadingStateChanged', { key, state });
    }
    
    // Observer pattern para reatividade
    initObservers() {
        this.observers = {};
    }
    
    subscribe(event, callback) {
        // Garante que observers existe mesmo se initObservers falhar (segurança extra)
        if (!this.observers) this.observers = {};
        
        if (!this.observers[event]) {
            this.observers[event] = [];
        }
        this.observers[event].push(callback);
    }
    
    unsubscribe(event, callback) {
        if (!this.observers || !this.observers[event]) return;
        this.observers[event] = this.observers[event].filter(cb => cb !== callback);
    }
    
    notifyObservers(event, data = null) {
        if (!this.observers || !this.observers[event]) return;
        this.observers[event].forEach(callback => callback(data));
    }
}

// Instância global do store
window.shopStore = new ShopStore();