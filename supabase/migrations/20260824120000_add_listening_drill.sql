-- ============================================================
-- リスニング機能(MVP): listening_scenarios / listening_sessions / listening_turns
-- + profiles.listening_tier_score (level_scoreと同じ列+RPCパターン)
-- ============================================================

-- ============================================================
-- 1. listening_scenarios（シナリオのfact-base相当。migration経由のみで書き込む）
-- ============================================================
create table if not exists listening_scenarios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  tier smallint not null check (tier in (1, 2, 3)),
  -- 拡張1でmonologue(アナウンス系)を追加する布石として列だけ用意。MVPはdialogueのみ
  mode text not null default 'dialogue' check (mode = 'dialogue'),
  situation_brief text not null,
  target_vocab jsonb not null default '[]'::jsonb,
  target_reductions jsonb not null default '[]'::jsonb,
  voice_accent text not null default 'en-US',
  base_rate numeric(3,2) not null default 1.0,
  noise_profile text not null default 'none' check (noise_profile = 'none'),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. listening_sessions（1回の会話セッション=1行）
-- ============================================================
create table if not exists listening_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid not null references listening_scenarios(id),
  tier_at_start smallint not null,
  status text not null default 'active' check (status in ('active', 'completed')),
  transcript_revealed boolean not null default false,
  transcript_revealed_at timestamptz,
  -- セッション完了時に確定する集計値(clarification_count / ai_turn数)。listening_turnsから都度導出可能だが、
  -- 完了後のサマリー表示・EWMA更新の監査用にスナップショットとして保持する
  clarification_rate numeric(4,3),
  credits_charged integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists listening_sessions_user_id_idx on listening_sessions (user_id);

-- ============================================================
-- 3. listening_turns（発話ログ。turn_type単位でreply/clarificationを区別する）
--    clarification_eventsのような別テーブルは作らない。書き起こし開放判定・弱点プール帰属・
--    Tier EWMA入力は、いずれもこのテーブルから導出できるため
-- ============================================================
create table if not exists listening_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references listening_sessions(id) on delete cascade,
  -- RLSを他テーブルと同じフラットな auth.uid() = user_id 方式に揃えるための非正規化
  user_id uuid not null references auth.users(id) on delete cascade,
  turn_index integer not null,
  role text not null check (role in ('ai', 'user')),
  turn_type text not null check (
    turn_type in ('utterance', 'user_reply', 'clarification_request', 'ai_clarification_response')
  ),
  content text not null,
  -- [{kind:'vocab'|'reduction', value:string}]。AIターン(utterance/ai_clarification_response)のみ使用。
  -- AI4の自己申告をそのまま信用せず、呼び出し元でscenarioのtarget_vocab/target_reductionsに
  -- 実在する項目だけにフィルタしてから保存する
  target_items_used jsonb not null default '[]'::jsonb,
  -- turn_type=ai_clarification_responseのときのみ設定
  clarification_strategy text check (clarification_strategy in ('repeat', 'rephrase', 'slow_down')),
  created_at timestamptz not null default now(),
  unique (session_id, turn_index)
);

create index if not exists listening_turns_session_id_idx on listening_turns (session_id);
create index if not exists listening_turns_user_id_idx on listening_turns (user_id);

-- ============================================================
-- 4. RLS
-- ============================================================
alter table listening_scenarios enable row level security;
alter table listening_sessions enable row level security;
alter table listening_turns enable row level security;

create policy "select listening_scenarios" on listening_scenarios for select to authenticated using (true);
-- 書き込みポリシーは意図的に作らない。paintingsと同じくmigration経由のみで更新する

create policy "select own listening_sessions" on listening_sessions for select using (auth.uid() = user_id);
create policy "insert own listening_sessions" on listening_sessions for insert with check (auth.uid() = user_id);
create policy "update own listening_sessions" on listening_sessions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "select own listening_turns" on listening_turns for select using (auth.uid() = user_id);
create policy "insert own listening_turns" on listening_turns for insert with check (auth.uid() = user_id);

-- ============================================================
-- 5. テーブル権限(GRANT)。RLSは行の可視性のみを絞るため、
--    20260820100000_grant_authenticated_table_access.sql と同様に別途必要
-- ============================================================
grant select on listening_scenarios to authenticated;
grant select, insert, update on listening_sessions to authenticated;
grant select, insert on listening_turns to authenticated;

-- ============================================================
-- 6. profiles.listening_tier_score + update_listening_tier_score
--    (level_score / update_level_score と全く同じEWMAパターン。書き込みはRPC経由のみ)
-- ============================================================
alter table profiles add column listening_tier_score numeric(3,1);

create or replace function public.update_listening_tier_score(
  p_user_id uuid,
  p_tier_estimate numeric,
  p_alpha numeric default 0.175
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_score numeric(3,1);
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'update_listening_tier_score: p_user_id must match auth.uid()';
  end if;
  if p_tier_estimate < 1 or p_tier_estimate > 5 then
    raise exception 'update_listening_tier_score: p_tier_estimate out of range [1,5]';
  end if;

  update profiles
  set listening_tier_score = round(
        (p_alpha * p_tier_estimate + (1 - p_alpha) * coalesce(listening_tier_score, p_tier_estimate))::numeric,
        1
      )
  where user_id = p_user_id
  returning listening_tier_score into v_new_score;

  if not found then
    raise exception 'update_listening_tier_score: profile not found for user';
  end if;

  return v_new_score;
end;
$$;

revoke execute on function public.update_listening_tier_score(uuid, numeric, numeric) from public, anon;
grant execute on function public.update_listening_tier_score(uuid, numeric, numeric) to authenticated;

-- listening_tier_scoreもlevel_scoreと同じくRPC経由のみで書き込めるようにする。
-- grant update (display_name, grade_band) は 20260817190000_add_user_level.sql で既に絞ってあるので、
-- listening_tier_score を含めない今の状態のままでロックダウン済み(このmigrationでは追加のrevoke/grant不要)。

-- ============================================================
-- 7. Seedシナリオ(MVP3本、米語標準のみ)
-- ============================================================
insert into listening_scenarios (slug, title, tier, situation_brief, target_vocab, target_reductions, voice_accent, base_rate) values
  (
    'cafe-order',
    'カフェでの注文',
    1,
    'あなたはカフェのカウンターにいます。店員が注文を聞いてきます。',
    '["for here or to go", "room for cream", "that''ll be", "anything else"]'::jsonb,
    '["wanna", "gonna", "kinda"]'::jsonb,
    'en-US',
    1.0
  ),
  (
    'airport-security',
    '空港の保安検査',
    2,
    'あなたは空港の保安検査場にいます。係員から指示が飛んできます。',
    '["step through", "take that out", "boarding pass", "empty your pockets"]'::jsonb,
    '["gotta", "gonna", "hafta"]'::jsonb,
    'en-US',
    1.1
  ),
  (
    'workplace-smalltalk',
    '職場の雑談',
    3,
    'あなたは職場の同僚と廊下で立ち話をしています。',
    '["swamped", "circle back", "touch base", "crazy week"]'::jsonb,
    '["gonna", "kinda", "lemme", "dunno"]'::jsonb,
    'en-US',
    1.1
  )
on conflict (slug) do nothing;
