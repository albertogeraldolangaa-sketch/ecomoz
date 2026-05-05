function loadReportsPage() {
    const html = `
    <div class="space-y-6">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Centro de Relatórios</h2>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
                Exporte os dados da sua loja para analisar em Excel, Google Sheets ou softwares de contabilidade.
            </p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="border dark:border-gray-600 rounded-lg p-5 flex items-start space-x-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
                        <i data-lucide="file-spreadsheet" class="w-6 h-6"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900 dark:text-white">Vendas & Encomendas</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                            Lista detalhada de todas as transações, incluindo valores, estado de pagamento e dados do cliente.
                        </p>
                        <button onclick="exportData('orders')" class="btn btn-outline w-full sm:w-auto flex items-center justify-center">
                            <i data-lucide="download" class="w-4 h-4 mr-2"></i> Descarregar CSV
                        </button>
                    </div>
                </div>

                <div class="border dark:border-gray-600 rounded-lg p-5 flex items-start space-x-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg text-purple-600 dark:text-purple-300">
                        <i data-lucide="calendar-check" class="w-6 h-6"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900 dark:text-white">Marcações & Serviços</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                            Histórico de agendamentos, serviços realizados e tempos de duração.
                        </p>
                        <button onclick="exportData('bookings')" class="btn btn-outline w-full sm:w-auto flex items-center justify-center">
                            <i data-lucide="download" class="w-4 h-4 mr-2"></i> Descarregar CSV
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    contentArea.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function exportData(type) {
    try {
        const response = await fetch(`/api/dashboard/export/${type}`);
        if (!response.ok) throw new Error('Erro ao exportar dados');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || `export-${type}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Exportação concluída com sucesso!', 'success');
    } catch (error) {
        showToast('Erro ao exportar dados', 'error');
    }
}