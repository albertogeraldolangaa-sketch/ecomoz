function createClientRow(client) {
    return `
    <tr data-id="${client.id}" class="table-row">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${client.nome}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${client.telefone || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${client.email || 'N/A'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="editClient(${client.id})" class="text-amber-600">Editar</button>
            <button onclick="deleteClient(${client.id})" class="text-red-600 ml-2">Apagar</button>
        </td>
    </tr>`;
}

async function loadClientesPage() {
    contentArea.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Gestão de Clientes (CRM)</h3>
            <button onclick="openClientModal()" class="btn btn-primary">+ Adicionar Cliente</button>
        </div>
        <div class="overflow-x-auto table-container">
            <table class="min-w-full divide-y dark:divide-gray-600">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Nome</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Telefone</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Email</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ações</th>
                    </tr>
                </thead>
                <tbody id="clients-table-body" class="divide-y dark:divide-gray-600">
                    ${createLoader()}
                </tbody>
            </table>
        </div>
    </div>`;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    try {
        const clients = await apiFetch('/api/dashboard/clients');
        const tableBody = document.getElementById('clients-table-body');
        if (clients.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhum cliente encontrado.</td></tr>`;
            return;
        }
        tableBody.innerHTML = clients.map(createClientRow).join('');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        document.getElementById('clients-table-body').innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">Não foi possível carregar os clientes.</td></tr>`;
    }
}

function openClientModal() {
    const form = document.getElementById('form-client');
    form.reset();
    form.dataset.id = '';
    document.getElementById('modal-client-title').textContent = 'Adicionar Cliente';
    openModal('modal-add-client');
}

async function editClient(id) {
    try {
        const client = await apiFetch(`/api/dashboard/clients/${id}`);
        const form = document.getElementById('form-client');
        form.dataset.id = client.id;
        
        document.getElementById('modal-client-title').textContent = 'Editar Cliente';
        document.getElementById('client_nome').value = client.nome;
        document.getElementById('client_telefone').value = client.telefone;
        document.getElementById('client_email').value = client.email;
        document.getElementById('client_notas').value = client.notas;
        
        openModal('modal-add-client');
    } catch (error) {
        showToast('Não foi possível carregar o cliente', 'error');
    }
}

async function handleSaveClient(event) {
    event.preventDefault();
    const form = document.getElementById('form-client');
    const id = form.dataset.id;
    const button = form.querySelector('button[type="submit"]');
    
    const data = {
        nome: document.getElementById('client_nome').value,
        telefone: document.getElementById('client_telefone').value,
        email: document.getElementById('client_email').value,
        notas: document.getElementById('client_notas').value
    };
    
    const url = id ? `/api/dashboard/clients/${id}` : '/api/dashboard/clients';
    const method = id ? 'PUT' : 'POST';
    
    button.disabled = true;
    button.textContent = 'A guardar...';
    
    try {
        await apiFetch(url, { method: method, body: data });
        showToast(`Cliente ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        closeModal('modal-add-client');
        await loadClientesPage();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Guardar Cliente';
    }
}

async function deleteClient(id) {
    if (!confirm('Tem a certeza que quer apagar este cliente?')) return;
    try {
        await apiFetch(`/api/dashboard/clients/${id}`, { method: 'DELETE' });
        showToast('Cliente apagado com sucesso!', 'success');
        await loadClientesPage();
    } catch (error) {
        showToast(error.message, 'error');
    }
}