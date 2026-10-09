let activeChatUser = null;

function loadContactList() {
    const container = document.getElementById('contactListContainer');
    if(!container) return;
    container.innerHTML = '';
    
    let users = [];
    for (let i = 0; i < localStorage.length; i++) {
        let key = localStorage.key(i);
        if (key.startsWith('flash_user_data_')) {
            let uname = key.replace('flash_user_data_', '');
            let udata = JSON.parse(localStorage.getItem(key));
            users.push({ username: uname, displayName: udata.displayName || uname, photo: udata.photo || 'https://via.placeholder.com/35' });
        }
    }

    const currentUser = localStorage.getItem('flash_logged_user');
    users = users.filter(u => u.username !== currentUser);

    if(users.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.8rem; text-align: center; padding: 20px;">အခြားအသုံးပြုသူ မရှိသေးပါ။</p>';
        return;
    }

    users.forEach(u => {
        const div = document.createElement('div');
        div.className = 'contact-item';
        div.onclick = () => openChatRoom(u.username, u.displayName);
        div.innerHTML = `
            <img src="${u.photo}" class="contact-avatar">
            <div>
                <div style="font-weight: bold; font-size: 0.9rem;">${escapeHtml(u.displayName)}</div>
                <div style="color: #888; font-size: 0.75rem;">@${u.username}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function openChatRoom(username, displayName) {
    activeChatUser = username;
    document.getElementById('activeChatHeader').innerText = `💬 Chat with ${displayName} (@${username})`;
    loadActiveChatMessages();
}

function sendChatMessage() {
    const input = document.getElementById('chatMessageInput');
    const text = input.value.trim();
    const currentUser = localStorage.getItem('flash_logged_user');

    if(!activeChatUser) {
        alert('ကျေးဇူးပြု၍ စကားပြောမည့်သူကို ရွေးချယ်ပါ။');
        return;
    }

    if(text) {
        let chatKey = 'flash_chat_' + [currentUser, activeChatUser].sort().join('_');
        let messages = JSON.parse(localStorage.getItem(chatKey) || '[]');
        messages.push({ sender: currentUser, text: text, time: Date.now() });
        localStorage.setItem(chatKey, JSON.stringify(messages));
        input.value = '';
        loadActiveChatMessages();
    }
}

function loadActiveChatMessages() {
    const container = document.getElementById('activeChatMessages');
    const currentUser = localStorage.getItem('flash_logged_user');
    if(!container) return;
    container.innerHTML = '';

    if(!activeChatUser) {
        container.innerHTML = '<p style="color: #666; text-align: center; margin-top: 40px;">စကားပြောရန် လူတစ်ဦးကို ရွေးပါ</p>';
        return;
    }

    let chatKey = 'flash_chat_' + [currentUser, activeChatUser].sort().join('_');
    let messages = JSON.parse(localStorage.getItem(chatKey) || '[]');

    if(messages.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; margin-top: 40px;">မက်ဆေ့ချ် မရှိသေးပါ။ စတင်ပြောဆိုနိုင်ပါသည်။</p>';
        return;
    }

    messages.forEach(m => {
        const div = document.createElement('div');
        div.className = `chat-msg-bubble ${m.sender === currentUser ? 'outgoing' : 'incoming'}`;
        div.innerText = m.text;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}
