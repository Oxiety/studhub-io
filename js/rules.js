// Правила платформы: единый источник текста (RU/EN), страница «Правила» и окно на экране входа.
// Как поменять правила: редактируйте массивы sections ниже. Номера пунктов (1.1, 1.2 …) проставляются сами.
// Если меняете смысл правил — обновите дату редакции (date) и поднимите версию кэша в sw.js.

// Контакт администрации (email или Telegram), например 'support@studhub.example'.
// Пока пусто — строка с контактом в правилах не показывается.
const RULES_CONTACT = '';

const RULES_DOC = {
  ru: {
    crumb: 'Документы', title: 'Правила платформы', date: 'Редакция от 31 октября 2026',
    lead: 'StudHub — краудфандинг студенческих проектов. Эти правила помогают сделать платформу честной и безопасной и для авторов, и для тех, кто их поддерживает.',
    shortTitle: 'Коротко', tocTitle: 'Содержание', ok: 'Понятно', contactLabel: 'Контакт администрации: ',
    short: [
      'Рассказывайте о проекте только правду и тратьте собранное на заявленную цель.',
      'Уважайте других: никаких оскорблений, травли и спама.',
      'Публикуйте только то, на что у вас есть права.',
      'Не накручивайте оценки и не заводите несколько аккаунтов.',
      'Сейчас кошелёк работает в демо-режиме: настоящие деньги не списываются и не выводятся.'
    ],
    sections: [
      { t: 'Общие положения', p: [
        'StudHub — площадка краудфандинга студенческих проектов: авторы публикуют проекты и сборы, а остальные пользователи их поддерживают, обсуждают и оценивают.',
        'Регистрируясь и пользуясь платформой, вы подтверждаете, что прочитали эти правила и согласны их соблюдать.',
        'Платформа создана для студентов и всех, кто участвует в студенческих проектах. Для регистрации вам должно быть не менее 14 лет; если вам нет 18, пользуйтесь платформой с согласия родителей или законных представителей.',
        'Правила могут обновляться. Актуальная редакция всегда доступна на этой странице, её дата указана вверху. Продолжая пользоваться платформой после обновления, вы принимаете новую редакцию.'
      ] },
      { t: 'Аккаунт', p: [
        'Указывайте достоверные имя и email. Не выдавайте себя за другого человека, преподавателя, вуз, команду StudHub или администрацию.',
        'Один человек — один аккаунт. Дополнительные аккаунты для накрутки оценок, обхода ограничений или обмана других пользователей запрещены.',
        'Юзернейм (3–20 символов: латиница, цифры, точка и подчёркивание), как и имя, не должен содержать оскорблений, чужих имён и названий, вводящих в заблуждение. Если он нарушает правила, администрация вправе потребовать его сменить.',
        'Храните пароль в тайне и не передавайте доступ другим людям. Вы отвечаете за действия, совершённые из вашего аккаунта.',
        'Аккаунт можно в любой момент удалить в разделе «Настройки». Вместе с ним безвозвратно удаляются ваши данные: проекты, кошелёк, комментарии.'
      ] },
      { t: 'Кошелёк и поддержка проектов', p: [
        'Сейчас кошелёк StudHub работает в демонстрационном режиме: пополнение и платежи виртуальные, деньги реально не списываются, данные банковских карт нигде не сохраняются. Виртуальные средства нельзя вывести или обменять на деньги.',
        'В демо-режиме действуют ограничения: пополнение — от 100 до 50 000 ₽ за раз, баланс кошелька — не более 500 000 ₽.',
        'Поддержка проекта — добровольное действие. Перед списанием средств платформа может попросить подтверждение. Проект можно поддержать анонимно: тогда ваше имя не показывается в списке поддержавших.',
        'Поддержка не является инвестицией или покупкой: автор не обязан приносить поддержавшим доход. Если автор обещает награды за поддержку, он обязан их выполнить.',
        'Запрещены накрутка баланса, попытки обойти правила начисления и списания и использование ошибок платформы для получения средств.',
        'Перед запуском реальных платежей эти правила будут дополнены отдельными условиями (офертой), в том числе о порядке возвратов.'
      ] },
      { t: 'Проекты и сборы', p: [
        'Описание проекта, цель, срок и сумма должны быть правдивыми. Нельзя вводить поддержавших в заблуждение о том, кто вы, чем занимаетесь и на что пойдут деньги.',
        'Цель и срок сбора после запуска изменить нельзя — продумайте их заранее. Название, описание и награды редактировать можно, но нельзя менять суть проекта так, чтобы поддержавшие оказались причастны к совсем другой затее. Проект, получивший поддержку, удалить нельзя.',
        'Собранные средства нужно тратить на заявленную цель. Если планы изменились, честно сообщите об этом поддержавшим.',
        'Автор отвечает за проект и выполнение обещаний, включая награды, и держит поддержавших в курсе хода работы.',
        'Нельзя запускать сборы на незаконные, опасные или мошеннические цели, на финансовые пирамиды, азартные игры, товары и услуги 18+, а также рекламировать товары и услуги под видом проекта.',
        'Если есть основания считать, что правила нарушены, администрация вправе скрыть проект, приостановить сбор или запросить у автора пояснения.'
      ] },
      { t: 'Общение: посты, обсуждения, комментарии', p: [
        'Уважайте друг друга. Критикуйте идею или работу, а не человека.',
        'Запрещены оскорбления, травля, угрозы, дискриминация и разжигание вражды по любому признаку: национальности, расе, полу, возрасту, религии, здоровью, вузу или курсу.',
        'Запрещены спам, флуд, повторные одинаковые публикации и реклама, не относящаяся к теме площадки.',
        'Публикуйте материалы в подходящих разделах и сообществах и давайте темам понятные названия.',
        'Не публикуйте личные данные других людей (телефоны, адреса, документы, переписки, фото) без их согласия.'
      ] },
      { t: 'Оценки и голосование', p: [
        'Лайки и оценки — ваше честное мнение о проекте, посте или обсуждении.',
        'Запрещены накрутка, обмен оценками «по договорённости», боты и голосование с нескольких аккаунтов.',
        'Не занижайте оценки из мести или личной неприязни.',
        'Оценки, полученные нечестным путём, могут быть аннулированы.'
      ] },
      { t: 'Файлы и авторские права', p: [
        'Загружайте и публикуйте только то, на что у вас есть права: свои работы или материалы, которые разрешено распространять.',
        'Используя чужие материалы (тексты, изображения, код, музыку), указывайте автора и источник и соблюдайте условия лицензии.',
        'Не выдавайте чужую работу за свою.',
        'Не загружайте вредоносные файлы и не оставляйте в публикуемых материалах пароли, ключи доступа и другие секретные данные.',
        'Если вы считаете, что ваши права нарушены, сообщите администрации: публикация будет проверена и при необходимости скрыта.'
      ] },
      { t: 'Запрещённый контент', p: [
        'Нельзя публиковать материалы, нарушающие законодательство Российской Федерации, а также порнографию, сцены жестокости, призывы к насилию, самоповреждению и суициду, пропаганду экстремизма, терроризма и наркотиков.',
        'Нельзя публиковать вредоносные программы, фишинговые и опасные ссылки.',
        'Нельзя предлагать услуги по написанию учебных работ на заказ и продавать готовые работы.',
        'Нельзя распространять заведомо ложную информацию, выдавая её за достоверную.'
      ] },
      { t: 'Безопасность платформы', p: [
        'Нельзя взламывать платформу, подбирать пароли, искать и использовать уязвимости, обходить ограничения и нарушать работу сервиса.',
        'Запрещены автоматический сбор данных и массовые запросы без разрешения администрации.',
        'Нашли ошибку или уязвимость — сообщите администрации и не пользуйтесь ею.'
      ] },
      { t: 'Модерация и меры', p: [
        'Администрация вправе без предварительного уведомления скрыть или удалить материал, нарушающий правила, и изменить нарушающие названия, описания и имена.',
        'В зависимости от тяжести и повторности нарушения применяются: предупреждение, удаление материала, временное ограничение публикаций, приостановка сбора, блокировка аккаунта.',
        'Особо серьёзные нарушения (мошенничество, угрозы, противоправный контент, взлом) ведут к немедленной блокировке. При необходимости администрация вправе обратиться в компетентные органы.',
        'Если вы не согласны с решением, напишите администрации и объясните причину: обращение будет рассмотрено повторно.',
        'Заметили нарушение — сообщите о нём администрации. Заведомо ложные обращения сами считаются нарушением.'
      ] },
      { t: 'Данные и конфиденциальность', p: [
        'Для работы платформы хранятся: email, имя, юзернейм, данные кошелька и история операций, ваши проекты, публикации, комментарии и оценки.',
        'Имя, юзернейм, публикации, комментарии и оценки могут быть видны другим пользователям. Не публикуйте то, что хотите сохранить в тайне.',
        'Если платформа работает без сервера (демо-режим), данные хранятся только в вашем браузере, и очистка данных браузера приведёт к их потере. Данные банковских карт платформа не сохраняет.',
        'Мы не продаём ваши данные. Они обрабатываются сервисами, на которых работает платформа (хостинг и база данных), и могут быть переданы по требованию закона.',
        'Этот раздел — краткое описание. Подробная политика конфиденциальности будет опубликована отдельным документом.'
      ] },
      { t: 'Ответственность', p: [
        'Платформа предоставляется «как есть»: мы стараемся обеспечить стабильную работу, но не гарантируем отсутствие сбоев и сохранность данных.',
        'За содержание проектов и публикаций отвечают их авторы. StudHub — площадка, она не является стороной договорённостей между автором проекта и поддержавшим.',
        'Вы несёте ответственность за свои действия на платформе.'
      ] },
      { t: 'Связь с администрацией', p: [
        'Вопросы по правилам, сообщения о нарушениях и обращения по блокировке направляйте администрации платформы.'
      ], contact: true }
    ]
  },

  en: {
    crumb: 'Documents', title: 'Platform rules', date: 'Version of 31 October 2026',
    lead: 'StudHub is a crowdfunding platform for student projects. These rules keep it fair and safe for authors and for the people who support them.',
    shortTitle: 'In short', tocTitle: 'Contents', ok: 'Got it', contactLabel: 'Administration contact: ',
    short: [
      'Be truthful about your project and spend the funds on the stated goal.',
      'Respect others: no insults, harassment or spam.',
      'Publish only what you have the rights to.',
      'Do not manipulate ratings or create multiple accounts.',
      'The wallet currently runs in demo mode: no real money is charged or withdrawn.'
    ],
    sections: [
      { t: 'General', p: [
        'StudHub is a crowdfunding platform for student projects: authors publish projects and fundraisers, and other users support, discuss and rate them.',
        'By registering and using the platform you confirm that you have read these rules and agree to follow them.',
        'The platform is built for students and everyone involved in student projects. You must be at least 14 to register; if you are under 18, use the platform with the consent of a parent or legal guardian.',
        'The rules may be updated. The current version is always available on this page, with its date at the top. By continuing to use the platform after an update you accept the new version.'
      ] },
      { t: 'Account', p: [
        'Provide a real name and email. Do not impersonate another person, a teacher, a university, the StudHub team or the administration.',
        'One person, one account. Extra accounts used to manipulate ratings, evade restrictions or deceive other users are forbidden.',
        'Your username (3–20 characters: Latin letters, digits, dot and underscore), like your name, must not contain insults, other people\'s names or misleading names. If it breaks the rules, the administration may require you to change it.',
        'Keep your password secret and do not share access. You are responsible for actions taken from your account.',
        'You can delete your account at any time in Settings. Your data (projects, wallet, comments) is permanently deleted with it.'
      ] },
      { t: 'Wallet and supporting projects', p: [
        'The StudHub wallet currently runs in demo mode: top-ups and payments are virtual, no real money is charged, and bank card details are never stored. Virtual funds cannot be withdrawn or exchanged for money.',
        'Demo mode has limits: a top-up is from 100 to 50,000 ₽ at a time, and the wallet balance may not exceed 500,000 ₽.',
        'Supporting a project is voluntary. The platform may ask you to confirm before funds are deducted. You can support a project anonymously, in which case your name is not shown in the list of supporters.',
        'Support is not an investment or a purchase: the author is not obliged to give supporters any income. If an author promises rewards for support, they must deliver them.',
        'Inflating a balance, circumventing crediting and debiting rules, and exploiting platform bugs to obtain funds are forbidden.',
        'Before real payments are launched, these rules will be supplemented with separate terms (an offer), including how refunds work.'
      ] },
      { t: 'Projects and fundraisers', p: [
        'A project\'s description, goal, deadline and amount must be truthful. Do not mislead supporters about who you are, what you do or what the money will be spent on.',
        'The goal and deadline cannot be changed after launch, so plan them in advance. The name, description and rewards can be edited, but you must not change the essence of the project so that supporters end up backing something that was not promised. A project that has received support cannot be deleted.',
        'Funds raised must be spent on the stated goal. If your plans change, tell your supporters honestly.',
        'The author is responsible for the project and for keeping promises, including rewards, and keeps supporters informed of progress.',
        'Do not run fundraisers for illegal, dangerous or fraudulent purposes, pyramid schemes, gambling, 18+ goods and services, or advertise goods and services disguised as a project.',
        'If there is reason to believe the rules have been broken, the administration may hide a project, suspend a fundraiser or ask the author for explanations.'
      ] },
      { t: 'Communication: posts, discussions, comments', p: [
        'Respect each other. Criticise the idea or the work, not the person.',
        'Insults, harassment, threats, discrimination and incitement of hatred on any grounds are forbidden: nationality, race, gender, age, religion, health, university or year of study.',
        'Spam, flooding, repeated identical posts and advertising unrelated to the platform are forbidden.',
        'Post in suitable sections and communities and give topics clear titles.',
        'Do not publish other people\'s personal data (phone numbers, addresses, documents, private messages, photos) without their consent.'
      ] },
      { t: 'Ratings and voting', p: [
        'Likes and ratings are your honest opinion of a project, post or discussion.',
        'Manipulation, rating swaps "by agreement", bots and voting from several accounts are forbidden.',
        'Do not lower ratings out of revenge or personal dislike.',
        'Ratings obtained dishonestly may be annulled.'
      ] },
      { t: 'Files and copyright', p: [
        'Upload and publish only what you have the rights to: your own work or material you are allowed to distribute.',
        'When using other people\'s material (text, images, code, music), credit the author and the source and follow the licence.',
        'Do not pass off someone else\'s work as your own.',
        'Do not upload malicious files, and do not leave passwords, access keys or other secrets in published material.',
        'If you believe your rights have been infringed, tell the administration: the publication will be reviewed and hidden if necessary.'
      ] },
      { t: 'Prohibited content', p: [
        'Do not publish material that breaks the law of the Russian Federation, nor pornography, graphic violence, calls to violence, self-harm or suicide, or promotion of extremism, terrorism and drugs.',
        'Do not publish malware, phishing or dangerous links.',
        'Do not offer to write academic work to order or sell ready-made work.',
        'Do not spread knowingly false information presented as true.'
      ] },
      { t: 'Platform security', p: [
        'Do not hack the platform, guess passwords, look for or exploit vulnerabilities, bypass restrictions or disrupt the service.',
        'Automated data collection and mass requests without the administration\'s permission are forbidden.',
        'If you find a bug or vulnerability, report it to the administration and do not exploit it.'
      ] },
      { t: 'Moderation and sanctions', p: [
        'The administration may, without prior notice, hide or delete material that breaks the rules, and change offending titles, descriptions and names.',
        'Depending on the severity and repetition of a violation, the sanctions are: a warning, removal of material, a temporary posting restriction, suspension of a fundraiser, or an account ban.',
        'Particularly serious violations (fraud, threats, illegal content, hacking) lead to an immediate ban. Where necessary, the administration may contact the competent authorities.',
        'If you disagree with a decision, write to the administration and explain why: the appeal will be reviewed again.',
        'If you notice a violation, report it to the administration. Knowingly false reports are themselves a violation.'
      ] },
      { t: 'Data and privacy', p: [
        'To operate the platform we store: your email, name, username, wallet data and transaction history, your projects, posts, comments and ratings.',
        'Your name, username, posts, comments and ratings may be visible to other users. Do not publish anything you want to keep private.',
        'If the platform runs without a server (demo mode), data is stored only in your browser, and clearing browser data will erase it. The platform does not store bank card details.',
        'We do not sell your data. It is processed by the services the platform runs on (hosting and database) and may be disclosed when the law requires.',
        'This section is a summary. A detailed privacy policy will be published as a separate document.'
      ] },
      { t: 'Liability', p: [
        'The platform is provided "as is": we aim for stable operation but do not guarantee the absence of outages or the safety of data.',
        'Authors are responsible for the content of their projects and posts. StudHub is a venue and is not a party to arrangements between a project author and a supporter.',
        'You are responsible for your own actions on the platform.'
      ] },
      { t: 'Contacting the administration', p: [
        'Send questions about the rules, reports of violations and ban appeals to the platform administration.'
      ], contact: true }
    ]
  }
};

