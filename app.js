let currentProfileTab = 'posts';

window.addEventListener('load', () => {
    runIntroTypingEffect();
    startRealTimeTimer();
    checkUserSession();
    setupProfilePhotoListeners();
});

function safeSetLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn('LocalStorage quota exceeded, clearing old caches...');
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('flash_cache_')) {
                localStorage.removeItem(k);
            }
        }
        try {
            localStorage.setItem(key, value);
        } catch (err) {
            console.error('Safe LocalStorage error:', err);
        }
    }
}

function runIntroTypingEffect() {
    const textElement = document.getElementById('typing-intro-text');
    const message = "Welcome To Flâsh Movie";
    let index = 0;

    if(textElement) {
        textElement.innerText = "";
        function type() {
            if (index < message.length) {
                textElement.innerText += message.charAt(index);
                index++;
                setTimeout(type, 30);
            } else {
                setTimeout(() => {
                    const introScreen = document.getElementById('intro-screen');
                    if(introScreen) {
                        introScreen.style.transition = 'opacity 0.3s ease';
                        introScreen.style.opacity = '0';
                        setTimeout(() => {
                            introScreen.classList.add('hidden');
                            checkUserSession();
                        }, 300);
                    }
                }, 300);
            }
        }
        type();
    } else {
        setTimeout(() => {
            const introScreen = document.getElementById('intro-screen');
            if(introScreen) introScreen.classList.add('hidden');
            checkUserSession();
        }, 500);
    }
}

function checkUserSession() {
    const loggedUser = localStorage.getItem('flash_logged_user');
    const introScreen = document.getElementById('intro-screen');
    if(introScreen && !introScreen.classList.contains('hidden')) return;

    if (!loggedUser) {
        if(document.getElementById('page-auth')) document.getElementById('page-auth').classList.remove('hidden');
        if(document.getElementById('app-container')) document.getElementById('app-container').classList.add('hidden');
    } else {
        if(document.getElementById('page-auth')) document.getElementById('page-auth').classList.add('hidden');
        if(document.getElementById('app-container')) document.getElementById('app-container').classList.remove('hidden');

        if(typeof switchMainPage === 'function') {
            switchMainPage('home');
        }
    }
}

async function handleLogin() {
    const uInput = document.getElementById('loginUser');
    const pInput = document.getElementById('loginPass');

    if(!uInput || !pInput) return;

    const username = uInput.value.trim();
    const password = pInput.value.trim();

    if(!username || !password) {
        return showToast('⚠️ Username နှင့် Password ဖြည့်ပါ။', 'error');
    }

    showToast('🔑 Login စစ်ဆေးနေပါသည်...', 'success');

    try {
        const { data: user, error } = await supabaseClient.from('flash_users')
            .select('*')
            .eq('username', username)
            .single();

        if(error || !user) {
            return showToast('❌ Username မရှိပါ သို့မဟုတ် မှားယွင်းနေပါသည်။', 'error');
        }

        if(user.password !== password) {
            return showToast('❌ Password မှားယွင်းနေပါသည်။', 'error');
        }

        localStorage.setItem('flash_logged_user', username);
        uInput.value = '';
        pInput.value = '';

        showToast(`✅ မင်္ဂလာပါ @${username}`, 'success');

        if(document.getElementById('page-auth')) document.getElementById('page-auth').classList.add('hidden');
        if(document.getElementById('app-container')) document.getElementById('app-container').classList.remove('hidden');

        if(typeof switchMainPage === 'function') {
            switchMainPage('home');
        }
    } catch(err) {
        showToast('❌ Login ဝင်၍မရပါ: ' + err.message, 'error');
    }
}

