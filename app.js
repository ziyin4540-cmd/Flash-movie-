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

window.addEventListener('DOMContentLoaded', async () => {
    await initIndexedDB();
    contents = await dbGetAllContents();
    
    const text = "Flâsh Movie";
    const container = document.getElementById('introTitleContainer');
    if(container) {
        text.split('').forEach((char, i) => {
            const span = document.createElement('span');
            span.innerText = char === ' ' ? '\u00A0' : char;
            span.style.animationDelay = (i * 0.1) + 's';
            container.appendChild(span);
        });
    }
    
    setTimeout(() => {
        let intro = document.getElementById('introScreen');
        if(intro) { intro.style.opacity = '0'; setTimeout(() => intro.style.display = 'none', 800); }
    }, 2200);

    checkBroadcastBanner();
    switchPage('homePage');

    setInterval(() => {
        if(currUser) localStorage.setItem('flash_last_active_' + currUser.username, Date.now());
        let durElem = document.getElementById('accDurationLive');
        if(durElem && currUser && currUser.createdAt) {
            durElem.innerText = formatDurationDetailed(currUser.createdAt);
        }
    }, 1000);

    setInterval(() => { if(currentChatUser) renderChatMessages(); }, 2000);
});
