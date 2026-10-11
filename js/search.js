// Home Video & User Search Logic
function filterHomeVideos() {
    const input = document.getElementById('movieSearchInput');
    const q = input ? input.value.trim() : '';
    if (typeof loadHomeVideos === 'function') {
        loadHomeVideos(q);
    }
}

async function searchUserAccount(usernameQuery) {
    if (!usernameQuery) return [];
    try {
        const { data: users } = await supabaseClient.from('flash_users')
            .select('*')
            .ilike('username', `%${usernameQuery}%`);
        return users || [];
    } catch (e) {
        console.error(e);
        return [];
    }
}
