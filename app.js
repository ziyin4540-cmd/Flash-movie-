window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('intro-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
    }, 2000);
    startLiveTimer();
});

// Live Account Duration Timer (Y / M / D / H / M / S)
function startLiveTimer() {
    const timerBox = document.getElementById('account-timer');
    let totalSeconds = 31536000; // 1 Year example
    setInterval(() => {
        totalSeconds--;
        const y = Math.floor(totalSeconds / 31536000);
        const m = Math.floor((totalSeconds % 31536000) / 2592000);
        const d = Math.floor((totalSeconds % 2592000) / 86400);
        const h = Math.floor((totalSeconds % 86400) / 3600);
        const min = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        timerBox.innerText = `${y}Y / ${m}M / ${d}D / ${h}H / ${min}M / ${s}S`;
    }, 1000);
}

// Bottom Navigation Page Switcher
function switchPage(pageName) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.bottom-nav button').forEach(btn => btn.classList.remove('active'));
    
    if(pageName === 'home') {
        document.getElementById('page-home').classList.remove('hidden');
    } else if(pageName === 'shorts') {
        document.getElementById('page-shorts').classList.remove('hidden');
    } else if(pageName === 'posts') {
        document.getElementById('page-posts').classList.remove('hidden');
    } else if(pageName === 'upload') {
        document.getElementById('page-upload').classList.remove('hidden');
    } else if(pageName === 'profile') {
        document.getElementById('page-profile').classList.remove('hidden');
    }
}

// Local Device File Picker & Video Player Integration
document.getElementById('deviceFilePicker').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const videoURL = URL.createObjectURL(file);
        const videoPlayer = document.getElementById('mainVideoPlayer');
        videoPlayer.src = videoURL;
        document.getElementById('displayTitle').innerText = file.name;
    }
});

// Upload Action
document.getElementById('uploadNowBtn').addEventListener('click', function() {
    const title = document.getElementById('videoTitleInput').value;
    const file = document.getElementById('deviceFilePicker').files[0];
    if(title && file) {
        alert(`အောင်မြင်စွာ တင်ပြီးပါပြီ: ${title}`);
        switchPage('home');
    } else {
        alert('ကျေးဇူးပြု၍ ခေါင်းစဉ်နှင့် ဖိုင်ကို ထည့်သွင်းပါ။');
    }
});

// Comment & Conversation System
document.getElementById('sendCommentBtn').addEventListener('click', function() {
    const input = document.getElementById('commentInput');
    const list = document.getElementById('commentsList');
    if (input.value.trim() !== '') {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `<strong>User:</strong> ${escapeHtml(input.value)}`;
        list.appendChild(div);
        input.value = '';
        list.scrollTop = list.scrollHeight;
    }
});

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
