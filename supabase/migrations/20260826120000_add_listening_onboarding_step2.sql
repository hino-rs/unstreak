-- ============================================================
-- リスニング機能: ウォームアップの2段目を追加し、is_onboarding単体では表現できない
-- 「自己紹介(0.65倍速・省略発音なし・社交)」→「買い物(0.8倍速・省略発音なし・取引的なやり取り)」
-- →「Tier1(1.0倍速・省略発音あり・AI4自由変化)」という段階的な導線にする。
-- 1回のステップで動かす軸を絞ることで、自己紹介からTier1への一足飛びのジャンプを埋める。
-- ============================================================

alter table listening_scenarios add column onboarding_step smallint;

update listening_scenarios set onboarding_step = 1 where slug = 'first-hello';

insert into listening_scenarios (
  slug, title, tier, is_onboarding, onboarding_step, situation_brief,
  target_vocab, target_reductions, voice_accent, base_rate
) values (
  'buy-a-drink',
  'コンビニで飲み物を買う',
  1,
  true,
  2,
  'コンビニのレジで、飲み物をひとつ買う場面です。値段を聞いたり、お礼を言ったりしてみましょう。',
  '["how much is it", "here you go", "thank you", "have a nice day"]'::jsonb,
  '[]'::jsonb,
  'en-US',
  0.8
)
on conflict (slug) do nothing;
