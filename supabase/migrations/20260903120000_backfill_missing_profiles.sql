-- ============================================================
-- profiles行が無い既存アカウントの補填。
--
-- on_auth_user_created トリガー(20260808121211_init_schema.sql)より前に作られた
-- auth.usersにはprofiles行が無い。profilesはRLSがselect/updateのみでINSERTポリシーを
-- 持たないため、アプリ側からは行を作れず、プロフィール更新は
-- 「UPDATE 0行・エラーなし」= 保存したつもりで何も保存されない状態になっていた
-- (職業・趣味だけでなく学年も同様)。
--
-- トリガー自体は現在有効なので、これは過去分の一度きりの補填。
-- ============================================================

insert into public.profiles (user_id, display_name, created_at)
select
  u.id,
  u.raw_user_meta_data ->> 'display_name',
  u.created_at
from auth.users u
where not exists (
  select 1 from public.profiles p where p.user_id = u.id
)
on conflict (user_id) do nothing;
