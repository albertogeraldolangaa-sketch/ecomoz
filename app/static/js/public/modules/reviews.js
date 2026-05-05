// Gestão de Avaliações e Reviews
class ReviewsManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.bindReviewEvents();
        this.loadReviews();
    }
    
    bindReviewEvents() {
        // Event listeners para o modal de avaliações
    }
    
    async loadReviews() {
        const reviewList = document.getElementById('review-list');
        if (!reviewList) return;
        
        try {
            // Placeholder - implementar chamada API real para avaliações
            const reviews = await this.fetchReviews();
            this.renderReviews(reviews);
            
        } catch (error) {
            console.error('Erro ao carregar avaliações:', error);
            this.showEmptyReviewsState();
        }
    }
    
    async fetchReviews() {
        // Simular chamada API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return [
            {
                id: 1,
                customer_name: "Ana Silva",
                rating: 5,
                comment: "Adorei o atendimento e o produto é de excelente qualidade! Recomendo vivamente.",
                created_at: "2024-01-15T10:30:00Z"
            },
            {
                id: 2,
                customer_name: "Carlos Matos",
                rating: 3,
                comment: "O produto é bom, mas a entrega demorou mais que o esperado.",
                created_at: "2024-01-10T14:20:00Z"
            },
            {
                id: 3,
                customer_name: "Maria Santos",
                rating: 4,
                comment: "Profissional muito competente e atencioso. Voltarei com certeza!",
                created_at: "2024-01-08T09:15:00Z"
            }
        ];
    }
    
    renderReviews(reviews) {
        const reviewList = document.getElementById('review-list');
        if (!reviewList) return;
        
        reviewList.innerHTML = '';
        
        if (reviews.length === 0) {
            this.showEmptyReviewsState();
            return;
        }
        
        reviews.forEach(review => {
            const reviewElement = this.createReviewElement(review);
            reviewList.appendChild(reviewElement);
        });
    }
    
    createReviewElement(review) {
        const div = document.createElement('div');
        div.className = 'review-item';
        
        const starsHTML = this.generateStarsHTML(review.rating);
        const dateFriendly = ShopUtils.formatDate(review.created_at, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        div.innerHTML = `
            <div class="review-header">
                <div class="reviewer-info">
                    <span class="review-name">${review.customer_name}</span>
                    <span class="review-date">${dateFriendly}</span>
                </div>
                <span class="review-stars">${starsHTML}</span>
            </div>
            <p class="review-text">${review.comment}</p>
        `;
        
        return div;
    }
    
    generateStarsHTML(rating) {
        let starsHTML = '';
        
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                starsHTML += '<i class="fa-solid fa-star"></i>';
            } else {
                starsHTML += '<i class="fa-regular fa-star"></i>';
            }
        }
        
        return starsHTML;
    }
    
    showEmptyReviewsState() {
        const reviewList = document.getElementById('review-list');
        if (reviewList) {
            reviewList.innerHTML = `
                <div class="empty-state">
                    <div class="icon"><i class="fa-solid fa-star"></i></div>
                    <h3>Sem Avaliações</h3>
                    <p>Esta loja ainda não tem avaliações.</p>
                </div>
            `;
        }
    }
    
    // Método para calcular rating médio
    calculateAverageRating(reviews) {
        if (reviews.length === 0) return 0;
        
        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        return (totalRating / reviews.length).toFixed(1);
    }
    
    // Método para mostrar resumo de ratings
    showRatingSummary(reviews) {
        const ratingCounts = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
        
        reviews.forEach(review => {
            ratingCounts[review.rating]++;
        });
        
        return ratingCounts;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.reviewsManager = new ReviewsManager();
});