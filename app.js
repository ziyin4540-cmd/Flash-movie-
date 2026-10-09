// Intro & App Startup
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('intro-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
    }, 2000);
    startLiveTimer();
});

// Live Timer (Y / M / D / H / M / S)
function startLiveTimer() {
    const timerBox = document.getElementById('account-timer');
    let totalSeconds = 31536000;
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

// Local Device Video Picker (Direct from Phone Storage)
document.getElementById('deviceFilePicker').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('fileNameDisplay').innerText = file.name;
        const videoURL = URL.createObjectURL(file);
        const videoPlayer = document.getElementById('mainVideoPlayer');
        videoPlayer.src = videoURL;
        videoPlayer.play();
    }
});

// Comment & Conversation System (YouTube Style)
document.getElementById('sendCommentBtn').addEventListener('click', function() {
    const input = document.getElementById('commentInput');
    const list = document.getElementById('commentsList');
    if (input.value.trim() !== '') {
        const div = document.createElement('div');
        div.className = 'comment-item';
        div.innerHTML = `<strong>User:</strong> ${escapeHtml(input.value)} <br><small style="color: #3ea6ff; cursor:pointer;" onclick="replyComment(this)">Reply</small>`;
        list.appendChild(div);
        input.value = '';
        list.scrollTop = list.scrollHeight;
    }
});

// Live Chat System
document.getElementById('sendChatBtn').addEventListener('click', function() {
    const input = document.getElementById('chatInput');
    const room = document.getElementById('chatRoom');
    if (input.value.trim() !== '') {
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<strong>Guest:</strong> ${escapeHtml(input.value)}`;
        room.appendChild(div);
        input.value = '';
        room.scrollTop = room.scrollHeight;
    }
});

function replyComment(element) {
    const replyText = prompt("Reply ရေးပါ:");
    if(replyText) {
        const replyDiv = document.createElement('div');
        replyDiv.style.marginLeft = "20px";
        replyDiv.style.marginTop = "5px";
        replyDiv.style.fontSize = "0.85rem";
        replyDiv.style.color = "#aaa";
        replyDiv.innerHTML = `↳ <strong>Admin:</strong> ${escapeHtml(replyText)}`;
        element.parentElement.appendChild(replyDiv);
    }
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
