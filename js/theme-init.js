// Применяем тему и акцент до первой отрисовки страницы.
(function () {
  try {
    var s = JSON.parse(localStorage.getItem('studhub_settings') || '{}');
    var accents = ['#00E3A0', '#4A7FD2', '#D7783D', '#8464CE', '#D35461'];
    var legacy = {
      '#2D8A7A': '#00E3A0',
      '#3B82F6': '#4A7FD2',
      '#8B5CF6': '#8464CE',
      '#E8590C': '#D7783D',
      '#D6336C': '#D35461',
      '#00C98B': '#00E3A0',
      '#16DDA6': '#00E3A0',
      '#28E6B0': '#00E3A0',
      '#58F0C2': '#00E3A0'
    };
    var current = String(s.accent || '').toUpperCase();
    if (legacy[current]) {
      s.accent = legacy[current];
      localStorage.setItem('studhub_settings', JSON.stringify(s));
    } else if (!accents.includes(current)) {
      s.accent = '#00E3A0';
      localStorage.setItem('studhub_settings', JSON.stringify(s));
    } else {
      s.accent = current;
    }
    var theme = s.theme || 'light';
    if (theme === 'system') theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.setProperty('--accent', s.accent);
  } catch (e) {}
})();
