// Профиль пользователя и его редактирование
function updateProfile() {
const user = (typeof viewingProfile !== 'undefined' && viewingProfile) ? viewingProfile : getCurrentUser();
const isOwnProfile = !(typeof viewingProfile !== 'undefined' && viewingProfile) || viewingProfile.id === activeUserId();
const initials = getInitials(user.name);
const ownUser = getCurrentUser();
const ownInitials = getInitials(ownUser.name);
const avatarUrl = user.avatar_url || user.avatar || '';
const ownAvatarUrl = ownUser.avatar_url || ownUser.avatar || '';
const paintAvatar = (el, url, text) => { if (!el) return; el.textContent = url ? '' : text; el.style.backgroundImage = url ? `url(\"${String(url).replace(/[\"\\]/g, '')}\")` : ''; el.style.backgroundSize = url ? 'cover' : ''; el.style.backgroundPosition = url ? 'center' : ''; el.style.backgroundRepeat = 'no-repeat'; };
document.getElementById('profileName').textContent = user.name || 'Студент';
const editSection = document.querySelector('.profile-edit-section'); if (editSection) editSection.style.display = isOwnProfile ? '' : 'none';
const coverEdit = document.querySelector('.cover-edit-btn'); if (coverEdit) coverEdit.style.display = isOwnProfile ? '' : 'none';
const profileAvatar = document.getElementById('profileAvatarLarge');
const headerAvatar = document.getElementById('userAvatarHeader');
paintAvatar(profileAvatar, avatarUrl, initials);
paintAvatar(headerAvatar, ownAvatarUrl, ownInitials);
document.getElementById('userNameHeader').textContent = ownUser.name;
document.querySelectorAll('.composer-avatar').forEach(el => paintAvatar(el, ownAvatarUrl, ownInitials));
if (document.getElementById('profileSubtitle')) document.getElementById('profileSubtitle').textContent = [user.subtitle, user.city].filter(Boolean).join(' · ') || (isOwnProfile ? 'Добавьте информацию о себе в настройках профиля' : 'Пользователь StudHub');
const acc = isOwnProfile ? getActiveAccount() : null;
const isDemoProfile = false;
const emptyBio = 'Расскажите о себе: нажмите «Редактировать профиль».';
if (document.getElementById('profileAboutText')) document.getElementById('profileAboutText').textContent = user.bio || (isDemoProfile ? document.getElementById('profileAboutText').textContent : emptyBio);
if (!isDemoProfile || !isOwnProfile) { // у нового аккаунта пока нет подписчиков и отзывов
  [['statFollowers', 0], ['statFollowing', 0], ['statReviews', 0]].forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.textContent = v; });
}
const tagsBox = document.getElementById('profileInterests');
if (tagsBox && (!isDemoProfile || !isOwnProfile)) tagsBox.innerHTML = (user.interests || '').split(',').map(x => x.trim()).filter(Boolean).map(x => '<span class="interest-tag">' + escapeHtml(x) + '</span>').join('') || 'Пока не указаны';
const campusCity = document.querySelector('.campus-info-city'); if(campusCity) campusCity.textContent = user.city || '';
const campusInfo = eduFind(user.campus, user.city);
const campusLabel = campusInfo ? (campusInfo.id === 'other' ? 'Другое учебное заведение' : campusInfo.short) : 'Не указано';
const campusName = document.querySelector('.campus-info-name'); if (campusName) { campusName.textContent = campusLabel; campusName.title = campusInfo && campusInfo.full || ''; }
const campusAva = document.querySelector('.campus-info-avatar'); if (campusAva) campusAva.textContent = (campusInfo ? campusInfo.short : '?')[0];
if (document.getElementById('profileBio')) document.getElementById('profileBio').textContent = user.bio || (isOwnProfile ? 'Расскажите о себе: нажмите «Редактировать профиль».' : 'Пользователь пока не рассказал о себе.');
if (document.getElementById('profileJoined')) document.getElementById('profileJoined').textContent = '@' + (user.username || 'student') + (acc ? ' · На StudHub с ' + new Date(acc.createdAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) : '');
const about = document.getElementById('profileAboutText'); if (about) about.textContent = user.bio || 'Пользователь пока не рассказал о себе.';
const projects = getProjects();
document.getElementById('profileProjectsCount').textContent = projects.length;
document.getElementById('profileTabProjectsCount').textContent = projects.length;
}

// ---------- Редактирование профиля ----------
const EP_MAX_INTERESTS = 8;
const ep = { city: '', campus: '', course: '', interests: [], avatarFile: null, avatarUrl: '', origUsername: '', usernameOk: true, usernameTimer: 0, blobUrl: '' };
const epEl = id => document.getElementById(id);

