// Подключение к Supabase: аккаунты, проекты, поддержка, кошелёк.
// Если в js/config.js не заданы supabaseUrl и supabaseAnonKey, BACKEND = false и приложение работает
// в старом локальном режиме (localStorage), без обращений к серверу.
// Файл подключается перед main.js; общий для всех режимов код (fundraising.js, wallet.js, auth.js, projects.js)
// вызывает отсюда функции backend*() только при BACKEND === true.
const BACKEND = !!(window.STUDHUB_CONFIG && STUDHUB_CONFIG.supabaseUrl && STUDHUB_CONFIG.supabaseAnonKey);
let sb = null;                 // клиент Supabase
let PUB_CACHE = [];            // все проекты из базы (с уже подгруженными поддержками)
let MY_DONATIONS = [];         // мои поддержки
let WALLET_CACHE = { balance: 0, tx: [] };
document.body.classList.toggle('backend', BACKEND);

/* ---------- Ошибки ---------- */
const BACKEND_ERRORS = {
  insufficient_funds: 'Недостаточно средств на кошельке', bad_amount: 'Недопустимая сумма', own_project: 'Нельзя поддержать собственный проект',
  closed: 'Сбор по этому проекту завершён', no_project: 'Проект не найден (возможно, его удалили)', not_authenticated: 'Войдите в аккаунт заново',
  wallet_limit: 'Превышен лимит кошелька', bad_deadline: 'Срок сбора должен быть в будущем',
};
function backendErrorText(e) {
  const m = (e && (e.message || e.details)) || '';
  for (const k in BACKEND_ERRORS) if (m.includes(k)) return BACKEND_ERRORS[k];
  if (/Failed to fetch|NetworkError|offline/i.test(m)) return 'Нет соединения с сервером';
  if (/row-level security|permission denied/i.test(m)) return 'Нет прав на это действие';
  return 'Ошибка сервера. Попробуйте ещё раз';
}
function need() { if (!sb) throw new Error('offline'); return sb; }
async function ok(promise) { const { data, error } = await promise; if (error) throw error; return data; }

/* ---------- Локальные копии учётки (чтобы остальной код работал синхронно) ---------- */
function setLocalSession(user) {
  const name = (user.user_metadata && user.user_metadata.name) || user.email.split('@')[0];
  const username = (user.user_metadata && user.user_metadata.username) || (getCurrentUser().username) || user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 20) || 'student';
  try { sessionStorage.removeItem('studhub_session'); } catch (e) {}
  localStorage.setItem('studhub_session', user.id);
  localStorage.setItem('studhub_accounts', JSON.stringify([{ id: user.id, email: user.email, name, createdAt: Date.parse(user.created_at) || Date.now() }]));
  if (!userStore.getItem('currentUser')) {
    saveCurrentUser({ name, username, campus: 'kitis', subtitle: 'Студент · Калининград', bio: '', city: 'Калининград', interests: '' });
  }
}
function clearLocalSession() {
  try { sessionStorage.removeItem('studhub_session'); } catch (e) {}
  localStorage.removeItem('studhub_session'); localStorage.removeItem('studhub_accounts');
}

