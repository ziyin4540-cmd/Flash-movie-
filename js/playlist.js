// Playlist Management Logic
async function loadPlaylistsDropdown() {
    const dropdown = document.getElementById('playlistSelectDropdown');
    const currentUser = localStorage.getItem('flash_logged_user');
    if (!dropdown || !currentUser) return;

    dropdown.innerHTML = '<option value="">-- Playlist မရွေးပါ --</option>';
    try {
        const { data: playlists } = await supabaseClient.from('flash_playlists').select('*').eq('username', currentUser);
        if (playlists) {
            playlists.forEach(pl => {
                dropdown.innerHTML += `<option value="${pl.id}">${escapeHtml(pl.playlist_name)}</option>`;
            });
        }
    } catch(e){}
}

function openCreatePlaylistModal() {
    let playlistName = prompt("Playlist အမည် ရိုက်ထည့်ပါ:");
    if (playlistName) {
        const currentUser = localStorage.getItem('flash_logged_user');
        supabaseClient.from('flash_playlists').insert([{ username: currentUser, playlist_name: playlistName }]).then(() => {
            showToast('✅ Playlist အသစ် ဆောက်ပြီးပါပြီ', 'success');
            if (typeof loadUserProfile === 'function') loadUserProfile(currentUser);
        });
    }
}
