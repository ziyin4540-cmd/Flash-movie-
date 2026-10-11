// Error Catching & App Recovery Logic
window.addEventListener('error', function(e) {
    console.error('Captured Global Error:', e.error || e.message);
    if (e.message && e.message.includes('QuotaExceededError')) {
        localStorage.clear();
        alert('App Storage ရောက်ရှိသွားသဖြင့် Cache စနစ်ကို ရှင်းလင်းလိုက်ပါပြီ။');
    }
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
});

function recoverAppCrash() {
    try {
        document.querySelectorAll('.modal, #adminAuthModal, #accountSettingsModal, #page-chat-window, #page-comments-full').forEach(m => m.remove());
        if (typeof checkUserSession === 'function') checkUserSession();
        showToast('🔄 App Normal State သို့ ပြန်လည်ရောက်ရှိပါပြီ', 'success');
    } catch (err) {
        console.error('Recovery failed:', err);
    }
}
