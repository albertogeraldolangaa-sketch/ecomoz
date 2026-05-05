// Lógica do Calendário e Passos do Agendamento
class BookingManager {
    constructor() {
        this.currentStep = 'step-1-services';
        this.calendarDate = new Date();
        
        this.init();
    }
    
    init() {
        this.bindCalendarEvents();
        this.bindStepEvents();
        this.bindServiceEvents();
        this.bindStaffEvents();
        this.bindTimeSlotEvents();
        this.bindDeliveryEvents();
        this.bindPaymentEvents();
    }
    
    bindCalendarEvents() {
        const calendarPrev = document.getElementById('calendar-prev');
        const calendarNext = document.getElementById('calendar-next');
        
        if (calendarPrev && calendarNext) {
            calendarPrev.addEventListener('click', () => this.previousMonth());
            calendarNext.addEventListener('click', () => this.nextMonth());
        }
    }
    
    bindStepEvents() {
        // Event listener para botões de voltar dentro do fluxo
        document.getElementById('app-container')?.addEventListener('click', (e) => {
            const backButton = e.target.closest('.step-back-button');
            if (backButton) {
                this.handleBackClick(backButton);
            }
        });
        
        // Event listener para o botão CTA principal
        document.getElementById('cta-button')?.addEventListener('click', () => {
            this.handleCtaClick();
        });
        
        // Event listener para novo agendamento
        document.getElementById('new-booking-button')?.addEventListener('click', () => {
            this.resetFlow();
        });
    }

    bindPaymentEvents() {
        // Listen for payment method changes
        document.addEventListener('change', (e) => {
            if (e.target.name === 'payment-method') {
                this.updateCtaButton();
            }
        });
    }
    
    bindServiceEvents() {
        // Os eventos de serviço são adicionados dinamicamente quando os serviços são carregados
    }
    
    bindStaffEvents() {
        // Delegação de eventos para itens de staff
        const staffList = document.getElementById('staff-list');
        if (staffList) {
            staffList.addEventListener('click', (e) => {
                const staffItem = e.target.closest('.staff-item');
                if (staffItem) {
                    this.selectStaff(staffItem);
                }
            });
        }
    }
    
    bindTimeSlotEvents() {
        // Os eventos de time slot são adicionados dinamicamente quando os horários são carregados
    }
    
    bindDeliveryEvents() {
        const deliveryOptions = document.querySelector('.delivery-options');
        if (deliveryOptions) {
            deliveryOptions.addEventListener('change', () => {
                this.toggleDeliveryAddress();
            });
        }
    }
    
    // Navegação do Calendário
    previousMonth() {
        this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
        this.renderCalendar();
        this.hideTimeSlots();
        shopStore.setBookingState({ date: null, time: null });
        this.updateCtaButton();
    }
    
    nextMonth() {
        this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
        this.renderCalendar();
        this.hideTimeSlots();
        shopStore.setBookingState({ date: null, time: null });
        this.updateCtaButton();
    }
    
    hideTimeSlots() {
        const timeSlotsContainer = document.getElementById('time-slots-container');
        if (timeSlotsContainer) {
            timeSlotsContainer.style.display = 'none';
        }
    }
    
    // Renderização do Calendário
    renderCalendar() {
        const calendarGrid = document.querySelector('.calendar-grid');
        const calendarMonthYear = document.getElementById('calendar-month-year');
        
        if (!calendarGrid || !calendarMonthYear) return;
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const month = this.calendarDate.getMonth();
        const year = this.calendarDate.getFullYear();
        
        // Atualiza o cabeçalho do calendário
        calendarMonthYear.textContent = 
            `${this.calendarDate.toLocaleString('pt-PT', { month: 'long' })} ${year}`;
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Limpa o calendário
        calendarGrid.innerHTML = `
            <div class="calendar-day-header">D</div>
            <div class="calendar-day-header">S</div>
            <div class="calendar-day-header">T</div>
            <div class="calendar-day-header">Q</div>
            <div class="calendar-day-header">Q</div>
            <div class="calendar-day-header">S</div>
            <div class="calendar-day-header">S</div>
        `;
        
        // Dias vazios no início
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGrid.innerHTML += '<div></div>';
        }
        
