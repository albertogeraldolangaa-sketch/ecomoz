async function loadChatPage() {
    contentArea.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-10rem)]">
        <div class="md:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div class="p-4 border-b dark:border-gray-700">
                <input type="text" placeholder="Pesquisar conversa..." class="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
            </div>
            <div id="chat-sessions-list" class="divide-y dark:divide-gray-600">
                ${createLoader()}
            </div>
        </div>
        
        <div class="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
            <div id="chat-header" class="p-4 border-b dark:border-gray-700 flex items-center space-x-3">
                <p class="text-gray-500 dark:text-gray-400">Selecione uma conversa para começar</p>
            </div>
            <div id="chat-messages-area" class="flex-1 p-6 space-y-4 overflow-y-auto">
                </div>
            <div id="chat-input-area" class="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 hidden">
                <form id="chat-send-form" class="relative flex items-center">
                    <input type="text" id="chat-message-input" placeholder="Escreva a sua mensagem..." class="w-full pr-12 pl-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" required>
                    <button type="submit" class="absolute right-3 p-2 rounded-full text-white bg-blue-600"
                            dark:style="background: linear-gradient(90deg, #D4AF37, #F6E27F); color: #111;">
                        <i data-lucide="send" class="w-5 h-5"></i>
                    </button>
                </form>
            </div>
        </div>
    </div>`;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    try {
        const sessions = await apiFetch('/api/dashboard/chat-sessions');
        const sessionsList = document.getElementById('chat-sessions-list');
        if (sessions.length === 0) {
            sessionsList.innerHTML = `<p class="p-4 text-sm text-gray-500">Nenhuma conversa encontrada.</p>`;
            return;
        }
        
        sessionsList.innerHTML = sessions.map(session => `
            <div class="p-4 flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" data-session-id="${session.client_session_id}" onclick="loadChatMessages('${session.client_session_id}', '${session.client_name || 'Cliente'}')">
                <img src="https://placehold.co/40x40/9CA3AF/1F2937?text=${(session.client_name || 'C').substring(0,2).toUpperCase()}" alt="Avatar" class="w-10 h-10 rounded-full">
                <div class="flex-1 min-w-0">
                    <p class="font-semibold truncate text-gray-900 dark:text-white">${session.client_name || 'Cliente Anónimo'}</p>
                    <p class="text-sm text-gray-500 truncate">Sessão: ...${session.client_session_id.slice(-6)}</p>
                </div>
                <span class="text-xs text-gray-500">${new Date(session.last_message_at).toLocaleTimeString('pt-MZ')}</span>
                ${!session.shop_read ? '<span class="w-3 h-3 bg-blue-600 rounded-full"></span>' : ''}
            </div>
        `).join('');
        
    } catch (error) {
        document.getElementById('chat-sessions-list').innerHTML = `<p class="p-4 text-red-500">Erro ao carregar conversas.</p>`;
    }
}

async function loadChatMessages(sessionId, clientName) {
    activeChatSessionId = sessionId;
    
    // Marcar sessão ativa na UI
    document.querySelectorAll('#chat-sessions-list > div').forEach(el => {
        el.style.background = 'none';
        el.style.borderRight = 'none';
        if(el.dataset.sessionId === sessionId) {
            el.style.background = 'rgba(0, 119, 255, 0.1)';
            el.style.borderRight = '4px solid #0077FF';
            // Marcar como lido na UI
            const dot = el.querySelector('.bg-blue-600');
            if(dot) dot.remove();
        }
    });

    // Atualizar cabeçalho
    const chatHeader = document.getElementById('chat-header');
    chatHeader.innerHTML = `
        <img src="https://placehold.co/40x40/9CA3AF/1F2937?text=${clientName.substring(0,2).toUpperCase()}" alt="Avatar" class="w-10 h-10 rounded-full">
        <div>
            <p class="font-semibold text-gray-900 dark:text-white">${clientName}</p>
            <p class="text-sm text-green-600">Online</p>
        </div>`;
    
    const messagesArea = document.getElementById('chat-messages-area');
    messagesArea.innerHTML = createLoader();
    
    document.getElementById('chat-input-area').classList.remove('hidden');
    
    // Ligar ao Socket.IO room
    if (socket) {
        socket.emit('join_chat_room', { room: sessionId });
    }
    
    try {
        const messages = await apiFetch(`/api/dashboard/chat-messages/${sessionId}`);
        renderAllMessages(messages);
    } catch (error) {
        messagesArea.innerHTML = `<p class="text-red-500">Erro ao carregar mensagens.</p>`;
    }
}

function renderAllMessages(messages) {
    const messagesArea = document.getElementById('chat-messages-area');
    messagesArea.innerHTML = messages.map(createMessageBubble).join('');
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function appendMessage(message) {
    const messagesArea = document.getElementById('chat-messages-area');
    messagesArea.innerHTML += createMessageBubble(message);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function createMessageBubble(message) {
    const isShop = message.sender_type === 'shop';
    const align = isShop ? 'justify-end' : '';
    const bubbleClasses = isShop ? 
        'text-white' : 
        '';
    const bubbleStyle = isShop ?
        'background: linear-gradient(90deg, #0077FF, #00A2FF);' :
        'background-color: rgba(0,0,0,0.05);';
    const bubbleStyleDark = isShop ?
        'background-color: #D4AF37; color: #111;' :
        'background-color: rgba(255,255,255,0.1);';
        
    return `
    <div class="flex ${align}">
        <div class="max-w-xs lg:max-w-md p-3 rounded-lg ${bubbleClasses}" 
             style="${document.documentElement.classList.contains('dark') ? bubbleStyleDark : bubbleStyle}">
            <p>${message.message}</p>
            <p class="text-xs text-right opacity-70 mt-1">${new Date(message.timestamp).toLocaleTimeString('pt-MZ')}</p>
        </div>
    </div>`;
}

// Lógica de envio de chat
async function handleSendChatMessage(event) {
    event.preventDefault();
    if (!activeChatSessionId) return;
    
    const input = document.getElementById('chat-message-input');
    const messageText = input.value;
    if (messageText.trim() === '') return;
    
    const messageData = {
        sender_type: 'shop',
        message: messageText,
        timestamp: new Date().toISOString()
    };
    
    // 1. Adicionar à UI imediatamente
    appendMessage(messageData);
    
    input.value = '';
    
    try {
        // 2. Enviar para a API (que fará o emit para o cliente)
        await apiFetch(`/api/dashboard/chat-messages/${activeChatSessionId}`, {
            method: 'POST',
            body: { message: messageText }
        });
    } catch (error) {
        showToast('Erro ao enviar mensagem', 'error');
        input.value = messageText; // Devolver o texto ao input
    }
}

// Adicionar event listener para o formulário de chat
document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chat-send-form');
    if (chatForm) {
        chatForm.addEventListener('submit', handleSendChatMessage);
    }
});