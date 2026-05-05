async function loadDominioPage() {
    contentArea.innerHTML = createLoader();

    try {
        const [domains, emails, shopDetails] = await Promise.all([
            apiFetch('/api/dashboard/domain/list'),
            apiFetch('/api/dashboard/email'),
            apiFetch('/api/dashboard/details')
        ]);

        const html = `
        <div class="space-y-8">
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Domínios Personalizados</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Conecte o seu próprio domínio (ex: minhaloja.com)</p>
                    </div>
                    <button onclick="promptAddDomain()" class="btn btn-primary">+ Adicionar Domínio</button>
                </div>
                
                <div class="overflow-x-auto rounded-lg border dark:border-gray-600">
                    <table class="min-w-full divide-y dark:divide-gray-600">
                        <thead class="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Domínio</th>
                                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Estado</th>
                                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y dark:divide-gray-600 bg-white dark:bg-gray-800">
                             <tr>
                                <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">${shopDetails.profile.slug}.ecomoz.com</td>
                                <td class="px-4 py-3"><span class="badge badge-success">Ativo (Padrão)</span></td>
                                <td class="px-4 py-3 text-sm text-gray-400">-</td>
                            </tr>
                            ${domains.map(d => `
                                <tr>
                                    <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${d.domain}</td>
                                    <td class="px-4 py-3">
                                        ${d.is_verified 
                                            ? '<span class="badge badge-success">Verificado</span>' 
                                            : '<span class="badge badge-warning">Pendente DNS</span>'}
                                    </td>
                                    <td class="px-4 py-3 text-sm">
                                        ${!d.is_verified ? `<button onclick="verifyDomain(${d.id})" class="text-blue-600 hover:underline">Verificar DNS</button>` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Emails Profissionais</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Crie emails como contacto@sua-loja.com (Requer domínio verificado)</p>
                    </div>
                    <button onclick="promptAddEmail()" class="btn btn-outline">Criar Email</button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${emails.emails && emails.emails.length > 0 ? emails.emails.map(e => `
                        <div class="p-4 border rounded-lg dark:border-gray-600 flex justify-between items-center">
                            <div>
                                <p class="font-bold text-gray-800 dark:text-white">${e.email_address}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400">Encaminha para: ${e.forward_to}</p>
                            </div>
                            <span class="badge badge-success">Ativo</span>
                        </div>
                    `).join('') : '<p class="text-gray-500 dark:text-gray-400 col-span-2 text-center py-4">Nenhum email profissional configurado.</p>'}
                </div>
            </div>
        </div>`;

        contentArea.innerHTML = html;

    } catch (error) {
        contentArea.innerHTML = `<p class="text-red-500">Erro ao carregar domínios.</p>`;
    }
}

// Funções Auxiliares de Domínio
async function promptAddDomain() {
    const domain = prompt("Insira o domínio que comprou (ex: minhaloja.co.mz):");
    if (!domain) return;

    try {
        const res = await apiFetch('/api/dashboard/domain/add', {
            method: 'POST',
            body: { domain: domain }
        });
        alert(`Domínio adicionado!\n\nConfigure este registo CNAME no seu provedor:\nHost: www\nValor: ${res.dns_instructions.value}`);
        loadDominioPage();
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function verifyDomain(id) {
    try {
        const res = await apiFetch(`/api/dashboard/domain/verify/${id}`, { method: 'POST' });
        if(res.status === 'success') {
            showToast('Domínio verificado com sucesso!', 'success');
            loadDominioPage();
        } else {
            showToast(res.message, 'error');
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function promptAddEmail() {
    const prefix = prompt("Insira o prefixo do email (ex: 'contacto' para contacto@seudominio.com):");
    if (!prefix) return;

    try {
        await apiFetch('/api/dashboard/email', {
            method: 'POST',
            body: { prefix: prefix }
        });
        showToast('Email criado com sucesso!', 'success');
        loadDominioPage();
    } catch (e) {
        showToast(e.message, 'error');
    }
}