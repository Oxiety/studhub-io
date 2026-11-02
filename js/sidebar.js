// Правая колонка: «Под рукой» (расписание, материалы, команда, помощь) и «Свои на связи» (чат).
// Данные хранятся в userStore — отдельно для каждого аккаунта на этом устройстве.
const SB_FAQ = [
  ['Как создать проект?', 'Откройте «Мои проекты» и нажмите «Создать проект»: укажите название, цель сбора, срок и при желании награды за поддержку. Публикуются только проекты со статусом «Активный».'],
  ['Как поддержать проект деньгами?', 'Откройте карточку проекта, нажмите «Поддержать» и выберите сумму или награду. Деньги списываются с баланса кошелька — пополнить его можно в разделе «Кошелёк».'],
  ['Где найти проекты, которые я поддержал?', 'В левом меню — раздел «Финансируемые проекты».'],
  ['Как начать обсуждение или найти команду?', 'Раздел «Обсуждения» → «Новое обсуждение». Для поиска людей в проект выберите категорию «Ищу команду».'],
  ['Как изменить профиль, тему или язык?', 'Профиль меняется кнопкой «Редактировать профиль», а тема, язык и уведомления — в «Настройках».']
];
const SB_ESC = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Под рукой ---------- */
function quickLink(kind) {
  if (kind === 'schedule') openSchedule();
  else if (kind === 'library') switchView('assets');
  else if (kind === 'career') {
    switchView('discussions');
    discCat = 'Ищу команду'; discQ = ''; discMine = false;
    const q = document.getElementById('discSearch'); if (q) q.value = '';
    document.querySelectorAll('#view-discussions [data-mine]').forEach(b => b.classList.remove('active'));
    renderDiscFilters(); renderDiscussions();
  }
  else if (kind === 'help') openHelp();
}
function sbKey(e, kind) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); quickLink(kind); } }

/* Расписание и зачёты */
function getSchedule() { return lsGet('studhub_schedule', []); }
function openSchedule() {
  const d = document.getElementById('schDate'); if (d && !d.value) d.value = new Date().toISOString().slice(0, 10);
  renderSchedule(); openModal('scheduleModal');
}
function renderSchedule() {
  const box = document.getElementById('schList'); if (!box) return;
  const today = new Date().toISOString().slice(0, 10);
  const items = getSchedule().sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  if (!items.length) { box.innerHTML = '<div class="sb-empty">Пока пусто. Добавьте пару, зачёт или дедлайн — они появятся здесь.</div>'; return; }
  box.innerHTML = items.map(it => {
    const dt = new Date(it.date + 'T00:00:00');
    const past = it.date < today;
    return `<div class="sb-sch-item${past ? ' past' : ''}"><div class="event-date"><div class="day">${String(dt.getDate()).padStart(2, '0')}</div><div class="month">${dt.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '')}</div></div><div class="event-info" style="flex:1;min-width:0"><div class="event-title">${SB_ESC(it.title)}</div><div class="event-meta">${it.type === 'exam' ? 'Зачёт / экзамен' : 'Пара'}${it.time ? ' · ' + SB_ESC(it.time) : ''}${past ? ' · прошло' : ''}</div></div><button class="sb-x" title="Удалить" onclick="removeScheduleItem('${it.id}')">✕</button></div>`;
  }).join('');
}
function addScheduleItem() {
  const title = document.getElementById('schTitle').value.trim();
  const date = document.getElementById('schDate').value;
  if (!title) { showToast('Введите название', 'error'); return; }
  if (!date) { showToast('Выберите дату', 'error'); return; }
  const list = getSchedule();
  list.push({ id: 's' + Date.now().toString(36), title: title.slice(0, 80), date, time: document.getElementById('schTime').value, type: document.getElementById('schType').value });
  lsSet('studhub_schedule', list);
  document.getElementById('schTitle').value = '';
  renderSchedule(); showToast('Добавлено в расписание');
}
function removeScheduleItem(id) { lsSet('studhub_schedule', getSchedule().filter(x => x.id !== id)); renderSchedule(); }

