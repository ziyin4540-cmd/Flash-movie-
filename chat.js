let activeChatUser = null;

async function loadContactList() {
    const container = document.getElementById('contactListContainer');
    if(!container) return;
    container.innerHTML = '';
    
    const currentUser = localStorage.getItem('flash_logged_user');
    const { data: users } = await supabaseClient.from('flash_users').select('*').neq('username', currentUser);

    if(!users || users.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.8rem; text-align: center; padding: 20px;">အခြားအသုံးပြုသူ မရှိသေးပါ။</p>';
        return;
    }

    users.forEach(u => {
        const div = document.createElement('div');
        div.className = 'contact-item';
        div.onclick = () => openChatRoom(u.username, u.display_name || u.username);
        div.innerHTML = `
            <img src="${u.photo_url || 'https://via.placeholder.com/35'}" class="contact-avatar">
            <div>
                <div style="font-weight: bold; font-size: 0.9rem;">${escapeHtml(u.display_name || u.username)}</div>
                <div style="color: #888; font-size: 0.75rem;">@${u.username}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function openChatRoom(username, displayName) {
    activeChatUser = username;
    document.getElementById('activeChatHeader').innerText = `Chat with ${displayName}`;
    document.getElementById('chatListView').classList.add('hidden');
    document.getElementById('chatRoomView').classList.remove('hidden');
    loadActiveChatMessages();
}

function backToChatList() {
    activeChatUser = null;
    document.getElementById('chatRoomView').classList.add('hidden');
    document.getElementById('chatListView').classList.remove('hidden');
    loadContactList();
}

async function sendChatMessage() {
    const input = document.getElementById('chatMessageInput');
    const text = input.value.trim();
    const currentUser = localStorage.getItem('flash_logged_user');
    if(!activeChatUser || !text) return;

    await supabaseClient.from('flash_chats').insert([{ sender: currentUser, receiver: activeChatUser, message: text }]);
    input.value = '';
    loadActiveChatMessages();
}

async function loadActiveChatMessages() {
    const container = document.getElementById('activeChatMessages');
    const currentUser = localStorage.getItem('flash_logged_user');
    if(!container || !activeChatUser) return;

    const { data: messages } = await supabaseClient
        .from('flash_chats')
        .select('*')
        .or(`and(sender.eq.${currentUser},receiver.eq.${activeChatUser}),and(sender.eq.${activeChatUser},receiver.eq.${currentUser})`)
        .order('created_at', { ascending: true });

    container.innerHTML = '';
    if(!messages || messages.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; margin-top: 40px;">မက်ဆေ့ချ် မရှိသေးပါ။</p>';
        return;
    }

    messages.forEach(m => {
        const div = document.createElement('div');
        div.className = `chat-msg-bubble ${m.sender === currentUser ? 'outgoing' : 'incoming'}`;
        div.innerText = m.message;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}
