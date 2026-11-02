// Инициализация при загрузке страницы
initSettings(); // тема и язык применяются всегда (в том числе на экране входа)

async function bootApp() {
if (BACKEND) { try { await backendInit(); } catch (e) { console.error(e); } }   // сессия и данные из Supabase

if (!getActiveAccount()) {
  // Не вошли в аккаунт: показываем экран входа, само приложение не запускаем
  if (activeUserId()) logout();   // в сессии лежит id удалённого аккаунта
  else showAuthScreen('login');
} else {
  // Вошли: запускаем приложение с данными этого аккаунта
  updateProfile();
  renderPosts('top');
  renderFundraisingProjects();
  renderMyProjects();
  updateMyProjectsStats(getProjects());
  renderAllCommunities();
  renderFundedProjects();
  renderAssets();
  renderDiscFilters();
  renderDiscussions();
  if (BACKEND) loadDiscussions();
  renderProfileTab();
  renderAccountSettings();
  renderNotifs(); renderWallet();
  routeFromHash();   // открыли ссылку вида #/project/<id> — показываем страницу проекта
}
}
bootApp();
