// Аккаунты: регистрация, вход, выход, смена пароля, удаление аккаунта.
// ВАЖНО: это клиентская демо-реализация. Аккаунты лежат в localStorage этого браузера, поэтому:
//  - вход работает только на этом устройстве/в этом браузере;
//  - пароль хранится как PBKDF2-хэш с солью (не открытым текстом), но защитить от человека
//    с доступом к браузеру (DevTools) это не может;
//  - восстановления пароля по почте нет — для него нужен сервер.
// Для настоящей авторизации нужен backend (API, БД, токены/сессии, отправка писем). Функции ниже
// (hashPassword, registerAccount, loginAccount...) — те места, которые потом заменяются запросами к API.

const PBKDF2_ITER = 200000;
const MAX_FAILS = 5, LOCK_SECONDS = 30;

/* ---------- Криптография ---------- */
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
async function hashPassword(password, saltB64, iter) {
  if (!(window.crypto && crypto.subtle)) throw new Error('nocrypto');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations: iter }, key, 256);
  return b64(bits);
}
const newSalt = () => b64(crypto.getRandomValues(new Uint8Array(16)));
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).replace(/-/g, '').slice(0, 16);

/* ---------- Проверки ---------- */
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 100;
const passwordOk = p => p.length >= 8 && p.length <= 100 && /[A-Za-zА-Яа-яЁё]/.test(p) && /\d/.test(p);
const usernameOk = u => /^[a-z0-9_.]{3,20}$/.test(u);
function normalizeUsername(value) { return String(value || '').trim().replace(/^@/, '').toLowerCase(); }
function passwordStrength(p) {
  let sc = 0;
  if (p.length >= 8) sc++; if (p.length >= 12) sc++;
  if (/[a-zа-я]/.test(p) && /[A-ZА-Я]/.test(p)) sc++;
  if (/\d/.test(p)) sc++; if (/[^\w\s]/.test(p)) sc++;
  return Math.min(3, Math.floor(sc * 3 / 5 + (sc > 0 ? 0.4 : 0)));   // 0..3
}

/* ---------- Защита от перебора (только на стороне клиента, для вида) ---------- */
function lockLeft() {
  const f = lsGet('studhub_loginfails', { n: 0, until: 0 });
  return Math.max(0, Math.ceil((f.until - Date.now()) / 1000));
}
function registerFail() {
  const f = lsGet('studhub_loginfails', { n: 0, until: 0 });
  f.n++; if (f.n >= MAX_FAILS) { f.until = Date.now() + LOCK_SECONDS * 1000; f.n = 0; }
  lsSet('studhub_loginfails', f);
}

/* ---------- Сессия ---------- */
function startSession(id, remember) {
  if (BACKEND) { location.reload(); return; }   // сессию уже создал Supabase (см. backend.js)
  try { sessionStorage.removeItem('studhub_session'); localStorage.removeItem('studhub_session'); } catch (e) {}
  (remember ? localStorage : sessionStorage).setItem('studhub_session', id);
  location.reload();   // перезагрузка: приложение стартует уже с данными этого аккаунта
}
function logout() {
  if (BACKEND) { backendLogout(); return; }
  try { sessionStorage.removeItem('studhub_session'); localStorage.removeItem('studhub_session'); } catch (e) {}
  location.reload();
}

/* ---------- Регистрация / вход ---------- */
// Данные, созданные до появления аккаунтов, переходят к самому первому зарегистрированному аккаунту
function legacyKeys() {
  return Object.keys(localStorage).filter(k => (k.startsWith('studhub_') && !GLOBAL_KEYS.includes(k)) || k === 'currentUser');
}
function migrateLegacyData(id) {
  legacyKeys().forEach(k => { localStorage.setItem('u_' + id + '_' + k, localStorage.getItem(k)); localStorage.removeItem(k); });
}

