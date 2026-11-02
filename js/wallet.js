// Кошелёк: баланс, история, пополнение (демо-режим) и списание при поддержке проектов.
// ВАЖНО: это учебная имитация. Данные карты нигде не сохраняются, деньги реально не списываются.
// Для настоящих платежей нужен платёжный провайдер (ЮKassa, CloudPayments, Stripe...) и серверная часть.
const TOPUP_AMOUNTS = [300, 500, 1000, 2000, 5000];
const TOPUP_MIN = 100, TOPUP_MAX = 50000, WALLET_MAX = 500000;
let topupMethod = 'card';
let txFilter = 'all';

function getWallet() {
  if (BACKEND) return WALLET_CACHE;
  const w = lsGet('studhub_wallet', null);
  return (w && typeof w.balance === 'number' && Array.isArray(w.tx)) ? w : { balance: 0, tx: [] };
}
function saveWallet(w) { if (BACKEND) return; lsSet('studhub_wallet', w); }
function walletBalance() { return getWallet().balance; }

// Положить операцию в историю и изменить баланс (amount > 0 — пополнение, < 0 — списание)
function addTransaction(tx) {
  const w = getWallet();
  w.balance += tx.amount;
  w.tx.unshift({ id: 'tx' + Date.now() + Math.random().toString(36).slice(2, 6), ts: Date.now(), ...tx });
  saveWallet(w);
  renderWallet();
}

/* ---------- Отображение ---------- */
function renderWallet() {
  const w = getWallet();
  const bal = fmtRub(w.balance);
  ['walletBalance', 'walletChipAmount', 'supportBalance'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = bal; });
  const nav = document.getElementById('navWalletBalance'); if (nav) nav.textContent = bal;
  const topped = w.tx.filter(x => x.amount > 0).reduce((s, x) => s + x.amount, 0);
  const spent = -w.tx.filter(x => x.amount < 0).reduce((s, x) => s + x.amount, 0);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('walletTopped', fmtRub(topped)); set('walletSpent', fmtRub(spent));
  set('walletBacked', getSupportedProjectIds().length);
  const list = document.getElementById('txList'); if (!list) return;
  const rows = w.tx.filter(x => txFilter === 'all' || (txFilter === 'in' ? x.amount > 0 : x.amount < 0));
  list.innerHTML = rows.length ? '<div class="tx-list">' + rows.map(x => {
    const inn = x.amount > 0;
    const title = x.kind === 'topup' ? t('w.tx.topup') + ' · ' + t('w.method.' + x.method) : x.kind === 'income' ? (currentLang === 'en' ? 'Received for: ' : 'Получено на проект: ') + escapeHtml(x.title || '') : t('w.tx.support') + escapeHtml(x.title || '');
    const d = new Date(x.ts).toLocaleString(currentLang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `<div class="tx-row"><div class="tx-icon ${inn ? '' : 'out'}">${x.kind === 'income' ? '💰' : inn ? '⬇️' : '💚'}</div><div class="tx-info"><div class="tx-title">${title}</div><div class="tx-meta">${d}${x.card ? ' · ' + x.card : ''}</div></div><div class="tx-amount ${inn ? 'in' : 'out'}">${inn ? '+' : '−'}${fmtRub(Math.abs(x.amount))}</div></div>`;
  }).join('') + '</div>' : `<div class="empty-state"><div class="empty-state-icon">👛</div><div class="empty-state-title">${t('w.empty')}</div><div class="empty-state-desc">${t('w.empty.d')}</div><button class="btn-submit" onclick="openTopUp()">${t('w.topup')}</button></div>`;
}
function setTxFilter(f, btn) {
  txFilter = f;
  btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
  renderWallet();
}

/* ---------- Окно пополнения ---------- */
function openTopUp(prefill) {
  document.getElementById('topupChips').innerHTML = TOPUP_AMOUNTS.map(a => `<button type="button" class="tab-btn" onclick="pickTopupAmount(${a})">${fmtRub(a)}</button>`).join('');
  const amount = prefill ? Math.min(TOPUP_MAX, Math.max(TOPUP_MIN, Math.ceil(prefill / 50) * 50)) : '';
  document.getElementById('topupAmount').value = amount;
  ['cardNumber', 'cardExp', 'cardCvc'].forEach(id => document.getElementById(id).value = '');
  ['errAmount', 'errCard', 'errExp', 'errCvc'].forEach(id => document.getElementById(id).textContent = '');
  pickMethod('card');
  syncTopupChips();
  const btn = document.getElementById('topupPayBtn'); btn.disabled = false; btn.textContent = t('w.pay');
  openModal('topupModal');
}
// при вводе убираем старые сообщения об ошибках
document.addEventListener('input', e => { if (e.target.closest && e.target.closest('#topupModal')) ['errAmount','errCard','errExp','errCvc'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; }); });
function pickTopupAmount(v) { document.getElementById('topupAmount').value = v; syncTopupChips(); }
function syncTopupChips() {
  const v = +document.getElementById('topupAmount').value;
  document.querySelectorAll('#topupChips .tab-btn').forEach((b, i) => b.classList.toggle('active', TOPUP_AMOUNTS[i] === v));
  document.getElementById('topupTotal').textContent = fmtRub(v > 0 ? v : 0);
}
function pickMethod(m) {
  topupMethod = m;
  document.querySelectorAll('#methodGrid .method-tile').forEach(b => b.classList.toggle('active', b.dataset.method === m));
  document.getElementById('cardFields').style.display = m === 'card' ? 'grid' : 'none';
}

