function createReviewRow(review) {
    const status = review.is_published ? 
        '<span class="badge badge-success">Publicado</span>' :
        '<span class="badge badge-warning">Pendente</span>';
    
    const stars = drawStars(review.rating);
    
    return `
    <tr data-id="${review.id}" class="table-row">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${review.client_name}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-yellow-500 flex">${stars}</td>
        <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 truncate" style="max-width: 200px;">${review.text}</td>
        <td class="px-6 py-4 whitespace-nowrap">${status}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="openReviewModal(${review.id})" class="text-amber-600">Ver / Responder</button>
        </td>
    </tr>`;
}

async function loadAvaliacoesPage() {
    contentArea.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Gerir Avaliações (Reviews)</h3>
        <div class="overflow-x-auto table-container">
            <table class="min-w-full divide-y dark:divide-gray-600">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Cliente</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Avaliação</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Comentário</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Estado</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ações</th>
                    </tr>
                </thead>
                <tbody id="reviews-table-body" class="divide-y dark:divide-gray-600">
                    ${createLoader()}
                </tbody>
            </table>
        </div>
    </div>`;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    try {
        const reviews = await apiFetch('/api/dashboard/reviews');
        const tableBody = document.getElementById('reviews-table-body');
        if (reviews.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhuma avaliação encontrada.</td></tr>`;
            return;
        }
        tableBody.innerHTML = reviews.map(createReviewRow).join('');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        document.getElementById('reviews-table-body').innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Não foi possível carregar as avaliações.</td></tr>`;
    }
}

async function openReviewModal(id) {
     try {
        const review = await apiFetch(`/api/dashboard/reviews/${id}`);
        
        document.getElementById('form-review-reply').dataset.id = id;
        document.getElementById('review_client_name').textContent = review.client_name;
        document.getElementById('review_stars').innerHTML = drawStars(review.rating);
        document.getElementById('review_text').textContent = review.text;
        document.getElementById('review_reply_text').value = review.reply || '';
        
        openModal('modal-view-review');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
    } catch (error) {
        showToast('Não foi possível carregar a avaliação', 'error');
    }
}

async function handleSaveReviewReply(event) {
    event.preventDefault();
    const form = event.target;
    const id = form.dataset.id;
    const button = form.querySelector('button[type="submit"]');
    
    const data = {
        reply: document.getElementById('review_reply_text').value,
        is_published: true
    };
    
    button.disabled = true;
    button.textContent = 'A guardar...';
    
    try {
        await apiFetch(`/api/dashboard/reviews/${id}/reply`, { method: 'POST', body: data });
        showToast('Resposta guardada com sucesso!', 'success');
        closeModal('modal-view-review');
        await loadAvaliacoesPage();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Guardar Resposta';
    }
}

// Event listener para o formulário de resposta
document.addEventListener('DOMContentLoaded', function() {
    const reviewForm = document.getElementById('form-review-reply');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleSaveReviewReply);
    }
});