let tempProfilePhotoData = "";

window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('intro-screen').classList.add('hidden');
        checkUserSession();
    }, 1500);
    startLiveTimer();
    loadAdminVideos();
});

// Check Session (No Popups, Full Page Switching)
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

// Switch between Login and Register full pages
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

// Handle Profile Photo Selection in Register
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

// Handle Register with Name & Photo
function handleRegister() {
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value.trim();
    const displayName = document.getElementById('regDisplayName').value.trim();
    
    if(user && pass && displayName) {
        const userData = {
            pass: pass,
            displayName: displayName,
            photo: tempProfilePhotoData || 'https://via.placeholder.com/90'
        };
        localStorage.setItem('flash_user_data_' + user, JSON.stringify(userData));
        alert('အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်။ Login ဝင်ပါ။');
        switchAuthView('login');
    } else {
        alert('အချက်အလက်များကို အပြည့်အစုံ ဖြည့်သွင်းပါ။');
    }
}

// Handle Login
function handleLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value.trim();
    const storedDataStr = localStorage.getItem('flash_user_data_' + user);
    
    let isValid = false;
    if(user === 'admin' && pass === 'admin123') {
        isValid = true;
        localStorage.setItem('flash_user_data_admin', JSON.stringify({displayName: 'Administrator', photo: ''}));
    } else if(storedDataStr) {
        const storedData = JSON.parse(storedDataStr);
        if(storedData.pass === pass) {
            isValid = true;
        }
    }

    if(isValid) {
        localStorage.setItem('flash_logged_user', user);
        checkUserSession();
    } else {
        alert('Username သို့မဟုတ် Password မှားယွင်းနေပါသည်။');
    }
}

// Handle Logout
function handleLogout() {
    localStorage.removeItem('flash_logged_user');
    checkUserSession();
}

// Load Profile Data
function loadUserProfile(username) {
    const dataStr = localStorage.getItem('flash_user_data_' + username);
    if(dataStr) {
        const data = JSON.parse(dataStr);
        document.getElementById('profileNameDisplay').innerText = data.displayName || username;
        document.getElementById('profileUserDisplay').innerText = `@${username}`;
        if(data.photo) {
            document.getElementById('profileImgDisplay').src = data.photo;
        }
    } else {
        document.getElementById('profileNameDisplay').innerText = username;
        document.getElementById('profileUserDisplay').innerText = `@${username}`;
    }
}

// Bottom Navigation Full Page Switcher
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

// Admin / Actions Helpers
function adminAction(msg) {
    alert(msg);
}

function loadAdminVideos() {
    const list = document.getElementById('adminVideoList');
    list.innerHTML = `
        <div class="approval-item">
            <span>📹 Action Movie.mp4 (by @user1)</span>
            <button class="btn-danger" onclick="deleteVideo(this)">ဖျက်မည်</button>
        </div>
    `;
}

function deleteVideo(btn) {
    if(confirm('ဤဗီဒီယိုကို ဖျက်လိုသည်မှာ သေချာပါသလား?')) {
        alert('ဗီဒီယိုကို အောင်မြင်စွာ ဖျက်ဆီးပြီးပါပြီ။');
        btn.parentElement.remove();
    }
}

function sendNotification() {
    const title = document.getElementById('notifTitle').value;
    const msg = document.getElementById('notifMessage').value;
    if(title && msg) {
        alert('အသုံးပြုသူများထံ အသိပေးစာ အောင်မြင်စွာ ပို့ပြီးပါပြီ!');
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifMessage').value = '';
    } else {
        alert('ခေါင်းစဉ်နှင့် အကြောင်းအရာကို အပြည့်အစုံ ဖြည့်ပါ။');
    }
}
