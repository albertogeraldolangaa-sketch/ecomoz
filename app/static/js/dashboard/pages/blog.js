function createBlogPostRow(post) {
    const status = post.is_published ? 
        '<span class="badge badge-success">Publicado</span>' :
        '<span class="badge badge-warning">Rascunho</span>';
    
    return `
    <tr data-id="${post.id}" class="table-row">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${post.title}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${new Date(post.created_at).toLocaleDateString('pt-MZ')}</td>
        <td class="px-6 py-4 whitespace-nowrap">${status}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="editBlogPost(${post.id})" class="text-amber-600">Editar</button>
            <button onclick="deleteBlogPost(${post.id})" class="text-red-600 ml-2">Apagar</button>
        </td>
    </tr>`;
}

async function loadBlogPage() {
     contentArea.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Blog / Posts</h3>
            <button onclick="openBlogModal()" class="btn btn-primary">
                <i data-lucide="plus" class="w-4 h-4 inline-block -mt-0.5 mr-1"></i>
                Criar Novo Post
            </button>
        </div>
        <div class="overflow-x-auto table-container">
            <table class="min-w-full divide-y dark:divide-gray-600">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Título do Post</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Data</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Estado</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ações</th>
                    </tr>
                </thead>
                <tbody id="blog-table-body" class="divide-y dark:divide-gray-600">
                    ${createLoader()}
                </tbody>
            </table>
        </div>
    </div>`;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    try {
        const posts = await apiFetch('/api/dashboard/blog-posts');
        const tableBody = document.getElementById('blog-table-body');
        if (posts.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhum post encontrado.</td></tr>`;
            return;
        }
        tableBody.innerHTML = posts.map(createBlogPostRow).join('');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        document.getElementById('blog-table-body').innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">Não foi possível carregar os posts.</td></tr>`;
    }
}

function openBlogModal() {
    const form = document.getElementById('form-blog-post');
    form.reset();
    form.dataset.id = '';
    document.getElementById('modal-blog-post-title').textContent = 'Criar Novo Post';
    document.getElementById('post_image_preview').classList.add('hidden');
    document.getElementById('post_image_url').value = '';
    document.getElementById('post_is_published').checked = false;
    document.getElementById('blog-post-publish-btn').textContent = 'Publicar Post';
    document.getElementById('blog-post-draft-btn').textContent = 'Guardar Rascunho';
    openModal('modal-add-blog-post');
}

async function editBlogPost(id) {
    try {
        const post = await apiFetch(`/api/dashboard/blog-posts/${id}`);
        const form = document.getElementById('form-blog-post');
        form.dataset.id = post.id;
        
        document.getElementById('modal-blog-post-title').textContent = 'Editar Post';
        document.getElementById('post_titulo').value = post.title;
        document.getElementById('post_conteudo').value = post.content;
        document.getElementById('post_is_published').checked = post.is_published;
        document.getElementById('post_image_url').value = post.image_url;

        const preview = document.getElementById('post_image_preview');
        if (post.image_url) {
            preview.src = post.image_url;
            preview.classList.remove('hidden');
        } else {
            preview.classList.add('hidden');
        }
        
        document.getElementById('blog-post-publish-btn').textContent = 'Guardar Alterações';
        document.getElementById('blog-post-draft-btn').textContent = 'Guardar como Rascunho';
        
        openModal('modal-add-blog-post');
    } catch (error) {
        showToast('Não foi possível carregar o post', 'error');
    }
}

async function handleSaveBlogPost(event, isPublishing) {
    event.preventDefault();
    const form = document.getElementById('form-blog-post');
    const id = form.dataset.id;
    const button = isPublishing ? document.getElementById('blog-post-publish-btn') : document.getElementById('blog-post-draft-btn');
    
    button.disabled = true;
    button.textContent = 'A guardar...';

    try {
        let imageUrl = document.getElementById('post_image_url').value;
        const fileInput = document.getElementById('post_image');
        
        if (fileInput.files && fileInput.files[0]) {
            imageUrl = await handleImageUpload(fileInput.files[0], 'blog');
        }

        const data = {
            title: document.getElementById('post_titulo').value,
            content: document.getElementById('post_conteudo').value,
            image_url: imageUrl,
            is_published: isPublishing || document.getElementById('post_is_published').checked
        };
        
        if (!isPublishing) {
            data.is_published = false;
        }
        
        const url = id ? `/api/dashboard/blog-posts/${id}` : '/api/dashboard/blog-posts';
        const method = id ? 'PUT' : 'POST';
        
        await apiFetch(url, { method: method, body: data });
        showToast(`Post ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        closeModal('modal-add-blog-post');
        await loadBlogPage();

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        button.disabled = false;
        // Textos são resetados na próxima abertura do modal
    }
}

async function deleteBlogPost(id) {
    if (!confirm('Tem a certeza que quer apagar este post?')) return;
    try {
        await apiFetch(`/api/dashboard/blog-posts/${id}`, { method: 'DELETE' });
        showToast('Post apagado com sucesso!', 'success');
        await loadBlogPage();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// Event listeners para os botões do blog
document.addEventListener('DOMContentLoaded', function() {
    const blogForm = document.getElementById('form-blog-post');
    if (blogForm) {
        blogForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleSaveBlogPost(e, true);
        });
        
        const draftBtn = document.getElementById('blog-post-draft-btn');
        if (draftBtn) {
            draftBtn.addEventListener('click', function(e) {
                e.preventDefault();
                handleSaveBlogPost(e, false);
            });
        }
    }
});