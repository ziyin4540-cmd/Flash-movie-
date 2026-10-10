function switchMainPage(pageName) {
    if(typeof closeWatchVideoScreen === 'function') closeWatchVideoScreen();

    // Section အားလုံး ဖုံးကွယ်ပြီး ရွေးချယ်ထားသည်ကို ပြသခြင်း
    document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageName}`);
    if(targetPage) targetPage.classList.remove('hidden');

    const targetNav = document.getElementById(`nav-btn-${pageName}`);
    if(targetNav) targetNav.classList.add('active');

    // Data များကို သက်ဆိုင်ရာ Page မလိုက် လှမ်းယူခြင်း
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
            console.error('Navigation Error:', e);
        }
    }, 20);
}

async function loadAdminPanel() {
    const container = document.getElementById('adminUsersContainer');
    if(!container) return;

    try {
        if(!window.supabaseClient) return;
        const { data: users, error } = await supabaseClient.from('flash_users').select('*');
        
        if(error || !users || users.length === 0) {
            container.innerHTML = '<p style="color:#888; font-size:0.85rem;">User စာရင်းမရှိပါ။</p>';
            return;
        }

        container.innerHTML = '';
        users.forEach(u => {
            const div = document.createElement('div');
            div.style.cssText = 'padding:8px 0; border-bottom:1px solid #222233; display:flex; justify-content:space-between; align-items:center;';
            div.innerHTML = `
                <div>
                    <b style="color:#fff; font-size:0.85rem;">${u.display_name || u.username}</b>
                    <div style="color:#00ffff; font-size:0.75rem;">@${u.username}</div>
                </div>
                <span style="font-size:0.7rem; background:#222; color:#00ffff; padding:2px 6px; border-radius:4px;">User</span>
            `;
            container.appendChild(div);
        });
    } catch(err) {
        console.error(err);
    }
}

function closeWatchVideoScreen() {
    const modalContainer = document.getElementById('video-watch-modal-container');
    if(modalContainer) modalContainer.innerHTML = '';
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
