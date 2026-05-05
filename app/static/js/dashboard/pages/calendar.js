async function loadCalendarPage() {
    contentArea.innerHTML = createLoader();

    try {
        // 1. Buscar marcações
        const [pending, confirmed] = await Promise.all([
            apiFetch('/api/dashboard/bookings?status=Pendente'),
            apiFetch('/api/dashboard/bookings?status=Confirmado')
        ]);

        // 2. Juntar e ordenar por data
        const allBookings = [...pending, ...confirmed].sort((a, b) => 
            new Date(a.data_hora) - new Date(b.data_hora)
        );

        // 3. Agrupar por dia (YYYY-MM-DD)
        const grouped = allBookings.reduce((acc, booking) => {
            const date = booking.data_hora.split('T')[0];
            if (!acc[date]) acc[date] = [];
            acc[date].push(booking);
            return acc;
        }, {});

        const sortedDates = Object.keys(grouped).sort();

        let html = `
        <div class="space-y-6">
            <div class="flex items-center justify-between">
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Agenda de Marcações</h2>
                <div class="flex space-x-2 text-sm">
                    <span class="flex items-center"><span class="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded-full mr-1"></span> Pendente</span>
                    <span class="flex items-center"><span class="w-3 h-3 bg-green-100 border border-green-300 rounded-full mr-1"></span> Confirmado</span>
                </div>
            </div>
        `;

        if (sortedDates.length === 0) {
            html += `
                <div class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                    <i data-lucide="calendar-off" class="w-12 h-12 mx-auto text-gray-400 mb-3"></i>
                    <p class="text-gray-500">Não existem marcações agendadas para os próximos tempos.</p>
                </div>
            `;
        } else {
            html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">';
            
            sortedDates.forEach(date => {
                const dateObj = new Date(date);
                const dayName = dateObj.toLocaleDateString('pt-MZ', { weekday: 'long' });
                const dateStr = dateObj.toLocaleDateString('pt-MZ', { day: 'numeric', month: 'long' });
                
                html += `
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                        <h3 class="font-semibold text-gray-900 dark:text-white capitalize">${dayName}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${dateStr}</p>
                    </div>
                    <div class="divide-y divide-gray-100 dark:divide-gray-700 flex-1 overflow-y-auto max-h-96">
                        ${grouped[date].map(b => {
                            const time = new Date(b.data_hora).toLocaleTimeString('pt-MZ', { hour: '2-digit', minute: '2-digit' });
                            const statusClass = b.status === 'Confirmado' 
                                ? 'border-l-4 border-green-500 bg-green-50/30' 
                                : 'border-l-4 border-yellow-500 bg-yellow-50/30';
                            
                            return `
                            <div class="p-3 ${statusClass} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                 onclick="navigateTo('encomendas')">
                                <div class="flex justify-between items-start">
                                    <span class="font-bold text-gray-800 dark:text-gray-200">${time}</span>
                                    <span class="text-xs font-mono text-gray-400">#${b.ticket_number}</span>
                                </div>
                                <p class="text-sm font-medium text-gray-900 dark:text-white mt-1">${b.nome_cliente}</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${b.item_nome}</p>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>`;
            });
            html += '</div>';
        }
        html += '</div>';
        
        contentArea.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (error) {
        contentArea.innerHTML = `<p class="text-red-500">Erro ao carregar agenda: ${error.message}</p>`;
    }
}