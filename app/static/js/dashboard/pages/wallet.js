async function loadCarteiraPage() {
    contentArea.innerHTML = createLoader();

    try {
        // Carregar dados da API (Saldo, Histórico e Configurações da Loja)
        const [walletData, shopSettings] = await Promise.all([
            apiFetch('/api/dashboard/wallet/balance'),
            apiFetch('/api/dashboard/details') // Para configurações de pagamento
        ]);

        shopData = shopSettings; // Atualizar estado global

        const html = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1 space-y-6">
                <div class="bg-white p-6 rounded-lg shadow-sm border bg-gradient-to-br from-blue-600 to-blue-800 text-white">
                    <h4 class="text-sm font-medium text-blue-100">Saldo Disponível</h4>
                    <p class="text-3xl font-bold mt-2">${formatCurrency(walletData.balance)}</p>
                    <p class="text-xs text-blue-200 mt-1">Ganhos livres de comissões</p>
                    
                    <button onclick="handleWithdraw()" ${walletData.balance < 100 ? 'disabled' : ''} 
                            class="mt-6 w-full py-2 px-4 bg-white text-blue-700 font-semibold rounded-lg shadow hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        Solicitar Levantamento
                    </button>
                    <p class="text-xs text-center text-blue-200 mt-2">Mínimo: 100,00 MZN</p>
                </div>

                <form id="form-payment-settings" class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Métodos de Recebimento</h3>
                    <div class="space-y-4">
                        <div class="form-group">
                            <label class="form-label">Onde quer receber?</label>
                            <select id="payout_method" class="form-input">
                                <option value="mpesa" ${shopData.payment.payout_method === 'mpesa' ? 'selected' : ''}>M-Pesa</option>
                                <option value="emola" ${shopData.payment.payout_method === 'emola' ? 'selected' : ''}>E-Mola</option>
                                <option value="bank" ${shopData.payment.payout_method === 'bank' ? 'selected' : ''}>Transferência Bancária</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Número / Detalhes</label>
                            <input type="text" id="payout_number" class="form-input" value="${shopData.payment.payout_number || ''}" placeholder="84xxxxxxx ou NIB">
                        </div>
                        <div class="pt-2">
                            <button type="submit" class="btn btn-outline w-full">Guardar Dados de Recebimento</button>
                        </div>
                    </div>
                </form>
            </div>

            <div class="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Histórico de Transações</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y dark:divide-gray-600">
                        <thead class="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Data</th>
                                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Descrição</th>
                                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Tipo</th>
                                <th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Valor</th>
                                <th class="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Estado</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y dark:divide-gray-600 text-sm">
                            ${walletData.transactions.length > 0 ? walletData.transactions.map(t => `
                                <tr>
                                    <td class="px-4 py-3 text-gray-500">${t.date}</td>
                                    <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">${t.description}</td>
                                    <td class="px-4 py-3">
                                        <span class="px-2 py-1 rounded-full text-xs ${t.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                            ${t.type === 'credit' ? 'Entrada' : 'Saída'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-right font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}">
                                        ${t.type === 'credit' ? '+' : '-'} ${formatCurrency(t.amount)}
                                    </td>
                                    <td class="px-4 py-3 text-center">
                                        <span class="text-xs text-gray-500">${t.status}</span>
                                    </td>
                                </tr>
                            `).join('') : `<tr><td colspan="5" class="text-center p-4 text-gray-500">Sem transações recentes.</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;

        contentArea.innerHTML = html;
        
        // Ligar o evento do formulário de configurações de pagamento
        document.getElementById('form-payment-settings').addEventListener('submit', async (e) => {
            e.preventDefault();
            shopData.payment.payout_method = document.getElementById('payout_method').value;
            shopData.payment.payout_number = document.getElementById('payout_number').value;
            await handleSaveSettings(e); // Reutiliza a função existente
        });

    } catch (error) {
        contentArea.innerHTML = `<p class="text-red-500">Erro ao carregar carteira: ${error.message}</p>`;
    }
}

// Função para processar levantamento
async function handleWithdraw() {
    const amount = prompt("Quanto deseja levantar? (MZN)");
    if (!amount) return;
    
    try {
        await apiFetch('/api/dashboard/wallet/withdraw', {
            method: 'POST',
            body: { amount: parseFloat(amount) }
        });
        showToast('Pedido de levantamento enviado!', 'success');
        loadCarteiraPage(); // Recarregar para atualizar saldo
    } catch (error) {
        showToast(error.message, 'error');
    }
}