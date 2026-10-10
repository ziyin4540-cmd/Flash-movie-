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

        if(typeof switchMainPage === 'function') {
            switchMainPage('home');
        }
    }
}

function switchProfileTab(tabName) {
    currentProfileTab = tabName;
    document.querySelectorAll('.profile-tab-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.getElementById(`tab-btn-${tabName}`);
    if (targetBtn) targetBtn.classList.add('active');

    const profileUsername = document.getElementById('profileUserDisplay')?.innerText.replace('@', '') || localStorage.getItem('flash_logged_user');
    if (profileUsername) loadUserProfile(profileUsername);
}

async function loadUserProfile(username) {
    const { data: user } = await supabaseClient.from('flash_users').select('*').eq('username', username).single();
    if(!user) return;

    if(document.getElementById('profileNameDisplay')) document.getElementById('profileNameDisplay').innerText = user.display_name || username;
    if(document.getElementById('profileUserDisplay')) document.getElementById('profileUserDisplay').innerText = `@${username}`;
    if(document.getElementById('profileBioDisplay')) document.getElementById('profileBioDisplay').innerText = user.bio || '';
    if(user.photo_url && document.getElementById('profileImgDisplay')) document.getElementById('profileImgDisplay').src = user.photo_url;
    if(user.banner_url && document.getElementById('profileBannerBg')) document.getElementById('profileBannerBg').style.backgroundImage = `url('${user.banner_url}')`;

    const { count: followersCount } = await supabaseClient.from('flash_follows').select('*', { count: 'exact', head: true }).eq('following_id', username);
    const { count: followingCount } = await supabaseClient.from('flash_follows').select('*', { count: 'exact', head: true }).eq('follower_id', username);

    if(document.getElementById('statFollowers')) document.getElementById('statFollowers').innerText = followersCount || 0;
    if(document.getElementById('statFollowing')) document.getElementById('statFollowing').innerText = followingCount || 0;

    const { data: userPosts } = await supabaseClient.from('flash_posts').select('*').eq('username', username).order('created_at', { ascending: false });
    
    let postsCount = 0;
    let videosCount = 0;
    let totalLikes = 0;

    if(userPosts) {
        userPosts.forEach(p => {
            if(p.is_video || p.media_type === 'video' || p.media_type === 'gdrive_video' || p.media_type === 'telegram_video') videosCount++;
            else postsCount++;
            if(p.likes) totalLikes += p.likes.length;
        });
    }

    if(document.getElementById('statPosts')) document.getElementById('statPosts').innerText = postsCount;
    if(document.getElementById('statVideos')) document.getElementById('statVideos').innerText = videosCount;
    if(document.getElementById('statLikes')) document.getElementById('statLikes').innerText = totalLikes;

    const tabContent = document.getElementById('profileTabContent');
    if(!tabContent) return;

    const loggedUser = localStorage.getItem('flash_logged_user');
    const isOwner = loggedUser === username;

    tabContent.innerHTML = '';
    if(!userPosts || userPosts.length === 0) {
        tabContent.innerHTML = '<p style="color:#666; grid-column: 1 / -1; text-align:center; padding:20px;">ဘာမှ မရှိသေးပါ။</p>';
        return;
    }

    if(currentProfileTab === 'posts') {
        const filterPosts = userPosts.filter(p => !p.is_video && p.media_type !== 'gdrive_video' && p.media_type !== 'telegram_video');
        if(filterPosts.length === 0) {
            tabContent.innerHTML = '<p style="color:#666; grid-column: 1 / -1; text-align:center; padding:20px;">Posts မရှိသေးပါ။</p>';
            return;
        }
        filterPosts.forEach(p => {
            const item = document.createElement('div');
            item.style.cssText = 'background:#111116; border:1px solid #222233; border-radius:8px; padding:8px; position:relative;';
            item.innerHTML = `
                <p style="font-size:0.75rem; color:#fff; margin:0 0 5px 0; font-weight:bold;">${escapeHtml(p.post_text || '')}</p>
                ${p.media_url ? `<img src="${p.media_url}" style="width:100%; height:100px; object-fit:cover; border-radius:6px;">` : ''}
                ${isOwner ? `<button onclick="deleteUserPost('${p.id}')" style="background:#ff0033; color:#fff; border:none; padding:2px 6px; border-radius:4px; font-size:0.65rem; cursor:pointer; margin-top:5px; font-weight:bold; width:100%;">🗑 Delete</button>` : ''}
            `;
            tabContent.appendChild(item);
        });
    } else if(currentProfileTab === 'playlists') {
        let playlistsMap = {};
        userPosts.filter(p => p.playlist).forEach(p => {
            playlistsMap[p.playlist] = (playlistsMap[p.playlist] || 0) + 1;
        });

        const keys = Object.keys(playlistsMap);
        if(keys.length === 0) {
            tabContent.innerHTML = '<p style="color:#666; grid-column: 1 / -1; text-align:center; padding:20px;">Playlists မရှိသေးပါ။</p>';
            return;
        }

        keys.forEach(pl => {
            const item = document.createElement('div');
            item.style.cssText = 'background:#181820; border:1px solid #00ffff; border-radius:8px; padding:12px; text-align:center; cursor:pointer;';
            item.onclick = () => openPlaylistFolder(pl, username);
            item.innerHTML = `
                <div style="font-size:1.5rem; margin-bottom:4px;">📂</div>
                <div style="font-size:0.85rem; font-weight:bold; color:#00ffff;">${escapeHtml(pl)}</div>
                <div style="font-size:0.7rem; color:#aaa; margin-top:2px;">${playlistsMap[pl]} Videos</div>
            `;
            tabContent.appendChild(item);
        });
    } else if(currentProfileTab === 'videos') {
        const filterVideos = userPosts.filter(p => p.is_video || p.media_type === 'video' || p.media_type === 'gdrive_video' || p.media_type === 'telegram_video');
        if(filterVideos.length === 0) {
            tabContent.innerHTML = '<p style="color:#666; grid-column: 1 / -1; text-align:center; padding:20px;">Videos မရှိသေးပါ။</p>';
            return;
        }

        filterVideos.forEach(v => {
            const item = document.createElement('div');
            item.style.cssText = 'background:#111116; border:1px solid #222233; border-radius:8px; overflow:hidden; position:relative;';
            item.innerHTML = `
                <div onclick="openWatchVideoScreen('${v.id}')" style="cursor:pointer;">
                    <div style="width:100%; height:80px; background:#000; display:flex; justify-content:center; align-items:center; color:#00ffff;">
                        ${v.media_type === 'gdrive_video' ? '▶️ Drive' : (v.media_type === 'telegram_video' ? '🎬 Telegram' : `<video src="${v.media_url}" style="width:100%; height:100%; object-fit:cover;"></video>`)}
                    </div>
                    <div style="padding:6px;">
                        <p style="font-size:0.75rem; color:#fff; margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(v.post_text)}</p>
                    </div>
                </div>
                ${isOwner ? `<button onclick="deleteUserPost('${v.id}')" style="background:#ff0033; color:#fff; border:none; padding:2px 6px; border-radius:0 0 8px 8px; font-size:0.65rem; cursor:pointer; font-weight:bold; width:100%;">🗑 Delete</button>` : ''}
            `;
            tabContent.appendChild(item);
        });
    }
}
