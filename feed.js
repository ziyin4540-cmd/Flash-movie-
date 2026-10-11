let tempFbMediaData = "";
let tempMediaType = "";

async function loadFbFeed() {
    const container = document.getElementById('fbFeedContainer');
    if(!container) return;

    container.innerHTML = `
        <div style="background:#111116; padding:12px; border-radius:12px; border:1px solid #222233; margin-bottom:15px;">
            <h4 style="color:#00ffff; margin:0 0 10px 0;">✍️ Feed တွင် Post တင်ရန်</h4>
            <textarea id="feedPostInputText" placeholder="ဘာတွေ စဉ်းစားနေလဲ..." style="width:100%; height:60px; background:#181820; border:1px solid #333; color:#fff; border-radius:8px; padding:8px; box-sizing:border-box; margin-bottom:8px;"></textarea>
            <input type="file" id="feedMediaPicker" accept="image/*" style="color:#aaa; font-size:0.75rem; margin-bottom:8px; display:block;">
            <button onclick="createNewFeedPost()" style="width:100%; background:#00ffff; color:#000; border:none; padding:8px; border-radius:6px; font-weight:bold; cursor:pointer;">Post တင်မည်</button>
        </div>
        <div id="feedPostsList"></div>
    `;

    document.getElementById('feedMediaPicker')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            compressImageOrFile(file, (base64) => { tempFbMediaData = base64; });
        }
    });

    try {
        const { data: posts } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
        const listContainer = document.getElementById('feedPostsList');
        if (!posts || posts.length === 0) {
            listContainer.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">ပို့စ်များ မရှိသေးပါ။</p>';
            return;
        }

        let feedPosts = posts.filter(p => p.is_video !== true && p.media_type !== 'youtube_video' && p.media_type !== 'gdrive_video');
        listContainer.innerHTML = '';

        feedPosts.forEach(post => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#111116; border:1px solid #222233; padding:12px; border-radius:8px; margin-bottom:12px;';
            div.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                    <img src="${post.user_photo || 'https://via.placeholder.com/35'}" style="width:35px; height:35px; border-radius:50%;">
                    <div>
                        <div style="font-weight:bold; font-size:0.85rem; color:#00ffff;">${escapeHtml(post.display_name || post.username)}</div>
                        <div style="color:#888; font-size:0.7rem;">@${post.username} • ${timeAgo(post.created_at)}</div>
                    </div>
                </div>
                <p style="font-size:0.85rem; margin:0 0 8px 0; color:#fff;">${escapeHtml(post.post_text || '')}</p>
                ${post.media_url ? `<img src="${post.media_url}" style="width:100%; max-height:250px; object-fit:cover; border-radius:6px;">` : ''}
            `;
            listContainer.appendChild(div);
        });
    } catch (err) {
        console.error(err);
    }
}

async function createNewFeedPost() {
    const currentUser = localStorage.getItem('flash_logged_user');
    const text = document.getElementById('feedPostInputText')?.value.trim();

    if(!text && !tempFbMediaData) return showToast('⚠️ ပို့စ်စာသား သို့မဟုတ် ပုံထည့်ပါ', 'error');

    await supabaseClient.from('flash_posts').insert([{
        username: currentUser,
        post_text: text,
        media_url: tempFbMediaData,
        media_type: 'image',
        is_video: false,
        likes: [],
        comments: [],
        created_at: new Date().toISOString()
    }]);

    showToast('✅ Feed Post တင်ပြီးပါပြီ', 'success');
    tempFbMediaData = '';
    loadFbFeed();
}
