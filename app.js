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
                    if(document.getElementById('settingsBioInput')) {
                        document.getElementById('settingsBioInput').value = data.bio || '';
                    }
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
            const MAX_WIDTH = 200;
            const MAX_HEIGHT = 200;
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
        followers: [],
        following: [],
        bio: '',
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
    const newBio = document.getElementById('settingsBioInput') ? document.getElementById('settingsBioInput').value.trim() : '';

    if(!newUser || !newName) return showToast('အချက်အလက် ဖြည့်ပါ။', 'error');

    const { error } = await supabaseClient.from('flash_users').update({
        username: newUser,
        display_name: newName,
        bio: newBio
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

    if(!avatarWrapper) return;

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
                await supabaseClient.from('flash_posts').update({ user_photo: base64 }).eq('username', user);

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
    
    // Bio ဖော်ပြခြင်း (ရှိမှသာပေါ်မည်)
    let bioContainer = document.getElementById('profileBioDisplay');
    if(!bioContainer) {
        bioContainer = document.createElement('div');
        bioContainer.id = 'profileBioDisplay';
        bioContainer.style.cssText = 'font-size:0.8rem; color:#aaa; margin:5px 15px 10px 15px; word-break:break-word;';
        document.querySelector('.profile-username').after(bioContainer);
    }
    if(user.bio && user.bio.trim() !== '') {
        bioContainer.innerText = user.bio;
        bioContainer.classList.remove('hidden');
    } else {
        bioContainer.classList.add('hidden');
    }

    if(user.photo_url) document.getElementById('profileImgDisplay').src = user.photo_url;
    if(user.banner_url) document.getElementById('profileBannerBg').style.backgroundImage = `url('${user.banner_url}')`;

    const { data: allPosts } = await supabaseClient.from('flash_posts').select('*').eq('username', username).order('created_at', { ascending: false });
    const postsList = allPosts || [];
    const videosList = postsList.filter(p => p.is_video === true);
    const normalPostsList = postsList.filter(p => p.is_video !== true);

    document.getElementById('statPosts').innerText = normalPostsList.length;
    document.getElementById('statVideos').innerText = videosList.length;
    
    let followersCount = user.followers ? user.followers.length : 0;
    let followingCount = user.following ? user.following.length : 0;
    
    let statFollowersElem = document.getElementById('statFollowers');
    let statFollowingElem = document.getElementById('statFollowing');
    if(statFollowersElem) statFollowersElem.innerText = followersCount;
    if(statFollowingElem) statFollowingElem.innerText = followingCount;

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
