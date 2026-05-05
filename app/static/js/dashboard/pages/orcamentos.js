function createOrcamentoRow(quote) {
    const status = quote.is_read ? 
        '<span class="badge badge-info">Lido</span>' :
        '<span class="badge badge-warning">Novo</span>';
    return `
    <tr data-id="${quote.id}" class="table-row">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${new Date(quote.created_at).toLocaleDateString('pt-MZ')}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${quote.nome_cliente}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${quote.telefone_cliente}</td>
        <td class="px-6 py-4 whitespace-nowrap">${status}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="openOrcamentoModal(${quote.id})" class="text-amber-600">Ver Pedido</button>
        </td>
    </tr>`;
}

async function loadOrcamentosPage() {
    contentArea.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Pedidos de Orçamento</h3>
        </div>
        <div class="overflow-x-auto table-container">
            <table class="min-w-full divide-y dark:divide-gray-600">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Data</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Cliente</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Telefone</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Estado</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ações</th>
                    </tr>
                </thead>
                <tbody id="quotes-table-body" class="divide-y dark:divide-gray-600">
                    ${createLoader()}
                </tbody>
            </table>
        </div>
    </div>`;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    try {
        const quotes = await apiFetch('/api/dashboard/quotes');
        const tableBody = document.getElementById('quotes-table-body');
        if (quotes.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhum pedido de orçamento encontrado.</td></tr>`;
            return;
        }
        tableBody.innerHTML = quotes.map(createOrcamentoRow).join('');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        document.getElementById('quotes-table-body').innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Não foi possível carregar os pedidos.</td></tr>`;
    }
}

async function openOrcamentoModal(id) {
     try {
        const quote = await apiFetch(`/api/dashboard/quotes/${id}`);
        
        document.getElementById('quote_client_name').textContent = quote.nome_cliente;
        document.getElementById('quote_client_phone').textContent = quote.telefone_cliente;
        document.getElementById('quote_date').textContent = new Date(quote.created_at).toLocaleString('pt-MZ');
        document.getElementById('quote_details').textContent = quote.details;
        
        const markReadBtn = document.getElementById('quote-mark-read-btn');
        markReadBtn.dataset.id = id;
        markReadBtn.disabled = quote.is_read;
        markReadBtn.textContent = quote.is_read ? 'Lido' : 'Marcar como Lido';
        
        openModal('modal-view-quote');
        
        // Atualiza a tabela na UI se estava como "Novo"
        if (!quote.is_read) {
            await markQuoteAsRead(id);
        }
    } catch (error) {
        showToast('Não foi possível carregar o orçamento', 'error');
    }
}

async function markQuoteAsRead(id) {
     try {
        await apiFetch(`/api/dashboard/quotes/${id}/read`, { method: 'POST' });
        // Recarrega a tabela para atualizar o status
        await loadOrcamentosPage(); 
        const btn = document.getElementById('quote-mark-read-btn');
        if (btn && btn.dataset.id == id) {
            btn.disabled = true;
            btn.textContent = 'Lido';
        }
     } catch (error) {
         showToast('Erro ao marcar como lido', 'error');
     }
}

// Event listener para o botão de marcar como lido
document.addEventListener('DOMContentLoaded', function() {
    const markReadBtn = document.getElementById('quote-mark-read-btn');
    if (markReadBtn) {
        markReadBtn.addEventListener('click', function() {
            const quoteId = this.dataset.id;
            if (quoteId) {
                markQuoteAsRead(quoteId);
            }
        });
    }
});