// Flâsh Movie Logo ကို နှိပ်ပါက Password တောင်းပြီး Admin Panel ဖွင့်ပေးမည့် စနစ်
function promptAdminPassword() {
    const pass = prompt("👑 Admin Panel သို့ဝင်ရောက်ရန် Password ထည့်ပါ:");
    if (pass === null) return;

    if (pass === "admin123" || pass === "flashadmin") {
        showToast("✅ Admin Panel သို့ ဝင်ရောက်ပြီးပါပြီ", "success");
        if (typeof switchMainPage === 'function') {
            switchMainPage('admin');
        }
    } else {
        showToast("❌ Admin Password မှားယွင်းနေပါသည်။", "error");
    }
}

async function loadAdminPanel() {
    const container = document.getElementById('adminUserList');
    if(!container) return;

    const { data: users, error } = await supabaseClient.from('flash_users').select('*');
    if(error || !users) {
        container.innerHTML = '<p style="color:#ff0033;">User စာရင်း ယူ၍မရပါ။</p>';
        return;
    }

    container.innerHTML = '';
    users.forEach((u, idx) => {
        const div = document.createElement('div');
        div.style.cssText = 'background:#181820; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #333; display:flex; justify-content:space-between; align-items:center;';
        
        div.innerHTML = `
            <div>
                <div style="font-weight:bold; color:#00ffff; font-size:0.85rem;">${escapeHtml(u.display_name || u.username)} (@${u.username})</div>
                <div style="font-size:0.75rem; color:#aaa; margin-top:3px; display:flex; align-items:center; gap:6px;">
                    <span>Password:</span>
                    <span id="pass-mask-${idx}" style="font-weight:bold; letter-spacing:2px; color:#ff0033;">••••••••</span>
                    <span id="pass-text-${idx}" class="hidden" style="color:#00ffff; font-weight:bold;">${escapeHtml(u.password)}</span>
                    <button onclick="togglePasswordVisibility(${idx})" style="background:none; border:none; color:#00ffff; cursor:pointer; font-size:0.8rem;">👁️</button>
                </div>
            </div>
            <button onclick="deleteUserByAdmin('${u.username}')" style="background:#ff0033; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer; font-weight:bold;">🗑 Delete</button>
        `;
        container.appendChild(div);
    });
}

function togglePasswordVisibility(idx) {
    const mask = document.getElementById(`pass-mask-${idx}`);
    const text = document.getElementById(`pass-text-${idx}`);
    if(mask && text) {
        mask.classList.toggle('hidden');
        text.classList.toggle('hidden');
    }
}

async function deleteUserByAdmin(username) {
    if(!confirm(`@${username} အကောင့်ကို ဖျက်မှာ သေချာပါသလား?`)) return;
    const { error } = await supabaseClient.from('flash_users').delete().eq('username', username);
    if(!error) {
        showToast('✅ User ဖျက်ပြီးပါပြီ။', 'success');
        loadAdminPanel();
    } else {
        showToast('❌ ဖျက်၍မရပါ: ' + error.message, 'error');
    }
}
