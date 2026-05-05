function createBookingRow(item) {
    const isBooking = !!item.data_hora;
    const id = item.id;
    const ticket = item.ticket_number;
    const cliente = item.nome_cliente;
    const itemNome = item.item_nome;
    const preco = formatCurrency(item.total_price);
    const data = isBooking ? new Date(item.data_hora).toLocaleString('pt-MZ') : new Date(item.created_at).toLocaleString('pt-MZ');
    const status = item.status;
    
    let statusBadge = '';
    switch(status) {
        case 'Pendente':
            statusBadge = `<span class="badge badge-warning">Pendente</span>`;
            break;
        case 'Confirmado':
            statusBadge = `<span class="badge badge-success">Confirmado</span>`;
            break;
        case 'Cancelado':
            statusBadge = `<span class="badge badge-error">Cancelado</span>`;
            break;
        default:
            statusBadge = `<span class="badge badge-info">${status}</span>`;
    }

    return `
    <tr data-id="${id}" class="table-row">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${ticket}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${cliente}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${itemNome}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${data}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${preco}</td>
        <td class="px-6 py-4 whitespace-nowrap">${statusBadge}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            ${status === 'Pendente' ? `
                <button onclick="updateBookingStatus(${id}, 'Confirmado')" class="text-green-600 hover:text-green-800 mr-2">Confirmar</button>
                <button onclick="updateBookingStatus(${id}, 'Cancelado')" class="text-red-600 hover:text-red-800">Cancelar</button>
            ` : (status === 'Confirmado' ? `
                <button onclick="updateBookingStatus(${id}, 'Concluido')" class="text-blue-600 hover:text-blue-800">Concluir</button>
            ` : '')}
        </td>
    </tr>`;
}

async function loadEncomendasPage(status = 'Pendente') {
    const html = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="sm:flex items-center justify-between mb-4">
            <div id="encomendas-tabs" class="flex border-b dark:border-gray-600">
                <button data-status="Pendente" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-blue-600 dark:hover:text-amber-600">Pendentes</button>
                <button data-status="Confirmado" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-blue-600 dark:hover:text-amber-600">Confirmados</button>
                <button data-status="Concluido" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-blue-600 dark:hover:text-amber-600">Concluídos</button>
                <button data-status="Cancelado" class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-blue-600 dark:hover:text-amber-600">Cancelados</button>
            </div>
            <input type="text" placeholder="Pesquisar encomenda..." class="mt-4 sm:mt-0 w-full sm:w-auto pl-8 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
        </div>
        
        <div class="overflow-x-auto table-container">
            <table class="min-w-full divide-y dark:divide-gray-600">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Nº Pedido</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Cliente</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Item</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Data/Hora</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Total (MZN)</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Estado</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ações</th>
                    </tr>
                </thead>
                <tbody id="encomendas-table-body" class="divide-y dark:divide-gray-600">
                    ${createLoader()}
                </tbody>
            </table>
        </div>
    </div>`;
    contentArea.innerHTML = html;
    
    document.querySelectorAll('#encomendas-tabs button').forEach(tab => {
        tab.addEventListener('click', () => {
            loadEncomendasPage(tab.dataset.status);
        });
    });
    
    // Ativar o tab atual
    const activeTab = document.querySelector(`#encomendas-tabs button[data-status="${status}"]`);
    if (activeTab) {
        activeTab.classList.remove('text-gray-500');
        activeTab.classList.add('border-b-2', 'border-blue-600', 'dark:border-amber-600', 'text-blue-600', 'dark:text-amber-600');
    }
    
    await fetchAndRenderBookings(status);
}

async function fetchAndRenderBookings(status) {
    const tableBody = document.getElementById('encomendas-table-body');
    tableBody.innerHTML = createLoader();
    try {
        const data = await apiFetch(`/api/dashboard/bookings?status=${status}`);
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-gray-500">Nenhuma encomenda encontrada.</td></tr>`;
            return;
        }
        tableBody.innerHTML = data.map(createBookingRow).join('');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-red-500">Não foi possível carregar as encomendas.</td></tr>`;
    }
}

async function updateBookingStatus(id, newStatus) {
    try {
        await apiFetch('/api/dashboard/bookings/update-status', {
            method: 'POST',
            body: { id: id, status: newStatus }
        });
        showToast('Status atualizado com sucesso!', 'success');
        // Recarregar a lista atual
        const currentStatus = document.querySelector('#encomendas-tabs button.border-b-2').dataset.status || 'Pendente';
        await fetchAndRenderBookings(currentStatus);
    } catch (error) {
        showToast(`Erro ao atualizar status: ${error.message}`, 'error');
    }
}