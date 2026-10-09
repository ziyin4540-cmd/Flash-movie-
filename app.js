let tempProfilePhotoData = "https://via.placeholder.com/90";

window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('intro-screen').classList.add('hidden');
        checkUserSession();
    }, 1500);
    startLiveTimer();
    loadAdminVideos();
    loadTgMessages();
});

// Check Session
function checkUserSession() {
    const loggedUser = localStorage.getItem('flash_logged_user');
    if (!loggedUser) {
        document.getElementById('page-auth').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    } else {
        document.getElementById('page-auth').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        loadUserProfile(loggedUser);
    }
}

// Switch Auth View
function switchAuthView(viewName) {
    if(viewName === 'register') {
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-register').classList.remove('hidden');
        document.getElementById('auth-title').innerText = '📝 Register New Account';
    } else {
        document.getElementById('view-register').classList.add('hidden');
        document.getElementById('view-login').classList.remove('hidden');
        document.getElementById('auth-title').innerText = '🔑 Login to Flâsh Movie';
    }
}

// Profile Photo Selection
document.getElementById('regPhotoPicker').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            tempProfilePhotoData = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Register Action
function handleRegister() {
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value.trim();
    const displayName = document.getElementById('regDisplayName').value.trim();
    
    if(!user || !pass || !displayName) {
        alert('ကျေးဇူးပြု၍ အချက်အလက်များကို အပြည့်အစုံ ဖြည့်ပါ။');
        return;
    }

    if(localStorage.getItem('flash_user_data_' + user)) {
        alert('ဤ Username မှာ ရှိနှင့်ပြီးသား ဖြစ်ပါသည်။');
        return;
    }

    const userData = { pass, displayName, photo: tempProfilePhotoData };
    localStorage.setItem('flash_user_data_' + user, JSON.stringify(userData));
    alert('အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်။ Login ဝင်ပါ။');
    switchAuthView('login');
}

// Login Action
function handleLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const storedDataStr = localStorage.getItem('flash_user_data_' + user);
    
    let isValid = false;
    if(user === 'admin' && pass === 'admin123') {
        isValid = true;
    } else if(storedDataStr) {
        const storedData = JSON.parse(storedDataStr);
        if(storedData.pass === pass) isValid = true;
    }

    if(isValid) {
        localStorage.setItem('flash_logged_user', user);
        checkUserSession();
    } else {
        alert('Username သို့မဟုတ် Password မှားယွင်းနေပါသည်။');
    }
}

// Logout Action
function handleLogout() {
    localStorage.removeItem('flash_logged_user');
    checkUserSession();
}

// Load Profile
function loadUserProfile(username) {
    const dataStr = localStorage.getItem('flash_user_data_' + username);
    if(dataStr) {
        const data = JSON.parse(dataStr);
        document.getElementById('profileNameDisplay').innerText = data.displayName || username;
        document.getElementById('profileUserDisplay').innerText = `@${username}`;
        if(data.photo) document.getElementById('profileImgDisplay').src = data.photo;
    } else {
        document.getElementById('profileNameDisplay').innerText = username;
        document.getElementById('profileUserDisplay').innerText = `@${username}`;
    }
}

// Telegram Style Chat (Send, Edit, Delete, Reply)
function sendTgMessage() {
    const input = document.getElementById('tgMessageInput');
    const text = input.value.trim();
    const currentUser = localStorage.getItem('flash_logged_user') || 'Guest';

    if(text) {
        let messages = JSON.parse(localStorage.getItem('flash_tg_messages') || '[]');
        messages.push({ id: Date.now(), user: currentUser, text: text });
        localStorage.setItem('flash_tg_messages', JSON.stringify(messages));
        input.value = '';
        loadTgMessages();
    }
}

function loadTgMessages() {
    const container = document.getElementById('tgChatContainer');
    let messages = JSON.parse(localStorage.getItem('flash_tg_messages') || '[]');
    
    container.innerHTML = '';
    messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'tg-msg';
        div.innerHTML = `
            <strong>@${msg.user}:</strong> ${escapeHtml(msg.text)}
            <br><span class="tg-msg-actions" onclick="editTgMessage(${msg.id})">Edit</span> | 
            <span class="tg-msg-actions" style="color:#cc0000;" onclick="deleteTgMessage(${msg.id})">Delete</span>
        `;
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

function editTgMessage(id) {
    let messages = JSON.parse(localStorage.getItem('flash_tg_messages') || '[]');
    const msg = messages.find(m => m.id === id);
    if(msg) {
        const newText = prompt("မက်ဆေ့ချ်ကို ပြင်ရန်:", msg.text);
        if(newText !== null && newText.trim() !== '') {
            msg.text = newText + " (Edited)";
            localStorage.setItem('flash_tg_messages', JSON.stringify(messages));
            loadTgMessages();
        }
    }
}

function deleteTgMessage(id) {
    let messages = JSON.parse(localStorage.getItem('flash_tg_messages') || '[]');
    messages = messages.filter(m => m.id !== id);
    localStorage.setItem('flash_tg_messages', JSON.stringify(messages));
    loadTgMessages();
}

// Bottom Navigation Switcher
function switchMainPage(pageName) {
    document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));
    
    if(pageName === 'home') {
        document.getElementById('page-home').classList.remove('hidden');
        document.getElementById('nav-btn-home').classList.add('active');
    } else if(pageName === 'admin') {
        document.getElementById('page-admin').classList.remove('hidden');
        document.getElementById('nav-btn-admin').classList.add('active');
    } else if(pageName === 'profile') {
        document.getElementById('page-profile').classList.remove('hidden');
        document.getElementById('nav-btn-profile').classList.add('active');
    }
}

// Live Timer
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

// Admin Helpers
function adminAction(msg) { alert(msg); }
function loadAdminVideos() {
    document.getElementById('adminVideoList').innerHTML = `
        <div class="approval-item">
            <span>📹 Action Movie Trailer.mp4 (@user1)</span>
            <button class="btn-danger" onclick="this.parentElement.remove()">ဖျက်မည်</button>
        </div>
    `;
}
function sendNotification() {
    if(document.getElementById('notifTitle').value && document.getElementById('notifMessage').value) {
        alert('အသိပေးစာ အောင်မြင်စွာ ပို့ပြီးပါပြီ!');
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifMessage').value = '';
    } else {
        alert('အချက်အလက် ဖြည့်ပါ။');
    }
}
function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
