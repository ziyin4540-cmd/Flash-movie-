// Feed Text & Image Post Creation Logic
let tempFbMediaData = "";

async function createNewFeedPost() {
    const currentUser = localStorage.getItem('flash_logged_user');
    if (!currentUser) return showToast('⚠️ အရင်ဆုံး Login ဝင်ပါ', 'error');

    const text = document.getElementById('feedPostInputText')?.value.trim();

    if (!text && !tempFbMediaData) return showToast('⚠️ ပို့စ်စာသား သို့မဟုတ် ပုံထည့်ပါ', 'error');

    try {
        const { error } = await supabaseClient.from('flash_posts').insert([{
            username: currentUser,
            post_text: text,
            media_url: tempFbMediaData,
            media_type: 'image',
            is_video: false,
            likes: [],
            comments: [],
            created_at: new Date().toISOString()
        }]);

        if (!error) {
            showToast('✅ Feed Post တင်ပြီးပါပြီ', 'success');
            tempFbMediaData = '';
            if (typeof loadFbFeed === 'function') loadFbFeed();
        } else {
            showToast('❌ တင်၍မရပါ: ' + error.message, 'error');
        }
    } catch (err) {
        console.error(err);
    }
}
