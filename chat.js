let activeChatReceiver = null;
let tempChatAttachment = "";

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
            <label style="color:#00ffff; font-size:1.2rem; cursor:pointer; padding:0 5px;">
                📎
                <input type="file" id="chatFilePicker" style="display:none;" onchange="handleChatFileSelect(event)">
            </label>
            <input type="text" id="chatInputText" placeholder="Message ရေးရန်..." onkeypress="if(event.key==='Enter') sendChatMessage()">
            <button onclick="sendChatMessage()">Send</button>
        </div>
        <div id="chatFilePreviewName" style="font-size:0.7rem; color:#00ffff; padding:2px 10px; background:#14141c;"></div>
    `;

    loadChatMessages();
}

function handleChatFileSelect(e) {
    const file = e.target.files[0];
    if(file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            tempChatAttachment = ev.target.result;
            document.getElementById('chatFilePreviewName').innerText = `ရွေးပြီး: ${file.name}`;
        };
        reader.readAsDataURL(file);
    }
}

function closeChatRoom() {
    activeChatReceiver = null;
    tempChatAttachment = "";
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
            
            let contentHtml = escapeHtml(m.message);
            if(m.attachment_url) {
                if(m.attachment_url.startsWith('data:image')) {
                    contentHtml += `<br><img src="${m.attachment_url}" style="max-width:100%; border-radius:6px; margin-top:5px;">`;
                } else if(m.attachment_url.startsWith('data:video')) {
                    contentHtml += `<br><video src="${m.attachment_url}" controls style="max-width:100%; border-radius:6px; margin-top:5px;"></video>`;
                }
            }

            div.innerHTML = contentHtml;
            body.appendChild(div);
        });
        body.scrollTop = body.scrollHeight;
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInputText');
    if(!input) return;
    const msg = input.value.trim();
    if((!msg && !tempChatAttachment) || !activeChatReceiver) return;

    const currentUser = localStorage.getItem('flash_logged_user');
    input.value = '';

    await supabaseClient.from('flash_chats').insert([{
        sender: currentUser,
        receiver: activeChatReceiver,
        message: msg,
        attachment_url: tempChatAttachment,
        created_at: new Date().toISOString()
    }]);

    tempChatAttachment = "";
    const prevElem = document.getElementById('chatFilePreviewName');
    if(prevElem) prevElem.innerText = "";

    loadChatMessages();
}
