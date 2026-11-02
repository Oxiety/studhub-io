// Хранилище с привязкой к аккаунту.
// Каждый пользователь хранит данные под своим префиксом: u_<id>_studhub_projects и т.д.,
// поэтому данные разных аккаунтов не смешиваются. Во всём коде вместо localStorage используем userStore.
// Общие для устройства ключи (список аккаунтов, сессия, тема/язык) не привязаны к пользователю.
const GLOBAL_KEYS = ['studhub_settings', 'studhub_accounts', 'studhub_session', 'studhub_loginfails', 'studhub_public_projects'];

function activeUserId() {
  try { return sessionStorage.getItem('studhub_session') || localStorage.getItem('studhub_session') || null; } catch (e) { return null; }
}
const userStore = {
  _key(k) {
    if (GLOBAL_KEYS.includes(k)) return k;
    const id = activeUserId();
    return id ? 'u_' + id + '_' + k : null;      // без входа в аккаунт данные никуда не пишутся
  },
  getItem(k) { const kk = this._key(k); return kk ? localStorage.getItem(kk) : null; },
  setItem(k, v) { const kk = this._key(k); if (kk) localStorage.setItem(kk, v); },
  removeItem(k) { const kk = this._key(k); if (kk) localStorage.removeItem(kk); },
  // имена всех ключей текущего пользователя (без префикса)
  keys() {
    const id = activeUserId(); if (!id) return [];
    const prefix = 'u_' + id + '_';
    return Object.keys(localStorage).filter(k => k.startsWith(prefix)).map(k => k.slice(prefix.length));
  },
};

function getAccounts() { try { return JSON.parse(localStorage.getItem('studhub_accounts') || '[]'); } catch (e) { return []; } }
function saveAccounts(list) { localStorage.setItem('studhub_accounts', JSON.stringify(list)); }
function getActiveAccount() { const id = activeUserId(); return id ? getAccounts().find(a => a.id === id) || null : null; }
