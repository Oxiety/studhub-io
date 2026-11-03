// Главная лента публикаций пользователей.
// Supabase — общий источник публикаций, localStorage — резервный режим.
const homePostsData = [];
const homeVoteState = {};
const homeOriginalVotes = {};
let homeFeedLoadingPromise = null;
let homeFeedSort = 'new';

function homePostInitials(name) {
  return typeof getInitials === 'function' ? getInitials(name || 'Студент') : String(name || 'С').slice(0, 1).toUpperCase();
}

function normalizeHomePost(row, profile) {
  const ts = row.ts || (row.created_at ? Date.parse(row.created_at) : Date.now());
  const author = row.author || row.author_name || (profile && profile.name) || (row.owner_id && row.owner_id === activeUserId() ? getCurrentUser().name : 'Студент');
  return {
    ...row,
    id: String(row.id),
    owner_id: row.owner_id || null,
    title: String(row.title || 'Публикация'),
    text: String(row.body ?? row.text ?? ''),
    body: String(row.body ?? row.text ?? ''),
    tag: String(row.tag || 'Пост'),
    author,
    avatarUrl: profile && profile.avatar_url ? profile.avatar_url : (row.avatarUrl || ''),
    community: row.community || 'Публикации StudHub',
    avatarClass: 'green',
    avatarLetter: homePostInitials(author),
    tagClass: 'green',
    time: typeof ago === 'function' ? ago(ts) : '',
    timeSort: Number.isFinite(ts) ? ts : Date.now(),
    votes: Number(row.votes || 0),
    comments: Number(row.comments || 0)
  };
}

function safeAvatarUrl(value) {
  try {
    const url = new URL(String(value || ''), location.href);
    return /^https?:$/.test(url.protocol) ? url.href : '';
  } catch (e) { return ''; }
}

function renderHomePost(post) {
  const id = String(post.id);
  const safeId = escapeHtml(id);
  const author = escapeHtml(post.author || 'Студент');
  const title = escapeHtml(post.title || 'Публикация');
  const body = escapeHtml(post.text || '');
  const tag = escapeHtml(post.tag || 'Пост');
  const initials = escapeHtml(post.avatarLetter || homePostInitials(post.author));
  const avatarUrl = safeAvatarUrl(post.avatarUrl);
  const avatar = avatarUrl
    ? `<div class="post-avatar green has-image"><img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy"></div>`
    : `<div class="post-avatar green">${initials}</div>`;
  const key = 'post-' + id;
  return `<article class="post-card home-post-card" data-id="${safeId}" data-owner-id="${escapeHtml(post.owner_id || '')}">
    <div class="post-header">
      <div class="post-author">${avatar}<div class="post-meta"><span class="post-community">${author}</span><span class="post-info">${escapeHtml(post.time || '')}</span></div></div>
      <div class="post-header-actions">${typeof postSaveButton === 'function' ? postSaveButton(post) : ''}</div>
    </div>
    <div class="post-tag green">${tag}</div>
    <h2 class="post-title">${title}</h2>
    ${body ? `<p class="post-text" style="white-space:pre-wrap">${body}</p>` : ''}
    <div class="post-footer">
      ${typeof voteBox === 'function' ? voteBox(key, post.votes || 0) : ''}
      ${typeof commentBtn === 'function' ? commentBtn(key, post.comments || 0) : ''}
      <span class="post-stat post-share-label"><svg viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>Поделиться</span>
    </div>
    ${typeof commentsBox === 'function' ? commentsBox(key) : ''}
  </article>`;
}

function renderPosts(sortType) {
  const container = document.getElementById('postsContainer');
  if (!container) return;
  if (sortType) homeFeedSort = sortType;
  const sorted = [...homePostsData];
  if (homeFeedSort === 'top') sorted.sort((a, b) => (b.votes || 0) - (a.votes || 0) || b.timeSort - a.timeSort);
  else sorted.sort((a, b) => b.timeSort - a.timeSort);
  container.innerHTML = sorted.length
    ? sorted.map(renderHomePost).join('')
    : `<div class="empty-state home-posts-empty"><div class="empty-state-icon">✦</div><div class="empty-state-title">Пока нет публикаций</div><div class="empty-state-desc">Здесь появятся посты студентов — поделитесь своей новостью и начните разговор.</div></div>`;
}

async function loadHomePosts(force = false) {
  if (homeFeedLoadingPromise && !force) return homeFeedLoadingPromise;
  homeFeedLoadingPromise = (async () => {
    let rows = [];
    let profiles = [];
    if (typeof BACKEND !== 'undefined' && BACKEND && typeof sb !== 'undefined' && sb) {
      try {
        rows = await ok(need().from('user_posts').select('id, owner_id, title, body, tag, created_at').order('created_at', { ascending: false }).limit(40));
        const ownerIds = [...new Set((rows || []).map(p => p.owner_id).filter(Boolean))];
        if (ownerIds.length) {
          try { profiles = await ok(need().from('public_profiles').select('id, name, avatar_url').in('id', ownerIds)); }
          catch (profileError) { console.warn('Не удалось загрузить публичные профили авторов ленты', profileError); }
        }
      } catch (e) {
        console.warn('Не удалось загрузить общую ленту публикаций', e);
        rows = [];
      }
    }

    // Резервная копия локальных публикаций полезна при отсутствии сети или миграции.
    if (!rows.length && typeof getUserPosts === 'function') rows = getUserPosts();
    const byOwner = new Map((profiles || []).map(p => [p.id, p]));
    const normalized = (rows || []).map(row => normalizeHomePost(row, byOwner.get(row.owner_id)));
    homePostsData.splice(0, homePostsData.length, ...normalized);
    renderPosts(homeFeedSort);
    return homePostsData;
  })();
  try { return await homeFeedLoadingPromise; }
  finally { homeFeedLoadingPromise = null; }
}

function sortPosts(type, btn) {
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
  }
  renderPosts(type);
}

// Сохраняем старый обработчик на случай, если в браузере осталась старая разметка ленты.
function homeVote(btn, direction, postId) {
  const control = btn.closest('.vote-control');
  if (!control) return;
  const post = homePostsData.find(p => String(p.id) === String(postId));
  if (!post) return;
  const upBtn = control.querySelector('.up'), downBtn = control.querySelector('.down'), countEl = control.querySelector('.vote-count');
  if (homeVoteState[postId] === direction) {
    homeVoteState[postId] = null; upBtn?.classList.remove('active'); downBtn?.classList.remove('active');
    post.votes = homeOriginalVotes[postId] ?? post.votes;
  } else {
    homeVoteState[postId] = direction; upBtn?.classList.remove('active'); downBtn?.classList.remove('active');
    btn.classList.add('active'); post.votes = (homeOriginalVotes[postId] ?? post.votes) + (direction === 'up' ? 1 : -1);
  }
  const val = post.votes;
  if (countEl) { countEl.textContent = val < 0 ? '−' + Math.abs(val) : val; countEl.className = 'vote-count ' + (val >= 0 ? 'positive' : 'negative'); }
}
