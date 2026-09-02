-- ============================================================
-- トピック説明機能: topic_sessions / topic_turns / topic_session_usage
-- + profiles.occupation / profiles.hobbies
-- docs/トピック説明設計.md 参照。
--
-- 他ドリルと違い、この機能はクレジットを消費しない。プラン別の「月間セッション上限」で
-- 制御する(会話相手をSonnet/Opusで出し分けるため、クレジット単価より回数上限の方が原価を読みやすい)。
-- ============================================================

-- ============================================================
-- 1. profiles.occupation / hobbies（AI5が会話のトピックを作る材料。NULL = 未設定）
-- ============================================================
alter table profiles add column if not exists occupation text;
alter table profiles add column if not exists hobbies text;

-- 20260817190000_add_user_level.sql でprofilesのUPDATEはカラム単位に絞ってある。
-- 新カラムを含めて再発行しないと、プロフィール保存が42501(permission denied)で落ちる。
grant update (display_name, grade_band, occupation, hobbies) on profiles to authenticated;

-- ============================================================
-- 2. 月間セッション上限（運用中にSQLのUPDATEだけで調整できるようapp_configに置く）
--    docs/トピック説明設計.md の原価試算に基づく初期値。Proは粗利50%想定なので要実測。
-- ============================================================
insert into app_config (key, value) values
  ('topic_monthly_limit_free', '2'),
  ('topic_monthly_limit_standard', '8'),
  ('topic_monthly_limit_pro', '20')
on conflict (key) do nothing;

-- ============================================================
-- 3. topic_sessions（1回の会話セッション=1行）
-- ============================================================
create table if not exists topic_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- awaiting_end: 15往復のソフトキャップに達し、あとは終了(採点)しかできない状態
  status text not null default 'active'
    check (status in ('active', 'awaiting_end', 'completed')),
  -- セッション終了時のAI1の添削結果(TopicSessionGradingSchema)。
  -- リロードしても結果画面を再現できるよう永続化する
  ai1_response jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists topic_sessions_user_id_idx on topic_sessions (user_id);

-- ============================================================
-- 4. topic_turns（発話ログ。listening_turnsと同じく1ターン1行）
--    jsonb配列への追記だと read-modify-write になり同時リクエストでターンを取りこぼすため、
--    行として持ち unique(session_id, turn_index) で採番の衝突を構造的に防ぐ
-- ============================================================
create table if not exists topic_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references topic_sessions(id) on delete cascade,
  -- RLSを他テーブルと同じフラットな auth.uid() = user_id 方式に揃えるための非正規化
  user_id uuid not null references auth.users(id) on delete cascade,
  turn_index integer not null,
  role text not null check (role in ('ai5', 'user')),
  content text not null,
  created_at timestamptz not null default now(),
  unique (session_id, turn_index)
);

create index if not exists topic_turns_session_id_idx on topic_turns (session_id);
create index if not exists topic_turns_user_id_idx on topic_turns (user_id);

-- ============================================================
-- 5. topic_session_usage（月間利用回数のカウンタ）
--    月初日をキーに含めるので、新しい月は新しい行になる = リセット用のcronは不要。
--    書き込みポリシーを作らないのはcredit_balancesと同じ思想(RPC経由でのみ増減させる)。
-- ============================================================
create table if not exists topic_session_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_month date not null,
  session_count integer not null default 0 check (session_count >= 0),
  primary key (user_id, usage_month)
);

-- ============================================================
-- 6. RLS
-- ============================================================
alter table topic_sessions enable row level security;
alter table topic_turns enable row level security;
alter table topic_session_usage enable row level security;

create policy "select own topic_sessions" on topic_sessions for select using (auth.uid() = user_id);
create policy "insert own topic_sessions" on topic_sessions for insert with check (auth.uid() = user_id);
create policy "update own topic_sessions" on topic_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "select own topic_turns" on topic_turns for select using (auth.uid() = user_id);
create policy "insert own topic_turns" on topic_turns for insert with check (auth.uid() = user_id);
-- ターンは書いたら不変。update/deleteポリシーは意図的に作らない

create policy "select own topic_session_usage" on topic_session_usage for select using (auth.uid() = user_id);
-- INSERT/UPDATEポリシーは意図的に作らない。増減はstart_topic_session / refund_topic_session経由のみ

-- ============================================================
-- 7. テーブル権限(GRANT)。RLSは行の可視性のみを絞るため別途必要
--    (20260820100000_grant_authenticated_table_access.sql の冒頭コメント参照)
-- ============================================================
grant select, insert, update on topic_sessions to authenticated;
grant select, insert on topic_turns to authenticated;
grant select on topic_session_usage to authenticated;

