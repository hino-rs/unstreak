-- ============================================================
-- 特訓(サクッと)で正解したweak_pointsのtimes_flaggedを1減らす。
-- 0を下回らないようフロアする。0になったconcept_keyは出題プールから除外される
-- (lib/training/quick-mode.tsのisQuickModeConcept参照)。
-- ============================================================
create or replace function decrement_weak_point(
  p_user_id uuid,
  p_concept_key text
) returns void as $$
begin
  update weak_points
  set times_flagged = greatest(times_flagged - 1, 0)
  where user_id = p_user_id and concept_key = p_concept_key;
end;
$$ language plpgsql
set search_path = public;
