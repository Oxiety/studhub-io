// Уведомления (колокольчик в шапке). Хранятся в localStorage, фильтруются по настройкам.
const NOTIF_SEED = [];
function getNotifs() {
  let list = lsGet('studhub_notifs', null);
  if (!list) { list = NOTIF_SEED; lsSet('studhub_notifs', list); }
  const clean = list.filter(n => !['n1', 'n2', 'n3'].includes(n.id)); // убираем старые демо-уведомления
  let changed = clean.length !== list.length;
  const migrated = clean.map(n => {
    const color = ['#e8f5f2', '#eef2e4', '#f0e8f8'].includes(n.color) ? 'var(--accent-soft)' : n.color;
    const fg = ['#2d8a7a', '#667c40', '#8b6ab5'].includes(n.fg) ? 'var(--accent)' : n.fg;
    if (color !== n.color || fg !== n.fg) changed = true;
    return color === n.color && fg === n.fg ? n : { ...n, color, fg };
  });
  if (changed) lsSet('studhub_notifs', migrated);
  return migrated;
}
function pushNotif(type, html, letter) {
  if (getSettings().notif[type] === false) return;
  const list = getNotifs();
  list.unshift({ id: 'n' + Date.now(), type, color: 'var(--accent-soft)', fg: 'var(--accent)', letter: letter || '₽', text: html, ts: Date.now(), read: false });
  lsSet('studhub_notifs', list.slice(0, 30));
  renderNotifs();
}
function renderNotifs() {
  const s = getSettings();
  const visible = getNotifs().filter(n => s.notif[n.type] !== false);
  const unread = visible.filter(n => !n.read).length;
  const box = document.getElementById('notifList');
  if (box) box.innerHTML = visible.length ? visible.map(n => `<div class="notif-item ${n.read ? '' : 'unread'}"><div class="notif-avatar" style="background:${n.color};color:${n.fg};">${n.letter}</div><div class="notif-content"><div class="notif-text">${n.text}</div><div class="notif-time">${ago(n.ts)}</div></div>${n.read ? '' : '<div class="notif-dot"></div>'}</div>`).join('') : '<div class="search-empty">—</div>';
  const badge = document.getElementById('notifBadge');
  if (badge) { badge.textContent = unread; badge.style.display = (s.notif.badge !== false && unread > 0) ? 'flex' : 'none'; }
}
function markNotifsRead() {
  lsSet('studhub_notifs', getNotifs().map(n => ({ ...n, read: true })));
  const badge = document.getElementById('notifBadge'); if (badge) badge.style.display = 'none';
}
