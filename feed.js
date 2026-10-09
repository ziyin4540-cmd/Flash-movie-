// Facebook Style Feed Module
let tempFbMediaData = "";
let tempMediaType = "";

document.addEventListener('DOMContentLoaded', () => {
    const mediaPicker = document.getElementById('fbMediaPicker');
    if(mediaPicker) {
        mediaPicker.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const maxSize = 5 * 1024 * 1024; // 5MB Limit
                if (file.size > maxSize) {
                    alert('⚠️ ဖိုင်ဆိုဒ် ကြီးလွန်းပါသည် (5MB အောက်သာ တင်ပါ)။ 5MB အထက်ဖိုင်များကို Telegram Channel တွင် ကြည့်ရှုပါ။');
                    this.value = '';
                    tempFbMediaData = "";
                    tempMediaType = "";
                    document.getElementById('selectedMediaName').innerText = "";
                    return;
                }

                tempMediaType = file.type.startsWith('image') ? 'image' : 'video';
                document.getElementById('selectedMediaName').innerText = `ရွေးချယ်ပြီး: ${file.name}`;

                const reader = new FileReader();
                reader.onload = function(event) { tempFbMediaData = event.target.result; };
                reader.readAsDataURL(file);
            }
        });
    }
});

function handleCreateFbPost() {
    const text = document.getElementById('fbPostTextInput').value.trim();
    const currentUser = localStorage.getItem('flash_logged_user');
    
    if(!text && !tempFbMediaData) {
        alert('ရေးသားရန် စာ (သို့မဟုတ်) ဖိုင်ထည့်ပါ။');
        return;
    }

    const userDataStr = localStorage.getItem('flash_user_data_' + currentUser);
    let userPhoto = 'https://via.placeholder.com/35';
    let displayName = currentUser;
    if(userDataStr) {
        let uData = JSON.parse(userDataStr);
        if(uData.photo) userPhoto = uData.photo;
        if(uData.displayName) displayName = uData.displayName;
    }

    let allPosts = JSON.parse(localStorage.getItem('flash_fb_posts') || '[]');
    const newPost = {
        id: Date.now(),
        user: currentUser,
        displayName: displayName,
        userPhoto: userPhoto,
        text: text,
        mediaUrl: tempFbMediaData,
        mediaType: tempMediaType,
        likes: [],
        comments: [],
        time: 'လတ်တလော'
    };

    allPosts.unshift(newPost);
    localStorage.setItem('flash_fb_posts', JSON.stringify(allPosts));

    // Save to user profile uploads as well
    if(userDataStr) {
        let data = JSON.parse(userDataStr);
        if(!data.uploads) data.uploads = [];
        data.uploads.unshift(newPost);
        localStorage.setItem('flash_user_data_' + currentUser, JSON.stringify(data));
    }

    // Reset Form
    document.getElementById('fbPostTextInput').value = '';
    document.getElementById('fbMediaPicker').value = '';
    document.getElementById('selectedMediaName').innerText = '';
    tempFbMediaData = "";
    tempMediaType = "";

    loadFbFeed();
    alert('ပို့စ်တင်ခြင်း အောင်မြင်ပါသည်။');
}

function loadFbFeed() {
    const container = document.getElementById('fbFeedContainer');
    if(!container) return;
    let allPosts = JSON.parse(localStorage.getItem('flash_fb_posts') || '[]');
    const currentUser = localStorage.getItem('flash_logged_user');
    container.innerHTML = '';

    if(allPosts.length === 0) {
        container.innerHTML = '<p style="color: #666; font-size: 0.85rem; text-align: center; margin-top: 20px;">တင်ထားသော ပို့စ်များ မရှိသေးပါ။</p>';
        return;
    }

    allPosts.forEach(post => {
        const isLiked = post.likes && post.likes.includes(currentUser);
        const div = document.createElement('div');
        div.className = 'fb-post-card';
        
        let mediaHtml = '';
        if(post.mediaUrl) {
            if(post.mediaType === 'image') {
                mediaHtml = `<img src="${post.mediaUrl}" width="100%" style="border-radius: 8px; margin-top: 8px; max-height: 350px; object-fit: cover;">`;
            } else if(post.mediaType === 'video') {
                mediaHtml = `<video src="${post.mediaUrl}" controls width="100%" style="border-radius: 8px; margin-top: 8px; background:#000;"></video>`;
            }
        }

        let commentsHtml = '';
        if(post.comments && post.comments.length > 0) {
            post.comments.forEach(c => {
                commentsHtml += `<div style="background: #181820; padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; margin-top: 4px;"><strong style="color:#00ffff;">@${c.user}:</strong> ${escapeHtml(c.text)}</div>`;
            });
        }

        div.innerHTML = `
            <div class="fb-post-header">
                <img src="${post.userPhoto}" class="contact-avatar">
                <div>
                    <div style="font-weight: bold; font-size: 0.9rem; cursor:pointer;" onclick="viewOtherProfile('${post.user}')">${escapeHtml(post.displayName)}</div>
                    <div style="color: #888; font-size: 0.7rem;">@${post.user} • ${post.time}</div>
                </div>
            </div>
            <p style="font-size: 0.9rem; margin: 8px 0; word-break: break-word;">${escapeHtml(post.text)}</p>
            ${mediaHtml}
            
            <div class="fb-post-actions">
                <button class="fb-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikePost(${post.id})">❤️ ${post.likes ? post.likes.length : 0} Likes</button>
                <button class="fb-action-btn" onclick="toggleCommentBox(${post.id})">💬 Comments (${post.comments ? post.comments.length : 0})</button>
            </div>

            <div id="commentSection_${post.id}" class="hidden" style="margin-top: 8px;">
                <div id="commentList_${post.id}">${commentsHtml}</div>
                <div style="display: flex; gap: 6px; margin-top: 8px;">
                    <input type="text" id="commentInput_${post.id}" placeholder="စကားတစ်ခွန်း ရေးရန်..." style="flex:1; background:#070709; border:1px solid #333344; color:#fff; padding:6px; border-radius:6px; font-size:0.8rem; outline:none;">
                    <button onclick="addCommentToPost(${post.id})" style="background:#00ffff; color:#000; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:0.75rem; cursor:pointer;">ပို့</button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

function toggleLikePost(postId) {
    const currentUser = localStorage.getItem('flash_logged_user');
    let allPosts = JSON.parse(localStorage.getItem('flash_fb_posts') || '[]');
    
    allPosts = allPosts.map(p => {
        if(p.id === postId) {
            if(!p.likes) p.likes = [];
            const index = p.likes.indexOf(currentUser);
            if(index > -1) {
                p.likes.splice(index, 1);
            } else {
                p.likes.push(currentUser);
            }
        }
        return p;
    });

    localStorage.setItem('flash_fb_posts', JSON.stringify(allPosts));
    loadFbFeed();
}

function toggleCommentBox(postId) {
    const box = document.getElementById(`commentSection_${postId}`);
    box.classList.toggle('hidden');
}

function addCommentToPost(postId) {
    const input = document.getElementById(`commentInput_${postId}`);
    const text = input.value.trim();
    const currentUser = localStorage.getItem('flash_logged_user');

    if(!text) return;

    let allPosts = JSON.parse(localStorage.getItem('flash_fb_posts') || '[]');
    allPosts = allPosts.map(p => {
        if(p.id === postId) {
            if(!p.comments) p.comments = [];
            p.comments.push({ user: currentUser, text: text });
        }
        return p;
    });

    localStorage.setItem('flash_fb_posts', JSON.stringify(allPosts));
    input.value = '';
    loadFbFeed();
}
