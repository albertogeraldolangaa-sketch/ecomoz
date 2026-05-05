// ---- Funções do Modal Complexo ---
let complexProductState = {
    id: null,
    options: [],
    variants: []
};

let currentStep = 1;
const totalSteps = 3;

function setModalStep(modalId, step) {
    currentStep = step;
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    const btnVoltar = document.getElementById('modal-btn-voltar');
    const btnProximo = document.getElementById('modal-btn-proximo');
    const btnPublicar = document.getElementById('modal-btn-publicar');

    modal.querySelectorAll('.modal-step').forEach((el, index) => {
        el.classList.toggle('active', (index + 1) === step);
    });

    btnVoltar.classList.toggle('hidden', step === 1);
    btnProximo.classList.toggle('hidden', step === totalSteps);
    btnPublicar.classList.toggle('hidden', step !== totalSteps);
    
    // Atualizar título do passo
    document.getElementById('modal-step-title').textContent = step;
}

async function openComplexProductModal(productId = null) {
    const form = document.getElementById('modal-add-produto-complexo');
    document.getElementById('prod_nome_complexo').value = '';
    document.getElementById('prod_desc_complexo').value = '';
    
    complexProductState = { 
        id: productId, 
        options: [],
        variants: []
    };
    form.dataset.id = productId || '';

    if (productId) {
        try {
            const data = await apiFetch(`/api/dashboard/products/${productId}/complex-details`);
            document.getElementById('prod_nome_complexo').value = data.nome;
            document.getElementById('prod_desc_complexo').value = data.descricao;
            complexProductState.options = data.options.map(opt => ({
                name: opt.name,
                values: opt.values.map(v => v.value)
            }));
            
            document.getElementById('prod_payment_mode_complexo').value = data.payment_mode;
            document.getElementById('prod_deposit_value_complexo').value = data.deposit_value || '';
            document.getElementById('prod_deposit_container_complexo').classList.toggle('hidden', data.payment_mode !== 'deposito');
            
            // Preencher opções existentes
            renderComplexOptions();
            
            // Preencher tabela de variantes se existirem
            if (data.variants && data.variants.length > 0) {
                complexProductState.variants = data.variants;
                renderVariantsTable(data.variants);
            }
        } catch (error) {
            showToast('Erro ao carregar produto', 'error');
        }
    } else {
        // Novo produto - resetar tudo
        complexProductState.options = [];
        complexProductState.variants = [];
        document.getElementById('complex-options-list').innerHTML = '';
        document.getElementById('variants-table-body').innerHTML = '';
        document.getElementById('prod_payment_mode_complexo').value = 'integral';
        document.getElementById('prod_deposit_value_complexo').value = '';
        document.getElementById('prod_deposit_container_complexo').classList.add('hidden');
    }
    
    setModalStep('modal-add-produto-complexo', 1);
    openModal('modal-add-produto-complexo');
}

function addComplexOption() {
    const optionId = Date.now();
    complexProductState.options.push({
        id: optionId,
        name: '',
        values: ['']
    });
    renderComplexOptions();
}

