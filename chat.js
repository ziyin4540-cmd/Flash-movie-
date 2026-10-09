let activeChatReceiver = null;
let chatRealtimeSubscription = null;

async function loadContactList() {
    const container = document.getElementById('contactListContainer');
    if(!container) return;

    const currentUser = localStorage.getItem('flash_logged_user');
    const { data: users, error } = await supabaseClient.from('flash_users').select('*').neq('username', currentUser);

    if(error || !users || users.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">စကားပြောရန် အခြား အကောင့် မရှိသေးပါ။</p>';
        return;
    }

    container.innerHTML = '';
    users.forEach(u => {
        const div = document.createElement('div');
        div.className = 'contact-item';
        div.onclick = () => openChatRoom(u.username, u.display_name, u.photo_url);
        div.innerHTML = `
            <img src="${u.photo_url || 'https://via.placeholder.com/35'}" class="contact-avatar">
            <div>
                <div style="font-weight:bold; font-size:0.85rem; color:#fff;">${escapeHtml(u.display_name || u.username)}</div>
                <div style="color:#888; font-size:0.75rem;">@${u.username}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

async function openChatRoom(username, displayName, photoUrl) {
    activeChatReceiver = username;
    const roomScreen = document.getElementById('chatRoomView');
    const sidebar = document.getElementById('chatSidebarView');

    if(sidebar) sidebar.classList.add('hidden');
    if(roomScreen) roomScreen.classList.remove('hidden');

    roomScreen.innerHTML = `
        <div class="chat-room-header">
            <button onclick="closeChatRoom()" style="background:none; border:none; color:#00ffff; font-weight:bold; cursor:pointer;">◄</button>
            <img src="${photoUrl || 'https://via.placeholder.com/35'}" class="contact-avatar">
            <div>
                <div style="color:#fff; font-size:0.9rem;">${escapeHtml(displayName || username)}</div>
                <div style="color:#00ffff; font-size:0.7rem;">@${username}</div>
            </div>
        </div>
        <div id="chatMessagesBody" class="chat-messages-body"></div>
        <div class="chat-input-footer">
            <input type="text" id="chatInputText" placeholder="Message ရေးရန်..." onkeypress="if(event.key==='Enter') sendChatMessage()">
            <button onclick="sendChatMessage()">Send</button>
        </div>
    `;

    loadChatMessages();
}

function closeChatRoom() {
    activeChatReceiver = null;
    const roomScreen = document.getElementById('chatRoomView');
    const sidebar = document.getElementById('chatSidebarView');
    if(roomScreen) roomScreen.classList.add('hidden');
    if(sidebar) sidebar.classList.remove('hidden');
}

async function loadChatMessages() {
    if(!activeChatReceiver) return;
    const currentUser = localStorage.getItem('flash_logged_user');
    const body = document.getElementById('chatMessagesBody');
    if(!body) return;

    const { data: msgs } = await supabaseClient.from('flash_chats')
        .select('*')
        .or(`and(sender.eq.${currentUser},receiver.eq.${activeChatReceiver}),and(sender.eq.${activeChatReceiver},receiver.eq.${currentUser})`)
        .order('created_at', { ascending: true });

    body.innerHTML = '';
    if(msgs) {
        msgs.forEach(m => {
            const isOut = m.sender === currentUser;
            const div = document.createElement('div');
            div.className = `chat-msg-bubble ${isOut ? 'outgoing' : 'incoming'}`;
            div.innerText = m.message;
            body.appendChild(div);
        });
        body.scrollTop = body.scrollHeight;
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInputText');
    if(!input) return;
    const msg = input.value.trim();
    if(!msg || !activeChatReceiver) return;

    const currentUser = localStorage.getItem('flash_logged_user');
    input.value = '';

    await supabaseClient.from('flash_chats').insert([{
        sender: currentUser,
        receiver: activeChatReceiver,
        message: msg,
        created_at: new Date().toISOString()
    }]);

    loadChatMessages();
}
