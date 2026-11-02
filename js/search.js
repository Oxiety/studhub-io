// Поиск, закрытие модалок по клику на фон
// ===== Поиск =====
// ВАЖНО: результаты хранятся в переменной searchHits, а не в JSON: функции-действия (action)
// при JSON.stringify теряются — из-за этого раньше клик по результату ничего не делал.
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
let searchHits = [];

// Перейти к посту на главной и подсветить его
function goToPost(id) {
  switchView('home');
  setTimeout(() => {
    const el = document.querySelector('.post-card[data-id="' + id + '"]');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.transition = 'box-shadow .3s';
    el.style.boxShadow = '0 0 0 3px var(--accent)';
    setTimeout(() => { el.style.boxShadow = ''; }, 2200);
  }, 50);
}
// Перейти к обсуждению: открываем раздел и фильтруем список по его названию
function goToDiscussion(title) {
  discCat = 'Все'; discMine = false; discQ = title.toLowerCase();
  switchView('discussions');
  const inp = document.getElementById('discSearch'); if (inp) inp.value = title;
  renderDiscFilters(); renderDiscussions();
}

function findSearchHits(query) {
  const has = (...parts) => parts.some(x => x && String(x).toLowerCase().includes(query));
  const hits = [];
  getProjects().forEach(p => { if (has(p.name, p.desc)) hits.push({ type: t('search.project'), title: p.name, sub: p.desc ? p.desc.slice(0, 60) : 'Без описания', icon: '📦', color: '#e8f5f2', action: () => { switchView('myprojects'); openProjectDetail(p.id); } }); });
  allCampaigns().forEach(p => { if (has(p.name, p.desc, p.category)) hits.push({ type: t('search.fund'), title: p.name, sub: (p.desc || '').slice(0, 60), icon: p.icon, color: '#e8f5f2', action: () => showFundingDetails(p.id) }); });
  allCommunitiesData.forEach(c => { if (has(c.name, c.desc)) hits.push({ type: t('search.community'), title: c.name, sub: c.desc, icon: c.letter, color: '#f0e8f8', action: () => openCommunity(c.id) }); });
  homePostsData.forEach(p => { if (has(p.title, p.text)) hits.push({ type: t('search.post'), title: p.title, sub: p.community + ' · ' + p.author, icon: '📝', color: '#e8f0f8', action: () => goToPost(p.id) }); });
  getDiscs().forEach(d => { if (has(d.title, d.text)) hits.push({ type: t('search.disc'), title: d.title, sub: d.cat + ' · ' + d.author, icon: '💬', color: '#f5f0e8', action: () => goToDiscussion(d.title) }); });
  [...demoAssets, ...getUploadedAssets()].forEach(a => { if (has(a.name)) hits.push({ type: t('search.file'), title: a.name, sub: a.meta || '', icon: '📄', color: '#e8f0f8', action: () => switchView('assets') }); });
  return hits;
}

let profileSearchRequest = 0;
function paintSearchResults(raw) {
  const query = raw.toLowerCase();
  if (!searchHits.length) {
    searchResults.innerHTML = '<div class="search-empty">' + t('search.empty') + ' «' + escapeHtml(raw) + '»</div>';
  } else {
    searchResults.innerHTML = searchHits.slice(0, 8).map((r, i) => `
<div class="search-result-item" onmousedown="event.preventDefault()" onclick="handleSearchResult(${i})">
<div class="search-result-icon" style="background:${r.color};">${escapeHtml(r.icon)}</div>
<div class="search-result-info"><div class="search-result-title">${escapeHtml(r.title)}</div><div class="search-result-sub">${escapeHtml(r.sub)}</div></div>
<div class="search-result-type">${r.type}</div>
</div>`).join('');
  }
  searchResults.classList.add('show');
}
function renderSearch() {
  const raw = searchInput.value.trim(), query = raw.toLowerCase();
  if (query.length < 2) { searchHits = []; searchResults.classList.remove('show'); return; }
  const requestId = ++profileSearchRequest;
  searchHits = findSearchHits(query);
  paintSearchResults(raw);
  if (BACKEND && sb && typeof backendSearchProfiles === 'function') {
    backendSearchProfiles(raw).then(profiles => {
      if (requestId !== profileSearchRequest || searchInput.value.trim().toLowerCase() !== query) return;
      const existing = new Set(searchHits.filter(h => h.profileId).map(h => h.profileId));
      profiles.forEach(p => {
        if (existing.has(p.id)) return;
        searchHits.push({ type: 'Профиль', title: p.name || ('@' + p.username), sub: '@' + p.username + (p.subtitle ? ' · ' + p.subtitle : ''), icon: '👤', color: '#e8f5f2', profileId: p.id, profile: p, action: () => openPublicProfile(p) });
      });
      paintSearchResults(raw);
    });
  }
}
function handleSearchResult(idx) {
  const hit = searchHits[idx];
  searchResults.classList.remove('show');
  searchInput.value = '';
  searchInput.blur();
  if (typeof closeMobileSearch === 'function') closeMobileSearch();
  if (hit && hit.action) hit.action();
}
searchInput.addEventListener('input', renderSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && searchHits.length) handleSearchResult(0); // Enter открывает первый результат
  if (e.key === 'Escape') { searchResults.classList.remove('show'); searchInput.blur(); }
});
searchInput.addEventListener('blur', () => { setTimeout(() => searchResults.classList.remove('show'), 250); });
searchInput.addEventListener('focus', () => { if (searchInput.value.trim().length >= 2) renderSearch(); });

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
overlay.addEventListener('click', (e) => {
if (e.target === overlay) { overlay.classList.remove('show'); currentDetailProjectId = null; }
});
});

document.getElementById('btnCreateProject').addEventListener('click', openCreateModal);
