let db;
const dbName = "FlashMovieDB";
const storeName = "contents";

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open(dbName, 1);
        request.onerror = event => reject("IndexedDB error: " + event.target.error);
        request.onsuccess = event => { db = event.target.result; resolve(db); };
        request.onupgradeneeded = event => {
            let database = event.target.result;
            if (!database.objectStoreNames.contains(storeName)) {
                database.createObjectStore(storeName, { keyPath: "id" });
            }
        };
    });
}

function dbSaveContent(contentObj) {
    return new Promise((resolve, reject) => {
        let transaction = db.transaction([storeName], "readwrite");
        let store = transaction.objectStore(storeName);
        let request = store.put(contentObj);
        request.onsuccess = () => resolve(true);
        request.onerror = e => reject(e.target.error);
    });
}

function dbGetAllContents() {
    return new Promise((resolve, reject) => {
        let transaction = db.transaction([storeName], "readonly");
        let store = transaction.objectStore(storeName);
        let request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = e => reject(e.target.error);
    });
}

function dbDeleteContent(id) {
    return new Promise((resolve, reject) => {
        let transaction = db.transaction([storeName], "readwrite");
        let store = transaction.objectStore(storeName);
        let request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = e => reject(e.target.error);
    });
}

function getDeviceID() {
    let id = localStorage.getItem('flash_device_id');
    if(!id) {
        id = 'DEV_' + Math.random().toString(36).substring(2, 10).toUpperCase();
        localStorage.setItem('flash_device_id', id);
    }
    return id;
}

function getDeviceLimits() {
    let limits = JSON.parse(localStorage.getItem('flash_device_limits')) || {};
    let devId = getDeviceID();
    return limits[devId] || 2;
}

function formatDurationDetailed(startTime) {
    let diff = Math.floor((Date.now() - startTime) / 1000);
    if(diff < 0) diff = 0;
    let seconds = diff % 60;
    let totalMins = Math.floor(diff / 60);
    let minutes = totalMins % 60;
    let totalHours = Math.floor(totalMins / 60);
    let hours = totalHours % 24;
    let totalDays = Math.floor(totalHours / 24);
    let days = totalDays % 30;
    let totalMonths = Math.floor(totalDays / 30);
    let months = totalMonths % 12;
    let years = Math.floor(totalMonths / 12);
    return `${years}Y / ${months}M / ${days}D / ${hours}H / ${minutes}M / ${seconds}S`;
}

function formatTimeAgo(timestamp) {
    let diff = Math.floor((Date.now() - timestamp) / 1000);
    if(diff < 5) return 'Just now';
    if(diff < 60) return diff + 's ago';
    let mins = Math.floor(diff / 60);
    if(mins < 60) return mins + 'm ago';
    let hours = Math.floor(mins / 60);
    if(hours < 24) return hours + 'h ago';
    let days = Math.floor(hours / 24);
    if(days < 30) return days + 'd ago';
    let months = Math.floor(days / 30);
    if(months < 12) return months + 'mo ago';
    let years = Math.floor(months / 12);
    return years + 'y ago';
}

let contents = [];
let users = JSON.parse(localStorage.getItem('flash_users')) || [];
let deviceAccounts = JSON.parse(localStorage.getItem('flash_device_accs')) || [];
let limitRequests = JSON.parse(localStorage.getItem('flash_limit_requests')) || [];
let profileVisitors = JSON.parse(localStorage.getItem('flash_visitors')) || {};
let reports = JSON.parse(localStorage.getItem('flash_reports')) || [];
let blockedUsers = JSON.parse(localStorage.getItem('flash_blocked')) || [];
let following = JSON.parse(localStorage.getItem('flash_following')) || [];
let notInterestedList = JSON.parse(localStorage.getItem('flash_not_interested')) || [];
let currUser = JSON.parse(localStorage.getItem('flash_curr')) || null;
let appSettings = JSON.parse(localStorage.getItem('flash_settings')) || { resume: true, bgPlay: false, followView: true, followerView: true };
let currItem = null;
let filterType = 'all';
let currentChatUser = null;

window.addEventListener('DOMContentLoaded', () => {
    // Never block the intro screen on IndexedDB or a previously saved large video.
    const text = "Flâsh Movie";
    const container = document.getElementById('introTitleContainer');
    if (container) text.split('').forEach((char, i) => {
        const span = document.createElement('span');
        span.innerText = char === ' ' ? '\u00A0' : char;
        span.style.animationDelay = (i * 0.1) + 's';
        container.appendChild(span);
    });
    setTimeout(() => {
        const intro = document.getElementById('introScreen');
        if (intro) { intro.style.opacity = '0'; setTimeout(() => intro.style.display = 'none', 800); }
    }, 2200);
    checkBroadcastBanner();
    switchPage('homePage');
    initIndexedDB().then(() => dbGetAllContents()).then(items => {
        contents = items;
        renderFeed();
    }).catch(error => console.error('Background content load failed', error));
    setInterval(() => {
        if(currUser) localStorage.setItem('flash_last_active_' + currUser.username, Date.now());
        const durElem = document.getElementById('accDurationLive');
        if(durElem && currUser && currUser.createdAt) durElem.innerText = formatDurationDetailed(currUser.createdAt);
    }, 1000);
    setInterval(() => { if(currentChatUser) renderChatMessages(); }, 2000);
});
function checkBroadcastBanner() {
    let bMsg = localStorage.getItem('flash_broadcast_alert');
    let banner = document.getElementById('broadcastBanner');
    let bText = document.getElementById('broadcastText');
    if(bMsg) {
        let bData = JSON.parse(bMsg);
        bText.innerText = "📢 " + bData.title + ": " + bData.msg;
        banner.style.display = 'block';
    } else { banner.style.display = 'none'; }
}

function showAnimeToast(msg) {
    let t = document.getElementById('animeToast');
    document.getElementById('toastMsg').innerText = msg;
    t.classList.add('show');
    setTimeout(() => { t.classList.remove('show'); }, 2500);
}

function switchPage(pageId) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.remove('active-page'));
    document.getElementById(pageId).classList.add('active-page');
    if(pageId === 'homePage') renderFeed();
    if(pageId === 'shortsPage') renderShorts();
    if(pageId === 'postsPage') renderPosts();
    if(pageId === 'inboxPage') renderInbox();
}

