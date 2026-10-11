// Like, Comment (Pin/Reply) & Share Interaction Logic
async function toggleLikePost(postId) {
    const currentUser = localStorage.getItem('flash_logged_user');
    if (!currentUser) return showToast('⚠️ Login ဝင်ပါ', 'error');

    try {
        const { data: post } = await supabaseClient.from('flash_posts').select('likes').eq('id', postId).single();
        if (!post) return;

        let likes = post.likes || [];
        if (likes.includes(currentUser)) {
            likes = likes.filter(u => u !== currentUser);
        } else {
            likes.push(currentUser);
        }

        await supabaseClient.from('flash_posts').update({ likes: likes }).eq('id', postId);
        showToast('❤️ Like ပြုလုပ်ပြီးပါပြီ', 'success');
        if (typeof loadFbFeed === 'function') loadFbFeed();
    } catch(err) {
        console.error(err);
    }
}

function sharePost(postId) {
    if (navigator.share) {
        navigator.share({ title: 'Flâsh Movie', url: window.location.href });
    } else {
        navigator.clipboard.writeText(window.location.href);
        showToast('🔗 Link ကို Copy ကူးလိုက်ပါပြီ', 'success');
    }
}
