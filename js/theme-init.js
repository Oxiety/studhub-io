// Применяем тему и акцентный цвет ДО отрисовки страницы, чтобы не было "вспышки" светлой темы.
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('studhub_settings') || '{}');
    var theme = s.theme || 'light';
    if (theme === 'system') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    if (s.accent) document.documentElement.style.setProperty('--accent', s.accent);
  } catch (e) {}
})();
