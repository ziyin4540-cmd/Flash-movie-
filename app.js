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
                setTimeout(type, 40);
            } else {
                setTimeout(() => {
                    const introScreen = document.getElementById('intro-screen');
                    if(introScreen) {
                        introScreen.style.transition = 'opacity 0.5s ease';
                        introScreen.style.opacity = '0';
                        setTimeout(() => {
                            introScreen.classList.add('hidden');
                            checkUserSession();
                        }, 500);
                    }
                }, 800);
            }
        }
        type();
    } else {
        setTimeout(() => {
            const introScreen = document.getElementById('intro-screen');
            if(introScreen) introScreen.classList.add('hidden');
            checkUserSession();
        }, 1500);
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

function switchProfileTab(tabName) {
    currentProfileTab = tabName;
    document.querySelectorAll('.profile-tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`tab-btn-${tabName}`);
    if (targetBtn) targetBtn.classList.add('active');

    const loggedUser = localStorage.getItem('flash_logged_user');
    if (loggedUser) loadUserProfile(loggedUser);
}

// Followers / Following စာရင်း ကြည့်ရှုသည့် Modal
async function openFollowListModal(type) {
    const { data: users } = await supabaseClient.from('flash_users').select('*');
    if(!users) return;

    let listHtml = users.map(u => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #222233;">
            <div style="display:flex; align-items:center; gap:8px;">
                <img src="${u.photo_url || 'https://via.placeholder.com/35'}" style="width:30px; height:30px; border-radius:50%;">
                <span style="color:#00ffff; font-size:0.85rem; font-weight:bold;">${escapeHtml(u.display_name || u.username)}</span>
            </div>
            <span style="color:#888; font-size:0.75rem;">@${u.username}</span>
        </div>
    `).join('');

    alert(`📋 ${type.toUpperCase()} List:\n\n` + users.map(u => `- ${u.display_name || u.username} (@${u.username})`).join('\n'));
}

async function deleteUserPost(postId) {
    if(!confirm("ဒီ ပို့စ်/ဗီဒီယို ကို ဖျက်မှာ သေချာပါသလား?")) return;

    const { error } = await supabaseClient.from('flash_posts').delete().eq('id', postId);
    if(!error) {
        showToast("✅ ဖျက်ပြီးပါပြီ။", "success");
        loadUserProfile(localStorage.getItem('flash_logged_user'));
    } else {
        showToast("❌ ဖျက်၍မရပါ: " + error.message, "error");
    }
}

async function loadUserProfile(username) {
    const { data: user } = await supabaseClient.from('flash_users').select('*').eq('username', username).single();
    if(!user) return;

    if(document.getElementById('profileNameDisplay')) document.getElementById('profileNameDisplay').innerText = user.display_name || username;
    if(document.getElementById('profileUserDisplay')) document.getElementById('profileUserDisplay').innerText = `@${username}`;
    if(document.getElementById('profileBioDisplay')) document.getElementById('profileBioDisplay').innerText = user.bio || '';
    if(user.photo_url && document.getElementById('profileImgDisplay')) document.getElementById('profileImgDisplay').src = user.photo_url;
    if(user.banner_url && document.getElementById('profileBannerBg')) document.getElementById('profileBannerBg').style.backgroundImage = `url('${user.banner_url}')`;

    const { data: userPosts } = await supabaseClient.from('flash_posts').select('*').eq('username', username).order('created_at', { ascending: false });
    
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
                <button onclick="deleteUserPost('${p.id}')" style="background:#ff0033; color:#fff; border:none; padding:2px 6px; border-radius:4px; font-size:0.65rem; cursor:pointer; margin-top:5px; font-weight:bold; width:100%;">🗑 Delete</button>
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
                <button onclick="deleteUserPost('${v.id}')" style="background:#ff0033; color:#fff; border:none; padding:2px 6px; border-radius:0 0 8px 8px; font-size:0.65rem; cursor:pointer; font-weight:bold; width:100%;">🗑 Delete</button>
            `;
            tabContent.appendChild(item);
        });
    }
}

function handleLogout() {
    localStorage.removeItem('flash_logged_user');
    checkUserSession();
    showToast('အကောင့်ထွက်ပြီးပါပြီ။', 'success');
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
