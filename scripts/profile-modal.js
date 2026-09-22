(function () {
  const style = document.createElement('style');
  style.textContent = '.readonly-row>div{display:flex;gap:12px;align-items:center;justify-content:space-between}.readonly-row b{font-weight:600}.readonly-row .small{display:block;margin-top:4px}.edit-field{padding:7px 12px;font-size:12px;white-space:nowrap}.verification-notice{margin-top:18px;border:1px solid #d8eab3;border-left:5px solid #86ad25;border-radius:18px;padding:17px 18px;background:#f7fbea}.verification-notice.pending{border-color:#f1d18b;border-left-color:#d39518;background:#fff9eb}.verification-notice h3{margin:0 0 5px;font-size:16px}.verification-notice p{margin:0;color:var(--x);font-size:14px}.dark .verification-notice{background:#203d2e;border-color:#486d3a}.dark .verification-notice.pending{background:#42381e;border-color:#8a6c28}';
  document.head.appendChild(style);
  const administratorEmail = 'ogbogumichael03@gmail.com';
  const isAdministrator = () => auth?.email === administratorEmail;
  const row = (label, value, field, locked = false) => `<div class="setting-row readonly-row"><label>${label}</label><div><b>${safe(value || 'Not set')}</b>${locked ? '<span class="small">Only the administrator can change this.</span>' : `<button class="secondary edit-field" type="button" onclick="editProfileField('${field}')">Edit</button>`}</div></div>`;

  window.editProfileField = function (field) {
    const account = getAccounts()[auth.email] || {};
    const fields = { name: ['Full name', account.name || auth.name, 'text'], email: ['Login email', auth.email, 'email'], phone: ['Phone number', account.phone || '', 'tel'], location: ['Public location', profileLocation(account), 'text'], role: ['Account type', role, 'select'] };
    if (field === 'role' && !isAdministrator()) return note('Only the administrator can change account type.');
    const item = fields[field];
    const input = item[2] === 'select' ? `<select name="value"><option value="client" ${role === 'client' ? 'selected' : ''}>Client</option><option value="worker" ${role === 'worker' ? 'selected' : ''}>Worker</option><option value="dual" ${role === 'dual' ? 'selected' : ''}>Dual account</option></select>` : `<input name="value" type="${item[2]}" required value="${safe(item[1])}">`;
    $('#dialog').innerHTML = `<button class="secondary close" onclick="closeModal()">Close</button><div class="ey">EDIT PROFILE</div><h1 class="title">${item[0]}</h1><form class="form" onsubmit="saveProfileField(event,'${field}')"><label class="field">${item[0]}${input}</label><button>Save change</button></form>`;
    $('#modal').className = 'modal open';
  };

  window.saveProfileField = async function (event, field) {
    event.preventDefault();
    const value = String(new FormData(event.target).get('value') || '').trim();
    const account = getAccounts()[auth.email] || {};
    let error;
    if (field === 'phone') ({ error } = await sb.from('private_profiles').update({ phone_number: value }).eq('id', auth.id));
    else if (field === 'email') ({ error } = await sb.auth.updateUser({ email: value }));
    else {
      if (field === 'role' && !isAdministrator()) return note('Only the administrator can change account type.');
      const column = { name: 'full_name', location: 'public_area', role: 'account_type' }[field];
      ({ error } = await sb.from('profiles').update({ [column]: value, updated_at: new Date().toISOString() }).eq('id', auth.id));
    }
    if (error) return note(error.message);
    if (field === 'name') { account.name = value; auth.name = value; }
    if (field === 'phone') account.phone = value;
    if (field === 'location') account.location = value;
    if (field === 'role') { account.role = value; role = value; auth.role = value; }
    const accounts = getAccounts(); accounts[auth.email] = account; localStorage.erranusAccounts = JSON.stringify(accounts);
    closeModal(); render(); note(field === 'email' ? 'Check your new email address to confirm this change.' : 'Profile updated.');
  };

  window.profile = function () {
    const account = getAccounts()[auth.email] || { name: auth.name };
    const posted = tasks.filter(t => t.owner === 'client').length;
    const done = tasks.filter(t => t.status === 'Completed' && (t.owner === 'client' || t.worker === 'worker')).length;
    const verified = auth.emailVerified;
    const verificationNotice = `<section class="verification-notice ${verified ? '' : 'pending'}"><h3>${verified ? '✓ Email verified' : '⚠ Email verification required'}</h3><p>${verified ? 'Your email address is verified and your account is protected.' : 'You can use Erranus now. Email verification is shown here as a reminder while it remains pending.'}</p></section>`;
    return `<div class="account-profile"><div class="ey">YOUR PROFILE · ${role === 'dual' ? 'DUAL ACCOUNT' : role === 'client' ? 'CLIENT ACCOUNT' : 'WORKER ACCOUNT'}</div><section class="profile-sheet"><div class="account-cover"></div><div class="profile-head"><div class="profile-avatar-card" onclick="showProfilePhoto()">${accountPhoto(account)}</div><div><div class="profile-name-row"><h1>${safe(account.name || 'Erranus member')}</h1><span class="stars">${ratingStars(account.rating || 0)}</span></div><p class="private-email">@${safe(account.username || 'choose_username')} · ${safe(auth.email)} · Visible only to you</p><label class="profile-photo-button">Change photo<input type="file" accept="image/*" onchange="previewProfilePhoto(this)"></label></div></div><div class="profile-metrics"><div><b>${posted}</b><span class="small">Tasks posted</span></div><div><b>${done}</b><span class="small">Completed</span></div><div><b>${ratingStars(account.rating || 0)}</b><span class="small">Your rating</span></div></div></section>${verificationNotice}<section class="settings-section"><div class="settings-title"><div><div class="ey">PROFILE SETTINGS</div><h2>Your account</h2></div><span class="small">Select Edit to change an item</span></div>${row('Full name', account.name, 'name')}${row('Login email', auth.email, 'email')}${row('Phone number', account.phone, 'phone')}${row('Account type', role, 'role', !isAdministrator())}${row('Public location', profileLocation(account), 'location')}</section></div>`;
  };
})();
