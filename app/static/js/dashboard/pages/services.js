function createServiceRow(service) {
    return `
    <tr data-id="${service.id}" class="table-row">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${service.nome}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${service.duracao_min} min</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${formatCurrency(service.preco)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="editService(${service.id})" class="text-amber-600">Editar</button>
            <button onclick="deleteService(${service.id})" class="text-red-600 ml-2">Apagar</button>
        </td>
    </tr>`;
}

async function loadServicosPage() {
    contentArea.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Catálogo de Serviços</h3>
            <button onclick="openServiceModal()" class="btn btn-primary">+ Adicionar Serviço</button>
        </div>
        <div class="overflow-x-auto table-container">
            <table class="min-w-full divide-y dark:divide-gray-600">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Serviço</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Duração</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Preço (MZN)</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ações</th>
                    </tr>
                </thead>
                <tbody id="servicos-table-body" class="divide-y dark:divide-gray-600">
                    ${createLoader()}
                </tbody>
            </table>
        </div>
    </div>`;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    try {
        const services = await apiFetch('/api/dashboard/services');
        const tableBody = document.getElementById('servicos-table-body');
        if (services.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhum serviço encontrado.</td></tr>`;
            return;
        }
        tableBody.innerHTML = services.map(createServiceRow).join('');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        document.getElementById('servicos-table-body').innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">Não foi possível carregar os serviços.</td></tr>`;
    }
}

function openServiceModal() {
    const form = document.getElementById('form-servico');
    form.reset();
    form.dataset.id = '';
    document.getElementById('modal-servico-title').textContent = 'Adicionar Serviço';
    document.getElementById('serv_deposit_container').classList.add('hidden');
    openModal('modal-add-servico');
}

async function editService(id) {
    try {
        const service = await apiFetch(`/api/dashboard/services/${id}`);
        const form = document.getElementById('form-servico');
        form.dataset.id = service.id;
        
        document.getElementById('modal-servico-title').textContent = 'Editar Serviço';
        document.getElementById('serv_nome').value = service.nome;
        document.getElementById('serv_preco').value = service.preco;
        document.getElementById('serv_duracao').value = service.duracao_min;
        document.getElementById('serv_payment_mode').value = service.payment_mode;
        document.getElementById('serv_deposit_value').value = service.deposit_value;
        
        document.getElementById('serv_deposit_container').classList.toggle('hidden', service.payment_mode !== 'deposito');
        
        openModal('modal-add-servico');
    } catch (error) {
        showToast('Não foi possível carregar o serviço', 'error');
    }
}

async function handleSaveService(event) {
    event.preventDefault();
    const form = document.getElementById('form-servico');
    const id = form.dataset.id;
    const button = form.querySelector('button[type="submit"]');
    
    const data = {
        nome: document.getElementById('serv_nome').value,
        preco: parseFloat(document.getElementById('serv_preco').value),
        duracao_min: parseInt(document.getElementById('serv_duracao').value),
        payment_mode: document.getElementById('serv_payment_mode').value,
        deposit_value: parseFloat(document.getElementById('serv_deposit_value').value) || 0
    };
    
    const url = id ? `/api/dashboard/services/${id}` : '/api/dashboard/services';
    const method = id ? 'PUT' : 'POST';
    
    button.disabled = true;
    button.textContent = 'A guardar...';
    
    try {
        await apiFetch(url, { method: method, body: data });
        showToast(`Serviço ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        closeModal('modal-add-servico');
        await loadServicosPage();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Guardar Serviço';
    }
}

async function deleteService(id) {
    if (!confirm('Tem a certeza que quer apagar este serviço?')) return;
    try {
        await apiFetch(`/api/dashboard/services/${id}`, { method: 'DELETE' });
        showToast('Serviço apagado com sucesso!', 'success');
        await loadServicosPage();
    } catch (error) {
        showToast(error.message, 'error');
    }
}