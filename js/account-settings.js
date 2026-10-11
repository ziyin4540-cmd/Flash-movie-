// Profile Photo, Cover Photo & Display Name Settings Logic
function triggerProfilePicker() { document.getElementById('hiddenProfilePicker')?.click(); }
function triggerBannerPicker() { document.getElementById('hiddenBannerPicker')?.click(); }

function setupPhotoPickers() {
    const profilePicker = document.getElementById('hiddenProfilePicker');
    const bannerPicker = document.getElementById('hiddenBannerPicker');

    if (profilePicker) {
        profilePicker.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                compressImageFile(file, async (base64) => {
                    const user = localStorage.getItem('flash_logged_user');
                    await supabaseClient.from('flash_users').update({ photo_url: base64 }).eq('username', user);
                    showToast('✅ Profile ပုံ ပြောင်းလဲပြီးပါပြီ', 'success');
                    loadUserProfile(user);
                });
            }
        };
    }

    if (bannerPicker) {
        bannerPicker.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                compressImageFile(file, async (base64) => {
                    const user = localStorage.getItem('flash_logged_user');
                    await supabaseClient.from('flash_users').update({ banner_url: base64 }).eq('username', user);
                    showToast('✅ Banner ပုံ ပြောင်းလဲပြီးပါပြီ', 'success');
                    loadUserProfile(user);
                });
            }
        };
    }
}

async function openAccountSettingsModal() {
    const currentUser = localStorage.getItem('flash_logged_user');
    const { data: user } = await supabaseClient.from('flash_users').select('*').eq('username', currentUser).single();
    if (!user) return;

    let modal = document.getElementById('accountSettingsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'accountSettingsModal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:999999; display:flex; justify-content:center; align-items:center;';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background:#111116; border:1px solid #00ffff; width:85%; max-width:340px; padding:15px; border-radius:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h4 style="color:#00ffff; margin:0;">⚙️ Account Settings</h4>
                <button onclick="document.getElementById('accountSettingsModal').remove()" style="background:none; border:none; color:#ff0033; font-weight:bold; cursor:pointer;">✕</button>
            </div>
            <label style="font-size:0.75rem; color:#aaa;">Display Name:</label>
            <input type="text" id="editDisplayName" value="${escapeHtml(user.display_name || '')}" style="width:100%; padding:8px; background:#181820; border:1px solid #333; color:#fff; border-radius:6px; box-sizing:border-box; margin-bottom:10px;">
            
            <label style="font-size:0.75rem; color:#aaa;">Password အသစ် (မပြောင်းပါက ချန်ထားပါ):</label>
            <input type="password" id="editPassword" placeholder="Password အသစ်" style="width:100%; padding:8px; background:#181820; border:1px solid #333; color:#fff; border-radius:6px; box-sizing:border-box; margin-bottom:15px;">

            <button onclick="saveAccountSettings()" style="width:100%; background:#00ffff; color:#000; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer;">သိမ်းဆည်းမည်</button>
        </div>
    `;
}

async function saveAccountSettings() {
    const currentUser = localStorage.getItem('flash_logged_user');
    const newName = document.getElementById('editDisplayName')?.value.trim();
    const newPass = document.getElementById('editPassword')?.value.trim();

    let updates = { display_name: newName };
    if (newPass) updates.password = newPass;

    await supabaseClient.from('flash_users').update(updates).eq('username', currentUser);
    showToast('✅ ပြောင်းလဲပြီးပါပြီ', 'success');
    document.getElementById('accountSettingsModal')?.remove();
    loadUserProfile(currentUser);
}
