async function loadPersonalizarPage() {
    contentArea.innerHTML = createLoader();

    // 1. Buscar dados frescos e categorias
    try {
        const [data, catsRes] = await Promise.all([
            apiFetch('/api/dashboard/details'),
            fetch('/api/global/categories').then(r => r.json()).catch(() => [])
        ]);
        shopData = data;
        globalCategories = catsRes;
    } catch (e) {
        console.error(e);
    }

    // 2. Construir HTML
    const html = `
    <form id="form-settings">
        <div class="space-y-6">
            
            <div class="flex justify-end">
                <a href="/loja/${shopData.profile.slug}" target="_blank" class="btn btn-outline text-blue-600 border-blue-600 hover:bg-blue-50 flex items-center">
                    <i data-lucide="external-link" class="w-4 h-4 mr-2"></i> Ver Minha Loja Online
                </a>
            </div>

            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Identidade Visual</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label class="form-label">Logotipo</label>
                        <div class="flex items-center space-x-4 mt-2">
                            <img id="profile_image_preview" 
                                 src="${shopData.profile.profile_image_url || `https://placehold.co/80x80/F3F4F6/9CA3AF?text=${(shopData.profile.nome_loja || 'L').charAt(0)}`}" 
                                 class="w-20 h-20 rounded-lg object-cover border border-gray-200 dark:border-gray-600">
                            <div class="flex-1">
                                <input type="file" id="profile_image_input" class="form-input text-sm" accept="image/*">
                                <input type="hidden" id="profile_image_url" value="${shopData.profile.profile_image_url || ''}">
                                <p class="text-xs text-gray-500 mt-1">Recomendado: Quadrado (500x500px)</p>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label class="form-label">Banner de Capa</label>
                        <div class="flex flex-col space-y-2 mt-2">
                            <img id="profile_banner_preview" 
                                 src="${shopData.profile.profile_banner_url || 'https://placehold.co/300x100/F3F4F6/9CA3AF?text=Sem+Banner'}" 
                                 class="w-full h-24 rounded-lg object-cover border border-gray-200 dark:border-gray-600">
                            <input type="file" id="profile_banner_input" class="form-input text-sm" accept="image/*">
                            <input type="hidden" id="profile_banner_url" value="${shopData.profile.profile_banner_url || ''}">
                            <p class="text-xs text-gray-500">Recomendado: Retangular (1200x400px)</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informações da Loja</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-group">
                        <label class="form-label">Nome da Loja</label>
                        <input type="text" id="shop_name" class="form-input" value="${shopData.profile.nome_loja || ''}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Categoria</label>
                        <select id="shop_category_select" class="form-input">
                            <option value="">Selecionar Categoria...</option>
                            ${globalCategories.map(c => `<option value="${c.id}" ${shopData.profile.shop_category_id === c.id ? 'selected' : ''}>${c.icon || ''} ${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">URL (Slug)</label>
                        <div class="flex">
                            <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 text-sm">.../loja/</span>
                            <input type="text" id="shop_slug" class="form-input rounded-l-none" value="${shopData.profile.slug || ''}" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Telefone Público</label>
                        <input type="tel" id="shop_phone" class="form-input" value="${shopData.profile.telefone || ''}">
                    </div>
                    <div class="md:col-span-2 form-group">
                        <label class="form-label">Descrição</label>
                        <textarea id="shop_desc" rows="2" class="form-input">${shopData.profile.descricao || ''}</textarea>
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Regras de Venda & Taxas</h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="form-group">
                        <label class="form-label">Taxa de Entrega (MZN)</label>
                        <input type="number" id="shop_delivery_fee" class="form-input" value="${shopData.profile.delivery_fee || 0}" min="0" step="0.01">
                        <p class="text-xs text-gray-500 mt-1">Fixo por encomenda.</p>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Taxa de Serviço (MZN)</label>
                        <input type="number" id="shop_service_fee" class="form-input" value="${shopData.profile.service_fee || 0}" min="0" step="0.01">
                        <p class="text-xs text-gray-500 mt-1">Adicional administrativo.</p>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Pedido Mínimo (MZN)</label>
                        <input type="number" id="shop_min_order" class="form-input" value="${shopData.profile.min_order_value || 0}" min="0" step="1">
                        <p class="text-xs text-gray-500 mt-1">Mínimo para checkout.</p>
                    </div>
                </div>
                <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div class="flex items-center justify-between p-3 border rounded-lg dark:border-gray-600">
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Aceita Delivery?</span>
                        <button type="button" role="switch" aria-checked="${shopData.customization.allow_delivery}" 
                                onclick="toggleSwitch(this, null); document.getElementById('allow_delivery_val').value = this.getAttribute('aria-checked');"
                                class="${shopData.customization.allow_delivery ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none">
                            <span aria-hidden="true" class="${shopData.customization.allow_delivery ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                        </button>
                        <input type="hidden" id="allow_delivery_val" value="${shopData.customization.allow_delivery}">
                    </div>
                     <div class="flex items-center justify-between p-3 border rounded-lg dark:border-gray-600">
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Aceita Takeaway?</span>
                        <button type="button" role="switch" aria-checked="${shopData.customization.allow_takeaway}" 
                                onclick="toggleSwitch(this, null); document.getElementById('allow_takeaway_val').value = this.getAttribute('aria-checked');"
                                class="${shopData.customization.allow_takeaway ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none">
                            <span aria-hidden="true" class="${shopData.customization.allow_takeaway ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"></span>
                        </button>
                        <input type="hidden" id="allow_takeaway_val" value="${shopData.customization.allow_takeaway}">
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Aparência</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="form-label">Cor Principal</label>
                        <input type="color" id="theme_color" value="${shopData.customization.theme_color || '#3b82f6'}" class="w-full h-10 rounded cursor-pointer">
                    </div>
                    <div>
                        <label class="form-label">Estilo de Listagem</label>
                        <div class="flex space-x-4 mt-1">
                            <label class="flex items-center cursor-pointer">
                                <input type="radio" name="product_layout_style" value="lista" ${shopData.customization.product_layout_style === 'lista' ? 'checked' : ''} class="mr-2">
                                <span class="text-sm">Lista</span>
                            </label>
                            <label class="flex items-center cursor-pointer">
                                <input type="radio" name="product_layout_style" value="grid" ${shopData.customization.product_layout_style === 'grid' ? 'checked' : ''} class="mr-2">
                                <span class="text-sm">Grelha (Cards)</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

             <div class="flex justify-between items-center pt-4">
                 <button type="button" onclick="openChangePasswordModal()" class="text-sm text-gray-500 hover:text-gray-700 underline">
                    Alterar Palavra-passe
                </button>
                <button type="submit" class="btn btn-primary px-8">Guardar Tudo</button>
            </div>
        </div>
    </form>
    `;

    contentArea.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Setup de Uploads (Imagem e Banner)
    setupImagePreview('profile_image_input', 'profile_image_preview');
    setupImagePreview('profile_banner_input', 'profile_banner_preview');

    // Override do Save para incluir os novos campos
    document.getElementById('form-settings').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'A guardar...';

        try {
            // Upload Imagens se mudaram
            let imgUrl = document.getElementById('profile_image_url').value;
            const imgInput = document.getElementById('profile_image_input');
            if(imgInput.files[0]) imgUrl = await handleImageUpload(imgInput.files[0], 'profile');

            let bannerUrl = document.getElementById('profile_banner_url').value;
            const bannerInput = document.getElementById('profile_banner_input');
            if(bannerInput.files[0]) bannerUrl = await handleImageUpload(bannerInput.files[0], 'banner');

            // Construir Objeto de Atualização
            shopData.profile.nome_loja = document.getElementById('shop_name').value;
            shopData.profile.slug = document.getElementById('shop_slug').value;
            shopData.profile.descricao = document.getElementById('shop_desc').value;
            shopData.profile.telefone = document.getElementById('shop_phone').value;
            shopData.profile.profile_image_url = imgUrl;
            shopData.profile.profile_banner_url = bannerUrl;
            shopData.profile.shop_category_id = parseInt(document.getElementById('shop_category_select').value) || null;
            
            // Novos Campos Financeiros
            shopData.profile.delivery_fee = parseFloat(document.getElementById('shop_delivery_fee').value) || 0;
            shopData.profile.service_fee = parseFloat(document.getElementById('shop_service_fee').value) || 0;
            shopData.profile.min_order_value = parseFloat(document.getElementById('shop_min_order').value) || 0;

            shopData.customization.theme_color = document.getElementById('theme_color').value;
            shopData.customization.product_layout_style = document.querySelector('input[name="product_layout_style"]:checked').value;
            shopData.customization.allow_delivery = document.getElementById('allow_delivery_val').value === 'true';
            shopData.customization.allow_takeaway = document.getElementById('allow_takeaway_val').value === 'true';

            await apiFetch('/api/dashboard/update', { method: 'POST', body: shopData });
            
            showToast('Definições atualizadas com sucesso!', 'success');
            
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Guardar Tudo';
        }
    });
}