/* Помощь */
function openHelp() {
  const box = document.getElementById('helpFaq');
  if (box && !box.dataset.ready) {
    box.innerHTML = SB_FAQ.map(([q, a]) => `<details class="sb-faq"><summary>${SB_ESC(q)}</summary><p>${SB_ESC(a)}</p></details>`).join('');
    box.dataset.ready = '1';
  }
  openModal('helpModal');
}

/* ---------- Свои на связи: чат ---------- */
// Локальный режим: собеседники из списка SB_MEMBERS, переписка хранится в браузере.
// Режим Supabase (BACKEND): настоящие личные сообщения между аккаунтами (таблица messages, см. supabase/chat.sql).
const SB_MEMBERS = [];
const SB_COLORS = [['#f0e8f8', '#8b6ab5'], ['#e8f0f8', '#4a8ab5'], ['#f5f0e8', '#b59a4a'], ['var(--accent-soft)', 'var(--accent)']];
let sbPeers = [], sbThreads = {}, sbChatWith = null, sbPoll = null, sbSearchT = null, sbSetupHint = false;
function sbOnlineMode() { return typeof BACKEND !== 'undefined' && BACKEND && typeof sb !== 'undefined' && sb; }
const sbIni = n => (String(n || '?').trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)) || '?';
function sbPeerFrom(id, name, role, profile) { const c = SB_COLORS[(String(id).charCodeAt(0) || 0) % SB_COLORS.length]; return { id, name: name || 'Студент', role: role || 'Студент', ini: sbIni(name), bg: c[0], fg: c[1], profile: profile || null }; }
function sbPeerFromRow(r) { return sbPeerFrom(r.id, r.name, r.subtitle || (r.username ? '@' + r.username : 'Студент'), r); }
function sbAddPeer(p) { const i = sbPeers.findIndex(x => x.id === p.id); if (i < 0) sbPeers.push(p); else if (p.profile) sbPeers[i] = p; }

// Загрузка переписок: из базы или из браузера
async function sbLoad() {
  if (sbIsBackend() && !sbOnlineMode()) { sbPeers = []; sbThreads = {}; return false; }   // база ещё не готова — демо-людей не показываем
  if (!sbOnlineMode()) {
    sbPeers = SB_MEMBERS.slice(); const chats = lsGet('studhub_chats', {});
    sbThreads = {}; SB_MEMBERS.forEach(m => sbThreads[m.id] = (chats[m.id] || []).map(x => ({ mine: true, text: x.text, ts: x.ts })));
    return true;
  }
  const me = activeUserId();
  const { data, error } = await sb.from('messages').select('sender_id,recipient_id,body,created_at').or(`sender_id.eq.${me},recipient_id.eq.${me}`).order('created_at', { ascending: true }).limit(1000);
  if (error) { sbSetupHint = /relation|does not exist|schema cache|permission/i.test(error.message || ''); return false; }
  sbSetupHint = false;
  const threads = {}, order = [];
  (data || []).forEach(m => {
    const other = m.sender_id === me ? m.recipient_id : m.sender_id;
    if (!threads[other]) threads[other] = [];
    threads[other].push({ mine: m.sender_id === me, text: m.body, ts: Date.parse(m.created_at) });
  });
  Object.keys(threads).forEach(id => order.push(id));
  order.sort((a, b) => threads[b][threads[b].length - 1].ts - threads[a][threads[a].length - 1].ts);
  const known = new Map(sbPeers.map(p => [p.id, p]));
  const missing = order.filter(id => !known.has(id) || !known.get(id).profile);
  if (missing.length) {
    let rows = null;
    const viaFn = await sb.rpc('chat_get_profiles', { ids: missing });          // функция из supabase/chat.sql
    if (!viaFn.error) rows = viaFn.data;
    else { const v = await sb.from('public_profiles').select('id,name,username,subtitle,bio,city,campus,interests,avatar_url,created_at').in('id', missing); rows = v.data; }
    (rows || []).forEach(r => known.set(r.id, sbPeerFromRow(r)));
  }
  const keep = sbPeers.filter(p => !threads[p.id]);            // найденные через поиск, но без переписки
  sbPeers = [...order.map(id => known.get(id) || sbPeerFrom(id, 'Студент')), ...keep];
  sbThreads = threads;
  return true;
}

