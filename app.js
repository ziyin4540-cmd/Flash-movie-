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
        loadUserProfile(loggedUser);
        loadContactList();
        loadHomeVideos();
        loadFbFeed();
        
        supabaseClient.from('flash_users').select('*').eq('username', loggedUser).single().then(({ data }) => {
            if(data) {
                if(data.photo_url) document.getElementById('currentUserAvatarFeed').src = data.photo_url;
                if(document.getElementById('settingsUsernameInput')) {
                    document.getElementById('settingsUsernameInput').value = data.username || '';
                    document.getElementById('settingsDisplayNameInput').value = data.display_name || '';
                }
            }
        });
    }
}

function switchAuthView(viewName) {
    if(viewName === 'register') {
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-register').classList.remove('hidden');
        document.getElementById('auth-title').innerText = '📝 Register';
    } else {
        document.getElementById('view-register').classList.add('hidden');
        document.getElementById('view-login').classList.remove('hidden');
        document.getElementById('auth-title').innerText = '🔑 Login';
    }
}

let tempRegPhotoData = "https://via.placeholder.com/90";
document.getElementById('regPhotoPicker').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        compressImageFile(file, (base64) => { tempRegPhotoData = base64; });
    }
});

function compressImageFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 250;
            const MAX_HEIGHT = 250;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            } else {
                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.5));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function handleRegister() {
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value.trim();
    const displayName = document.getElementById('regDisplayName').value.trim();
    
    if(!user || !pass || !displayName) return showToast('အချက်အလက် အပြည့်အစုံ ဖြည့်ပါ။', 'error');

    const { error } = await supabaseClient.from('flash_users').insert([{
        username: user,
        password: pass,
        display_name: displayName,
        photo_url: tempRegPhotoData,
        created_at: new Date().toISOString()
    }]);

    if(error) return showToast('အကောင့်ဖွင့်၍မရပါ: ' + error.message, 'error');
    showToast('အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်။', 'success');
    switchAuthView('login');
}

async function handleLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    
    if(user === 'admin' && pass === 'admin123') {
        localStorage.setItem('flash_logged_user', user);
        checkUserSession();
        return;
    }

    const { data, error } = await supabaseClient.from('flash_users').select('*').eq('username', user).single();
    if(error || !data || data.password !== pass) {
        showToast('Username သို့မဟုတ် Password မှားယွင်းနေပါသည်။', 'error');
    } else {
        localStorage.setItem('flash_logged_user', user);
        checkUserSession();
        showToast('Login ဝင်ခြင်း အောင်မြင်ပါသည်။', 'success');
    }
}

async function updateAccountInfo() {
    const oldUser = localStorage.getItem('flash_logged_user');
    const newUser = document.getElementById('settingsUsernameInput').value.trim();
    const newName = document.getElementById('settingsDisplayNameInput').value.trim();

    if(!newUser || !newName) return showToast('အချက်အလက် ဖြည့်ပါ။', 'error');

    const { error } = await supabaseClient.from('flash_users').update({
        username: newUser,
        display_name: newName
    }).eq('username', oldUser);

    if(error) {
        showToast('ပြင်ဆင်၍မရပါ: ' + error.message, 'error');
    } else {
        localStorage.setItem('flash_logged_user', newUser);
        showToast('အကောင့်အချက်အလက် ပြင်ဆင်ပြီးပါပြီ။', 'success');
        checkUserSession();
    }
}

function handleLogout() {
    localStorage.removeItem('flash_logged_user');
    sessionStorage.removeItem('admin_verified');
    checkUserSession();
    showToast('အကောင့်ထွက်ပြီးပါပြီ။', 'success');
}

