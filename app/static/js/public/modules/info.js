// Gestão do Modal de Informações
class InfoManager {
    constructor() {
        this.map = null;
        this.mapLoaded = false;
        this.init();
    }
    
    init() {
        this.bindInfoEvents();
        this.setupMap();
    }
    
    bindInfoEvents() {
        // Evento para botão do mapa
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-map')) {
                const btn = e.target.closest('.btn-map');
                const coords = btn.dataset.coords;
                this.toggleMap(coords);
            }
        });
        
        // Evento para abrir modal de informações
        document.addEventListener('modalOpened', (e) => {
            if (e.detail.modalId === 'info-modal') {
                this.onInfoModalOpened();
            }
        });
        
        // Evento para fechar modal de informações
        document.addEventListener('modalClosed', (e) => {
            if (e.detail.modalId === 'info-modal') {
                this.onInfoModalClosed();
            }
        });
    }
    
    setupMap() {
        // Carregar a API do Google Maps dinamicamente
        if (typeof google === 'undefined') {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                this.mapLoaded = true;
                console.log('Google Maps API loaded');
            };
            script.onerror = () => {
                console.error('Failed to load Google Maps API');
            };
            document.head.appendChild(script);
        } else {
            this.mapLoaded = true;
        }
    }
    
    onInfoModalOpened() {
        // Inicializar funcionalidades quando o modal é aberto
        this.checkBusinessHours();
    }
    
    onInfoModalClosed() {
        // Limpar recursos quando o modal é fechado
        this.hideMap();
    }
    
    toggleMap(coords) {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;
        
        if (mapContainer.style.display === 'none' || !mapContainer.style.display) {
            this.showMap(coords);
        } else {
            this.hideMap();
        }
    }
    
    showMap(coords) {
        const mapContainer = document.getElementById('map-container');
        const mapElement = document.getElementById('map');
        
        if (!mapContainer || !mapElement) return;
        
        mapContainer.style.display = 'block';
        
        if (this.mapLoaded && typeof google !== 'undefined') {
            this.initializeMap(coords, mapElement);
        } else {
            // Fallback: mostrar link para o Google Maps
            this.showMapFallback(coords);
        }
        
        // Scroll para o mapa
        mapContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    initializeMap(coords, mapElement) {
        try {
            const [lat, lng] = coords.split(',').map(coord => parseFloat(coord.trim()));
            
            const mapOptions = {
                zoom: 15,
                center: { lat, lng },
                mapTypeControl: false,
                streetViewControl: true,
                fullscreenControl: true,
                styles: [
                    {
                        featureType: 'poi.business',
                        stylers: [{ visibility: 'on' }]
                    }
                ]
            };
            
            this.map = new google.maps.Map(mapElement, mapOptions);
            
            // Adicionar marcador
            new google.maps.Marker({
                position: { lat, lng },
                map: this.map,
                title: 'Localização da Loja'
            });
            
        } catch (error) {
            console.error('Error initializing map:', error);
            this.showMapFallback(coords);
        }
    }
    
    showMapFallback(coords) {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;
        
        const [lat, lng] = coords.split(',').map(coord => parseFloat(coord.trim()));
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        
        mapElement.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center;">
                <i class="fa-solid fa-map" style="font-size: 3rem; color: var(--theme-light-text); margin-bottom: 15px;"></i>
                <p style="margin-bottom: 15px; color: var(--theme-light-text);">Mapa não disponível</p>
                <a href="${mapsUrl}" 
                   target="_blank" 
                   rel="noopener"
                   class="cta-button"
                   style="text-decoration: none; display: inline-block; padding: 10px 20px;">
                    <i class="fa-solid fa-external-link-alt" style="margin-right: 8px;"></i>
                    Abrir no Google Maps
                </a>
            </div>
        `;
    }
    
    hideMap() {
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.style.display = 'none';
        }
    }
    
    // Ações de Contacto
    callShop(phoneNumber) {
        if (!phoneNumber) return;
        
        // Limpar número (remover espaços, traços, etc.)
        const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
        
        if (this.isMobileDevice()) {
            // Em dispositivos móveis, iniciar chamada
            window.location.href = `tel:${cleanNumber}`;
        } else {
            // Em desktop, mostrar número
            this.showPhoneNumber(cleanNumber);
        }
    }
    
    openWhatsApp(whatsappNumber) {
        if (!whatsappNumber) return;
        
        // Limpar número
        const cleanNumber = whatsappNumber.replace(/[\s\-\(\)]/g, '');
        
        // Mensagem padrão
        const defaultMessage = "Olá! Gostaria de obter mais informações.";
        const encodedMessage = encodeURIComponent(defaultMessage);
        
        const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
    
    openMaps(coords, address) {
        if (!coords) return;
        
        const [lat, lng] = coords.split(',').map(coord => parseFloat(coord.trim()));
        
        // Tentar abrir no app nativo primeiro
        if (this.isMobileDevice()) {
            // Para iOS
            if (this.isIOS()) {
                window.open(`maps://?q=${lat},${lng}`, '_blank');
                return;
            }
            // Para Android
            if (this.isAndroid()) {
                window.open(`geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(address)})`, '_blank');
                return;
            }
        }
        
        // Fallback para web
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
    }
    
    // Verificar horário de funcionamento
    checkBusinessHours() {
        const horarioElement = document.querySelector('.info-item .fa-clock')?.closest('.info-item');
        if (!horarioElement) return;
        
        const horarioText = horarioElement.querySelector('.info-value')?.textContent;
        if (!horarioText) return;
        
        const isOpen = this.isBusinessOpen(horarioText);
        const statusElement = document.createElement('div');
        statusElement.className = `business-status ${isOpen ? 'open' : 'closed'}`;
        statusElement.innerHTML = `
            <i class="fa-solid ${isOpen ? 'fa-door-open' : 'fa-door-closed'}"></i>
            ${isOpen ? 'Aberto Agora' : 'Fechado'}
        `;
        
        horarioElement.querySelector('.info-value').appendChild(statusElement);
    }
    
    isBusinessOpen(horarioText) {
        // Implementação básica - pode ser melhorada conforme a complexidade do horário
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay(); // 0 = Domingo, 1 = Segunda, etc.
        
        // Exemplo simples: assumir que está aberto das 9h às 18h de Segunda a Sexta
        if (currentDay >= 1 && currentDay <= 5) { // Segunda a Sexta
            return currentHour >= 9 && currentHour < 18;
        }
        
        return false;
    }
    
    // Utilitários
    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }
    
    isAndroid() {
        return /Android/.test(navigator.userAgent);
    }
    
    showPhoneNumber(phoneNumber) {
        // Em desktop, mostrar o número em um alerta ou modal
        const modalHTML = `
            <div class="modal-overlay active" id="phone-modal">
                <div class="modal-header">
                    <button class="modal-back-btn" onclick="infoManager.closePhoneModal()">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2 class="modal-title">Número de Telefone</h2>
                </div>
                <div class="modal-body">
                    <div style="text-align: center; padding: 40px 20px;">
                        <i class="fa-solid fa-phone" style="font-size: 3rem; color: var(--theme-primary); margin-bottom: 20px;"></i>
                        <h3 style="margin-bottom: 10px;">Telefone da Loja</h3>
                        <p style="font-size: 1.5rem; font-weight: 600; color: var(--theme-dark-text); margin-bottom: 30px;">
                            ${this.formatPhoneNumber(phoneNumber)}
                        </p>
                        <button class="cta-button" onclick="navigator.clipboard.writeText('${phoneNumber}').then(() => alert('Número copiado!'))">
                            <i class="fa-regular fa-copy" style="margin-right: 8px;"></i>
                            Copiar Número
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('phone-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        document.body.classList.add('modal-active');
    }
    
    closePhoneModal() {
        const modal = document.getElementById('phone-modal');
        if (modal) {
            modal.remove();
            document.body.classList.remove('modal-active');
        }
    }
    
    formatPhoneNumber(phoneNumber) {
        // Formatar número de telefone para exibição
        if (phoneNumber.length === 9) {
            return phoneNumber.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
        }
        return phoneNumber;
    }
    
    // Método para compartilhar loja
    shareShop() {
        const shopName = document.querySelector('.minisite-header h1')?.textContent || 'Esta loja';
        const shareUrl = window.location.href;
        const shareText = `Confira ${shopName} - ${shareUrl}`;
        
        if (navigator.share) {
            // Web Share API (dispositivos móveis)
            navigator.share({
                title: shopName,
                text: `Confira ${shopName}`,
                url: shareUrl
            }).catch(error => {
                console.log('Error sharing:', error);
                this.fallbackShare(shareText);
            });
        } else {
            // Fallback para desktop
            this.fallbackShare(shareText);
        }
    }
    
    fallbackShare(shareText) {
        // Fallback: copiar para clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            this.showNotification('Link copiado para a área de transferência!', 'success');
        }).catch(() => {
            // Fallback mais básico
            prompt('Copie o link para compartilhar:', shareText);
        });
    }
    
    showNotification(message, type = 'info') {
        // Reutilizar o sistema de notificação existente
        if (window.ticketsManager && typeof ticketsManager.showNotification === 'function') {
            ticketsManager.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    window.infoManager = new InfoManager();
});