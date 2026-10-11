// Full Screen Watch Player Logic
let activeWatchVideoId = null;

async function openWatchVideoScreen(videoId) {
    activeWatchVideoId = videoId;

    let watchPage = document.getElementById('page-watch-video');
    if (!watchPage) {
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
        if (!v) return;

        const currentUser = localStorage.getItem('flash_logged_user');
        const likesArr = v.likes || [];
        const isLiked = likesArr.includes(currentUser);

        let mediaContent = renderCustomVideoPlayer(v);

        watchPage.innerHTML = `
            <div style="background:#111116; padding:12px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #222233; position:sticky; top:0; z-index:100;">
                <button onclick="closeWatchVideoScreen()" style="background:#222233; border:1px solid #00ffff; color:#00ffff; font-weight:bold; font-size:0.85rem; cursor:pointer; padding:6px 14px; border-radius:6px;">◄ နောက်သို့ (Back)</button>
                <span style="color:#ff0033; font-weight:bold; font-size:0.9rem;">Flâsh Watch</span>
            </div>

            ${mediaContent}

            <div style="padding:15px;">
                <h3 style="color:#fff; font-size:1rem; margin-bottom:12px;">${escapeHtml(v.post_text)}</h3>
                
                <div style="display:flex; justify-content:space-around; background:#111116; border:1px solid #222233; padding:10px; border-radius:12px; margin-bottom:15px;">
                    <button onclick="toggleLikePost('${v.id}')" style="background:none; border:none; color:${isLiked ? '#ff0033' : '#aaa'}; font-weight:bold; cursor:pointer; font-size:0.85rem;">❤️ Like (${likesArr.length})</button>
                    <button onclick="openFullCommentPage('${v.id}')" style="background:none; border:none; color:#00ffff; font-weight:bold; cursor:pointer; font-size:0.85rem;">💬 Comments</button>
                    <button onclick="sharePost('${v.id}')" style="background:none; border:none; color:#00ff66; font-weight:bold; cursor:pointer; font-size:0.85rem;">🔄 Share</button>
                </div>
            </div>
        `;
    } catch(err) {
        console.error(err);
    }
}

function closeWatchVideoScreen() {
    const watchPage = document.getElementById('page-watch-video');
    if (watchPage) watchPage.remove();
}
