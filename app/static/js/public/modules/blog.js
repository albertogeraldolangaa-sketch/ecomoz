// Gestão de Blog e Conteúdo
class BlogManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.bindBlogEvents();
        this.loadBlogPosts();
    }
    
    bindBlogEvents() {
        // Event listeners para o modal do blog
    }
    
    async loadBlogPosts() {
        const blogPostList = document.getElementById('blog-post-list');
        if (!blogPostList) return;
        
        try {
            const posts = await this.fetchBlogPosts();
            this.renderBlogPosts(posts);
            
        } catch (error) {
            console.error('Erro ao carregar posts do blog:', error);
            this.showEmptyBlogState();
        }
    }
    
    async fetchBlogPosts() {
        // Simular chamada API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return [
            {
                id: 1,
                title: "Nova coleção de sapatos!",
                excerpt: "Descubra as novas tendências para este verão que acabaram de chegar à nossa loja.",
                image_url: "https://placehold.co/80x80/e0e0e0/757575?text=Img",
                created_at: "2024-01-20T08:00:00Z",
                read_time: "2 min"
            },
            {
                id: 2,
                title: "Dicas para cuidar da sua barba",
                excerpt: "Mantenha a sua barba impecável com estas 5 dicas simples de cuidado diário.",
                image_url: "https://placehold.co/80x80/e0e0e0/757575?text=Img",
                created_at: "2024-01-18T10:30:00Z",
                read_time: "3 min"
            },
            {
                id: 3,
                title: "Como escolher o perfume ideal",
                excerpt: "Guia completo para encontrar a fragrância perfeita para cada ocasião.",
                image_url: "https://placehold.co/80x80/e0e0e0/757575?text=Img",
                created_at: "2024-01-15T14:15:00Z",
                read_time: "4 min"
            }
        ];
    }
    
    renderBlogPosts(posts) {
        const blogPostList = document.getElementById('blog-post-list');
        if (!blogPostList) return;
        
        blogPostList.innerHTML = '';
        
        if (posts.length === 0) {
            this.showEmptyBlogState();
            return;
        }
        
        posts.forEach(post => {
            const postElement = this.createBlogPostElement(post);
            blogPostList.appendChild(postElement);
        });
    }
    
    createBlogPostElement(post) {
        const div = document.createElement('div');
        div.className = 'blog-post-item';
        div.dataset.postId = post.id;
        
        const dateFriendly = ShopUtils.formatDate(post.created_at, {
            day: 'numeric',
            month: 'short'
        });
        
        div.innerHTML = `
            <img src="${post.image_url}" 
                 alt="${post.title}" 
                 class="blog-post-thumbnail">
            <div class="blog-post-details">
                <h3 class="blog-post-title">${post.title}</h3>
                <p class="blog-post-excerpt">${post.excerpt}</p>
                <div class="blog-post-meta">
                    <span class="blog-post-date">${dateFriendly}</span>
                    <span class="blog-post-read-time">${post.read_time} de leitura</span>
                </div>
            </div>
        `;
        
        div.addEventListener('click', () => {
            this.openBlogPost(post.id);
        });
        
        return div;
    }
    
    openBlogPost(postId) {
        // Implementar abertura de post completo
        this.showBlogPostDetail(postId);
    }
    
    async showBlogPostDetail(postId) {
        try {
            const post = await this.fetchBlogPostDetail(postId);
            this.displayBlogPostModal(post);
            
        } catch (error) {
            console.error('Erro ao carregar post:', error);
            alert('Não foi possível carregar o post. Tente novamente.');
        }
    }
    
    async fetchBlogPostDetail(postId) {
        // Simular chamada API para detalhes do post
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const posts = {
            1: {
                id: 1,
                title: "Nova coleção de sapatos!",
                content: `
                    <p>Estamos entusiasmados em apresentar a nossa nova coleção de sapatos para a temporada de verão 2024. Depois de meses de pesquisa e desenvolvimento, trazemos até si designs inovadores que combinam conforto, estilo e durabilidade.</p>
                    
                    <h4>Destaques da Coleção</h4>
                    <ul>
                        <li>Sapatilhas breathable com tecnologia anti-odor</li>
                        <li>Sandalias elegantes para ocasiões especiais</li>
                        <li>Mocassins clássicos em pele genuína</li>
                    </ul>
                    
                    <p>Visite a nossa loja para experimentar os novos modelos e encontrar o par perfeito para si.</p>
                `,
                image_url: "https://placehold.co/400x250/e0e0e0/757575?text=Blog+Image",
                created_at: "2024-01-20T08:00:00Z",
                author: "Equipa da Loja"
            }
        };
        
        return posts[postId];
    }
    
    displayBlogPostModal(post) {
        const modalHTML = `
            <div class="modal-overlay active" id="blog-post-modal">
                <div class="modal-header">
                    <button class="modal-back-btn" onclick="blogManager.closeBlogPostModal()">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2 class="modal-title">${post.title}</h2>
                </div>
                <div class="modal-body">
                    <div class="blog-post-detail">
                        <img src="${post.image_url}" 
                             alt="${post.title}" 
                             class="blog-post-detail-image">
                        <div class="blog-post-content">
                            <div class="blog-post-meta-detail">
                                <span class="blog-post-author">Por ${post.author}</span>
                                <span class="blog-post-date">${ShopUtils.formatDate(post.created_at)}</span>
                            </div>
                            <div class="blog-post-body">
                                ${post.content}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('blog-post-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.classList.add('modal-active');
    }
    
    closeBlogPostModal() {
        const modal = document.getElementById('blog-post-modal');
        if (modal) {
            modal.remove();
            document.body.classList.remove('modal-active');
        }
    }
    
    showEmptyBlogState() {
        const blogPostList = document.getElementById('blog-post-list');
        if (blogPostList) {
            blogPostList.innerHTML = `
                <div class="empty-state">
                    <div class="icon"><i class="fa-solid fa-feather-alt"></i></div>
                    <h3>Sem Posts</h3>
                    <p>Esta loja ainda não publicou nenhum post no blog.</p>
                </div>
            `;
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.blogManager = new BlogManager();
});