// Lógica de Variantes e Adicionar ao Carrinho
class ProductsManager {
    constructor() {
        this.currentProductData = null;
        this.complexProductDetails = {
            options: [],
            variants: [],
            selectedVariant: null
        };
        
        this.init();
    }
    
    init() {
        this.bindProductEvents();
        this.bindModalEvents();
    }
    
    bindProductEvents() {
        // Event listener para abrir modal de produto será adicionado dinamicamente
    }
    
    bindModalEvents() {
        // Botão de agendar produto
        document.getElementById('modal-book-product-btn')?.addEventListener('click', () => {
            this.handleBookProduct();
        });
        
        // Botão de adicionar ao carrinho
        document.getElementById('modal-add-to-cart-btn')?.addEventListener('click', () => {
            this.handleAddToCart();
        });
        
        // Seletor de quantidade
        document.getElementById('item-quantity-selector')?.addEventListener('click', (e) => {
            this.handleQtyChange(e);
        });
    }
    
    // Carregamento de Produtos
    async loadProducts() {
        const productList = document.getElementById('product-list');
        if (!productList) return;
        
        uiManager.showLoader(productList);
        shopStore.setLoadingState('products', true);
        
        try {
            const products = await ShopAPI.getProducts();
            this.renderProducts(products);
            shopStore.setLoadingState('products', false);
            
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            uiManager.showEmptyState(
                productList,
                'fa-triangle-exclamation',
                'Erro',
                'Não foi possível carregar os produtos.'
            );
            shopStore.setLoadingState('products', false);
        }
    }
    
    renderProducts(products) {
        const productList = document.getElementById('product-list');
        if (!productList) return;
        
        productList.innerHTML = '';
        
        if (products.length === 0) {
            uiManager.showEmptyState(
                productList,
                'fa-tag',
                'Sem Produtos',
                'Esta loja não tem produtos à venda no momento.'
            );
            return;
        }
        
        // Define o layout
        const layout = ShopConfig.productLayout;
        if (layout === 'grid') {
            productList.className = 'product-grid';
        } else {
            productList.className = 'product-list';
        }
        
        products.forEach(product => {
            const productElement = this.createProductElement(product, layout);
            productList.appendChild(productElement);
        });
    }
    
    createProductElement(product, layout) {
        const li = document.createElement('li');
        const priceDisplay = this.getPriceDisplay(product);
        
        if (layout === 'grid') {
            li.className = 'product-card clickable';
            li.innerHTML = `
                <img src="${product.image_url || 'https://placehold.co/300x450/e0e0e0/757575?text=Img'}" 
                     alt="${product.nome}" 
                     class="product-card-images">
                <div class="product-card-info">
                    <div class="product-card-name">${product.nome}</div>
                    <div class="product-card-price">${priceDisplay}</div>
                </div>
            `;
        } else {
            li.className = 'menu-item clickable';
            li.innerHTML = `
                <img src="${product.image_url || 'https://placehold.co/60x60/e0e0e0/757575?text=Img'}" 
                     alt="${product.nome}" 
                     class="menu-item-thumbnail">
                <div class="menu-item-details">
                    <span class="menu-item-name">${product.nome}</span>
                    <span class="menu-item-price">${priceDisplay}</span>
                </div>
                <i class="fas fa-chevron-right chevron-icon"></i>
            `;
        }
        
        li.addEventListener('click', () => this.openProductModal(product));
        return li;
    }
    
    getPriceDisplay(product) {
        if (product.payment_mode === 'deposito' && product.deposit_value > 0) {
            return `${product.deposit_value.toFixed(2)} MZN (Sinal)`;
        } else {
            return `${product.preco.toFixed(2)} MZN`;
        }
    }
    
    // Modal de Produto
    async openProductModal(product) {
        this.currentProductData = product;
        this.resetComplexProductDetails();
        
        // UI Básica
        this.updateProductModalUI(product);
        
        // Mostrar botões apropriados
        this.toggleModalButtons();
        
        if (product.product_type === 'variavel') {
            await this.loadProductVariants(product.id);
        } else {
            this.setupSimpleProduct(product);
        }
        
        uiManager.openModal('item-detail-modal');
    }
    
