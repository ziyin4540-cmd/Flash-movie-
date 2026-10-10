let currentProfileTab = 'posts';

window.addEventListener('load', () => {
    runIntroTypingEffect();
    startRealTimeTimer();
    checkUserSession();
    setupProfilePhotoListeners();
});

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
                }, 400);
            }
        }
        type();
    } else {
        setTimeout(() => {
            const introScreen = document.getElementById('intro-screen');
            if(introScreen) introScreen.classList.add('hidden');
            checkUserSession();
        }, 800);
    }
}

function checkUserSession() {
    const loggedUser = localStorage.getItem('flash_logged_user');
    const introScreen = document.getElementById('intro-screen');
    if(introScreen && !introScreen.classList.contains('hidden')) return;

    if (!loggedUser) {
        document.getElementById('page-auth').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    } else {
        document.getElementById('page-auth').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');

        if(typeof switchMainPage === 'function') {
            switchMainPage('home');
        }
    }
}

// 🔑 LOGIN HANDLE FUNCTION (သေချာ ပြင်ဆင်ထားသော စနစ်)
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

        // Login အောင်မြင်ပါက Session သိမ်းဆည်းခြင်း
        localStorage.setItem('flash_logged_user', username);
        uInput.value = '';
        pInput.value = '';

        showToast(`✅ မင်္ဂလာပါ @${username}`, 'success');

        document.getElementById('page-auth').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');

        if(typeof switchMainPage === 'function') {
            switchMainPage('home');
        }
    } catch(err) {
        showToast('❌ Login ဝင်၍မရပါ: ' + err.message, 'error');
    }
}

// 📝 REGISTER HANDLE FUNCTION
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
        document.getElementById('page-auth').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        if(typeof switchMainPage === 'function') switchMainPage('home');
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

// ⚡ Local Storage Instant Cache ပါသော Profile Loader
async function loadUserProfile(username) {
    const cachedProfile = localStorage.getItem(`flash_cache_profile_${username}`);
    if(cachedProfile) {
        renderUserProfileUI(JSON.parse(cachedProfile), username);
    }

    try {
        const { data: user } = await supabaseClient.from('flash_users').select('*').eq('username', username).single();
        const { data: userPosts } = await supabaseClient.from('flash_posts').select('*').eq('username', username).order('created_at', { ascending: false });
        const { count: followersCount } = await supabaseClient.from('flash_follows').select('*', { count: 'exact', head: true }).eq('following_id', username);
        const { count: followingCount } = await supabaseClient.from('flash_follows').select('*', { count: 'exact', head: true }).eq('follower_id', username);

        if(user) {
            const profileData = { user, userPosts: userPosts || [], followersCount: followersCount || 0, followingCount: followingCount || 0 };
            localStorage.setItem(`flash_cache_profile_${username}`, JSON.stringify(profileData));
            renderUserProfileUI(profileData, username);
        }
    } catch(err) {
        console.error(err);
    }
}