/* ---------- Загрузка данных ---------- */
async function refreshPublic() {
  const c = need(), uid = activeUserId();
  const [pr, pd, md] = await Promise.all([
    ok(c.from('projects').select('*').order('created_at', { ascending: false })),
    ok(c.from('public_donations').select('*').order('created_at', { ascending: true })),
    uid ? ok(c.from('donations').select('project_id,amount,reward,message,anon,created_at')) : Promise.resolve([]),
  ]);
  const byProject = {};
  pd.forEach(d => (byProject[d.project_id] = byProject[d.project_id] || []).push({ id: d.id, userId: null, name: d.donor_name, anon: d.anon, amount: d.amount, msg: d.message || '', reward: d.reward || '', ts: Date.parse(d.created_at) }));
  PUB_CACHE = pr.map(p => ({
    id: p.id, pub: true, ownerId: p.owner_id, owner: p.owner_name, name: p.name, desc: p.description, about: p.about || p.description,
    category: p.category, icon: p.icon, goal: p.goal, deadline: p.deadline ? Date.parse(p.deadline) : null, rewards: p.rewards || [],
    raised: p.base_raised, backers: p.base_backers, likes: p.base_likes, createdAt: Date.parse(p.created_at), donations: byProject[p.id] || [],
  }));
  MY_DONATIONS = md.map(d => ({ projectId: d.project_id, amount: d.amount, reward: d.reward || '', msg: d.message || '', anon: d.anon, ts: Date.parse(d.created_at) }));
  syncLocalProjects();
}
async function refreshWallet() {
  const c = need(), uid = activeUserId(); if (!uid) return;
  const [w, tx] = await Promise.all([
    ok(c.from('wallets').select('balance').eq('user_id', uid).maybeSingle()),
    ok(c.from('transactions').select('*').order('created_at', { ascending: false }).limit(100)),
  ]);
  WALLET_CACHE = { balance: w ? w.balance : 0, tx: tx.map(x => ({ id: 'tx' + x.id, ts: Date.parse(x.created_at), kind: x.kind, amount: x.amount, method: x.method, card: x.card, projectId: x.project_id, title: x.title })) };
}
async function pullNotifs() {
  const c = need(); if (!activeUserId()) return;
  const rows = await ok(c.from('notifications').select('*').order('created_at', { ascending: false }).limit(30));
  const list = getNotifs(), have = new Set(list.map(n => n.id));
  rows.reverse().forEach(r => {
    if (have.has('db' + r.id)) return;
    list.unshift({ id: 'db' + r.id, type: r.type, color: '#e8f5f2', fg: '#2d8a7a', letter: '₽', text: escapeHtml(r.text), ts: Date.parse(r.created_at), read: false });
  });
  lsSet('studhub_notifs', list.slice(0, 30));
  renderNotifs();
}
// «Мои проекты» хранятся локально (черновики, теги). Проекты из базы, которых тут нет (вход с другого устройства), добавляем;
// те, что удалены в базе, убираем.
function syncLocalProjects() {
  const uid = activeUserId(); if (!uid) return;
  const mine = PUB_CACHE.filter(p => p.ownerId === uid), local = getProjects();
  let changed = false, seq = 0;
  const kept = local.filter(p => !p.pubId || mine.some(m => m.id === p.pubId) || (changed = true, false));
  mine.forEach(m => {
    if (kept.some(p => p.pubId === m.id)) return;
    kept.push({ id: Date.now() + (seq++), name: m.name, desc: m.desc, status: 'active', tags: [], goal: m.goal, deadline: m.deadline, category: m.category, rewards: m.rewards, pubId: m.id, views: 0, likes: 0, comments: 0, team: 1, createdAt: new Date(m.createdAt).toISOString() });
    changed = true;
  });
  if (changed) saveProjects(kept);
}
async function loadAll() {
  try { await Promise.all([refreshPublic(), refreshWallet(), pullNotifs()]); }
  catch (e) { console.error(e); setTimeout(() => showToast(backendErrorText(e), 'error'), 500); }
}
let refreshing = false;
async function refreshLive() { // фоновое обновление: чужие поддержки и новые проекты появляются без перезагрузки
  if (!BACKEND || !sb || refreshing || document.visibilityState !== 'visible' || document.querySelector('.modal-overlay.show') || !activeUserId()) return;
  refreshing = true;
  try { await loadAll(); renderFundraisingProjects(); renderFundedProjects(); renderMyProjects(); renderWallet(); } finally { refreshing = false; }
}

/* ---------- Профили и публикации ---------- */
async function backendSavePublicProfile(user, avatarFile = null) {
  try {
    const uid = activeUserId();
    if (!uid) return { error: new Error('not_authenticated') };
    const fields = { name: String(user.name || 'Студент').slice(0, 40), username: String(user.username || '').toLowerCase(), subtitle: String(user.subtitle || '').slice(0, 120), bio: String(user.bio || '').slice(0, 1000), city: String(user.city || '').slice(0, 100), campus: String(user.campus || '').slice(0, 80), interests: String(user.interests || '').slice(0, 500) };
    if (avatarFile) {
      if (!avatarFile.type || !/^image\/(png|jpeg|webp|gif)$/.test(avatarFile.type)) return { error: new Error('Поддерживаются PNG, JPG, WEBP и GIF') };
      if (avatarFile.size > 2 * 1024 * 1024) return { error: new Error('Аватар должен быть не больше 2 МБ') };
      const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[avatarFile.type];
      const path = `${uid}/avatar.${ext}`;
      const { error: uploadError } = await need().storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: avatarFile.type, cacheControl: '3600' });
      if (uploadError) return { error: uploadError };
      const { data } = need().storage.from('avatars').getPublicUrl(path);
      fields.avatar_url = data.publicUrl + (data.publicUrl.includes('?') ? '&' : '?') + 'v=' + Date.now();
    }
    const { error } = await need().from('profiles').update(fields).eq('id', uid);
    if (error) return { error };
    return { ok: true, avatar_url: fields.avatar_url || user.avatar_url || null };
  } catch (error) { return { error }; }
}
async function backendSearchProfiles(query) {
  const q = String(query || '').trim().replace(/^@/, '');
  if (!q || q.length < 2 || !BACKEND || !sb) return [];
  try {
    const viaFn = await need().rpc('chat_find_profiles', { q, lim: 8 });   // функция из supabase/chat.sql, не зависит от прав на public_profiles
    if (!viaFn.error) return viaFn.data || [];
    const select = 'id,name,username,subtitle,bio,city,campus,interests,avatar_url,created_at';
    const [byUsername, byName] = await Promise.all([
      ok(need().from('public_profiles').select(select).ilike('username', `%${q}%`).limit(8)),
      ok(need().from('public_profiles').select(select).ilike('name', `%${q}%`).limit(8)),
    ]);
    const merged = new Map(); [...byUsername, ...byName].forEach(p => merged.set(p.id, p));
    return [...merged.values()].slice(0, 8);
  } catch (e) { console.warn('Не удалось найти профили', e); return []; }
}

