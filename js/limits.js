// Ограничения длины текста во всём приложении.
// 1) Поля без maxlength получают лимит автоматически (в том числе созданные позже: комментарии, окна и т.д.).
// 2) Числовые поля не дают ввести больше допустимого (maxlength у type=number не работает).
// 3) Вставка из буфера обрезается до лимита (делает браузер по maxlength).
(function () {
  const DEFAULT_TEXT = 200, DEFAULT_AREA = 2000, DEFAULT_NUM_DIGITS = 9;
  const SKIP = new Set(['checkbox', 'radio', 'file', 'range', 'hidden', 'date', 'time', 'color', 'button', 'submit']);

  function applyLimit(el) {
    if (el.__limited) return; el.__limited = true;
    const tag = el.tagName;
    if (tag === 'TEXTAREA') { if (!el.hasAttribute('maxlength')) el.maxLength = DEFAULT_AREA; return; }
    if (tag !== 'INPUT') return;
    const type = (el.getAttribute('type') || 'text').toLowerCase();
    if (SKIP.has(type)) return;
    if (type === 'number') {
      el.addEventListener('input', () => {
        const max = el.max !== '' ? Number(el.max) : null;
        if (el.value.replace(/[^0-9]/g, '').length > DEFAULT_NUM_DIGITS) el.value = el.value.slice(0, DEFAULT_NUM_DIGITS);
        if (max !== null && Number(el.value) > max) el.value = String(max);
      });
      return;
    }
    if (!el.hasAttribute('maxlength')) el.maxLength = type === 'email' ? 100 : (type === 'password' ? 100 : DEFAULT_TEXT);
  }
  function scan(root) {
    if (root.nodeType !== 1) return;
    if (root.matches && root.matches('input,textarea')) applyLimit(root);
    root.querySelectorAll && root.querySelectorAll('input,textarea').forEach(applyLimit);
  }
  scan(document.body);
  new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(scan))).observe(document.body, { childList: true, subtree: true });

  // Счётчик символов под длинными полями (появляется, когда осталось мало)
  document.addEventListener('input', e => {
    const el = e.target;
    if (el.tagName !== 'TEXTAREA' || !el.maxLength || el.maxLength < 0) return;
    let c = el.nextElementSibling;
    if (!c || !c.classList || !c.classList.contains('char-counter')) {
      c = document.createElement('div'); c.className = 'char-counter'; el.insertAdjacentElement('afterend', c);
    }
    const left = el.maxLength - el.value.length;
    c.textContent = el.value.length + ' / ' + el.maxLength;
    c.classList.toggle('warn', left <= Math.max(20, el.maxLength * 0.1));
  });
})();
