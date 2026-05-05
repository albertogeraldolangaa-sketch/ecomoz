function createCuponRow(coupon) {
    const valor = coupon.type === 'percent' ? `${coupon.value}%` : `${formatCurrency(coupon.value)}`;
    const usos = coupon.usage_limit > 0 ? `${coupon.usage_count} / ${coupon.usage_limit}` : `${coupon.usage_count} / Ilimitado`;
    return `
    <tr data-id="${coupon.id}" class="table-row">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${coupon.code}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${coupon.type === 'percent' ? 'Percentagem' : 'Valor Fixo'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${valor}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${usos}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="editCupon(${coupon.id})" class="text-amber-600">Editar</button>
            <button onclick="deleteCupon(${coupon.id})" class="text-red-600 ml-2">Apagar</button>
        </td>
    </tr>`;
}

async function loadCuponsPage() {
    contentArea.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Cupões de Desconto</h3>
            <button onclick="openCuponModal()" class="btn btn-primary">+ Criar Cupão</button>
        </div>
        <div class="overflow-x-auto table-container">
            <table class="min-w-full divide-y dark:divide-gray-600">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Código</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Tipo</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Valor</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Usos</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ações</th>
                    </tr>
                </thead>
                <tbody id="coupons-table-body" class="divide-y dark:divide-gray-600">
                    ${createLoader()}
                </tbody>
            </table>
        </div>
    </div>`;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    try {
        const coupons = await apiFetch('/api/dashboard/coupons');
        const tableBody = document.getElementById('coupons-table-body');
        if (coupons.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-gray-500">Nenhum cupão encontrado.</td></tr>`;
            return;
        }
        tableBody.innerHTML = coupons.map(createCuponRow).join('');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        document.getElementById('coupons-table-body').innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-500">Não foi possível carregar os cupões.</td></tr>`;
    }
}

function openCuponModal() {
    const form = document.getElementById('form-coupon');
    form.reset();
    form.dataset.id = '';
    document.getElementById('modal-coupon-title').textContent = 'Criar Novo Cupão';
    openModal('modal-add-coupon');
}

async function editCupon(id) {
    try {
        const coupon = await apiFetch(`/api/dashboard/coupons/${id}`);
        const form = document.getElementById('form-coupon');
        form.dataset.id = coupon.id;
        
        document.getElementById('modal-coupon-title').textContent = 'Editar Cupão';
        document.getElementById('coupon_code').value = coupon.code;
        document.getElementById('coupon_type').value = coupon.type;
        document.getElementById('coupon_value').value = coupon.value;
        document.getElementById('coupon_uses').value = coupon.usage_limit;
        
        openModal('modal-add-coupon');
    } catch (error) {
        showToast('Não foi possível carregar o cupão', 'error');
    }
}

async function handleSaveCupon(event) {
    event.preventDefault();
    const form = document.getElementById('form-coupon');
    const id = form.dataset.id;
    const button = form.querySelector('button[type="submit"]');
    
    const data = {
        code: document.getElementById('coupon_code').value,
        type: document.getElementById('coupon_type').value,
        value: parseFloat(document.getElementById('coupon_value').value),
        usage_limit: parseInt(document.getElementById('coupon_uses').value)
    };
    
    const url = id ? `/api/dashboard/coupons/${id}` : '/api/dashboard/coupons';
    const method = id ? 'PUT' : 'POST';
    
    button.disabled = true;
    button.textContent = 'A guardar...';
    
    try {
        await apiFetch(url, { method: method, body: data });
        showToast(`Cupão ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        closeModal('modal-add-coupon');
        await loadCuponsPage();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Guardar Cupão';
    }
}

async function deleteCupon(id) {
    if (!confirm('Tem a certeza que quer apagar este cupão?')) return;
    try {
        await apiFetch(`/api/dashboard/coupons/${id}`, { method: 'DELETE' });
        showToast('Cupão apagado com sucesso!', 'success');
        await loadCuponsPage();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function createCampaignRow(campaign) {
    const status = campaign.is_active ? 
        '<span class="badge badge-success">Ativa</span>' :
        '<span class="badge badge-warning">Pausada</span>';
    return `
    <tr data-id="${campaign.id}" class="table-row">
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${campaign.name}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${formatCurrency(campaign.budget)}</td>
        <td class="px-6 py-4 whitespace-nowrap">${status}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button onclick="deleteCampaign(${campaign.id})" class="text-red-600 ml-2">Terminar</button>
        </td>
    </tr>`;
}

async function loadImpulsionarPage() {
    contentArea.innerHTML = `
    <div class="space-y-6">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Créditos de Anúncio</h3>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Use créditos para impulsionar a sua loja e produtos.</p>
                    <div class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">0.00 <span class="text-base font-normal text-gray-500 dark:text-gray-400">MZN</span></div>
                </div>
                <button disabled class="mt-4 sm:mt-0 btn btn-success disabled:opacity-50">
                    <i data-lucide="plus" class="w-4 h-4 inline-block -mt-0.5 mr-1"></i>
                    Comprar Créditos (Breve)
                </button>
            </div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">As Suas Campanhas</h3>
                <button onclick="openCampaignModal()" class="btn btn-primary">
                     <i data-lucide="plus" class="w-4 h-4 inline-block -mt-0.5 mr-1"></i>
                    Criar Nova Campanha
                </button>
            </div>
            <div class="overflow-x-auto table-container">
                <table class="min-w-full divide-y dark:divide-gray-600">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Campanha</th>
                            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Orçamento</th>
                            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Estado</th>
                            <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="campaigns-table-body" class="divide-y dark:divide-gray-600">
                        ${createLoader()}
                    </tbody>
                </table>
            </div>
        </div>
    </div>`;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    try {
        const campaigns = await apiFetch('/api/dashboard/campaigns');
        const tableBody = document.getElementById('campaigns-table-body');
        if (campaigns.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhuma campanha criada.</td></tr>`;
            return;
        }
        tableBody.innerHTML = campaigns.map(createCampaignRow).join('');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        document.getElementById('campaigns-table-body').innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">Não foi possível carregar as campanhas.</td></tr>`;
    }
}

function openCampaignModal() {
    const form = document.getElementById('form-campaign');
    form.reset();
    form.dataset.id = '';
    document.getElementById('modal-campaign-title').textContent = 'Criar Nova Campanha';
    openModal('modal-add-campaign');
}

async function handleSaveCampaign(event) {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button[type="submit"]');
    
    const data = {
        name: document.getElementById('campaign_name').value,
        budget: parseFloat(document.getElementById('campaign_budget').value),
        target: document.getElementById('campaign_target').value
    };
    
    button.disabled = true;
    button.textContent = 'A guardar...';
    
    try {
        await apiFetch('/api/dashboard/campaigns', { method: 'POST', body: data });
        showToast('Campanha criada com sucesso!', 'success');
        closeModal('modal-add-campaign');
        await loadImpulsionarPage();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Iniciar Campanha';
    }
}

async function deleteCampaign(id) {
    if (!confirm('Tem a certeza que quer terminar esta campanha?')) return;
    try {
        await apiFetch(`/api/dashboard/campaigns/${id}`, { method: 'DELETE' });
        showToast('Campanha terminada!', 'success');
        await loadImpulsionarPage();
    } catch (error) {
        showToast(error.message, 'error');
    }
}