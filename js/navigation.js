// Page Routing & Fast Navigation Switcher
function switchMainPage(pageName) {
    if (pageName === 'admin' && !isAdminAuthenticated) {
        openAdminAuthModal();
        return;
    }

    if (typeof closeWatchVideoScreen === 'function') closeWatchVideoScreen();

    document.querySelectorAll('.main-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) targetPage.classList.remove('hidden');

    const targetNav = document.getElementById(`nav-btn-${pageName}`);
    if (targetNav) targetNav.classList.add('active');

    if (pageName === 'home' && typeof loadHomeVideos === 'function') loadHomeVideos();
    if (pageName === 'feed' && typeof loadFbFeed === 'function') loadFbFeed();
    if (pageName === 'chat' && typeof loadContactList === 'function') loadContactList();
    if (pageName === 'admin' && typeof loadAdminPanel === 'function') loadAdminPanel();
    if (pageName === 'upload' && typeof loadPlaylistsDropdown === 'function') loadPlaylistsDropdown();
    if (pageName === 'profile' && typeof loadUserProfile === 'function') {
        loadUserProfile(localStorage.getItem('flash_logged_user'));
    }
}
