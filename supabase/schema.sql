-- StudHub: схема базы данных для Supabase (PostgreSQL).
-- Как применить: Supabase → SQL Editor → New query → вставить весь файл → Run.
-- Файл можно запускать повторно: объекты пересоздаются, данные не удаляются.
--
-- Принципы безопасности:
--  * ключ anon лежит в браузере, поэтому ВСЁ защищено политиками RLS;
--  * деньги (кошелёк, донаты) меняются только через функции support_project / demo_topup,
--    напрямую писать в wallets, transactions, donations с клиента нельзя;
--  * имя автора и владелец проекта подставляются на сервере (нельзя выдать себя за другого).

create extension if not exists pgcrypto;

/* ================= Таблицы ================= */

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null check (char_length(name) between 2 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0)
);

create table if not exists public.projects (
  id           text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  owner_id     uuid references public.profiles(id) on delete cascade,   -- null = демо-проект без владельца
  owner_name   text not null,
  name         text not null check (char_length(name) between 1 and 120),
  description  text not null default '' check (char_length(description) <= 5000),
  about        text not null default '' check (char_length(about) <= 10000),
  category     text not null default 'Другое',
  icon         text not null default '•' check (char_length(icon) <= 4),
  goal         integer not null check (goal between 1000 and 1000000),
  deadline     timestamptz,                                              -- null = без срока (демо-проекты)
  rewards      jsonb not null default '[]'::jsonb,
  base_raised  integer not null default 0,    -- только для демо-проектов: «стартовые» цифры
  base_backers integer not null default 0,
  base_likes   integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists projects_owner_idx on public.projects(owner_id);

create table if not exists public.donations (
  id         bigint generated always as identity primary key,
  project_id text not null references public.projects(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  donor_name text,                                  -- null, если поддержка анонимная
  anon       boolean not null default false,
  amount     integer not null check (amount between 50 and 100000),
  message    text check (char_length(message) <= 140),
  reward     text,
  created_at timestamptz not null default now()
);
create index if not exists donations_project_idx on public.donations(project_id);
create index if not exists donations_user_idx on public.donations(user_id);

create table if not exists public.transactions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('topup', 'support', 'income')),
  amount     integer not null,                      -- + пополнение/доход, − списание
  project_id text references public.projects(id) on delete set null,
  title      text,
  method     text,
  card       text,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_idx on public.transactions(user_id, created_at desc);

create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null default 'donations',
  text       text not null,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

/* Публичный список поддержавших: без user_id, чтобы анонимность была настоящей */
create or replace view public.public_donations as
  select id, project_id, donor_name, anon, amount, message, reward, created_at from public.donations;

/* ================= Новый пользователь → профиль и кошелёк ================= */

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  nm := left(trim(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))), 40);
  if char_length(nm) < 2 then nm := 'Студент'; end if;
  insert into public.profiles(id, name) values (new.id, nm);
  insert into public.wallets(user_id) values (new.id);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

/* Владелец и имя автора при создании проекта подставляются сервером */
create or replace function public.projects_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;   -- заполнение из SQL Editor / сервисным ключом (демо-проекты)
  new.owner_id := auth.uid();
  select name into new.owner_name from public.profiles where id = auth.uid();
  new.base_raised := 0; new.base_backers := 0; new.base_likes := 0;
  if new.deadline is null or new.deadline < now() then raise exception 'bad_deadline'; end if;
  return new;
end $$;
drop trigger if exists projects_before_insert on public.projects;
create trigger projects_before_insert before insert on public.projects
  for each row execute function public.projects_before_insert();

/* ================= Права и RLS ================= */

alter table public.profiles      enable row level security;
alter table public.wallets       enable row level security;
alter table public.projects      enable row level security;
alter table public.donations     enable row level security;
alter table public.transactions  enable row level security;
alter table public.notifications enable row level security;

revoke all on public.profiles, public.wallets, public.projects, public.donations,
              public.transactions, public.notifications, public.public_donations from anon, authenticated;

-- профиль: видно и менять (только имя) может лишь владелец
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;