    updateProductModalUI(product) {
        this.updateElement('item-detail-image', product.image_url || 'https://placehold.co/400x250/e0e0e0/757575?text=Img');
        this.updateElementText('item-detail-name', product.nome);
        this.updateElementText('item-detail-description', product.descricao || 'Sem descrição disponível.');
    }
    
    toggleModalButtons() {
        const isDelivery = ShopConfig.businessModel === 'delivery';
        const addToCartBtn = document.getElementById('modal-add-to-cart-btn');
        const bookProductBtn = document.getElementById('modal-book-product-btn');
        const qtySelector = document.getElementById('item-quantity-selector');
        
        if (addToCartBtn) {
            addToCartBtn.style.display = isDelivery ? 'block' : 'none';
        }
        
        if (bookProductBtn) {
            bookProductBtn.style.display = isDelivery ? 'none' : 'block';
        }
        
        if (qtySelector) {
            qtySelector.style.display = isDelivery ? 'flex' : 'none';
        }
        
        // Reset quantidade
        const qtyInput = document.getElementById('item-detail-qty');
        if (qtyInput) qtyInput.value = '1';
    }
    
    resetComplexProductDetails() {
        this.complexProductDetails = {
            options: [],
            variants: [],
            selectedVariant: null
        };
        
        // Remove seletores antigos
        const contentDiv = document.getElementById('item-detail-content');
        if (contentDiv) {
            contentDiv.querySelectorAll('.variant-selector-group').forEach(el => el.remove());
        }
    }
    
    async loadProductVariants(productId) {
        const priceEl = document.getElementById('item-detail-price');
        const addToCartBtn = document.getElementById('modal-add-to-cart-btn');
        const bookProductBtn = document.getElementById('modal-book-product-btn');
        
        if (priceEl) priceEl.textContent = "A carregar opções...";
        if (addToCartBtn) addToCartBtn.disabled = true;
        if (bookProductBtn) bookProductBtn.disabled = true;
        
        try {
            const data = await ShopAPI.getProductDetails(productId);
            this.complexProductDetails.options = data.options;
            this.complexProductDetails.variants = data.variants;
            
            this.renderVariantSelectors();
            
            // Preço inicial
            const precos = data.variants.map(v => v.preco);
            const minPrice = Math.min(...precos);
            if (priceEl) priceEl.textContent = `A partir de ${minPrice.toFixed(2)} MZN`;
            
        } catch (error) {
            console.error('Erro ao carregar variantes:', error);
            if (priceEl) priceEl.textContent = "Erro ao carregar opções.";
        }
    }
    
    setupSimpleProduct(product) {
        const priceEl = document.getElementById('item-detail-price');
        const addToCartBtn = document.getElementById('modal-add-to-cart-btn');
        const bookProductBtn = document.getElementById('modal-book-product-btn');
        
        let priceDisplay = '';
        if (product.payment_mode === 'deposito' && product.deposit_value > 0) {
            priceDisplay = `${product.deposit_value.toFixed(2)} MZN (Sinal de ${product.preco.toFixed(2)} MZN)`;
        } else {
            priceDisplay = `${product.preco.toFixed(2)} MZN`;
        }
        
        if (priceEl) priceEl.textContent = priceDisplay;
        if (addToCartBtn) addToCartBtn.disabled = false;
        if (bookProductBtn) bookProductBtn.disabled = false;
    }
    
    renderVariantSelectors() {
        const contentDiv = document.getElementById('item-detail-content');
        const qtySelector = document.getElementById('item-quantity-selector');
        
        if (!contentDiv || !qtySelector) return;
        
        const options = this.complexProductDetails.options;
        
        options.forEach((opt, index) => {
            const selectorGroup = document.createElement('div');
            selectorGroup.className = 'form-group variant-selector-group';
            selectorGroup.innerHTML = `
                <label for="variant-opt-${index}">${opt.name}</label>
                <select id="variant-opt-${index}" 
                        data-option-index="${index}" 
                        class="form-group input" 
                        style="width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 1rem;">
                    <option value="">Selecione ${opt.name}</option>
                    ${opt.values.map(val => 
                        `<option value="${val.id}">${val.value}</option>`
                    ).join('')}
                </select>
            `;
            
            qtySelector.before(selectorGroup);
        });
        
        // Adiciona listeners aos seletores
        contentDiv.querySelectorAll('.variant-selector-group select').forEach(select => {
            select.addEventListener('change', () => this.handleVariantSelection());
        });
    }
    
