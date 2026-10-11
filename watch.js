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
        <div style="background:#111116; padding:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222233; position:sticky; top:0; z-index:100;">
            <button onclick="closeWatchVideoScreen()" style="background:#222233; border:1px solid #00ffff; color:#00ffff; font-weight:bold; font-size:0.85rem; cursor:pointer; padding:6px 14px; border-radius:6px;">◄ နောက်သို့ (Back)</button>
            <span style="color:#ff0033; font-weight:bold; font-size:0.9rem;">Flâsh Watch</span>
        </div>
        <div style="display:flex; justify-content:center; align-items:center; height:250px; color:#00ffff; font-weight:bold;">⚡ Loading Video...</div>
    `;

    try {
        const { data: v } = await supabaseClient.from('flash_posts').select('*').eq('id', videoId).single();
        if(!v) return;

        const { data: allVideoPosts } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
        let videoList = (allVideoPosts || []).filter(item => item.is_video === true || item.media_type === 'video' || item.media_type === 'youtube_video' || item.media_type === 'gdrive_video' || (item.media_url && (item.media_url.includes('youtube.com') || item.media_url.includes('youtu.be') || item.media_url.includes('drive.google.com'))));

        let currentIndex = videoList.findIndex(item => item.id === videoId);
        let prevVideo = currentIndex > 0 ? videoList[currentIndex - 1] : null;
        let nextVideo = currentIndex < videoList.length - 1 ? videoList[currentIndex + 1] : null;

        const currentUser = localStorage.getItem('flash_logged_user');
        const likesArr = v.likes || [];
        const isLiked = likesArr.includes(currentUser);
        const commentsArr = v.comments || [];

        // Follow Status Check
        let isFollowing = false;
        if(currentUser && currentUser !== v.username) {
            const { data: followCheck } = await supabaseClient.from('flash_follows')
                .select('*')
                .eq('follower_id', currentUser)
                .eq('following_id', v.username)
                .maybeSingle();
            isFollowing = !!followCheck;
        }

        let mediaContent = '';

        // 1. YouTube Player (Clean No-Cookie Embed)
        if(v.media_type === 'youtube_video' || (v.media_url && (v.media_url.includes('youtube.com') || v.media_url.includes('youtu.be')))) {
            let ytId = '';
            if(v.media_url.includes('youtu.be/')) {
                ytId = v.media_url.split('youtu.be/')[1].split('?')[0];
            } else if(v.media_url.includes('v=')) {
                ytId = v.media_url.split('v=')[1].split('&')[0];
            }

            mediaContent = `
                <div style="width:100%; height:250px; background:#000; position:relative;">
                    <iframe 
                        src="https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&playsinline=1" 
                        width="100%" height="100%" frameborder="0" 
                        allow="autoplay; encrypted-media" allowfullscreen 
                        style="border:none;">
                    </iframe>
                </div>`;
        } 
        // 2. Google Drive Video Player (Crop Wrapper to hide Drive Controls)
        else if(v.media_type === 'gdrive_video' || (v.media_url && v.media_url.includes('drive.google.com'))) {
            let fileId = '';
            if(v.media_url.includes('/file/d/')) {
                fileId = v.media_url.split('/file/d/')[1].split('/')[0];
            } else if(v.media_url.includes('id=')) {
                fileId = v.media_url.split('id=')[1].split('&')[0];
            }
            let embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : v.media_url;

            mediaContent = `
                <div style="width:100%; height:240px; background:#000; position:relative; overflow:hidden;">
                    <iframe src="${embedUrl}" width="100%" height="320px" frameborder="0" allow="autoplay" allowfullscreen style="border:none; margin-top:-50px;"></iframe>
                </div>`;
        } 
        // 3. Native Video
        else {
            mediaContent = `<video src="${v.media_url}" controls autoplay width="100%" style="background:#000; max-height:250px; object-fit:contain;"></video>`;
        }

        let nextVideosHtml = '';
        videoList.forEach(nv => {
            if(nv.id !== videoId) {
                let badge = nv.media_type === 'youtube_video' ? '▶️ YouTube' : (nv.media_type === 'gdrive_video' ? '▶️ Drive' : '🎬 Video');
                nextVideosHtml += `
                    <div onclick="openWatchVideoScreen('${nv.id}')" style="display:flex; gap:10px; background:#111116; padding:8px; border-radius:8px; cursor:pointer; margin-bottom:8px; border:1px solid #222233;">
                        <div style="width:100px; height:60px; background:#000; border-radius:6px; overflow:hidden; flex-shrink:0; display:flex; justify-content:center; align-items:center; color:#00ffff; font-size:0.7rem; font-weight:bold;">
                            ${badge}
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
                <button onclick="closeWatchVideoScreen()" style="background:#222233; border:1px solid #00ffff; color:#00ffff; font-weight:bold; font-size:0.85rem; cursor:pointer; padding:6px 14px; border-radius:6px;">◄ နောက်သို့ (Back)</button>
                <span style="color:#ff0033; font-weight:bold; font-size:0.9rem;">Flâsh Watch</span>
            </div>

            ${mediaContent}

            <div style="display:flex; justify-content:space-between; background:#181820; padding:8px 15px; border-bottom:1px solid #222233;">
                <button ${prevVideo ? `onclick="openWatchVideoScreen('${prevVideo.id}')"` : 'disabled'} style="background:${prevVideo ? '#222233' : '#111'}; color:${prevVideo ? '#00ffff' : '#555'}; border:1px solid #333; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.8rem;">⏮ ရှေ့ဗီဒီယို (Prev)</button>
                <button ${nextVideo ? `onclick="openWatchVideoScreen('${nextVideo.id}')"` : 'disabled'} style="background:${nextVideo ? '#ff0033' : '#111'}; color:${nextVideo ? '#fff' : '#555'}; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.8rem;">နောက်ဗီဒီယို (Next) ⏭</button>
            </div>

            <div style="padding:15px;">
                <h3 style="color:#fff; font-size:1rem; margin-bottom:12px;">${escapeHtml(v.post_text)}</h3>
                
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:15px;">
                    <div style="display:flex; align-items:center; gap:10px; cursor:pointer;" onclick="closeWatchVideoScreen(); switchMainPage('profile'); setTimeout(()=>loadUserProfile('${v.username}'),100);">
                        <img src="${v.user_photo || 'https://via.placeholder.com/35'}" style="width:38px; height:38px; border-radius:50%; border:1px solid #00ffff;">
                        <div>
                            <div style="font-weight:bold; font-size:0.9rem; color:#00ffff;">${escapeHtml(v.display_name || v.username)}</div>
                            <div style="color:#888; font-size:0.75rem;">@${v.username} • <span>${timeAgo(v.created_at)}</span></div>
                        </div>
                    </div>

                    ${(currentUser && currentUser !== v.username) ? `
                        <button id="watchFollowBtn" onclick="toggleFollowUser('${v.username}')" style="background:${isFollowing ? '#222233' : '#00ffff'}; color:${isFollowing ? '#fff' : '#000'}; border:${isFollowing ? '1px solid #444' : 'none'}; padding:6px 14px; border-radius:6px; font-weight:bold; font-size:0.75rem; cursor:pointer;">
                            ${isFollowing ? 'Following' : 'Follow'}
                        </button>
                    ` : ''}
                </div>

                <!-- Action Bar (Like / Comment / Share) -->
                <div style="display:flex; justify-content:space-around; background:#111116; border:1px solid #222233; padding:10px; border-radius:12px; margin-bottom:15px;">
                    <button onclick="toggleLikePost('${v.id}')" style="background:none; border:none; color:${isLiked ? '#ff0033' : '#aaa'}; font-weight:bold; cursor:pointer; font-size:0.85rem;">❤️ Like (${likesArr.length})</button>
                    <button onclick="openFullCommentPage('${v.id}')" style="background:none; border:none; color:#00ffff; font-weight:bold; cursor:pointer; font-size:0.85rem;">💬 Comments (${commentsArr.length})</button>
                    <button onclick="sharePost('${v.id}')" style="background:none; border:none; color:#00ff66; font-weight:bold; cursor:pointer; font-size:0.85rem;">🔄 Share</button>
                </div>

                <h4 style="color:#00ffff; font-size:0.9rem; margin-bottom:10px;">⏭ နောက်လာမည့် ဗီဒီယိုများ (Next Videos)</h4>
                ${nextVideosHtml || '<p style="color:#666; font-size:0.8rem;">ဗီဒီယို အခြားမရှိသေးပါ။</p>'}
            </div>
        `;
    } catch(err) {
        console.error(err);
    }
}

async function toggleFollowUser(targetUsername) {
    const currentUser = localStorage.getItem('flash_logged_user');
    if(!currentUser || currentUser === targetUsername) return;

    try {
        const { data: existing } = await supabaseClient.from('flash_follows')
            .select('*')
            .eq('follower_id', currentUser)
            .eq('following_id', targetUsername)
            .maybeSingle();

        const followBtn = document.getElementById('watchFollowBtn');

        if(existing) {
            await supabaseClient.from('flash_follows').delete().eq('id', existing.id);
            if(followBtn) {
                followBtn.innerText = 'Follow';
                followBtn.style.background = '#00ffff';
                followBtn.style.color = '#000';
            }
            showToast(`Unfollowed @${targetUsername}`, 'success');
        } else {
            await supabaseClient.from('flash_follows').insert([{ follower_id: currentUser, following_id: targetUsername }]);
            if(followBtn) {
                followBtn.innerText = 'Following';
                followBtn.style.background = '#222233';
                followBtn.style.color = '#fff';
            }
            showToast(`Followed @${targetUsername}`, 'success');
        }
    } catch(e) { console.error(e); }
}

function sharePost(postId) {
    if(navigator.share) {
        navigator.share({ title: 'Flâsh Movie', url: window.location.href });
    } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('🔗 Link ကို Copy ကူးလိုက်ပါပြီ', 'success');
    }
}

// 💬 Full-Screen Comment Page
async function openFullCommentPage(postId) {
    let cmtPage = document.getElementById('page-comments-full');
    if(!cmtPage) {
        cmtPage = document.createElement('div');
        cmtPage.id = 'page-comments-full';
        cmtPage.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:#070709; z-index:99999; overflow-y:auto; padding:15px; box-sizing:border-box;';
        document.body.appendChild(cmtPage);
    }

    try {
        const { data: post } = await supabaseClient.from('flash_posts').select('*').eq('id', postId).single();
        if(!post) return;

        let comments = post.comments || [];
        let currentUser = localStorage.getItem('flash_logged_user');

        let commentsListHtml = '';
        comments.forEach((c, index) => {
            commentsListHtml += `
                <div style="background:#111116; border:1px solid #222233; padding:10px; border-radius:8px; margin-bottom:8px; position:relative;">
                    ${c.isPinned ? '<span style="color:#00ffff; font-size:0.65rem; font-weight:bold;">📌 Pinned Comment</span>' : ''}
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <b style="color:#00ffff; font-size:0.8rem;">@${escapeHtml(c.username)}</b>
                        <span style="color:#666; font-size:0.65rem;">${timeAgo(c.time)}</span>
                    </div>
                    <p style="color:#fff; font-size:0.85rem; margin:5px 0;">${escapeHtml(c.text)}</p>
                    
                    <div style="display:flex; gap:12px; margin-top:5px;">
                        <button onclick="replyComment('${postId}', '${c.username}')" style="background:none; border:none; color:#00ffff; font-size:0.7rem; cursor:pointer;">↩ Reply</button>
                        ${(currentUser === c.username || currentUser === post.username) ? `
                            <button onclick="deleteComment('${postId}',${index})" style="background:none; border:none; color:#ff0033; font-size:0.7rem; cursor:pointer;">🗑 Delete</button>
                        ` : ''}
                        ${currentUser === post.username ? `
                            <button onclick="pinComment('${postId}',${index})" style="background:none; border:none; color:#00ff66; font-size:0.7rem; cursor:pointer;">📌 Pin</button>
                        ` : ''}
                    </div>
                </div>`;
        });

        cmtPage.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222233; padding-bottom:10px; margin-bottom:15px;">
                <button onclick="document.getElementById('page-comments-full').remove()" style="background:#222; color:#00ffff; border:1px solid #00ffff; padding:6px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">◄ နောက်သို့ (Back)</button>
                <h3 style="color:#fff; margin:0; font-size:1rem;">💬 Comments (${comments.length})</h3>
            </div>

            <div style="margin-bottom:15px;">
                ${commentsListHtml || '<p style="color:#666; text-align:center;">Comment မရှိသေးပါ။</p>'}
            </div>

            <div style="position:sticky; bottom:0; background:#070709; padding:10px 0;">
                <input type="text" id="fullCmtInput" placeholder="Comment ရေးပါ..." style="width:100%; padding:10px; background:#181820; border:1px solid #333; color:#fff; border-radius:6px; box-sizing:border-box; margin-bottom:8px;">
                <button onclick="submitFullComment('${postId}')" style="width:100%; background:#00ffff; color:#000; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer;">Comment ပို့မည်</button>
            </div>
        `;
    } catch(e) { console.error(e); }
}

