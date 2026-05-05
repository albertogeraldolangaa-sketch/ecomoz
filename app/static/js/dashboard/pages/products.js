// 

function createProductRow(product) {
    return `
    <tr data-id="${product.id}" class="table-row">
        <td class="px-6 py-4 whitespace-nowrap">
            <div class="flex items-center">
                <img src="${product.image_url || 'https://placehold.co/40x40/F3F4F6/9CA3AF?text=P'}" alt="Produto" class="w-10 h-10 rounded-md mr-3 object-cover">
                <span class="text-sm font-medium text-gray-900 dark:text-white">${product.nome}</span>
            </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${product.product_type === 'simples' ? formatCurrency(product.preco) : 'A partir de...'}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">${product.product_type}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            ${product.product_type === 'simples' ? `
                <button onclick="editProduct(${product.id})" class="text-amber-600">Editar</button>
            ` : `
                <button onclick="openComplexProductModal(${product.id})" class="text-amber-600">Gerir Variações</button>
            `}
            <button onclick="deleteProduct(${product.id})" class="text-red-600 ml-2">Apagar</button>
        </td>
    </tr>`;
}

async function loadProdutosPage() {
     contentArea.innerHTML = `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Catálogo de Produtos</h3>
            <div class="flex space-x-2">
                <button onclick="openProductModal()" class="btn btn-outline">Adicionar Simples</button>
                <button onclick="openComplexProductModal(null)" class="btn btn-primary">+ Adicionar com Variações</button>
            </div>
        </div>
        <div class="overflow-x-auto table-container">
            <table class="min-w-full divide-y dark:divide-gray-600">
                <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Produto</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Preço (MZN)</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Tipo</th>
                        <th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ações</th>
                    </tr>
                </thead>
                <tbody id="produtos-table-body" class="divide-y dark:divide-gray-600">
                    ${createLoader()}
                </tbody>
            </table>
        </div>
    </div>`;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    try {
        const products = await apiFetch('/api/dashboard/products');
        const tableBody = document.getElementById('produtos-table-body');
        if (products.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-gray-500">Nenhum produto encontrado.</td></tr>`;
            return;
        }
        tableBody.innerHTML = products.map(createProductRow).join('');
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        document.getElementById('produtos-table-body').innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">Não foi possível carregar os produtos.</td></tr>`;
    }
}

function openProductModal() {
    const form = document.getElementById('form-produto-simples');
    form.reset();
    form.dataset.id = '';
    document.getElementById('modal-produto-simples-title').textContent = 'Adicionar Produto Simples';
    document.getElementById('prod_deposit_container_simples').classList.add('hidden');
    document.getElementById('prod_image_preview_simples').classList.add('hidden');
    document.getElementById('prod_image_url_simples').value = '';
    openModal('modal-add-produto-simples');
}

async function editProduct(id) {
    try {
        const product = await apiFetch(`/api/dashboard/products/${id}`);
        const form = document.getElementById('form-produto-simples');
        form.dataset.id = product.id;
        
        document.getElementById('modal-produto-simples-title').textContent = 'Editar Produto Simples';
        document.getElementById('prod_nome_simples').value = product.nome;
        document.getElementById('prod_desc_simples').value = product.descricao;
        document.getElementById('prod_preco_simples').value = product.preco;
        document.getElementById('prod_payment_mode_simples').value = product.payment_mode;
        document.getElementById('prod_deposit_value_simples').value = product.deposit_value;
        document.getElementById('prod_image_url_simples').value = product.image_url;
        
        const preview = document.getElementById('prod_image_preview_simples');
        if (product.image_url) {
            preview.src = product.image_url;
            preview.classList.remove('hidden');
        } else {
            preview.classList.add('hidden');
        }
        
        document.getElementById('prod_deposit_container_simples').classList.toggle('hidden', product.payment_mode !== 'deposito');
        
        openModal('modal-add-produto-simples');
    } catch (error) {
        showToast('Não foi possível carregar o produto', 'error');
    }
}

async function handleSaveProduct(event) {
    event.preventDefault();
    const form = document.getElementById('form-produto-simples');
    const id = form.dataset.id;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'A guardar...';

    try {
        let imageUrl = document.getElementById('prod_image_url_simples').value;
        const fileInput = document.getElementById('prod_image_simples');
        
        if (fileInput.files && fileInput.files[0]) {
            imageUrl = await handleImageUpload(fileInput.files[0], 'products');
        }

        const data = {
            nome: document.getElementById('prod_nome_simples').value,
            descricao: document.getElementById('prod_desc_simples').value,
            preco: parseFloat(document.getElementById('prod_preco_simples').value),
            payment_mode: document.getElementById('prod_payment_mode_simples').value,
            deposit_value: parseFloat(document.getElementById('prod_deposit_value_simples').value) || 0,
            image_url: imageUrl
        };
        
        const url = id ? `/api/dashboard/products/${id}` : '/api/dashboard/products';
        const method = id ? 'PUT' : 'POST';

        await apiFetch(url, { method: method, body: data });
        showToast(`Produto ${id ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        closeModal('modal-add-produto-simples');
        await loadProdutosPage();

    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Guardar Produto';
    }
}

async function deleteProduct(id) {
    if (!confirm('Tem a certeza que quer apagar este produto?')) return;
    try {
        await apiFetch(`/api/dashboard/products/${id}`, { method: 'DELETE' });
        showToast('Produto apagado com sucesso!', 'success');
        await loadProdutosPage();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// --- Inicialização de Eventos (Correção) ---
document.addEventListener('DOMContentLoaded', () => {
    // Ligar o formulário de produto simples
    const simpleForm = document.getElementById('form-produto-simples');
    if (simpleForm) {
        simpleForm.addEventListener('submit', handleSaveProduct);
        // Inicializar preview da imagem (função definida em utils.js)
        if (typeof setupImagePreview === 'function') {
            setupImagePreview('prod_image_simples', 'prod_image_preview_simples');
        }
    }
});