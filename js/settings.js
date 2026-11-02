// Настройки: тема, акцентный цвет, язык, уведомления, платежи, данные.
const ACCENTS = ['#2d8a7a', '#3b82f6', '#8b5cf6', '#e8590c', '#d6336c'];
const DEFAULT_SETTINGS = {
  theme: 'light', accent: '#2d8a7a', lang: 'ru', anonDefault: false, confirmPay: true,
  notif: { badge: true, toast: true, replies: true, donations: true, community: true, invites: true, digest: false },
};
function getSettings() {
  const s = lsGet('studhub_settings', {});
  return { ...DEFAULT_SETTINGS, ...s, notif: { ...DEFAULT_SETTINGS.notif, ...(s.notif || {}) } };
}
function saveSettings(s) { lsSet('studhub_settings', s); }

function resolveTheme(theme) { return theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme; }
function applyTheme() {
  const s = getSettings();
  document.documentElement.setAttribute('data-theme', resolveTheme(s.theme));
  document.documentElement.style.setProperty('--accent', s.accent);
}
if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (getSettings().theme === 'system') applyTheme(); });

function setTheme(v) { const s = getSettings(); s.theme = v; saveSettings(s); applyTheme(); renderSettings(); }
function setAccent(c) { const s = getSettings(); s.accent = c; saveSettings(s); applyTheme(); renderSettings(); }
function setLang(l) { const s = getSettings(); s.lang = l; saveSettings(s); currentLang = l; applyI18n(); renderSettings(); renderWallet(); renderNotifs(); renderAccountSettings(); if (document.body.classList.contains('auth-required')) setAuthMode(authMode); showToast(t('set.saved'), 'success'); }
function setNotif(key, on) { const s = getSettings(); s.notif[key] = on; saveSettings(s); renderNotifs(); showToast(t('set.saved'), 'success'); }
function setPref(key, on) { const s = getSettings(); s[key] = on; saveSettings(s); showToast(t('set.saved'), 'success'); }

function toggleRow(label, desc, checked, handler) {
  return `<div class="setting-row"><div><div class="setting-label">${t(label)}</div>${desc ? `<div class="setting-desc">${t(desc)}</div>` : ''}</div><label class="switch"><input type="checkbox" ${checked ? 'checked' : ''} onchange="${handler}"><span class="slider"></span></label></div>`;
}
function renderSettings() {
  const s = getSettings();
  document.querySelectorAll('#themeSeg button').forEach(b => b.classList.toggle('active', b.dataset.themeVal === s.theme));
  document.getElementById('accentSwatches').innerHTML = ACCENTS.map(c => `<button class="swatch ${c === s.accent ? 'active' : ''}" style="background:${c}" onclick="setAccent('${c}')" aria-label="${c}"></button>`).join('');
  document.getElementById('langSelect').value = s.lang;
  document.querySelectorAll('.auth-lang select').forEach(el => el.value = s.lang);
  const n = s.notif;
  document.getElementById('notifSettings').innerHTML =
    toggleRow('set.n.badge', 'set.n.badge.d', n.badge, "setNotif('badge',this.checked)") +
    toggleRow('set.n.toast', 'set.n.toast.d', n.toast, "setNotif('toast',this.checked)") +
    toggleRow('set.n.replies', '', n.replies, "setNotif('replies',this.checked)") +
    toggleRow('set.n.donations', '', n.donations, "setNotif('donations',this.checked)") +
    toggleRow('set.n.community', '', n.community, "setNotif('community',this.checked)") +
    toggleRow('set.n.invites', '', n.invites, "setNotif('invites',this.checked)") +
    toggleRow('set.n.digest', 'set.n.digest.d', n.digest, "setNotif('digest',this.checked)");
  document.getElementById('paySettings').innerHTML =
    toggleRow('set.anon', 'set.anon.d', s.anonDefault, "setPref('anonDefault',this.checked)") +
    toggleRow('set.confirmpay', 'set.confirmpay.d', s.confirmPay, "setPref('confirmPay',this.checked)");
}

function exportData() {
  const data = {};
  userStore.keys().forEach(k => { try { data[k] = JSON.parse(userStore.getItem(k)); } catch (e) { data[k] = userStore.getItem(k); } });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'studhub-data.json'; a.click(); URL.revokeObjectURL(a.href);
}
function resetSettings() { userStore.removeItem('studhub_settings'); currentLang = 'ru'; applyTheme(); applyI18n(); renderSettings(); renderNotifs(); showToast(t('set.reset.done'), 'success'); }
function wipeAllData() {
  if (!confirm(t('set.wipe.confirm'))) return;
  userStore.keys().forEach(k => userStore.removeItem(k));   // удаляем данные только текущего аккаунта
  location.reload();
}

// Вызывается при запуске (main.js)
function initSettings() { currentLang = getSettings().lang; applyTheme(); applyI18n(); renderSettings(); }
