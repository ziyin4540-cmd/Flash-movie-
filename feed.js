let tempFbMediaData = "";
let tempMediaType = "";
let activeCommentPostId = null;
let activeWatchVideoId = null;
let tempAppVideoData = "";

document.addEventListener('DOMContentLoaded', () => {
    const mediaPicker = document.getElementById('fbMediaPicker');
    if(mediaPicker) {
        mediaPicker.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                if (file.size > 5 * 1024 * 1024) {
                    showToast(`⚠️ ဖိုင်ဆိုဒ် ကြီးလွန်းပါသည် (${fileSizeMB}MB / 5MB အောက်သာ)။`, 'error');
                    this.value = '';
                    document.getElementById('selectedMediaName').innerText = '';
                    return;
                }
                tempMediaType = file.type.startsWith('image') ? 'image' : 'video';
                document.getElementById('selectedMediaName').innerText = `ရွေးပြီး: ${file.name} (${fileSizeMB}MB)`;
                compressImageOrFile(file, (base64) => { tempFbMediaData = base64; });
            }
        });
    }

    const appVideoPicker = document.getElementById('appVideoPicker');
    if(appVideoPicker) {
        appVideoPicker.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                if(file.size > 5 * 1024 * 1024) {
                    showToast(`⚠️ ဗီဒီယိုဖိုင်ဆိုဒ် ကြီးလွန်းပါသည် (${fileSizeMB}MB / 5MB အောက်သာ)။ Telegram Link သုံးပါ။`, 'error');
                    this.value = '';
                    document.getElementById('uploadVideoPreviewName').innerText = '';
                    return;
                }
                document.getElementById('uploadVideoPreviewName').innerText = `ရွေးပြီး: ${file.name} (${fileSizeMB}MB)`;
                const reader = new FileReader();
                reader.onload = (ev) => { tempAppVideoData = ev.target.result; };
                reader.readAsDataURL(file);
            }
        });
    }
});

function compressImageOrFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400;
            const MAX_HEIGHT = 400;
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