function rulesEsc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function rulesDoc() { return RULES_DOC[currentLang] || RULES_DOC.ru; }

// Собирает HTML правил. prefix нужен, чтобы id якорей на странице и в окне не совпадали.
function buildRulesHtml(d, prefix) {
  const toc = d.sections.map((s, i) => '<button type="button" onclick="scrollRules(\'' + prefix + '-' + (i + 1) + '\')">' + (i + 1) + '. ' + rulesEsc(s.t) + '</button>').join('');
  const short = d.short.map(x => '<li>' + rulesEsc(x) + '</li>').join('');
  const secs = d.sections.map((s, i) => {
    const n = i + 1;
    const items = s.p.map((x, j) => '<li><span class="rules-n">' + n + '.' + (j + 1) + '</span><span>' + rulesEsc(x) + '</span></li>').join('');
    const contact = s.contact && RULES_CONTACT ? '<li><span class="rules-n">' + n + '.' + (s.p.length + 1) + '</span><span class="rules-contact">' + rulesEsc(d.contactLabel) + '<strong>' + rulesEsc(RULES_CONTACT) + '</strong></span></li>' : '';
    return '<section class="settings-card rules-section" id="' + prefix + '-' + n + '"><h2><span class="rules-num">' + n + '</span>' + rulesEsc(s.t) + '</h2><ol class="rules-list">' + items + contact + '</ol></section>';
  }).join('');
  return '<div class="rules-summary"><h2>' + rulesEsc(d.shortTitle) + '</h2><ul>' + short + '</ul></div>'
    + '<nav class="rules-toc" aria-label="' + rulesEsc(d.tocTitle) + '">' + toc + '</nav>' + secs;
}

function renderRules() {
  const d = rulesDoc();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('rulesCrumb', d.crumb); set('rulesTitle', d.title); set('rulesEdition', d.date); set('rulesLead', d.lead);
  set('rulesModalTitle', d.title); set('rulesModalOk', d.ok);
  const page = document.getElementById('rulesBody'); if (page) page.innerHTML = buildRulesHtml(d, 'rv');
  const modal = document.getElementById('rulesModalBody'); if (modal) modal.innerHTML = '<p class="rules-lead">' + rulesEsc(d.lead) + '</p><div class="rules-edition">' + rulesEsc(d.date) + '</div>' + buildRulesHtml(d, 'rm');
}

function scrollRules(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

// На экране входа приложение ещё закрыто, поэтому правила открываются окном; внутри приложения — страницей.
function openRules(e) {
  if (e && e.preventDefault) e.preventDefault();
  const auth = document.getElementById('authScreen');
  if (auth && getComputedStyle(auth).display !== 'none') openModal('rulesModal');
  else switchView('rules');
}

renderRules();
