// Настройки подключения к Supabase.
// Оставьте поля пустыми — приложение работает в локальном демо-режиме (данные только в этом браузере).
// Где взять значения: Supabase → Project Settings → API → «Project URL» и ключ «anon public».
// Ключ anon можно публиковать на GitHub: он рассчитан на браузер, а данные защищены правилами RLS из supabase/schema.sql.
// НИКОГДА не вставляйте сюда ключ service_role — он даёт полный доступ к базе.
window.STUDHUB_CONFIG = {
  supabaseUrl: 'https://giraxglojgfbvanqvdou.supabase.co',      // например: 'https://abcdefghijkl.supabase.co'
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpcmF4Z2xvamdmYnZhbnF2ZG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMTQ3MzIsImV4cCI6MjEwODY5MDczMn0.Nknoy_I2_osf1ti_OfJvoCn9HX-6Omdek4r97JcEaYM'   // длинная строка, начинается с 'eyJ...' (или 'sb_publishable_...')
};
