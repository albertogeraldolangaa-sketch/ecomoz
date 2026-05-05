// Sistema de Busca e Filtros
class SearchSystem {
    constructor() {
        this.currentSearchTerm = '';
        this.currentFilters = {};
        this.init();
    }

    init() {
        this.setupSearchListeners();
        this.setupFilterListeners();
    }

    setupSearchListeners() {
        // Busca global no header
        const globalSearch = document.getElementById('global-search');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                this.handleGlobalSearch(e.target.value);
            });
        }

        // Buscas específicas por página
        document.addEventListener('input', (e) => {
            if (e.target.placeholder && e.target.placeholder.includes('Pesquisar')) {
                this.handlePageSearch(e.target.value, e.target.dataset.searchType);
            }
        });
    }

    setupFilterListeners() {
        // Filtros por data
        document.addEventListener('change', (e) => {
            if (e.target.type === 'date' && e.target.dataset.filter) {
                this.handleDateFilter(e.target.dataset.filter, e.target.value);
            }
        });

        // Filtros por status
        document.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.filter) {
                this.handleStatusFilter(e.target.dataset.filter, e.target.checked);
            }
        });
    }

    handleGlobalSearch(term) {
        this.currentSearchTerm = term.toLowerCase();
        
        // Aplicar busca baseada na página atual
        switch(currentPage) {
            case 'encomendas':
                this.filterBookings();
                break;
            case 'produtos':
                this.filterProducts();
                break;
            case 'servicos':
                this.filterServices();
                break;
            case 'clientes':
                this.filterClients();
                break;
            default:
                // Busca genérica
                this.highlightSearchTerms();
        }
    }

    handlePageSearch(term, searchType) {
        this.currentSearchTerm = term.toLowerCase();
        
        switch(searchType) {
            case 'bookings':
                this.filterBookings();
                break;
            case 'products':
                this.filterProducts();
                break;
            case 'services':
                this.filterServices();
                break;
            case 'clients':
                this.filterClients();
                break;
        }
    }

    filterBookings() {
        const rows = document.querySelectorAll('#encomendas-table-body tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const shouldShow = text.includes(this.currentSearchTerm);
            row.style.display = shouldShow ? '' : 'none';
        });
    }

    filterProducts() {
        const rows = document.querySelectorAll('#produtos-table-body tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const shouldShow = text.includes(this.currentSearchTerm);
            row.style.display = shouldShow ? '' : 'none';
        });
    }

    filterServices() {
        const rows = document.querySelectorAll('#servicos-table-body tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const shouldShow = text.includes(this.currentSearchTerm);
            row.style.display = shouldShow ? '' : 'none';
        });
    }

    filterClients() {
        const rows = document.querySelectorAll('#clients-table-body tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const shouldShow = text.includes(this.currentSearchTerm);
            row.style.display = shouldShow ? '' : 'none';
        });
    }

    highlightSearchTerms() {
        // Remover highlights anteriores
        document.querySelectorAll('.search-highlight').forEach(el => {
            el.outerHTML = el.innerHTML;
        });

        if (!this.currentSearchTerm) return;

        // Aplicar highlight ao texto visível
        const walker = document.createTreeWalker(
            contentArea,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.toLowerCase().includes(this.currentSearchTerm)) {
                const span = document.createElement('span');
                span.className = 'search-highlight bg-yellow-200 dark:bg-yellow-800';
                span.textContent = node.textContent;
                node.parentNode.replaceChild(span, node);
            }
        }
    }

    handleDateFilter(filterType, value) {
        this.currentFilters[filterType] = value;
        this.applyFilters();
    }

    handleStatusFilter(filterType, value) {
        if (!this.currentFilters.status) {
            this.currentFilters.status = [];
        }
        
        if (value) {
            this.currentFilters.status.push(filterType);
        } else {
            this.currentFilters.status = this.currentFilters.status.filter(s => s !== filterType);
        }
        
        this.applyFilters();
    }

    applyFilters() {
        // Aplicar filtros baseados na página atual
        switch(currentPage) {
            case 'encomendas':
                this.applyBookingFilters();
                break;
            case 'produtos':
                this.applyProductFilters();
                break;
        }
    }

    applyBookingFilters() {
        const rows = document.querySelectorAll('#encomendas-table-body tr');
        rows.forEach(row => {
            let shouldShow = true;

            // Filtro por data
            if (this.currentFilters.date) {
                const rowDate = row.querySelector('td:nth-child(4)').textContent;
                shouldShow = shouldShow && this.matchesDateFilter(rowDate, this.currentFilters.date);
            }

            // Filtro por status
            if (this.currentFilters.status && this.currentFilters.status.length > 0) {
                const status = row.querySelector('td:nth-child(6)').textContent.toLowerCase();
                shouldShow = shouldShow && this.currentFilters.status.includes(status);
            }

            row.style.display = shouldShow ? '' : 'none';
        });
    }

    applyProductFilters() {
        const rows = document.querySelectorAll('#produtos-table-body tr');
        rows.forEach(row => {
            let shouldShow = true;

            // Filtro por tipo
            if (this.currentFilters.type) {
                const type = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
                shouldShow = shouldShow && type === this.currentFilters.type;
            }

            row.style.display = shouldShow ? '' : 'none';
        });
    }

    matchesDateFilter(rowDate, filterDate) {
        // Implementar lógica de comparação de datas
        const rowDateObj = new Date(rowDate);
        const filterDateObj = new Date(filterDate);
        return rowDateObj.toDateString() === filterDateObj.toDateString();
    }

    clearFilters() {
        this.currentFilters = {};
        this.currentSearchTerm = '';
        
        // Mostrar todas as linhas
        document.querySelectorAll('tbody tr').forEach(row => {
            row.style.display = '';
        });
        
        // Remover highlights
        document.querySelectorAll('.search-highlight').forEach(el => {
            el.outerHTML = el.innerHTML;
        });
        
        // Limpar inputs de busca
        document.querySelectorAll('input[placeholder*="Pesquisar"]').forEach(input => {
            input.value = '';
        });
    }
}

// Inicializar sistema de busca
let searchSystem;

document.addEventListener('DOMContentLoaded', function() {
    searchSystem = new SearchSystem();
});