-- кошелёк, операции, уведомления: только чтение своих (запись — через функции)
drop policy if exists wallets_select on public.wallets;
create policy wallets_select on public.wallets for select to authenticated using (user_id = auth.uid());
grant select on public.wallets to authenticated;

drop policy if exists tx_select on public.transactions;
create policy tx_select on public.transactions for select to authenticated using (user_id = auth.uid());
grant select on public.transactions to authenticated;

drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications for select to authenticated using (user_id = auth.uid());
grant select on public.notifications to authenticated;

-- есть ли у проекта поддержки (security definer: иначе RLS скрыл бы чужие поддержки от автора)
create or replace function public.project_has_donations(p_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.donations where project_id = p_id)
$$;
grant execute on function public.project_has_donations(text) to authenticated;

-- проекты: читают все; создаёт/правит/удаляет владелец; удалить проект с поддержкой нельзя
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select to anon, authenticated using (true);
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated
  using (owner_id = auth.uid() and not public.project_has_donations(id));
grant select on public.projects to anon, authenticated;
grant insert (name, description, about, category, icon, goal, deadline, rewards) on public.projects to authenticated;
grant update (name, description, about, category, icon, rewards) on public.projects to authenticated;   -- цель и срок после запуска менять нельзя
grant delete on public.projects to authenticated;

-- поддержки: своя история — напрямую, общий список — через view без user_id
drop policy if exists donations_select on public.donations;
create policy donations_select on public.donations for select to authenticated using (user_id = auth.uid());
grant select on public.donations to authenticated;
grant select on public.public_donations to anon, authenticated;

/* ================= Функции (всё, что связано с деньгами) ================= */

-- Поддержать проект: атомарно списывает с кошелька донора, зачисляет автору, пишет историю и уведомление.
create or replace function public.support_project(p_project text, p_amount integer, p_anon boolean default false, p_msg text default null)
returns json language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  proj public.projects%rowtype;
  bal integer;
  nm text;
  rew text;
  msg text := nullif(left(trim(coalesce(p_msg, '')), 140), '');
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_amount is null or p_amount < 50 or p_amount > 100000 then raise exception 'bad_amount'; end if;
  select * into proj from public.projects where id = p_project;
  if not found then raise exception 'no_project'; end if;
  if proj.owner_id = uid then raise exception 'own_project'; end if;
  if proj.deadline is not null and proj.deadline < now() then raise exception 'closed'; end if;

  -- блокируем оба кошелька в одном порядке (без взаимных блокировок)
  perform 1 from public.wallets where user_id in (uid, proj.owner_id) order by user_id for update;
  select balance into bal from public.wallets where user_id = uid;
  if bal is null or bal < p_amount then raise exception 'insufficient_funds'; end if;

  select name into nm from public.profiles where id = uid;
  select r->>'title' into rew
    from jsonb_array_elements(proj.rewards) r
    where (r->>'amount')::int <= p_amount
    order by (r->>'amount')::int desc limit 1;

  update public.wallets set balance = balance - p_amount where user_id = uid;
  insert into public.donations(project_id, user_id, donor_name, anon, amount, message, reward)
    values (proj.id, uid, case when p_anon then null else nm end, coalesce(p_anon, false), p_amount, msg, rew);
  insert into public.transactions(user_id, kind, amount, project_id, title) values (uid, 'support', -p_amount, proj.id, proj.name);

  if proj.owner_id is not null then
    update public.wallets set balance = balance + p_amount where user_id = proj.owner_id;
    insert into public.transactions(user_id, kind, amount, project_id, title) values (proj.owner_id, 'income', p_amount, proj.id, proj.name);
    insert into public.notifications(user_id, type, text)
      values (proj.owner_id, 'donations', case when p_anon then 'Аноним' else nm end || ' поддержал проект «' || proj.name || '» на ' || p_amount || ' ₽');
  end if;
  return json_build_object('reward', rew);
end $$;