async function submitFullComment(postId) {
    const input = document.getElementById('fullCmtInput');
    const text = input?.value.trim();
    const currentUser = localStorage.getItem('flash_logged_user');
    if(!text || !currentUser) return;

    const { data: post } = await supabaseClient.from('flash_posts').select('comments').eq('id', postId).single();
    let comments = post.comments || [];
    comments.push({ username: currentUser, text: text, time: new Date().toISOString(), isPinned: false });

    await supabaseClient.from('flash_posts').update({ comments: comments }).eq('id', postId);
    showToast('💬 Comment ပို့ပြီးပါပြီ', 'success');
    openFullCommentPage(postId);
}

async function deleteComment(postId, index) {
    const { data: post } = await supabaseClient.from('flash_posts').select('comments').eq('id', postId).single();
    let comments = post.comments || [];
    comments.splice(index, 1);
    await supabaseClient.from('flash_posts').update({ comments: comments }).eq('id', postId);
    showToast('🗑 Comment ဖျက်ပြီးပါပြီ', 'success');
    openFullCommentPage(postId);
}

async function pinComment(postId, index) {
    const { data: post } = await supabaseClient.from('flash_posts').select('comments').eq('id', postId).single();
    let comments = post.comments || [];
    comments.forEach((c, i) => c.isPinned = (i === index));
    await supabaseClient.from('flash_posts').update({ comments: comments }).eq('id', postId);
    showToast('📌 Comment Pin လုပ်ပြီးပါပြီ', 'success');
    openFullCommentPage(postId);
}

function replyComment(postId, username) {
    const input = document.getElementById('fullCmtInput');
    if(input) {
        input.value = `@${username} `;
        input.focus();
    }
}

function closeWatchVideoScreen() {
    const watchPage = document.getElementById('page-watch-video');
    if(watchPage) watchPage.remove();
    }
