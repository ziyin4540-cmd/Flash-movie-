// Real-time Instant Chat Logic
async function openChatWithUser(targetUsername) {
    let chatPage = document.getElementById('page-chat-window');
    if (!chatPage) {
        chatPage = document.createElement('div');
        chatPage.id = 'page-chat-window';
        chatPage.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#070709; z-index:99999; overflow-y:auto; padding:15px; box-sizing:border-box;';
        document.body.appendChild(chatPage);
    }

    chatPage.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222233; padding-bottom:10px; margin-bottom:15px;">
            <button onclick="document.getElementById('page-chat-window').remove()" style="background:#222; color:#00ffff; border:1px solid #00ffff; padding:5px 10px; border-radius:6px; font-weight:bold; cursor:pointer;">◄ နောက်သို့ (Back)</button>
            <h3 style="color:#fff; margin:0; font-size:0.95rem;">💬 Chat with @${targetUsername}</h3>
        </div>

        <div id="chatMessagesBox" style="height:calc(100% - 130px); overflow-y:auto; margin-bottom:10px; background:#111116; border:1px solid #222233; border-radius:8px; padding:10px;"></div>

        <div style="display:flex; gap:8px; align-items:center;">
            <label style="background:#222; color:#00ffff; padding:8px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:bold;">📷<input type="file" id="chatPhotoPicker" accept="image/*" style="display:none;"></label>
            <input type="text" id="chatMsgInput" placeholder="မက်ဆေ့ခ်ျ ရေးပါ..." style="flex:1; padding:8px; background:#181820; border:1px solid #333; color:#fff; border-radius:6px; box-sizing:border-box;">
            <button onclick="sendChatMessage('${targetUsername}')" style="background:#00ffff; color:#000; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">ပို့မည်</button>
        </div>
    `;

    fetchChatMessages(targetUsername);

    document.getElementById('chatPhotoPicker')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            compressImageFile(file, (base64) => {
                sendChatMessage(targetUsername, base64);
            });
        }
    });
}

async function fetchChatMessages(targetUsername) {
    const currentUser = localStorage.getItem('flash_logged_user');
    const box = document.getElementById('chatMessagesBox');
    if (!box) return;

    try {
        const { data: msgs } = await supabaseClient.from('flash_chats')
            .select('*')
            .or(`and(sender.eq.${currentUser},receiver.eq.${targetUsername}),and(sender.eq.${targetUsername},receiver.eq.${currentUser})`)
            .order('created_at', { ascending: true });

        box.innerHTML = '';
        if (msgs && msgs.length > 0) {
            msgs.forEach(m => {
                const isMe = m.sender === currentUser;
                const div = document.createElement('div');
                div.style.cssText = `margin-bottom:8px; text-align:${isMe ? 'right' : 'left'};`;
                div.innerHTML = `
                    <div style="display:inline-block; padding:8px 12px; border-radius:8px; background:${isMe ? '#00ffff' : '#222233'}; color:${isMe ? '#000' : '#fff'}; max-width:75%; font-size:0.85rem; text-align:left;">
                        ${m.message_text ? `<div>${escapeHtml(m.message_text)}</div>` : ''}
                        ${m.media_url ? `<img src="${m.media_url}" style="width:100%; max-width:200px; border-radius:6px; margin-top:4px;">` : ''}
                    </div>
                `;
                box.appendChild(div);
            });
            box.scrollTop = box.scrollHeight;
        } else {
            box.innerHTML = '<p style="color:#666; text-align:center;">စကားပြောဆိုမှု မရှိသေးပါ။</p>';
        }
    } catch(e){}
}

async function sendChatMessage(targetUsername, photoBase64 = null) {
    const currentUser = localStorage.getItem('flash_logged_user');
    const input = document.getElementById('chatMsgInput');
    const msgText = input?.value.trim();
    if (!msgText && !photoBase64) return;

    if (input) input.value = '';

    await supabaseClient.from('flash_chats').insert([{
        sender: currentUser,
        receiver: targetUsername,
        message_text: msgText || '',
        media_url: photoBase64 || '',
        created_at: new Date().toISOString()
    }]);

    fetchChatMessages(targetUsername);
}