function switchProfileTab(tabName) {
    currentProfileTab = tabName;
    document.querySelectorAll('.profile-tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadUserProfile(localStorage.getItem('flash_logged_user'));
}

function setupProfilePhotoListeners() {
    const avatarWrapper = document.querySelector('.profile-avatar-wrapper');
    const bannerBg = document.getElementById('profileBannerBg');
    const profilePicker = document.getElementById('profilePhotoPicker');
    const bgPicker = document.getElementById('bgPhotoPicker');

    let pressTimer;
    avatarWrapper.addEventListener('touchstart', () => { pressTimer = setTimeout(() => profilePicker.click(), 600); });
    avatarWrapper.addEventListener('touchend', () => clearTimeout(pressTimer));
    avatarWrapper.addEventListener('mousedown', () => { pressTimer = setTimeout(() => profilePicker.click(), 600); });
    avatarWrapper.addEventListener('mouseup', () => clearTimeout(pressTimer));

    bannerBg.addEventListener('touchstart', () => { pressTimer = setTimeout(() => bgPicker.click(), 600); });
    bannerBg.addEventListener('touchend', () => clearTimeout(pressTimer));
    bannerBg.addEventListener('mousedown', () => { pressTimer = setTimeout(() => bgPicker.click(), 600); });
    bannerBg.addEventListener('mouseup', () => clearTimeout(pressTimer));

    profilePicker.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if(file) {
            compressImageFile(file, async (base64) => {
                const user = localStorage.getItem('flash_logged_user');
                const { error } = await supabaseClient.from('flash_users').update({ photo_url: base64 }).eq('username', user);
                if(!error) {
                    loadUserProfile(user);
                    showToast('Profile ပုံ အောင်မြင်ပါသည်။', 'success');
                } else {
                    showToast('ပုံတင်၍မရပါ: ' + error.message, 'error');
                }
            });
        }
    });

    bgPicker.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if(file) {
            compressImageFile(file, async (base64) => {
                const user = localStorage.getItem('flash_logged_user');
                const { error } = await supabaseClient.from('flash_users').update({ banner_url: base64 }).eq('username', user);
                if(!error) {
                    loadUserProfile(user);
                    showToast('Background ပုံ အောင်မြင်ပါသည်။', 'success');
                } else {
                    showToast('ပုံတင်၍မရပါ: ' + error.message, 'error');
                }
            });
        }
    });
}

async function loadUserProfile(username) {
    const { data: user } = await supabaseClient.from('flash_users').select('*').eq('username', username).single();
    if(!user) return;

    document.getElementById('profileNameDisplay').innerText = user.display_name || username;
    document.getElementById('profileUserDisplay').innerText = `@${username}`;
    if(user.photo_url) document.getElementById('profileImgDisplay').src = user.photo_url;
    if(user.banner_url) document.getElementById('profileBannerBg').style.backgroundImage = `url('${user.banner_url}')`;

    const { data: allPosts } = await supabaseClient.from('flash_posts').select('*').eq('username', username).order('created_at', { ascending: false });
    const postsList = allPosts || [];
    const videosList = postsList.filter(p => p.is_video === true);
    const normalPostsList = postsList.filter(p => p.is_video !== true);

    document.getElementById('statPosts').innerText = normalPostsList.length;
    document.getElementById('statVideos').innerText = videosList.length;

    let totalLikes = 0;
    postsList.forEach(p => { if(p.likes) totalLikes += p.likes.length; });
    document.getElementById('statLikes').innerText = totalLikes;

    const contentGrid = document.getElementById('profileTabContent');
    contentGrid.innerHTML = '';
    const targetList = currentProfileTab === 'posts' ? normalPostsList : videosList;

    if(targetList.length === 0) {
        contentGrid.innerHTML = '<p style="color: #666; font-size: 0.8rem; text-align: center; grid-column: span 2;">မရှိသေးပါ။</p>';
        return;
    }

    targetList.forEach(item => {
        const div = document.createElement('div');
        div.className = 'upload-item-card';
        let mediaPrev = '';
        if(item.media_url) {
            mediaPrev = item.media_type === 'image' ? `<img src="${item.media_url}" width="100%" style="border-radius:4px; height:100px; object-fit:cover;">` : `<video src="${item.media_url}" width="100%" style="border-radius:4px; height:100px; object-fit:cover;"></video>`;
        }
        div.innerHTML = `${mediaPrev}<p style="font-size: 0.75rem; margin: 4px 0 0 0; color:#ccc;">${escapeHtml(item.post_text || 'Media')}</p>`;
        setupLongPressDelete(div, item.id);
        contentGrid.appendChild(div);
    });
}

