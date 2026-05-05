// Configurações globais da aplicação
window.ShopConfig = {
    shopSlug: document.body.dataset.slug || 'loja-teste',
    businessModel: document.body.dataset.model || 'agendamento',
    productLayout: document.body.dataset.layout || 'lista',
    apiBaseUrl: '/api/loja',
    
    // URLs da API
    endpoints: {
        services: '/services',
        products: '/products',
        availability: '/availability',
        book: '/book',
        createOrder: '/create-order',
        cancel: '/cancel',
        productDetails: '/products/{id}/details'
    },
    
    // Configurações de UI
    ui: {
        animationDuration: 300,
        modalTransition: 'transform 0.3s ease-out, opacity 0.3s ease-out'
    }
};