async function registerAccount({ name, username, email, password, password2, agree }) {
  username = normalizeUsername(username);
  if (!usernameOk(username)) return { error: 'auth.err.username' };
  if (BACKEND) { // те же проверки, регистрация — в Supabase
    name = name.trim().replace(/\s+/g, ' '); email = email.trim().toLowerCase();
    if (name.length < 2 || name.length > 40) return { error: 'auth.err.name' };
    if (!emailOk(email)) return { error: 'auth.err.email' };
    if (!passwordOk(password)) return { error: 'auth.err.pass' };
    if (password !== password2) return { error: 'auth.err.mismatch' };
    if (!agree) return { error: 'auth.err.agree' };
    return backendRegister({ name, username, email, password });
  }
  name = name.trim().replace(/\s+/g, ' '); email = email.trim().toLowerCase();
  if (name.length < 2 || name.length > 40) return { error: 'auth.err.name' };
  if (!emailOk(email)) return { error: 'auth.err.email' };
  if (!passwordOk(password)) return { error: 'auth.err.pass' };
  if (password !== password2) return { error: 'auth.err.mismatch' };
  if (!agree) return { error: 'auth.err.agree' };
  const accounts = getAccounts();
  if (accounts.some(a => a.email === email)) return { error: 'auth.err.exists' };
  const salt = newSalt(), hash = await hashPassword(password, salt, PBKDF2_ITER);
  const acc = { id: newId(), email, name, salt, hash, iter: PBKDF2_ITER, createdAt: Date.now() };
  const first = accounts.length === 0;
  accounts.push(acc); saveAccounts(accounts);
  const legacyProfile = first ? (() => { try { return JSON.parse(localStorage.getItem('currentUser')); } catch (e) { return null; } })() : null;
  if (first) migrateLegacyData(acc.id);
  // профиль нового пользователя (в старом профиле из демо-версии меняем только имя)
  const profile = legacyProfile ? { ...legacyProfile, name, username } : {
    name, username, campus: 'kitis',
    subtitle: 'Студент · Калининград', bio: '', city: 'Калининград', interests: '',
  };
  localStorage.setItem('u_' + acc.id + '_currentUser', JSON.stringify(profile));
  return { ok: true, id: acc.id };
}

async function loginAccount({ email, password }) {
  if (BACKEND) return backendLogin({ email: email.trim().toLowerCase(), password });
  const wait = lockLeft(); if (wait) return { error: 'auth.err.lock', wait };
  email = email.trim().toLowerCase();
  const acc = getAccounts().find(a => a.email === email);
  // Если аккаунта нет — всё равно считаем хэш, чтобы по времени ответа нельзя было понять, есть ли такой email
  const hash = await hashPassword(password, acc ? acc.salt : newSalt(), acc ? acc.iter : PBKDF2_ITER);
  if (!acc || hash !== acc.hash) { registerFail(); return { error: 'auth.err.bad' }; }
  localStorage.removeItem('studhub_loginfails');
  return { ok: true, id: acc.id };
}

async function changePassword(oldPw, newPw) {
  if (BACKEND) return backendChangePassword(oldPw, newPw);
  const accounts = getAccounts(), acc = accounts.find(a => a.id === activeUserId());
  if (!acc) return { error: 'auth.err.bad' };
  if ((await hashPassword(oldPw, acc.salt, acc.iter)) !== acc.hash) return { error: 'auth.err.wrongpw' };
  if (!passwordOk(newPw)) return { error: 'auth.err.pass' };
  acc.salt = newSalt(); acc.iter = PBKDF2_ITER; acc.hash = await hashPassword(newPw, acc.salt, acc.iter);
  saveAccounts(accounts);
  return { ok: true };
}

