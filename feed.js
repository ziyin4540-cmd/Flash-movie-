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
                    showToast(`⚠️ ဗီဒီယိုဖိုင်ဆိုဒ် ကြီးလွန်းပါသည် (${fileSizeMB}MB / 5MB အောက်သာ)။ Google Drive Link သုံးပါ။`, 'error');
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
    loadFbFeed();
}

async function loadFbFeed() {
    const container = document.getElementById('fbFeedContainer');
    if(!container) return;

    const { data: posts, error } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
    if(error || !posts) {
        container.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">ပို့စ်များ မရှိသေးပါ။</p>';
        return;
    }

    let feedPosts = posts.filter(p => p.is_video !== true && p.media_type !== 'gdrive_video' && p.media_type !== 'telegram_video');
    if(feedPosts.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">ပို့စ်များ မရှိသေးပါ။</p>';
        return;
    }

    const currentUser = localStorage.getItem('flash_logged_user');
    container.innerHTML = '';

    feedPosts.forEach(post => {
        const likesArr = post.likes || [];
        const isLiked = likesArr.includes(currentUser);
        const commentsArr = post.comments || [];
        const div = document.createElement('div');
        div.className = 'fb-post-card';

        let mediaHtml = '';
        if(post.media_url) {
            mediaHtml = post.media_type === 'image' ? `<img src="${post.media_url}" width="100%" style="border-radius:8px; margin-top:8px; max-height:350px; object-fit:cover;">` : `<video src="${post.media_url}" controls width="100%" style="border-radius:8px; margin-top:8px; background:#000;"></video>`;
        }

        div.innerHTML = `
            <div class="fb-post-header">
                <img src="${post.user_photo || 'https://via.placeholder.com/35'}" class="contact-avatar">
                <div>
                    <div style="font-weight:bold; font-size:0.9rem;">${escapeHtml(post.display_name || post.username)}</div>
                    <div style="color:#888; font-size:0.7rem;">@${post.username} • ${timeAgo(post.created_at)}</div>
                </div>
            </div>
            <p style="font-size:0.9rem; margin:8px 0; word-break:break-word;">${escapeHtml(post.post_text || '')}</p>
            ${mediaHtml}
            <div class="fb-post-actions" style="display:flex; justify-content:space-around; border-top:1px solid #222233; margin-top:10px; padding-top:8px;">
                <button class="fb-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikePost('${post.id}')" style="background:none; border:none; color:${isLiked ? '#ff0033' : '#aaa'}; font-weight:bold; cursor:pointer;">❤️ ${likesArr.length} Likes</button>
                <button class="fb-action-btn" onclick="openCommentPage('${post.id}')" style="background:none; border:none; color:#00ffff; font-weight:bold; cursor:pointer;">💬 Comments (${commentsArr.length})</button>
                <button class="fb-action-btn" onclick="reportPost('${post.id}')" style="background:none; border:none; color:#ff0033; font-weight:bold; cursor:pointer;">🚩 Report</button>
            </div>
        `;
        container.appendChild(div);
    });
}