/* ---------- Аккаунты ---------- */
async function backendInit() {
  if (!window.supabase) { console.error('supabase-js не загружен'); return; }
  const c = STUDHUB_CONFIG;
  sb = supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const { data } = await sb.auth.getSession();
  if (data.session) { setLocalSession(data.session.user); await syncProfileFromDatabase(data.session.user); await loadAll(); } else clearLocalSession();
  sb.auth.onAuthStateChange((ev, s) => {
    if (ev === 'PASSWORD_RECOVERY') setTimeout(recoverPassword, 400);
    if (ev === 'SIGNED_OUT' && activeUserId()) { clearLocalSession(); location.reload(); }
  });
  setInterval(refreshLive, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshLive(); });
}
async function syncProfileFromDatabase(user) {
  try {
    const profile = await ok(need().from('profiles').select('name, username, subtitle, bio, city, campus, interests, avatar_url').eq('id', user.id).single());
    const current = getCurrentUser();
    // Переносим старую локальную Data URL-аватарку в Storage один раз, если в БД её ещё нет.
    if (!profile.avatar_url && typeof current.avatar === 'string' && current.avatar.startsWith('data:image/')) {
      try {
        const blob = await (await fetch(current.avatar)).blob();
        const type = blob.type || 'image/png';
        const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' })[type];
        if (ext && blob.size <= 2 * 1024 * 1024) {
          const file = new File([blob], `avatar.${ext}`, { type });
          const path = `${user.id}/avatar.${ext}`;
          const { error: uploadError } = await need().storage.from('avatars').upload(path, file, { upsert: true, contentType: type, cacheControl: '3600' });
          if (!uploadError) {
            const { data } = need().storage.from('avatars').getPublicUrl(path);
            profile.avatar_url = data.publicUrl + '?v=' + Date.now();
            const { error: updateError } = await need().from('profiles').update({ avatar_url: profile.avatar_url }).eq('id', user.id);
            if (updateError) console.warn('Не удалось сохранить URL перенесённой аватарки', updateError);
          } else console.warn('Не удалось перенести старую аватарку в Storage', uploadError);
        }
      } catch (migrationError) { console.warn('Не удалось перенести локальную аватарку', migrationError); }
    }
    saveCurrentUser({ ...current, ...profile, name: profile.name || current.name, username: profile.username || current.username });
  } catch (e) { console.warn('Не удалось загрузить профиль из Supabase', e); }
}
async function backendUpdateUsername(username) {
  const normalized = String(username || '').trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_.]{3,20}$/.test(normalized)) return { error: 'auth.err.username' };
  try {
    const { error } = await need().from('profiles').update({ username: normalized }).eq('id', activeUserId());
    if (error) {
      if (error.code === '23505' || /duplicate|unique/i.test(error.message || '')) return { error: 'auth.err.usernameTaken' };
      return { error: 'auth.err.bad' };
    }
    const { error: metaError } = await need().auth.updateUser({ data: { username: normalized } });
    if (metaError) console.warn('Не удалось синхронизировать username в метаданных', metaError);
    return { ok: true, username: normalized };
  } catch (e) { return { error: 'auth.err.bad' }; }
}
async function backendRegister({ name, username, email, password }) {
  // Проверяем юзернейм до создания auth-пользователя, чтобы показать понятную ошибку.
  const normalizedUsername = String(username || '').trim().replace(/^@/, '').toLowerCase();
  const { data: usernameAvailable, error: usernameCheckError } = await need()
    .rpc('is_username_available', { candidate: normalizedUsername });
  if (usernameCheckError) {
    console.error('Не удалось проверить уникальность юзернейма:', usernameCheckError);
    return { error: 'auth.err.usernameCheckUnavailable' };
  }
  if (usernameAvailable !== true) return { error: 'auth.err.usernameTaken' };

  const { data, error } = await need().auth.signUp({ email, password, options: { data: { name, username: normalizedUsername } } });
  if (error) {
    if (/username|profiles_username|duplicate key|unique constraint/i.test(error.message || '')) return { error: 'auth.err.usernameTaken' };
    return { error: /registered|exists/i.test(error.message || '') ? 'auth.err.exists' : /rate|limit/i.test(error.message || '') ? 'auth.err.rate' : 'auth.err.bad' };
  }
  if (!data.session) return { error: 'auth.err.confirm' };   // в Supabase включено подтверждение почты
  setLocalSession(data.user);
  await syncProfileFromDatabase(data.user);
  return { ok: true, id: data.user.id };
}
async function backendLogin({ email, password }) {
  const { data, error } = await need().auth.signInWithPassword({ email, password });
  if (error) return { error: /confirm/i.test(error.message) ? 'auth.err.confirm2' : 'auth.err.bad' };
  setLocalSession(data.user);
  await syncProfileFromDatabase(data.user);
  return { ok: true, id: data.user.id };
}
async function backendLogout() {
  try { if (sb) await sb.auth.signOut(); } catch (e) {}
  clearLocalSession(); location.reload();
}
async function backendChangePassword(oldPw, newPw) {
  const acc = getActiveAccount(); if (!acc) return { error: 'auth.err.bad' };
  const { error } = await need().auth.signInWithPassword({ email: acc.email, password: oldPw });
  if (error) return { error: 'auth.err.wrongpw' };
  if (!passwordOk(newPw)) return { error: 'auth.err.pass' };
  const r = await need().auth.updateUser({ password: newPw });
  return r.error ? { error: 'auth.err.bad' } : { ok: true };
}
async function backendDeleteAccount(password) {
  const acc = getActiveAccount(); if (!acc) return { error: 'auth.err.bad' };
  const { error } = await need().auth.signInWithPassword({ email: acc.email, password });
  if (error) return { error: 'auth.err.wrongpw' };
  await ok(need().rpc('delete_my_account'));
  userStore.keys().forEach(k => userStore.removeItem(k));
  try { await sb.auth.signOut(); } catch (e) {}
  return { ok: true };
}
async function forgotPassword() {
  const email = (document.getElementById('authEmail').value.trim() || prompt('Email вашего аккаунта:') || '').toLowerCase();
  if (!emailOk(email)) { authError('auth.err.email'); return; }
  const { error } = await need().auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  authError('');
  alert(error ? 'Не удалось отправить письмо. Попробуйте позже.' : 'Если такой аккаунт есть, мы отправили на ' + email + ' письмо со ссылкой для смены пароля.');
}
async function recoverPassword() { // пользователь перешёл по ссылке из письма
  const pw = prompt('Введите новый пароль (минимум 8 символов, буквы и цифры):');
  if (!pw) return;
  if (!passwordOk(pw)) { alert('Пароль слишком простой: нужно минимум 8 символов, буквы и цифры.'); return recoverPassword(); }
  const { error } = await sb.auth.updateUser({ password: pw });
  showToast(error ? 'Не удалось сменить пароль' : 'Пароль изменён', error ? 'error' : 'success');
}