// Блок «Свои на связи» в правой колонке
function sbIsBackend() { return typeof BACKEND !== 'undefined' && !!BACKEND; }
function sbMemberHtml(p, sub, click, dot) {
  return `<div class="online-member is-link" role="button" tabindex="0" onclick="${click}" onkeydown="if(event.key==='Enter'){${click}}"><div class="online-member-avatar" style="background:${p.bg};color:${p.fg};">${SB_ESC(p.ini)}${dot ? '<span class="online-dot-sm"></span>' : ''}</div><div style="flex:1;min-width:0"><div class="online-member-name">${SB_ESC(p.name)}</div><div class="online-member-role sb-clip" style="max-width:none">${SB_ESC(sub)}</div></div></div>`;
}
async function sbRefreshBlock() {
  const box = document.getElementById('sbOnline'); if (!box || !activeUserId()) return;
  if (!sbIsBackend()) {                       // режим без Supabase: только вы
    const me = getCurrentUser(), mp = sbPeerFrom('me', me.name, me.subtitle || ('Студент · ' + (eduShort(me.campus, me.city) || 'StudHub')));
    box.innerHTML = sbMemberHtml(mp, mp.role, `switchView('profile')`, true) + SB_MEMBERS.map(m => sbMemberHtml(m, m.role, `openChat('${m.id}')`, true)).join('') + (SB_MEMBERS.length ? '' : '<div class="sb-empty" style="padding:12px 4px">Пока здесь никого нет. Пригласите друзей на StudHub.</div>');
    return;
  }
  if (!sbOnlineMode()) return;                // клиент Supabase ещё не готов
  const ok = await sbLoad();
  if (!ok) { box.innerHTML = '<div class="sb-empty" style="padding:12px 4px">Чат не подключён к базе: выполните <b>supabase/chat.sql</b> в Supabase → SQL Editor.</div>'; return; }
  let list = sbPeers.filter(p => (sbThreads[p.id] || []).length).slice(0, 4);
  let html = list.map(p => sbMemberHtml(p, sbThreads[p.id].slice(-1)[0].text, `openChat('${p.id}')`, false)).join('');
  if (list.length < 4) {                      // добираем реальных пользователей платформы, с которыми ещё нет переписки
    const { rows } = await sbFindProfiles('', 8 + list.length);
    const me = activeUserId(), have = new Set(list.map(p => p.id));
    const more = rows.filter(r => r.id !== me && !have.has(r.id)).slice(0, 4 - list.length);
    more.forEach(r => { const pp = sbPeerFromRow(r); sbAddPeer(pp); html += sbMemberHtml(pp, pp.role, `openChat('${pp.id}')`, false); });
  }
  box.innerHTML = html || '<div class="sb-empty" style="padding:12px 4px">Пока здесь никого нет. Пригласите друзей на StudHub — они появятся в этом списке.</div>';
}

