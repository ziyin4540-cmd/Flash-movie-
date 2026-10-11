// LocalStorage, Caching & Image Data Utilities
function safeSetLocalStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn('LocalStorage quota exceeded, clearing old caches...');
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('flash_cache_')) {
                localStorage.removeItem(k);
            }
        }
        try {
            localStorage.setItem(key, value);
        } catch (err) {
            console.error('Safe LocalStorage error:', err);
        }
    }
}

function compressImageFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = 300; 
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 300, 300);
            callback(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
