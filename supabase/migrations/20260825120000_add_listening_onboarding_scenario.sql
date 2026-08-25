-- ============================================================
-- リスニング機能: ウォームアップ用オンボーディングシナリオ
-- Tier1〜3のEWMA前提の3段階には乗せず、別枠の「はじめての一歩」として扱う。
-- - AI4は台本から逸脱しない(stayCloseToScript)
-- - クレジット消費なし
-- - listening_tier_scoreのEWMA更新対象外
-- ============================================================

alter table listening_scenarios add column is_onboarding boolean not null default false;

insert into listening_scenarios (
  slug, title, tier, is_onboarding, situation_brief,
  target_vocab, target_reductions, voice_accent, base_rate
) values (
  'first-hello',
  'はじめての自己紹介',
  1,
  true,
  'はじめて会う相手と、お互いに自己紹介をする場面です。名前や簡単なことを英語で伝えてみましょう。',
  '["what''s your name", "nice to meet you", "I''m from", "how are you"]'::jsonb,
  '[]'::jsonb,
  'en-US',
  0.65
)
on conflict (slug) do nothing;