function timeAgo(dateString) {
    if(!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + ' နှစ်ခင်က';
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' လခင်က';
    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' ရက်ခင်က';
    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' နာရီခင်က';
    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' မိနစ်ခင်က';
    return 'ယခုလေးတင်';
}

async function handleCreateFbPost() {
    const text = document.getElementById('fbPostTextInput').value.trim();
    const currentUser = localStorage.getItem('flash_logged_user');
    if(!text && !tempFbMediaData) return showToast('စာ သို့မဟုတ် ဖိုင်ထည့်ပါ။', 'error');

    let userPhoto = 'https://via.placeholder.com/35';
    let displayName = currentUser;
    const { data: uData } = await supabaseClient.from('flash_users').select('*').eq('username', currentUser).single();
    if(uData) {
        if(uData.photo_url) userPhoto = uData.photo_url;
        if(uData.display_name) displayName = uData.display_name;
    }

    const { error } = await supabaseClient.from('flash_posts').insert([{
        username: currentUser,
        display_name: displayName,
        user_photo: userPhoto,
        post_text: text,
        media_url: tempFbMediaData,
        media_type: tempMediaType,
        likes: [],
        comments: [],
        reports: 0,
        is_video: false
    }]);

    if(error) {
        showToast('❌ ပို့စ်တင်၍မရပါ: ' + error.message, 'error');
        return;
    }

    document.getElementById('fbPostTextInput').value = '';
    document.getElementById('selectedMediaName').innerText = '';
    tempFbMediaData = "";
    tempMediaType = "";
    
    showToast('✅ ပို့စ်တင်ခြင်း အောင်မြင်ပါသည်။', 'success');
    switchMainPage('feed');
    loadFbFeed();
}

async function handleDirectVideoUpload() {
    const title = document.getElementById('uploadVideoTitle').value.trim();
    const playlistInput = document.getElementById('uploadPlaylistInput').value.trim() || 'General';
    const telegramLink = document.getElementById('telegramVideoLinkInput').value.trim();
    const isPlaylistEnabled = document.getElementById('playlistToggleSwitch').checked;
    const currentUser = localStorage.getItem('flash_logged_user');

    if(!title) return showToast('ခေါင်းစဉ် ထည့်ပါ။', 'error');

    let finalMediaUrl = tempAppVideoData;
    let finalMediaType = 'video';

    if(telegramLink) {
        finalMediaUrl = telegramLink;
        finalMediaType = 'telegram_video';
    } else if(!tempAppVideoData) {
        return showToast('Telegram Link (သို့မဟုတ်) ဗီဒီယိုဖိုင် ရွေးပါ။', 'error');
    }

    const progressBox = document.getElementById('uploadProgressBox');
    const progressBar = document.getElementById('lightningProgressBar');
    const progressText = document.getElementById('progressPercentText');
    if(progressBox) progressBox.classList.remove('hidden');

    let progress = 0;
    let interval = setInterval(async () => {
        progress += 35;
        if(progressBar) progressBar.style.width = progress + '%';
        if(progressText) progressText.innerText = progress + '%';

        if(progress >= 100) {
            clearInterval(interval);

            let userPhoto = 'https://via.placeholder.com/35';
            let displayName = currentUser;
            const { data: uData } = await supabaseClient.from('flash_users').select('*').eq('username', currentUser).single();
            if(uData) {
                if(uData.photo_url) userPhoto = uData.photo_url;
                if(uData.display_name) displayName = uData.display_name;
            }

            const { error } = await supabaseClient.from('flash_posts').insert([{
                username: currentUser,
                display_name: displayName,
                user_photo: userPhoto,
                post_text: title,
                media_url: finalMediaUrl,
                media_type: finalMediaType,
                playlist: playlistInput,
                playlist_active: isPlaylistEnabled,
                likes: [],
                comments: [],
                reports: 0,
                is_video: true
            }]);

            if(progressBox) progressBox.classList.add('hidden');
            if(progressBar) progressBar.style.width = '0%';

            if(error) {
                showToast('❌ ဗီဒီယိုတင်၍မရပါ: ' + error.message, 'error');
                return;
            }

            document.getElementById('uploadVideoTitle').value = '';
            document.getElementById('telegramVideoLinkInput').value = '';
            document.getElementById('uploadVideoPreviewName').innerText = '';
            tempAppVideoData = "";

            showToast('✅ ဗီဒီယို တင်ခြင်း အောင်မြင်ပါသည်။', 'success');
            switchMainPage('home');
            loadHomeVideos();
        }
    }, 80);
}

// ဗီဒီယိုဟောင်းများပါ မကျန်အောင် အပြည့်အစုံ ဆွဲထုတ်ပေးမည့် function
async function loadHomeVideos(searchQuery = '') {
    const container = document.getElementById('homeVideoFeedContainer');
    if(!container) return;

    const { data: posts, error } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
    if(error || !posts) {
        container.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">ဗီဒီယိုများ ရယူရာတွင် အမှားရှိနေပါသည်။</p>';
        return;
    }

    // is_video true ဖြစ်သော (သို့မဟုတ် is_video null/undefined ဖြစ်နေသော်လည်း media ပါသော) ဗီဒီယိုဟောင်းများပါ ဖမ်းယူပေးခြင်း
    let videoPosts = posts.filter(p => p.is_video === true || p.media_type === 'video' || p.media_type === 'telegram_video' || (p.media_url && p.media_url.includes('t.me')));
    
    if(videoPosts.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">ဗီဒီယိုများ မရှိသေးပါ။</p>';
        return;
    }

    let filtered = videoPosts.filter(p => {
        const matchSearch = (p.post_text || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.display_name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchActive = p.playlist_active !== false;
        return matchSearch && matchActive;
    });

    container.innerHTML = '';
    if(filtered.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">ရှာမတွေ့ပါ။</p>';
        return;
    }

    filtered.forEach(v => {
        const div = document.createElement('div');
        div.className = 'video-card-item';
        
        let mediaPreviewHtml = '';
        if(v.media_type === 'telegram_video' || (v.media_url && v.media_url.includes('t.me'))) {
            mediaPreviewHtml = `
                <div style="width:100%; height:100%; background:#181820; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#00ffff;">
                    <span style="font-size:1.8rem;">🎬</span>
                    <span style="font-size:0.75rem; font-weight:bold; margin-top:4px;">Telegram Video Player</span>
                </div>`;
        } else {
            mediaPreviewHtml = `<video src="${v.media_url}#t=0.5" preload="metadata" muted></video>`;
        }

        div.innerHTML = `
            <div class="video-thumbnail-wrapper" onclick="openWatchVideoScreen('${v.id}')">
                ${mediaPreviewHtml}
                <div class="video-duration-badge">HD</div>
            </div>
            <div class="video-card-info">
                <img src="${v.user_photo || 'https://via.placeholder.com/35'}" class="contact-avatar" style="width:38px; height:38px; cursor:pointer;" onclick="openCreatorProfile('${v.username}')">
                <div class="video-details-text" style="flex:1;" onclick="openWatchVideoScreen('${v.id}')">
                    <h4>${escapeHtml(v.post_text)}</h4>
                    <p style="cursor:pointer;" onclick="event.stopPropagation(); openCreatorProfile('${v.username}')">${escapeHtml(v.display_name || v.username)} • <span style="color:#00ffff;">${escapeHtml(v.playlist || 'General')}</span></p>
                    <p style="font-size:0.65rem; color:#666; margin-top:2px;">တင်ခဲ့ချိန်: ${timeAgo(v.created_at)}</p>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

async function openCreatorProfile(username) {
    const currentUser = localStorage.getItem('flash_logged_user');
    if(username === currentUser) {
        switchMainPage('profile');
        return;
    }

    const { data: user } = await supabaseClient.from('flash_users').select('*').eq('username', username).single();
    if(!user) return;

    let profileModal = document.getElementById('creatorProfileModal');
    if(!profileModal) {
        profileModal = document.createElement('div');
        profileModal.id = 'creatorProfileModal';
        profileModal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#070709; z-index:999999; overflow-y:auto; box-sizing:border-box; padding:0;';
        document.body.appendChild(profileModal);
    }

    const { data: userPosts } = await supabaseClient.from('flash_posts').select('*').eq('username', username).order('created_at', { ascending: false });
    const postsList = userPosts || [];
    const videosList = postsList.filter(p => p.is_video === true || p.media_type === 'video' || p.media_type === 'telegram_video' || (p.media_url && p.media_url.includes('t.me')));
    const normalPostsList = postsList.filter(p => !videosList.includes(p));

    let followersArr = user.followers || [];
    const isFollowing = followersArr.includes(currentUser);

    let uploadsHtml = '';
    videosList.forEach(item => {
        uploadsHtml += `
            <div class="upload-item-card" onclick="document.getElementById('creatorProfileModal').remove(); openWatchVideoScreen('${item.id}')">
                <video src="${item.media_url}" width="100%" style="border-radius:4px; height:100px; object-fit:cover; background:#000;"></video>
                <p style="font-size:0.75rem; margin:4px 0 0 0; color:#ccc;">${escapeHtml(item.post_text)}</p>
            </div>`;
    });

    profileModal.innerHTML = `
        <div style="background:#111116; padding:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222233; position:sticky; top:0; z-index:10;">
            <button onclick="document.getElementById('creatorProfileModal').remove()" style="background:none; border:none; color:#00ffff; font-weight:bold; font-size:0.9rem; cursor:pointer;">◄ နောက်သို့</button>
            <span style="color:#ff0033; font-weight:bold; font-size:0.9rem;">Creator Profile</span>
        </div>
        <div class="profile-card-modern" style="margin:15px; border-radius:16px;">
            <div class="profile-banner" style="background-image: url('${user.banner_url || ''}');"></div>
            <div class="profile-avatar-wrapper">
                <img src="${user.photo_url || 'https://via.placeholder.com/90'}" class="profile-img-preview-modern">
            </div>
            <h2 class="profile-name" style="color:#fff; margin:8px 0 2px 0;">${escapeHtml(user.display_name || user.username)}</h2>
            <p class="profile-username" style="color:#888; font-size:0.8rem; margin:0;">@${user.username}</p>
            ${user.bio ? `<p style="font-size:0.8rem; color:#aaa; margin:5px 15px 10px 15px;">${escapeHtml(user.bio)}</p>` : ''}
            
            <div style="margin: 10px 15px;">
                <button onclick="toggleFollowUser('${user.username}')" style="width:100%; background:${isFollowing ? '#333344' : '#ff0033'}; color:#fff; border:none; padding:10px; font-weight:bold; border-radius:8px; cursor:pointer;">
                    ${isFollowing ? '✓ Following (Unfollow)' : '+ Follow'}
                </button>
            </div>

            <div class="profile-stats">
                <div class="stat-item"><span class="stat-num">${normalPostsList.length}</span><span class="stat-label">Posts</span></div>
                <div class="stat-item"><span class="stat-num">${videosList.length}</span><span class="stat-label">Videos</span></div>
                <div class="stat-item"><span class="stat-num">${followersArr.length}</span><span class="stat-label">Followers</span></div>
                <div class="stat-item"><span class="stat-num">${(user.following || []).length}</span><span class="stat-label">Following</span></div>
            </div>
        </div>
        <div style="padding:15px;">
            <h4 style="color:#00ffff; margin-bottom:10px;">🎥 Uploaded Videos</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:8px;">
                ${uploadsHtml || '<p style="color:#666; font-size:0.8rem;">ဗီဒီယိုများ မရှိသေးပါ။</p>'}
            </div>
        </div>
    `;
    profileModal.classList.remove('hidden');
}

async function toggleFollowUser(targetUsername) {
    const currentUser = localStorage.getItem('flash_logged_user');
    const { data: targetUser } = await supabaseClient.from('flash_users').select('*').eq('username', targetUsername).single();
    if(!targetUser) return;

    let followers = targetUser.followers || [];
    if(followers.includes(currentUser)) {
        followers = followers.filter(u => u !== currentUser);
        showToast('Unfollowed', 'success');
    } else {
        followers.push(currentUser);
        showToast('Following!', 'success');
    }

    await supabaseClient.from('flash_users').update({ followers: followers }).eq('username', targetUsername);
    openCreatorProfile(targetUsername);
}

async function openWatchVideoScreen(videoId) {
    activeWatchVideoId = videoId;
    const { data: v } = await supabaseClient.from('flash_posts').select('*').eq('id', videoId).single();
    if(!v) return;

    let watchPage = document.getElementById('page-watch-video');
    if(!watchPage) {
        watchPage = document.createElement('div');
        watchPage.id = 'page-watch-video';
        watchPage.className = 'main-section hidden';
        watchPage.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#070709; z-index:99999; overflow-y:auto; box-sizing:border-box; padding:0;';
        document.body.appendChild(watchPage);
    }

    const currentUser = localStorage.getItem('flash_logged_user');
    const likesArr = v.likes || [];
    const isLiked = likesArr.includes(currentUser);
    const commentsArr = v.comments || [];

    let mediaContent = '';
    if(v.media_type === 'telegram_video' || (v.media_url && v.media_url.includes('t.me'))) {
        let embedUrl = v.media_url.includes('t.me/') ? v.media_url.replace('t.me/', 't.me/s/') : v.media_url;
        mediaContent = `
            <div style="width:100%; height:250px; background:#000; position:relative;">
                <iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen style="border:none;"></iframe>
            </div>`;
    } else {
        mediaContent = `<video src="${v.media_url}" controls autoplay width="100%" style="background:#000; max-height:300px;"></video>`;
    }

    const { data: allPosts } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
    let nextVideosHtml = '';
    if(allPosts) {
        let otherVideos = allPosts.filter(item => item.id !== videoId && (item.is_video === true || item.media_type === 'video' || item.media_type === 'telegram_video' || (item.media_url && item.media_url.includes('t.me'))));
        otherVideos.slice(0, 5).forEach(nv => {
            nextVideosHtml += `
                <div onclick="openWatchVideoScreen('${nv.id}')" style="display:flex; gap:10px; background:#111116; padding:8px; border-radius:8px; cursor:pointer; margin-bottom:8px; border:1px solid #222233;">
                    <div style="width:100px; height:60px; background:#000; border-radius:6px; overflow:hidden; flex-shrink:0;">
                        ${nv.media_type === 'telegram_video' || (nv.media_url && nv.media_url.includes('t.me')) ? '<div style="color:#00ffff; text-align:center; padding-top:15px; font-size:0.7rem;">🎬 Telegram</div>' : `<video src="${nv.media_url}" width="100%" height="100%" style="object-fit:cover;"></video>`}
                    </div>
                    <div>
                        <h5 style="margin:0 0 4px 0; font-size:0.85rem; color:#fff; line-height:1.2;">${escapeHtml(nv.post_text)}</h5>
                        <p style="margin:0; font-size:0.7rem; color:#888;">${escapeHtml(nv.display_name || nv.username)}</p>
                    </div>
                </div>`;
        });
    }

    watchPage.innerHTML = `
        <div style="background:#111116; padding:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222233; position:sticky; top:0; z-index:10;">
            <button onclick="closeWatchVideoScreen()" style="background:none; border:none; color:#00ffff; font-weight:bold; font-size:0.9rem; cursor:pointer;">◄ နောက်သို့ (Back)</button>
            <span style="color:#ff0033; font-weight:bold; font-size:0.9rem;">Flâsh Watch</span>
        </div>
        ${mediaContent}
        <div style="padding:15px;">
            <h3 style="color:#fff; font-size:1rem; margin-bottom:8px;">${escapeHtml(v.post_text)}</h3>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; cursor:pointer;" onclick="openCreatorProfile('${v.username}')">
                <img src="${v.user_photo || 'https://via.placeholder.com/35'}" class="contact-avatar">
                <div>
                    <div style="font-weight:bold; font-size:0.9rem;">${escapeHtml(v.display_name || v.username)}</div>
                    <div style="color:#888; font-size:0.75rem;">@${v.username} • <span style="color:#00ffff;">တင်ခဲ့ချိန်: ${timeAgo(v.created_at)}</span></div>
                </div>
            </div>

            <div style="display:flex; justify-content:space-around; background:#111116; border:1px solid #222233; padding:10px; border-radius:12px; margin-bottom:15px;">
                <button class="fb-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikeWatchVideo('${v.id}')">❤️ ${likesArr.length}</button>
                <button class="fb-action-btn" onclick="openCommentPage('${v.id}')">💬 Comments (${commentsArr.length})</button>
                <button class="fb-action-btn" onclick="openShareToChatModal('${v.id}', '${escapeHtml(v.post_text)}')">↗ Share to Chat</button>
                <button class="fb-action-btn" onclick="reportPost('${v.id}')" style="color:#ff0033;">🚩 Report</button>
            </div>

            <h4 style="color:#00ffff; font-size:0.9rem; margin-bottom:10px;">⏭ နောက်လာမည့် ဗီဒီယိုများ (Next Videos)</h4>
            ${nextVideosHtml || '<p style="color:#666; font-size:0.8rem;">ဗီဒီယို အခြားမရှိသေးပါ။</p>'}
        </div>
    `;

    document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden'));
    watchPage.classList.remove('hidden');
}

function closeWatchVideoScreen() {
    const watchPage = document.getElementById('page-watch-video');
    if(watchPage) watchPage.classList.add('hidden');
    switchMainPage('home');
}

async function toggleLikeWatchVideo(videoId) {
    await toggleLikePost(videoId);
    openWatchVideoScreen(videoId);
}

function openCommentPage(postId) {
    activeCommentPostId = postId;
    switchMainPage('comment');
    loadCommentScreenContent();
}

async function openShareToChatModal(videoId, videoTitle) {
    const currentUser = localStorage.getItem('flash_logged_user');
    const { data: users } = await supabaseClient.from('flash_users').select('*').neq('username', currentUser);
    
    let modal = document.getElementById('shareChatModal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'shareChatModal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:999999; display:flex; justify-content:center; align-items:center;';
        document.body.appendChild(modal);
    }

    let usersHtml = '';
    if(users) {
        users.forEach(u => {
            usersHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:#181820; padding:10px; border-radius:8px; margin-bottom:8px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${u.photo_url || 'https://via.placeholder.com/35'}" class="contact-avatar">
                        <div>
                            <div style="font-weight:bold; font-size:0.85rem; color:#fff;">${escapeHtml(u.display_name || u.username)}</div>
                            <div style="color:#888; font-size:0.7rem;">@${u.username}</div>
                        </div>
                    </div>
                    <button onclick="sendVideoToChatUser('${u.username}', '${videoId}', '${videoTitle}')" style="background:#00ffff; color:#000; border:none; padding:6px 12px; font-weight:bold; border-radius:6px; cursor:pointer; font-size:0.75rem;">Share</button>
                </div>`;
        });
    }

    modal.innerHTML = `
        <div style="background:#111116; border:1px solid #222233; padding:20px; border-radius:14px; width:90%; max-width:400px; max-height:80vh; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="color:#00ffff; margin:0; font-size:1rem;">📤 Share to Chat</h3>
                <button onclick="document.getElementById('shareChatModal').remove()" style="background:none; border:none; color:#fff; font-size:1.1rem; cursor:pointer;">✕</button>
            </div>
            ${usersHtml || '<p style="color:#666; text-align:center;">User များ မရှိသေးပါ။</p>'}
        </div>
    `;
    modal.classList.remove('hidden');
}

async function sendVideoToChatUser(receiverUsername, videoId, videoTitle) {
    const currentUser = localStorage.getItem('flash_logged_user');
    const shareMessage = `🎬 Shared Video: ${videoTitle} (ID: ${videoId})`;

    const { error } = await supabaseClient.from('flash_chats').insert([{
        sender: currentUser,
        receiver: receiverUsername,
        message: shareMessage,
        created_at: new Date().toISOString()
    }]);

    if(!error) {
        showToast('✅ ချတ်သို့ မျှဝေပြီးပါပြီ။', 'success');
        document.getElementById('shareChatModal').remove();
    } else {
        showToast('❌ မျှဝေ၍မရပါ', 'error');
    }
}

function escapeHtml(text) {
    if(!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
