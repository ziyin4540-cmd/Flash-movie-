function switchMainPage(pageName) {
    if(typeof closeWatchVideoScreen === 'function') closeWatchVideoScreen();

    // UI Screen များကို ချက်ချင်း ဖုံး/ဖွင့် ပြုလုပ်ခြင်း
    document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageName}`);
    if(targetPage) targetPage.classList.remove('hidden');

    const targetNav = document.getElementById(`nav-btn-${pageName}`);
    if(targetNav) targetNav.classList.add('active');

    // Data Load လုပ်ခြင်းကို Async သီးသန့် ခေါ်ယူခြင်း
    setTimeout(() => {
        try {
            if(pageName === 'home' && typeof loadHomeVideos === 'function') loadHomeVideos();
            if(pageName === 'feed' && typeof loadFbFeed === 'function') loadFbFeed();
            if(pageName === 'chat' && typeof loadContactList === 'function') loadContactList();
            if(pageName === 'admin' && typeof loadAdminPanel === 'function') loadAdminPanel();
            if(pageName === 'profile' && typeof loadUserProfile === 'function') {
                loadUserProfile(localStorage.getItem('flash_logged_user'));
            }
        } catch(e) {
            console.error('Data Load Error:', e);
        }
    }, 50);
}

function closeWatchVideoScreen() {
    const watchPage = document.getElementById('page-watch-video');
    if(watchPage) {
        watchPage.remove();
    }
}

function switchAuthView(viewName) {
    const loginView = document.getElementById('view-login');
    const regView = document.getElementById('view-register');
    const title = document.getElementById('auth-title');

    if(viewName === 'register') {
        if(loginView) loginView.classList.add('hidden');
        if(regView) regView.classList.remove('hidden');
        if(title) title.innerText = '📝 Register';
    } else {
        if(regView) regView.classList.add('hidden');
        if(loginView) loginView.classList.remove('hidden');
        if(title) title.innerText = '🔑 Login';
    }
        }
