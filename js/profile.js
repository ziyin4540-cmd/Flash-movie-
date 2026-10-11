// Profile Page Layout & Render Logic
let currentProfileTab = 'videos';

function switchProfileTab(tabName) {
    currentProfileTab = tabName;
    document.querySelectorAll('.profile-tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`tab-btn-${tabName}`);
    if (targetBtn) targetBtn.classList.add('active');

    const profileUsername = document.getElementById('profileUserDisplay')?.innerText.replace('@', '') || localStorage.getItem('flash_logged_user');
    if (profileUsername) loadUserProfile(profileUsername);
}

async function loadUserProfile(username) {
    const loggedUser = localStorage.getItem('flash_logged_user') || username;
    const targetUser = username || loggedUser;

    try {
        const { data: user } = await supabaseClient.from('flash_users').select('*').eq('username', targetUser).single();
        const { data: userPosts } = await supabaseClient.from('flash_posts').select('*').eq('username', targetUser).order('created_at', { ascending: false });
        const { data: userPlaylists } = await supabaseClient.from('flash_playlists').select('*').eq('username', targetUser);
        
        if (user) {
            renderUserProfileUI({ user, userPosts: userPosts || [], userPlaylists: userPlaylists || [] }, targetUser);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderUserProfileUI(data, username) {
    const { user, userPosts, userPlaylists } = data;
    const currentUser = localStorage.getItem('flash_logged_user');
    const profileContainer = document.getElementById('page-profile');
    if (!profileContainer) return;

    let postsCount = 0;
    let videosCount = 0;

    userPosts.forEach(p => {
        if (p.is_video || p.media_type === 'video' || p.media_type === 'youtube_video' || p.media_type === 'gdrive_video') videosCount++;
        else postsCount++;
    });

    profileContainer.innerHTML = `
        <div style="background:#111116; padding:10px 15px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222233; position:sticky; top:0; z-index:100;">
            <button onclick="if(typeof closeWatchVideoScreen === 'function') closeWatchVideoScreen(); switchMainPage('home');" style="background:#222; color:#00ffff; border:1px solid #00ffff; padding:5px 12px; border-radius:6px; font-weight:bold; font-size:0.75rem; cursor:pointer;">◄ နောက်သို့ (Back)</button>
            <span style="color:#fff; font-weight:bold; font-size:0.85rem;">Profile</span>
            ${currentUser === username ? `<button onclick="openAccountSettingsModal()" style="background:#00ffff; color:#000; border:none; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:0.75rem; cursor:pointer;">⚙️ Edit</button>` : '<span></span>'}
        </div>

        <div id="profileBannerBg" onclick="${currentUser === username ? 'triggerBannerPicker()' : ''}" style="height:120px; background:#222; background-size:cover; background-position:center; background-image:url('${user.banner_url || ''}'); cursor:pointer; position:relative;">
            ${currentUser === username ? `<span style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.6); color:#fff; font-size:0.65rem; padding:3px 6px; border-radius:4px;">📷 Change Cover</span>` : ''}
        </div>

        <div style="background:#111116; padding:15px; border-radius:0 0 12px 12px; border:1px solid #222233; text-align:center;">
            <div style="position:relative; display:inline-block;">
                <img id="profileImgDisplay" onclick="${currentUser === username ? 'triggerProfilePicker()' : ''}" src="${user.photo_url || 'https://via.placeholder.com/90'}" style="width:80px; height:80px; border-radius:50%; border:3px solid #00ffff; margin-top:-50px; background:#000; cursor:pointer; object-fit:cover;">
            </div>

            <h3 style="margin:8px 0 2px 0; color:#fff;">${escapeHtml(user.display_name || username)}</h3>
            <div id="profileUserDisplay" style="color:#00ffff; font-size:0.85rem; margin-bottom:12px;">@${username}</div>

            ${currentUser !== username ? `
                <button onclick="openChatWithUser('${username}')" style="background:#00ffff; color:#000; border:none; padding:8px 20px; border-radius:20px; font-weight:bold; font-size:0.8rem; margin-bottom:15px; cursor:pointer;">💬 Chat စကားပြောမည်</button>
            ` : ''}

            <div style="display:flex; justify-content:space-around; background:#181820; padding:10px; border-radius:8px; margin-bottom:15px;">
                <div><b style="color:#00ffff;">${postsCount}</b><br><span style="font-size:0.7rem; color:#888;">Posts</span></div>
                <div><b style="color:#00ffff;">${videosCount}</b><br><span style="font-size:0.7rem; color:#888;">Videos</span></div>
            </div>

            <div style="display:flex; border-bottom:1px solid #222233; margin-bottom:15px;">
                <button class="profile-tab-btn ${currentProfileTab === 'posts' ? 'active' : ''}" id="tab-btn-posts" onclick="switchProfileTab('posts')" style="flex:1; background:none; border:none; color:#00ffff; padding:8px; font-weight:bold; cursor:pointer;">Posts</button>
                <button class="profile-tab-btn ${currentProfileTab === 'playlists' ? 'active' : ''}" id="tab-btn-playlists" onclick="switchProfileTab('playlists')" style="flex:1; background:none; border:none; color:#aaa; padding:8px; font-weight:bold; cursor:pointer;">Playlists</button>
                <button class="profile-tab-btn ${currentProfileTab === 'videos' ? 'active' : ''}" id="tab-btn-videos" onclick="switchProfileTab('videos')" style="flex:1; background:none; border:none; color:#aaa; padding:8px; font-weight:bold; cursor:pointer;">Videos</button>
            </div>

            <div id="profileTabContent" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:8px;"></div>
        </div>

        <input type="file" id="hiddenProfilePicker" accept="image/*" style="display:none;">
        <input type="file" id="hiddenBannerPicker" accept="image/*" style="display:none;">
    `;

    setupPhotoPickers();
    const tabContent = document.getElementById('profileTabContent');
    if (!tabContent) return;

    tabContent.innerHTML = '';
    
    if (currentProfileTab === 'posts') {
        const filterPosts = userPosts.filter(p => !p.is_video && p.media_type !== 'youtube_video' && p.media_type !== 'gdrive_video');
        filterPosts.forEach(p => {
            const item = document.createElement('div');
            item.style.cssText = 'background:#181820; border:1px solid #222233; border-radius:6px; padding:6px;';
            item.innerHTML = `<p style="font-size:0.75rem; color:#fff; margin:0;">${escapeHtml(p.post_text || '')}</p>`;
            tabContent.appendChild(item);
        });
    } else if (currentProfileTab === 'playlists') {
        if (currentUser === username) {
            tabContent.innerHTML = `<button onclick="openCreatePlaylistModal()" style="grid-column:1/-1; background:#00ffff; color:#000; border:none; padding:8px; border-radius:6px; font-weight:bold; cursor:pointer; margin-bottom:10px;">➕ Create Playlist အသစ်ဆောက်မည်</button>`;
        }
        if (userPlaylists && userPlaylists.length > 0) {
            userPlaylists.forEach(pl => {
                const item = document.createElement('div');
                item.style.cssText = 'background:#181820; border:1px solid #222233; border-radius:6px; padding:8px; text-align:left;';
                item.innerHTML = `<h5 style="margin:0; color:#00ffff;">📂 ${escapeHtml(pl.playlist_name)}</h5>`;
                tabContent.appendChild(item);
            });
        }
    } else {
        const filterVideos = userPosts.filter(p => p.is_video || p.media_type === 'youtube_video' || p.media_type === 'gdrive_video');
        filterVideos.forEach(v => {
            const item = document.createElement('div');
            item.style.cssText = 'background:#181820; border:1px solid #222233; border-radius:6px; overflow:hidden; cursor:pointer;';
            item.onclick = () => openWatchVideoScreen(v.id);
            item.innerHTML = `
                <div style="height:60px; background:#000; display:flex; justify-content:center; align-items:center; color:#00ffff; font-size:0.7rem; font-weight:bold;">▶️ Play</div>
                <div style="padding:4px;"><p style="font-size:0.7rem; color:#fff; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(v.post_text || 'Video')}</p></div>
            `;
            tabContent.appendChild(item);
        });
    }
}