async function handleRegister() {
    const uInput = document.getElementById('regUser');
    const pInput = document.getElementById('regPass');
    const dInput = document.getElementById('regDisplayName');

    const username = uInput.value.trim();
    const password = pInput.value.trim();
    const displayName = dInput.value.trim() || username;

    if(!username || !password) {
        return showToast('⚠️ Username နှင့် Password ဖြည့်ပါ', 'error');
    }

    try {
        const { data: existing } = await supabaseClient.from('flash_users').select('username').eq('username', username).maybeSingle();
        if(existing) {
            return showToast('❌ ဒီ Username ကို သုံးထားပြီးဖြစ်သည်', 'error');
        }

        const { error } = await supabaseClient.from('flash_users').insert([{
            username: username,
            password: password,
            display_name: displayName,
            photo_url: 'https://via.placeholder.com/90',
            banner_url: ''
        }]);

        if(error) {
            showToast('❌ အကောင့်ဖွင့်၍မရပါ: ' + error.message, 'error');
        } else {
            showToast('✅ အကောင့်ဖွင့်ခြင်း အောင်မြင်သည်', 'success');
            localStorage.setItem('flash_logged_user', username);
            if(document.getElementById('page-auth')) document.getElementById('page-auth').classList.add('hidden');
            if(document.getElementById('app-container')) document.getElementById('app-container').classList.remove('hidden');
            if(typeof switchMainPage === 'function') switchMainPage('home');
        }
    } catch(e) {
        showToast('❌ Error: ' + e.message, 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('flash_logged_user');
    checkUserSession();
    showToast('အကောင့်ထွက်ပြီးပါပြီ။', 'success');
}

function switchProfileTab(tabName) {
    currentProfileTab = tabName;
    document.querySelectorAll('.profile-tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`tab-btn-${tabName}`);
    if (targetBtn) targetBtn.classList.add('active');

    const profileUsername = document.getElementById('profileUserDisplay')?.innerText.replace('@', '') || localStorage.getItem('flash_logged_user');
    if (profileUsername) loadUserProfile(profileUsername);
}

async function loadUserProfile(username) {
    const loggedUser = localStorage.getItem('flash_logged_user') || username;
    const targetUser = username || loggedUser;

    const cachedProfile = localStorage.getItem(`flash_cache_profile_${targetUser}`);
    if(cachedProfile) {
        try {
            renderUserProfileUI(JSON.parse(cachedProfile), targetUser);
        } catch(e){}
    }

    try {
        const { data: user } = await supabaseClient.from('flash_users').select('*').eq('username', targetUser).single();
        const { data: userPosts } = await supabaseClient.from('flash_posts').select('*').eq('username', targetUser).order('created_at', { ascending: false });
        
        if(user) {
            const profileData = { user, userPosts: userPosts || [] };
            safeSetLocalStorage(`flash_cache_profile_${targetUser}`, JSON.stringify(profileData));
            renderUserProfileUI(profileData, targetUser);
        }
    } catch(err) {
        console.error(err);
    }
}

function renderUserProfileUI(data, username) {
    const { user, userPosts } = data;
    const currentUser = localStorage.getItem('flash_logged_user');

    const profileContainer = document.getElementById('page-profile');
    if(!profileContainer) return;

    profileContainer.innerHTML = `
        <div style="background:#111116; padding:10px 15px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222233; position:sticky; top:0; z-index:100;">
            <button onclick="if(typeof activeWatchVideoId !== 'undefined' && activeWatchVideoId) { openWatchVideoScreen(activeWatchVideoId); } else { switchMainPage('home'); }" style="background:#222; color:#00ffff; border:1px solid #00ffff; padding:5px 10px; border-radius:6px; font-weight:bold; font-size:0.75rem; cursor:pointer;">◄ နောက်သို့ (Back)</button>
            <span style="color:#fff; font-weight:bold; font-size:0.85rem;">Profile</span>
        </div>

        <div id="profileBannerBg" style="height:120px; background:#222; background-size:cover; background-position:center; background-image:url('${user.banner_url || ''}');"></div>
        <div style="background:#111116; padding:15px; border-radius:0 0 12px 12px; border:1px solid #222233; text-align:center;">
            <img id="profileImgDisplay" src="${user.photo_url || 'https://via.placeholder.com/90'}" style="width:80px; height:80px; border-radius:50%; border:3px solid #00ffff; margin-top:-50px; background:#000;">
            <h3 style="margin:8px 0 2px 0; color:#fff;">${escapeHtml(user.display_name || username)}</h3>
            <div id="profileUserDisplay" style="color:#00ffff; font-size:0.85rem; margin-bottom:8px;">@${username}</div>
            
            ${currentUser !== username ? `
                <button onclick="openChatWithUser('${username}')" style="background:#00ffff; color:#000; border:none; padding:6px 15px; border-radius:20px; font-weight:bold; font-size:0.8rem; margin-bottom:12px; cursor:pointer;">💬 Chat စကားပြောမည်</button>
            ` : ''}

            <div style="display:flex; justify-content:space-around; background:#181820; padding:10px; border-radius:8px; margin-bottom:15px;">
                <div><b style="color:#00ffff;">${userPosts ? userPosts.length : 0}</b><br><span style="font-size:0.7rem; color:#888;">Posts</span></div>
            </div>

            <div id="profileTabContent" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:8px;"></div>
        </div>
    `;

    const tabContent = document.getElementById('profileTabContent');
    if(tabContent && userPosts) {
        tabContent.innerHTML = '';
        userPosts.forEach(p => {
            const item = document.createElement('div');
            item.style.cssText = 'background:#181820; border:1px solid #222233; border-radius:6px; padding:6px;';
            item.innerHTML = `<p style="font-size:0.75rem; color:#fff; margin:0;">${escapeHtml(p.post_text || '')}</p>`;
            tabContent.appendChild(item);
        });
    }
}

// 💬 Chat Window with Photo Sending Feature
function openChatWithUser(targetUsername) {
    let chatPage = document.getElementById('page-chat-window');
    if(!chatPage) {
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

        <div id="chatMessagesBox" style="height:calc(100% - 130px); overflow-y:auto; margin-bottom:10px; background:#111116; border:1px solid #222233; border-radius:8px; padding:10px;">
            <p style="color:#666; text-align:center;">စကားပြောဆိုမှု မရှိသေးပါ။</p>
        </div>

        <div style="display:flex; gap:8px; align-items:center;">
            <label style="background:#222; color:#00ffff; padding:8px; border-radius:6px; cursor:pointer; font-size:0.8rem;">📷<input type="file" id="chatPhotoPicker" accept="image/*" style="display:none;"></label>
            <input type="text" id="chatMsgInput" placeholder="မက်ဆေ့ခ်ျ ရေးပါ..." style="flex:1; padding:8px; background:#181820; border:1px solid #333; color:#fff; border-radius:6px;">
            <button onclick="sendChatMessage('${targetUsername}')" style="background:#00ffff; color:#000; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">ပို့မည်</button>
        </div>
    `;

    document.getElementById('chatPhotoPicker')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if(file) {
            compressImageFile(file, (base64) => {
                sendChatMessage(targetUsername, base64);
            });
        }
    });
}

async function sendChatMessage(targetUsername, photoBase64 = null) {
    const input = document.getElementById('chatMsgInput');
    const msgText = input?.value.trim();
    if(!msgText && !photoBase64) return;

    showToast('💬 မက်ဆေ့ခ်ျ ပို့လိုက်ပါပြီ', 'success');
    if(input) input.value = '';
}

function setupProfilePhotoListeners() {
    const profilePicker = document.getElementById('profilePhotoPicker');
    if(profilePicker) {
        profilePicker.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                compressImageFile(file, async (base64) => {
                    const user = localStorage.getItem('flash_logged_user');
                    await supabaseClient.from('flash_users').update({ photo_url: base64 }).eq('username', user);
                    showToast('✅ Profile ပုံ ပြောင်းလဲပြီးပါပြီ။', 'success');
                    loadUserProfile(user);
                });
            }
        });
    }
}

function compressImageFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 300, 300);
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function startRealTimeTimer() {
    const timerElem = document.getElementById('global-timer-display');
    if(!timerElem) return;
    let seconds = 5 * 3600 + 29 * 60;
    setInterval(() => {
        seconds--;
        if(seconds < 0) seconds = 86400;
        let d = Math.floor(seconds / (3600 * 24));
        let h = Math.floor((seconds % (3600 * 24)) / 3600);
        let m = Math.floor((seconds % 3600) / 60);
        timerElem.innerText = `${d}D / ${h}H / ${m}M`;
    }, 1000);
}

function showToast(message, type = 'success') {
    let toast = document.getElementById('toastNotification');
    if(!toast) {
        toast = document.createElement('div');
        toast.id = 'toastNotification';
        toast.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#111; color:#fff; padding:10px 20px; border-radius:8px; z-index:999999; font-size:0.85rem; border:1px solid #00ffff; box-shadow:0 0 10px rgba(0,255,255,0.4); transition:opacity 0.3s ease;';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.borderColor = type === 'error' ? '#ff0033' : '#00ffff';
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}