// Выпадающий список с поиском: значение принимается только из списка
function epCombo({ root, input, list, items, selectedValue, onSelect }) {
  const box = epEl(root), inp = epEl(input), lst = epEl(list);
  let shown = [], active = -1;
  const label = v => { const it = items().find(x => x.value === v); return it ? it.label : ''; };
  const hl = (text, q) => { if (!q) return escapeHtml(text); const k = text.toLowerCase().indexOf(q.toLowerCase()); return k < 0 ? escapeHtml(text) : escapeHtml(text.slice(0, k)) + '<mark>' + escapeHtml(text.slice(k, k + q.length)) + '</mark>' + escapeHtml(text.slice(k + q.length)); };
  function render(q) {
    const query = (q || '').trim().toLowerCase();
    shown = items().filter(x => !query || (x.label + ' ' + (x.sub || '') + ' ' + (x.alias || '')).toLowerCase().includes(query));
    const sel = selectedValue();
    lst.innerHTML = shown.length ? shown.map((x, i) => `<div class="ep-opt${x.value === sel ? ' selected' : ''}" role="option" data-i="${i}"><span>${hl(x.label, query)}${x.sub ? `<small>${hl(x.sub, query)}</small>` : ''}</span></div>`).join('') : '<div class="ep-empty">Ничего не найдено — выберите вариант из списка</div>';
    active = shown.findIndex(x => x.value === sel); if (active < 0 && query) active = 0;
    paintActive(true);
  }
  function paintActive(scroll) {
    lst.querySelectorAll('.ep-opt').forEach((el, i) => el.classList.toggle('active', i === active));
    const a = lst.querySelector('.ep-opt.active'); if (a && scroll) a.scrollIntoView({ block: 'nearest' });
  }
  function open() {
    if (inp.disabled) return;
    render(''); box.classList.add('open'); inp.setAttribute('aria-expanded', 'true');
    const r = box.getBoundingClientRect(); box.classList.toggle('up', window.innerHeight - r.bottom < 270 && r.top > 270);
  }
  function close(revert) { box.classList.remove('open'); inp.setAttribute('aria-expanded', 'false'); if (revert) inp.value = label(selectedValue()); }
  function pick(i) { const it = shown[i]; if (!it) return; onSelect(it.value); inp.value = it.label; close(false); }
  inp.addEventListener('focus', () => { open(); inp.select(); });
  inp.addEventListener('click', () => { if (!box.classList.contains('open')) open(); });
  inp.addEventListener('input', () => { if (!box.classList.contains('open')) box.classList.add('open'); render(inp.value); });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!box.classList.contains('open')) open(); if (!shown.length) return; active = (active + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % shown.length; paintActive(true); }
    else if (e.key === 'Enter') { if (box.classList.contains('open')) { e.preventDefault(); pick(active >= 0 ? active : 0); } }
    else if (e.key === 'Escape') { if (box.classList.contains('open')) { e.stopPropagation(); close(true); } }
  });
  inp.addEventListener('blur', () => {
    const typed = inp.value.trim().toLowerCase(); const exact = typed && items().find(x => x.label.toLowerCase() === typed);
    if (exact && exact.value !== selectedValue()) onSelect(exact.value);
    close(true);
  });
  lst.addEventListener('mousedown', e => { e.preventDefault(); const o = e.target.closest('.ep-opt'); if (o) pick(+o.dataset.i); });
  lst.addEventListener('mousemove', e => { const o = e.target.closest('.ep-opt'); if (o && active !== +o.dataset.i) { active = +o.dataset.i; paintActive(false); } });
  return { sync() { inp.value = label(selectedValue()); } };
}

