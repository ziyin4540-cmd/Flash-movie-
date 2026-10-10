let activeWatchVideoId = null;

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

    const { data: allVideoPosts } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
    let videoList = (allVideoPosts || []).filter(item => item.is_video === true || item.media_type === 'video' || item.media_type === 'gdrive_video' || item.media_type === 'telegram_video' || (item.media_url && (item.media_url.includes('drive.google.com') || item.media_url.includes('t.me'))));

    let currentIndex = videoList.findIndex(item => item.id === videoId);
    let prevVideo = currentIndex > 0 ? videoList[currentIndex - 1] : null;
    let nextVideo = currentIndex < videoList.length - 1 ? videoList[currentIndex + 1] : null;

    const currentUser = localStorage.getItem('flash_logged_user');
    const likesArr = v.likes || [];
    const isLiked = likesArr.includes(currentUser);
    const commentsArr = v.comments || [];

    let mediaContent = '';
    if(v.media_type === 'gdrive_video' || (v.media_url && v.media_url.includes('drive.google.com'))) {
        let fileId = v.media_url.includes('/file/d/') ? v.media_url.split('/file/d/')[1].split('/')[0] : '';
        let embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : v.media_url;
        mediaContent = `
            <div style="width:100%; height:260px; background:#000;">
                <iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay" allowfullscreen style="border:none;"></iframe>
            </div>`;
    } else if(v.media_type === 'telegram_video' || (v.media_url && v.media_url.includes('t.me'))) {
        let cleanUrl = v.media_url.replace('https://t.me/', '');
        let embedUrl = `https://t.me/${cleanUrl}?embed=1&dark=1`;
        mediaContent = `
            <div style="width:100%; height:260px; background:#000;">
                <iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen style="border:none;"></iframe>
            </div>`;
    } else {
        mediaContent = `<video src="${v.media_url}" controls autoplay width="100%" style="background:#000; max-height:280px;"></video>`;
    }

    let nextVideosHtml = '';
    videoList.forEach(nv => {
        if(nv.id !== videoId) {
            nextVideosHtml += `
                <div onclick="openWatchVideoScreen('${nv.id}')" style="display:flex; gap:10px; background:#111116; padding:8px; border-radius:8px; cursor:pointer; margin-bottom:8px; border:1px solid #222233;">
                    <div style="width:100px; height:60px; background:#000; border-radius:6px; overflow:hidden; flex-shrink:0;">
                        ${nv.media_type === 'gdrive_video' ? '<div style="color:#00ffff; text-align:center; padding-top:15px; font-size:0.7rem;">▶️ Drive</div>' : (nv.media_type === 'telegram_video' ? '<div style="color:#00ffff; text-align:center; padding-top:15px; font-size:0.7rem;">🎬 Telegram</div>' : `<video src="${nv.media_url}" width="100%" height="100%" style="object-fit:cover;"></video>`)}
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

        <div style="display:flex; justify-content:space-between; background:#181820; padding:8px 15px; border-bottom:1px solid #222233;">
            <button ${prevVideo ? `onclick="openWatchVideoScreen('${prevVideo.id}')"` : 'disabled'} style="background:${prevVideo ? '#222233' : '#111'}; color:${prevVideo ? '#00ffff' : '#555'}; border:1px solid #333; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.8rem;">⏮ ရှေ့ဗီဒီယို (Prev)</button>
            <button ${nextVideo ? `onclick="openWatchVideoScreen('${nextVideo.id}')"` : 'disabled'} style="background:${nextVideo ? '#ff0033' : '#111'}; color:${nextVideo ? '#fff' : '#555'}; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.8rem;">နောက်ဗီဒီယို (Next) ⏭</button>
        </div>

        <div style="padding:15px;">
            <h3 style="color:#fff; font-size:1rem; margin-bottom:8px;">${escapeHtml(v.post_text)}</h3>
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${v.user_photo || 'https://via.placeholder.com/35'}" class="contact-avatar">
                    <div>
                        <div style="font-weight:bold; font-size:0.9rem;">${escapeHtml(v.display_name || v.username)}</div>
                        <div style="color:#888; font-size:0.75rem;">@${v.username} • <span style="color:#00ffff;">${timeAgo(v.created_at)}</span></div>
                    </div>
                </div>
                ${currentUser !== v.username ? `<button id="watchFollowBtn" onclick="toggleFollowUser('${v.username}')" style="background:#00ffff; color:#000; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:0.75rem; cursor:pointer;">Follow</button>` : ''}
            </div>

            <div style="display:flex; justify-content:space-around; background:#111116; border:1px solid #222233; padding:10px; border-radius:12px; margin-bottom:15px;">
                <button class="fb-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikePost('${v.id}')" style="background:none; border:none; color:${isLiked ? '#ff0033' : '#aaa'}; font-weight:bold; cursor:pointer;">❤️ ${likesArr.length}</button>
                <button class="fb-action-btn" onclick="openCommentPage('${v.id}')" style="background:none; border:none; color:#00ffff; font-weight:bold; cursor:pointer;">💬 Comments (${commentsArr.length})</button>
                <button class="fb-action-btn" onclick="shareVideoToChat('${v.id}', '${escapeHtml(v.post_text)}')" style="background:none; border:none; color:#00ffff; font-weight:bold; cursor:pointer;">↗ Share</button>
                <button class="fb-action-btn" onclick="reportPost('${v.id}')" style="background:none; border:none; color:#ff0033; font-weight:bold; cursor:pointer;">🚩 Report</button>
            </div>

            <h4 style="color:#00ffff; font-size:0.9rem; margin-bottom:10px;">⏭ နောက်လာမည့် ဗီဒီယိုများ (Next Videos)</h4>
            ${nextVideosHtml || '<p style="color:#666; font-size:0.8rem;">ဗီဒီယို အခြားမရှိသေးပါ။</p>'}
        </div>
    `;

    checkFollowStatus(v.username);
}

function closeWatchVideoScreen() {
    const watchPage = document.getElementById('page-watch-video');
    if(watchPage) watchPage.remove();
}

function shareVideoToChat(videoId, title) {
    alert(`📢 Chat သို့ Share လိုက်ပါပြီ: ${title}`);
}