function renderUserProfileUI(data, username) {
    const { user, userPosts, followersCount, followingCount } = data;

    if(document.getElementById('profileNameDisplay')) document.getElementById('profileNameDisplay').innerText = user.display_name || username;
    if(document.getElementById('profileUserDisplay')) document.getElementById('profileUserDisplay').innerText = `@${username}`;
    if(document.getElementById('profileBioDisplay')) document.getElementById('profileBioDisplay').innerText = user.bio || '';
    if(user.photo_url && document.getElementById('profileImgDisplay')) document.getElementById('profileImgDisplay').src = user.photo_url;
    if(user.banner_url && document.getElementById('profileBannerBg')) document.getElementById('profileBannerBg').style.backgroundImage = `url('${user.banner_url}')`;

    if(document.getElementById('statFollowers')) document.getElementById('statFollowers').innerText = followersCount || 0;
    if(document.getElementById('statFollowing')) document.getElementById('statFollowing').innerText = followingCount || 0;

    let postsCount = 0;
    let videosCount = 0;
    let totalLikes = 0;

    if(userPosts) {
        userPosts.forEach(p => {
            if(p.is_video || p.media_type === 'video' || p.media_type === 'gdrive_video' || p.media_type === 'telegram_video') videosCount++;
            else postsCount++;
            if(p.likes) totalLikes += p.likes.length;
        });
    }

    if(document.getElementById('statPosts')) document.getElementById('statPosts').innerText = postsCount;
    if(document.getElementById('statVideos')) document.getElementById('statVideos').innerText = videosCount;
    if(document.getElementById('statLikes')) document.getElementById('statLikes').innerText = totalLikes;

    const tabContent = document.getElementById('profileTabContent');
    if(!tabContent) return;

    const loggedUser = localStorage.getItem('flash_logged_user');
    const isOwner = loggedUser === username;

    tabContent.innerHTML = '';
    if(!userPosts || userPosts.length === 0) {
        tabContent.innerHTML = '<p style="color:#666; grid-column: 1 / -1; text-align:center; padding:20px;">ဘာမှ မရှိသေးပါ။</p>';
        return;
    }

    if(currentProfileTab === 'posts') {
        const filterPosts = userPosts.filter(p => !p.is_video && p.media_type !== 'gdrive_video' && p.media_type !== 'telegram_video');
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
                ${isOwner ? `<button onclick="deleteUserPost('${p.id}')" style="background:#ff0033; color:#fff; border:none; padding:2px 6px; border-radius:4px; font-size:0.65rem; cursor:pointer; margin-top:5px; font-weight:bold; width:100%;">🗑 Delete</button>` : ''}
            `;
            tabContent.appendChild(item);
        });
    } else if(currentProfileTab === 'playlists') {
        let playlistsMap = {};
        userPosts.filter(p => p.playlist).forEach(p => {
            playlistsMap[p.playlist] = (playlistsMap[p.playlist] || 0) + 1;
        });

        const keys = Object.keys(playlistsMap);
        if(keys.length === 0) {
            tabContent.innerHTML = '<p style="color:#666; grid-column: 1 / -1; text-align:center; padding:20px;">Playlists မရှိသေးပါ။</p>';
            return;
        }

        keys.forEach(pl => {
            const item = document.createElement('div');
            item.style.cssText = 'background:#181820; border:1px solid #00ffff; border-radius:8px; padding:12px; text-align:center; cursor:pointer;';
            item.onclick = () => openPlaylistFolder(pl, username);
            item.innerHTML = `
                <div style="font-size:1.5rem; margin-bottom:4px;">📂</div>
                <div style="font-size:0.85rem; font-weight:bold; color:#00ffff;">${escapeHtml(pl)}</div>
                <div style="font-size:0.7rem; color:#aaa; margin-top:2px;">${playlistsMap[pl]} Videos</div>
            `;
            tabContent.appendChild(item);
        });
    } else if(currentProfileTab === 'videos') {
        const filterVideos = userPosts.filter(p => p.is_video || p.media_type === 'video' || p.media_type === 'gdrive_video' || p.media_type === 'telegram_video');
        if(filterVideos.length === 0) {
            tabContent.innerHTML = '<p style="color:#666; grid-column: 1 / -1; text-align:center; padding:20px;">Videos မရှိသေးပါ။</p>';
            return;
        }

        filterVideos.forEach(v => {
            const item = document.createElement('div');
            item.style.cssText = 'background:#111116; border:1px solid #222233; border-radius:8px; overflow:hidden; position:relative;';
            item.innerHTML = `
                <div onclick="openWatchVideoScreen('${v.id}')" style="cursor:pointer;">
                    <div style="width:100%; height:80px; background:#000; display:flex; justify-content:center; align-items:center; color:#00ffff;">
                        ${v.media_type === 'gdrive_video' ? '▶️ Drive' : (v.media_type === 'telegram_video' ? '🎬 Telegram' : `<video src="${v.media_url}" style="width:100%; height:100%; object-fit:cover;"></video>`)}
                    </div>
                    <div style="padding:6px;">
                        <p style="font-size:0.75rem; color:#fff; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(v.post_text)}</p>
                    </div>
                </div>
                ${isOwner ? `<button onclick="deleteUserPost('${v.id}')" style="background:#ff0033; color:#fff; border:none; padding:2px 6px; border-radius:0 0 8px 8px; font-size:0.65rem; cursor:pointer; font-weight:bold; width:100%;">🗑 Delete</button>` : ''}
            `;
            tabContent.appendChild(item);
        });
    }
}

function setupProfilePhotoListeners() {
    const profilePicker = document.getElementById('profilePhotoPicker');
    const bgPicker = document.getElementById('bgPhotoPicker');

    if(profilePicker) {
        profilePicker.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                compressImageFile(file, async (base64) => {
                    const user = localStorage.getItem('flash_logged_user');
                    const { error } = await supabaseClient.from('flash_users').update({ photo_url: base64 }).eq('username', user);
                    if(!error) {
                        showToast('✅ Profile ပုံ ပြောင်းလဲပြီးပါပြီ။', 'success');
                        loadUserProfile(user);
                    }
                });
            }
        });
    }

    if(bgPicker) {
        bgPicker.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                compressImageFile(file, async (base64) => {
                    const user = localStorage.getItem('flash_logged_user');
                    const { error } = await supabaseClient.from('flash_users').update({ banner_url: base64 }).eq('username', user);
                    if(!error) {
                        showToast('✅ Background ပုံ ပြောင်းလဲပြီးပါပြီ။', 'success');
                        loadUserProfile(user);
                    }
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
    let seconds = 5 * 3600 + 30 * 60;
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
