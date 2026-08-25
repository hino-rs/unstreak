-- ============================================================
-- リスニング機能: シナリオを3本追加。既存3本(cafe-order/airport-security/
-- workplace-smalltalk)が全て「用件があって終わる」短い対話だったのに対し、
-- 性質の異なる3タイプを追加してTier2/3にバリエーションを持たせる。
--
-- - catching-up-with-a-friend: 用件のない雑談。自然と長引く → max_turns広め
-- - planning-a-trip: 共同での意思決定。選択肢を出し合って往復が生まれる
-- - rescheduling-a-call: 電話のみ。声だけが頼りで聞き返しの価値が上がる
--
-- max_turns列(nullable)を新設。既存シナリオはnull=デフォルト(24)のまま、
-- このシナリオ群だけ広めの上限を個別指定する
-- ============================================================

alter table listening_scenarios add column max_turns integer;

insert into listening_scenarios (
  slug, title, tier, situation_brief,
  target_vocab, target_reductions, voice_accent, base_rate, max_turns
) values
  (
    'catching-up-with-a-friend',
    '友人との近況報告',
    3,
    '久しぶりに会った友人と、近況について話す場面です。用件があるわけではないので、次から次へと話題が変わっていくかもしれません。',
    '["what have you been up to", "long time no see", "catch up", "guess what"]'::jsonb,
    '["gonna", "wanna", "kinda", "gotta", "dunno"]'::jsonb,
    'en-US',
    1.10,
    40
  ),
  (
    'planning-a-trip',
    '旅行の計画を立てる',
    2,
    'ルームメイトと、週末の小旅行の行き先や日程を相談して決める場面です。お互い意見を出し合いながら決めていきましょう。',
    '["how about", "what do you think", "let''s go with", "sounds good"]'::jsonb,
    '["gonna", "wanna", "kinda"]'::jsonb,
    'en-US',
    1.05,
    32
  ),
  (
    'rescheduling-a-call',
    '電話で予約を変更する',
    3,
    '電話で、予約していた日時を変更してもらう場面です。相手の表情や身振りは見えず、声だけが頼りになります。',
    '["reschedule", "how about instead", "that works for me", "hold on a second"]'::jsonb,
    '["gonna", "wanna", "gotta", "lemme"]'::jsonb,
    'en-US',
    1.10,
    32
  )
on conflict (slug) do nothing;
