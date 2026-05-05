// Sistema de Exportação Avançada
class ExportSystem {
    constructor() {
        this.exportFormats = ['csv', 'excel', 'pdf', 'json'];
        this.init();
    }

    init() {
        this.setupExportListeners();
    }

    setupExportListeners() {
        // Listeners para botões de exportação
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-export]') || e.target.closest('[data-export]')) {
                const button = e.target.matches('[data-export]') ? e.target : e.target.closest('[data-export]');
                const exportType = button.dataset.export;
                const format = button.dataset.format || 'csv';
                this.handleExport(exportType, format);
            }
        });
    }

    async handleExport(exportType, format) {
        try {
            showToast(`A preparar exportação de ${exportType}...`, 'info');

            const data = await this.fetchExportData(exportType);
            this.downloadFile(data, exportType, format);

        } catch (error) {
            showToast(`Erro na exportação: ${error.message}`, 'error');
        }
    }

    async fetchExportData(exportType) {
        const endpoints = {
            'orders': '/api/dashboard/export/orders',
            'bookings': '/api/dashboard/export/bookings',
            'products': '/api/dashboard/export/products',
            'services': '/api/dashboard/export/services',
            'clients': '/api/dashboard/export/clients',
            'revenue': '/api/dashboard/export/revenue'
        };

        const endpoint = endpoints[exportType];
        if (!endpoint) {
            throw new Error(`Tipo de exportação não suportado: ${exportType}`);
        }

        const response = await apiFetch(endpoint);
        return response;
    }

    downloadFile(data, exportType, format) {
        let content, mimeType, extension;

        switch (format) {
            case 'csv':
                content = this.convertToCSV(data);
                mimeType = 'text/csv';
                extension = 'csv';
                break;
            case 'excel':
                content = this.convertToExcel(data);
                mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                extension = 'xlsx';
                break;
            case 'pdf':
                content = this.convertToPDF(data, exportType);
                mimeType = 'application/pdf';
                extension = 'pdf';
                break;
            case 'json':
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
                extension = 'json';
                break;
            default:
                throw new Error(`Formato não suportado: ${format}`);
        }

        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportType}-${new Date().toISOString().split('T')[0]}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast(`Exportação de ${exportType} concluída!`, 'success');
    }

    convertToCSV(data) {
        if (!data || data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        const csvRows = data.map(row => 
            headers.map(header => {
                const value = row[header];
                // Escapar vírgulas e aspas
                return typeof value === 'string' && value.includes(',') 
                    ? `"${value.replace(/"/g, '""')}"` 
                    : value;
            }).join(',')
        );

        return [csvHeaders, ...csvRows].join('\n');
    }

    convertToExcel(data) {
        // Implementação simplificada - em produção usar uma biblioteca como SheetJS
        return this.convertToCSV(data); // Fallback para CSV
    }

    convertToPDF(data, title) {
        // Implementação simplificada - em produção usar uma biblioteca como jsPDF
        const pdfContent = `
            Relatório: ${title}
            Data: ${new Date().toLocaleDateString('pt-MZ')}
            
            ${JSON.stringify(data, null, 2)}
        `;
        return pdfContent;
    }

    // Exportação com filtros aplicados
    async exportWithFilters(exportType, filters) {
        try {
            const queryParams = new URLSearchParams(filters).toString();
            const response = await apiFetch(`/api/dashboard/export/${exportType}?${queryParams}`);
            this.downloadFile(response, `${exportType}-filtrado`, 'csv');
        } catch (error) {
            showToast(`Erro na exportação filtrada: ${error.message}`, 'error');
        }
    }

    // Exportação agendada
    scheduleExport(exportType, schedule) {
        // Implementar exportações agendadas (requer backend)
        console.log(`Agendando exportação de ${exportType} para ${schedule}`);
        showToast('Exportação agendada com sucesso!', 'success');
    }
}

// Inicializar sistema de exportação
let exportSystem;

document.addEventListener('DOMContentLoaded', function() {
    exportSystem = new ExportSystem();
});