// Main Screen မြားသို့ မြှနျမွနျဆနျဆနျ ပြောင်းလဲပေးသညျ့ Function
function switchMainPage(pageName) {
    if(typeof closeWatchVideoScreen === 'function') closeWatchVideoScreen();

    // 1. UI Screen အားလုံးကို ချက်ချင်း ဖုံးပြီး နှိပ်လိုက်သည့် Screen ကို ချက်ချင်း ပွင့်စေခြင်း
    document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageName}`);
    if(targetPage) targetPage.classList.remove('hidden');

    const targetNav = document.getElementById(`nav-btn-${pageName}`);
    if(targetNav) targetNav.classList.add('active');

    // 2. Data များကို Async ဖြင့် ချက်ချင်း ခေါ်ယူပေးခြင်း (No Waiting Delay)
    requestAnimationFrame(() => {
        if(pageName === 'home' && typeof loadHomeVideos === 'function') loadHomeVideos();
        if(pageName === 'feed' && typeof loadFbFeed === 'function') loadFbFeed();
        if(pageName === 'chat' && typeof loadContactList === 'function') loadContactList();
        if(pageName === 'admin' && typeof loadAdminPanel === 'function') loadAdminPanel();
        if(pageName === 'profile' && typeof loadUserProfile === 'function') {
            loadUserProfile(localStorage.getItem('flash_logged_user'));
        }
    });
}

// Watch Video Screen ကို ပိတ်ပေးသည့် Function
function closeWatchVideoScreen() {
    const watchPage = document.getElementById('page-watch-video');
    if(watchPage) {
        watchPage.remove();
    }
}

// Login နှင့် Register View ကူးပြောင်းပေးသည့် Function
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