function openModal(id) {
    if(id === 'loginModal' && !currUser) {
        let maxAllowed = getDeviceLimits();
        document.getElementById('modalLimitText').innerText = maxAllowed;
        if(deviceAccounts.length >= maxAllowed) { showAnimeToast('Device limit reached: Max ' + maxAllowed + ' accounts!'); return; }
    }
    document.getElementById(id).style.display = 'flex';
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function handleAuth() {
    let u = document.getElementById('authU').value.trim();
    let p = document.getElementById('authP').value;
    if(!u || !p) return showAnimeToast('Enter details');
    let f = u.startsWith('@') ? u : '@' + u;
    let devId = getDeviceID();
    let maxAllowed = getDeviceLimits();

    let usr = users.find(x => x.username === f);
    if(usr) {
        if(usr.password !== p) return showAnimeToast('Wrong password');
        if(usr.status !== 'Approved') return showAnimeToast('Pending admin approval');
        currUser = usr;
        if(!currUser.createdAt) currUser.createdAt = Date.now();
        if(!currUser.deviceId) currUser.deviceId = devId;
    } else {
        if(deviceAccounts.length >= maxAllowed) return showAnimeToast('Device limit reached! Request limit increase.');
        let permissionGranted = confirm("Flâsh Movie requests permission to register your Device ID (" + devId + ") for account management. Allow?");
        if(!permissionGranted) return showAnimeToast('Permission denied');

        usr = { username: f, password: p, accountName: f.substring(1), avatar: '', deviceId: devId, createdAt: Date.now(), status: 'Pending', followView: true, followerView: true };
        users.push(usr);
        if(!deviceAccounts.includes(f)) deviceAccounts.push(f);
        showAnimeToast('Account created! Wait for approval.');
    }
    if(!deviceAccounts.includes(currUser.username) && currUser.status === 'Approved') {
        if(deviceAccounts.length >= maxAllowed) return showAnimeToast('Device limit reached!');
        deviceAccounts.push(currUser.username);
    }
    if(!currUser.accountName) currUser.accountName = currUser.username.substring(1);
    if(!currUser.createdAt) currUser.createdAt = Date.now();
    if(!currUser.deviceId) currUser.deviceId = devId;
    localStorage.setItem('flash_curr', JSON.stringify(currUser));
    localStorage.setItem('flash_users', JSON.stringify(users));
    localStorage.setItem('flash_device_accs', JSON.stringify(deviceAccounts));
    closeModal('loginModal');
    showAnimeToast('Successfully Signed In!');
}

function signOut() { currUser = null; localStorage.removeItem('flash_curr'); switchPage('homePage'); showAnimeToast('Signed out successfully'); }
function checkUpload() { if(!currUser || currUser.status !== 'Approved') return showAnimeToast('Get admin approval first'); switchPage('uploadPage'); }
function togglePlaylistInput() {
    let isChecked = document.getElementById('playlistToggle').checked;
    document.getElementById('playlistInputBox').style.display = isChecked ? 'block' : 'none';
}

function requestAccountLimit() {
    let devId = getDeviceID();
    let req = { id: Date.now(), deviceId: devId, user: currUser.username, status: 'Pending' };
    limitRequests.push(req);
    localStorage.setItem('flash_limit_requests', JSON.stringify(limitRequests));
    showAnimeToast('📥 Limit increase request sent to Admin!');
}

async function uploadContent() {
    let type = document.getElementById('upType').value;
    let isPlaylistOn = document.getElementById('playlistToggle').checked;
    let playlist = isPlaylistOn ? (document.getElementById('upPlaylist').value.trim() || 'General') : '';
    let title = document.getElementById('upTitle').value;
    let fileInput = document.getElementById('upFile');
    let file = fileInput.files[0];
    let privacy = document.getElementById('upPrivacy').value;
    let allowDownload = document.getElementById('upDownload').value;

    if(!title && !file) return showAnimeToast('Enter title or select a file');

    let progBox = document.getElementById('uploadProgress');
    let bar = document.getElementById('progressBar');
    progBox.style.display = 'block';
    bar.style.width = '0%';
    bar.innerText = '0% (⚡ Lightning Upload...)';

    let reader = new FileReader();
    reader.onprogress = function(e) {
        if (e.lengthComputable) {
            let percentLoaded = Math.round((e.loaded / e.total) * 100);
            bar.style.width = percentLoaded + '%';
            bar.innerText = percentLoaded + '% (⚡ Lightning Upload...)';
        }
    };

    reader.onload = async function(e) {
        bar.style.width = '100%';
        bar.innerText = '100% (⚡ SUCCESSFUL!)';
        let newObj = {
            id: Date.now(), type, playlist, title: title || 'Untitled', url: e.target.result, fileType: file ? file.type : '',
            uploader: currUser.username, privacy, allowDownload, createdAt: Date.now(), likes: [], comments: []
        };
        await dbSaveContent(newObj);
        contents = await dbGetAllContents();
        setTimeout(() => {
            progBox.style.display = 'none';
            document.getElementById('upTitle').value = '';
            document.getElementById('upPlaylist').value = '';
            document.getElementById('playlistToggle').checked = false;
            document.getElementById('playlistInputBox').style.display = 'none';
            document.getElementById('upFile').value = '';
            switchPage('homePage');
            showAnimeToast('⚡ Upload Successful!');
        }, 800);
    };

    if(file) { reader.readAsDataURL(file); }
    else {
        let newObj = {
            id: Date.now(), type, playlist, title: title || 'Untitled', url: '', fileType: '',
            uploader: currUser.username, privacy, allowDownload, createdAt: Date.now(), likes: [], comments: []
        };
        await dbSaveContent(newObj);
        contents = await dbGetAllContents();
        let p = 0;
        let tInt = setInterval(() => {
            p += 34; if(p >= 100) p = 100;
            bar.style.width = p + '%'; bar.innerText = p + '% (⚡ SUCCESSFUL!)';
            if(p === 100) {
                clearInterval(tInt);
                setTimeout(() => {
                    progBox.style.display = 'none';
                    document.getElementById('upTitle').value = '';
                    document.getElementById('upPlaylist').value = '';
                    document.getElementById('playlistToggle').checked = false;
                    document.getElementById('playlistInputBox').style.display = 'none';
                    switchPage('homePage');
                    showAnimeToast('⚡ Upload Successful!');
                }, 800);
            }
        }, 100);
    }
}
function filterFeed(t) { filterType = t; renderFeed(); }
function checkPrivacy(c) {
    if(c.uploader === currUser?.username) return true;
    if(c.privacy === 'public' || !c.privacy) return true;
    if(c.privacy === 'followers' && following.includes(c.uploader)) return true;
    return false;
}

function getUploaderInfo(username) {
    let u = users.find(x => x.username === username);
    return { name: u ? (u.accountName || username.substring(1)) : username.substring(1), avatar: u && u.avatar ? u.avatar : '', followView: u?.followView ?? true, followerView: u?.followerView ?? true };
}

function getUserStatus(username) {
    let lastActive = localStorage.getItem('flash_last_active_' + username);
    if(!lastActive) return '<span style="color:#ef4444;">Offline</span>';
    let diff = Date.now() - parseInt(lastActive);
    if(diff < 15000) return '<span style="color:#10b981;">Online</span>';
    let mins = Math.floor(diff / 60000);
    if(mins < 60) return `<span style="color:#aaa;">Last ${mins}m ago (Offline)</span>`;
    return '<span style="color:#ef4444;">Offline</span>';
}

function openInboxPage() {
    if(!currUser || currUser.status !== 'Approved') return openModal('loginModal');
    switchPage('inboxPage');
    let list = document.getElementById('inboxList');
    list.innerHTML = '';
    let otherUsers = users.filter(u => u.username !== currUser.username && u.status === 'Approved');
    if(otherUsers.length === 0) { list.innerHTML = '<p style="color:#aaa;">No other users available.</p>'; return; }
    otherUsers.forEach(u => {
        let upInfo = getUploaderInfo(u.username);
        let avHtml = upInfo.avatar ? `<img src="${upInfo.avatar}" style="width:100%; height:100%; object-fit:cover;">` : upInfo.name.charAt(0).toUpperCase();
        list.innerHTML += `
            <div onclick="openChatRoom('${u.username}')" style="background:#1a1a1a; padding:12px; border-radius:8px; margin-bottom:8px; display:flex; align-items:center; gap:12px; cursor:pointer; border:1px solid #333;">
                <div style="width:45px; height:45px; background:#3b82f6; border-radius:50%; display:flex; align-items:center; justify-content:center; overflow:hidden; font-weight:bold;">${avHtml}</div>
                <div style="flex:1;">
                    <h4 style="margin:0 0 4px 0;">${upInfo.name} <small style="color:#aaa; font-weight:normal;">(${u.username})</small></h4>
                    <p style="margin:0; font-size:12px;">${getUserStatus(u.username)}</p>
                </div>
            </div>
        `;
    });
}

function openChatRoom(username) {
    if(!currUser || currUser.status !== 'Approved') return openModal('loginModal');
    currentChatUser = username;
    switchPage('chatRoomPage');
    let upInfo = getUploaderInfo(username);
    document.getElementById('chatName').innerText = upInfo.name;
    let cAv = document.getElementById('chatAvatar');
    if(upInfo.avatar) cAv.innerHTML = `<img src="${upInfo.avatar}" style="width:100%; height:100%; object-fit:cover;">`;
    else cAv.innerHTML = upInfo.name.charAt(0).toUpperCase();
    document.getElementById('chatStatus').innerHTML = getUserStatus(username);
    renderChatMessages();
}

function getChatKey(u1, u2) { return 'flash_chat_' + [u1, u2].sort().join('_'); }
function getChatMessagesList() { return JSON.parse(localStorage.getItem(getChatKey(currUser.username, currentChatUser))) || []; }
function saveChatMessagesList(msgs) { localStorage.setItem(getChatKey(currUser.username, currentChatUser), JSON.stringify(msgs)); }

function renderChatMessages() {
    let box = document.getElementById('chatMessages');
    let msgs = getChatMessagesList();
    box.innerHTML = '';
    if(msgs.length === 0) { box.innerHTML = '<p style="color:#aaa; text-align:center;">No messages yet. Say hello!</p>'; return; }
    let updated = false;
    msgs.forEach(m => {
        if(m.receiver === currUser.username && m.status !== 'Seen') { m.status = 'Seen'; updated = true; }
        let isMe = m.sender === currUser.username;
        let bg = isMe ? '#3b82f6' : '#272727';
        let align = isMe ? 'margin-left:auto;' : 'margin-right:auto;';
        let statusMark = isMe ? `<span style="font-size:10px; color:#cbd5e1; float:right; margin-left:8px;">${m.status || 'Sent'}</span>` : '';
        let contentHtml = m.type === 'sticker' ? `<img src="${m.url}" style="max-width:120px; border-radius:6px;">` : (m.type === 'image' ? `<img src="${m.url}" style="max-width:180px; border-radius:6px;"><br>${m.text || ''}` : (m.type === 'video' ? `<video src="${m.url}" controls style="max-width:180px; border-radius:6px;"></video><br>${m.text || ''}` : (m.type === 'audio' ? `<audio controls src="${m.url}" style="max-width:180px;"></audio><br>${m.text || ''}` : (m.type === 'file' ? `<a href="${m.url}" download="file" style="color:#38bdf8;">📁 Download File</a><br>${m.text || ''}` : `<span>${m.text}</span>`))));
        box.innerHTML += `<div style="background:${bg}; padding:8px 12px; border-radius:8px; max-width:70%; ${align} word-break:break-word; font-size:13px; position:relative;">${contentHtml}<div style="clear:both; margin-top:2px;"><span style="font-size:9px; color:#aaa;">${formatTimeAgo(m.id)}</span>${statusMark}</div></div>`;
    });
    if(updated) saveChatMessagesList(msgs);
    box.scrollTop = box.scrollHeight;
}

function sendTextMessage() {
    let txt = document.getElementById('chatInput').value.trim();
    if(!txt) return;
    let msgs = getChatMessagesList();
    msgs.push({ id: Date.now(), sender: currUser.username, receiver: currentChatUser, type: 'text', text: txt, status: 'Sending' });
    saveChatMessagesList(msgs);
    document.getElementById('chatInput').value = '';
    renderChatMessages();
    setTimeout(() => {
        let mList = getChatMessagesList();
        let last = mList.find(x => x.id === msgs[msgs.length-1].id);
        if(last) last.status = 'Sent';
        saveChatMessagesList(mList);
        renderChatMessages();
    }, 600);
}

function toggleStickerBox() {
    let box = document.getElementById('stickerBox');
    box.style.display = box.style.display === 'flex' ? 'none' : 'flex';
}

function sendSticker(emoji) {
    let msgs = getChatMessagesList();
    msgs.push({ id: Date.now(), sender: currUser.username, receiver: currentChatUser, type: 'text', text: emoji, status: 'Sent' });
    saveChatMessagesList(msgs);
    toggleStickerBox();
    renderChatMessages();
}

function sendStickerFromFile(input) {
    let file = input.files[0];
    if(!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let msgs = getChatMessagesList();
        msgs.push({ id: Date.now(), sender: currUser.username, receiver: currentChatUser, type: 'sticker', url: e.target.result, text: '[Sticker]', status: 'Sent' });
        saveChatMessagesList(msgs);
        renderChatMessages();
        showAnimeToast('✨ Sticker sent!');
    };
    reader.readAsDataURL(file);
}

function sendMediaFile(input) {
    let file = input.files[0];
    if(!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        let t = file.type.startsWith('image') ? 'image' : (file.type.startsWith('video') ? 'video' : (file.type.startsWith('audio') ? 'audio' : 'file'));
        let msgs = getChatMessagesList();
        msgs.push({ id: Date.now(), sender: currUser.username, receiver: currentChatUser, type: t, url: e.target.result, text: file.name, status: 'Sent' });
        saveChatMessagesList(msgs);
        renderChatMessages();
        showAnimeToast('Media sent successfully!');
    };
    reader.readAsDataURL(file);
}
function logProfileVisitor(ownerUsername) {
    if(!currUser || currUser.username === ownerUsername) return;
    if(!profileVisitors[ownerUsername]) profileVisitors[ownerUsername] = [];
    let list = profileVisitors[ownerUsername];
    let existing = list.find(x => x.username === currUser.username);
    if(existing) {
        existing.count += 1;
        existing.lastVisited = Date.now();
    } else {
        list.push({ username: currUser.username, count: 1, lastVisited: Date.now() });
    }
    localStorage.setItem('flash_visitors', JSON.stringify(profileVisitors));
}

function renderFeed() {
    let grid = document.getElementById('feedGrid');
    grid.innerHTML = '';
    let s = document.getElementById('search').value.toLowerCase();
    let data = contents.filter(c => c.title.toLowerCase().includes(s));
    data = data.filter(c => c.type !== 'post' && !blockedUsers.includes(c.uploader) && !notInterestedList.includes(c.id) && checkPrivacy(c));
    if(filterType !== 'all') data = data.filter(c => c.type === filterType);
    if(data.length === 0) { grid.innerHTML = '<p style="color:#aaa; text-align:center; grid-column:1/-1;">No data found.</p>'; return; }
    data.forEach(c => {
        let m = `<video src="${c.url}" preload="metadata" muted></video>`;
        let playlistTag = c.playlist ? ` [${c.playlist}]` : '';
        let upInfo = getUploaderInfo(c.uploader);
        grid.innerHTML += `<div class="card" onclick="openDetail(${c.id})"><div class="thumb">${m}</div><div class="meta"><h4>${playlistTag} ${c.title}</h4><p>${upInfo.name} • ${formatTimeAgo(c.createdAt || c.id)}</p></div></div>`;
    });
}

function openShortsPage() { switchPage('shortsPage'); }
function openPostsPage() { switchPage('postsPage'); }

function renderShorts() {
    let grid = document.getElementById('shortsGrid');
    grid.innerHTML = '';
    let shorts = contents.filter(c => c.type === 'short' && !blockedUsers.includes(c.uploader) && !notInterestedList.includes(c.id) && checkPrivacy(c));
    if(shorts.length === 0) { grid.innerHTML = '<p style="color:#aaa; text-align:center; grid-column:1/-1;">No shorts available.</p>'; return; }
    shorts.forEach(c => {
        let playlistTag = c.playlist ? ` [${c.playlist}]` : '';
        let upInfo = getUploaderInfo(c.uploader);
        grid.innerHTML += `<div class="card" onclick="openDetail(${c.id})"><div class="thumb"><video src="${c.url}" preload="metadata" muted></video></div><div class="meta"><h4>${playlistTag} ${c.title}</h4><p>${upInfo.name} • ${formatTimeAgo(c.createdAt || c.id)}</p></div></div>`;
    });
}

function renderPosts() {
    let grid = document.getElementById('postsGrid');
    grid.innerHTML = '';
    let posts = contents.filter(c => c.type === 'post' && !blockedUsers.includes(c.uploader) && !notInterestedList.includes(c.id) && checkPrivacy(c));
    if(posts.length === 0) { grid.innerHTML = '<p style="color:#aaa; text-align:center; grid-column:1/-1;">No posts available.</p>'; return; }
    posts.forEach(c => {
        let m = c.url ? (c.fileType && c.fileType.startsWith('image') ? `<img src="${c.url}">` : (c.fileType && c.fileType.startsWith('audio') ? `<audio controls src="${c.url}"></audio>` : `<video src="${c.url}"></video>`)) : `<div style="padding:20px; text-align:center;">📝</div>`;
        let playlistTag = c.playlist ? ` [${c.playlist}]` : '';
        let upInfo = getUploaderInfo(c.uploader);
        grid.innerHTML += `<div class="card" onclick="openDetail(${c.id})"><div class="thumb">${m}</div><div class="meta"><h4>${playlistTag} ${c.title}</h4><p>${upInfo.name} • ${formatTimeAgo(c.createdAt || c.id)}</p></div></div>`;
    });
}

function openDetail(id) {
    if(!currUser || currUser.status !== 'Approved') return openModal('loginModal');
    currItem = contents.find(x => x.id === id);
    switchPage('detailPage');
    let mb = document.getElementById('detailMedia');
    if(currItem.type === 'post') {
        if(!currItem.url) mb.innerHTML = `<button class="overlay-nav-btn" id="prevOverlayBtn" onclick="playPrevVideo()">⏮</button><div style="padding:40px; text-align:center;"><h3>${currItem.title}</h3></div><button class="overlay-nav-btn" id="nextOverlayBtn" onclick="playNextVideo()">⏭</button>`;
        else if(currItem.fileType && currItem.fileType.startsWith('image')) mb.innerHTML = `<button class="overlay-nav-btn" id="prevOverlayBtn" onclick="playPrevVideo()">⏮</button><img src="${currItem.url}"><button class="overlay-nav-btn" id="nextOverlayBtn" onclick="playNextVideo()">⏭</button>`;
        else if(currItem.fileType && currItem.fileType.startsWith('audio')) mb.innerHTML = `<button class="overlay-nav-btn" id="prevOverlayBtn" onclick="playPrevVideo()">⏮</button><audio controls autoplay src="${currItem.url}"></audio><button class="overlay-nav-btn" id="nextOverlayBtn" onclick="playNextVideo()">⏭</button>`;
        else mb.innerHTML = `<button class="overlay-nav-btn" id="prevOverlayBtn" onclick="playPrevVideo()">⏮</button><video src="${currItem.url}" controls autoplay playsinline id="activeVideo" onended="playNextVideo()"></video><button class="overlay-nav-btn" id="nextOverlayBtn" onclick="playNextVideo()">⏭</button>`;
    } else {
        mb.innerHTML = `<button class="overlay-nav-btn" id="prevOverlayBtn" onclick="playPrevVideo()">⏮</button><video src="${currItem.url}" controls autoplay playsinline id="activeVideo" onloadedmetadata="adjustVideoOrientation(this)" onended="playNextVideo()"></video><button class="overlay-nav-btn" id="nextOverlayBtn" onclick="playNextVideo()">⏭</button>`;
    }

    document.getElementById('detTitle').innerText = currItem.title;
    document.getElementById('detUploadTime').innerText = "Uploaded: " + new Date(currItem.createdAt || currItem.id).toLocaleString() + " (" + formatTimeAgo(currItem.createdAt || currItem.id) + ")";
    let upInfo = getUploaderInfo(currItem.uploader);
    document.getElementById('detUploaderName').innerText = upInfo.name;
    document.getElementById('detUploaderId').innerText = currItem.uploader;
    let avBox = document.getElementById('detUploaderAvatar');
    if(upInfo.avatar) avBox.innerHTML = `<img src="${upInfo.avatar}" style="width:100%; height:100%; object-fit:cover;">`;
    else avBox.innerHTML = upInfo.name.charAt(0).toUpperCase();

    let playlistBadge = document.getElementById('playlistBadge');
    if(currItem.playlist) { playlistBadge.innerText = "🎬 Playlist: " + currItem.playlist; playlistBadge.style.display = 'block'; }
    else playlistBadge.style.display = 'none';

    document.getElementById('nextVideoBadge').innerText = "⏭ Next: " + getNextVideoTitle();
    let dlBtn = document.getElementById('downloadBtn');
    if(currItem.allowDownload === 'yes' && currItem.url) dlBtn.style.display = 'block'; else dlBtn.style.display = 'none';

    updateLikeBtnUI();
    currentBgPlayState = false;
    updateBgPlayBtnUI();
    renderComments();
}

let selectedCreator = null;
function openCreatorProfile(username) {
    selectedCreator = username;
    logProfileVisitor(username);
    switchPage('userProfilePage');
    let u = users.find(x => x.username === username) || { username, accountName: username.substring(1), avatar: '', followView: true, followerView: true };
    document.getElementById('creatorName').innerText = u.accountName || username.substring(1);
    document.getElementById('creatorUsername').innerText = username;
    let cBox = document.getElementById('creatorAvatarBox');
    if(u.avatar) cBox.innerHTML = `<img src="${u.avatar}" style="width:100%; height:100%; object-fit:cover;">`;
    else cBox.innerHTML = (u.accountName || username.substring(1)).charAt(0).toUpperCase();

    let uFollowers = users.filter(x => (JSON.parse(localStorage.getItem('flash_following_' + x.username)) || []).includes(username)).length;
    let uFollowing = (JSON.parse(localStorage.getItem('flash_following_' + username)) || following.filter(f => f === username)).length;
    let uLikes = contents.filter(c => c.uploader === username).reduce((acc, curr) => acc + (curr.likes ? curr.likes.length : 0), 0);

    document.getElementById('creatorFollowerCount').innerText = uFollowers;
    document.getElementById('creatorFollowingCount').innerText = uFollowing;
    document.getElementById('creatorLikeCount').innerText = uLikes;

    updateCreatorFollowBtn();
    renderCreatorUploads(username);
}

function updateCreatorFollowBtn() {
    let btn = document.getElementById('creatorFollowBtn');
    if(!currUser || selectedCreator === currUser.username) { btn.style.display = 'none'; return; }
    btn.style.display = 'block';
    let myFollowing = JSON.parse(localStorage.getItem('flash_following_' + currUser.username)) || following;
    if(myFollowing.includes(selectedCreator)) { btn.innerText = 'Following'; btn.style.background = '#333'; }
    else { btn.innerText = 'Follow'; btn.style.background = '#ff0000'; }
}

function toggleCreatorFollow() {
    if(!selectedCreator || selectedCreator === currUser.username) return;
    let myFollowing = JSON.parse(localStorage.getItem('flash_following_' + currUser.username)) || following;
    if(myFollowing.includes(selectedCreator)) {
        myFollowing = myFollowing.filter(x => x !== selectedCreator);
        showAnimeToast('Unfollowed ' + selectedCreator);
    } else {
        myFollowing.push(selectedCreator);
        showAnimeToast('Followed ' + selectedCreator);
    }
    following = myFollowing;
    localStorage.setItem('flash_following_' + currUser.username, JSON.stringify(myFollowing));
    localStorage.setItem('flash_following', JSON.stringify(myFollowing));
    updateCreatorFollowBtn();
    openCreatorProfile(selectedCreator);
}

function openUserFollowModal(type, username) {
    let targetUser = users.find(x => x.username === username) || currUser;
    if(type === 'following' && targetUser.followView === false && username !== currUser.username) {
        return showAnimeToast('🔒 Following list is private (OFF)');
    }
    if(type === 'followers' && targetUser.followerView === false && username !== currUser.username) {
        return showAnimeToast('🔒 Followers list is private (OFF)');
    }

    document.getElementById('followModalTitle').innerText = type === 'following' ? 'Following List' : 'Followers List';
    let contentBox = document.getElementById('followModalContent');
    contentBox.innerHTML = '';

    let list = [];
    if(type === 'following') {
        list = JSON.parse(localStorage.getItem('flash_following_' + username)) || [];
    } else {
        users.forEach(u => {
            let uFollowing = JSON.parse(localStorage.getItem('flash_following_' + u.username)) || [];
            if(uFollowing.includes(username)) list.push(u.username);
        });
    }

    if(list.length === 0) { contentBox.innerHTML = '<p style="color:#aaa;">No users found.</p>'; }
    else {
        list.forEach(uname => {
            let upInfo = getUploaderInfo(uname);
            contentBox.innerHTML += `<div onclick="closeModal('followListModal'); openCreatorProfile('${uname}');" style="background:#121212; padding:8px; border-radius:6px; margin-bottom:5px; cursor:pointer;"><b>${upInfo.name}</b> (${uname})</div>`;
        });
    }
    openModal('followListModal');
}

async function renderCreatorUploads(username) {
    let grid = document.getElementById('creatorGrid');
    grid.innerHTML = '';
    contents = await dbGetAllContents();
    let items = contents.filter(c => c.uploader === username && checkPrivacy(c));
    if(items.length === 0) { grid.innerHTML = '<p style="color:#aaa; grid-column:1/-1;">No uploads found.</p>'; return; }
    items.forEach(c => {
        let m = c.type === 'post' ? (c.url ? (c.fileType && c.fileType.startsWith('image') ? `<img src="${c.url}">` : `<video src="${c.url}"></video>`) : `<div style="padding:20px; text-align:center;">📝</div>`) : `<video src="${c.url}"></video>`;
        grid.innerHTML += `<div class="card" onclick="openDetail(${c.id})"><div class="thumb">${m}</div><div class="meta"><h4>${c.playlist ? `[${c.playlist}] ` : ''}${c.title}</h4></div></div>`;
    });
}
function getActivePlaylist() {
    if(currItem.playlist) return contents.filter(c => c.playlist === currItem.playlist && !blockedUsers.includes(c.uploader) && !notInterestedList.includes(c.id) && checkPrivacy(c));
    return contents.filter(c => !c.playlist && !blockedUsers.includes(c.uploader) && !notInterestedList.includes(c.id) && checkPrivacy(c));
}

function getNextVideoTitle() {
    let list = getActivePlaylist();
    let idx = list.findIndex(x => x.id === currItem.id);
    if(idx > -1 && idx + 1 < list.length) return list[idx + 1].title;
    return "None (End)";
}

function playNextVideo() {
    let list = getActivePlaylist();
    let idx = list.findIndex(x => x.id === currItem.id);
    if(idx > -1 && idx + 1 < list.length) openDetail(list[idx + 1].id);
    else showAnimeToast('✨ End of list reached!');
}

function playPrevVideo() {
    let list = getActivePlaylist();
    let idx = list.findIndex(x => x.id === currItem.id);
    if(idx > 0) openDetail(list[idx - 1].id);
    else showAnimeToast('✨ This is the first video!');
}

function adjustVideoOrientation(v) {
    if(v.videoHeight > v.videoWidth) { v.style.maxHeight = '350px'; v.style.objectFit = 'contain'; }
    else { v.style.maxHeight = '220px'; v.style.objectFit = 'contain'; }
}

function downloadContent() {
    if(!currItem || !currItem.url) return;
    let a = document.createElement('a'); a.href = currItem.url; a.download = currItem.title || 'download';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showAnimeToast('📥 Downloading file...');
}

let currentBgPlayState = false;
function toggleBgPlay() {
    currentBgPlayState = !currentBgPlayState;
    let v = document.getElementById('activeVideo');
    if(v) { if(currentBgPlayState) v.removeAttribute('controls'); else v.setAttribute('controls', 'true'); }
    updateBgPlayBtnUI();
}

function updateBgPlayBtnUI() {
    let btn = document.getElementById('bgPlayBtn');
    if(currentBgPlayState) { btn.innerText = '🎵 Background Play: ON'; btn.style.background = '#10b981'; }
    else { btn.innerText = '🎵 Background Play: OFF'; btn.style.background = '#3b82f6'; }
}

function toggleLike() {
    if(!currItem.likes) currItem.likes = [];
    let idx = currItem.likes.indexOf(currUser.username);
    if(idx > -1) { currItem.likes.splice(idx, 1); showAnimeToast('Like removed'); }
    else { currItem.likes.push(currUser.username); showAnimeToast('Liked!'); }
    dbSaveContent(currItem);
    updateLikeBtnUI();
}

function updateLikeBtnUI() {
    let btn = document.getElementById('likeBtn');
    let liked = currItem.likes && currItem.likes.includes(currUser.username);
    let count = currItem.likes ? currItem.likes.length : 0;
    if(liked) { btn.innerText = `👍 Liked (${count})`; btn.style.color = '#38bdf8'; }
    else { btn.innerText = `👍 Like (${count})`; btn.style.color = '#fff'; }
}

function notInterested() {
    notInterestedList.push(currItem.id);
    localStorage.setItem('flash_not_interested', JSON.stringify(notInterestedList));
    showAnimeToast('Marked as not interested');
    switchPage('homePage');
}

function blockUser() {
    if(!blockedUsers.includes(currItem.uploader)) {
        blockedUsers.push(currItem.uploader);
        localStorage.setItem('flash_blocked', JSON.stringify(blockedUsers));
        showAnimeToast('Blocked ' + currItem.uploader);
        switchPage('homePage');
    }
}

function addComment() {
    let txt = document.getElementById('commText').value.trim();
    let img = document.getElementById('commImg').value.trim();
    if(!txt && !img) return;
    if(!currItem.comments) currItem.comments = [];
    currItem.comments.push({ id: Date.now(), user: currUser.username, text: txt, img: img, likes: 0 });
    dbSaveContent(currItem);
    document.getElementById('commText').value = '';
    document.getElementById('commImg').value = '';
    renderComments();
    showAnimeToast('Comment posted!');
}

function deleteComment(commId) {
    currItem.comments = currItem.comments.filter(c => c.id !== commId);
    dbSaveContent(currItem);
    renderComments();
    showAnimeToast('Comment deleted');
}

function renderComments() {
    let list = document.getElementById('commList');
    list.innerHTML = '';
    (currItem.comments || []).forEach(c => {
        let im = c.img ? `<br><img src="${c.img}" style="max-width:100px; margin-top:5px;">` : '';
        let uInfo = getUploaderInfo(c.user);
        let delBtn = (c.user === currUser.username || currItem.uploader === currUser.username) ? `<span style="float:right; color:red; cursor:pointer;" onclick="deleteComment(${c.id})">🗑️ Delete</span>` : '';
        list.innerHTML += `<div style="background:#121212; padding:8px; margin-top:5px; border-radius:4px;"><p style="margin:0 0 4px 0;"><b>${uInfo.name}:</b> ${c.text} ${im} ${delBtn}</p><span style="font-size:10px; color:#38bdf8;">${formatTimeAgo(c.id)}</span></div>`;
    });
}

function reportItem(t) {
    reports.push({ type: t, target: currItem ? currItem.title : 'Account', by: currUser.username });
    localStorage.setItem('flash_reports', JSON.stringify(reports));
    showAnimeToast('Report submitted successfully!');
}

function openProfile() {
    if(!currUser || currUser.status !== 'Approved') return openModal('loginModal');
    switchPage('profilePage');
    document.getElementById('profName').innerText = currUser.accountName || currUser.username.substring(1);
    document.getElementById('profUsername').innerText = currUser.username;
    let pBox = document.getElementById('profAvatarBox');
    if(currUser.avatar) pBox.innerHTML = `<img src="${currUser.avatar}" style="width:100%; height:100%; object-fit:cover;">`;
    else pBox.innerHTML = (currUser.accountName || currUser.username.substring(1)).charAt(0).toUpperCase();

    document.getElementById('deviceCount').innerText = deviceAccounts.length;
    document.getElementById('deviceLimitMax').innerText = getDeviceLimits();

    let uFollowers = users.filter(x => (JSON.parse(localStorage.getItem('flash_following_' + x.username)) || []).includes(currUser.username)).length;
    let uFollowing = (JSON.parse(localStorage.getItem('flash_following_' + currUser.username)) || following).length;
    let uLikes = contents.filter(c => c.uploader === currUser.username).reduce((acc, curr) => acc + (curr.likes ? curr.likes.length : 0), 0);

    document.getElementById('followerCount').innerText = uFollowers;
    document.getElementById('followingCount').innerText = uFollowing;
    document.getElementById('profLikeCount').innerText = uLikes;

    switchTab('video');
}

function openSettingsPage() {
    switchPage('settingsPage');
    document.getElementById('setAccountName').value = currUser.accountName || currUser.username.substring(1);
    document.getElementById('setAvatarUrl').value = currUser.avatar || '';
    document.getElementById('setFollowView').checked = currUser.followView ?? true;
    document.getElementById('setFollowerView').checked = currUser.followerView ?? true;
    document.getElementById('accCreatedDateDisplay').innerText = currUser.createdAt ? new Date(currUser.createdAt).toLocaleString() : 'N/A';
    document.getElementById('accDurationLive').innerText = currUser.createdAt ? formatDurationDetailed(currUser.createdAt) : '0Y / 0M / 0D / 0H / 0M / 0S';

    let vList = document.getElementById('visitorHistoryList');
    vList.innerHTML = '';
    let myVisitors = profileVisitors[currUser.username] || [];
    if(myVisitors.length === 0) { vList.innerHTML = 'No visitors yet.'; }
    else {
        let totalVisits = myVisitors.reduce((acc, curr) => acc + curr.count, 0);
        vList.innerHTML += `<b style="color:#38bdf8; display:block; margin-bottom:5px;">Total Visits: ${totalVisits} times</b>`;
        myVisitors.forEach(v => {
            let uInfo = getUploaderInfo(v.username);
            vList.innerHTML += `<div>👤 <b>${uInfo.name}</b> (${v.username}) - Visited <b>${v.count}</b> times</div>`;
        });
    }
}

function saveProfileSettings() {
    let name = document.getElementById('setAccountName').value.trim();
    let url = document.getElementById('setAvatarUrl').value.trim();
    let file = document.getElementById('setAvatarFile').files[0];
    currUser.followView = document.getElementById('setFollowView').checked;
    currUser.followerView = document.getElementById('setFollowerView').checked;
    if(name) currUser.accountName = name;
    if(file) {
        let reader = new FileReader();
        reader.onload = function(e) { currUser.avatar = e.target.result; updateUserStorage(); };
        reader.readAsDataURL(file);
    } else {
        if(url) currUser.avatar = url;
        updateUserStorage();
    }
}

function updateUserStorage() {
    let u = users.find(x => x.username === currUser.username);
    if(u) { u.accountName = currUser.accountName; u.avatar = currUser.avatar; u.followView = currUser.followView; u.followerView = currUser.followerView; }
    localStorage.setItem('flash_curr', JSON.stringify(currUser));
    localStorage.setItem('flash_users', JSON.stringify(users));
    showAnimeToast('Profile updated successfully!');
    openProfile();
}

function openAdminPage() {
    switchPage('adminPage');
    document.getElementById('admLoginBox').style.display = 'block';
    document.getElementById('admDashBox').style.display = 'none';
    document.getElementById('admPass').value = '';
}

function saveAppSettings() {
    appSettings.followView = document.getElementById('setFollowView').checked;
    appSettings.followerView = document.getElementById('setFollowerView').checked;
    localStorage.setItem('flash_settings', JSON.stringify(appSettings));
}

async function switchTab(t) {
    let grid = document.getElementById('profGrid');
    grid.innerHTML = '';
    contents = await dbGetAllContents();
    let items = contents.filter(c => c.uploader === currUser.username && c.type === t);
    if(items.length === 0) { grid.innerHTML = '<p style="color:#aaa; grid-column:1/-1;">No items uploaded.</p>'; return; }
    items.forEach(c => {
        let m = c.type === 'post' ? (c.url ? (c.fileType && c.fileType.startsWith('image') ? `<img src="${c.url}">` : `<video src="${c.url}"></video>`) : `<div style="padding:20px; text-align:center;">📝</div>`) : `<video src="${c.url}"></video>`;
        grid.innerHTML += `<div class="card"><div class="thumb" onclick="openDetail(${c.id})">${m}</div><div class="meta" onclick="openDetail(${c.id})"><h4>${c.title}</h4></div><div style="padding:0 8px 8px 8px;"><button onclick="deleteMyContent(${c.id})" style="background:red; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; width:100%; cursor:pointer;">Delete</button></div></div>`;
    });
}

async function deleteMyContent(id) {
    if(confirm('Delete this content?')) {
        await dbDeleteContent(id);
        contents = await dbGetAllContents();
        openProfile();
        showAnimeToast('Content deleted.');
    }
}

function verifyAdmin() {
    if(document.getElementById('admPass').value === '295802') {
        document.getElementById('admLoginBox').style.display = 'none';
        document.getElementById('admDashBox').style.display = 'block';
        renderAdmin();
        showAnimeToast('Admin Access Granted!');
    } else showAnimeToast('Wrong password');
}

function switchAdminTab(tabName, btnElem) {
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    btnElem.classList.add('active');
    document.getElementById('adminTabUsers').style.display = tabName === 'users' ? 'block' : 'none';
    document.getElementById('adminTabLimits').style.display = tabName === 'limits' ? 'block' : 'none';
    document.getElementById('adminTabContent').style.display = tabName === 'content' ? 'block' : 'none';
    document.getElementById('adminTabBroadcast').style.display = tabName === 'broadcast' ? 'block' : 'none';
}

function renderAdmin() {
    let uList = document.getElementById('admUsersList');
    uList.innerHTML = '';
    users.forEach((u, i) => {
        uList.innerHTML += `<div style="background:#121212; padding:10px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;"><div><b>${u.accountName || u.username}</b> (${u.username})<br><small style="color:#38bdf8;">Device ID: ${u.deviceId || 'N/A'}</small><br><small style="color:#aaa;">${u.status}</small></div><div style="display:flex; gap:5px;">${u.status !== 'Approved' ? `<button onclick="approveAdminUser(${i})" style="background:green; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Accept</button>` : ''}<button onclick="deleteAdminUser(${i})" style="background:red; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Delete</button></div></div>`;
    });

    let lList = document.getElementById('admLimitsList');
    lList.innerHTML = limitRequests.length === 0 ? '<p style="color:#aaa;">No limit requests.</p>' : '';
    limitRequests.forEach((req, idx) => {
        lList.innerHTML += `<div style="background:#121212; padding:10px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;"><div><b>User:</b> ${req.user}<br><small style="color:#38bdf8;">Device ID: ${req.deviceId}</small></div><button onclick="approveLimitRequest(${idx})" style="background:green; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Increase Limit to 5</button></div>`;
    });

    let cList = document.getElementById('admContentList');
    cList.innerHTML = contents.length === 0 ? '<p style="color:#aaa;">No content.</p>' : '';
    contents.forEach(c => {
        cList.innerHTML += `<div style="background:#121212; padding:8px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;"><span>${c.title} (${c.uploader})</span><button onclick="adminDeleteContent(${c.id})" style="background:red; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Delete</button></div>`;
    });
}

function approveAdminUser(i) { users[i].status = 'Approved'; localStorage.setItem('flash_users', JSON.stringify(users)); renderAdmin(); showAnimeToast('Approved'); }
function deleteAdminUser(i) { users.splice(i, 1); localStorage.setItem('flash_users', JSON.stringify(users)); renderAdmin(); showAnimeToast('Deleted'); }

function approveLimitRequest(idx) {
    let req = limitRequests[idx];
    let limits = JSON.parse(localStorage.getItem('flash_device_limits')) || {};
    limits[req.deviceId] = 5;
    localStorage.setItem('flash_device_limits', JSON.stringify(limits));
    limitRequests.splice(idx, 1);
    localStorage.setItem('flash_limit_requests', JSON.stringify(limitRequests));
    renderAdmin();
    showAnimeToast('Limit increased to 5 for Device: ' + req.deviceId);
}

async function adminDeleteContent(id) { await dbDeleteContent(id); contents = await dbGetAllContents(); renderAdmin(); renderFeed(); showAnimeToast('Deleted'); }

function sendBroadcast() {
    let title = document.getElementById('bcTitle').value;
    let msg = document.getElementById('bcMsg').value;
    if(!title || !msg) return showAnimeToast('Enter title & msg');
    localStorage.setItem('flash_broadcast_alert', JSON.stringify({ title, msg }));
    checkBroadcastBanner();
    showAnimeToast('📢 Broadcast Sent!');
    document.getElementById('bcTitle').value = ''; document.getElementById('bcMsg').value = '';
}

function clearBroadcast() {
    localStorage.removeItem('flash_broadcast_alert');
    checkBroadcastBanner();
    showAnimeToast('🗑️ Cleared!');
}

function switchNav(index) {
    document.querySelectorAll('nav div').forEach((el, i) => {
        if(i === index) el.classList.add('active'); else el.classList.remove('active');
    });
}



/* ---------- Web-only interaction upgrades ---------- */
const chatUiState = { replyTo: null };

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = e => resolve({ url: e.target.result, name: file.name, type: file.type });
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function chatMetaKey(u1, u2) { return 'flash_chat_meta_' + [u1, u2].sort().join('_'); }
function getChatMeta(u1, u2) { return JSON.parse(localStorage.getItem(chatMetaKey(u1, u2)) || '{}'); }
function saveChatMeta(u1, u2, meta) { localStorage.setItem(chatMetaKey(u1, u2), JSON.stringify(meta)); }
function chatHasMessages(u1, u2) { return getChatMessagesListFor(u1, u2).length > 0; }
function getChatMessagesListFor(u1, u2) { return JSON.parse(localStorage.getItem(getChatKey(u1, u2))) || []; }
function saveChatMessagesFor(u1, u2, messages) { localStorage.setItem(getChatKey(u1, u2), JSON.stringify(messages)); }

function setChatReply(messageId) {
    const msg = getChatMessagesList();
    const target = msg.find(m => m.id === messageId);
    if (!target) return;
    chatUiState.replyTo = messageId;
    const bar = document.getElementById('chatReplyBar');
    const text = document.getElementById('chatReplyText');
    if (bar && text) { text.textContent = 'Replying to: ' + (target.text || target.fileName || 'attachment'); bar.style.display = 'flex'; }
    document.getElementById('chatInput')?.focus();
}
function cancelChatReply() { chatUiState.replyTo = null; const bar = document.getElementById('chatReplyBar'); if (bar) bar.style.display = 'none'; }
function editChatMessage(id) {
    const msgs = getChatMessagesList(); const m = msgs.find(x => x.id === id);
    if (!m || m.sender !== currUser.username || m.type !== 'text') return;
    const next = prompt('Edit message', m.text);
    if (next === null) return;
    m.text = next.trim(); if (!m.text) return;
    m.edited = true; saveChatMessagesList(msgs); renderChatMessages();
}
function deleteChatMessage(id) {
    const msgs = getChatMessagesList(); const m = msgs.find(x => x.id === id);
    if (!m || (m.sender !== currUser.username && m.receiver !== currUser.username)) return;
    if (!confirm('Delete this message for this conversation?')) return;
    saveChatMessagesList(msgs.filter(x => x.id !== id)); renderChatMessages();
}
function toggleChatMessagePin(id) {
    const msgs = getChatMessagesList(); const m = msgs.find(x => x.id === id); if (!m) return;
    m.pinned = !m.pinned; saveChatMessagesList(msgs); renderChatMessages();
}
function pinConversation(username) {
    const meta = getChatMeta(currUser.username, username); meta.pinned = !meta.pinned; saveChatMeta(currUser.username, username, meta); renderInbox();
}
function deleteConversation(username) {
    if (!confirm('Delete this conversation from this browser?')) return;
    localStorage.removeItem(getChatKey(currUser.username, username));
    localStorage.removeItem(chatMetaKey(currUser.username, username));
    renderInbox(); showAnimeToast('Conversation deleted');
}

function renderInbox() {
    const list = document.getElementById('inboxList'); if (!list) return;
    const otherUsers = users.filter(u => u.username !== currUser.username && u.status === 'Approved');
    if (!otherUsers.length) { list.innerHTML = '<p style="color:#aaa;">No other users available.</p>'; return; }
    otherUsers.sort((a,b) => Number(getChatMeta(currUser.username,b.username).pinned) - Number(getChatMeta(currUser.username,a.username).pinned));
    list.innerHTML = otherUsers.map(u => {
        const info = getUploaderInfo(u.username), meta = getChatMeta(currUser.username, u.username), msgs = getChatMessagesListFor(currUser.username, u.username);
        const last = msgs[msgs.length - 1];
        const avatar = info.avatar ? `<img src="${info.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;">` : esc(info.name.charAt(0).toUpperCase());
        return `<div class="conversation-row ${meta.pinned ? 'is-pinned' : ''}" onclick="openChatRoom('${esc(u.username)}')">
          <div class="conversation-avatar">${avatar}</div><div class="conversation-main"><b>${esc(info.name)} <small>${esc(u.username)}</small></b><span>${last ? esc(last.text || last.fileName || 'Attachment') : getUserStatus(u.username)}</span></div>
          <div class="conversation-actions"><button class="icon-btn" onclick="event.stopPropagation();pinConversation('${esc(u.username)}')">${meta.pinned ? '📌' : '📍'}</button><button class="icon-btn danger" onclick="event.stopPropagation();deleteConversation('${esc(u.username)}')">🗑</button></div>
        </div>`;
    }).join('');
}

function renderChatMessages() {
    const box = document.getElementById('chatMessages'); if (!box || !currUser || !currentChatUser) return;
    const msgs = getChatMessagesList();
    if (!msgs.length) { box.innerHTML = '<p style="color:#aaa;text-align:center;">No messages yet. Say hello!</p>'; return; }
    let changed = false;
    box.innerHTML = msgs.map(m => {
        if (m.receiver === currUser.username && m.status !== 'Seen') { m.status = 'Seen'; changed = true; }
        const mine = m.sender === currUser.username;
        const body = m.type === 'text' ? `<span>${esc(m.text)}</span>` : m.type === 'sticker' || m.type === 'image' ? `<img src="${m.url}" alt="${esc(m.fileName || 'image')}" style="max-width:180px;border-radius:8px;">` : m.type === 'video' ? `<video src="${m.url}" controls style="max-width:220px;border-radius:8px;"></video>` : m.type === 'audio' ? `<audio src="${m.url}" controls style="max-width:220px;"></audio>` : `<a href="${m.url}" download="${esc(m.fileName || 'file')}" style="color:#38bdf8;">📁 ${esc(m.fileName || 'Download file')}</a>`;
        const reply = m.replyTo ? msgs.find(x => x.id === m.replyTo) : null;
        const quoted = reply ? `<div class="reply-quote">↩ ${esc(reply.text || reply.fileName || 'Attachment')}</div>` : '';
        const controls = `<div class="message-controls"><button onclick="setChatReply(${m.id})">↩ Reply</button>${mine && m.type === 'text' ? `<button onclick="editChatMessage(${m.id})">✎ Edit</button>` : ''}<button onclick="toggleChatMessagePin(${m.id})">${m.pinned ? '📌 Unpin' : '📍 Pin'}</button><button onclick="deleteChatMessage(${m.id})">🗑 Delete</button></div>`;
        return `<div class="message-bubble ${mine ? 'mine' : 'theirs'} ${m.pinned ? 'pinned-message' : ''}">${m.pinned ? '<div class="pinned-label">📌 Pinned</div>' : ''}${quoted}${body}<div class="message-time">${formatTimeAgo(m.id)} ${m.edited ? '· edited' : ''} ${mine ? esc(m.status || 'Sent') : ''}</div>${controls}</div>`;
    }).join('');
    if (changed) saveChatMessagesList(msgs);
    box.scrollTop = box.scrollHeight;
}

function sendTextMessage() {
    const input = document.getElementById('chatInput'), text = input.value.trim(); if (!text) return;
    const msgs = getChatMessagesList();
    msgs.push({ id: Date.now(), sender: currUser.username, receiver: currentChatUser, type: 'text', text, replyTo: chatUiState.replyTo, status: 'Sent' });
    saveChatMessagesList(msgs); input.value = ''; cancelChatReply(); renderChatMessages();
}
async function sendMediaFile(input) {
    const file = input.files[0]; if (!file) return;
    const data = await fileToDataURL(file), type = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'file';
    const msgs = getChatMessagesList(); msgs.push({ id: Date.now(), sender: currUser.username, receiver: currentChatUser, type, url: data.url, fileName: data.name, replyTo: chatUiState.replyTo, status: 'Sent' });
    saveChatMessagesList(msgs); input.value = ''; cancelChatReply(); renderChatMessages(); showAnimeToast('File sent from device');
}

async function addComment() {
    const txt = document.getElementById('commText').value.trim(), file = document.getElementById('commFile')?.files[0];
    if (!txt && !file) return showAnimeToast('Write a comment or choose a device file');
    const data = file ? await fileToDataURL(file) : null;
    if (!currItem.comments) currItem.comments = [];
    currItem.comments.push({ id: Date.now(), user: currUser.username, text: txt, attachment: data, replies: [], likes: 0 });
    await dbSaveContent(currItem); document.getElementById('commText').value = ''; if (document.getElementById('commFile')) document.getElementById('commFile').value = ''; renderComments(); showAnimeToast('Comment posted');
}
function addCommentReply(commentId) {
    const text = prompt('Write a reply'); if (!text || !text.trim()) return;
    const c = (currItem.comments || []).find(x => x.id === commentId); if (!c) return;
    c.replies = c.replies || []; c.replies.push({ id: Date.now(), user: currUser.username, text: text.trim() }); dbSaveContent(currItem); renderComments();
}
function deleteCommentReply(commentId, replyId) {
    const c = (currItem.comments || []).find(x => x.id === commentId); if (!c) return;
    c.replies = (c.replies || []).filter(r => r.id !== replyId); dbSaveContent(currItem); renderComments();
}
function renderComments() {
    const list = document.getElementById('commList'); if (!list) return;
    list.innerHTML = (currItem.comments || []).map(c => {
        const info = getUploaderInfo(c.user), attachment = c.attachment ? `<div class="comment-attachment">${c.attachment.type.startsWith('image') ? `<img src="${c.attachment.url}" alt="">` : `<a href="${c.attachment.url}" download="${esc(c.attachment.name)}">📎 ${esc(c.attachment.name)}</a>`}</div>` : '';
        const canDelete = c.user === currUser.username || currItem.uploader === currUser.username;
        const replies = (c.replies || []).map(r => `<div class="comment-reply"><b>${esc(getUploaderInfo(r.user).name)}</b> ${esc(r.text)} <small>${formatTimeAgo(r.id)}</small>${r.user === currUser.username || currItem.uploader === currUser.username ? `<button class="text-btn danger" onclick="deleteCommentReply(${c.id},${r.id})">Delete</button>` : ''}</div>`).join('');
        return `<div class="comment-item"><div><b>${esc(info.name)}</b> <span>${esc(c.text)}</span>${attachment}</div><small>${formatTimeAgo(c.id)}</small><div class="comment-actions"><button class="text-btn" onclick="addCommentReply(${c.id})">↩ Reply</button>${canDelete ? `<button class="text-btn danger" onclick="deleteComment(${c.id})">Delete</button>` : ''}</div>${replies}</div>`;
    }).join('') || '<p style="color:#aaa;">No comments yet.</p>';
}

// Replace profile avatar URL behavior with the same local device picker.
function saveProfileSettings() {
    const name = document.getElementById('setAccountName').value.trim(), file = document.getElementById('setAvatarFile').files[0];
    currUser.followView = document.getElementById('setFollowView').checked; currUser.followerView = document.getElementById('setFollowerView').checked; if (name) currUser.accountName = name;
    if (file) fileToDataURL(file).then(data => { currUser.avatar = data.url; updateUserStorage(); }); else updateUserStorage();
}

function openInboxPage() {
    if (!currUser || currUser.status !== 'Approved') return openModal('loginModal');
    switchPage('inboxPage'); renderInbox();
}


/* ---------- In-app navigation history ---------- */
const flashBaseSwitchPage = switchPage;
let flashHistoryReady = false;
let flashHandlingPopState = false;

switchPage = function(pageId, options = {}) {
    const current = document.querySelector('.page-section.active-page')?.id;
    const shouldPush = flashHistoryReady && !flashHandlingPopState && !options.replace && current !== pageId;
    if (shouldPush) history.pushState({ flashPage: pageId }, '', '#' + pageId);
    flashBaseSwitchPage(pageId);
};

function appBack(fallback = 'homePage') {
    if (history.state && history.state.flashPage) history.back();
    else switchPage(fallback, { replace: true });
}

window.addEventListener('DOMContentLoaded', () => {
    const pageFromHash = location.hash.replace('#', '');
    const firstPage = document.querySelector('.page-section.active-page')?.id || 'homePage';
    history.replaceState({ flashPage: firstPage }, '', '#' + firstPage);
    flashHistoryReady = true;
    if (pageFromHash && document.getElementById(pageFromHash) && pageFromHash !== firstPage) switchPage(pageFromHash, { replace: true });
});
window.addEventListener('popstate', event => {
    const page = event.state?.flashPage || location.hash.replace('#', '') || 'homePage';
    if (!document.getElementById(page)) return;
    flashHandlingPopState = true;
    switchPage(page, { replace: true });
    flashHandlingPopState = false;
});


/* ---------- Feed/detail and live-account fixes ---------- */
function ensureAccountCreatedAt() {
    if (!currUser) return;
    const valid = Number(currUser.createdAt) > 0 ? Number(currUser.createdAt) : Date.now();
    currUser.createdAt = valid;
    const stored = users.find(u => u.username === currUser.username);
    if (stored) stored.createdAt = valid;
    localStorage.setItem('flash_curr', JSON.stringify(currUser));
    localStorage.setItem('flash_users', JSON.stringify(users));
}
function updateAccountDuration() {
    if (!currUser) return;
    ensureAccountCreatedAt();
    const date = document.getElementById('accCreatedDateDisplay');
    const duration = document.getElementById('accDurationLive');
    if (date) date.textContent = new Date(currUser.createdAt).toLocaleString();
    if (duration) duration.textContent = formatDurationDetailed(currUser.createdAt);
}
function textPostMarkup(c) {
    return `<div class="text-post-preview"><span class="text-post-label">TEXT POST</span><p>${esc(c.title || '')}</p></div>`;
}
function cardMarkup(c) {
    const info = getUploaderInfo(c.uploader);
    let media;
    if (c.type === 'post' && !c.url) media = textPostMarkup(c);
    else if (c.fileType?.startsWith('image')) media = `<img src="${c.url}" alt="">`;
    else if (c.fileType?.startsWith('audio')) media = `<audio controls src="${c.url}"></audio>`;
    else if (c.fileType?.startsWith('video')) media = `<video src="${c.url}" preload="metadata" muted></video>`;
    else media = textPostMarkup(c);
    return `<div class="card" onclick="openDetail(${c.id})"><div class="thumb">${media}</div><div class="meta"><h4>${esc(c.playlist ? `[${c.playlist}] ` : '')}${esc(c.title || 'Untitled')}</h4><p>${esc(info.name)} • ${formatTimeAgo(c.createdAt || c.id)}</p></div></div>`;
}
function visibleItems(type) {
    return contents.filter(c => (!type || c.type === type) && !blockedUsers.includes(c.uploader) && checkPrivacy(c));
}
function renderFeed() {
    const grid = document.getElementById('feedGrid'); if (!grid) return;
    const s = (document.getElementById('search')?.value || '').toLowerCase();
    let data = visibleItems(filterType === 'all' ? null : filterType).filter(c => c.type !== 'post' && (c.title || '').toLowerCase().includes(s));
    grid.innerHTML = data.length ? data.map(cardMarkup).join('') : '<p style="color:#aaa;text-align:center;grid-column:1/-1;">No data found.</p>';
}
function renderShorts() {
    const grid = document.getElementById('shortsGrid'); if (!grid) return;
    const data = visibleItems('short'); grid.innerHTML = data.length ? data.map(cardMarkup).join('') : '<p style="color:#aaa;text-align:center;grid-column:1/-1;">No shorts available.</p>';
}
function renderPosts() {
    const grid = document.getElementById('postsGrid'); if (!grid) return;
    const data = visibleItems('post'); grid.innerHTML = data.length ? data.map(cardMarkup).join('') : '<p style="color:#aaa;text-align:center;grid-column:1/-1;">No text posts available.</p>';
}
function getActivePlaylist() {
    if (!currItem) return [];
    const category = currItem.type;
    let list = visibleItems(category);
    if (currItem.playlist) list = list.filter(c => c.playlist === currItem.playlist);
    else list = list.filter(c => !c.playlist);
    return list.sort((a,b) => (a.createdAt || a.id) - (b.createdAt || b.id));
}
function renderNextUp() {
    const panel = document.getElementById('nextUpPanel'); if (!panel || !currItem) return;
    const list = getActivePlaylist(), index = list.findIndex(x => x.id === currItem.id);
    const next = index >= 0 ? list.slice(index + 1) : [];
    panel.innerHTML = `<div class="next-up-heading">Up next <span>${next.length} ${currItem.type === 'short' ? 'shorts' : currItem.type === 'video' ? 'videos' : 'posts'}</span></div>` + (next.length ? next.map(cardMarkup).join('') : '<p class="muted">ဒီအမျိုးအစားထဲမှာ နောက်ထပ်မရှိသေးပါ။</p>');
}
function openDetail(id) {
    if (!currUser || currUser.status !== 'Approved') return openModal('loginModal');
    currItem = contents.find(x => x.id === id); if (!currItem) return;
    switchPage('detailPage');
    const mb = document.getElementById('detailMedia');
    const controls = `<button class="overlay-nav-btn" id="prevOverlayBtn" onclick="playPrevVideo()">⏮</button><button class="overlay-nav-btn" id="nextOverlayBtn" onclick="playNextVideo()">⏭</button>`;
    if (currItem.type === 'post' && !currItem.url) mb.innerHTML = controls + textPostMarkup(currItem);
    else if (currItem.type === 'post' && currItem.fileType?.startsWith('image')) mb.innerHTML = controls + `<img src="${currItem.url}" alt="">`;
    else if (currItem.type === 'post' && currItem.fileType?.startsWith('audio')) mb.innerHTML = controls + `<audio controls autoplay src="${currItem.url}"></audio>`;
    else if (currItem.type === 'post' && currItem.fileType?.startsWith('video')) mb.innerHTML = controls + `<video src="${currItem.url}" controls autoplay playsinline id="activeVideo" onended="playNextVideo()"></video>`;
    else if (currItem.type === 'short' || currItem.type === 'video') mb.innerHTML = controls + `<video src="${currItem.url}" controls autoplay playsinline id="activeVideo" onloadedmetadata="adjustVideoOrientation(this)" onended="playNextVideo()"></video>`;
    else mb.innerHTML = controls + textPostMarkup(currItem);
    document.getElementById('detTitle').innerText = currItem.title || 'Untitled';
    document.getElementById('detUploadTime').innerText = 'Uploaded: ' + new Date(currItem.createdAt || currItem.id).toLocaleString() + ' (' + formatTimeAgo(currItem.createdAt || currItem.id) + ')';
    const info = getUploaderInfo(currItem.uploader); document.getElementById('detUploaderName').innerText = info.name; document.getElementById('detUploaderId').innerText = currItem.uploader;
    const badge = document.getElementById('playlistBadge'); badge.style.display = currItem.playlist ? 'block' : 'none'; if (currItem.playlist) badge.innerText = '🎬 Playlist: ' + currItem.playlist;
    document.getElementById('nextVideoBadge').innerText = '⏭ Next: ' + (getActivePlaylist().find((x,i) => x.id === currItem.id && i + 1 < getActivePlaylist().length) ? getActivePlaylist()[getActivePlaylist().findIndex(x => x.id === currItem.id) + 1].title : 'None');
    const dl = document.getElementById('downloadBtn'); dl.style.display = currItem.allowDownload === 'yes' && currItem.url ? 'block' : 'none';
    updateLikeBtnUI(); currentBgPlayState = false; updateBgPlayBtnUI(); renderComments(); renderNextUp();
}

function requestNotificationPermission() {
    if (!('Notification' in window)) return showAnimeToast('ဒီ browser မှာ notification မထောက်ပံ့ပါ');
    Notification.requestPermission().then(p => showAnimeToast(p === 'granted' ? 'Notifications enabled' : 'Notification permission denied'));
}
function notifyIncomingMessage(message) {
    if (!message || message.sender === currUser?.username || !('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification('New message from ' + message.sender, { body: message.text || message.fileName || 'Attachment', tag: 'flash-message-' + message.id });
}
setInterval(() => { updateAccountDuration(); }, 1000);
window.addEventListener('DOMContentLoaded', () => { ensureAccountCreatedAt(); updateAccountDuration(); });


/* Inline comment replies: no popup/prompt */
function addCommentReply(commentId) {
    const input = document.querySelector(`input[data-reply-for="${commentId}"]`);
    const text = input?.value.trim(); if (!text) return;
    const c = (currItem.comments || []).find(x => x.id === commentId); if (!c) return;
    c.replies = c.replies || []; c.replies.push({ id: Date.now(), user: currUser.username, text });
    dbSaveContent(currItem); renderComments();
}
function renderComments() {
    const list = document.getElementById('commList'); if (!list) return;
    list.innerHTML = (currItem.comments || []).map(c => {
        const info = getUploaderInfo(c.user);
        const attachment = c.attachment ? `<div class="comment-attachment">${c.attachment.type.startsWith('image') ? `<img src="${c.attachment.url}" alt="">` : `<a href="${c.attachment.url}" download="${esc(c.attachment.name)}">📎 ${esc(c.attachment.name)}</a>`}</div>` : '';
        const canDelete = c.user === currUser.username || currItem.uploader === currUser.username;
        const replies = (c.replies || []).map(r => `<div class="comment-reply"><b>${esc(getUploaderInfo(r.user).name)}</b> ${esc(r.text)} <small>${formatTimeAgo(r.id)}</small>${r.user === currUser.username || currItem.uploader === currUser.username ? `<button class="text-btn danger" onclick="deleteCommentReply(${c.id},${r.id})">Delete</button>` : ''}</div>`).join('');
        return `<div class="comment-item"><div><b>${esc(info.name)}</b> <span>${esc(c.text)}</span>${attachment}</div><small>${formatTimeAgo(c.id)}</small><div class="comment-actions"><input class="inline-reply-input" data-reply-for="${c.id}" placeholder="Reply…"><button class="text-btn" onclick="addCommentReply(${c.id})">↩ Reply</button>${canDelete ? `<button class="text-btn danger" onclick="deleteComment(${c.id})">Delete</button>` : ''}</div>${replies}</div>`;
    }).join('') || '<p style="color:#aaa;">No comments yet.</p>';
}

/* Best-effort web notifications for messages arriving in another open tab. */
let lastSeenMessageIds = new Set();
function scanIncomingMessages() {
    if (!currUser) return;
    users.filter(u => u.username !== currUser.username).forEach(u => {
        getChatMessagesListFor(currUser.username, u.username).filter(m => m.receiver === currUser.username).forEach(m => {
            if (!lastSeenMessageIds.has(m.id)) { lastSeenMessageIds.add(m.id); if (m.status !== 'Seen') notifyIncomingMessage(m); }
        });
    });
}
window.addEventListener('storage', event => { if (event.key?.startsWith('flash_chat_')) scanIncomingMessages(); });
setInterval(scanIncomingMessages, 3000);


if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));


/* Settings no longer references the removed avatar URL input. */
function openSettingsPage() {
    if (!currUser) return openModal('loginModal');
    switchPage('settingsPage'); ensureAccountCreatedAt(); updateAccountDuration();
    const name = document.getElementById('setAccountName'); if (name) name.value = currUser.accountName || currUser.username.substring(1);
    const follow = document.getElementById('setFollowView'); if (follow) follow.checked = currUser.followView ?? true;
    const follower = document.getElementById('setFollowerView'); if (follower) follower.checked = currUser.followerView ?? true;
    const list = document.getElementById('visitorHistoryList'); if (!list) return;
    const visitors = profileVisitors[currUser.username] || [];
    list.innerHTML = visitors.length ? visitors.map(v => `<div>👤 <b>${esc(getUploaderInfo(v.username).name)}</b> (${esc(v.username)}) - ${v.count} visits</div>`).join('') : 'No visitors yet.';
}


/* ---------- Large-file upload fix: keep videos as IndexedDB Blobs ---------- */
const flashMediaUrls = new Map();
const flashOriginalGetAllContents = dbGetAllContents;
async function hydrateMediaSources(items) {
    return (items || []).map(item => {
        if (!item.url && item.blob instanceof Blob) {
            if (!flashMediaUrls.has(item.id)) flashMediaUrls.set(item.id, URL.createObjectURL(item.blob));
            item.url = flashMediaUrls.get(item.id);
        }
        return item;
    });
}
dbGetAllContents = async function() { return hydrateMediaSources(await flashOriginalGetAllContents()); };

async function uploadContent() {
    const type = document.getElementById('upType').value;
    const playlist = document.getElementById('playlistToggle').checked ? (document.getElementById('upPlaylist').value.trim() || 'General') : '';
    const title = document.getElementById('upTitle').value.trim();
    const file = document.getElementById('upFile').files[0];
    const privacy = document.getElementById('upPrivacy').value;
    const allowDownload = document.getElementById('upDownload').value;
    if (!title && !file) return showAnimeToast('Enter title or select a file');
    if (file && file.size > 1024 * 1024 * 1024) return showAnimeToast('File is over 1 GB. Please compress it or split it into parts.');
    if (file && navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        const available = (estimate.quota || Infinity) - (estimate.usage || 0);
        if (available < file.size * 1.15) return showAnimeToast('Not enough browser storage for this file. Clear storage or use a smaller file.');
    }
    const progressBox = document.getElementById('uploadProgress'), bar = document.getElementById('progressBar');
    progressBox.style.display = 'block'; bar.style.width = '15%'; bar.textContent = 'Preparing file…';
    const item = { id: Date.now(), type, playlist, title: title || 'Untitled', url: '', blob: file || null, fileType: file?.type || '', fileName: file?.name || '', fileSize: file?.size || 0, uploader: currUser.username, privacy, allowDownload, createdAt: Date.now(), likes: [], comments: [] };
    try {
        bar.style.width = '55%'; bar.textContent = 'Saving without converting…';
        await dbSaveContent(item);
        contents = await dbGetAllContents();
        bar.style.width = '100%'; bar.textContent = '100% (SUCCESSFUL!)';
        setTimeout(() => {
            progressBox.style.display = 'none';
            ['upTitle','upPlaylist','upFile'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            document.getElementById('playlistToggle').checked = false; document.getElementById('playlistInputBox').style.display = 'none';
            switchPage('homePage'); showAnimeToast('Upload successful — large file saved efficiently');
        }, 500);
    } catch (error) {
        progressBox.style.display = 'none';
        showAnimeToast('Upload failed: browser storage limit reached');
        console.error('Flash Movie upload failed', error);
    }
}


/* ---------- Supabase Storage integration ---------- */
const FLASH_SUPABASE_URL = 'https://xlityagwhcpkloiyvlpo.supabase.co';
const FLASH_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_KBAx_UDxgLrEgj2jS3uF2g_8QUZTL3P';
const flashSupabase = window.supabase?.createClient(FLASH_SUPABASE_URL, FLASH_SUPABASE_PUBLISHABLE_KEY);
const FLASH_MEDIA_BUCKET = 'flash-media';
function safeStorageName(name) { return String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_'); }
async function uploadToSupabaseStorage(file) {
    if (!flashSupabase || !file) return null;
    const path = `${safeStorageName(currUser.username)}/${Date.now()}-${safeStorageName(file.name)}`;
    const { error } = await flashSupabase.storage.from(FLASH_MEDIA_BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false, cacheControl: '3600' });
    if (error) throw error;
    const { data } = flashSupabase.storage.from(FLASH_MEDIA_BUCKET).getPublicUrl(path);
    return { path, url: data.publicUrl };
}
const flashLocalBlobUpload = uploadContent;
uploadContent = async function() {
    const file = document.getElementById('upFile').files[0];
    if (!file || !flashSupabase) return flashLocalBlobUpload();
    const type = document.getElementById('upType').value;
    const playlist = document.getElementById('playlistToggle').checked ? (document.getElementById('upPlaylist').value.trim() || 'General') : '';
    const title = document.getElementById('upTitle').value.trim();
    const privacy = document.getElementById('upPrivacy').value;
    const allowDownload = document.getElementById('upDownload').value;
    if (!title) return showAnimeToast('Enter a title');
    const box = document.getElementById('uploadProgress'), bar = document.getElementById('progressBar');
    box.style.display = 'block'; bar.style.width = '10%'; bar.textContent = 'Uploading to cloud…';
    try {
        const remote = await uploadToSupabaseStorage(file);
        bar.style.width = '85%'; bar.textContent = 'Saving metadata…';
        const item = { id: Date.now(), type, playlist, title, url: remote.url, storagePath: remote.path, blob: null, fileType: file.type, fileName: file.name, fileSize: file.size, uploader: currUser.username, privacy, allowDownload, createdAt: Date.now(), likes: [], comments: [] };
        await dbSaveContent(item);
        if (flashSupabase) await flashSupabase.from('contents').insert({ id: item.id, type: item.type, playlist: item.playlist, title: item.title, storage_path: item.storagePath, public_url: item.url, file_type: item.fileType, file_name: item.fileName, file_size: item.fileSize, uploader: item.uploader, privacy: item.privacy, allow_download: item.allowDownload, created_at_ms: item.createdAt }).then(() => {}).catch(() => {});
        contents = await dbGetAllContents(); bar.style.width = '100%'; bar.textContent = '100% (CLOUD UPLOAD COMPLETE)';
        setTimeout(() => { box.style.display = 'none'; document.getElementById('upTitle').value = ''; document.getElementById('upPlaylist').value = ''; document.getElementById('playlistToggle').checked = false; document.getElementById('playlistInputBox').style.display = 'none'; document.getElementById('upFile').value = ''; switchPage('homePage'); showAnimeToast('Large video uploaded to Supabase'); }, 600);
    } catch (error) {
        console.error('Supabase upload failed', error); box.style.display = 'none'; showAnimeToast('Cloud upload failed; using local browser storage'); flashLocalBlobUpload();
    }
};


/* ---------- Comments page and action controls ---------- */
function openCommentsPage() {
    if (!currItem) return;
    switchPage('commentsPage');
    renderComments();
}
function editComment(commentId) {
    const c = (currItem.comments || []).find(x => x.id === commentId); if (!c || c.user !== currUser.username) return;
    const input = document.querySelector(`input[data-edit-comment="${commentId}"]`);
    if (input) { c.text = input.value.trim() || c.text; c.edited = true; dbSaveContent(currItem); renderComments(); }
}
function toggleCommentLike(commentId) {
    const c = (currItem.comments || []).find(x => x.id === commentId); if (!c) return;
    c.likes = c.likes || []; const index = c.likes.indexOf(currUser.username);
    if (index >= 0) c.likes.splice(index, 1); else c.likes.push(currUser.username);
    dbSaveContent(currItem); renderComments();
}
function reportComment(commentId) {
    reports.push({ type: 'Comment', commentId, target: currItem?.title || '', by: currUser.username, createdAt: Date.now() });
    localStorage.setItem('flash_reports', JSON.stringify(reports)); showAnimeToast('Comment reported');
}
renderComments = function() {
    const list = document.getElementById('commList'); if (!list || !currItem) return;
    list.innerHTML = (currItem.comments || []).map(c => {
        const info = getUploaderInfo(c.user), likes = c.likes || [], liked = likes.includes(currUser.username);
        const attachment = c.attachment ? `<div class="comment-attachment">${c.attachment.type.startsWith('image') ? `<img src="${c.attachment.url}" alt="">` : `<a href="${c.attachment.url}" download="${esc(c.attachment.name)}">📎 ${esc(c.attachment.name)}</a>`}</div>` : '';
        const replies = (c.replies || []).map(r => `<div class="comment-reply"><b>${esc(getUploaderInfo(r.user).name)}</b> ${esc(r.text)} <small>${formatTimeAgo(r.id)}</small></div>`).join('');
        const edit = c.user === currUser.username ? `<input class="comment-edit-input" data-edit-comment="${c.id}" value="${esc(c.text)}"><button class="text-btn" onclick="editComment(${c.id})">Save</button>` : '';
        return `<article class="comment-item"><div><b>${esc(info.name)}</b><span> ${esc(c.text)}</span>${c.edited ? ' <small>(edited)</small>' : ''}${attachment}</div><small>${formatTimeAgo(c.id)}</small><div class="comment-actions"><button class="text-btn" onclick="toggleCommentLike(${c.id})">${liked ? '♥' : '♡'} ${likes.length}</button><input class="inline-reply-input" data-reply-for="${c.id}" placeholder="Reply…"><button class="text-btn" onclick="addCommentReply(${c.id})">↩ Reply</button><button class="text-btn" onclick="reportComment(${c.id})">⚠ Report</button>${c.user === currUser.username || currItem.uploader === currUser.username ? `<button class="text-btn danger" onclick="deleteComment(${c.id})">Delete</button>` : ''}</div>${edit}${replies}</article>`;
    }).join('') || '<p class="muted">No comments yet.</p>';
};

/* ---------- Upload progress via XMLHttpRequest (no Base64, real percentage) ---------- */
function uploadStorageWithProgress(file, path, onProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `${FLASH_SUPABASE_URL}/storage/v1/object/${FLASH_MEDIA_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
        xhr.open('POST', url, true);
        xhr.setRequestHeader('apikey', FLASH_SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${FLASH_SUPABASE_PUBLISHABLE_KEY}`);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(true) : reject(new Error(xhr.responseText || `Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error('Network error while uploading')); xhr.onabort = () => reject(new Error('Upload cancelled'));
        xhr.send(file);
    });
}
async function uploadToSupabaseStorageWithProgress(file, onProgress) {
    const path = `${safeStorageName(currUser.username)}/${Date.now()}-${safeStorageName(file.name)}`;
    await uploadStorageWithProgress(file, path, onProgress);
    const { data } = flashSupabase.storage.from(FLASH_MEDIA_BUCKET).getPublicUrl(path);
    return { path, url: data.publicUrl };
}
const flashCloudUpload = uploadContent;
uploadContent = async function() {
    const file = document.getElementById('upFile').files[0];
    if (!file || !flashSupabase) return flashCloudUpload();
    const type = document.getElementById('upType').value, title = document.getElementById('upTitle').value.trim();
    if (!title) return showAnimeToast('Enter a title');
    const playlist = document.getElementById('playlistToggle').checked ? (document.getElementById('upPlaylist').value.trim() || 'General') : '';
    const box = document.getElementById('uploadProgress'), bar = document.getElementById('progressBar'); box.style.display = 'block'; bar.style.width = '0%'; bar.textContent = '0% Uploading…';
    try {
        const remote = await uploadToSupabaseStorageWithProgress(file, percent => { bar.style.width = percent + '%'; bar.textContent = percent + '% Uploading…'; });
        const item = { id: Date.now(), type, playlist, title, url: remote.url, storagePath: remote.path, blob: null, fileType: file.type, fileName: file.name, fileSize: file.size, uploader: currUser.username, privacy: document.getElementById('upPrivacy').value, allowDownload: document.getElementById('upDownload').value, createdAt: Date.now(), likes: [], comments: [] };
        bar.style.width = '98%'; bar.textContent = '98% Saving metadata…'; await dbSaveContent(item); contents = await dbGetAllContents();
        if (flashSupabase) await flashSupabase.from('contents').insert({ id:item.id, type:item.type, playlist:item.playlist, title:item.title, storage_path:item.storagePath, public_url:item.url, file_type:item.fileType, file_name:item.fileName, file_size:item.fileSize, uploader:item.uploader, privacy:item.privacy, allow_download:item.allowDownload, created_at_ms:item.createdAt });
        bar.style.width = '100%'; bar.textContent = '100% Upload complete'; setTimeout(() => { box.style.display='none'; document.getElementById('upFile').value=''; document.getElementById('upTitle').value=''; switchPage('homePage'); showAnimeToast('Upload complete'); }, 600);
    } catch (error) { console.error(error); box.style.display='none'; showAnimeToast('Upload failed: ' + error.message); }
};

/* Video cards show a frame instead of an empty black poster when metadata is ready. */
const flashOriginalCardMarkup = cardMarkup;
cardMarkup = function(c) {
    const html = flashOriginalCardMarkup(c);
    return html.replace(/<video src="([^"]+)" preload="metadata" muted>/g, '<video src="$1" preload="auto" muted playsinline onloadeddata="this.currentTime=0.1">');
};


/* ---------- Device/account-limit correctness fix ---------- */
function getDeviceID() {
    let id = localStorage.getItem('flash_device_id');
    if (!id) {
        const match = document.cookie.match(/(?:^|; )flash_device_id=([^;]+)/);
        id = match ? decodeURIComponent(match[1]) : '';
    }
    if (!id) id = 'DEV_' + (crypto.randomUUID ? crypto.randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase() : Math.random().toString(36).slice(2, 18).toUpperCase());
    localStorage.setItem('flash_device_id', id);
    document.cookie = `flash_device_id=${encodeURIComponent(id)}; max-age=31536000; path=/; SameSite=Lax`;
    return id;
}
function normalizeUserDevices(user) {
    if (!user) return [];
    const ids = Array.isArray(user.deviceIds) ? user.deviceIds : [];
    if (user.deviceId) ids.push(user.deviceId);
    user.deviceIds = [...new Set(ids.filter(Boolean))];
    if (!user.deviceIds.length) user.deviceIds.push(getDeviceID());
    user.deviceId = user.deviceIds[0];
    return user.deviceIds;
}
function getDeviceAccountsFor(deviceId = getDeviceID()) {
    users.forEach(normalizeUserDevices);
    const names = [...new Set(users.filter(u => normalizeUserDevices(u).includes(deviceId)).map(u => u.username))];
    deviceAccounts = names;
    localStorage.setItem('flash_device_accs', JSON.stringify(names));
    localStorage.setItem('flash_users', JSON.stringify(users));
    return names;
}
function getDeviceLimits() {
    const limits = JSON.parse(localStorage.getItem('flash_device_limits') || '{}');
    return Math.max(1, Number(limits[getDeviceID()] || 2));
}
function persistAuthState() {
    localStorage.setItem('flash_users', JSON.stringify(users));
    localStorage.setItem('flash_device_accs', JSON.stringify(getDeviceAccountsFor()));
    if (currUser) localStorage.setItem('flash_curr', JSON.stringify(currUser));
}
function handleAuth() {
    const raw = document.getElementById('authU').value.trim(), password = document.getElementById('authP').value;
    if (!raw || !password) return showAnimeToast('Enter details');
    const username = raw.startsWith('@') ? raw : '@' + raw;
    const deviceId = getDeviceID(), limit = getDeviceLimits(), accounts = getDeviceAccountsFor(deviceId);
    let user = users.find(x => x.username === username);
    if (user) {
        if (user.password !== password) return showAnimeToast('Wrong password');
        if (user.status !== 'Approved') return showAnimeToast('Pending admin approval');
        const ids = normalizeUserDevices(user);
        if (!ids.includes(deviceId)) {
            if (accounts.length >= limit) return showAnimeToast(`Device limit reached: ${limit} accounts`);
            ids.push(deviceId); user.deviceIds = [...new Set(ids)];
        }
        currUser = user;
        if (!currUser.createdAt) currUser.createdAt = Date.now();
        persistAuthState(); closeModal('loginModal'); showAnimeToast('Successfully Signed In!'); return;
    }
    if (accounts.length >= limit) return showAnimeToast(`Device limit reached: ${limit} accounts`);
    if (!confirm(`Allow this website to register Device ID ${deviceId} for account management?`)) return showAnimeToast('Permission denied');
    user = { username, password, accountName: username.slice(1), avatar: '', deviceId, deviceIds: [deviceId], createdAt: Date.now(), status: 'Pending', followView: true, followerView: true };
    users.push(user); persistAuthState();
    document.getElementById('authP').value = '';
    closeModal('loginModal'); showAnimeToast('Account created. Wait for admin approval.');
}
function openModal(id) {
    if (id === 'loginModal' && !currUser) {
        const limit = getDeviceLimits(), count = getDeviceAccountsFor().length;
        document.getElementById('modalLimitText').innerText = limit;
        if (count >= limit) return showAnimeToast(`Device limit reached: ${limit} accounts`);
    }
    document.getElementById(id).style.display = 'flex';
}
const flashOriginalOpenProfile = openProfile;
openProfile = function() { getDeviceAccountsFor(); flashOriginalOpenProfile(); };
