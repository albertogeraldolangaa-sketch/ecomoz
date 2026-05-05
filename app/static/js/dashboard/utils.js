// Funções utilitárias

function createLoader() {
    return `
    <div class="flex items-center justify-center h-64">
        <i data-lucide="loader-2" class="w-12 h-12 animate-spin text-blue-600"></i>
    </div>`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: 'MZN',
        minimumFractionDigits: 2
    }).format(value || 0);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('pt-MZ');
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('pt-MZ');
}

function createMetricCard(icon, label, value, color) {
    const colorClasses = {
        green: { bg: 'bg-green-100', text: 'text-green-600' },
        blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
        amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
        orange: { bg: 'bg-orange-100', text: 'text-orange-600' }
    };
    const theme = colorClasses[color] || colorClasses.blue;
    return `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex items-center space-x-4 card-hover">
        <div class="p-3 rounded-full ${theme.bg} ${theme.text}">
            <i data-lucide="${icon}" class="w-6 h-6"></i>
        </div>
        <div>
            <div class="text-sm font-medium text-gray-500 dark:text-gray-400">${label}</div>
            <div class="text-2xl font-bold text-gray-900 dark:text-white">${value}</div>
        </div>
    </div>`;
}

function drawStars(rating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHTML += `<i data-lucide="star" class="w-5 h-5 fill-current"></i>`;
        } else {
            starsHTML += `<i data-lucide="star" class="w-5 h-5"></i>`;
        }
    }
    return starsHTML;
}

function toggleSwitch(element, targetId = null) {
    const isChecked = element.getAttribute('aria-checked') === 'true';
    element.setAttribute('aria-checked', !isChecked);
    
    if (isChecked) {
        element.classList.remove('bg-blue-600');
        element.classList.add('bg-gray-200');
        element.querySelector('span').classList.remove('translate-x-5');
        element.querySelector('span').classList.add('translate-x-0');
    } else {
        element.classList.remove('bg-gray-200');
        element.classList.add('bg-blue-600');
        element.querySelector('span').classList.remove('translate-x-0');
        element.querySelector('span').classList.add('translate-x-5');
    }
    
    if (targetId) {
        const target = document.getElementById(targetId);
        if (target) {
            target.classList.toggle('hidden');
        }
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('open');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('open');
        modal.classList.add('hidden');
    }
}

function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (!input || !preview) return;

    input.addEventListener('change', () => {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                preview.src = e.target.result;
                preview.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
}

async function handleImageUpload(file, category) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    
    try {
        const response = await apiFetch('/api/dashboard/upload-image', {
            method: 'POST',
            body: formData 
        });
        showToast('Upload bem-sucedido!', 'success');
        return response.file_url;
    } catch (error) {
        showToast(`Erro no upload: ${error.message}`, 'error');
        throw error;
    }
}