// Основа: хелперы, localStorage, тосты, навигация, меню
function getInitials(name) { if (!name) return '??'; return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2); }
function getCurrentUser() { return JSON.parse(userStore.getItem('currentUser') || '{"name":"Студент","campus":"other","subtitle":"","bio":"","username":"student","city":"","interests":""}'); }
function saveCurrentUser(user) {
  const prev = userStore.getItem('currentUser');
  userStore.setItem('currentUser', JSON.stringify(user));
  // имя показывается другим пользователям (автор проекта, список поддержавших) — храним его и в базе
  if (typeof BACKEND !== 'undefined' && BACKEND && sb && prev && user.name && JSON.parse(prev).name !== user.name) sb.from('profiles').update({ name: user.name.slice(0, 40) }).eq('id', activeUserId()).then(() => {});
}
function getProjects() { return JSON.parse(userStore.getItem('studhub_projects') || '[]'); }
function saveProjects(projects) { userStore.setItem('studhub_projects', JSON.stringify(projects)); }
let currentDetailProjectId = null;
let currentView = 'home'; // какая страница открыта сейчас (home, project, wallet...)

function showToast(msg, type) {
if (type !== 'error' && getSettings().notif.toast === false) return; // всплывающие сообщения можно отключить в настройках
const el = document.getElementById('toast');
el.textContent = msg;
el.className = 'toast show ' + (type || '');
clearTimeout(showToast._timer);
showToast._timer = setTimeout(() => { el.className = 'toast'; }, 3000);
}

function switchView(viewName) {
if (viewName !== 'project' && /^#\/project\//.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); // уходим со страницы проекта — убираем её адрес
if (viewName !== 'project') document.title = 'StudHub';
currentView = viewName;
document.body.dataset.view = viewName;
closeMobileMenu();
document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
const view = document.getElementById('view-' + viewName);
if (view) view.classList.add('active');
const navMap = { home: 'nav-home', community: 'nav-communities', communitylist: 'nav-communities', allcommunities: 'nav-communities', discussions: 'nav-discussions', myprojects: 'nav-myprojects', assets: 'nav-assets', subs: 'nav-subs', project: 'nav-home', wallet: 'nav-wallet', settings: 'nav-settings', profile: null };
const navEl = document.getElementById(navMap[viewName]);
if (navEl) navEl.classList.add('active');
window.scrollTo(0, 0);
const mainScroller = document.querySelector('.main-content'); if (mainScroller) mainScroller.scrollTop = 0;
const leftScroller = document.querySelector('.sidebar-left'); if (leftScroller) leftScroller.scrollTop = 0;
if (viewName === 'myprojects') renderMyProjects();
if (viewName === 'home') renderFundraisingProjects();
if (viewName === 'profile') { updateProfile(); renderProfileTab(); }
if (viewName === 'discussions') renderDiscussions();
if (viewName === 'communitylist' || viewName === 'allcommunities') renderAllCommunities();
if (viewName === 'subs') renderFundedProjects();
if (viewName === 'assets') renderAssets();
if (viewName === 'wallet') renderWallet();
if (viewName === 'settings') renderSettings();
}

const userProfile = document.getElementById('userProfile');
const profileDropdown = document.getElementById('profileDropdown');
const notifIcon = document.getElementById('notifIcon');
const notifDropdown = document.getElementById('notifDropdown');
if (userProfile && profileDropdown) {
userProfile.addEventListener('click', (e) => { e.stopPropagation(); if (notifDropdown) notifDropdown.classList.remove('show'); profileDropdown.classList.toggle('show'); });
}
if (notifIcon && notifDropdown) {
notifIcon.addEventListener('click', (e) => { e.stopPropagation(); if (profileDropdown) profileDropdown.classList.remove('show'); notifDropdown.classList.toggle('show'); markNotifsRead(); });
}
document.addEventListener('click', (e) => {
if (userProfile && !userProfile.contains(e.target) && profileDropdown) profileDropdown.classList.remove('show');
if (notifIcon && !notifIcon.contains(e.target) && notifDropdown) notifDropdown.classList.remove('show');
});
function handleMenuAction(action) {
if (profileDropdown) profileDropdown.classList.remove('show');
if (action === 'logout' || action === 'switch') logout();   // выход из аккаунта (см. auth.js)
else if (action === 'settings') switchView('settings');
}

function toggleStar(el) { const svg = el.querySelector('svg'); svg.style.fill = svg.style.fill === 'rgb(240, 192, 64)' ? '#ccc' : '#f0c040'; }
function switchProfileTab(btn) { document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active')); btn.classList.add('active'); }
