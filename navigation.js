let isAdminAuthenticated = false;

function switchMainPage(pageName) {
    if(pageName === 'admin' && !isAdminAuthenticated) {
        const pass = prompt("🔐 Admin Password ထည့်ပါ:");
        if(pass === "296802") {
            isAdminAuthenticated = true;
            showToast("✅ Admin Login အောင်မြင်ပါသည်", "success");
        } else {
            showToast("❌ Admin Password မှားယွင်းပါသည်!", "error");
            return;
        }
    }

    if(typeof closeWatchVideoScreen === 'function') closeWatchVideoScreen();

    document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageName}`);
    if(targetPage) targetPage.classList.remove('hidden');

    const targetNav = document.getElementById(`nav-btn-${pageName}`);
    if(targetNav) targetNav.classList.add('active');

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

// ⚙️ FULL ADMIN PANEL MANAGEMENT FUNCTION
async function loadAdminPanel() {
    const userContainer = document.getElementById('adminUsersContainer');
    const postContainer = document.getElementById('adminPostsContainer');
    if(!userContainer) return;

    try {
        if(!window.supabaseClient) return;

        // 1. Fetch Users
        const { data: users } = await supabaseClient.from('flash_users').select('*');
        userContainer.innerHTML = '';
        if(users && users.length > 0) {
            users.forEach(u => {
                const div = document.createElement('div');
                div.style.cssText = 'padding:10px; background:#181820; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;';
                div.innerHTML = `
                    <div>
                        <b style="color:#fff; font-size:0.85rem;">${escapeHtml(u.display_name || u.username)}</b>
                        <div style="color:#00ffff; font-size:0.75rem;">@${u.username}</div>
                    </div>
                    <button onclick="adminDeleteUser('${u.username}')" style="background:#ff0033; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:0.7rem; cursor:pointer;">🗑 Delete Account</button>
                `;
                userContainer.appendChild(div);
            });
        } else {
            userContainer.innerHTML = '<p style="color:#666; font-size:0.8rem;">User မရှိသေးပါ။</p>';
        }

        // 2. Fetch Videos / Posts (Approve / Reject / Delete)
        if(postContainer) {
            const { data: posts } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
            postContainer.innerHTML = '';
            if(posts && posts.length > 0) {
                posts.forEach(p => {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding:10px; background:#181820; border-radius:6px; margin-bottom:8px; border:1px solid #222233;';
                    div.innerHTML = `
                        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                            <span style="color:#00ffff; font-size:0.75rem;">@${p.username}</span>
                            <span style="color:#888; font-size:0.65rem;">${p.created_at ? p.created_at.split('T')[0] : ''}</span>
                        </div>
                        <p style="font-size:0.8rem; margin:0 0 8px 0; color:#fff;">${escapeHtml(p.post_text || '')}</p>
                        <div style="display:flex; gap:8px;">
                            <button onclick="adminApprovePost('${p.id}')" style="background:#00ff66; color:#000; border:none; padding:4px 10px; border-radius:4px; font-weight:bold; font-size:0.7rem; cursor:pointer;">✅ Approve</button>
                            <button onclick="adminDeletePost('${p.id}')" style="background:#ff0033; color:#fff; border:none; padding:4px 10px; border-radius:4px; font-weight:bold; font-size:0.7rem; cursor:pointer;">❌ Reject/Delete</button>
                        </div>
                    `;
                    postContainer.appendChild(div);
                });
            } else {
                postContainer.innerHTML = '<p style="color:#666; font-size:0.8rem;">Post မရှိသေးပါ။</p>';
            }
        }
    } catch(err) {
        console.error(err);
    }
}

async function adminDeleteUser(username) {
    if(!confirm(`@${username} အကောင့်ကို အပြီးတိုင် ဖျက်မှာ သေချာပါသလား?`)) return;
    await supabaseClient.from('flash_users').delete().eq('username', username);
    showToast(`Account @${username} ဖျက်ပြီးပါပြီ`, 'success');
    loadAdminPanel();
}

async function adminDeletePost(postId) {
    if(!confirm(`ဒီ Post/Video ကို ပယ်ဖျက်မှာ သေချာပါသလား?`)) return;
    await supabaseClient.from('flash_posts').delete().eq('id', postId);
    showToast(`Post ကို ပယ်ဖျက်လိုက်ပါပြီ`, 'success');
    loadAdminPanel();
}

async function adminApprovePost(postId) {
    showToast(`Post ကို အတည်ပြုလိုက်ပါပြီ ✅`, 'success');
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
