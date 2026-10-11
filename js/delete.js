// Administrative & User Content Deletion Logic
async function adminDeleteUser(username) {
    if (!confirm(`@${username} ဖျက်မှာ သေချာပါသလား?`)) return;
    await supabaseClient.from('flash_users').delete().eq('username', username);
    showToast(`Account @${username} ဖျက်ပြီးပါပြီ`, 'success');
    if (typeof loadAdminPanel === 'function') loadAdminPanel();
}

async function adminDeletePost(postId) {
    if (!confirm(`ဖျက်မှာ သေချာပါသလား?`)) return;
    await supabaseClient.from('flash_posts').delete().eq('id', postId);
    showToast(`Post ကို ပယ်ဖျက်လိုက်ပါပြီ`, 'success');
    if (typeof loadAdminPanel === 'function') loadAdminPanel();
}
