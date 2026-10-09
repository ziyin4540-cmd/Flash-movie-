// Navigation & Page Switching Logic
function switchMainPage(pageName) {
    // 1. Watch Video modal/screen ရှိနေပါက အရင်ရှင်းထုတ်မည်
    closeWatchVideoScreen();

    // 2. Main section အားလုံးကို ဖုန်းကွယ်မည်
    document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden'));
    
    // 3. Bottom nav buttons အားလုံး active ဖြုတ်မည်
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));

    // 4. သက်ဆိုင်ရာ Page ကို ပြသမည်
    const targetPage = document.getElementById(`page-${pageName}`);
    if(targetPage) {
        targetPage.classList.remove('hidden');
    }

    // 5. သက်ဆိုင်ရာ Nav Button ကို Active ပြုလုပ်မည်
    const targetNav = document.getElementById(`nav-btn-${pageName}`);
    if(targetNav) {
        targetNav.classList.add('active');
    }

    // 6. Data များကို Dynamic Reload လုပ်မည်
    if(pageName === 'home' && typeof loadHomeVideos === 'function') loadHomeVideos();
    if(pageName === 'feed' && typeof loadFbFeed === 'function') loadFbFeed();
    if(pageName === 'chat' && typeof loadContactList === 'function') loadContactList();
    if(pageName === 'profile' && typeof loadUserProfile === 'function') {
        loadUserProfile(localStorage.getItem('flash_logged_user'));
    }
}

function closeWatchVideoScreen() {
    const watchPage = document.getElementById('page-watch-video');
    if(watchPage) {
        watchPage.remove(); // DOM ပေါ်မှ အပြီးတိုင် ဖျက်ထုတ်ခြင်းဖြင့် Layer အမည်းဖုံးခြင်းကို ရှင်းလင်းပါသည်
    }
}

function switchProfileTab(tabName) {
    if(typeof currentProfileTab !== 'undefined') {
        currentProfileTab = tabName;
    }
    document.querySelectorAll('.profile-tab-btn').forEach(btn => btn.classList.remove('active'));
    if(event && event.target) {
        event.target.classList.add('active');
    }
    if(typeof loadUserProfile === 'function') {
        loadUserProfile(localStorage.getItem('flash_logged_user'));
    }
}
