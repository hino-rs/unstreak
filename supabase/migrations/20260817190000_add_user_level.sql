-- ============================================================
-- 1. profiles: grade_band(自己申告の学年) / level_score(EWMAで算出する英語レベル)
-- ============================================================
alter table profiles
  add column grade_band text
    check (grade_band in ('elementary', 'junior_high', 'high_school', 'adult')),
  add column level_score numeric(3,1);

-- ============================================================
-- 2. handle_new_user(): サインアップ時のmeta_dataからgrade_bandを読み取り、
--    level_scoreの初期値(EWMAの起点)を学年から仮置きする
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_signup_bonus integer;
  v_grade_band text;
  v_initial_level numeric(3,1);
begin
  v_grade_band := new.raw_user_meta_data ->> 'grade_band';
  if v_grade_band not in ('elementary', 'junior_high', 'high_school', 'adult') then
    v_grade_band := null;
  end if;

  v_initial_level := case v_grade_band
    when 'elementary'  then 1.0
    when 'junior_high' then 2.0
    when 'high_school' then 3.0
    when 'adult'       then 3.0
    else 2.0 -- grade_bandが取れなかった場合の中庸フォールバック
  end;

  insert into public.profiles (user_id, display_name, grade_band, level_score)
  values (new.id, new.raw_user_meta_data ->> 'display_name', v_grade_band, v_initial_level);

  select value::integer into v_signup_bonus
  from app_config
  where key = 'signup_bonus_credits';

  perform public.grant_credit(new.id, coalesce(v_signup_bonus, 0), 'signup_bonus');

  return new;
end;
$$ language plpgsql security definer set search_path = public;
-- トリガー(on_auth_user_created)は既存のものを再利用、drop/re-create不要

-- ============================================================
-- 3. update_level_score: AI1のlevel_estimateをEWMAでlevel_scoreに畳み込むRPC
--    (level_score = alpha * 今回の推定値 + (1-alpha) * 前回のlevel_score)
--    consume_creditと同じconventions: security definer, auth.uid()チェック, revoke/grant
-- ============================================================
create or replace function public.update_level_score(
  p_user_id uuid,
  p_level_estimate numeric,
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
    raise exception 'update_level_score: p_user_id must match auth.uid()';
  end if;
  if p_level_estimate < 1 or p_level_estimate > 5 then
    raise exception 'update_level_score: p_level_estimate out of range [1,5]';
  end if;

  update profiles
  set level_score = round(
        (p_alpha * p_level_estimate + (1 - p_alpha) * coalesce(level_score, p_level_estimate))::numeric,
        1
      )
  where user_id = p_user_id
  returning level_score into v_new_score;

  if not found then
    raise exception 'update_level_score: profile not found for user';
  end if;

  return v_new_score;
end;
$$;

revoke execute on function public.update_level_score(uuid, numeric, numeric) from public, anon;
grant execute on function public.update_level_score(uuid, numeric, numeric) to authenticated;

-- ============================================================
-- 4. level_scoreをRPC以外から書き込めないようにする(列単位の権限制御)
--    "update own profile" RLSポリシー(既存)は行単位の制御のみでカラム制限がないため、
--    素のUPDATEでlevel_scoreを直接上書きされないよう明示的に絞る。
--    level_scoreはupdate_level_score()(SECURITY DEFINERでRLS/GRANTをバイパス)からのみ更新される。
-- ============================================================
revoke update on profiles from authenticated;
grant update (display_name, grade_band) on profiles to authenticated;
