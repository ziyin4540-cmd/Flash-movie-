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
        
        // Admin Button Display
        const adminBtn = document.getElementById('adminPanelBtn');
        if(adminBtn) {
            if(loggedUser === 'admin') adminBtn.classList.remove('hidden');
            else adminBtn.classList.add('hidden');
        }

        if(typeof switchMainPage === 'function') {
            switchMainPage('home');
        }
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
                    } else {
                        showToast('❌ ပုံတင်၍မရပါ: ' + error.message, 'error');
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
                    } else {
                        showToast('❌ ပုံတင်၍မရပါ: ' + error.message, 'error');
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
            const MAX_WIDTH = 300;
            const MAX_HEIGHT = 300;
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
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function loadUserProfile(username) {
    const { data: user } = await supabaseClient.from('flash_users').select('*').eq('username', username).single();
    if(!user) return;

    if(document.getElementById('profileNameDisplay')) document.getElementById('profileNameDisplay').innerText = user.display_name || username;
    if(document.getElementById('profileUserDisplay')) document.getElementById('profileUserDisplay').innerText = `@${username}`;
    if(document.getElementById('profileBioDisplay')) document.getElementById('profileBioDisplay').innerText = user.bio || '';
    if(user.photo_url && document.getElementById('profileImgDisplay')) document.getElementById('profileImgDisplay').src = user.photo_url;
    if(user.banner_url && document.getElementById('profileBannerBg')) document.getElementById('profileBannerBg').style.backgroundImage = `url('${user.banner_url}')`;
}

function handleLogout() {
    localStorage.removeItem('flash_logged_user');
    checkUserSession();
    showToast('အကောင့်ထွက်ပြီးပါပြီ။', 'success');
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