async function openUserProfilePlaylists() {
    switchMainPage('profile-playlists');
    const container = document.getElementById('profilePlaylistContainer');
    const currentUser = localStorage.getItem('flash_logged_user');
    
    const { data: posts } = await supabaseClient.from('flash_posts').select('*').eq('username', currentUser).eq('is_video', true);
    if(!posts || posts.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">ပလေးလစ်များ မရှိသေးပါ။</p>';
        return;
    }

    let playlists = {};
    posts.forEach(p => {
        let pl = p.playlist || 'General';
        if(!playlists[pl]) playlists[pl] = [];
        playlists[pl].push(p);
    });

    let html = '';
    for(let plName in playlists) {
        html += `<div class="admin-card" style="margin-bottom:15px;">
            <h3 style="color:#00ffff; margin-bottom:10px;">📂 ${escapeHtml(plName)} (${playlists[plName].length})</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:8px;">`;
        
        playlists[plName].forEach(v => {
            html += `<div class="upload-item-card">
                <video src="${v.media_url}" width="100%" style="border-radius:4px; height:80px; object-fit:cover; background:#000;"></video>
                <p style="font-size:0.75rem; margin:4px 0 0 0; color:#ccc;">${escapeHtml(v.post_text)}</p>
            </div>`;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

async function verifyAdminPassword() {
    if(document.getElementById('adminPassInput').value.trim() === "295802") {
        sessionStorage.setItem('admin_verified', 'true');
        document.getElementById('admin-lock-screen').classList.add('hidden');
        document.getElementById('admin-content-box').classList.remove('hidden');
        loadAdminData();
    } else showToast('Password မှားယွင်းနေပါသည်။', 'error');
}

async function loadAdminData() {
    const usersContainer = document.getElementById('adminUsersList');
    const postsContainer = document.getElementById('adminPostsList');

    const { data: users } = await supabaseClient.from('flash_users').select('*');
    if(usersContainer) {
        usersContainer.innerHTML = '';
        users.forEach(u => {
            usersContainer.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:#181820; padding:6px; border-radius:6px; margin-bottom:4px; font-size:0.8rem;"><span>@${u.username}</span> <button class="btn-danger" style="padding:2px 6px; font-size:0.7rem;" onclick="adminDeleteUser('${u.username}')">Delete</button></div>`;
        });
    }

    const { data: posts } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
    if(postsContainer) {
        postsContainer.innerHTML = '';
        posts.forEach(p => {
            let reportTag = (p.reports && p.reports > 0) ? `<span style="color:#ff0033;">[Reports: ${p.reports}]</span>` : '';
            postsContainer.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; background:#181820; padding:6px; border-radius:6px; margin-bottom:4px; font-size:0.8rem;"><span>@${p.username}: ${escapeHtml(p.post_text || 'Media')} ${reportTag}</span> <button class="btn-danger" style="padding:2px 6px; font-size:0.7rem;" onclick="adminDeletePost('${p.id}')">Delete</button></div>`;
        });
    }
}

async function adminDeleteUser(username) {
    if(confirm(`User @${username} ကို ဖျက်မည်မှာ သေချာပါသလား?`)) {
        await supabaseClient.from('flash_users').delete().eq('username', username);
        showToast('ဖျက်ပြီးပါပြီ။', 'success');
        loadAdminData();
    }
}

async function adminDeletePost(postId) {
    if(confirm('ဤပို့စ်/ဗီဒီယိုကို ဖျက်မည်မှာ သေချာပါသလား?')) {
        await supabaseClient.from('flash_posts').delete().eq('id', postId);
        showToast('ဖျက်ပြီးပါပြီ။', 'success');
        loadAdminData();
    }
}

function sendNotification() {
    const title = document.getElementById('notifTitle').value.trim();
    const msg = document.getElementById('notifMessage').value.trim();
    if(title && msg) {
        localStorage.setItem('flash_admin_notif_title', title);
        localStorage.setItem('flash_admin_notif_text', msg);
        showToast('အသိပေးစာ ပို့ပြီးပါပြီ။', 'success');
    }
}

function switchMainPage(pageName) {
    document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));
    
    if(pageName === 'home') {
        document.getElementById('page-home').classList.remove('hidden');
        document.getElementById('nav-btn-home').classList.add('active');
        loadHomeVideos();
    } else if(pageName === 'feed') {
        document.getElementById('page-feed').classList.remove('hidden');
        document.getElementById('nav-btn-feed').classList.add('active');
        loadFbFeed();
    } else if(pageName === 'upload') {
        document.getElementById('page-upload').classList.remove('hidden');
        document.getElementById('nav-btn-upload').classList.add('active');
    } else if(pageName === 'chat') {
        document.getElementById('page-chat').classList.remove('hidden');
        document.getElementById('nav-btn-chat').classList.add('active');
        document.getElementById('chatRoomView').classList.add('hidden');
        document.getElementById('chatListView').classList.remove('hidden');
        loadContactList();
    } else if(pageName === 'comment') {
        document.getElementById('page-comment').classList.remove('hidden');
    } else if(pageName === 'admin') {
        document.getElementById('page-admin').classList.remove('hidden');
        if(sessionStorage.getItem('admin_verified') === 'true') {
            document.getElementById('admin-lock-screen').classList.add('hidden');
            document.getElementById('admin-content-box').classList.remove('hidden');
            loadAdminData();
        } else {
            document.getElementById('admin-lock-screen').classList.remove('hidden');
            document.getElementById('admin-content-box').classList.add('hidden');
        }
    } else if(pageName === 'profile') {
        document.getElementById('page-profile').classList.remove('hidden');
        document.getElementById('nav-btn-profile').classList.add('active');
        loadUserProfile(localStorage.getItem('flash_logged_user'));
        
        const nTitle = localStorage.getItem('flash_admin_notif_title');
        const nText = localStorage.getItem('flash_admin_notif_text');
        if(nTitle && nText) {
            document.getElementById('adminNotifBanner').classList.remove('hidden');
            document.getElementById('adminNotifTitle').innerText = nTitle;
            document.getElementById('adminNotifText').innerText = nText;
        }
    } else if(pageName === 'profile-playlists') {
        document.getElementById('page-profile-playlists').classList.remove('hidden');
    } else if(pageName === 'settings') {
        document.getElementById('page-settings').classList.remove('hidden');
    }
}

function startRealTimeTimer() {
    const timerBox = document.getElementById('account-timer');
    let startTime = localStorage.getItem('flash_start_time');
    if(!startTime) {
        startTime = Date.now();
        localStorage.setItem('flash_start_time', startTime);
    }
    
    setInterval(() => {
        let diff = Math.floor((Date.now() - parseInt(startTime)) / 1000);
        const d = Math.floor(diff / 86400);
        diff %= 86400;
        const h = Math.floor(diff / 3600);
        diff %= 3600;
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        timerBox.innerText = `${d}D / ${h}H / ${m}M / ${s}S`;
    }, 1000);
}

function showToast(message, type = 'success') {
    let oldToast = document.getElementById('custom-toast-box');
    if(oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.id = 'custom-toast-box';
    toast.style.position = 'fixed';
    toast.style.top = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = type === 'success' ? '#111116' : '#220709';
    toast.style.color = type === 'success' ? '#00ffff' : '#ff0033';
    toast.style.border = `1px solid ${type === 'success' ? '#00ffff' : '#ff0033'}`;
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '25px';
    toast.style.fontSize = '0.85rem';
    toast.style.fontWeight = 'bold';
    toast.style.zIndex = '99999';
    toast.style.boxShadow = `0 0 15px ${type === 'success' ? 'rgba(0,255,255,0.3)' : 'rgba(255,0,51,0.3)'}`;
    toast.innerText = message;

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s ease';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 2500);
}

function changeUserPassword() { showToast('စကားဝှက် ပြောင်းလဲပြီးပါပြီ။', 'success'); }
function clearAppCache() { localStorage.clear(); showToast('Cache ရှင်းလင်းပြီးပါပြီ။', 'success'); checkUserSession(); }

function escapeHtml(text) {
    if(!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
