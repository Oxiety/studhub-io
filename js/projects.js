// Мои проекты: создание, просмотр, редактирование, удаление
function renderHomeProjects() {
const grid = document.getElementById('homeProjectsGrid');
if (!grid) return;
const projects = getProjects();
if (projects.length === 0) {
grid.innerHTML = `<div style="grid-column:1/-1;background:var(--surface);border-radius:16px;padding:40px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.06);"><div style="font-size:48px;margin-bottom:12px;">📦</div><div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;">Пока нет проектов</div><div style="font-size:13px;color:var(--muted);margin-bottom:16px;">Создайте первый проект и он появится здесь</div><button class="btn-create" onclick="openCreateModal()"><svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>Создать проект</button></div>`;
return;
}
grid.innerHTML = projects.slice(0, 4).map(p => renderProjectCard(p)).join('');
}


// Блок сбора на карточке «Мои проекты»: прогресс-бар, срок и ссылка на публичную страницу
function campaignBlock(p) {
const c = p.pubId && findCampaign(p.pubId);
if (!c) return p.goal ? `<div style="font-size:12px;color:var(--muted);margin:10px 0">Цель: ${fmtRub(p.goal)} · не опубликован (${p.status === 'draft' ? 'черновик' : 'завершён'})</div>` : '';
const s = projectStats(c);
return `<div style="margin:10px 0 4px"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)"><strong style="color:var(--accent)">${fmtRub(s.raised)} из ${fmtRub(c.goal)}</strong><span>${s.pctReal}%</span></div><div class="funding-progress" style="height:8px;background:var(--surface-3);border-radius:10px;overflow:hidden;margin:6px 0"><span style="display:block;height:100%;width:${s.pct}%;background:var(--accent);border-radius:10px"></span></div><div style="display:flex;justify-content:space-between;gap:8px;font-size:12px;color:var(--muted)"><span>${daysLeftText(c)} · ${s.backers} подд.</span><a style="color:var(--accent);font-weight:600;cursor:pointer" onclick="event.stopPropagation();showFundingDetails('${c.id}')">Страница ↗</a></div></div>`;
}

function renderProjectCard(p) {
const statusClass = p.status === 'active' ? 'status-active' : p.status === 'done' ? 'status-done' : 'status-draft';
const statusText = p.status === 'active' ? 'Активный' : p.status === 'done' ? 'Завершён' : 'Черновик';
const icons = ['📦', '🚀', '', '🎯'];
const icon = icons[p.id % icons.length] || '📦';
const colors = ['p1', 'p2', 'p3', 'p4'];
const color = colors[p.id % colors.length] || 'p1';
return `<div class="project-card-full" onclick="openProjectDetail(${p.id})">
<div class="project-card-actions">
<button class="action-btn" onclick="event.stopPropagation();editProject(${p.id})" title="Редактировать"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
<button class="action-btn danger" onclick="event.stopPropagation();deleteProject(${p.id})" title="Удалить"><svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
</div>
<div class="project-card-header">
<div class="project-card-icon ${color}">${icon}</div>
<div style="flex:1;min-width:0"><div class="project-card-title">${escapeHtml(p.name)}</div></div>
<span class="project-card-status ${statusClass}">${statusText}</span>
</div>
<div class="project-card-desc">${escapeHtml(p.desc) || 'Без описания'}</div>${campaignBlock(p)}
<div class="project-card-footer">
<div class="project-card-team"><div class="team-avatar" style="background:var(--accent-soft);color:var(--accent);">ДС</div></div>
<div class="project-card-stats"><span>👁 ${p.views || 0}</span><span>❤ ${p.likes || 0}</span><span>💬 ${p.comments || 0}</span></div>
</div>
</div>`;
}