/* ---------- Проекты и деньги ---------- */
async function backendCreateProject(f) {
  const row = await ok(need().from('projects').insert({ name: f.name, description: f.desc, about: f.desc, category: f.category, icon: f.icon, goal: f.goal, deadline: new Date(f.deadline).toISOString(), rewards: f.rewards }).select().single());
  await refreshPublic();
  return row;
}
async function backendUpdateProject(id, f) {
  await ok(need().from('projects').update({ name: f.name, description: f.desc, about: f.desc, icon: f.icon }).eq('id', id));
  await refreshPublic();
}
async function backendDeleteProject(id) {
  const rows = await ok(need().from('projects').delete().eq('id', id).select('id'));
  if (!rows.length) throw new Error('Нельзя удалить проект, который уже поддержали');
  await refreshPublic();
}
async function backendSupport(proj, amount, anon, msg) {
  const r = await ok(need().rpc('support_project', { p_project: proj.id, p_amount: amount, p_anon: anon, p_msg: msg || null }));
  await Promise.all([refreshPublic(), refreshWallet()]);
  return r || {};
}
async function backendTopup(amount, method, last4) {
  await ok(need().rpc('demo_topup', { p_amount: amount, p_method: method, p_card: last4 ? '•••• ' + last4 : null }));
  await refreshWallet();
}
