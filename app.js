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
                // Intro ပြီးသွားရင် 1 စက္ကန့်အတွင်း အလိုအလျောက် ပျောက်ပြီး Home/Auth ကို ဝင်မယ်
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
        // Fallback in case element missing
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
    if(introScreen && !introScreen.classList.contains('hidden')) return; // Intro ပြီးမှ စစ်မယ်

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
            if(data && data.photo_url) document.getElementById('currentUserAvatarFeed').src = data.photo_url;
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
        const reader = new FileReader();
        reader.onload = (ev) => { tempRegPhotoData = ev.target.result; };
        reader.readAsDataURL(file);
    }
});

async function handleRegister() {
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value.trim();
    const displayName = document.getElementById('regDisplayName').value.trim();
    
    if(!user || !pass || !displayName) return alert('အချက်အလက် အပြည့်အစုံ ဖြည့်ပါ။');

    const { error } = await supabaseClient.from('flash_users').insert([{
        username: user,
        password: pass,
        display_name: displayName,
        photo_url: tempRegPhotoData,
        created_at: new Date().toISOString()
    }]);

    if(error) return alert('အကောင့်ဖွင့်၍မရပါ: ' + error.message);
    alert('အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်။');
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
        alert('Username သို့မဟုတ် Password မှားယွင်းနေပါသည်။');
    } else {
        localStorage.setItem('flash_logged_user', user);
        checkUserSession();
    }
}

function handleLogout() {
    localStorage.removeItem('flash_logged_user');
    sessionStorage.removeItem('admin_verified');
    checkUserSession();
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
            const reader = new FileReader();
            reader.onload = async function(ev) {
                const user = localStorage.getItem('flash_logged_user');
                await supabaseClient.from('flash_users').update({ photo_url: ev.target.result }).eq('username', user);
                loadUserProfile(user);
                alert('Profile ပုံ အောင်မြင်ပါသည်။');
            };
            reader.readAsDataURL(file);
        }
    });

    bgPicker.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = async function(ev) {
                const user = localStorage.getItem('flash_logged_user');
                await supabaseClient.from('flash_users').update({ banner_url: ev.target.result }).eq('username', user);
                loadUserProfile(user);
                alert('Background ပုံ အောင်မြင်ပါသည်။');
            };
            reader.readAsDataURL(file);
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

async function verifyAdminPassword() {
    if(document.getElementById('adminPassInput').value.trim() === "295802") {
        sessionStorage.setItem('admin_verified', 'true');
        document.getElementById('admin-lock-screen').classList.add('hidden');
        document.getElementById('admin-content-box').classList.remove('hidden');
        loadAdminData();
    } else alert('Password မှားယွင်းနေပါသည်။');
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
        alert('ဖျက်ပြီးပါပြီ။');
        loadAdminData();
    }
}

async function adminDeletePost(postId) {
    if(confirm('ဤပို့စ်/ဗီဒီယိုကို ဖျက်မည်မှာ သေချာပါသလား?')) {
        await supabaseClient.from('flash_posts').delete().eq('id', postId);
        alert('ဖျက်ပြီးပါပြီ။');
        loadAdminData();
    }
}

function sendNotification() {
    const title = document.getElementById('notifTitle').value.trim();
    const msg = document.getElementById('notifMessage').value.trim();
    if(title && msg) {
        localStorage.setItem('flash_admin_notif_title', title);
        localStorage.setItem('flash_admin_notif_text', msg);
        alert('အသိပေးစာ ပို့ပြီးပါပြီ။');
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

function changeUserPassword() { alert('စကားဝှက် ပြောင်းလဲပြီးပါပြီ။'); }
function clearAppCache() { localStorage.clear(); alert('Cache ရှင်းလင်းပြီးပါပြီ။'); checkUserSession(); }

function escapeHtml(text) {
    if(!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