async function handleDirectVideoUpload() {
    const title = document.getElementById('uploadVideoTitle').value.trim();
    const playlistInput = document.getElementById('uploadPlaylistInput').value.trim() || 'General';
    const externalLink = document.getElementById('externalVideoLinkInput').value.trim();
    const isPlaylistEnabled = document.getElementById('playlistToggleSwitch').checked;
    const currentUser = localStorage.getItem('flash_logged_user');

    if(!title) return showToast('ခေါင်းစဉ် ထည့်ပါ။', 'error');

    let finalMediaUrl = tempAppVideoData;
    let finalMediaType = 'video';

    if(externalLink) {
        finalMediaUrl = externalLink;
        if(externalLink.includes('drive.google.com')) {
            finalMediaType = 'gdrive_video';
        } else {
            finalMediaType = 'telegram_video';
        }
    } else if(!tempAppVideoData) {
        return showToast('Google Drive Link (သို့မဟုတ်) ဗီဒီယိုဖိုင် ရွေးပါ။', 'error');
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
            document.getElementById('externalVideoLinkInput').value = '';
            document.getElementById('uploadVideoPreviewName').innerText = '';
            tempAppVideoData = "";

            showToast('✅ ဗီဒီယို တင်ခြင်း အောင်မြင်ပါသည်။', 'success');
            switchMainPage('home');
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

    let videoPosts = posts.filter(p => p.is_video === true || p.media_type === 'video' || p.media_type === 'gdrive_video' || p.media_type === 'telegram_video' || (p.media_url && (p.media_url.includes('drive.google.com') || p.media_url.includes('t.me'))));
    
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
    filtered.forEach(v => {
        const div = document.createElement('div');
        div.className = 'video-card-item';
        
        let mediaPreviewHtml = '';
        if(v.media_type === 'gdrive_video' || (v.media_url && v.media_url.includes('drive.google.com'))) {
            mediaPreviewHtml = `
                <div style="width:100%; height:100%; background:#181820; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#00ffff;">
                    <span style="font-size:1.8rem;">▶️</span>
                    <span style="font-size:0.75rem; font-weight:bold; margin-top:4px;">Google Drive Video Player</span>
                </div>`;
        } else if(v.media_type === 'telegram_video' || (v.media_url && v.media_url.includes('t.me'))) {
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

// Google Drive Link ကို Embed Link အဖြစ် အလိုအလျောက် ပြောင်းပေးသည့် စနစ်
function convertGDriveUrlToEmbed(url) {
    if(!url) return '';
    if(url.includes('/file/d/')) {
        let fileId = url.split('/file/d/')[1].split('/')[0];
        return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    return url;
}

async function openWatchVideoScreen(videoId) {
    activeWatchVideoId = videoId;

    let watchPage = document.getElementById('page-watch-video');
    if(!watchPage) {
        watchPage = document.createElement('div');
        watchPage.id = 'page-watch-video';
        watchPage.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#070709; z-index:9999; overflow-y:auto; box-sizing:border-box; padding:0;';
        document.body.appendChild(watchPage);
    }

    watchPage.innerHTML = `
        <div style="background:#111116; padding:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222233;">
            <button onclick="closeWatchVideoScreen()" style="background:none; border:none; color:#00ffff; font-weight:bold; font-size:0.9rem; cursor:pointer;">◄ နောက်သို့ (Back)</button>
            <span style="color:#ff0033; font-weight:bold; font-size:0.9rem;">Flâsh Watch</span>
        </div>
        <div style="display:flex; justify-content:center; align-items:center; height:300px; color:#00ffff; font-weight:bold;">⚡ Loading Video...</div>
    `;

    const { data: v } = await supabaseClient.from('flash_posts').select('*').eq('id', videoId).single();
    if(!v) return;

    const currentUser = localStorage.getItem('flash_logged_user');
    const likesArr = v.likes || [];
    const isLiked = likesArr.includes(currentUser);
    const commentsArr = v.comments || [];

    let mediaContent = '';
    if(v.media_type === 'gdrive_video' || (v.media_url && v.media_url.includes('drive.google.com'))) {
        let embedUrl = convertGDriveUrlToEmbed(v.media_url);
        mediaContent = `
            <div style="width:100%; height:280px; background:#000;">
                <iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay" allowfullscreen style="border:none;"></iframe>
            </div>`;
    } else if(v.media_type === 'telegram_video' || (v.media_url && v.media_url.includes('t.me'))) {
        let cleanUrl = v.media_url.replace('https://t.me/', '');
        let embedUrl = `https://t.me/${cleanUrl}?embed=1&dark=1`;
        mediaContent = `
            <div style="width:100%; height:280px; background:#000;">
                <iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen style="border:none;"></iframe>
            </div>`;
    } else {
        mediaContent = `<video src="${v.media_url}" controls autoplay width="100%" style="background:#000; max-height:300px;"></video>`;
    }

    watchPage.innerHTML = `
        <div style="background:#111116; padding:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222233; position:sticky; top:0; z-index:100;">
            <button onclick="closeWatchVideoScreen()" style="background:none; border:none; color:#00ffff; font-weight:bold; font-size:0.9rem; cursor:pointer;">◄ နောက်သို့ (Back)</button>
            <span style="color:#ff0033; font-weight:bold; font-size:0.9rem;">Flâsh Watch</span>
        </div>

        ${mediaContent}

        <div style="padding:15px;">
            <h3 style="color:#fff; font-size:1rem; margin-bottom:8px;">${escapeHtml(v.post_text)}</h3>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                <img src="${v.user_photo || 'https://via.placeholder.com/35'}" class="contact-avatar">
                <div>
                    <div style="font-weight:bold; font-size:0.9rem;">${escapeHtml(v.display_name || v.username)}</div>
                    <div style="color:#888; font-size:0.75rem;">@${v.username} • <span style="color:#00ffff;">တင်ခဲ့ချိန်: ${timeAgo(v.created_at)}</span></div>
                </div>
            </div>

            <div style="display:flex; justify-content:space-around; background:#111116; border:1px solid #222233; padding:10px; border-radius:12px; margin-bottom:15px;">
                <button class="fb-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikePost('${v.id}')" style="background:none; border:none; color:${isLiked ? '#ff0033' : '#aaa'}; font-weight:bold; cursor:pointer;">❤️ ${likesArr.length}</button>
                <button class="fb-action-btn" onclick="openCommentPage('${v.id}')" style="background:none; border:none; color:#00ffff; font-weight:bold; cursor:pointer;">💬 Comments (${commentsArr.length})</button>
                <button class="fb-action-btn" onclick="reportPost('${v.id}')" style="background:none; border:none; color:#ff0033; font-weight:bold; cursor:pointer;">🚩 Report</button>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    if(!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