// Поиск профилей: пустой запрос — новые пользователи, иначе по имени или @нику. Ошибки не скрываем.
async function sbFindProfiles(q, limit) {
  const clean = String(q || '').trim().replace(/^@/, '').replace(/[%_\\]/g, '');
  const sel = 'id,name,username,subtitle,avatar_url,created_at';
  try {
    // 1) серверная функция из chat.sql — самый надёжный путь
    const r = await sb.rpc('chat_find_profiles', { q: clean, lim: limit || 8 });
    if (!r.error) return { rows: r.data || [] };
    console.warn('chat_find_profiles недоступна, пробую public_profiles:', r.error.message);
    // 2) запасной путь: публичное представление
    if (!clean) {
      const { data, error } = await sb.from('public_profiles').select(sel).order('created_at', { ascending: false }).limit(limit || 8);
      return error ? { rows: [], error } : { rows: data || [] };
    }
    const [u, n] = await Promise.all([
      sb.from('public_profiles').select(sel).ilike('username', `%${clean}%`).limit(8),
      sb.from('public_profiles').select(sel).ilike('name', `%${clean}%`).limit(8)
    ]);
    const error = u.error || n.error; if (error) return { rows: [], error };
    const m = new Map(); [...(u.data || []), ...(n.data || [])].forEach(x => m.set(x.id, x)); 
    return { rows: [...m.values()].slice(0, 8) };
  } catch (error) { return { rows: [], error }; }
}