let epCityCombo, epCampusCombo;
function epCampusItems() {
  if (!eduCityValid(ep.city)) return [];
  return [...eduList(ep.city).map(x => ({ value: x.id, label: x.short, sub: x.full, alias: x.full })), { value: EDU_OTHER.id, label: EDU_OTHER.full }];
}
function epSetCampusEnabled() {
  const inp = epEl('epCampusInput'); const on = eduCityValid(ep.city);
  inp.disabled = !on; inp.placeholder = on ? 'Выберите учебное заведение' : 'Сначала выберите город';
  epCampusCombo.sync();
}
function epInitUi() {
  if (epInitUi.done) return; epInitUi.done = true;
  epCityCombo = epCombo({ root: 'epCityCombo', input: 'epCityInput', list: 'epCityList', items: () => eduCities().map(c => ({ value: c, label: c })), selectedValue: () => ep.city,
    onSelect: v => { if (v !== ep.city) { ep.city = v; if (!epCampusItems().some(x => x.value === ep.campus)) ep.campus = ''; } epMark('epCityInput', 'epCityErr', ''); epSetCampusEnabled(); } });
  epCampusCombo = epCombo({ root: 'epCampusCombo', input: 'epCampusInput', list: 'epCampusList', items: epCampusItems, selectedValue: () => ep.campus,
    onSelect: v => { ep.campus = v; epMark('epCampusInput', 'epCampusErr', ''); } });
  epEl('epCourses').innerHTML = EDU_COURSES.map(c => `<button type="button" class="ep-chip" role="radio" data-c="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
  epEl('epCourses').addEventListener('click', e => { const b = e.target.closest('.ep-chip'); if (!b) return; ep.course = ep.course === b.dataset.c ? '' : b.dataset.c; epPaintCourses(); });
  epEl('editProfileBio').addEventListener('input', epBioCount);
  epEl('editProfileName').addEventListener('input', () => { epMark('editProfileName', 'epNameErr', ''); epEl('epHeroName').textContent = epEl('editProfileName').value.trim() || 'Студент'; });
  epEl('editProfileUsername').addEventListener('input', epUsernameInput);
  epEl('editProfileAvatar').addEventListener('change', epAvatarChosen);
  const ti = epEl('epInterestInput');
  ti.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); epAddInterest(ti.value); ti.value = ''; }
    else if (e.key === 'Backspace' && !ti.value && ep.interests.length) { ep.interests.pop(); epPaintInterests(); }
  });
  ti.addEventListener('blur', () => { if (ti.value.trim()) { epAddInterest(ti.value); ti.value = ''; } });
  epEl('epTags').addEventListener('click', e => { const b = e.target.closest('button[data-rm]'); if (b) { ep.interests.splice(+b.dataset.rm, 1); epPaintInterests(); } });
  epEl('epSuggest').addEventListener('click', e => { const b = e.target.closest('button[data-s]'); if (b) epAddInterest(b.dataset.s); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && epEl('editProfileModal').classList.contains('show')) closeEditProfileModal(); });
}
function epMark(inputId, errId, msg) { const i = epEl(inputId), e = epEl(errId); if (i) i.classList.toggle('invalid', !!msg); if (e) e.textContent = msg || ''; }
function epBioCount() { const n = epEl('editProfileBio').value.length; epEl('epBioCount').textContent = n + '/300'; }
function epPaintCourses() { epEl('epCourses').querySelectorAll('.ep-chip').forEach(b => { const on = b.dataset.c === ep.course; b.classList.toggle('active', on); b.setAttribute('aria-checked', on); }); }
function epAddInterest(raw) {
  const v = String(raw || '').replace(/[,;#]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24); if (!v) return;
  if (ep.interests.some(x => x.toLowerCase() === v.toLowerCase())) return;
  if (ep.interests.length >= EP_MAX_INTERESTS) { showToast('Можно указать не больше ' + EP_MAX_INTERESTS + ' интересов', 'error'); return; }
  ep.interests.push(v); epPaintInterests();
}
function epPaintInterests() {
  const box = epEl('epTags'), input = epEl('epInterestInput');
  box.querySelectorAll('.ep-tag').forEach(x => x.remove());
  ep.interests.forEach((t, i) => { const el = document.createElement('span'); el.className = 'ep-tag'; el.innerHTML = escapeHtml(t) + `<button type="button" data-rm="${i}" aria-label="Убрать">×</button>`; box.insertBefore(el, input); });
  epEl('epInterestsCount').textContent = ep.interests.length + '/' + EP_MAX_INTERESTS;
  input.placeholder = ep.interests.length ? 'Ещё…' : 'Добавить интерес и нажать Enter';
  const left = EDU_INTERESTS.filter(x => !ep.interests.some(y => y.toLowerCase() === x.toLowerCase())).slice(0, 8);
  epEl('epSuggest').innerHTML = ep.interests.length >= EP_MAX_INTERESTS ? '' : left.map(x => `<button type="button" data-s="${escapeHtml(x)}">+ ${escapeHtml(x)}</button>`).join('');
}
function epPaintAvatar(url, initials) {
  const el = epEl('epAvatarPreview'); el.textContent = url ? '' : initials; el.style.backgroundImage = url ? `url("${String(url).replace(/["\\]/g, '')}")` : '';
}
function epAvatarChosen() {
  const f = epEl('editProfileAvatar').files[0]; if (!f) return;
  if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) { showToast('Поддерживаются PNG, JPG, WEBP и GIF', 'error'); epEl('editProfileAvatar').value = ''; return; }
  if (f.size > 2 * 1024 * 1024) { showToast('Аватар должен быть не больше 2 МБ', 'error'); epEl('editProfileAvatar').value = ''; return; }
  if (ep.blobUrl) URL.revokeObjectURL(ep.blobUrl);
  ep.avatarFile = f; ep.blobUrl = URL.createObjectURL(f); epPaintAvatar(ep.blobUrl); epEl('epAvatarReset').hidden = false;
}
function epResetAvatar() {
  if (ep.blobUrl) URL.revokeObjectURL(ep.blobUrl); ep.blobUrl = ''; ep.avatarFile = null; epEl('editProfileAvatar').value = '';
  epPaintAvatar(ep.avatarUrl, getInitials(epEl('editProfileName').value || getCurrentUser().name)); epEl('epAvatarReset').hidden = true;
}
function epUsernameInput() {
  const inp = epEl('editProfileUsername'); const v = inp.value.trim().replace(/^@/, '').toLowerCase();
  epEl('epHeroUser').textContent = '@' + (v || 'username');
  clearTimeout(ep.usernameTimer); ep.usernameOk = false; inp.classList.remove('valid');
  const hint = epEl('epUsernameHint');
  if (!v) { epMark('editProfileUsername', 'epUsernameErr', ''); ep.usernameOk = false; return; }
  if (!/^[a-z0-9_.]{3,20}$/.test(v)) { epMark('editProfileUsername', 'epUsernameErr', /[^a-z0-9_.]/.test(v) ? 'Только латиница, цифры, точка и «_»' : 'От 3 до 20 символов'); return; }
  epMark('editProfileUsername', 'epUsernameErr', '');
  if (v === ep.origUsername || typeof BACKEND === 'undefined' || !BACKEND || typeof sb === 'undefined' || !sb) { ep.usernameOk = true; inp.classList.add('valid'); hint.textContent = 'Свободен'; return; }
  hint.textContent = 'Проверяем…';
  ep.usernameTimer = setTimeout(async () => {
    try {
      const { data, error } = await sb.rpc('is_username_available', { candidate: v });
      if (epEl('editProfileUsername').value.trim().replace(/^@/, '').toLowerCase() !== v) return;
      if (error) { ep.usernameOk = true; hint.textContent = '3–20 символов: латиница, цифры, точка и «_»'; return; }   // проверка недоступна — решит сервер при сохранении
      ep.usernameOk = data !== false;
      if (ep.usernameOk) { inp.classList.add('valid'); hint.textContent = 'Свободен'; } else { epMark('editProfileUsername', 'epUsernameErr', 'Этот никнейм уже занят'); hint.textContent = ''; }
    } catch (e) { ep.usernameOk = true; }
  }, 350);
}

