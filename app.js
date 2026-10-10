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
        const { data: existing } = await supabaseClient.from('flash_users').select('username').eq('username', username).single();
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

    if(document.getElementById('profileNameDisplay')) document.getElementById('profileNameDisplay').innerText = user.display_name || username;
    if(document.getElementById('profileUserDisplay')) document.getElementById('profileUserDisplay').innerText = `@${username}`;
    if(document.getElementById('profileBioDisplay')) document.getElementById('profileBioDisplay').innerText = user.bio || '';
    if(user.photo_url && document.getElementById('profileImgDisplay')) document.getElementById('profileImgDisplay').src = user.photo_url;
    if(user.banner_url && document.getElementById('profileBannerBg')) document.getElementById('profileBannerBg').style.backgroundImage = `url('${user.banner_url}')`;

    let postsCount = 0;
    let videosCount = 0;
    let totalLikes = 0;

    if(userPosts) {
        userPosts.forEach(p => {
            if(p.is_video || p.media_type === 'video' || p.media_type === 'gdrive_video' || (p.media_url && p.media_url.includes('drive.google.com'))) videosCount++;
            else postsCount++;
            if(p.likes) totalLikes += p.likes.length;
        });
    }

    if(document.getElementById('statPosts')) document.getElementById('statPosts').innerText = postsCount;
    if(document.getElementById('statVideos')) document.getElementById('statVideos').innerText = videosCount;
    if(document.getElementById('statLikes')) document.getElementById('statLikes').innerText = totalLikes;

    const tabContent = document.getElementById('profileTabContent');
    if(!tabContent) return;

    tabContent.innerHTML = '';
    if(!userPosts || userPosts.length === 0) {
        tabContent.innerHTML = '<p style="color:#666; grid-column: 1 / -1; text-align:center; padding:20px;">ဘာမှ မရှိသေးပါ။</p>';
        return;
    }

    if(currentProfileTab === 'posts') {
        const filterPosts = userPosts.filter(p => !p.is_video && p.media_type !== 'gdrive_video' && !(p.media_url && p.media_url.includes('drive.google.com')));
        if(filterPosts.length === 0) {
            tabContent.innerHTML = '<p style="color:#666; grid-column: 1 / -1; text-align:center; padding:20px;">Posts မရှိသေးပါ။</p>';
            return;
        }
        filterPosts.forEach(p => {
            const item = document.createElement('div');
            item.style.cssText = 'background:#111116; border:1px solid #222233; border-radius:8px; padding:8px; position:relative;';
            item.innerHTML = `
                <p style="font-size:0.75rem; color:#fff; margin:0 0 5px 0; font-weight:bold;">${escapeHtml(p.post_text || '')}</p>
                ${p.media_url ? `<img src="${p.media_url}" style="width:100%; height:100px; object-fit:cover; border-radius:6px;">` : ''}
            `;
            tabContent.appendChild(item);
        });
    } else if(currentProfileTab === 'videos') {
        const filterVideos = userPosts.filter(p => p.is_video || p.media_type === 'video' || p.media_type === 'gdrive_video' || (p.media_url && p.media_url.includes('drive.google.com')));
        if(filterVideos.length === 0) {
            tabContent.innerHTML = '<p style="color:#666; grid-column: 1 / -1; text-align:center; padding:20px;">Videos မရှိသေးပါ။</p>';
            return;
        }
        filterVideos.forEach(v => {
            const item = document.createElement('div');
            item.style.cssText = 'background:#111116; border:1px solid #222233; border-radius:8px; overflow:hidden; position:relative;';
            item.innerHTML = `
                <div onclick="openWatchVideoScreen('${v.id}')" style="cursor:pointer;">
                    <div style="width:100%; height:80px; background:#000; display:flex; justify-content:center; align-items:center; color:#00ffff; font-weight:bold;">
                        ${(v.media_type === 'gdrive_video' || (v.media_url && v.media_url.includes('drive.google.com'))) ? '▶️ Drive' : `<video src="${v.media_url}" style="width:100%; height:100%; object-fit:cover;"></video>`}
                    </div>
                    <div style="padding:6px;">
                        <p style="font-size:0.75rem; color:#fff; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(v.post_text)}</p>
                    </div>
                </div>
            `;
            tabContent.appendChild(item);
        });
    }
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