function openMember(name) {
  const me = (getCurrentUser().name || '').trim();
  if (name === me) { switchView('profile'); return; }
  openChat(name);
}
async function openChat(id) {
  if (id) sbChatWith = id;
  openModal('chatModal');
  document.getElementById('chatSearchWrap').style.display = sbOnlineMode() ? '' : 'none';
  await sbLoad();
  if (!sbChatWith || !sbPeers.some(p => p.id === sbChatWith)) sbChatWith = sbPeers[0] ? sbPeers[0].id : null;
  renderChat();
  clearInterval(sbPoll);
  if (sbOnlineMode()) sbPoll = setInterval(async () => { if (!document.getElementById('chatModal').classList.contains('show')) { clearInterval(sbPoll); return; } const before = JSON.stringify(sbThreads); if (await sbLoad() && JSON.stringify(sbThreads) !== before) renderChat(true); }, 4000);
  setTimeout(() => { const i = document.getElementById('chatInput'); if (i && sbChatWith) i.focus(); }, 50);
}
function sbPick(i) { sbChatWith = sbPeers[i].id; renderChat(); }
function renderChat(keepInput) {
  const side = document.getElementById('chatPeople'), box = document.getElementById('chatMsgs');
  const input = document.getElementById('chatInput'), send = document.getElementById('chatSend');
  side.innerHTML = sbPeers.map((p, i) => { const t = sbThreads[p.id] || [], last = t[t.length - 1];
    return `<div class="sb-person${p.id === sbChatWith ? ' active' : ''}" onclick="sbPick(${i})"><div class="online-member-avatar" style="background:${p.bg};color:${p.fg};">${SB_ESC(p.ini)}</div><div style="min-width:0"><div class="online-member-name">${SB_ESC(p.name)}</div><div class="online-member-role sb-clip">${last ? SB_ESC(last.text) : SB_ESC(p.role)}</div></div></div>`; }).join('')
    || '<div class="sb-empty">Найдите студента по имени или @нику, чтобы начать чат.</div>';
  const m = sbPeers.find(p => p.id === sbChatWith);
  input.disabled = send.disabled = !m;
  const ct = document.getElementById('chatTitle');
  ct.textContent = m ? m.name : 'Чат';
  ct.classList.toggle('sb-link', !!(m && m.profile));
  document.getElementById('chatSub').textContent = m ? m.role : '';
  document.getElementById('chatNote').textContent = sbOnlineMode() ? 'Сообщения видите только вы и собеседник.' : 'Демо-режим: сообщения сохраняются на этом устройстве.';
  if (sbSetupHint) { box.innerHTML = '<div class="sb-empty">Чат ещё не подключён к базе: выполните файл <b>supabase/chat.sql</b> в Supabase → SQL Editor.</div>'; return; }
  const msgs = m ? sbThreads[m.id] || [] : [];
  const atEnd = box.scrollHeight - box.scrollTop - box.clientHeight < 40;
  box.innerHTML = !m ? '<div class="sb-empty">Выберите собеседника слева или найдите нового.</div>'
    : msgs.length ? msgs.map(x => `<div class="sb-msg ${x.mine ? 'me' : 'them'}"><div class="sb-bubble">${SB_ESC(x.text).replace(/\n/g, '<br>')}</div><div class="sb-time">${new Date(x.ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div></div>`).join('')
    : `<div class="sb-empty">Начните переписку с ${SB_ESC(m.name)}.</div>`;
  if (!keepInput || atEnd) box.scrollTop = box.scrollHeight;
}
async function sendChatMsg() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim(); if (!text || !sbChatWith) return;
  const body = text.slice(0, 1000);
  if (sbOnlineMode()) {
    input.disabled = true;
    const { error } = await sb.from('messages').insert({ recipient_id: sbChatWith, body });
    input.disabled = false;
    if (error) { showToast('Не удалось отправить сообщение', 'error'); return; }
    (sbThreads[sbChatWith] = sbThreads[sbChatWith] || []).push({ mine: true, text: body, ts: Date.now() });
    input.value = ''; renderChat(); input.focus(); sbRefreshBlock();
  } else {
    const chats = lsGet('studhub_chats', {});
    (chats[sbChatWith] = chats[sbChatWith] || []).push({ text: body, ts: Date.now() });
    lsSet('studhub_chats', chats);
    (sbThreads[sbChatWith] = sbThreads[sbChatWith] || []).push({ mine: true, text: body, ts: Date.now() });
    input.value = ''; renderChat();
  }
}
// Поиск людей для нового чата (только режим Supabase)
function sbSearchPeople(q) {
  clearTimeout(sbSearchT);
  const out = document.getElementById('chatFound');
  q = q.trim();
  if (!q) { out.innerHTML = ''; return; }
  sbSearchT = setTimeout(async () => {
    const { rows, error } = await sbFindProfiles(q);
    if (error) { console.warn('Поиск профилей', error); out.innerHTML = '<div class="sb-empty" style="padding:8px">Поиск недоступен: выполните <b>supabase/chat.sql</b> в Supabase → SQL Editor.</div>'; return; }
    const me = activeUserId(), res = rows.filter(p => p.id !== me);
    res.forEach(p => sbAddPeer(sbPeerFromRow(p)));
    out.innerHTML = res.length ? res.map(p => `<div class="sb-person" onclick="sbStartWith('${p.id}')"><div class="online-member-name">${SB_ESC(p.name)}${p.username ? ' <span style="color:var(--muted-2);font-weight:400">@' + SB_ESC(p.username) + '</span>' : ''}</div></div>`).join('') : '<div class="sb-empty" style="padding:8px">Никого не нашли. Проверьте имя или @ник.</div>';
  }, 250);
}
function sbStartWith(id) {
  sbChatWith = id;
  document.getElementById('chatSearch').value = ''; document.getElementById('chatFound').innerHTML = '';
  renderChat(); document.getElementById('chatInput').focus();
}
window.addEventListener('load', () => {
  let tries = 0;
  const t = setInterval(() => { tries++; if (!sbIsBackend() || sbOnlineMode() || tries > 20) { clearInterval(t); sbRefreshBlock(); } }, 500);
  setInterval(sbRefreshBlock, 30000);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') ['scheduleModal', 'helpModal', 'chatModal'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('show'); });
  if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.id === 'chatInput') { e.preventDefault(); sendChatMsg(); }
});

// Открыть профиль собеседника (из шапки чата)
function openChatProfile() {
  const m = sbPeers.find(p => p.id === sbChatWith);
  if (!m || !m.profile) return;
  closeModal('chatModal'); clearInterval(sbPoll);
  openPublicProfile(m.profile);
}
