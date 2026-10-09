let tempProfilePhotoData = "https://via.placeholder.com/90";

window.addEventListener('load', () => {
    runIntroTypingEffect();
    startLiveTimer();
    loadFbFeed();
});

function runIntroTypingEffect() {
    const textElement = document.getElementById('typing-intro-text');
    const message = "Welcome to Flâsh Movie Pro... Cinematic Experience Loading...";
    let index = 0;

    textElement.innerText = "";
    function type() {
        if (index < message.length) {
            textElement.innerText += message.charAt(index);
            index++;
            setTimeout(type, 45);
        } else {
            setTimeout(() => {
                const introScreen = document.getElementById('intro-screen');
                introScreen.style.transition = 'opacity 0.6s ease';
                introScreen.style.opacity = '0';
                setTimeout(() => {
                    introScreen.classList.add('hidden');
                    checkUserSession();
                }, 600);
            }, 1000);
        }
    }
    type();
}

function checkUserSession() {
    const loggedUser = localStorage.getItem('flash_logged_user');
    if (!loggedUser) {
        document.getElementById('page-auth').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    } else {
        document.getElementById('page-auth').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        loadUserProfile(loggedUser);
        loadContactList();
        loadFbFeed();
        
        // Load current user avatar for post box
        const userDataStr = localStorage.getItem('flash_user_data_' + loggedUser);
        if(userDataStr) {
            const uData = JSON.parse(userDataStr);
            if(uData.photo) document.getElementById('currentUserAvatarFeed').src = uData.photo;
        }
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

document.getElementById('regPhotoPicker').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) { tempProfilePhotoData = event.target.result; };
        reader.readAsDataURL(file);
    }
});

function handleRegister() {
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value.trim();
    const displayName = document.getElementById('regDisplayName').value.trim();
    
    if(!user || !pass || !displayName) { alert('အချက်အလက် ဖြည့်ပါ။'); return; }
    localStorage.setItem('flash_user_data_' + user, JSON.stringify({ pass, displayName, photo: tempProfilePhotoData, uploads: [] }));
    alert('အောင်မြင်ပါသည်။');
    switchAuthView('login');
}

function handleLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const stored = localStorage.getItem('flash_user_data_' + user);
    
    let isValid = (user === 'admin' && pass === 'admin123') || (stored && JSON.parse(stored).pass === pass);
    if(isValid) {
        localStorage.setItem('flash_logged_user', user);
        checkUserSession();
    } else {
        alert('Username သို့မဟုတ် Password မှားယွင်းနေပါသည်။');
    }
}

function handleLogout() {
    localStorage.removeItem('flash_logged_user');
    sessionStorage.removeItem('admin_verified');
    checkUserSession();
}

function loadUserProfile(username) {
    const dataStr = localStorage.getItem('flash_user_data_' + username);
    if(dataStr) {
        const data = JSON.parse(dataStr);
        document.getElementById('profileNameDisplay').innerText = data.displayName || username;
        document.getElementById('profileUserDisplay').innerText = `@${username}`;
        document.getElementById('editDisplayNameInput').value = data.displayName || username;
        if(data.photo) document.getElementById('profileImgDisplay').src = data.photo;
        
        const uploadsFeed = document.getElementById('userUploadsFeed');
        uploadsFeed.innerHTML = '';
        if(data.uploads && data.uploads.length > 0) {
            document.getElementById('statVideos').innerText = data.uploads.length;
            data.uploads.forEach(item => {
                const div = document.createElement('div');
                div.className = 'upload-item-card';
                let mediaPrev = item.mediaUrl ? `<img src="${item.mediaUrl}" width="100%" style="border-radius:4px; max-height:100px; object-fit:cover;">` : '';
                div.innerHTML = `
                    ${mediaPrev}
                    <p style="font-size: 0.75rem; margin: 3px 0;">${escapeHtml(item.text || item.title || 'Post')}</p>
                `;
                uploadsFeed.appendChild(div);
            });
        } else {
            document.getElementById('statVideos').innerText = '0';
            uploadsFeed.innerHTML = '<p style="color: #666; font-size: 0.8rem; text-align: center;">ပို့စ်များ မရှိသေးပါ။</p>';
        }
    }
}

