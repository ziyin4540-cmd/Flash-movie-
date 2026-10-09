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

async function loadHomeVideos(searchQuery = '') {
    const container = document.getElementById('homeVideoFeedContainer');
    if(!container) return;

    const { data: posts, error } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
    if(error || !posts) {
        container.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">ဗီဒီယိုများ ရယူရာတွင် အမှားရှိနေပါသည်။</p>';
        return;
    }

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
                    <span style="font-size:0.75rem; font-weight:bold; margin-top:4px;">Telegram Video Widget</span>
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

// မြန်ဆန်သော Watch Screen Player နှင့် Previous / Next Controls များပါဝင်သည့် စနစ်
async function openWatchVideoScreen(videoId) {
    activeWatchVideoId = videoId;

    let watchPage = document.getElementById('page-watch-video');
    if(!watchPage) {
        watchPage = document.createElement('div');
        watchPage.id = 'page-watch-video';
        watchPage.className = 'main-section hidden';
        watchPage.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#070709; z-index:99999; overflow-y:auto; box-sizing:border-box; padding:0;';
        document.body.appendChild(watchPage);
    }

    document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden'));
    watchPage.classList.remove('hidden');

    const { data: v } = await supabaseClient.from('flash_posts').select('*').eq('id', videoId).single();
    if(!v) return;

    const { data: allVideoPosts } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
    let videoList = (allVideoPosts || []).filter(item => item.is_video === true || item.media_type === 'video' || item.media_type === 'telegram_video' || (item.media_url && item.media_url.includes('t.me')));

    let currentIndex = videoList.findIndex(item => item.id === videoId);
    let prevVideo = currentIndex > 0 ? videoList[currentIndex - 1] : null;
    let nextVideo = currentIndex < videoList.length - 1 ? videoList[currentIndex + 1] : null;

    const currentUser = localStorage.getItem('flash_logged_user');
    const likesArr = v.likes || [];
    const isLiked = likesArr.includes(currentUser);
    const commentsArr = v.comments || [];

    let mediaContent = '';
    if(v.media_type === 'telegram_video' || (v.media_url && v.media_url.includes('t.me'))) {
        let postPath = v.media_url.replace('https://t.me/', '');
        mediaContent = `
            <div style="width:100%; min-height:260px; background:#111116; display:flex; justify-content:center; align-items:center; padding:10px 0;">
                <script async src="https://telegram.org/js/telegram-widget.js?22" data-telegram-post="${postPath}" data-width="100%" data-dark="1"></script>
            </div>`;
    } else {
        mediaContent = `<video src="${v.media_url}" controls autoplay width="100%" style="background:#000; max-height:300px;"></video>`;
    }

    let nextVideosHtml = '';
    videoList.slice(0, 6).forEach(nv => {
        if(nv.id !== videoId) {
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
        }
    });

    watchPage.innerHTML = `
        <div style="background:#111116; padding:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222233; position:sticky; top:0; z-index:100;">
            <button onclick="closeWatchVideoScreen()" style="background:none; border:none; color:#00ffff; font-weight:bold; font-size:0.9rem; cursor:pointer;">◄ နောက်သို့ (Back)</button>
            <span style="color:#ff0033; font-weight:bold; font-size:0.9rem;">Flâsh Watch</span>
        </div>

        ${mediaContent}

        <!-- Previous / Next Controls ခလုတ်များ -->
        <div style="display:flex; justify-content:space-between; background:#181820; padding:8px 15px; border-bottom:1px solid #222233;">
            <button ${prevVideo ? `onclick="openWatchVideoScreen('${prevVideo.id}')"` : 'disabled'} style="background:${prevVideo ? '#222233' : '#111'}; color:${prevVideo ? '#00ffff' : '#555'}; border:1px solid #333; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.8rem;">⏮ ရှေ့ဗီဒီယို (Prev)</button>
            <button ${nextVideo ? `onclick="openWatchVideoScreen('${nextVideo.id}')"` : 'disabled'} style="background:${nextVideo ? '#ff0033' : '#111'}; color:${nextVideo ? '#fff' : '#555'}; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.8rem;">နောက်ဗီဒီယို (Next) ⏭</button>
        </div>

        <div style="padding:15px; position:relative; z-index:10;">
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
}

function closeWatchVideoScreen() {
    const watchPage = document.getElementById('page-watch-video');
    if(watchPage) watchPage.classList.add('hidden');
    switchMainPage('home');
}

async function toggleLikeWatchVideo(videoId) {
    await toggleLikePost(postId);
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
