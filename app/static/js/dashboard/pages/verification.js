async function loadVerificacaoPage() {
    contentArea.innerHTML = createLoader();
    
    try {
        const [plansData, docsData] = await Promise.all([
            apiFetch('/api/dashboard/plans'),
            apiFetch('/api/dashboard/verification/documents')
        ]);
        
        const currentPlan = plansData.plans.find(p => p.is_current) || plansData.plans[0];
        
        let html = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="space-y-6">
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Seu Plano Atual</h3>
                            <p class="text-sm text-gray-500">Gerencie sua subscrição e limites.</p>
                        </div>
                        <span class="badge badge-info text-sm px-3 py-1">${currentPlan.display_name}</span>
                    </div>
                    
                    <div class="my-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div class="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">${formatCurrency(currentPlan.price)}<span class="text-sm font-normal text-gray-500">/mês</span></div>
                        <p class="text-sm text-blue-800 dark:text-blue-200">Próxima renovação automática.</p>
                    </div>

                    <h4 class="font-semibold mb-3 text-gray-900 dark:text-white">Funcionalidades Incluídas:</h4>
                    <ul class="space-y-2 mb-6">
                        ${currentPlan.features.map(f => `<li class="flex items-center text-sm text-gray-600 dark:text-gray-300"><i data-lucide="check" class="w-4 h-4 text-green-500 mr-2"></i> ${f}</li>`).join('')}
                    </ul>
                    
                    <button onclick="document.getElementById('plans-comparison').scrollIntoView({behavior: 'smooth'})" class="btn btn-outline w-full">
                        Ver Outros Planos
                    </button>
                </div>
            </div>

            <div class="space-y-6">
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Verificação de Loja</h3>
                    <p class="text-sm text-gray-500 mb-4">Envie documentos para ganhar o selo de "Verificado" e aumentar a confiança dos clientes.</p>
                    
                    <div class="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <i data-lucide="alert-triangle" class="h-5 w-5 text-amber-400"></i>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm text-amber-700">
                                    Estado Atual: <strong class="font-semibold">${shopData.profile.verification_status || 'Não Verificado'}</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                    <form id="verification-upload-form" class="space-y-4">
                        <div>
                            <label class="form-label">Tipo de Documento</label>
                            <select id="doc_type" class="form-input">
                                <option value="alvara">Alvará Comercial</option>
                                <option value="bi">Bilhete de Identidade (Proprietário)</option>
                                <option value="nuit">NUIT da Empresa</option>
                            </select>
                        </div>
                        <div>
                            <label class="form-label">Ficheiro (PDF ou Imagem)</label>
                            <input type="file" id="doc_file" class="form-input" accept=".pdf,image/*" required>
                        </div>
                        <button type="submit" class="btn btn-primary w-full">Enviar Documento</button>
                    </form>
                    
                    <div class="mt-6">
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Documentos Enviados</h4>
                        <div class="space-y-2 max-h-40 overflow-y-auto">
                            ${docsData.length > 0 ? docsData.map(d => `
                                <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                                    <span class="text-gray-700 dark:text-gray-300">${d.document_type}</span>
                                    <span class="badge ${d.status === 'Aprovado' ? 'badge-success' : (d.status === 'Rejeitado' ? 'badge-error' : 'badge-warning')}">${d.status}</span>
                                </div>
                            `).join('') : '<p class="text-xs text-gray-500 italic">Nenhum documento enviado.</p>'}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div id="plans-comparison" class="mt-12">
            <h3 class="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">Escolha o plano ideal para o seu crescimento</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${plansData.plans.map(plan => `
                    <div class="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg border ${plan.is_current ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900' : 'border-gray-200 dark:border-gray-700'} p-6 flex flex-col">
                        ${plan.is_current ? '<div class="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">ATUAL</div>' : ''}
                        <h4 class="text-xl font-bold text-gray-900 dark:text-white">${plan.display_name}</h4>
                        <div class="mt-4 mb-6">
                            <span class="text-4xl font-extrabold text-gray-900 dark:text-white">${formatCurrency(plan.price)}</span>
                            <span class="text-base font-medium text-gray-500">/mês</span>
                        </div>
                        <ul class="space-y-4 mb-8 flex-1">
                            ${plan.features.map(f => `
                                <li class="flex items-start">
                                    <i data-lucide="check" class="flex-shrink-0 w-5 h-5 text-green-500"></i>
                                    <span class="ml-3 text-sm text-gray-600 dark:text-gray-300">${f}</span>
                                </li>
                            `).join('')}
                        </ul>
                        <button onclick="subscribePlan(${plan.id})" 
                                class="w-full btn ${plan.is_current ? 'btn-outline cursor-default opacity-50' : 'btn-primary'}" 
                                ${plan.is_current ? 'disabled' : ''}>
                            ${plan.is_current ? 'Plano Atual' : 'Selecionar Plano'}
                        </button>
                    </div>
                `).join('')}
            </div>
        </div>
        `;
        
        contentArea.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Listener do form de upload
        document.getElementById('verification-upload-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const fileInput = document.getElementById('doc_file');
            const docType = document.getElementById('doc_type').value;
            
            if (!fileInput.files[0]) return;
            
            btn.disabled = true;
            btn.textContent = 'A enviar...';
            
            try {
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                formData.append('document_type', docType);
                
                await apiFetch('/api/dashboard/verification/upload', {
                    method: 'POST',
                    body: formData
                });
                
                showToast('Documento enviado com sucesso!', 'success');
                loadVerificacaoPage(); // Recarrega para mostrar na lista
                
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Enviar Documento';
            }
        });

    } catch (error) {
        contentArea.innerHTML = `<p class="text-red-500">Erro ao carregar planos e verificação.</p>`;
    }
}

async function subscribePlan(planId) {
    if (!confirm('Confirma a alteração do plano? O valor será debitado da sua carteira ou cobrado na próxima fatura.')) return;
    
    try {
        await apiFetch('/api/dashboard/plans/subscribe', {
            method: 'POST',
            body: { plan_id: planId }
        });
        showToast('Plano atualizado com sucesso!', 'success');
        loadVerificacaoPage();
    } catch (e) {
        showToast(e.message, 'error');
    }
}