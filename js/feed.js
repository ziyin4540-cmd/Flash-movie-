// Home Video Feed Load ပြုလုပ်သည့် Logic
window.loadHomeVideos = async function(searchQuery = '') {
    const container = document.getElementById('homeVideoFeedContainer');
    if (!container) return;

    container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:20px; color:#00ffff;">⚡ ဗီဒီယိုများ ရယူနေပါသည်...</div>`;

    try {
        let query = supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });
        
        const { data: posts, error } = await query;

        if (error) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:20px; color:#ff0033;">❌ Data ရယူ၍ မရပါ: ${error.message}</div>`;
            return;
        }

        // Video သီးသန့် Filter စစ်ထုတ်ခြင်း
        let videos = posts.filter(p => p.is_video || p.media_type === 'youtube_video' || p.media_type === 'gdrive_video' || p.media_type === 'video');

        if (searchQuery) {
            videos = videos.filter(v => (v.post_text || '').toLowerCase().includes(searchQuery.toLowerCase()));
        }

        container.innerHTML = '';

        if (videos.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:20px; color:#666;">ဗီဒီယိုများ မရှိသေးပါ။</div>`;
            return;
        }

        videos.forEach(v => {
            const card = document.createElement('div');
            card.style.cssText = 'background:#111116; border:1px solid #222233; border-radius:8px; overflow:hidden; cursor:pointer; text-align:center;';
            card.onclick = () => openWatchVideoScreen(v.id);

            let typeBadge = '🎬 Video';
            if (v.media_type === 'youtube_video') typeBadge = '▶️ YouTube';
            if (v.media_type === 'gdrive_video') typeBadge = '📁 Drive';

            card.innerHTML = `
                <div style="height:100px; background:#181820; display:flex; justify-content:center; align-items:center; position:relative; border-bottom:1px solid #222233;">
                    ${v.media_url && (v.media_type === 'image' || v.media_url.startsWith('data:image')) 
                        ? `<img src="${v.media_url}" style="width:100%; height:100%; object-fit:cover;">` 
                        : `<span style="font-size:2rem;">▶️</span>`}
                    <span style="position:absolute; bottom:5px; right:5px; background:rgba(0,0,0,0.8); color:#00ffff; font-size:0.65rem; padding:2px 6px; border-radius:4px;">${typeBadge}</span>
                </div>
                <div style="padding:8px;">
                    <p style="font-size:0.8rem; color:#fff; margin:0 0 4px 0; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(v.post_text || 'Untitled Video')}</p>
                    <span style="font-size:0.7rem; color:#00ffff;">@${escapeHtml(v.username)}</span>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:#ff0033;">Error: ${err.message}</div>`;
    }
};

// Feed Page Post Load ပြုလုပ်သည့် Logic
window.loadFbFeed = async function() {
    const container = document.getElementById('fbFeedContainer');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding:20px; color:#00ffff;">⚡ Feed စာရင်းများ ယူနေပါသည်...</div>`;

    try {
        const { data: posts, error } = await supabaseClient.from('flash_posts').select('*').order('created_at', { ascending: false });

        if (error) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#ff0033;">Error: ${error.message}</div>`;
            return;
        }

        container.innerHTML = '';

        if (!posts || posts.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:#666;">ပို့စ်များ မရှိသေးပါ။</div>`;
            return;
        }

        posts.forEach(p => {
            const card = document.createElement('div');
            card.style.cssText = 'background:#111116; border:1px solid #222233; border-radius:10px; padding:12px; margin-bottom:12px;';

            let mediaHTML = '';
            if (p.media_url) {
                if (p.media_type === 'youtube_video' || p.media_type === 'gdrive_video' || p.is_video) {
                    mediaHTML = `<button onclick="openWatchVideoScreen('${p.id}')" style="width:100%; padding:10px; background:#181820; border:1px solid #00ffff; color:#00ffff; border-radius:6px; font-weight:bold; cursor:pointer; margin-top:8px;">▶️ ဗီဒီယို ကြည့်ရှုမည်</button>`;
                } else {
                    mediaHTML = `<img src="${p.media_url}" style="width:100%; max-height:300px; border-radius:6px; object-fit:cover; margin-top:8px;">`;
                }
            }

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <b style="color:#00ffff; font-size:0.85rem;">@${escapeHtml(p.username)}</b>
                </div>
                <p style="color:#fff; font-size:0.85rem; margin:0 0 8px 0; white-space:pre-wrap;">${escapeHtml(p.post_text || '')}</p>
                ${mediaHTML}
            `;
            container.appendChild(card);
        });

    } catch (err) {
        container.innerHTML = `<div style="text-align:center; color:#ff0033;">Error: ${err.message}</div>`;
    }
};
