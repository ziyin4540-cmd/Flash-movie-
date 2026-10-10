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
    }, 10);
}

async function loadHomeVideos(searchQuery = '') {
    const container = document.getElementById('homeVideoFeedContainer');
    if(!container) return;

    try {
        if (!window.supabaseClient) return;

        const { data: posts, error } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
        if (error || !posts || posts.length === 0) {
            container.innerHTML = '<p style="color:#666; text-align:center; padding:20px; grid-column:1/-1;">ဗီဒီယိုများ မရှိသေးပါ။</p>';
            return;
        }

        let videoPosts = posts.filter(p => p.is_video === true || p.media_type === 'video' || p.media_type === 'gdrive_video' || p.media_type === 'telegram_video' || (p.media_url && (p.media_url.includes('drive.google.com') || p.media_url.includes('t.me'))));

        container.innerHTML = '';
        videoPosts.forEach(v => {
            const div = document.createElement('div');
            div.className = 'video-card-item';
            div.style.cssText = 'background:#111116; border:1px solid #222233; border-radius:8px; overflow:hidden;';

            let mediaPreviewHtml = '';
            if (v.media_type === 'gdrive_video' || (v.media_url && v.media_url.includes('drive.google.com'))) {
                mediaPreviewHtml = `<div style="width:100%; height:100px; background:#181820; display:flex; justify-content:center; align-items:center; color:#00ffff; font-weight:bold;">▶️ Drive Video</div>`;
            } else {
                mediaPreviewHtml = `<video src="${v.media_url}#t=0.5" preload="metadata" muted style="width:100%; height:100px; object-fit:cover;"></video>`;
            }

            div.innerHTML = `
                <div onclick="openWatchVideoScreen('${v.id}')" style="cursor:pointer;">
                    ${mediaPreviewHtml}
                    <div style="padding:8px;">
                        <h4 style="margin:0 0 4px 0; font-size:0.8rem; color:#fff;">${escapeHtml(v.post_text)}</h4>
                        <p style="margin:0; font-size:0.7rem; color:#00ffff;" onclick="openUserProfile('${v.username}')">@${escapeHtml(v.username)}</p>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadFbFeed() {
    const container = document.getElementById('fbFeedContainer');
    if(!container) return;

    try {
        if (!window.supabaseClient) return;

        const { data: posts, error } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
        if (error || !posts || posts.length === 0) {
            container.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">ပို့စ်များ မရှိသေးပါ။</p>';
            return;
        }

        let feedPosts = posts.filter(p => p.is_video !== true && p.media_type !== 'gdrive_video' && p.media_type !== 'telegram_video');
        container.innerHTML = '';

        feedPosts.forEach(post => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#111116; border:1px solid #222233; padding:12px; border-radius:8px; margin-bottom:12px;';
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; cursor:pointer;" onclick="openUserProfile('${post.username}')">
                    <img src="${post.user_photo || 'https://via.placeholder.com/35'}" style="width:35px; height:35px; border-radius:50%;">
                    <div>
                        <div style="font-weight:bold; font-size:0.85rem; color:#00ffff;">${escapeHtml(post.display_name || post.username)}</div>
                        <div style="color:#888; font-size:0.7rem;">@${post.username} • ${timeAgo(post.created_at)}</div>
                    </div>
                </div>
                <p style="font-size:0.85rem; margin:0 0 8px 0;">${escapeHtml(post.post_text || '')}</p>
                ${post.media_url ? `<img src="${post.media_url}" style="width:100%; max-height:250px; object-fit:cover; border-radius:6px;">` : ''}
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}
