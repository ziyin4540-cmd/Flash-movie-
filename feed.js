let tempFbMediaData = "";
let tempMediaType = "";
let activeCommentPostId = null;
let tempAppVideoData = "";

document.addEventListener('DOMContentLoaded', () => {
    const mediaPicker = document.getElementById('fbMediaPicker');
    if(mediaPicker) {
        mediaPicker.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    alert('⚠️ ဖိုင်ဆိုဒ် ကြီးလွန်းပါသည် (5MB အောက်သာ)။');
                    this.value = '';
                    return;
                }
                tempMediaType = file.type.startsWith('image') ? 'image' : 'video';
                document.getElementById('selectedMediaName').innerText = `ရွေးပြီး: ${file.name}`;
                const reader = new FileReader();
                reader.onload = (ev) => { tempFbMediaData = ev.target.result; };
                reader.readAsDataURL(file);
            }
        });
    }

    const appVideoPicker = document.getElementById('appVideoPicker');
    if(appVideoPicker) {
        appVideoPicker.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if(file) {
                if(file.size > 5 * 1024 * 1024) {
                    alert('⚠️ ဖိုင်ဆိုဒ် ကြီးလွန်းပါသည် (5MB အောက်သာ)။');
                    this.value = '';
                    return;
                }
                document.getElementById('uploadVideoPreviewName').innerText = `ရွေးပြီး: ${file.name}`;
                const reader = new FileReader();
                reader.onload = (ev) => { tempAppVideoData = ev.target.result; };
                reader.readAsDataURL(file);
            }
        });
    }
});

