// Lógica de atualização do carrinho
class CartManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.bindCartEvents();
        this.setupStoreObservers();
    }
    
    bindCartEvents() {
        // Botão flutuante do carrinho
        const cartButton = document.getElementById('cart-button');
        if (cartButton) {
            cartButton.addEventListener('click', () => {
                this.openCartModal();
            });
        }
        
        // Botão de chat
        const chatButton = document.getElementById('chat-button');
        if (chatButton) {
            chatButton.addEventListener('click', () => {
                this.openChat();
            });
        }
    }
    
    setupStoreObservers() {
        // Observa mudanças no carrinho
        shopStore.subscribe('cartUpdated', () => {
            this.updateCartUI();
            
            // Se estiver no modal do carrinho, atualiza a lista
            if (document.getElementById('schedule-modal')?.classList.contains('active')) {
                this.renderCartItems();
            }
        });
    }
    
    // Atualização da UI do Carrinho
    updateCartUI() {
        const cartButton = document.getElementById('cart-button');
        const cartCount = document.getElementById('cart-count');
        const cartTotalPrice = document.getElementById('cart-total-price');
        
        if (!cartButton || !cartCount || !cartTotalPrice) return;
        
        const shoppingCart = shopStore.getShoppingCart();
        
        if (shoppingCart.length === 0) {
            cartButton.style.display = 'none';
            return;
        }
        
        let totalItems = 0;
        let totalPrice = 0;
        
        shoppingCart.forEach(item => {
            totalItems += item.quantity;
            totalPrice += item.product.preco * item.quantity;
        });
        
        cartCount.textContent = totalItems;
        cartTotalPrice.textContent = ShopUtils.formatCurrency(totalPrice);
        cartButton.style.display = 'flex';
    }
    
    // Renderização dos Itens do Carrinho
    renderCartItems() {
        const serviceList = document.getElementById('service-list');
        if (!serviceList) return;
        
        serviceList.innerHTML = '';
        
        const shoppingCart = shopStore.getShoppingCart();
        
        if (shoppingCart.length === 0) {
            uiManager.showEmptyState(
                serviceList,
                'fa-shopping-cart',
                'Carrinho Vazio',
                'Adicione itens do catálogo para continuar.'
            );
            return;
        }
        
        shoppingCart.forEach((item, index) => {
            const cartItem = this.createCartItemElement(item, index);
            serviceList.appendChild(cartItem);
        });
        
        this.bindRemoveItemEvents();
    }
    
    createCartItemElement(item, index) {
        const li = document.createElement('li');
        li.className = 'cart-item';
        
        const priceDisplay = this.getCartItemPriceDisplay(item.product);
        
        li.innerHTML = `
            <img src="${item.product.image_url || 'https://placehold.co/60x60'}" 
                 class="cart-item-img" 
                 alt="${item.product.nome}">
            <div class="cart-item-details">
                <span class="cart-item-name">${item.product.nome}</span>
                <span class="cart-item-price">${item.quantity} x ${priceDisplay}</span>
            </div>
            <button class="cart-item-remove" data-index="${index}" aria-label="Remover item">
                <i class="fa-solid fa-trash-alt"></i>
            </button>
        `;
        
        return li;
    }
    
    getCartItemPriceDisplay(product) {
        if (product.payment_mode === 'deposito' && product.deposit_value > 0) {
            return `${product.deposit_value.toFixed(2)} MZN (Sinal)`;
        } else {
            return `${product.preco.toFixed(2)} MZN`;
        }
    }
    
    bindRemoveItemEvents() {
        const serviceList = document.getElementById('service-list');
        if (!serviceList) return;
        
        serviceList.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index, 10);
                shopStore.removeFromCart(index);
            });
        });
    }
    
    // Ações do Carrinho
    openCartModal() {
        this.renderCartItems();
        uiManager.openModal('schedule-modal');
        uiManager.showStep('step-1-services');
    }
    
    openChat() {
        // Placeholder para integração com sistema de chat
        alert('Funcionalidade de chat será implementada em breve!');
    }
    
    // Métodos auxiliares para o Booking Manager
    calculateCartPrices() {
        const shoppingCart = shopStore.getShoppingCart();
        let total_price = 0;
        let amount_to_pay_now = 0;
        
        shoppingCart.forEach(item => {
            const item_total = item.product.preco * item.quantity;
            total_price += item_total;
            
            if (item.product.payment_mode === 'deposito' && item.product.deposit_value > 0) {
                amount_to_pay_now += (item.product.deposit_value * item.quantity);
            } else {
                amount_to_pay_now += item_total;
            }
        });
        
        return {
            total_price,
            amount_to_pay_now,
            remaining_amount: total_price - amount_to_pay_now
        };
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.cartManager = new CartManager();
});