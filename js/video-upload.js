// Video Upload Logic (YouTube, Google Drive & File Embed)
async function createNewPost() {
    const currentUser = localStorage.getItem('flash_logged_user');
    if (!currentUser) return showToast('⚠️ အရင်ဆုံး Login ဝင်ပါ', 'error');

    const text = document.getElementById('postInputText')?.value.trim();
    const ytUrl = document.getElementById('ytLinkInput')?.value.trim();
    const driveUrl = document.getElementById('gdriveLinkInput')?.value.trim();
    const playlistId = document.getElementById('playlistSelectDropdown')?.value;

    if (!text && !tempFbMediaData && !ytUrl && !driveUrl) {
        return showToast('⚠️ ပို့စ်စာသား သို့မဟုတ် Media/Link ထည့်ပါ', 'error');
    }

    showToast('📤 တင်နေပါသည်...', 'success');

    let finalMediaUrl = tempFbMediaData;
    let finalMediaType = 'text';

    if (ytUrl) {
        finalMediaUrl = ytUrl;
        finalMediaType = 'youtube_video';
    } else if (driveUrl) {
        finalMediaUrl = driveUrl;
        finalMediaType = 'gdrive_video';
    }

    try {
        const { error } = await supabaseClient.from('flash_posts').insert([{
            username: currentUser,
            post_text: text,
            media_url: finalMediaUrl,
            media_type: finalMediaType,
            playlist_id: playlistId || null,
            is_video: finalMediaType === 'video' || finalMediaType === 'youtube_video' || finalMediaType === 'gdrive_video',
            likes: [],
            comments: [],
            created_at: new Date().toISOString()
        }]);

        if (error) {
            showToast('❌ တင်၍မရပါ: ' + error.message, 'error');
        } else {
            showToast('✅ အောင်မြင်စွာ တင်ပြီးပါပြီ', 'success');
            if (document.getElementById('postInputText')) document.getElementById('postInputText').value = '';
            if (document.getElementById('ytLinkInput')) document.getElementById('ytLinkInput').value = '';
            if (document.getElementById('gdriveLinkInput')) document.getElementById('gdriveLinkInput').value = '';
            tempFbMediaData = '';
            if (document.getElementById('selectedMediaName')) document.getElementById('selectedMediaName').innerText = '';
            
            if (typeof switchMainPage === 'function') switchMainPage('home');
        }
    } catch (err) {
        showToast('❌ Error: ' + err.message, 'error');
    }
}
