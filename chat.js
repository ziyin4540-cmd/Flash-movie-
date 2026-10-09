let activeChatUser = null;
let replyToMessageId = null;
let editingMessageId = null;
let tempChatMediaData = "";
let tempChatMediaType = "";

async function loadContactList(searchQuery = '') {
    const container = document.getElementById('contactListContainer');
    if(!container) return;

    const currentUser = localStorage.getItem('flash_logged_user');
    
    const { data: users } = await supabaseClient.from('flash_users').select('*').neq('username', currentUser);
    const { data: messages } = await supabaseClient.from('flash_chats')
        .select('*')
        .or(`sender.eq.${currentUser},receiver.eq.${currentUser}`);

    if(!users) return;

    let activeChatUsernames = new Set();
    if(messages) {
        messages.forEach(m => {
            if(m.sender === currentUser) activeChatUsernames.add(m.receiver);
            if(m.receiver === currentUser) activeChatUsernames.add(m.sender);
        });
    }

    let filteredUsers = users.filter(u => {
        const matchSearch = (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        if(searchQuery.trim() !== '') {
            return matchSearch;
        } else {
            return activeChatUsernames.has(u.username);
        }
    });

    container.innerHTML = '';
    if(filteredUsers.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px; font-size:0.85rem;">💬 လက်ရှိ ချတ်လုပ်ထားသူများ မရှိသေးပါ။ (အထက်ပါ Search တွင် ရှာဖွေနိုင်ပါသည်)</p>';
        return;
    }

    filteredUsers.forEach(u => {
        const div = document.createElement('div');
        div.className = 'contact-item';
        div.onclick = () => openChatRoom(u.username, u.display_name, u.photo_url);
        div.innerHTML = `
            <img src="${u.photo_url || 'https://via.placeholder.com/35'}" class="contact-avatar">
            <div>
                <div style="font-weight:bold; font-size:0.9rem;">${escapeHtml(u.display_name || u.username)}</div>
                <div style="color:#888; font-size:0.75rem;">@${u.username}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function filterContactList() {
    const q = document.getElementById('chatSearchInput').value;
    loadContactList(q);
}

async function openChatRoom(username, displayName, photoUrl) {
    activeChatUser = username;
    document.getElementById('chatListView').classList.add('hidden');
    document.getElementById('chatRoomView').classList.remove('hidden');
    document.getElementById('activeChatName').innerText = displayName || username;
    document.getElementById('activeChatAvatar').src = photoUrl || 'https://via.placeholder.com/35';
    
    // Chat Footer တွင် File Picker ထည့်သွင်းခြင်း
    ensureChatInputUI();
    loadChatMessages();
}

function ensureChatInputUI() {
    const footer = document.querySelector('.chat-input-footer');
    if(footer && !document.getElementById('chatMediaPicker')) {
        footer.innerHTML = `
            <input type="file" id="chatMediaPicker" accept="image/*,video/*" style="display:none;">
            <button onclick="document.getElementById('chatMediaPicker').click()" style="background:#181820; color:#00ffff; border:1px solid #333344; padding:8px 12px; border-radius:8px; cursor:pointer;" title="Photo/Video ပို့ရန်">📎</button>
            <input type="text" id="chatMessageInput" placeholder="မက်ဆေ့ချ် ရေးရန်..." onkeydown="if(event.key === 'Enter') sendChatMessage()">
            <button onclick="sendChatMessage()">ပေးပို့</button>
        `;

        document.getElementById('chatMediaPicker').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                if(file.size > 5 * 1024 * 1024) {
                    showToast('⚠️ ဖိုင်ဆိုဒ် ကြီးလွန်းပါသည် (5MB အောက်သာ)', 'error');
                    return;
                }
                tempChatMediaType = file.type.startsWith('image') ? 'image' : 'video';
                const reader = new FileReader();
                reader.onload = (ev) => {
                    tempChatMediaData = ev.target.result;
                    showToast('📎 ဖိုင်တွဲပြီးပါပြီ။ Send နှိပ်ပါ။', 'success');
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function closeChatRoom() {
    activeChatUser = null;
    document.getElementById('chatRoomView').classList.add('hidden');
    document.getElementById('chatListView').classList.remove('hidden');
    loadContactList();
}

async function loadChatMessages() {
    const currentUser = localStorage.getItem('flash_logged_user');
    const container = document.getElementById('chatMessagesContainer');
    if(!container || !activeChatUser) return;

    const { data: messages, error } = await supabaseClient.from('flash_chats')
        .select('*')
        .or(`and(sender.eq.${currentUser},receiver.eq.${activeChatUser}),and(sender.eq.${activeChatUser},receiver.eq.${currentUser})`)
        .order('created_at', { ascending: true });

    if(error || !messages) return;

    container.innerHTML = '';
    messages.forEach(msg => {
        const isOutgoing = msg.sender === currentUser;
        const div = document.createElement('div');
        div.className = `chat-msg-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
        if(msg.is_pinned) div.style.border = '1px solid #ff0033';

        let replyHtml = msg.reply_to ? `<div style="font-size:0.75rem; background:rgba(0,0,0,0.2); padding:3px 6px; border-radius:4px; margin-bottom:4px; border-left:2px solid #00ffff;">↳ ${escapeHtml(msg.reply_text || 'Reply')}</div>` : '';
        let pinBadge = msg.is_pinned ? `<span style="color:#ff0033; font-size:0.65rem;">📌 Pin</span> ` : '';
        
        let mediaHtml = '';
        if(msg.media_url) {
            mediaHtml = msg.media_type === 'image' ? `<img src="${msg.media_url}" width="100%" style="border-radius:6px; margin-top:6px; max-height:200px; object-fit:cover;">` : `<video src="${msg.media_url}" controls width="100%" style="border-radius:6px; margin-top:6px; background:#000;"></video>`;
        }

        div.innerHTML = `
            ${replyHtml}
            <div>${pinBadge}${escapeHtml(msg.message || '')}</div>
            ${mediaHtml}
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:4px; font-size:0.65rem; opacity:0.8;">
                <span onclick="setReplyMessage('${msg.id}', '${escapeHtml(msg.message || 'Media')}')" style="cursor:pointer;">Reply</span>
                ${isOutgoing ? `<span onclick="startEditMessage('${msg.id}', '${escapeHtml(msg.message || '')}')" style="cursor:pointer;">Edit</span>` : ''}
                <span onclick="togglePinMessage('${msg.id}', ${!msg.is_pinned})" style="cursor:pointer;">Pin</span>
                <span onclick="deleteChatMessage('${msg.id}')" style="color:#ff0033; cursor:pointer;">Delete</span>
            </div>
        `;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chatMessageInput');
    const text = input ? input.value.trim() : '';
    const currentUser = localStorage.getItem('flash_logged_user');
    if((!text && !tempChatMediaData) || !activeChatUser) return;

    if(editingMessageId) {
        await supabaseClient.from('flash_chats').update({ message: text }).eq('id', editingMessageId);
        editingMessageId = null;
        if(input) input.value = '';
        loadChatMessages();
        return;
    }

    const { error } = await supabaseClient.from('flash_chats').insert([{
        sender: currentUser,
        receiver: activeChatUser,
        message: text,
        media_url: tempChatMediaData,
        media_type: tempChatMediaType,
        reply_to: replyToMessageId,
        reply_text: replyToMessageId ? text : null,
        is_pinned: false,
        created_at: new Date().toISOString()
    }]);

    if(!error) {
        if(input) input.value = '';
        replyToMessageId = null;
        tempChatMediaData = "";
        tempChatMediaType = "";
        loadChatMessages();
    } else {
        showToast('❌ မက်ဆေ့ချ် ပို့၍မရပါ: ' + error.message, 'error');
    }
}

function setReplyMessage(id, text) {
    replyToMessageId = id;
    showToast(`Reply to: ${text}`, 'success');
}

function startEditMessage(id, currentText) {
    editingMessageId = id;
    document.getElementById('chatMessageInput').value = currentText;
    document.getElementById('chatMessageInput').focus();
}

async function togglePinMessage(id, pinStatus) {
    await supabaseClient.from('flash_chats').update({ is_pinned: pinStatus }).eq('id', id);
    loadChatMessages();
    showToast(pinStatus ? 'Pinned' : 'Unpinned', 'success');
}

async function deleteChatMessage(id) {
    if(confirm('ဤမက်ဆေ့ချ်ကို ဖျက်မည်မှာ သေချာပါသလား?')) {
        await supabaseClient.from('flash_chats').delete().eq('id', id);
        loadChatMessages();
        showToast('ဖျက်ပြီးပါပြီ', 'success');
    }
}
