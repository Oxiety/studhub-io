# Подключение StudHub к Supabase (10 минут)

1. **Проект.** На https://supabase.com → New project (регион поближе, например Frankfurt). Запомните пароль БД (в приложении он не нужен).
2. **База.** Supabase → SQL Editor → New query → вставьте весь файл `supabase/schema.sql` → Run. Файл можно запускать повторно.
3. **Ключи.** Project Settings → API. Скопируйте «Project URL» и ключ «anon public» в `js/config.js`:
   ```js
   window.STUDHUB_CONFIG = { supabaseUrl: 'https://xxxx.supabase.co', supabaseAnonKey: 'eyJ...' };
   ```
   Ключ anon можно публиковать на GitHub (его защищают правила RLS из schema.sql). Ключ `service_role` не вставляйте никуда в проект.
4. **Адреса сайта.** Authentication → URL Configuration: Site URL = `https://studhub-test.github.io/studhub/`, и тот же адрес добавьте в Redirect URLs (нужно для ссылки «Забыли пароль?»).
5. **Подтверждение почты.** Authentication → Providers → Email. Пока тестируете, можно выключить «Confirm email» — вход сразу после регистрации. Если оставить включённым, после регистрации придёт письмо (встроенная почта Supabase ограничена несколькими письмами в час; для запуска подключите свой SMTP).
6. Закоммитьте изменения и дождитесь публикации GitHub Pages.

Пока `js/config.js` пуст, приложение работает в локальном демо-режиме (данные в браузере).

## Что хранится в базе
`profiles`, `wallets`, `projects`, `donations`, `transactions`, `notifications`. Деньги меняются только функциями `support_project` (атомарно списывает с донора и зачисляет автору) и `demo_topup`. Напрямую писать в кошельки и поддержки с клиента нельзя.
Комментарии, оценки, обсуждения, посты и настройки пока остаются в браузере.

## Личные сообщения (чат)
Чтобы работал чат из правой колонки, один раз выполните `supabase/chat.sql` в SQL Editor. Таблица `messages` защищена RLS: каждый видит только свои переписки. Люди ищутся по имени или @логину.

## Перед приёмом настоящих платежей
- удалите функцию `demo_topup` (сейчас любой пользователь может «пополнить» виртуальный кошелёк);
- пополнение должен делать вебхук ЮKassa/CloudPayments через Edge Function с ключом `service_role`;
- оформите самозанятость/ИП и оферту.


## Общие аватарки

После `schema.sql` и `profile-posts-migration.sql` выполните `avatar-public-profiles-migration.sql`. Миграция добавляет `profiles.avatar_url`, публичный Storage bucket `avatars`, политики загрузки только в собственную папку и выдачу URL в публичных профилях/поиске/чате.
