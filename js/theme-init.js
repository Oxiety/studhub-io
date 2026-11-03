// Применяем тему и акцентный цвет ДО отрисовки страницы, чтобы не было "вспышки" светлой темы.
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('studhub_settings') || '{}');
    // Migrate any legacy/foreign accent (pistachio, purple, blue, etc.) to the mint palette.
    var mintAccents = ['#00e3a0', '#00c98b', '#16dda6', '#28e6b0', '#58f0c2'];
    if (!mintAccents.includes(String(s.accent || '').toLowerCase())) {
      s.accent = '#00E3A0';
      localStorage.setItem('studhub_settings', JSON.stringify(s));
    }
    var theme = s.theme || 'light';
    if (theme === 'system') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    if (s.accent) document.documentElement.style.setProperty('--accent', s.accent);
  } catch (e) {}
})();
