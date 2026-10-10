let tempFbMediaData = "";
let tempMediaType = "";
let tempAppVideoData = "";

document.addEventListener('DOMContentLoaded', () => {
    const mediaPicker = document.getElementById('fbMediaPicker');
    if(mediaPicker) {
        mediaPicker.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                tempMediaType = file.type.startsWith('image') ? 'image' : 'video';
                document.getElementById('selectedMediaName').innerText = `ရွေးပြီး: ${file.name}`;
                compressImageOrFile(file, (base64) => { tempFbMediaData = base64; });
            }
        });
    }

    const appVideoPicker = document.getElementById('appVideoPicker');
    if(appVideoPicker) {
        appVideoPicker.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                document.getElementById('uploadVideoPreviewName').innerText = `ရွေးပြီး: ${file.name}`;
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
            canvas.width = 350;
            canvas.height = 350 * (img.height / img.width);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            callback(canvas.toDataURL('image/jpeg', 0.5));
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
    let interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' ရက်ခင်က';
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' နာရီခင်က';
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' မိနစ်ခင်က';
    return 'ယခုလေးတင်';
}

function escapeHtml(text) {
    if(!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function openUserProfile(username) {
    if(typeof closeWatchVideoScreen === 'function') closeWatchVideoScreen();
    if(typeof switchMainPage === 'function') switchMainPage('profile');
    setTimeout(() => {
        if(typeof loadUserProfile === 'function') loadUserProfile(username);
    }, 50);
}

async function loadHomeVideos(searchQuery = '') {
    const container = document.getElementById('homeVideoFeedContainer');
    if(!container) return;

    // အမြန်ဆုံး Load ဖြစ်စေရန် Select ကန့်သတ်ချက် ထည့်ထားခြင်း
    const { data: posts, error } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false }).limit(30);
    if(error || !posts) {
        container.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">ဗီဒီယိုများ ရယူ၍မရပါ။</p>';
        return;
    }

    let videoPosts = posts.filter(p => p.is_video === true || p.media_type === 'video' || p.media_type === 'gdrive_video' || p.media_type === 'telegram_video' || (p.media_url && (p.media_url.includes('drive.google.com') || p.media_url.includes('t.me'))));
    
    if(videoPosts.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">ဗီဒီယိုများ မရှိသေးပါ။</p>';
        return;
    }

    let filtered = videoPosts.filter(p => {
        return (p.post_text || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
               (p.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
               (p.display_name || '').toLowerCase().includes(searchQuery.toLowerCase());
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
                    <span style="font-size:0.75rem; font-weight:bold; margin-top:4px;">Google Drive Video</span>
                </div>`;
        } else if(v.media_type === 'telegram_video' || (v.media_url && v.media_url.includes('t.me'))) {
            mediaPreviewHtml = `
                <div style="width:100%; height:100%; background:#181820; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#00ffff;">
                    <span style="font-size:1.8rem;">🎬</span>
                    <span style="font-size:0.75rem; font-weight:bold; margin-top:4px;">Telegram Video</span>
                </div>`;
        } else {
            mediaPreviewHtml = `<video src="${v.media_url}#t=0.5" preload="metadata" muted style="width:100%; height:100%; object-fit:cover;"></video>`;
        }

        div.innerHTML = `
            <div class="video-thumbnail-wrapper" onclick="openWatchVideoScreen('${v.id}')">
                ${mediaPreviewHtml}
                <div class="video-duration-badge">HD</div>
            </div>
            <div class="video-card-info">
                <img src="${v.user_photo || 'https://via.placeholder.com/35'}" class="contact-avatar" style="width:38px; height:38px; cursor:pointer;" onclick="openUserProfile('${v.username}')">
                <div class="video-details-text" style="flex:1;">
                    <h4 onclick="openWatchVideoScreen('${v.id}')" style="cursor:pointer;">${escapeHtml(v.post_text)}</h4>
                    <p onclick="openUserProfile('${v.username}')" style="cursor:pointer;">${escapeHtml(v.display_name || v.username)} • <span style="color:#00ffff;">${escapeHtml(v.playlist || 'General')}</span></p>
                    <p style="font-size:0.65rem; color:#666; margin-top:2px;">တင်ခဲ့ချိန်: ${timeAgo(v.created_at)}</p>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function filterHomeVideos() {
    const q = document.getElementById('movieSearchInput').value.trim();
    loadHomeVideos(q);
}

async function loadFbFeed() {
    const container = document.getElementById('fbFeedContainer');
    if(!container) return;

    const { data: posts, error } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false }).limit(30);
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
                <img src="${post.user_photo || 'https://via.placeholder.com/35'}" class="contact-avatar" style="cursor:pointer;" onclick="openUserProfile('${post.username}')">
                <div style="cursor:pointer;" onclick="openUserProfile('${post.username}')">
                    <div style="font-weight:bold; font-size:0.9rem; color:#00ffff;">${escapeHtml(post.display_name || post.username)}</div>
                    <div style="color:#888; font-size:0.7rem;">@${post.username} • ${timeAgo(post.created_at)}</div>
                </div>
            </div>
            <p style="font-size:0.9rem; margin:8px 0; word-break:break-word;">${escapeHtml(post.post_text || '')}</p>
            ${mediaHtml}
            <div class="fb-post-actions" style="display:flex; justify-content:space-around; border-top:1px solid #222233; margin-top:10px; padding-top:8px;">
                <button class="fb-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikePost('${post.id}')" style="background:none; border:none; color:${isLiked ? '#ff0033' : '#aaa'}; font-weight:bold; cursor:pointer;">❤️ ${likesArr.length} Likes</button>
                <button class="fb-action-btn" onclick="openCommentPage('${post.id}')" style="background:none; border:none; color:#00ffff; font-weight:bold; cursor:pointer;">💬 Comments (${commentsArr.length})</button>
            </div>
        `;
        container.appendChild(div);
    });
}
