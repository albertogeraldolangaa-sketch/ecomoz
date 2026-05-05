async function loadMetricasPage() {
    contentArea.innerHTML = createLoader();
    try {
        const data = await apiFetch('/api/dashboard/metrics');
        
        const html = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${createMetricCard('dollar-sign', 'Ganhos (Confirmados)', formatCurrency(data.total_revenue), 'green')}
            ${createMetricCard('shopping-bag', 'Total Encomendas', data.total_bookings, 'blue')}
            ${createMetricCard('clock', 'Pendentes', data.pending_count, 'orange')}
            ${createMetricCard('users', 'Visitantes na Página', data.visitor_count, 'amber')}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div class="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Desempenho Semanal</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Gráfico de desempenho (a implementar).</p>
                <div class="chart-container">
                    <svg viewBox="0 0 400 150" class="w-full h-auto weekly-chart">
                        <defs>
                            <linearGradient id="grad-light" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:#00A2FF;stop-opacity:0.4" />
                                <stop offset="100%" style="stop-color:#00A2FF;stop-opacity:0" />
                            </linearGradient>
                            <linearGradient id="grad-dark" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:0.4" />
                                <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:0" />
                            </linearGradient>
                        </defs>
                        <style>
                            .chart-grid-line { stroke: rgba(0, 0, 0, 0.1); } .chart-fill { fill: url(#grad-light); } .chart-stroke { stroke: #0077FF; } .chart-point { fill: #0077FF; }
                            html.dark .chart-grid-line { stroke: rgba(255, 255, 255, 0.2); } html.dark .chart-fill { fill: url(#grad-dark); } html.dark .chart-stroke { stroke: #FFFFFF; } html.dark .chart-point { fill: #FFFFFF; }
                        </style>
                        <line class="chart-grid-line" x1="0" y1="30" x2="400" y2="30" stroke-width="1" stroke-dasharray="2,2"/>
                        <line class="chart-grid-line" x1="0" y1="70" x2="400" y2="70" stroke-width="1" stroke-dasharray="2,2"/>
                        <line class="chart-grid-line" x1="0" y1="110" x2="400" y2="110" stroke-width="1" stroke-dasharray="2,2"/>
                        <path class="chart-fill" d="M 0 100 Q 50 80, 100 90 T 200 60 T 300 70 T 400 50" />
                        <path class="chart-stroke" d="M 0 100 Q 50 80, 100 90 T 200 60 T 300 70 T 400 50" fill="none" stroke-width="2.5" stroke-linecap="round"/>
                        <circle class="chart-point" cx="0" cy="100" r="3" /> <circle class="chart-point" cx="100" cy="90" r="3" /> <circle class="chart-point" cx="200" cy="60" r="3" /> <circle class="chart-point" cx="300" cy="70" r="3" /> <circle class="chart-point" cx="400" cy="50" r="3" />
                    </svg>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Últimas Atividades</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">Feed de atividades (a implementar).</p>
            </div>
        </div>`;
        contentArea.innerHTML = html;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } catch (error) {
        contentArea.innerHTML = `<p class="text-red-500">Não foi possível carregar as métricas.</p>`;
    }
}