-- ============================================================
-- 8. topic_monthly_limit — 呼び出し元ユーザーのプランに対応する月間上限を返す。
--    app_configはRLSポリシーを持たない(SECURITY DEFINER経由でしか読めない)ため、
--    残り回数を画面に出すにもこの関数を通す必要がある。
--    start_topic_sessionからも呼び、上限の判定ロジックを1箇所に閉じる。
-- ============================================================
create or replace function public.topic_monthly_limit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'topic_monthly_limit: p_user_id must match auth.uid()';
  end if;

  select plan into v_plan from credit_balances where user_id = p_user_id;

  select value::integer into v_limit
  from app_config
  where key = case coalesce(v_plan, 'free')
                when 'pro' then 'topic_monthly_limit_pro'
                when 'standard' then 'topic_monthly_limit_standard'
                else 'topic_monthly_limit_free'
              end;

  return coalesce(v_limit, 0);
end;
$$;

revoke execute on function public.topic_monthly_limit(uuid) from public, anon;
grant execute on function public.topic_monthly_limit(uuid) to authenticated;

-- ============================================================
-- 9. start_topic_session — 月間上限のチェックと消費、セッションの起票を1トランザクションで行う。
--    consume_creditと同じく「足りなければnullを返す」形にし、呼び出し元が429に翻訳する。
-- ============================================================
create or replace function public.start_topic_session(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_limit integer;
  v_month date := date_trunc('month', now())::date;
  v_count integer;
  v_session_id uuid;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'start_topic_session: p_user_id must match auth.uid()';
  end if;

  -- 進行中のセッションがあれば、消費せずにそれを返す。
  -- リロードや二重送信で回数だけが溶ける事故(絵画ドリルで実際に起きた)を構造的に防ぐ。
  select id into v_existing_id
  from topic_sessions
  where user_id = p_user_id
    and status in ('active', 'awaiting_end')
  order by started_at desc
  limit 1;

  if v_existing_id is not null then
    return v_existing_id;
  end if;

  -- 職業・趣味が未設定ではAI5が会話を作れない。UI側のゲートに対する最終防衛線
  if not exists (
    select 1 from profiles
    where user_id = p_user_id
      and nullif(btrim(occupation), '') is not null
      and nullif(btrim(hobbies), '') is not null
  ) then
    raise exception 'start_topic_session: profile not configured';
  end if;

  v_limit := public.topic_monthly_limit(p_user_id);

  -- 上限が未設定/0のときは、下のINSERT(初回)経路が上限チェックを素通りしてしまうので先に弾く
  if v_limit < 1 then
    return null;
  end if;

  -- 上限チェックと加算を1文で原子的に行う。上限に達しているとON CONFLICT側のWHEREが偽になり
  -- 行が返らない(v_countがnull)ので、それを上限超過として扱う
  insert into topic_session_usage (user_id, usage_month, session_count)
  values (p_user_id, v_month, 1)
  on conflict (user_id, usage_month) do update
    set session_count = topic_session_usage.session_count + 1
    where topic_session_usage.session_count < v_limit
  returning session_count into v_count;

  if v_count is null then
    return null;
  end if;

  insert into topic_sessions (user_id) values (p_user_id) returning id into v_session_id;

  return v_session_id;
end;
$$;

revoke execute on function public.start_topic_session(uuid) from public, anon;
grant execute on function public.start_topic_session(uuid) to authenticated;

-- ============================================================
-- 10. refund_topic_session — AI5の初回発話生成に失敗したときの巻き戻し。
--    consume_credit/refund_creditの対称性に倣う。
--    1ターンも記録されていないセッションだけを対象にする(会話が始まっていれば返却しない)。
-- ============================================================
create or replace function public.refund_topic_session(
  p_user_id uuid,
  p_session_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month date := date_trunc('month', now())::date;
  v_deleted integer;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'refund_topic_session: p_user_id must match auth.uid()';
  end if;

  delete from topic_sessions
  where id = p_session_id
    and user_id = p_user_id
    and not exists (select 1 from topic_turns where session_id = p_session_id);

  get diagnostics v_deleted = row_count;

  if v_deleted > 0 then
    update topic_session_usage
    set session_count = greatest(session_count - 1, 0)
    where user_id = p_user_id
      and usage_month = v_month;
  end if;
end;
$$;

revoke execute on function public.refund_topic_session(uuid, uuid) from public, anon;
grant execute on function public.refund_topic_session(uuid, uuid) to authenticated;
