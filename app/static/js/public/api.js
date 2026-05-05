// app/static/js/public/api.js

class ShopAPI {
    static async get(endpoint) {
        try {
            const url = `${ShopConfig.apiBaseUrl}/${ShopConfig.shopSlug}${endpoint}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    }
    
    static async post(endpoint, data) {
        try {
            // Se o endpoint for absoluto (ex: /api/buyer/...), usa-o diretamente
            // Caso contrário, usa a base da loja (/api/loja/slug/...)
            const url = endpoint.startsWith('/api/') ? endpoint : `${ShopConfig.apiBaseUrl}/${ShopConfig.shopSlug}${endpoint}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `HTTP error! status: ${response.status}`);
            return result;
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    }
    
    // --- MÉTODOS EXISTENTES ---
    static async getServices() { return await this.get(ShopConfig.endpoints.services); }
    static async getProducts() { return await this.get(ShopConfig.endpoints.products); }
    static async getAvailability(date, params = {}) {
        const queryParams = new URLSearchParams({ date, ...params });
        return await this.get(`${ShopConfig.endpoints.availability}?${queryParams}`);
    }
    static async submitBooking(bookingData) { return await this.post(ShopConfig.endpoints.book, bookingData); }
    static async submitOrder(orderData) { return await this.post(ShopConfig.endpoints.createOrder, orderData); }
    static async cancelBooking(ticketNumber) { return await this.post(ShopConfig.endpoints.cancel, { ticket_number: ticketNumber }); }
    static async getProductDetails(productId) { return await this.get(ShopConfig.endpoints.productDetails.replace('{id}', productId)); }

    // --- NOVOS MÉTODOS ADICIONADOS ---
    
    // Staff
    static async getStaff() { return await this.get('/staff'); }
    
    // Blog
    static async getBlogPosts() { return await this.get('/blog'); }
    
    // Reviews
    static async getReviews() { return await this.get('/reviews'); }
    
    // Orçamentos
    static async createQuote(data) { return await this.post('/create-quote', data); }
    
    // Autenticação Buyer (Global, não depende do slug da loja)
    static async loginBuyer(telefone, password) {
        return await this.post('/api/buyer/login', { telefone, password });
    }
    
    static async registerBuyer(nome, telefone, email, password) {
        return await this.post('/api/buyer/register', { nome, telefone, email, password });
    }
    
    static async getBuyerHistory(buyerId) {
        return await this.get(`/api/buyer/${buyerId}/history`); // Requer ajuste se a rota for global
    }
}