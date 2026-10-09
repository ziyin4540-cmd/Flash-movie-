let tempProfilePhotoData = "https://via.placeholder.com/90";

window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('intro-screen').classList.add('hidden');
        checkUserSession();
    }, 1200);
    startLiveTimer();
    loadTgMessages();
});

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
        reader.onload = function(event) {
            tempProfilePhotoData = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

function handleRegister() {
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value.trim();
    const displayName = document.getElementById('regDisplayName').value.trim();
    
    if(!user || !pass || !displayName) {
        alert('အချက်အလက်များကို အပြည့်အစုံ ဖြည့်ပါ။');
        return;
    }

    const userData = { pass, displayName, photo: tempProfilePhotoData, uploads: [] };
    localStorage.setItem('flash_user_data_' + user, JSON.stringify(userData));
    alert('အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်။ Login ဝင်ပါ။');
    switchAuthView('login');
}

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
        if(data.photo) {
            document.getElementById('profileImgDisplay').src = data.photo;
        }
        
        // Load Real User Uploads & Stats
        const uploadsFeed = document.getElementById('userUploadsFeed');
        uploadsFeed.innerHTML = '';
        if(data.uploads && data.uploads.length > 0) {
            document.getElementById('statVideos').innerText = data.uploads.length;
            data.uploads.forEach(item => {
                const div = document.createElement('div');
                div.className = 'upload-item-card';
                div.innerHTML = `<p style="font-size: 0.85rem; margin: 5px 0;">📹 ${escapeHtml(item)}</p>`;
                uploadsFeed.appendChild(div);
            });
        } else {
            document.getElementById('statVideos').innerText = '0';
            uploadsFeed.innerHTML = '<p style="color: #666; font-size: 0.85rem; text-align: center; padding: 15px;">တင်ထားသော ဗီဒီယို မရှိသေးပါ။</p>';
        }
    } else {
        document.getElementById('profileNameDisplay').innerText = username;
        document.getElementById('profileUserDisplay').innerText = `@${username}`;
        document.getElementById('statVideos').innerText = '0';
        document.getElementById('userUploadsFeed').innerHTML = '<p style="color: #666; font-size: 0.85rem; text-align: center; padding: 15px;">တင်ထားသော ဗီဒီယို မရှိသေးပါ။</p>';
    }
}

function viewOtherProfile(username) {
    loadUserProfile(username);
    switchMainPage('profile');
}

// Admin Verification (Password: 295802)
function verifyAdminPassword() {
    const enteredPass = document.getElementById('adminPassInput').value.trim();
    if(enteredPass === "295802") {
        sessionStorage.setItem('admin_verified', 'true');
        document.getElementById('admin-lock-screen').classList.add('hidden');
        document.getElementById('admin-content-box').classList.remove('hidden');
    } else {
        alert('Admin Password မှားယွင်းနေပါသည်။');
        document.getElementById('adminPassInput').value = '';
    }
}

function changeUserPassword() {
    const currentUser = localStorage.getItem('flash_logged_user');
    const currentPass = document.getElementById('currentPassInput').value.trim();
    const newPass = document.getElementById('newPassInput').value.trim();

    if(!currentPass || !newPass) {
        alert('စကားဝှက်ဟောင်းနှင့် အသစ်ကို အပြည့်အစုံ ရေးပါ။');
        return;
    }

    const dataStr = localStorage.getItem('flash_user_data_' + currentUser);
    if(dataStr) {
        let data = JSON.parse(dataStr);
        if(data.pass === currentPass) {
            data.pass = newPass;
            localStorage.setItem('flash_user_data_' + currentUser, JSON.stringify(data));
            alert('စကားဝှက်ကို အောင်မြင်စွာ ပြောင်းလဲပြီးပါပြီ။');
            document.getElementById('currentPassInput').value = '';
            document.getElementById('newPassInput').value = '';
        } else {
            alert('စကားဝှက်ဟောင်း မှားယွင်းနေပါသည်။');
        }
    }
}

function clearAppCache() {
    if(confirm('App ဒေတာများနှင့် Cache များကို ရှင်းလင်းလိုသည်မှာ သေချာပါသလား?')) {
        localStorage.removeItem('flash_tg_messages');
        alert('Cache များကို အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။');
        loadTgMessages();
    }
}

// Telegram Real-time Chat System
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
    if(messages.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.85rem; text-align: center; margin-top: 20px;">မက်ဆေ့ချ် မရှိသေးပါ။</p>';
        return;
    }

    messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'tg-msg';
        div.innerHTML = `
            <strong style="cursor:pointer; color:#3ea6ff;" onclick="viewOtherProfile('${msg.user}')">@${msg.user}:</strong> ${escapeHtml(msg.text)}
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

function switchMainPage(pageName) {
    document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));
    
    if(pageName === 'home') {
        document.getElementById('page-home').classList.remove('hidden');
        document.getElementById('nav-btn-home').classList.add('active');
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

function adminAction(btn, status) {
    alert(`အကောင့်ကို ${status} လုပ်ပြီးပါပြီ။`);
    btn.parentElement.parentElement.remove();
}

function sendNotification() {
    if(document.getElementById('notifTitle').value && document.getElementById('notifMessage').value) {
        alert('အသိပေးစာ အောင်မြင်စွာ ပို့ပြီးပါပြီ!');
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifMessage').value = '';
    } else {
        alert('ခေါင်းစဉ်နှင့် အကြောင်းအရာကို အပြည့်အစုံ ဖြည့်ပါ။');
    }
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                                               }