async function loadHorarioPage() {
    contentArea.innerHTML = createLoader();
    
    // Se shopData não estiver carregado, buscar detalhes
    if (!shopData.schedules) {
        try {
            shopData = await apiFetch('/api/dashboard/details');
        } catch(e) {
            contentArea.innerHTML = '<p class="text-red-500">Erro ao carregar horários.</p>';
            return;
        }
    }

    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    let html = `
    <form id="form-horario" onsubmit="handleSaveSettings(event)">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 max-w-4xl mx-auto">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Horário de Funcionamento</h3>
                <button type="submit" class="btn btn-primary">Guardar Horário</button>
            </div>
            
            <div id="schedule-container" class="space-y-4">
    `;

    days.forEach((day, index) => {
        // Encontrar dados do dia ou usar default
        const dayData = shopData.schedules.find(s => s.dia_semana === index) || { aberto: index > 0 && index < 6, inicio: '09:00', fim: '18:00' };
        
        html += `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
            <div class="flex items-center mb-2 sm:mb-0 w-32">
                <div class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" id="schedule_open_${index}" class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer" ${dayData.aberto ? 'checked' : ''} onclick="toggleScheduleInputs(${index})"/>
                    <label for="schedule_open_${index}" class="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer ${dayData.aberto ? 'bg-blue-600' : ''}"></label>
                </div>
                <span class="font-medium text-gray-900 dark:text-white">${day}</span>
            </div>
            
            <div id="schedule_inputs_${index}" class="flex items-center space-x-2 ${!dayData.aberto ? 'opacity-50 pointer-events-none' : ''}">
                <input type="time" id="schedule_start_${index}" value="${dayData.inicio || '09:00'}" class="form-input w-32">
                <span class="text-gray-500">até</span>
                <input type="time" id="schedule_end_${index}" value="${dayData.fim || '18:00'}" class="form-input w-32">
            </div>
        </div>
        `;
    });

    html += `
            </div>
        </div>
        <style>
            .toggle-checkbox:checked { right: 0; border-color: #2563EB; }
            .toggle-checkbox:checked + .toggle-label { background-color: #2563EB; }
            .toggle-checkbox { right: 0; top: 0; transition: all 0.3s; } 
            .toggle-label { width: 2.5rem; }
        </style>
    </form>`;

    contentArea.innerHTML = html;
}

window.toggleScheduleInputs = function(index) {
    const checkbox = document.getElementById(`schedule_open_${index}`);
    const inputs = document.getElementById(`schedule_inputs_${index}`);
    const label = checkbox.nextElementSibling;
    
    if (checkbox.checked) {
        inputs.classList.remove('opacity-50', 'pointer-events-none');
        label.classList.add('bg-blue-600');
    } else {
        inputs.classList.add('opacity-50', 'pointer-events-none');
        label.classList.remove('bg-blue-600');
    }
};