        // Dias do mês
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = day;
            
            const dayDate = new Date(year, month, day);
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayEl.dataset.date = dateString;
            
            if (dayDate < today) {
                dayEl.classList.add('disabled');
            } else {
                dayEl.addEventListener('click', () => this.selectDate(dayEl, dateString));
            }
            
            const bookingState = shopStore.getBookingState();
            if (dateString === bookingState.date) {
                dayEl.classList.add('selected');
            }
            
            calendarGrid.appendChild(dayEl);
        }
    }
    
    // Seleção de Data
    selectDate(selectedDayEl, dateString) {
        const calendarGrid = document.querySelector('.calendar-grid');
        calendarGrid.querySelectorAll('.calendar-day.selected').forEach(item => {
            item.classList.remove('selected');
        });
        
        selectedDayEl.classList.add('selected');
        
        shopStore.setBookingState({ 
            date: dateString, 
            time: null 
        });
        
        this.updateTimeSlotsTitle(selectedDayEl);
        this.loadTimeSlots(dateString);
    }
    
    updateTimeSlotsTitle(selectedDayEl) {
        const timeSlotsTitle = document.getElementById('time-slots-title');
        if (timeSlotsTitle) {
            timeSlotsTitle.textContent = 
                `Horários para ${selectedDayEl.textContent} de ${this.calendarDate.toLocaleString('pt-PT', { month: 'long' })}`;
        }
    }
    
    // Carregamento de Horários
    async loadTimeSlots(dateString) {
        const timeSlotsGrid = document.getElementById('time-slots-grid');
        const timeSlotsContainer = document.getElementById('time-slots-container');
        
        if (!timeSlotsGrid || !timeSlotsContainer) return;
        
        uiManager.showLoader(timeSlotsGrid);
        timeSlotsContainer.style.display = 'block';
        this.updateCtaButton();
        
        try {
            const bookingState = shopStore.getBookingState();
            const params = {};
            
            if (bookingState.service) {
                params.service_id = bookingState.service.id;
            } else if (bookingState.product) {
                params.product_id = bookingState.product.id;
            }
            
            if (bookingState.staff && bookingState.staff.id !== 'any') {
                params.staff_id = bookingState.staff.id;
            }
            
            const slots = await ShopAPI.getAvailability(dateString, params);
            this.renderTimeSlots(slots);
            
        } catch (error) {
            console.error('Erro ao carregar horários:', error);
            timeSlotsGrid.innerHTML = 
                `<p style="grid-column: 1 / -1; text-align: center; color: #dc3545;">${error.message}</p>`;
        }
    }
    
    renderTimeSlots(slots) {
        const timeSlotsGrid = document.getElementById('time-slots-grid');
        if (!timeSlotsGrid) return;
        
        timeSlotsGrid.innerHTML = '';
        
        if (slots.length === 0) {
            timeSlotsGrid.innerHTML = 
                `<p style="grid-column: 1 / -1; text-align: center; color: var(--theme-light-text);">
                    Nenhum horário disponível para este dia.
                </p>`;
            return;
        }
        
        const bookingState = shopStore.getBookingState();
        
        slots.forEach(time => {
            const slotEl = document.createElement('button');
            slotEl.className = 'time-slot';
            slotEl.textContent = time;
            slotEl.addEventListener('click', () => this.selectTime(slotEl, time));
            
            if (time === bookingState.time) {
                slotEl.classList.add('selected');
            }
            
            timeSlotsGrid.appendChild(slotEl);
        });
    }
    
    // Seleção de Horário
    selectTime(selectedTimeEl, timeString) {
        const timeSlotsGrid = document.getElementById('time-slots-grid');
        if (timeSlotsGrid) {
            timeSlotsGrid.querySelectorAll('.time-slot.selected').forEach(item => {
                item.classList.remove('selected');
            });
        }
        
        selectedTimeEl.classList.add('selected');
        shopStore.setBookingState({ time: timeString });
        this.updateCtaButton();
    }
    
    // Seleção de Serviço
    selectService(selectedItem, serviceData) {
        const serviceList = document.getElementById('service-list');
        if (serviceList) {
            serviceList.querySelectorAll('.list-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
        }
        
        selectedItem.classList.add('selected');
        shopStore.setBookingState({ 
            service: serviceData, 
            product: null 
        });
        this.updateCtaButton();
    }
    
    // Seleção de Staff
    selectStaff(selectedItem) {
        const staffList = document.getElementById('staff-list');
        if (staffList) {
            staffList.querySelectorAll('.staff-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
        }
        
        selectedItem.classList.add('selected');
        
        const staffId = selectedItem.dataset.staffId;
        const staffName = selectedItem.querySelector('.staff-name').textContent;
        
        const staffData = {
            id: staffId === 'any' ? 'any' : parseInt(staffId),
            nome: staffName
        };
        
        shopStore.setBookingState({ staff: staffData });
        this.updateCtaButton();
    }
    
    // Navegação entre Passos
    handleCtaClick() {
        const ctaButton = document.getElementById('cta-button');
        if (ctaButton) ctaButton.disabled = true;
        
        const businessModel = ShopConfig.businessModel;
        
        if (businessModel === 'agendamento') {
            this.handleAgendamentoCta();
        } else {
            this.handleDeliveryCta();
        }
    }
    
    handleAgendamentoCta() {
        const bookingState = shopStore.getBookingState();
        
        switch (this.currentStep) {
            case 'step-1-services':
                const serviceRequiresStaff = bookingState.service && 
                    (bookingState.service.requires_staff || true);
                
                if (serviceRequiresStaff) {
                    this.loadStaff();
                    uiManager.showStep('step-1b-staff');
                } else {
                    shopStore.setBookingState({ staff: null });
                    this.hideItemPreselectedSummary();
                    this.renderCalendar();
                    uiManager.showStep('step-2-datetime');
                }
                break;
                
            case 'step-1b-staff':
                this.hideItemPreselectedSummary();
                this.renderCalendar();
                uiManager.showStep('step-2-datetime');
                break;
                
            case 'step-2-datetime':
                this.populateConfirmation();
                uiManager.showStep('step-3-confirm');
                break;
                
            case 'step-3-confirm':
                this.submitBooking();
                break;
        }
    }
    
    handleDeliveryCta() {
        switch (this.currentStep) {
            case 'step-1-services':
                uiManager.showStep('step-2-datetime');
                break;
                
            case 'step-2-datetime':
                if (!this.validateDeliveryDetails()) {
                    const ctaButton = document.getElementById('cta-button');
                    if (ctaButton) ctaButton.disabled = false;
                    return;
                }
                this.populateConfirmation();
                uiManager.showStep('step-3-confirm');
                break;
                
            case 'step-3-confirm':
                this.submitOrder();
                break;
        }
    }
    
    validateDeliveryDetails() {
        const orderType = document.querySelector('input[name="order-type"]:checked')?.value;
        const clientAddress = document.getElementById('client-address')?.value;
        
        if (orderType === 'delivery' && !clientAddress) {
            alert('Por favor, preencha a sua morada de entrega.');
            return false;
        }
        
        return true;
    }
    
    handleBackClick(backButton) {
        const targetStep = backButton.dataset.target;
        
        if (targetStep === 'step-1-services') {
            this.resetFlow();
            uiManager.showStep('step-1-services');
        } else if (targetStep === 'step-1b-staff') {
            shopStore.setBookingState({ staff: null });
            uiManager.showStep('step-1b-staff');
        } else if (targetStep === 'step-2-datetime') {
            if (ShopConfig.businessModel === 'agendamento') {
                shopStore.setBookingState({ time: null });
            }
            uiManager.showStep('step-2-datetime');
        }
    }
    
    // --- CARREGAMENTO DINÂMICO DE STAFF ---
    async loadStaff() {
        const staffList = document.getElementById('staff-list');
        if (!staffList) return;
        
        uiManager.showLoader(staffList);
        
        try {
            // Chamada API
            const staffMembers = await ShopAPI.getStaff();
            staffList.innerHTML = '';
            
            // Opção "Qualquer Profissional"
            const anyStaffHtml = `
                <li class="staff-item" data-staff-id="any">
                    <div class="staff-avatar" style="background-color: #eee; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-users" style="color: #777;"></i>
                    </div>
                    <div class="staff-details">
                        <span class="staff-name">Qualquer Profissional</span>
                        <span class="staff-title">Disponibilidade mais cedo</span>
                    </div>
                </li>`;
            staffList.insertAdjacentHTML('beforeend', anyStaffHtml);
            
            if (staffMembers && staffMembers.length > 0) {
                staffMembers.forEach(member => {
                    const avatar = member.avatar_url || `https://placehold.co/50x50/e0e0e0/757575?text=${member.name.charAt(0)}`;
                    const title = member.title || 'Profissional';
                    
                    const memberHtml = `
                        <li class="staff-item" data-staff-id="${member.id}">
                            <img src="${avatar}" alt="${member.name}" class="staff-avatar">
                            <div class="staff-details">
                                <span class="staff-name">${member.name}</span>
                                <span class="staff-title">${title}</span>
                            </div>
                        </li>`;
                    staffList.insertAdjacentHTML('beforeend', memberHtml);
                });
            }
    
        } catch (error) {
            console.error('Erro ao carregar staff:', error);
            uiManager.showEmptyState(staffList, 'fa-users', 'Erro', 'Não foi possível carregar a equipa.');
        }
    }
    
    // Toggle do campo de morada (Delivery)
    toggleDeliveryAddress() {
        const deliveryAddressGroup = document.getElementById('delivery-address-group');
        const orderType = document.querySelector('input[name="order-type"]:checked')?.value;
        
        if (deliveryAddressGroup) {
            deliveryAddressGroup.style.display = (orderType === 'delivery') ? 'block' : 'none';
        }
    }
    
    // Esconder resumo de item pré-selecionado
    hideItemPreselectedSummary() {
        const itemPreselectedSummary = document.getElementById('item-preselected-summary');
        if (itemPreselectedSummary) {
            itemPreselectedSummary.style.display = 'none';
        }
    }
    
    // Atualizar botão CTA
    updateCtaButton() {
        const businessModel = ShopConfig.businessModel;
        const bookingState = shopStore.getBookingState();
        const shoppingCart = shopStore.getShoppingCart();
        
        if (this.currentStep === 'step-4-success') {
            uiManager.updateCtaButton(null);
            return;
        }
        
        if (businessModel === 'agendamento') {
            this.updateAgendamentoCta(bookingState);
        } else {
            this.updateDeliveryCta(bookingState, shoppingCart);
        }
    }
    
    updateAgendamentoCta(bookingState) {
        switch (this.currentStep) {
            case 'step-1-services':
                uiManager.updateCtaButton('Continuar', !bookingState.service);
                break;
            case 'step-1b-staff':
                uiManager.updateCtaButton('Continuar', !bookingState.staff);
                break;
            case 'step-2-datetime':
                const hasItem = bookingState.service || bookingState.product;
                uiManager.updateCtaButton('Continuar', !hasItem || !bookingState.date || !bookingState.time);
                break;
            case 'step-3-confirm':
                const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value;
                const amountText = (bookingState.amount_to_pay_now > 0 && paymentMethod === 'online') ? 
                    `Pagar ${bookingState.amount_to_pay_now.toFixed(2)} MZN` : 
                    'Confirmar (Pagar no Local)';
                uiManager.updateCtaButton(`Confirmar e ${amountText}`, false);
                break;
        }
    }
    
    updateDeliveryCta(bookingState, shoppingCart) {
        switch (this.currentStep) {
            case 'step-1-services':
                uiManager.updateCtaButton('Continuar para Entrega', shoppingCart.length === 0);
                break;
            case 'step-2-datetime':
                uiManager.updateCtaButton('Continuar para Pagamento', false);
                break;
            case 'step-3-confirm':
                const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value;
                const amountText = (bookingState.amount_to_pay_now > 0 && paymentMethod === 'online') ?
                    `Pagar ${bookingState.amount_to_pay_now.toFixed(2)} MZN` : 
                    'Confirmar (Pagar no Local)';
                uiManager.updateCtaButton(`Finalizar e ${amountText}`, false);
                break;
        }
    }
    
    // População da Confirmação
    populateConfirmation() {
        const businessModel = ShopConfig.businessModel;
        
        if (businessModel === 'agendamento') {
            this.populateAgendamentoConfirmation();
        } else {
            this.populateDeliveryConfirmation();
        }
        
        this.updateCtaButton();
    }
    
    populateAgendamentoConfirmation() {
        const bookingState = shopStore.getBookingState();
        const item = bookingState.service || bookingState.product;
        
        if (!item) return;
        
        // Atualiza elementos de resumo
        this.updateElementText('summary-service', item.nome);
        this.updateElementText('summary-date', ShopUtils.formatDate(bookingState.date));
        this.updateElementText('summary-time', bookingState.time);
        
        // Mostra/Esconde linhas do resumo
        this.toggleElement('summary-item-line', true);
        this.toggleElement('summary-date-line', true);
        this.toggleElement('summary-time-line', true);
        this.toggleElement('summary-type-line', false);
        this.toggleElement('summary-address-line', false);
        
        // Staff
        if (bookingState.staff) {
            this.updateElementText('summary-staff', bookingState.staff.nome);
            this.toggleElement('summary-staff-line', true);
        } else {
            this.toggleElement('summary-staff-line', false);
        }
        
        // Cálculo de preços
        this.calculateAndDisplayPrices(item.preco, item.payment_mode, item.deposit_value);
    }
    
    populateDeliveryConfirmation() {
        const shoppingCart = shopStore.getShoppingCart();
        const orderType = document.querySelector('input[name="order-type"]:checked')?.value;
        const clientAddress = document.getElementById('client-address')?.value;
        
        // Mostra/Esconde linhas do resumo
        this.toggleElement('summary-item-line', false);
        this.toggleElement('summary-date-line', false);
        this.toggleElement('summary-time-line', false);
        this.toggleElement('summary-staff-line', false);
        this.toggleElement('summary-type-line', true);
        
        // Tipo de encomenda
        this.updateElementText('summary-order-type', 
            orderType === 'delivery' ? 'Entrega (Delivery)' : 'Recolha (Takeaway)');
        
        // Morada
        if (orderType === 'delivery') {
            this.updateElementText('summary-order-address', clientAddress);
            this.toggleElement('summary-address-line', true);
        } else {
            this.toggleElement('summary-address-line', false);
        }
        
        // Cálculo de preços do carrinho
        this.calculateCartPrices();
    }
    
    calculateCartPrices() {
        const shoppingCart = shopStore.getShoppingCart();
        let total_price = 0;
        let amount_to_pay_now = 0;
        
        shoppingCart.forEach(item => {
            const item_total = item.product.preco * item.quantity;
            total_price += item_total;
            
            if (item.product.payment_mode === 'deposito' && item.product.deposit_value > 0) {
                amount_to_pay_now += (item.product.deposit_value * item.quantity);
            } else {
                amount_to_pay_now += item_total;
            }
        });
        
        const remaining_amount = total_price - amount_to_pay_now;
        
        this.displayPrices(total_price, amount_to_pay_now, remaining_amount);
    }
    
    calculateAndDisplayPrices(total_price, payment_mode, deposit_value) {
        let amount_to_pay_now = 0;
        let remaining_amount = 0;
        
        if (payment_mode === 'deposito' && deposit_value > 0 && deposit_value < total_price) {
            amount_to_pay_now = deposit_value;
            remaining_amount = total_price - amount_to_pay_now;
        } else {
            amount_to_pay_now = total_price;
        }
        
        this.displayPrices(total_price, amount_to_pay_now, remaining_amount);
    }
    
    displayPrices(total_price, amount_to_pay_now, remaining_amount) {
        shopStore.setBookingState({ amount_to_pay_now });
        
        this.updateElementText('summary-total-price', ShopUtils.formatCurrency(total_price));
        this.updateElementText('summary-amount-to-pay', ShopUtils.formatCurrency(amount_to_pay_now));
        this.updateElementText('summary-remaining', ShopUtils.formatCurrency(remaining_amount));
    }
    
    // Submissões
    async submitBooking() {
        const nome = document.getElementById('client-name')?.value;
        const telefone = document.getElementById('client-phone')?.value;
        
        if (!nome || !telefone) {
            alert('Por favor, preencha o seu nome e telemóvel.');
            this.enableCtaButton();
            return;
        }
        
        const bookingState = shopStore.getBookingState();
        const item = bookingState.service || bookingState.product;
        const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value;
        
        const data = {
            service_id: bookingState.service ? item.id : null,
            product_id: bookingState.product ? item.id : null,
            staff_id: bookingState.staff ? bookingState.staff.id : null,
            data_hora: `${bookingState.date}T${bookingState.time}:00`,
            nome: nome,
            telefone: telefone,
            email: document.getElementById('client-email')?.value || '',
            payment_method: paymentMethod,
            coupon: document.getElementById('coupon-code')?.value || ''
        };
        
        this.updateCtaButtonText('A confirmar...', paymentMethod);
        
        try {
            const result = await ShopAPI.submitBooking(data);
            this.handleSubmissionResult(result);
        } catch (error) {
            this.handleSubmissionError(error);
        }
    }
    
    async submitOrder() {
        const nome = document.getElementById('client-name')?.value;
        const telefone = document.getElementById('client-phone')?.value;
        
        if (!nome || !telefone) {
            alert('Por favor, preencha o seu nome e telemóvel.');
            this.enableCtaButton();
            return;
        }
        
        const paymentMethod = document.querySelector('input[name="payment-method"]:checked')?.value;
        const orderType = document.querySelector('input[name="order-type"]:checked')?.value;
        const address = document.getElementById('client-address')?.value;
        const shoppingCart = shopStore.getShoppingCart();
        
        const cartData = shoppingCart.map(item => ({
            id: item.product.id,
            qty: item.quantity,
            name: item.product.nome,
            variant_id: item.product.variant_id || null
        }));
        
        const data = {
            cart: cartData,
            customer: {
                nome: nome,
                telefone: telefone,
                email: document.getElementById('client-email')?.value || ''
            },
            order_type: orderType,
            address: address,
            payment_method: paymentMethod,
            coupon: document.getElementById('coupon-code')?.value || ''
        };
        
        this.updateCtaButtonText('A confirmar...', paymentMethod);
        
        try {
            const result = await ShopAPI.submitOrder(data);
            this.handleSubmissionResult(result);
        } catch (error) {
            this.handleSubmissionError(error);
        }
    }
    
    updateCtaButtonText(baseText, paymentMethod) {
        const ctaButton = document.getElementById('cta-button');
        if (ctaButton) {
            ctaButton.textContent = paymentMethod === 'online' ? 
                'A processar pagamento...' : baseText;
        }
    }
    
    handleSubmissionResult(result) {
        if (result.action === 'redirect_to_payment') {
            window.location.href = result.checkout_url;
            return;
        }
        
        if (result.action === 'show_success_page') {
            const successData = result.booking || result.order;
            this.saveBookingToLocalStorage(successData);
            this.populateSuccessMessage(successData);
            uiManager.showStep('step-4-success');
            
            if (ShopConfig.businessModel === 'delivery') {
                shopStore.clearCart();
            }
            
            shopStore.setLoadingState('bookings', false);
        } else {
            throw new Error(result.error || 'Resposta inesperada do servidor.');
        }
    }
    
    handleSubmissionError(error) {
        console.error('Erro na submissão:', error);
        alert(`Erro: ${error.message}`);
        this.enableCtaButton();
        this.populateConfirmation();
    }
    
    enableCtaButton() {
        const ctaButton = document.getElementById('cta-button');
        if (ctaButton) ctaButton.disabled = false;
    }
    
    // Mensagem de Sucesso
    populateSuccessMessage(ticket) {
        this.updateElementText('success-ticket', ticket.ticket_number);
        
        if (ShopConfig.businessModel === 'agendamento') {
            this.populateAgendamentoSuccess(ticket);
        } else {
            this.populateDeliverySuccess(ticket);
        }
    }
    
    populateAgendamentoSuccess(ticket) {
        const dateObj = new Date(ticket.data_hora);
        const dateStr = ShopUtils.formatDate(ticket.data_hora);
        const timeStr = dateObj.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        
        if (ticket.status === 'Aguardando Pagamento') {
            this.updateElementText('success-title', 'Pagamento Pendente');
            this.updateElementHTML('success-message', 
                `A sua marcação para <strong>${ticket.item_nome}</strong> no dia <strong>${dateStr}</strong> às <strong>${timeStr}</strong> está a aguardar pagamento.`);
        } else {
            this.updateElementText('success-title', 'Obrigado!');
            this.updateElementHTML('success-message', 
                `A sua marcação para <strong>${ticket.item_nome}</strong> no dia <strong>${dateStr}</strong> às <strong>${timeStr}</strong> está pendente de aprovação.`);
        }
        
        this.updateElementText('new-booking-button', 'Fazer Nova Marcação');
    }
    
    populateDeliverySuccess(ticket) {
        if (ticket.status === 'Aguardando Pagamento') {
            this.updateElementText('success-title', 'Pagamento Pendente');
            this.updateElementHTML('success-message', 
                `A sua encomenda <strong>${ticket.item_nome}</strong> está a aguardar pagamento.`);
        } else {
            this.updateElementText('success-title', 'Encomenda Recebida!');
            this.updateElementHTML('success-message', 
                `A sua encomenda <strong>${ticket.item_nome}</strong> foi recebida e está pendente de aprovação.`);
        }
        
        this.updateElementText('new-booking-button', 'Fazer Nova Encomenda');
    }
    
    // Local Storage
    saveBookingToLocalStorage(bookingData) {
        const allBookings = JSON.parse(localStorage.getItem('my_bookings') || '{}');
        const shopSlug = ShopConfig.shopSlug;
        
        if (!allBookings[shopSlug]) {
            allBookings[shopSlug] = [];
        }
        
        allBookings[shopSlug].push(bookingData);
        localStorage.setItem('my_bookings', JSON.stringify(allBookings));
    }
    
    // Reset do Fluxo
    resetFlow() {
        shopStore.setBookingState({
            service: null,
            product: null,
            staff: null,
            date: null,
            time: null,
            amount_to_pay_now: 0.0
        });
        
        if (ShopConfig.businessModel === 'delivery') {
            shopStore.clearCart();
        }
        
        // Desmarca serviços
        const serviceList = document.getElementById('service-list');
        if (serviceList) {
            serviceList.querySelectorAll('.list-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
        }
        
        this.calendarDate = new Date();
        this.hideTimeSlots();
        this.hideItemPreselectedSummary();
        
        // Limpa formulários
        this.clearForms();
        
        if (ShopConfig.businessModel === 'delivery') {
            cartManager.renderCartItems();
        }
    }
    
    clearForms() {
        const elements = ['client-name', 'client-phone', 'client-email', 'client-address', 'coupon-code'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
    }
    
    // Helpers
    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = text;
    }
    
    updateElementHTML(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) element.innerHTML = html;
    }
    
    toggleElement(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }
}

// Inicialização e Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    window.bookingManager = new BookingManager();
    
    // Observers para mudanças de estado
    shopStore.subscribe('bookingStateChanged', () => {
        bookingManager.updateCtaButton();
    });
    
    shopStore.subscribe('stepChanged', (data) => {
        if (data && data.detail) {
            bookingManager.currentStep = data.detail.stepId;
            bookingManager.updateCtaButton();
        }
    });
});