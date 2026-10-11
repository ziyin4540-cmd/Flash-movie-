// Login, Register & Session Management Logic
function checkUserSession() {
    const loggedUser = localStorage.getItem('flash_logged_user');

    if (!loggedUser) {
        if (document.getElementById('page-auth')) document.getElementById('page-auth').classList.remove('hidden');
        if (document.getElementById('app-container')) document.getElementById('app-container').classList.add('hidden');
    } else {
        if (document.getElementById('page-auth')) document.getElementById('page-auth').classList.add('hidden');
        if (document.getElementById('app-container')) document.getElementById('app-container').classList.remove('hidden');

        if (typeof switchMainPage === 'function') {
            switchMainPage('home');
        }
    }
}

async function handleLogin() {
    const uInput = document.getElementById('loginUser');
    const pInput = document.getElementById('loginPass');

    if (!uInput || !pInput) return;
    const username = uInput.value.trim();
    const password = pInput.value.trim();

    if (!username || !password) return showToast('⚠️ Username နှင့် Password ဖြည့်ပါ', 'error');

    showToast('🔑 Login စစ်ဆေးနေပါသည်...', 'success');

    try {
        const { data: user, error } = await supabaseClient.from('flash_users').select('*').eq('username', username).single();

        if (error || !user || user.password !== password) {
            return showToast('❌ Username သို့မဟုတ် Password မှားနေသည်', 'error');
        }

        localStorage.setItem('flash_logged_user', username);
        uInput.value = ''; pInput.value = '';
        showToast(`✅ မင်္ဂလာပါ @${username}`, 'success');

        document.getElementById('page-auth')?.classList.add('hidden');
        document.getElementById('app-container')?.classList.remove('hidden');
        if (typeof switchMainPage === 'function') switchMainPage('home');
    } catch (err) {
        showToast('❌ Login Error: ' + err.message, 'error');
    }
}

async function handleRegister() {
    const uInput = document.getElementById('regUser');
    const pInput = document.getElementById('regPass');
    const dInput = document.getElementById('regDisplayName');

    const username = uInput.value.trim();
    const password = pInput.value.trim();
    const displayName = dInput.value.trim() || username;

    if (!username || !password) return showToast('⚠️ Username နှင့် Password ဖြည့်ပါ', 'error');

    try {
        const { data: existing } = await supabaseClient.from('flash_users').select('username').eq('username', username).maybeSingle();
        if (existing) return showToast('❌ ဒီ Username ကို သုံးထားပြီးဖြစ်သည်', 'error');

        const { error } = await supabaseClient.from('flash_users').insert([{
            username: username,
            password: password,
            display_name: displayName,
            photo_url: 'https://via.placeholder.com/90',
            banner_url: ''
        }]);

        if (!error) {
            showToast('✅ အကောင့်ဖွင့်ခြင်း အောင်မြင်သည်', 'success');
            localStorage.setItem('flash_logged_user', username);
            document.getElementById('page-auth')?.classList.add('hidden');
            document.getElementById('app-container')?.classList.remove('hidden');
            if (typeof switchMainPage === 'function') switchMainPage('home');
        }
    } catch (e) {
        showToast('❌ Error: ' + e.message, 'error');
    }
}

function handleLogout() {
    localStorage.removeItem('flash_logged_user');
    checkUserSession();
    showToast('အကောင့်ထွက်ပြီးပါပြီ', 'success');
}

function switchAuthView(viewName) {
    if (viewName === 'register') {
        document.getElementById('view-login')?.classList.add('hidden');
        document.getElementById('view-register')?.classList.remove('hidden');
        if (document.getElementById('auth-title')) document.getElementById('auth-title').innerText = '📝 Register';
    } else {
        document.getElementById('view-register')?.classList.add('hidden');
        document.getElementById('view-login')?.classList.remove('hidden');
        if (document.getElementById('auth-title')) document.getElementById('auth-title').innerText = '🔑 Login';
    }
}
