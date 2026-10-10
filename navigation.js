let isAdminAuthenticated = false;

function switchMainPage(pageName) {
    if(pageName === 'admin' && !isAdminAuthenticated) {
        openAdminAuthModal();
        return;
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

function openAdminAuthModal() {
    let modal = document.getElementById('adminAuthModal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'adminAuthModal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:999999; display:flex; justify-content:center; align-items:center;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:#111116; border:1px solid #00ffff; width:85%; max-width:320px; padding:20px; border-radius:12px; text-align:center;">
            <h3 style="color:#00ffff; margin-top:0;">🔐 Admin Access</h3>
            <p style="color:#aaa; font-size:0.8rem; margin-bottom:15px;">Admin Password ထည့်ပါ</p>
            <input type="password" id="adminPassInput" placeholder="Password" style="width:100%; padding:10px; background:#181820; border:1px solid #333; color:#fff; border-radius:6px; box-sizing:border-box; margin-bottom:15px; text-align:center; font-size:1rem;">
            <div style="display:flex; gap:10px;">
                <button onclick="document.getElementById('adminAuthModal').remove()" style="flex:1; background:#222; color:#fff; border:none; padding:8px; border-radius:6px; cursor:pointer;">မလုပ်တော့ပါ</button>
                <button onclick="verifyAdminPassword()" style="flex:1; background:#00ffff; color:#000; border:none; padding:8px; border-radius:6px; font-weight:bold; cursor:pointer;">ဝင်မည်</button>
            </div>
        </div>
    `;
}

function verifyAdminPassword() {
    const inputElem = document.getElementById('adminPassInput');
    const pass = inputElem ? String(inputElem.value).trim() : '';

    if(pass === "296802") {
        isAdminAuthenticated = true;
        document.getElementById('adminAuthModal')?.remove();
        showToast("✅ Admin Login အောင်မြင်ပါသည်", "success");
        switchMainPage('admin');
    } else {
        showToast("❌ Admin Password မှားယွင်းပါသည်!", "error");
    }
}

async function loadAdminPanel() {
    const userContainer = document.getElementById('adminUsersContainer');
    const postContainer = document.getElementById('adminPostsContainer');
    if(!userContainer) return;

    try {
        if(!window.supabaseClient) return;

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
        }

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
                        </div>
                        <p style="font-size:0.8rem; margin:0 0 8px 0; color:#fff;">${escapeHtml(p.post_text || '')}</p>
                        <div style="display:flex; gap:8px;">
                            <button onclick="adminDeletePost('${p.id}')" style="background:#ff0033; color:#fff; border:none; padding:4px 10px; border-radius:4px; font-weight:bold; font-size:0.7rem; cursor:pointer;">❌ Delete Post/Video</button>
                        </div>
                    `;
                    postContainer.appendChild(div);
                });
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