async function handleCreateFbPost() {
    const text = document.getElementById('fbPostTextInput').value.trim();
    const currentUser = localStorage.getItem('flash_logged_user');
    if(!text && !tempFbMediaData) return alert('စာ သို့မဟုတ် ဖိုင်ထည့်ပါ။');

    let userPhoto = 'https://via.placeholder.com/35';
    let displayName = currentUser;
    const { data: uData } = await supabaseClient.from('flash_users').select('*').eq('username', currentUser).single();
    if(uData) {
        if(uData.photo_url) userPhoto = uData.photo_url;
        if(uData.display_name) displayName = uData.display_name;
    }

    await supabaseClient.from('flash_posts').insert([{
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

    document.getElementById('fbPostTextInput').value = '';
    document.getElementById('selectedMediaName').innerText = '';
    tempFbMediaData = "";
    tempMediaType = "";
    switchMainPage('feed');
    loadFbFeed();
}

async function handleDirectVideoUpload() {
    const title = document.getElementById('uploadVideoTitle').value.trim();
    const currentUser = localStorage.getItem('flash_logged_user');
    if(!title || !tempAppVideoData) return alert('ခေါင်းစဉ်နှင့် ဗီဒီယိုဖိုင် ရွေးပါ။');

    const progressBox = document.getElementById('uploadProgressBox');
    const progressBar = document.getElementById('lightningProgressBar');
    const progressText = document.getElementById('progressPercentText');
    if(progressBox) progressBox.classList.remove('hidden');

    let progress = 0;
    let interval = setInterval(async () => {
        progress += 20;
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

            await supabaseClient.from('flash_posts').insert([{
                username: currentUser,
                display_name: displayName,
                user_photo: userPhoto,
                post_text: title,
                media_url: tempAppVideoData,
                media_type: 'video',
                likes: [],
                comments: [],
                reports: 0,
                is_video: true
            }]);

            document.getElementById('uploadVideoTitle').value = '';
            document.getElementById('uploadVideoPreviewName').innerText = '';
            tempAppVideoData = "";
            if(progressBox) progressBox.classList.add('hidden');
            if(progressBar) progressBar.style.width = '0%';

            alert('ဗီဒီယို တင်ခြင်း အောင်မြင်ပါသည်။');
            switchMainPage('home');
            loadHomeVideos();
        }
    }, 150);
}

async function loadHomeVideos(searchQuery = '') {
    const container = document.getElementById('homeVideoFeedContainer');
    if(!container) return;

    const { data: posts } = await supabaseClient.from('flash_posts').select('*').eq('is_video', true).order('created_at', { ascending: false });
    if(!posts || posts.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">ဗီဒီယိုများ မရှိသေးပါ။</p>';
        return;
    }

    const filtered = posts.filter(p => (p.post_text || '').toLowerCase().includes(searchQuery.toLowerCase()));
    container.innerHTML = '';

    filtered.forEach(v => {
        const div = document.createElement('div');
        div.className = 'video-card-item';
        div.innerHTML = `
            <div class="fb-post-header">
                <img src="${v.user_photo || 'https://via.placeholder.com/35'}" class="contact-avatar">
                <div>
                    <div style="font-weight:bold; font-size:0.9rem;">${escapeHtml(v.display_name || v.username)}</div>
                    <div style="color:#888; font-size:0.7rem;">@${v.username}</div>
                </div>
            </div>
            <h4 style="margin: 8px 0; font-size:0.95rem;">${escapeHtml(v.post_text)}</h4>
            <video src="${v.media_url}" controls width="100%" style="border-radius:8px; background:#000;"></video>
            <div style="text-align:right; margin-top:6px;">
                <button onclick="reportPost('${v.id}')" style="background:none; border:none; color:#ff0033; font-size:0.75rem; cursor:pointer;">🚩 Report</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function filterHomeVideos() {
    const q = document.getElementById('movieSearchInput').value;
    loadHomeVideos(q);
}

async function loadFbFeed() {
    const container = document.getElementById('fbFeedContainer');
    if(!container) return;

    const { data: posts } = await supabaseClient.from('flash_posts').select('*').eq('is_video', false).order('created_at', { ascending: false });
    if(!posts || posts.length === 0) {
        container.innerHTML = '<p style="color:#666; text-align:center; margin-top:20px;">ပို့စ်များ မရှိသေးပါ။</p>';
        return;
    }

    const currentUser = localStorage.getItem('flash_logged_user');
    container.innerHTML = '';

    posts.forEach(post => {
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
                    <div style="color:#888; font-size:0.7rem;">@${post.username}</div>
                </div>
            </div>
            <p style="font-size:0.9rem; margin:8px 0; word-break:break-word;">${escapeHtml(post.post_text || '')}</p>
            ${mediaHtml}
            <div class="fb-post-actions">
                <button class="fb-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikePost('${post.id}')">❤️ ${likesArr.length} Likes</button>
                <button class="fb-action-btn" onclick="openCommentScreen('${post.id}')">💬 Comments (${commentsArr.length})</button>
                <button class="fb-action-btn" onclick="reportPost('${post.id}')" style="color:#ff0033;">🚩 Report</button>
            </div>
        `;
        container.appendChild(div);
    });
}

async function reportPost(postId) {
    const { data: post } = await supabaseClient.from('flash_posts').select('*').eq('id', postId).single();
    if(post) {
        let currentReports = post.reports || 0;
        await supabaseClient.from('flash_posts').update({ reports: currentReports + 1 }).eq('id', postId);
        alert('Report တင်ပြီးပါပြီ။ Admin စစ်ဆေးပေးပါမည်။');
    }
}

async function toggleLikePost(postId) {
    const currentUser = localStorage.getItem('flash_logged_user');
    const { data: post } = await supabaseClient.from('flash_posts').select('*').eq('id', postId).single();
    if(!post) return;
    let likesArr = post.likes || [];
    const idx = likesArr.indexOf(currentUser);
    if(idx > -1) likesArr.splice(idx, 1); else likesArr.push(currentUser);
    await supabaseClient.from('flash_posts').update({ likes: likesArr }).eq('id', postId);
    loadFbFeed();
}

function openCommentScreen(postId) {
    activeCommentPostId = postId;
    switchMainPage('comment');
    loadCommentScreenContent();
}

async function loadCommentScreenContent() {
    const container = document.getElementById('commentScreenContent');
    if(!activeCommentPostId) return;
    const { data: post } = await supabaseClient.from('flash_posts').select('*').eq('id', activeCommentPostId).single();
    if(!post) return;

    let commentsArr = post.comments || [];
    let html = `<div style="background:#111116; padding:12px; border-radius:8px; margin-bottom:12px;"><strong style="color:#00ffff;">${escapeHtml(post.display_name || post.username)}:</strong> ${escapeHtml(post.post_text || '')}</div>`;
    html += `<h4 style="color:#aaa; font-size:0.85rem; margin-bottom:8px;">Comments (${commentsArr.length})</h4>`;
    commentsArr.forEach(c => {
        html += `<div style="background:#181820; padding:8px 12px; border-radius:8px; margin-bottom:6px; font-size:0.85rem;"><strong style="color:#00ffff;">@${c.user}:</strong> ${escapeHtml(c.text)}</div>`;
    });
    container.innerHTML = html;
}

async function submitScreenComment() {
    const input = document.getElementById('screenCommentInput');
    const text = input.value.trim();
    const currentUser = localStorage.getItem('flash_logged_user');
    if(!text || !activeCommentPostId) return;

    const { data: post } = await supabaseClient.from('flash_posts').select('*').eq('id', activeCommentPostId).single();
    if(!post) return;
    let commentsArr = post.comments || [];
    commentsArr.push({ user: currentUser, text: text });
    await supabaseClient.from('flash_posts').update({ comments: commentsArr }).eq('id', activeCommentPostId);
    input.value = '';
    loadCommentScreenContent();
}

let pressTimer;
function setupLongPressDelete(element, postId) {
    element.addEventListener('touchstart', () => {
        pressTimer = setTimeout(async () => {
            if(confirm('ဤအချက်အလက်ကို ဖျက်မည်မှာ သေချာပါသလား?')) {
                await supabaseClient.from('flash_posts').delete().eq('id', postId);
                alert('ဖျက်ပြီးပါပြီ။');
                loadUserProfile(localStorage.getItem('flash_logged_user'));
                loadHomeVideos();
                loadFbFeed();
            }
        }, 800);
    });
    element.addEventListener('touchend', () => clearTimeout(pressTimer));
}