function renderComplexOptions() {
    const container = document.getElementById('complex-options-list');
    container.innerHTML = complexProductState.options.map((option, optionIndex) => `
        <div class="border rounded-lg p-4 dark:border-gray-600" data-option-index="${optionIndex}">
            <div class="flex items-center justify-between mb-3">
                <input type="text" 
                       value="${option.name}" 
                       placeholder="Nome da opção (ex: Tamanho, Cor)"
                       class="form-input flex-1 mr-2"
                       onchange="updateOptionName(${optionIndex}, this.value)">
                <button type="button" onclick="removeComplexOption(${optionIndex})" class="text-red-600 hover:text-red-800">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="space-y-2">
                ${option.values.map((value, valueIndex) => `
                    <div class="flex items-center space-x-2">
                        <input type="text" 
                               value="${value}" 
                               placeholder="Valor (ex: P, M, G)"
                               class="form-input flex-1"
                               onchange="updateOptionValue(${optionIndex}, ${valueIndex}, this.value)">
                        ${valueIndex > 0 ? `
                            <button type="button" onclick="removeOptionValue(${optionIndex}, ${valueIndex})" class="text-red-600 hover:text-red-800">
                                <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
                <button type="button" onclick="addOptionValue(${optionIndex})" class="text-sm text-amber-600 hover:text-amber-700">
                    + Adicionar valor
                </button>
            </div>
        </div>
    `).join('');
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function updateOptionName(optionIndex, name) {
    complexProductState.options[optionIndex].name = name;
}

function updateOptionValue(optionIndex, valueIndex, value) {
    complexProductState.options[optionIndex].values[valueIndex] = value;
}

function addOptionValue(optionIndex) {
    complexProductState.options[optionIndex].values.push('');
    renderComplexOptions();
}

function removeOptionValue(optionIndex, valueIndex) {
    complexProductState.options[optionIndex].values.splice(valueIndex, 1);
    renderComplexOptions();
}

function removeComplexOption(optionIndex) {
    complexProductState.options.splice(optionIndex, 1);
    renderComplexOptions();
}

function generateVariants() {
    if (complexProductState.options.length === 0) {
        showToast('Adicione pelo menos uma opção primeiro', 'error');
        return;
    }

    // Validar que todas as opções têm nome e pelo menos um valor
    for (const option of complexProductState.options) {
        if (!option.name.trim()) {
            showToast('Todos os tipos de variação precisam de um nome', 'error');
            return;
        }
        if (option.values.length === 0 || option.values.some(v => !v.trim())) {
            showToast('Todos os valores das opções devem ser preenchidos', 'error');
            return;
        }
    }

    // Gerar combinações
    const valueArrays = complexProductState.options.map(opt => opt.values);
    const combinations = cartesianProduct(...valueArrays);
    
    // Criar variantes
    complexProductState.variants = combinations.map(combo => ({
        name: combo.join(' / '),
        preco: 0,
        stock: 99,
        sku: '',
        optionValues: combo
    }));

    renderVariantsTable(complexProductState.variants);
    showToast(`${complexProductState.variants.length} variantes geradas!`, 'success');
}

function cartesianProduct(...arrays) {
    return arrays.reduce((acc, curr) => 
        acc.flatMap(x => curr.map(y => [...x, y])), [[]]
    );
}

function renderVariantsTable(variants) {
    const tbody = document.getElementById('variants-table-body');
    tbody.innerHTML = variants.map((variant, index) => `
        <tr>
            <td class="px-4 py-2 text-sm text-gray-900 dark:text-white">${variant.name}</td>
            <td class="px-4 py-2">
                <input type="number" 
                       value="${variant.preco}" 
                       class="form-input w-24"
                       onchange="updateVariantPrice(${index}, this.value)"
                       step="0.01">
            </td>
            <td class="px-4 py-2">
                <input type="number" 
                       value="${variant.stock}" 
                       class="form-input w-20"
                       onchange="updateVariantStock(${index}, this.value)">
            </td>
            <td class="px-4 py-2">
                <input type="text" 
                       value="${variant.sku}" 
                       class="form-input w-32"
                       placeholder="SKU"
                       onchange="updateVariantSku(${index}, this.value)">
            </td>
        </tr>
    `).join('');
}

function updateVariantPrice(index, price) {
    complexProductState.variants[index].preco = parseFloat(price) || 0;
}

function updateVariantStock(index, stock) {
    complexProductState.variants[index].stock = parseInt(stock) || 0;
}

function updateVariantSku(index, sku) {
    complexProductState.variants[index].sku = sku;
}

function handleComplexModalFlow(direction) {
    const newStep = currentStep + direction;
    
    if (newStep === 2) {
        // Validar passo 1 antes de avançar
        const nome = document.getElementById('prod_nome_complexo').value;
        if (!nome.trim()) {
            showToast('O nome do produto é obrigatório', 'error');
            return;
        }
        
        // Gerar variantes se ainda não foram geradas
        if (complexProductState.variants.length === 0) {
            generateVariants();
        }
        
        // Atualizar preview
        document.getElementById('preview-product-name').textContent = nome;
        const precoBase = complexProductState.variants?.[0]?.preco || 0;
        document.getElementById('preview-product-price').textContent = `A partir de ${formatCurrency(precoBase)}`;
    }
    
    if (newStep >= 1 && newStep <= totalSteps) {
        setModalStep('modal-add-produto-complexo', newStep);
    }
}

async function publishComplexProduct() {
    const nome = document.getElementById('prod_nome_complexo').value;
    const descricao = document.getElementById('prod_desc_complexo').value;
    const paymentMode = document.getElementById('prod_payment_mode_complexo').value;
    const depositValue = document.getElementById('prod_deposit_value_complexo').value;

    if (!nome.trim()) {
        showToast('O nome do produto é obrigatório', 'error');
        return;
    }

    if (complexProductState.options.length === 0) {
        showToast('Adicione pelo menos uma opção de variação', 'error');
        return;
    }

    if (complexProductState.variants.length === 0) {
        showToast('Gere as variantes primeiro', 'error');
        return;
    }

    const button = document.getElementById('modal-btn-publicar');
    button.disabled = true;
    button.innerHTML = '<span class="loading-spinner"></span> A publicar...';

    try {
        const productData = {
            nome: nome,
            descricao: descricao,
            product_type: 'variavel',
            payment_mode: paymentMode,
            deposit_value: parseFloat(depositValue) || 0,
            options: complexProductState.options,
            variants: complexProductState.variants
        };

        let productId = complexProductState.id;
        
        if (productId) {
            // Atualizar produto existente
            await apiFetch(`/api/dashboard/products/${productId}`, {
                method: 'PUT',
                body: productData
            });
        } else {
            // Criar novo produto
            const response = await apiFetch('/api/dashboard/products', {
                method: 'POST',
                body: productData
            });
            productId = response.id;
        }

        showToast('Produto publicado com sucesso!', 'success');
        closeModal('modal-add-produto-complexo');
        await loadProdutosPage();

    } catch (error) {
        showToast(`Erro ao publicar produto: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Publicar Produto';
    }
}