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
function getSavedPosts() { return lsGet('studhub_saved_posts', []); }
function isPostSaved(id) { return getSavedPosts().some(p => String(p.id) === String(id)); }
function postSaveButton(p) {
  const id = String(p.id), saved = isPostSaved(id);
  return `<button type="button" class="post-save-btn${saved ? ' is-saved' : ''}" data-save-post-id="${escapeHtml(id)}" aria-pressed="${saved ? 'true' : 'false'}" title="${saved ? 'Убрать из сохранённого' : 'В сохранённое'}" onclick="toggleSavedPost('${escapeHtml(id)}')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15.95l-5-2.14-5 2.14V5h10v13.95z"/></svg><span>${saved ? 'Сохранено' : 'Сохранить'}</span></button>`;
}
function snapshotPost(p) {
  const ts = p.ts || (p.created_at ? Date.parse(p.created_at) : Date.now());
  return { id: String(p.id), owner_id: p.owner_id || null, title: String(p.title || 'Публикация'), body: String(p.body ?? p.text ?? ''), text: String(p.body ?? p.text ?? ''), tag: String(p.tag || 'Пост'), author: String(p.author || p.author_name || 'Студент'), created_at: p.created_at || new Date(ts).toISOString(), ts };
}
function toggleSavedPost(id) {
  const list = getSavedPosts();
  const index = list.findIndex(p => String(p.id) === String(id));
  let saved;
  if (index >= 0) {
    list.splice(index, 1); saved = false;
  } else {
    const source = [...(typeof homePostsData !== 'undefined' ? homePostsData : []), ...(profilePostsCache || [])].find(p => String(p.id) === String(id));
    if (!source) { showToast('Не удалось найти публикацию', 'error'); return; }
    list.unshift(snapshotPost(source)); saved = true;
  }
  lsSet('studhub_saved_posts', list);
  document.querySelectorAll('[data-save-post-id]').forEach(button => {
    if (button.dataset.savePostId !== String(id)) return;
    button.classList.toggle('is-saved', saved);
    button.setAttribute('aria-pressed', saved ? 'true' : 'false');
    button.title = saved ? 'Убрать из сохранённого' : 'В сохранённое';
    const label = button.querySelector('span'); if (label) label.textContent = saved ? 'Сохранено' : 'Сохранить';
  });
  const count = document.getElementById('profileTabSavedCount'); if (count) count.textContent = list.length;
  showToast(saved ? 'Пост добавлен в сохранённое' : 'Пост убран из сохранённого', 'success');
  if (typeof currentView !== 'undefined' && currentView === 'profile' && profileTab === 'saved') renderProfileTab();
}
function profilePostCard(p, own) {
  const author = p.author || p.author_name || 'Студент';
  const ts = p.ts || (p.created_at ? Date.parse(p.created_at) : Date.now());
  const id = String(p.id), key = 'post-' + id;
  const text = p.body ?? p.text ?? '';
  return `<article class="post-card" data-profile-post-id="${escapeHtml(id)}"><div class="post-header"><div class="post-author"><div class="post-avatar green">${escapeHtml(getInitials(author))}</div><div class="post-meta"><span class="post-community">${escapeHtml(author)}</span><span class="post-info">${escapeHtml(ago(ts))}</span></div></div><div class="post-header-actions">${postSaveButton(p)}${own ? `<button class="btn-more" type="button" title="Удалить" aria-label="Удалить публикацию" onclick="deletePost('${escapeHtml(id)}')">🗑</button>` : ''}</div></div><div class="post-tag green">${escapeHtml(p.tag || 'Пост')}</div><h2 class="post-title">${escapeHtml(p.title || '')}</h2><p class="post-text" style="white-space:pre-wrap">${escapeHtml(text)}</p><div class="post-footer">${voteBox(key, 0)}${commentBtn(key, 0)}</div>${commentsBox(key)}</article>`;
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
  const savedCount = document.getElementById('profileTabSavedCount');
  if (savedCount) savedCount.textContent = getSavedPosts().length;
  const box = document.getElementById('profileTabContent'); if (!box) return;
  const user = viewingProfile || getCurrentUser();
  const own = !viewingProfile || viewingProfile.id === activeUserId();
  const empty = (title, desc) => `<div class="empty-state" style="margin-bottom:20px"><div class="empty-state-title">${title}</div><div class="empty-state-desc" style="margin-bottom:0">${desc}</div></div>`;
  if (profileTab === 'posts') {
    box.innerHTML = own ? `<div class="composer is-link" role="button" tabindex="0" onclick="openPostModal()" onkeydown="if(event.key==='Enter')openPostModal()"><div class="composer-avatar">${escapeHtml(getInitials(user.name))}</div><div style="flex:1;font-size:14px;color:var(--muted)">О чём хотите рассказать?</div><button class="btn-submit" type="button">Создать пост</button></div><div class="profile-posts-list">Загружаем публикации…</div>` : '<div class="profile-posts-list">Загружаем публикации…</div>';
    const posts = await loadProfilePosts(); profilePostsCache = posts.map(p => ({ ...p, text: p.body ?? p.text ?? '', author: p.author || user.name || 'Студент', ts: p.created_at ? Date.parse(p.created_at) : (p.ts || Date.now()) }));
    const list = box.querySelector('.profile-posts-list');
    if (list) list.innerHTML = profilePostsCache.length ? profilePostsCache.map(p => profilePostCard(p, own && (!p.owner_id || p.owner_id === activeUserId()))).join('') : empty(own ? 'Пока нет постов' : 'Пока нет публикаций', own ? 'Напишите первый пост — он появится здесь.' : 'Этот пользователь ещё ничего не опубликовал.');
    const count = posts.length;
    ['profilePostsCount', 'profileTabPostsCount'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = count; });
  } else if (profileTab === 'projects') {
    let projects = typeof PUB_CACHE !== 'undefined' && BACKEND ? PUB_CACHE.filter(p => p.ownerId === (viewingProfile ? viewingProfile.id : activeUserId())) : getProjects();
    if (!viewingProfile) projects = getProjects();
    box.innerHTML = projects.length ? `<div class="projects-grid" style="margin-bottom:20px">${projects.map(p => renderProjectCard(p)).join('')}</div>` : empty('Проектов пока нет', own ? 'Создайте проект кнопкой «Создать проект».' : 'Этот пользователь пока не опубликовал проекты.');
    const count = projects.length;
    ['profileProjectsCount', 'profileTabProjectsCount'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = count; });
  } else if (profileTab === 'saved') {
    const saved = own ? getSavedPosts() : [];
    const countEl = document.getElementById('profileTabSavedCount'); if (countEl) countEl.textContent = own ? saved.length : '0';
    box.innerHTML = !own
      ? empty('Сохранённое скрыто', 'Сохранённые публикации доступны только владельцу профиля.')
      : saved.length
        ? `<div class="saved-posts-list">${saved.map(p => profilePostCard(p, false)).join('')}</div>`
        : empty('Пока ничего не сохранено', 'Нажимайте «Сохранить» на понравившихся постах — они появятся здесь.');
  }
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
      closeModal('postModal'); await Promise.all([renderProfileTab(), typeof loadHomePosts === 'function' ? loadHomePosts(true) : Promise.resolve()]); showToast('Пост опубликован и сохранён в базе данных', 'success'); return;
    } catch (e) { console.error(e); showToast('Не удалось сохранить пост в базе данных', 'error'); return; }
  }
  const posts = getUserPosts();
  posts.unshift({ id: String(Date.now()), title, text: body, tag, author: getCurrentUser().name, ts: Date.now() });
  lsSet('studhub_userposts', posts); closeModal('postModal'); renderProfileTab(); if (typeof loadHomePosts === 'function') loadHomePosts(true); showToast('Пост опубликован', 'success');
}
async function deletePost(id) {
  if (!confirm('Удалить пост?')) return;
  if (BACKEND && sb) {
    try { await ok(need().from('user_posts').delete().eq('id', id).eq('owner_id', activeUserId())); lsSet('studhub_saved_posts', getSavedPosts().filter(p => String(p.id) !== String(id))); await Promise.all([renderProfileTab(), typeof loadHomePosts === 'function' ? loadHomePosts(true) : Promise.resolve()]); showToast('Пост удалён', 'success'); }
    catch (e) { console.error(e); showToast('Не удалось удалить пост', 'error'); }
    return;
  }
  lsSet('studhub_userposts', getUserPosts().filter(p => String(p.id) !== String(id))); lsSet('studhub_saved_posts', getSavedPosts().filter(p => String(p.id) !== String(id))); renderProfileTab(); if (typeof loadHomePosts === 'function') loadHomePosts(true);
}