let tempNewPhotoData = "";
document.getElementById('editPhotoPicker').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) { tempNewPhotoData = event.target.result; };
        reader.readAsDataURL(file);
    }
});

function updateProfileInfo() {
    const currentUser = localStorage.getItem('flash_logged_user');
    const newName = document.getElementById('editDisplayNameInput').value.trim();
    const dataStr = localStorage.getItem('flash_user_data_' + currentUser);
    
    if(dataStr) {
        let data = JSON.parse(dataStr);
        if(newName) data.displayName = newName;
        if(tempNewPhotoData) data.photo = tempNewPhotoData;
        localStorage.setItem('flash_user_data_' + currentUser, JSON.stringify(data));
        alert('Profile အောင်မြင်စွာ ပြောင်းလဲပြီးပါပြီ။');
        loadUserProfile(currentUser);
    }
}

function viewOtherProfile(username) {
    loadUserProfile(username);
    switchMainPage('profile');
}

function verifyAdminPassword() {
    if(document.getElementById('adminPassInput').value.trim() === "295802") {
        sessionStorage.setItem('admin_verified', 'true');
        document.getElementById('admin-lock-screen').classList.add('hidden');
        document.getElementById('admin-content-box').classList.remove('hidden');
    } else {
        alert('Password မှားယွင်းနေပါသည်။');
    }
}

function changeUserPassword() {
    const currentUser = localStorage.getItem('flash_logged_user');
    const curr = document.getElementById('currentPassInput').value.trim();
    const neu = document.getElementById('newPassInput').value.trim();
    const dataStr = localStorage.getItem('flash_user_data_' + currentUser);
    
    if(dataStr) {
        let data = JSON.parse(dataStr);
        if(data.pass === curr) {
            data.pass = neu;
            localStorage.setItem('flash_user_data_' + currentUser, JSON.stringify(data));
            alert('စကားဝှက် ပြောင်းပြီးပါပြီ။');
        } else { alert('စကားဝှက်ဟောင်း မှားနေပါသည်။'); }
    }
}

function clearAppCache() {
    if(confirm('Cache များကို ရှင်းလင်းမည်မှာ သေချာပါသလား?')) {
        alert('ရှင်းလင်းပြီးပါပြီ။');
    }
}

function switchMainPage(pageName) {
    document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));
    
    if(pageName === 'home') {
        document.getElementById('page-home').classList.remove('hidden');
        document.getElementById('nav-btn-home').classList.add('active');
        loadFbFeed();
    } else if(pageName === 'chat') {
        document.getElementById('page-chat').classList.remove('hidden');
        document.getElementById('nav-btn-chat').classList.add('active');
        loadContactList();
    } else if(pageName === 'admin') {
        document.getElementById('page-admin').classList.remove('hidden');
        if(sessionStorage.getItem('admin_verified') === 'true') {
            document.getElementById('admin-lock-screen').classList.add('hidden');
            document.getElementById('admin-content-box').classList.remove('hidden');
        } else {
            document.getElementById('admin-lock-screen').classList.remove('hidden');
            document.getElementById('admin-content-box').classList.add('hidden');
        }
    } else if(pageName === 'profile') {
        document.getElementById('page-profile').classList.remove('hidden');
        document.getElementById('nav-btn-profile').classList.add('active');
        loadUserProfile(localStorage.getItem('flash_logged_user'));
    } else if(pageName === 'settings') {
        document.getElementById('page-settings').classList.remove('hidden');
    }
}

function startLiveTimer() {
    const timerBox = document.getElementById('account-timer');
    let totalSeconds = 31536000;
    setInterval(() => {
        totalSeconds--;
        const y = Math.floor(totalSeconds / 31536000);
        const m = Math.floor((totalSeconds % 31536000) / 2592000);
        const d = Math.floor((totalSeconds % 2592000) / 86400);
        const h = Math.floor((totalSeconds % 86400) / 3600);
        const min = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        timerBox.innerText = `${y}Y / ${m}M / ${d}D / ${h}H / ${min}M / ${s}S`;
    }, 1000);
}

function sendNotification() {
    if(document.getElementById('notifTitle').value) { alert('ပို့ပြီးပါပြီ!'); }
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
