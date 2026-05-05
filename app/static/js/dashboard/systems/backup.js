// Sistema de Backup e Restauro
class BackupSystem {
    constructor() {
        this.backupInterval = null;
        this.init();
    }

    init() {
        this.setupBackupListeners();
        this.startAutoBackup();
    }

    setupBackupListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-backup]') || e.target.closest('[data-backup]')) {
                const button = e.target.matches('[data-backup]') ? e.target : e.target.closest('[data-backup]');
                const action = button.dataset.backup;
                
                switch (action) {
                    case 'create':
                        this.createBackup();
                        break;
                    case 'restore':
                        this.showRestoreModal();
                        break;
                    case 'download':
                        this.downloadBackup(button.dataset.backupId);
                        break;
                }
            }
        });
    }

    async createBackup() {
        try {
            showToast('A criar backup...', 'info');

            const backup = await apiFetch('/api/dashboard/backup/create', {
                method: 'POST',
                body: {
                    include_media: true,
                    include_database: true,
                    description: `Backup automático - ${new Date().toLocaleString('pt-MZ')}`
                }
            });

            showToast('Backup criado com sucesso!', 'success');
            this.updateBackupList();

        } catch (error) {
            showToast(`Erro ao criar backup: ${error.message}`, 'error');
        }
    }

    async getBackupList() {
        try {
            const backups = await apiFetch('/api/dashboard/backup/list');
            return backups;
        } catch (error) {
            showToast('Erro ao carregar lista de backups', 'error');
            return [];
        }
    }

    async updateBackupList() {
        const backups = await this.getBackupList();
        this.renderBackupList(backups);
    }

    renderBackupList(backups) {
        const container = document.getElementById('backup-list');
        if (!container) return;

        container.innerHTML = backups.map(backup => `
            <div class="flex items-center justify-between p-4 border rounded-lg dark:border-gray-600">
                <div>
                    <p class="font-medium text-gray-900 dark:text-white">${backup.description}</p>
                    <p class="text-sm text-gray-500">${new Date(backup.created_at).toLocaleString('pt-MZ')}</p>
                    <p class="text-xs text-gray-400">Tamanho: ${this.formatFileSize(backup.size)}</p>
                </div>
                <div class="flex space-x-2">
                    <button data-backup="download" data-backup-id="${backup.id}" 
                            class="btn btn-outline btn-sm">
                        <i data-lucide="download" class="w-4 h-4 mr-1"></i>
                        Descarregar
                    </button>
                    <button onclick="backupSystem.restoreBackup('${backup.id}')" 
                            class="btn btn-outline btn-sm">
                        <i data-lucide="rotate-ccw" class="w-4 h-4 mr-1"></i>
                        Restaurar
                    </button>
                    <button onclick="backupSystem.deleteBackup('${backup.id}')" 
                            class="btn btn-error btn-sm">
                        <i data-lucide="trash-2" class="w-4 h-4 mr-1"></i>
                        Apagar
                    </button>
                </div>
            </div>
        `).join('');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async downloadBackup(backupId) {
        try {
            const response = await fetch(`/api/dashboard/backup/download/${backupId}`);
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${backupId}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showToast('Backup descarregado com sucesso!', 'success');
        } catch (error) {
            showToast('Erro ao descarregar backup', 'error');
        }
    }

    async restoreBackup(backupId) {
        if (!confirm('Tem a certeza que quer restaurar este backup? Esta ação não pode ser desfeita.')) {
            return;
        }

        try {
            showToast('A restaurar backup...', 'info');

            await apiFetch(`/api/dashboard/backup/restore/${backupId}`, {
                method: 'POST'
            });

            showToast('Backup restaurado com sucesso! A página será recarregada.', 'success');
            
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            showToast(`Erro ao restaurar backup: ${error.message}`, 'error');
        }
    }

    async deleteBackup(backupId) {
        if (!confirm('Tem a certeza que quer apagar este backup?')) {
            return;
        }

        try {
            await apiFetch(`/api/dashboard/backup/${backupId}`, {
                method: 'DELETE'
            });

            showToast('Backup apagado com sucesso!', 'success');
            this.updateBackupList();

        } catch (error) {
            showToast('Erro ao apagar backup', 'error');
        }
    }

    startAutoBackup() {
        // Backup automático a cada 24 horas
        this.backupInterval = setInterval(() => {
            this.createBackup();
        }, 24 * 60 * 60 * 1000); // 24 horas
    }

    stopAutoBackup() {
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
            this.backupInterval = null;
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showRestoreModal() {
        // Implementar modal de restauro
        alert('Modal de restauro - Em desenvolvimento');
    }
}

// Inicializar sistema de backup
let backupSystem;

document.addEventListener('DOMContentLoaded', function() {
    backupSystem = new BackupSystem();
});