-- ДЕМО-пополнение кошелька (виртуальные деньги, карта не проверяется и не сохраняется).
-- Перед приёмом настоящих платежей эту функцию нужно УДАЛИТЬ: пополнять баланс должен только вебхук платёжного провайдера.
create or replace function public.demo_topup(p_amount integer, p_method text default 'card', p_card text default null)
returns integer language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); nb integer;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_amount is null or p_amount < 100 or p_amount > 50000 then raise exception 'bad_amount'; end if;
  perform 1 from public.wallets where user_id = uid for update;
  if (select balance from public.wallets where user_id = uid) + p_amount > 500000 then raise exception 'wallet_limit'; end if;
  update public.wallets set balance = balance + p_amount where user_id = uid returning balance into nb;
  insert into public.transactions(user_id, kind, amount, method, card)
    values (uid, 'topup', p_amount, left(coalesce(p_method, 'card'), 20), left(p_card, 20));
  return nb;
end $$;

-- Удаление собственного аккаунта (вместе с профилем, кошельком и проектами)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.support_project(text, integer, boolean, text) from public, anon;
revoke all on function public.demo_topup(integer, text, text) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.support_project(text, integer, boolean, text) to authenticated;
grant execute on function public.demo_topup(integer, text, text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

/* ================= Демо-проекты (те же 5, что были в интерфейсе) ================= */

insert into public.projects (id, owner_id, owner_name, name, description, about, category, icon, goal, deadline, rewards, base_raised, base_backers, base_likes) values
 ('fund-map', null, 'Л. Галлахер', 'Карта тихих мест для учёбы', 'Интерактивная карта библиотек, свободных аудиторий и кофеен рядом с кампусом.', 'Собираем и проверяем места, где можно спокойно учиться: розетки, Wi-Fi, часы работы, уровень шума. Деньги пойдут на хостинг, домен и оплату работы дизайнера.', 'Образование', '⌖', 25000, null, '[{"amount":100,"title":"Благодарность","desc":"Ваше имя в списке поддержавших и личное спасибо от автора."},{"amount":500,"title":"Закрытые обновления","desc":"Доступ к закрытым обновлениям проекта."},{"amount":1000,"title":"Соавтор","desc":"Всё из предыдущих уровней + ранний доступ к результату."}]', 18400, 41, 56),
 ('fund-lab', null, 'Команда CampusLab', 'Студенческая мастерская', 'Оборудование и материалы для совместных учебных и творческих проектов.', 'Хотим оборудовать мастерскую в колледже: инструменты, паяльные станции, расходники. Доступ будет бесплатным для студентов.', 'Творчество', '✦', 40000, null, '[{"amount":100,"title":"Благодарность","desc":"Ваше имя в списке поддержавших и личное спасибо от автора."},{"amount":500,"title":"Закрытые обновления","desc":"Доступ к закрытым обновлениям проекта."},{"amount":1000,"title":"Соавтор","desc":"Всё из предыдущих уровней + ранний доступ к результату."}]', 27600, 63, 88),
 ('fund-bot', null, 'А. Смирнов', 'Учебный бот-помощник', 'Бот с расписанием, напоминаниями и полезными материалами для студентов.', 'Telegram-бот: расписание, дедлайны, напоминания о зачётах и подборки материалов. Средства — на сервер и разработку.', 'Технологии', '{}', 15000, null, '[{"amount":100,"title":"Благодарность","desc":"Ваше имя в списке поддержавших и личное спасибо от автора."},{"amount":500,"title":"Закрытые обновления","desc":"Доступ к закрытым обновлениям проекта."},{"amount":1000,"title":"Соавтор","desc":"Всё из предыдущих уровней + ранний доступ к результату."}]', 12150, 37, 44),
 ('fund-print', null, 'Инициатива «Мейкерская»', 'Доступная 3D-печать', 'Собираем средства на пластик и обслуживание принтера для учебных макетов и прототипов.', 'Печать макетов и прототипов для курсовых по себестоимости. Деньги пойдут на пластик, запчасти и обслуживание принтера.', 'Инженерия', '3D', 32000, null, '[{"amount":100,"title":"Благодарность","desc":"Ваше имя в списке поддержавших и личное спасибо от автора."},{"amount":500,"title":"Закрытые обновления","desc":"Доступ к закрытым обновлениям проекта."},{"amount":1000,"title":"Соавтор","desc":"Всё из предыдущих уровней + ранний доступ к результату."}]', 9600, 18, 23),
 ('fund-zine', null, 'Редакция «Перемена»', 'Студенческий журнал', 'Первый выпуск независимого журнала с иллюстрациями, интервью и историями студентов.', 'Независимый журнал о студенческой жизни Калининграда. Средства — на вёрстку, печать тиража и гонорары иллюстраторам.', 'Медиа', 'Ж', 18000, null, '[{"amount":100,"title":"Благодарность","desc":"Ваше имя в списке поддержавших и личное спасибо от автора."},{"amount":500,"title":"Закрытые обновления","desc":"Доступ к закрытым обновлениям проекта."},{"amount":1000,"title":"Соавтор","desc":"Всё из предыдущих уровней + ранний доступ к результату."}]', 12600, 29, 35)
on conflict (id) do nothing;


/* ================= Обсуждения и ответы ================= */
create table if not exists public.discussions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default '',
  title text not null check (char_length(title) between 4 and 120),
  body text not null default '' check (char_length(body) <= 5000),
  category text not null default 'Вопросы' check (category in ('Вопросы','Идеи','Учёба','Общага','Ищу команду','Оффтоп')),
  score integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists discussions_created_idx on public.discussions(created_at desc);
create index if not exists discussions_category_idx on public.discussions(category);

create table if not exists public.discussion_comments (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default '',
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists discussion_comments_discussion_idx on public.discussion_comments(discussion_id, created_at);

create or replace function public.discussion_set_author() returns trigger
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select name into nm from public.profiles where id = auth.uid();
  if nm is null then raise exception 'profile_missing'; end if;
  new.author_id := auth.uid();
  new.author_name := nm;
  return new;
end $$;
drop trigger if exists discussions_set_author on public.discussions;
create trigger discussions_set_author before insert on public.discussions for each row execute function public.discussion_set_author();
drop trigger if exists discussion_comments_set_author on public.discussion_comments;
create trigger discussion_comments_set_author before insert on public.discussion_comments for each row execute function public.discussion_set_author();

create or replace function public.discussion_update_comment_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.discussions set comment_count = comment_count + 1 where id = new.discussion_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.discussions set comment_count = greatest(0, comment_count - 1) where id = old.discussion_id;
    return old;
  end if;
  return null;
end $$;
drop trigger if exists discussion_comments_count_insert on public.discussion_comments;
create trigger discussion_comments_count_insert after insert on public.discussion_comments for each row execute function public.discussion_update_comment_count();
drop trigger if exists discussion_comments_count_delete on public.discussion_comments;
create trigger discussion_comments_count_delete after delete on public.discussion_comments for each row execute function public.discussion_update_comment_count();

alter table public.discussions enable row level security;
alter table public.discussion_comments enable row level security;
drop policy if exists discussions_read_all on public.discussions;
create policy discussions_read_all on public.discussions for select to anon, authenticated using (true);
drop policy if exists discussions_create_authors on public.discussions;
create policy discussions_create_authors on public.discussions for insert to authenticated with check (author_id = auth.uid());
drop policy if exists discussions_delete_own on public.discussions;
create policy discussions_delete_own on public.discussions for delete to authenticated using (author_id = auth.uid());
drop policy if exists discussion_comments_read_all on public.discussion_comments;
create policy discussion_comments_read_all on public.discussion_comments for select to anon, authenticated using (true);
drop policy if exists discussion_comments_create_authors on public.discussion_comments;
create policy discussion_comments_create_authors on public.discussion_comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists discussion_comments_delete_own on public.discussion_comments;
create policy discussion_comments_delete_own on public.discussion_comments for delete to authenticated using (author_id = auth.uid());
grant select on public.discussions, public.discussion_comments to anon, authenticated;
grant insert (title, body, category) on public.discussions to authenticated;
grant delete on public.discussions to authenticated;
grant insert (discussion_id, body) on public.discussion_comments to authenticated;
grant delete on public.discussion_comments to authenticated;