function epParseCourse(subtitle) { const first = String(subtitle || '').split('·')[0].trim(); return EDU_COURSES.includes(first) ? first : ''; }

function openEditProfileModal() {
  if (typeof viewingProfile !== 'undefined' && viewingProfile) return;
  epInitUi();
  const user = getCurrentUser();
  epEl('editProfileName').value = user.name || '';
  epEl('editProfileUsername').value = user.username || '';
  epEl('editProfileBio').value = user.bio || '';
  ep.origUsername = user.username || ''; ep.usernameOk = true;
  // город: только из справочника (старое свободное значение, которого в списке нет, придётся выбрать заново)
  const legacyCity = EDU_LEGACY[user.campus];
  ep.city = eduCityValid(user.city) ? user.city : (!user.city && legacyCity ? legacyCity : '');
  const known = eduFind(user.campus, ep.city);
  ep.campus = known && (known.id === 'other' || eduList(ep.city).some(x => x.id === known.id)) ? known.id : '';
  ep.course = epParseCourse(user.subtitle);
  ep.interests = String(user.interests || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, EP_MAX_INTERESTS);
  ep.avatarFile = null; ep.avatarUrl = user.avatar_url || user.avatar || '';
  if (ep.blobUrl) { URL.revokeObjectURL(ep.blobUrl); ep.blobUrl = ''; }
  epEl('editProfileAvatar').value = ''; epEl('epAvatarReset').hidden = true;
  epPaintAvatar(ep.avatarUrl, getInitials(user.name));
  epEl('epHeroName').textContent = user.name || 'Студент'; epEl('epHeroUser').textContent = '@' + (user.username || 'username');
  epEl('epUsernameHint').textContent = '3–20 символов: латиница, цифры, точка и «_»';
  ['editProfileName', 'editProfileUsername', 'epCityInput', 'epCampusInput'].forEach(id => epEl(id).classList.remove('invalid', 'valid'));
  ['epNameErr', 'epUsernameErr', 'epCityErr', 'epCampusErr'].forEach(id => epEl(id).textContent = '');
  epCityCombo.sync(); epSetCampusEnabled(); epPaintCourses(); epPaintInterests(); epBioCount();
  epEl('epInterestInput').value = '';
  const save = epEl('epSave'); save.disabled = false; save.textContent = 'Сохранить';
  epEl('editProfileModal').classList.add('show');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { if (!matchMedia('(max-width:600px)').matches) epEl('editProfileName').focus(); }, 50);
}
function closeEditProfileModal() {
  epEl('editProfileModal').classList.remove('show'); document.body.style.overflow = '';
  if (ep.blobUrl) { URL.revokeObjectURL(ep.blobUrl); ep.blobUrl = ''; }
}
function epValidate() {
  let firstBad = null; const bad = (id, errId, msg) => { epMark(id, errId, msg); if (!firstBad) firstBad = id; };
  if (!epEl('editProfileName').value.trim()) bad('editProfileName', 'epNameErr', 'Укажите имя');
  const u = epEl('editProfileUsername').value.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_.]{3,20}$/.test(u)) bad('editProfileUsername', 'epUsernameErr', 'Никнейм: 3–20 символов, латиница, цифры, точка и «_»');
  else if (!ep.usernameOk) bad('editProfileUsername', 'epUsernameErr', 'Этот никнейм уже занят');
  if (!eduCityValid(ep.city)) bad('epCityInput', 'epCityErr', 'Выберите город из списка');
  if (!ep.campus) bad('epCampusInput', 'epCampusErr', eduCityValid(ep.city) ? 'Выберите учебное заведение из списка' : 'Сначала выберите город');
  if (firstBad) { const el = epEl(firstBad); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (!el.disabled) el.focus({ preventScroll: true }); }
  return !firstBad;
}
async function saveProfile() {
  if (epEl('epInterestInput').value.trim()) { epAddInterest(epEl('epInterestInput').value); epEl('epInterestInput').value = ''; }
  if (!epValidate()) return;
  const btn = epEl('epSave'); btn.disabled = true; btn.textContent = 'Сохраняем…';
  const restore = () => { btn.disabled = false; btn.textContent = 'Сохранить'; };
  try {
    const user = getCurrentUser();
    const newUsername = epEl('editProfileUsername').value.trim().replace(/^@/, '').toLowerCase();
    if (typeof BACKEND !== 'undefined' && BACKEND && newUsername !== (user.username || '')) {
      const usernameResult = await backendUpdateUsername(newUsername);
      if (usernameResult.error) { epMark('editProfileUsername', 'epUsernameErr', usernameResult.error === 'auth.err.usernameTaken' ? 'Этот никнейм уже занят' : 'Не удалось сохранить никнейм'); restore(); return; }
    }
    user.name = epEl('editProfileName').value.trim();
    user.username = newUsername;
    user.bio = epEl('editProfileBio').value.trim();
    user.city = ep.city;
    user.campus = ep.campus;
    const short = eduShort(ep.campus, ep.city);
    user.subtitle = [ep.course || 'Студент', ep.campus !== 'other' ? short : ''].filter(Boolean).join(' · ');
    user.interests = ep.interests.join(', ');
    const avatarFile = ep.avatarFile;
    if (avatarFile && (!BACKEND || !sb)) { showToast('Для общей аватарки необходимо подключение к Supabase', 'error'); restore(); return; }
    if (BACKEND && sb && typeof backendSavePublicProfile === 'function') {
      const result = await backendSavePublicProfile(user, avatarFile || null);
      if (result && result.error) { console.error('Ошибка сохранения профиля:', result.error); showToast('Не удалось сохранить профиль: ' + (result.message || result.error.message || 'проверьте настройки Supabase'), 'error'); restore(); return; }
      if (result && result.avatar_url) user.avatar_url = result.avatar_url;
    }
    saveCurrentUser(user);
    closeEditProfileModal();
    updateProfile();
    renderAllCommunities();
    showToast('Профиль обновлён!', 'success');
  } catch (e) { console.error(e); showToast('Не удалось сохранить профиль', 'error'); restore(); }
}