    handleVariantSelection() {
        const contentDiv = document.getElementById('item-detail-content');
        const selectedValueIds = [];
        let allOptionsSelected = true;
        
        contentDiv.querySelectorAll('.variant-selector-group select').forEach(select => {
            if (select.value) {
                selectedValueIds.push(parseInt(select.value, 10));
            } else {
                allOptionsSelected = false;
            }
        });
        
        const priceEl = document.getElementById('item-detail-price');
        const addToCartBtn = document.getElementById('modal-add-to-cart-btn');
        const bookProductBtn = document.getElementById('modal-book-product-btn');
        
        if (!allOptionsSelected) {
            this.complexProductDetails.selectedVariant = null;
            if (priceEl) priceEl.textContent = "Selecione as opções";
            if (addToCartBtn) addToCartBtn.disabled = true;
            if (bookProductBtn) bookProductBtn.disabled = true;
            return;
        }
        
        const variants = this.complexProductDetails.variants;
        const foundVariant = variants.find(v => {
            return v.option_value_ids.length === selectedValueIds.length && 
                   v.option_value_ids.every(id => selectedValueIds.includes(id));
        });
        
        if (foundVariant) {
            this.complexProductDetails.selectedVariant = foundVariant;
            if (priceEl) priceEl.textContent = `${foundVariant.preco.toFixed(2)} MZN`;
            if (addToCartBtn) addToCartBtn.disabled = false;
            if (bookProductBtn) bookProductBtn.disabled = false;
        } else {
            this.complexProductDetails.selectedVariant = null;
            if (priceEl) priceEl.textContent = "Combinação indisponível";
            if (addToCartBtn) addToCartBtn.disabled = true;
            if (bookProductBtn) bookProductBtn.disabled = true;
        }
    }
    
    // Ações do Modal
    handleBookProduct() {
        if (!this.currentProductData) return;
        
        shopStore.setBookingState({
            product: this.currentProductData,
            service: null,
            staff: null
        });
        
        this.showItemPreselectedSummary();
        this.closeProductModal();
        
        setTimeout(() => {
            uiManager.openModal('schedule-modal');
            
            if (!shopStore.loadingStates.services) {
                // bookingManager.loadServices(); // Se necessário para disponibilidade
                shopStore.setLoadingState('services', true);
            }
            
            const productRequiresStaff = (this.currentProductData.requires_staff || false);
            
            if (productRequiresStaff) {
                bookingManager.loadStaff();
                uiManager.showStep('step-1b-staff');
            } else {
                bookingManager.renderCalendar();
                uiManager.showStep('step-2-datetime');
            }
        }, 350);
    }
    
    handleAddToCart() {
        if (!this.currentProductData) return;
        
        const quantity = parseInt(document.getElementById('item-detail-qty')?.value || '1');
        
        if (this.currentProductData.product_type === 'variavel') {
            const variant = this.complexProductDetails.selectedVariant;
            if (!variant) {
                alert("Por favor, selecione todas as opções do produto.");
                return;
            }
            
            shopStore.addToCart(this.currentProductData, quantity, variant);
        } else {
            shopStore.addToCart(this.currentProductData, quantity);
        }
        
        this.closeProductModal();
    }
    
    handleQtyChange(e) {
        const action = e.target.dataset.action;
        const qtyInput = document.getElementById('item-detail-qty');
        
        if (!qtyInput) return;
        
        let qty = parseInt(qtyInput.value);
        
        if (action === 'increase') {
            qty++;
        } else if (action === 'decrease' && qty > 1) {
            qty--;
        }
        
        qtyInput.value = qty;
    }
    
    showItemPreselectedSummary() {
        const itemPreselectedSummary = document.getElementById('item-preselected-summary');
        const summaryPreselectedItem = document.getElementById('summary-preselected-item');
        
        if (itemPreselectedSummary && summaryPreselectedItem) {
            summaryPreselectedItem.textContent = 
                `${this.currentProductData.nome} (${this.currentProductData.preco.toFixed(2)} MZN)`;
            itemPreselectedSummary.style.display = 'block';
        }
    }
    
    closeProductModal() {
        uiManager.closeModal(document.getElementById('item-detail-modal'));
        this.currentProductData = null;
    }
    
    // Helpers
    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) element.src = value;
    }
    
    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = text;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.productsManager = new ProductsManager();
});