function renderMyProjects() {
const container = document.getElementById('myProjectsContainer');
if (!container) return;
const projects = getProjects();
updateMyProjectsStats(projects);
if (projects.length === 0) {
container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🚀</div><div class="empty-state-title">У вас пока нет проектов</div><div class="empty-state-desc">Создайте первый проект и он появится здесь со всей статистикой</div></div>`;
return;
}
container.innerHTML = `<div class="projects-grid">${projects.map(p => renderProjectCard(p)).join('')}</div>`;
}

function updateMyProjectsStats(projects) {
document.getElementById('statTotal').textContent = projects.length;
document.getElementById('statActive').textContent = projects.filter(p => p.status === 'active').length;
document.getElementById('statViews').textContent = projects.reduce((s, p) => s + (p.views || 0), 0);
document.getElementById('statLikes').textContent = projects.reduce((s, p) => s + (p.likes || 0), 0);
document.getElementById('myProjectsCount').textContent = projects.length;
}

let selectedStatus = 'active';
let selectedTags = [];
function openCreateModal() {
document.getElementById('createProjectModal').classList.add('show');
document.getElementById('projName').value = '';
document.getElementById('projDesc').value = '';
resetCampaignFields();
selectedStatus = 'active';
selectedTags = [];
document.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
document.querySelector('[data-status="active"]').classList.add('active');
document.querySelectorAll('#tagContainer .form-tag').forEach(t => t.classList.remove('selected'));
setTimeout(() => document.getElementById('projName').focus(), 100);
}
function closeCreateModal() { document.getElementById('createProjectModal').classList.remove('show'); }
function selectStatus(btn) { btn.parentElement.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active')); btn.classList.add('active'); selectedStatus = btn.dataset.status; }
function toggleTag(el) {
const tag = el.dataset.tag;
if (selectedTags.includes(tag)) { selectedTags = selectedTags.filter(t => t !== tag); el.classList.remove('selected'); }
else { selectedTags.push(tag); el.classList.add('selected'); }
}
function resetCampaignFields() {
document.getElementById('projGoal').value = '';
document.getElementById('projDays').value = '30';
document.getElementById('projCategory').innerHTML = CATEGORIES.map(c => `<option>${c}</option>`).join('');
DEFAULT_REWARDS.forEach((r, i) => { document.getElementById('rwAmt' + i).value = r.amount; document.getElementById('rwTitle' + i).value = r.title; document.getElementById('rwDesc' + i).value = r.desc; });
}
function readRewards() {
const out = [];
for (let i = 0; i < 3; i++) {
const amount = Math.floor(+document.getElementById('rwAmt' + i).value), title = document.getElementById('rwTitle' + i).value.trim().slice(0, 60), desc = document.getElementById('rwDesc' + i).value.trim().slice(0, 140);
if (!amount && !title) continue; // пустая строка — уровень не нужен
if (!(amount >= 50 && amount <= 100000) || !title) return null;
out.push({ amount, title, desc });
}
return out.sort((a, b) => a.amount - b.amount);
}
async function submitProject() {
const name = document.getElementById('projName').value.trim();
const desc = document.getElementById('projDesc').value.trim();
const goal = Math.floor(+document.getElementById('projGoal').value);
const days = +document.getElementById('projDays').value;
if (!name) { showToast('Введите название проекта', 'error'); return; }
if (!(goal >= 1000 && goal <= 1000000)) { showToast('Цель сбора: от 1 000 до 1 000 000 ₽', 'error'); return; }
const rewards = readRewards();
if (!rewards) { showToast('Награды: сумма от 50 до 100 000 ₽ и название (или очистите строку)', 'error'); return; }
const projects = getProjects();
const id = Date.now();
const category = document.getElementById('projCategory').value;
const deadline = Date.now() + days * DAY_MS;
const newProject = {
id,
name,
desc,
status: selectedStatus,
tags: [...selectedTags],
goal, deadline, category, rewards,
views: 0,
likes: 0,
comments: 0,
team: 1,
createdAt: new Date().toISOString()
};
if (selectedStatus === 'active') { // публикуем на главной: любой аккаунт сможет поддержать
const me = getCurrentUser(), uid = activeUserId(), icon = name.trim()[0].toUpperCase();
if (BACKEND) {
const btn = document.querySelector('#createProjectModal .btn-submit'); btn.disabled = true;
try { newProject.pubId = (await backendCreateProject({ name, desc, category, icon, goal, deadline, rewards })).id; }
catch (e) { showToast(backendErrorText(e), 'error'); return; }
finally { btn.disabled = false; }
} else {
newProject.pubId = 'u' + uid.slice(0, 6) + '-' + id.toString(36);
const pub = getPublicProjects();
pub.push({ id: newProject.pubId, pub: true, ownerId: uid, owner: me.name, name, desc, about: desc, category, goal, deadline, rewards, icon, likes: 0, donations: [], createdAt: id });
savePublicProjects(pub);
}
}
projects.push(newProject);
saveProjects(projects);
closeCreateModal();
renderMyProjects();
renderFundraisingProjects();
updateProfile();
showToast(newProject.pubId ? 'Проект "' + name + '" опубликован — можно собирать поддержку!' : 'Проект "' + name + '" сохранён (не опубликован)', 'success');
if (newProject.pubId) setTimeout(() => showFundingDetails(newProject.pubId), 400);
}

function openProjectDetail(id) {
const projects = getProjects();
const p = projects.find(x => x.id === id);
if (!p) return;
currentDetailProjectId = id;
p.views = (p.views || 0) + 1;
saveProjects(projects);
document.getElementById('detailTitle').textContent = p.name;
document.getElementById('detailName').textContent = p.name;
document.getElementById('detailDesc').textContent = p.desc || 'Без описания';
document.getElementById('detailViews').textContent = p.views || 0;
document.getElementById('detailLikes').textContent = p.likes || 0;
document.getElementById('detailComments').textContent = p.comments || 0;
document.getElementById('detailTeam').textContent = p.team || 1;
const statusEl = document.getElementById('detailStatus');
statusEl.textContent = p.status === 'active' ? 'Активный' : p.status === 'done' ? 'Завершён' : 'Черновик';
statusEl.className = 'project-card-status ' + (p.status === 'active' ? 'status-active' : p.status === 'done' ? 'status-done' : 'status-draft');
mountRating(document.getElementById('detailRate'), 'uproj-' + id, p.likes || 0);
document.getElementById('detailOpenBtn').style.display = p.pubId ? '' : 'none';
document.getElementById('projectDetailModal').classList.add('show');
}
function closeDetailModal() { document.getElementById('projectDetailModal').classList.remove('show'); currentDetailProjectId = null; }
function editProjectFromDetail() { if (currentDetailProjectId) { closeDetailModal(); setTimeout(() => editProject(currentDetailProjectId), 200); } }
function deleteProjectFromDetail() { if (currentDetailProjectId && confirm('Удалить проект?')) { deleteProject(currentDetailProjectId); closeDetailModal(); } }
function openPublicPageFromDetail() { const p = getProjects().find(x => x.id === currentDetailProjectId); if (p && p.pubId) { closeDetailModal(); showFundingDetails(p.pubId); } }
function shareProject() {
const p = getProjects().find(x => x.id === currentDetailProjectId);
if (!p) return;
if (p.pubId) copyProjectLink(p.pubId);
else showToast('Проект не опубликован — ссылки пока нет', 'error');
}
async function editProject(id) {
const p = getProjects().find(x => x.id === id);
if (!p) return;
const newName = prompt('Новое название:', p.name);
if (newName === null) return;
const newDesc = prompt('Новое описание:', p.desc);
if (newDesc === null) return;
const projects = getProjects();
const idx = projects.findIndex(x => x.id === id);
if (idx !== -1) {
projects[idx].name = (newName || projects[idx].name).slice(0, 80);
projects[idx].desc = (newDesc || projects[idx].desc).slice(0, 2000);
const pj = projects[idx];
if (pj.pubId) {
if (BACKEND) {
try { await backendUpdateProject(pj.pubId, { name: pj.name, desc: pj.desc, icon: pj.name.trim()[0].toUpperCase() }); }
catch (e) { showToast(backendErrorText(e), 'error'); return; }
} else { const pub = getPublicProjects(), j = pub.findIndex(x => x.id === pj.pubId); if (j >= 0) { pub[j].name = pj.name; pub[j].desc = pj.desc; pub[j].about = pj.desc; pub[j].icon = pj.name.trim()[0].toUpperCase(); savePublicProjects(pub); } }
}
saveProjects(projects);
renderMyProjects();
renderFundraisingProjects();
showToast('Проект обновлён', 'success');
}
}
async function deleteProject(id) {
const target = getProjects().find(x => x.id === id);
if (target && target.pubId) {
const c = findCampaign(target.pubId);
if (c && (c.donations || []).length) { showToast('Нельзя удалить проект, который уже поддержали', 'error'); return; }
}
if (!confirm('Удалить проект?')) return;
if (target && target.pubId) {
if (BACKEND) { try { await backendDeleteProject(target.pubId); } catch (e) { showToast(e.message && e.message.startsWith('Нельзя') ? e.message : backendErrorText(e), 'error'); return; } }
else savePublicProjects(getPublicProjects().filter(x => x.id !== target.pubId));
}
const projects = getProjects().filter(x => x.id !== id);
saveProjects(projects);
renderMyProjects();
renderFundraisingProjects();
updateProfile();
showToast('Проект удалён', 'success');
}
