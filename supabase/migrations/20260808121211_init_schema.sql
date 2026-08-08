-- ============================================================
-- 1. profiles
-- ============================================================
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- サインアップ時に自動でprofilesの行を作る）
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. drill_attempts（画像描写ドリルの提出履歴）
-- ============================================================
create table if not exists drill_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  image_url text not null,
  image_photographer_name text,
  image_photographer_url text,
  submitted_text text not null,
  ai1_response jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists drill_attempts_user_id_idx on drill_attempts (user_id);

-- ============================================================
-- 3. weak_points（弱点プール、集計値）
-- ============================================================
create table if not exists weak_points (
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_key text not null,
  category text not null,
  display_label text,
  times_flagged integer not null default 1,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, concept_key)
);

create index if not exists weak_points_user_id_idx on weak_points (user_id);

create or replace function upsert_weak_point(
  p_user_id uuid,
  p_concept_key text,
  p_category text,
  p_display_label text default null
) returns void as $$
begin
  insert into weak_points (user_id, concept_key, category, display_label, times_flagged)
  values (p_user_id, p_concept_key, p_category, p_display_label, 1)
  on conflict (user_id, concept_key) do update
  set
    times_flagged = weak_points.times_flagged + 1,
    last_seen_at = now(),
    display_label = coalesce(weak_points.display_label, excluded.display_label);
end;
$$ language plpgsql;

-- ============================================================
-- 4. ai2_queries（AI2への質問ログ、イベントログ）
-- ============================================================
create table if not exists ai2_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_key text not null,
  question_text text not null,
  user_guess text,
  revealed_answer text,
  was_guess_correct boolean,
  created_at timestamptz not null default now()
);

create index if not exists ai2_queries_user_id_idx on ai2_queries (user_id);

-- ============================================================
-- 5. vocabulary_log（使用語彙ログ）
-- ============================================================
create table if not exists vocabulary_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  lemma text not null,
  part_of_speech text,
  use_count integer not null default 1,
  first_used_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  primary key (user_id, lemma)
);

create index if not exists vocabulary_log_user_id_idx on vocabulary_log (user_id);

create or replace function upsert_vocabulary_log(
  p_user_id uuid,
  p_lemma text,
  p_part_of_speech text
) returns void as $$
begin
  insert into vocabulary_log (user_id, lemma, part_of_speech, use_count)
  values (p_user_id, p_lemma, p_part_of_speech, 1)
  on conflict (user_id, lemma) do update
  set
    use_count = vocabulary_log.use_count + 1,
    last_used_at = now(),
    part_of_speech = coalesce(vocabulary_log.part_of_speech, excluded.part_of_speech);
end;
$$ language plpgsql;

-- ============================================================
-- 6. RLS（自分のデータだけ読み書きできるようにする）
-- ============================================================
alter table profiles enable row level security;
alter table drill_attempts enable row level security;
alter table weak_points enable row level security;
alter table ai2_queries enable row level security;
alter table vocabulary_log enable row level security;

create policy "select own profile" on profiles for select using (auth.uid() = user_id);
create policy "update own profile" on profiles for update using (auth.uid() = user_id);

create policy "select own drill_attempts" on drill_attempts for select using (auth.uid() = user_id);
create policy "insert own drill_attempts" on drill_attempts for insert with check (auth.uid() = user_id);

create policy "select own weak_points" on weak_points for select using (auth.uid() = user_id);
create policy "insert own weak_points" on weak_points for insert with check (auth.uid() = user_id);
create policy "update own weak_points" on weak_points for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "select own ai2_queries" on ai2_queries for select using (auth.uid() = user_id);
create policy "insert own ai2_queries" on ai2_queries for insert with check (auth.uid() = user_id);

create policy "select own vocabulary_log" on vocabulary_log for select using (auth.uid() = user_id);
create policy "insert own vocabulary_log" on vocabulary_log for insert with check (auth.uid() = user_id);
create policy "update own vocabulary_log" on vocabulary_log for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
