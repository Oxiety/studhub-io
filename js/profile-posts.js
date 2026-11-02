// Публикации профилей: Supabase — основной источник, localStorage — резервный режим.
let profileTab = 'posts';
let viewingProfile = null;
let profilePostsCache = [];
function switchProfileTab(btn, tab) {
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  profileTab = tab;
  renderProfileTab();
}
const getUserPosts = () => lsGet('studhub_userposts', []);
function openPublicProfile(profile) {
  if (!profile) return;
  viewingProfile = profile;
  switchView('profile');
}
function showMyProfile() {
  viewingProfile = null;
  switchView('profile');
  updateProfile();
  renderProfileTab();
}
function profilePostCard(p, own) {
  const author = p.author || p.author_name || 'Студент';
  const ts = p.ts || (p.created_at ? Date.parse(p.created_at) : Date.now());
  const id = String(p.id);
  return `<article class="post-card" data-profile-post-id="${escapeHtml(id)}"><div class="post-header"><div class="post-author"><div class="post-avatar green">${escapeHtml(getInitials(author))}</div><div class="post-meta"><span class="post-community">${escapeHtml(author)}</span><span class="post-info">${escapeHtml(ago(ts))}</span></div></div>${own ? `<button class="btn-more" title="Удалить" onclick="deletePost('${escapeHtml(id)}')">🗑</button>` : ''}</div><div class="post-tag green">${escapeHtml(p.tag || 'Пост')}</div><h2 class="post-title">${escapeHtml(p.title || '')}</h2><p class="post-text" style="white-space:pre-wrap">${escapeHtml(p.text || '')}</p><div class="post-footer">${voteBox('post-' + id, 0)}${commentBtn('post-' + id, 0)}</div>${commentsBox('post-' + id)}</article>`;
}
async function loadProfilePosts() {
  if (BACKEND && sb) {
    const uid = viewingProfile ? viewingProfile.id : activeUserId();
    if (!uid) return [];
    try {
      let rows = await ok(need().from('user_posts').select('id, owner_id, title, body, tag, created_at').eq('owner_id', uid).order('created_at', { ascending: false }).limit(100));
      // Переносим старые локальные посты в БД один раз, если у аккаунта там ещё нет публикаций.
      if (!viewingProfile && rows.length === 0) {
        const localPosts = getUserPosts();
        if (localPosts.length) {
          const payload = localPosts.slice(0, 100).map(p => ({ owner_id: uid, title: String(p.title || 'Пост').slice(0, 160), body: String(p.text || p.body || '').slice(0, 10000), tag: String(p.tag || 'Пост').slice(0, 40) }));
          await ok(need().from('user_posts').insert(payload));
          rows = await ok(need().from('user_posts').select('id, owner_id, title, body, tag, created_at').eq('owner_id', uid).order('created_at', { ascending: false }).limit(100));
        }
      }
      return rows;
    } catch (e) {
      console.error('Не удалось загрузить публикации профиля', e);
      showToast('Не удалось загрузить публикации из базы данных', 'error');
      return [];
    }
  }
  if (viewingProfile) return [];
  return getUserPosts();
}
async function renderProfileTab() {
  const box = document.getElementById('profileTabContent'); if (!box) return;
  const user = viewingProfile || getCurrentUser();
  const own = !viewingProfile || viewingProfile.id === activeUserId();
  const empty = (title, desc) => `<div class="empty-state" style="margin-bottom:20px"><div class="empty-state-title">${title}</div><div class="empty-state-desc" style="margin-bottom:0">${desc}</div></div>`;
  if (profileTab === 'posts') {
    box.innerHTML = own ? `<div class="composer is-link" role="button" tabindex="0" onclick="openPostModal()" onkeydown="if(event.key==='Enter')openPostModal()"><div class="composer-avatar">${escapeHtml(getInitials(user.name))}</div><div style="flex:1;font-size:14px;color:var(--muted)">О чём хотите рассказать?</div><button class="btn-submit" type="button">Создать пост</button></div><div class="profile-posts-list">Загружаем публикации…</div>` : '<div class="profile-posts-list">Загружаем публикации…</div>';
    const posts = await loadProfilePosts(); profilePostsCache = posts;
    const list = box.querySelector('.profile-posts-list');
    if (list) list.innerHTML = posts.length ? posts.map(p => {
      const row = { ...p, text: p.body ?? p.text, author: p.author || user.name, ts: p.created_at ? Date.parse(p.created_at) : p.ts };
      return profilePostCard(row, own && (!p.owner_id || p.owner_id === activeUserId()));
    }).join('') : empty(own ? 'Пока нет постов' : 'Пока нет публикаций', own ? 'Напишите первый пост — он появится здесь.' : 'Этот пользователь ещё ничего не опубликовал.');
    const count = posts.length;
    ['profilePostsCount', 'profileTabPostsCount'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = count; });
  } else if (profileTab === 'projects') {
    let projects = typeof PUB_CACHE !== 'undefined' && BACKEND ? PUB_CACHE.filter(p => p.ownerId === (viewingProfile ? viewingProfile.id : activeUserId())) : getProjects();
    if (!viewingProfile) projects = getProjects();
    box.innerHTML = projects.length ? `<div class="projects-grid" style="margin-bottom:20px">${projects.map(p => renderProjectCard(p)).join('')}</div>` : empty('Проектов пока нет', own ? 'Создайте проект кнопкой «Создать проект».' : 'Этот пользователь пока не опубликовал проекты.');
    const count = projects.length;
    ['profileProjectsCount', 'profileTabProjectsCount'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = count; });
  } else box.innerHTML = empty('Сохранённого пока нет', own ? 'Раздел в разработке.' : 'Сохранённые материалы этого пользователя не видны другим.');
}
function openPostModal() {
  if (viewingProfile) return;
  ['postTitle', 'postText'].forEach(i => { const el = document.getElementById(i); if (el) el.value = ''; });
  openModal('postModal');
}
async function submitPost() {
  if (viewingProfile) return;
  const titleEl = document.getElementById('postTitle'), textEl = document.getElementById('postText');
  const title = titleEl.value.trim(), body = textEl.value.trim(), tag = document.getElementById('postTag').value;
  if (!title) { showToast('Введите заголовок', 'error'); return; }
  if (BACKEND && sb) {
    if (!activeUserId()) { showToast('Войдите в аккаунт, чтобы опубликовать пост', 'error'); return; }
    try {
      await ok(need().from('user_posts').insert({ owner_id: activeUserId(), title, body, tag }));
      closeModal('postModal'); await renderProfileTab(); showToast('Пост опубликован и сохранён в базе данных', 'success'); return;
    } catch (e) { console.error(e); showToast('Не удалось сохранить пост в базе данных', 'error'); return; }
  }
  const posts = getUserPosts();
  posts.unshift({ id: String(Date.now()), title, text: body, tag, author: getCurrentUser().name, ts: Date.now() });
  lsSet('studhub_userposts', posts); closeModal('postModal'); renderProfileTab(); showToast('Пост опубликован', 'success');
}
async function deletePost(id) {
  if (!confirm('Удалить пост?')) return;
  if (BACKEND && sb) {
    try { await ok(need().from('user_posts').delete().eq('id', id).eq('owner_id', activeUserId())); await renderProfileTab(); showToast('Пост удалён', 'success'); }
    catch (e) { console.error(e); showToast('Не удалось удалить пост', 'error'); }
    return;
  }
  lsSet('studhub_userposts', getUserPosts().filter(p => String(p.id) !== String(id))); renderProfileTab();
}