async function deleteAccount(password) {
  if (BACKEND) return backendDeleteAccount(password);
  const accounts = getAccounts(), acc = accounts.find(a => a.id === activeUserId());
  if (!acc) return { error: 'auth.err.bad' };
  if ((await hashPassword(password, acc.salt, acc.iter)) !== acc.hash) return { error: 'auth.err.wrongpw' };
  userStore.keys().forEach(k => userStore.removeItem(k));
  saveAccounts(accounts.filter(a => a.id !== acc.id));
  return { ok: true };
}

/* ---------- Интерфейс окна входа ---------- */
let authMode = 'login';
const $ = id => document.getElementById(id);
function authError(key, wait) {
  $('authError').textContent = key ? t(key).replace('{n}', wait || '') : '';
}
function showAuthScreen(mode) {
  document.body.classList.add('auth-required');
  $('authScreen').style.display = 'flex';
  setAuthMode(mode || 'login');
}
function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll('#authTabs button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  document.querySelectorAll('.auth-only-register').forEach(el => el.style.display = mode === 'register' ? '' : 'none');
  document.querySelectorAll('.auth-only-login').forEach(el => el.style.display = mode === 'login' ? '' : 'none');
  $('authSubmit').textContent = t(mode === 'login' ? 'auth.submit.login' : 'auth.submit.register');
  $('authPassword').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  $('authMigrate').style.display = (!BACKEND && mode === 'register' && getAccounts().length === 0 && legacyKeys().length) ? '' : 'none';
  authError('');
  updateStrength();
}
function updateStrength() {
  const v = $('authPassword').value, s = v ? passwordStrength(v) : -1;
  $('strengthBar').dataset.level = s;
  $('strengthText').textContent = s < 0 ? '' : t(['auth.weak', 'auth.weak', 'auth.medium', 'auth.strong'][s]);
}
function togglePw(btn) {
  const inp = btn.parentElement.querySelector('input');
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}
async function submitAuth(e) {
  e.preventDefault();
  const btn = $('authSubmit'); btn.disabled = true; authError('');
  try {
    const data = { name: $('authName').value, username: $('authUsername').value, email: $('authEmail').value, password: $('authPassword').value, password2: $('authPassword2').value, agree: $('authAgree').checked };
    const res = authMode === 'login' ? await loginAccount(data) : await registerAccount(data);
    if (res.error) { authError(res.error, res.wait); return; }
    startSession(res.id, authMode === 'register' ? true : $('authRemember').checked);
  } catch (err) {
    authError(err.message === 'nocrypto' ? 'auth.err.crypto' : err.message === 'offline' ? 'auth.err.offline' : 'auth.err.bad');
  } finally { btn.disabled = false; }
}

/* ---------- Аккаунт в настройках ---------- */
function renderAccountSettings() {
  const acc = getActiveAccount(); if (!acc) return;
  $('accEmail').textContent = acc.email;
  $('accSince').textContent = new Date(acc.createdAt).toLocaleDateString(currentLang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  const de = $('dropdownEmail'); if (de) de.textContent = acc.email;
}
function openChangePassword() { ['cpOld', 'cpNew', 'cpNew2'].forEach(i => $(i).value = ''); $('cpError').textContent = ''; openModal('changePwModal'); }
async function submitChangePassword() {
  const o = $('cpOld').value, n = $('cpNew').value;
  if (n !== $('cpNew2').value) { $('cpError').textContent = t('auth.err.mismatch'); return; }
  try {
    const res = await changePassword(o, n);
    if (res.error) { $('cpError').textContent = t(res.error); return; }
    closeModal('changePwModal'); showToast(t('auth.pwchanged'), 'success');
  } catch (e) { $('cpError').textContent = t('auth.err.crypto'); }
}
function openDeleteAccount() { $('daPassword').value = ''; $('daError').textContent = ''; openModal('deleteAccModal'); }
async function submitDeleteAccount() {
  try {
    const res = await deleteAccount($('daPassword').value);
    if (res.error) { $('daError').textContent = t(res.error); return; }
    logout();
  } catch (e) { $('daError').textContent = t('auth.err.crypto'); }
}
