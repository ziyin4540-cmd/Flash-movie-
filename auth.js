/* Supabase Auth adapter for Flash Movie.
 * Account passwords and admin permissions never live in application localStorage.
 * All account-limit mutations are enforced by Supabase RPCs and RLS.
 */
(() => {
    'use strict';

    const client = typeof flashSupabase !== 'undefined' ? flashSupabase : null;
    const legacyProfileKey = 'flash_legacy_profiles';
    const defaultUsage = { account_count: 0, max_accounts: 2 };
    let deviceUsage = { ...defaultUsage };
    let pendingLimitRequests = [];
    let backendReady = false;

    function toast(message) {
        if (typeof showAnimeToast === 'function') showAnimeToast(message);
        else console.info(message);
    }

    function text(value) {
        return typeof esc === 'function' ? esc(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    function normalizeUsername(value) {
        return String(value || '').trim().replace(/^@+/, '').toLowerCase();
    }

    function authEmailForUsername(value) {
        return `${normalizeUsername(value)}@accounts.flashmovie.invalid`;
    }

    function toAppProfile(row, email = '') {
        const rawStatus = String(row.status || 'pending').toLowerCase();
        return {
            id: row.id,
            email,
            username: '@' + row.username,
            accountName: row.account_name || row.username,
            avatar: row.avatar_url || '',
            role: row.role || 'user',
            status: rawStatus === 'approved' ? 'Approved' : rawStatus === 'rejected' ? 'Rejected' : 'Pending',
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            followView: row.follow_view !== false,
            followerView: row.follower_view !== false,
            deviceId: getDeviceID(),
            deviceIds: [getDeviceID()]
        };
    }

    function clearLegacyLocalCredentials() {
        const raw = localStorage.getItem('flash_users');
        if (raw) {
            try {
                const oldUsers = JSON.parse(raw);
                if (Array.isArray(oldUsers)) {
                    const safeProfiles = oldUsers.filter(u => u && u.username).map(u => ({
                        username: normalizeUsername(u.username),
                        accountName: String(u.accountName || u.username).slice(0, 60),
                        followView: u.followView !== false,
                        followerView: u.followerView !== false
                    }));
                    if (safeProfiles.length && !localStorage.getItem(legacyProfileKey)) {
                        localStorage.setItem(legacyProfileKey, JSON.stringify(safeProfiles));
                    }
                }
            } catch (error) {
                console.warn('Could not read legacy profile metadata; old credentials will still be removed.', error);
            }
        }
        // Never retain the old plaintext password list or fake client-side session.
        ['flash_users', 'flash_curr', 'flash_device_accs', 'flash_limit_requests', 'flash_device_limits'].forEach(key => localStorage.removeItem(key));
        users = [];
        currUser = null;
        deviceAccounts = [];
        limitRequests = [];
    }

    function setUsageUI() {
        const count = Math.max(0, Number(deviceUsage.account_count) || 0);
        const limit = Math.max(1, Number(deviceUsage.max_accounts) || 2);
        const countNode = document.getElementById('loginAccountCount');
        const limitNode = document.getElementById('modalLimitText');
        const notice = document.getElementById('loginLimitNotice');
        const requested = document.getElementById('loginRequestedLimit');
        const profileCount = document.getElementById('deviceCount');
        const profileLimit = document.getElementById('deviceLimitMax');
        if (countNode) countNode.textContent = count;
        if (limitNode) limitNode.textContent = limit;
        if (notice) notice.style.display = count >= limit ? 'block' : 'none';
        if (requested) {
            requested.min = String(limit + 1);
            const val = Number.parseInt(requested.value, 10);
            if (!Number.isInteger(val) || val <= limit) requested.value = String(limit + 1);
        }
        if (profileCount) profileCount.textContent = count;
        if (profileLimit) profileLimit.textContent = limit;
        // Existing profile UI uses array length for display only; server RPC remains authoritative.
        deviceAccounts = Array.from({ length: count }, (_, index) => `cloud-account-${index + 1}`);
    }

    async function refreshDeviceUsage() {
        if (!client || !backendReady) {
            deviceUsage = { ...defaultUsage };
            setUsageUI();
            return deviceUsage;
        }
        const { data, error } = await client.rpc('get_device_usage', { p_device_id: getDeviceID() });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        deviceUsage = {
            account_count: Number(row?.account_count) || 0,
            max_accounts: Math.max(1, Number(row?.max_accounts) || 2)
        };
        setUsageUI();
        return deviceUsage;
    }

    async function loadProfiles() {
        if (!client || !currUser) return;
        const { data, error } = await client.from('profiles')
            .select('id,username,account_name,avatar_url,status,role,follow_view,follower_view,created_at')
            .order('created_at', { ascending: false });
        if (error) throw error;
        users = (data || []).map(profile => toAppProfile(profile));
        const myProfile = users.find(profile => profile.id === currUser.id);
        if (myProfile) Object.assign(currUser, myProfile, { email: currUser.email });
    }

    async function hydrateUser(authUser, shouldLinkDevice) {
        if (!client || !authUser) return null;
        if (shouldLinkDevice) {
            const { error } = await client.rpc('link_my_device', { p_device_id: getDeviceID() });
            if (error) throw error;
        }
        const { data: row, error } = await client.from('profiles')
            .select('id,username,account_name,avatar_url,status,role,follow_view,follower_view,created_at')
            .eq('id', authUser.id)
            .single();
        if (error) throw error;
        currUser = toAppProfile(row, authUser.email || '');
        await loadProfiles();
        await refreshDeviceUsage();
        if (currUser.status !== 'Approved') {
            const status = currUser.status;
            currUser = null;
            users = [];
            await client.auth.signOut();
            toast(status === 'Rejected' ? 'ဒီ account ကို admin က reject လုပ်ထားပါသည်။' : 'Account ကို admin အတည်ပြုပြီးမှ Sign In ဝင်နိုင်ပါမည်။');
            return null;
        }
        if (document.getElementById('adminPage')?.classList.contains('active-page') && currUser.role === 'admin') {
            await window.verifyAdmin();
        }
        return currUser;
    }

    function backendNotice(message) {
        const node = document.getElementById('authBackendNotice');
        if (node) {
            node.textContent = message;
            node.style.display = 'block';
        }
    }

    async function signInWithSupabase() {
        if (!client || !backendReady) return toast('Supabase migration မပြီးသေးပါ။ Setup guide ကိုလိုက်နာပါ။');
        const username = normalizeUsername(document.getElementById('authUsername')?.value);
        const password = document.getElementById('authP')?.value || '';
        if (!/^[a-z0-9_.-]{1,30}$/.test(username) || !password) return toast('မှန်ကန်သော username နှင့် password ဖြည့်ပါ');
        try {
            const { data, error } = await client.auth.signInWithPassword({ email: authEmailForUsername(username), password });
            if (error) throw error;
            const profile = await hydrateUser(data.user, true);
            if (!profile) return;
            closeModal('loginModal');
            document.getElementById('authP').value = '';
            if (currUser.status === 'Approved') toast('အောင်မြင်စွာ ဝင်ရောက်ပြီးပါပြီ');
        } catch (error) {
            console.error('Supabase sign-in failed:', error);
            const message = /DEVICE_LIMIT_REACHED/i.test(error.message || '')
                ? `ဒီစက်ရဲ့ account limit ${deviceUsage.max_accounts} ပြည့်နေပါတယ်။ Limit တိုးတောင်းပါ။`
                : 'ဝင်ရောက်မရပါ။ Username နှင့် password ကိုစစ်ပါ။';
            toast(message);
            if (/DEVICE_LIMIT_REACHED/i.test(error.message || '')) await refreshDeviceUsage().catch(() => {});
        }
    }

    async function registerWithSupabase() {
        if (!client || !backendReady) return toast('Supabase migration မပြီးသေးပါ။ Setup guide ကိုလိုက်နာပါ။');
        const password = document.getElementById('authP')?.value || '';
        const username = normalizeUsername(document.getElementById('authUsername')?.value);
        if (!/^[a-z0-9_.-]{1,30}$/.test(username)) return toast('Username ကို အင်္ဂလိပ်စာလုံး၊ ဂဏန်း၊ _ . - ဖြင့် 1–30 လုံးထည့်ပါ');
        if (password.length < 8) return toast('Password အနည်းဆုံး 8 လုံးလိုအပ်ပါသည်');
        try {
            const usage = await refreshDeviceUsage();
            if (usage.account_count >= usage.max_accounts) {
                return toast(`Account limit ${usage.max_accounts} ပြည့်နေပါတယ်။ အရင်ဆုံး limit တိုးတောင်းပါ။`);
            }
            let legacy = [];
            try { legacy = JSON.parse(localStorage.getItem(legacyProfileKey) || '[]'); } catch (_) {}
            const old = Array.isArray(legacy) ? legacy.find(item => item.username === username) : null;
            const { data, error } = await client.auth.signUp({
                email: authEmailForUsername(username),
                password,
                options: {
                    data: {
                        username,
                        device_id: getDeviceID(),
                        account_name: old?.accountName || username,
                        follow_view: old?.followView !== false,
                        follower_view: old?.followerView !== false
                    }
                }
            });
            if (error) throw error;
            document.getElementById('authP').value = '';
            if (data.session && data.user) {
                const profile = await hydrateUser(data.user, true);
                if (!profile) return;
                closeModal('loginModal');
                toast('အကောင့်ဖွင့်ပြီးပါပြီ။ Admin approval ကိုစောင့်ပါ။');
            } else {
                toast('အကောင့်ဖွင့်မပြီးပါ။ Supabase Email confirmation ကို OFF လုပ်ထားကြောင်းစစ်ပါ။');
            }
        } catch (error) {
            console.error('Supabase registration failed:', error);
            const message = /DEVICE_LIMIT_REACHED/i.test(error.message || '')
                ? `Account limit ${deviceUsage.max_accounts} ပြည့်နေပါတယ်။ အရင်ဆုံး limit တိုးတောင်းပါ။`
                : /duplicate key|already registered|already exists/i.test(error.message || '')
                    ? 'ဒီ username ကို အသုံးပြုပြီးသားပါ။'
                    : 'အကောင့်ဖွင့်မရပါ။ Username/password စစ်ပြီး ထပ်ကြိုးစားပါ။';
            toast(message);
        }
    }

    async function requestAccountLimitInCloud() {
        if (!client || !backendReady) return toast('Supabase migration မပြီးသေးပါ။ Request ကို cloud သို့မပို့နိုင်သေးပါ။');
        const limitInput = document.getElementById('loginRequestedLimit');
        const modalIsOpen = limitInput && document.getElementById('loginModal')?.style.display === 'flex';
        const enteredLimit = Number.parseInt(limitInput?.value, 10);
        const requested = modalIsOpen ? enteredLimit : Math.max(deviceUsage.max_accounts + 1, Number.isInteger(enteredLimit) ? enteredLimit : 0);
        const username = currUser?.username ? normalizeUsername(currUser.username) : normalizeUsername(document.getElementById('authUsername')?.value);
        if (!/^[a-z0-9_.-]{1,30}$/.test(username)) return toast('Limit request အတွက် Username ထည့်ပါ');
        if (!Number.isInteger(requested) || requested <= deviceUsage.max_accounts) return toast(`လက်ရှိ limit ${deviceUsage.max_accounts} ထက်ကြီးသော အရေအတွက်ထည့်ပါ`);
        const { error } = await client.rpc('request_device_limit', {
            p_device_id: getDeviceID(),
            p_requester_email: null,
            p_requested_limit: requested,
            p_username: username
        });
        if (error) {
            console.error('Limit request failed:', error);
            return toast(/greater than current|REQUEST_NOT_HIGHER/i.test(error.message || '')
                ? `လက်ရှိ limit ${deviceUsage.max_accounts} ထက်ကြီးသော အရေအတွက်ထည့်ပါ`
                : 'Request ကို cloud သို့မပို့နိုင်ပါ။ ခဏနေပြန်ကြိုးစားပါ။');
        }
        toast('Limit တိုးရန် request ကို admin ထံပို့ပြီးပါပြီ');
    }

    async function signOutWithSupabase() {
        if (client) {
            const { error } = await client.auth.signOut();
            if (error) console.error('Supabase sign-out failed:', error);
        }
        currUser = null;
        users = [];
        deviceAccounts = [];
        switchPage('homePage');
        toast('အကောင့်မှထွက်ပြီးပါပြီ');
    }

    async function persistProfileToSupabase() {
        if (!client || !currUser) return toast('အရင်ဝင်ရောက်ပါ');
        const accountName = document.getElementById('setAccountName')?.value.trim().slice(0, 60) || currUser.accountName;
        const followView = !!document.getElementById('setFollowView')?.checked;
        const followerView = !!document.getElementById('setFollowerView')?.checked;
        const file = document.getElementById('setAvatarFile')?.files?.[0];
        let avatarUrl = currUser.avatar || '';
        if (file) {
            if (!file.type.startsWith('image/') || file.size > 512 * 1024) return toast('Profile photo သည် image ဖြစ်ရပြီး 512 KB အောက်ဖြစ်ရပါမည်');
            avatarUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
        const { error } = await client.from('profiles').update({
            account_name: accountName,
            avatar_url: avatarUrl,
            follow_view: followView,
            follower_view: followerView
        }).eq('id', currUser.id);
        if (error) {
            console.error('Profile update failed:', error);
            return toast('Profile ကို cloud သို့မသိမ်းနိုင်ပါ');
        }
        Object.assign(currUser, { accountName, avatar: avatarUrl, followView, followerView });
        await loadProfiles();
        toast('Profile ကို Supabase တွင်သိမ်းပြီးပါပြီ');
        window.openProfile();
    }

    async function setAccountStatusInCloud(index, status) {
        if (currUser?.role !== 'admin') return toast('Admin ခွင့်ပြုချက်လိုအပ်ပါသည်');
        const target = users[index];
        if (!target?.id || !['approved', 'rejected'].includes(status)) return;
        const { error } = await client.rpc('admin_set_account_status', { p_user_id: target.id, p_status: status });
        if (error) {
            console.error('Account approval failed:', error);
            return toast('Account status ကိုပြောင်းမရပါ');
        }
        await window.renderAdmin();
        toast(status === 'approved' ? 'Account ကို approve လုပ်ပြီးပါပြီ' : 'Account ကို reject လုပ်ပြီးပါပြီ');
    }

    async function renderAdminCloud() {
        if (!client || currUser?.role !== 'admin') return toast('Admin ခွင့်ပြုချက်မရှိပါ');
        const [profilesResult, requestsResult, contentsResult] = await Promise.all([
            client.from('profiles').select('id,username,account_name,avatar_url,status,role,follow_view,follower_view,created_at').order('created_at', { ascending: false }),
            client.from('account_limit_requests').select('id,user_id,requester_email,username,device_id,requested_limit,status,created_at').eq('status', 'Pending').order('created_at', { ascending: true }),
            Promise.resolve({ data: contents, error: null })
        ]);
        if (profilesResult.error || requestsResult.error) {
            console.error('Admin data load failed:', profilesResult.error || requestsResult.error);
            return toast('Admin data ကို load မလုပ်နိုင်ပါ။ RLS policies ကိုစစ်ပါ။');
        }
        users = (profilesResult.data || []).map(row => toAppProfile(row));
        pendingLimitRequests = requestsResult.data || [];
        limitRequests = pendingLimitRequests;
        const userList = document.getElementById('admUsersList');
        if (userList) userList.innerHTML = users.length ? users.map((user, index) =>
            `<div style="background:#121212;padding:10px;border-radius:6px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:8px;"><div><b>${text(user.accountName)}</b> (${text(user.username)})<br><small style="color:#aaa;">${text(user.status)} · ${text(user.role)}</small></div>${user.status !== 'Approved' ? `<button onclick="setAccountStatusInCloud(${index},'approved')" style="background:green;color:white;border:0;padding:6px 10px;border-radius:4px;">Approve</button>` : ''}</div>`
        ).join('') : '<p style="color:#aaa;">No accounts yet.</p>';
        const requestList = document.getElementById('admLimitsList');
        if (requestList) requestList.innerHTML = pendingLimitRequests.length ? pendingLimitRequests.map((request, index) =>
            `<div style="background:#121212;padding:10px;border-radius:6px;margin-bottom:8px;"><b>${text(request.username ? '@' + request.username : request.requester_email)}</b><br><small style="color:#38bdf8;">Device ID: ${text(request.device_id)}</small><br><small>Requested: ${Number(request.requested_limit)} accounts · ${text(new Date(request.created_at).toLocaleString())}</small><div style="display:flex;gap:8px;align-items:center;margin-top:8px;"><label for="limitInput-${index}" style="font-size:12px;color:#aaa;">Set maximum:</label><input id="limitInput-${index}" type="number" min="1" step="1" value="${Number(request.requested_limit)}" style="width:110px;padding:6px;background:#121212;color:#fff;border:1px solid #444;border-radius:4px;"><button onclick="approveLimitRequestInCloud(${index})" style="background:green;color:white;border:0;padding:7px 10px;border-radius:4px;">Save limit</button></div></div>`
        ).join('') : '<p style="color:#aaa;">No pending limit requests.</p>';
        const contentList = document.getElementById('admContentList');
        if (contentList) contentList.innerHTML = (contentsResult.data || []).length ? contentsResult.data.map(item =>
            `<div style="background:#121212;padding:8px;border-radius:6px;margin-bottom:8px;">${text(item.title)} (${text(item.uploader)})</div>`
        ).join('') : '<p style="color:#aaa;">No local content in this browser.</p>';
    }

    async function approveLimitRequestInCloud(index) {
        if (currUser?.role !== 'admin') return toast('Admin ခွင့်ပြုချက်လိုအပ်ပါသည်');
        const request = pendingLimitRequests[index];
        const limit = Number.parseInt(document.getElementById(`limitInput-${index}`)?.value, 10);
        if (!request?.id || !Number.isInteger(limit) || limit < 1) return toast('Limit ကို 1 နှင့်အထက် ကိန်းပြည့်ထည့်ပါ');
        const { error } = await client.rpc('admin_set_device_limit', {
            p_device_id: request.device_id,
            p_max_accounts: limit,
            p_request_id: request.id
        });
        if (error) {
            console.error('Admin limit update failed:', error);
            return toast('Device limit ကို save မလုပ်နိုင်ပါ');
        }
        await renderAdminCloud();
        await refreshDeviceUsage().catch(() => {});
        toast(`Device limit ကို ${limit} သို့ပြောင်းပြီးပါပြီ`);
    }

    async function saveDeviceLimitToCloud() {
        if (currUser?.role !== 'admin') return toast('Admin ခွင့်ပြုချက်လိုအပ်ပါသည်');
        const deviceId = document.getElementById('adminLimitDeviceId')?.value.trim();
        const limit = Number.parseInt(document.getElementById('adminLimitValue')?.value, 10);
        if (!deviceId) return toast('Device ID ထည့်ပါ');
        if (!Number.isInteger(limit) || limit < 1) return toast('Limit ကို 1 နှင့်အထက် ကိန်းပြည့်ထည့်ပါ');
        const { error } = await client.rpc('admin_set_device_limit', {
            p_device_id: deviceId,
            p_max_accounts: limit,
            p_request_id: null
        });
        if (error) {
            console.error('Manual device limit update failed:', error);
            return toast('Device limit ကို save မလုပ်နိုင်ပါ');
        }
        await renderAdminCloud();
        await refreshDeviceUsage().catch(() => {});
        toast(`Device limit ကို ${limit} သို့ သိမ်းပြီးပါပြီ`);
    }

    async function initializeAuth() {
        if (!client) {
            backendNotice('Supabase client ကိုမရနိုင်ပါ။ Network နဲ့ Supabase script ကိုစစ်ပါ။');
            return;
        }
        const { data: ready, error: readyError } = await client.rpc('auth_migration_ready');
        if (readyError || ready !== true) {
            backendNotice('Supabase Auth migration ကို မတင်ရသေးပါ။ supabase-auth-migration.sql ကို Dashboard > SQL Editor တွင်တစ်ကြိမ် run လုပ်ပါ။');
            const buttons = ['authSignInButton', 'authRegisterButton', 'authLimitButton'];
            buttons.forEach(id => { const button = document.getElementById(id); if (button) button.disabled = true; });
            return;
        }
        backendReady = true;
        const notice = document.getElementById('authBackendNotice');
        if (notice) notice.style.display = 'none';
        clearLegacyLocalCredentials();
        await refreshDeviceUsage().catch(error => console.warn('Could not load device usage:', error));
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError) console.error('Could not restore Supabase session:', sessionError);
        if (sessionData?.session?.user) {
            try { await hydrateUser(sessionData.session.user, true); }
            catch (error) {
                console.error('Could not restore user profile:', error);
                toast('Account profile ကို load မလုပ်နိုင်ပါ။ Migration/RLS setup ကိုစစ်ပါ။');
            }
        }
        client.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                currUser = null;
                users = [];
                deviceAccounts = [];
            }
        });
    }

    window.signInWithSupabase = signInWithSupabase;
    window.registerWithSupabase = registerWithSupabase;
    window.handleAuth = signInWithSupabase;
    window.requestAccountLimit = requestAccountLimitInCloud;
    window.requestAccountLimitInCloud = requestAccountLimitInCloud;
    window.signOut = signOutWithSupabase;
    window.signOutWithSupabase = signOutWithSupabase;
    window.persistProfileToSupabase = persistProfileToSupabase;
    window.updateUserStorage = persistProfileToSupabase;
    window.setAccountStatusInCloud = setAccountStatusInCloud;
    window.approveLimitRequestInCloud = approveLimitRequestInCloud;
    window.approveLimitRequest = approveLimitRequestInCloud;
    window.saveDeviceLimitToCloud = saveDeviceLimitToCloud;
    window.saveDeviceLimitManually = saveDeviceLimitToCloud;
    window.renderAdmin = renderAdminCloud;
    window.verifyAdmin = async function() {
        if (!currUser) {
            document.getElementById('adminAccessNote').textContent = 'Admin access အတွက် အရင် Sign In လုပ်ပါ။';
            window.openModal('loginModal');
            return;
        }
        if (currUser.role !== 'admin') {
            document.getElementById('adminAccessNote').textContent = 'ဤ account တွင် admin role မရှိပါ။ Project owner မှ Supabase SQL Editor ဖြင့် admin role ပေးရပါမည်။';
            return toast('Admin ခွင့်ပြုချက်မရှိပါ');
        }
        document.getElementById('admLoginBox').style.display = 'none';
        document.getElementById('admDashBox').style.display = 'block';
        await renderAdminCloud();
    };
    window.openAdminPage = function() {
        switchPage('adminPage');
        document.getElementById('admLoginBox').style.display = 'block';
        document.getElementById('admDashBox').style.display = 'none';
        if (currUser?.role === 'admin') window.verifyAdmin();
        else if (!currUser) window.openModal('loginModal');
    };
    window.openModal = function(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.style.display = 'flex';
        if (id === 'loginModal') refreshDeviceUsage().catch(() => {});
    };
    window.getDeviceLimits = () => Math.max(1, Number(deviceUsage.max_accounts) || 2);
    window.getDeviceAccountsFor = (deviceId = getDeviceID()) => deviceId === getDeviceID() ? deviceAccounts : [];
    window.persistAuthState = () => {};
    window.ensureAccountCreatedAt = () => {};
    window.openProfile = function() {
        if (!currUser || currUser.status !== 'Approved') return window.openModal('loginModal');
        if (typeof flashOriginalOpenProfile === 'function') flashOriginalOpenProfile();
        refreshDeviceUsage().catch(() => {});
    };
    window.openSettingsPage = function() {
        if (!currUser) return window.openModal('loginModal');
        switchPage('settingsPage');
        const name = document.getElementById('setAccountName');
        if (name) name.value = currUser.accountName || normalizeUsername(currUser.username);
        const follow = document.getElementById('setFollowView');
        if (follow) follow.checked = currUser.followView !== false;
        const follower = document.getElementById('setFollowerView');
        if (follower) follower.checked = currUser.followerView !== false;
        const date = document.getElementById('accCreatedDateDisplay');
        if (date) date.textContent = new Date(currUser.createdAt).toLocaleString();
    };
    window.saveProfileSettings = persistProfileToSupabase;

    if (typeof window.addEventListener === 'function') {
        window.addEventListener('DOMContentLoaded', initializeAuth, { once: true });
    }
})();
