-- 絵画ドリルのリロード多重課金バグ対策。
-- round1提出後にreveal_tour_page_headings（AI3生成の英語見出し）がどこにも永続化されておらず、
-- クライアントのuseStateのみが真実の源だったため、リロードで見出しごと消え、
-- 未完了(completed_at is null)のattemptを復元できずユーザーがround1を再送信 → 再課金していた。
-- このカラムを追加し、アプリ側は起票済みの未完了attemptがあればそれを復元してround1の再送信自体を防ぐ。
alter table painting_attempts
  add column if not exists reveal_tour_page_headings text[] not null default '{}';