/* ---------- Форматирование и проверка карты ---------- */
function fmtCardNumber(el) { el.value = el.value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim(); }
function fmtCardExp(el) { let v = el.value.replace(/\D/g, '').slice(0, 4); if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2); el.value = v; }
function luhnOk(num) { // алгоритм Луна — отсеивает опечатки в номере
  let sum = 0, alt = false;
  for (let i = num.length - 1; i >= 0; i--) { let d = +num[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } sum += d; alt = !alt; }
  return sum % 10 === 0;
}
function expOk(v) {
  const m = /^(\d{2})\/(\d{2})$/.exec(v); if (!m) return false;
  const mm = +m[1], yy = 2000 + +m[2]; if (mm < 1 || mm > 12) return false;
  const now = new Date(); return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
}

function submitTopUp() {
  const amount = Math.floor(+document.getElementById('topupAmount').value);
  const err = (id, msg) => { document.getElementById(id).textContent = msg || ''; return !!msg; };
  let bad = false;
  bad = err('errAmount', (amount >= TOPUP_MIN && amount <= TOPUP_MAX) ? '' : t('w.err.amount')) || bad;
  if (!bad && walletBalance() + amount > WALLET_MAX) bad = err('errAmount', t('w.err.limit'));
  let last4 = '';
  if (topupMethod === 'card') {
    const num = document.getElementById('cardNumber').value.replace(/\s/g, '');
    bad = err('errCard', (num.length >= 13 && luhnOk(num)) ? '' : t('w.err.card')) || bad;
    bad = err('errExp', expOk(document.getElementById('cardExp').value) ? '' : t('w.err.exp')) || bad;
    bad = err('errCvc', /^\d{3,4}$/.test(document.getElementById('cardCvc').value) ? '' : t('w.err.cvc')) || bad;
    last4 = num.slice(-4);
  }
  if (bad) return;
  // Имитация обращения к платёжному провайдеру
  const btn = document.getElementById('topupPayBtn'); btn.disabled = true; btn.textContent = t('w.processing');
  const finish = () => {
    closeModal('topupModal');
    document.getElementById('cardNumber').value = ''; document.getElementById('cardCvc').value = '';
    showToast(t('w.ok') + fmtRub(amount), 'success');
    pushNotif('donations', t('w.notif.topup') + '<strong>' + fmtRub(amount) + '</strong>');
  };
  if (BACKEND) { // демо-пополнение на сервере (виртуальные деньги)
    backendTopup(amount, topupMethod, last4).then(finish).catch(e => { btn.disabled = false; btn.textContent = t('w.pay'); showToast(backendErrorText(e), 'error'); });
  } else setTimeout(() => {
    addTransaction({ kind: 'topup', amount, method: topupMethod, card: last4 ? '•••• ' + last4 : '' }); // номер карты целиком и CVC не сохраняем
    finish();
  }, 1100);
}

/* ---------- Оплата поддержки проекта из кошелька ---------- */
// Возвращает true, если деньги списаны. Вызывается из submitSupport() в fundraising.js
function chargeForSupport(amount, project) {
  if (amount > walletBalance()) {
    showToast(t('w.need') + fmtRub(amount - walletBalance()), 'error');
    openTopUp(amount - walletBalance());
    return false;
  }
  if (getSettings().confirmPay && !confirm(t('w.confirm') + fmtRub(amount) + ' → «' + project.name + '»?')) return false;
  if (BACKEND) return true;   // списание выполнит сервер (функция support_project)
  addTransaction({ kind: 'support', amount: -amount, projectId: project.id, title: project.name });
  pushNotif('donations', t('w.notif.support') + '<strong>' + escapeHtml(project.name) + '</strong>');
  return true;
}
