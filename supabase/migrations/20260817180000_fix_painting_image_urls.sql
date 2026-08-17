-- ============================================================
-- 絵画画像の再ホスト
--
-- 経緯: Wikimedia CommonsのSpecial:FilePathを直接browser/AnthropicからHotlinkしていたが、
-- 以下2つの問題が判明した。
--   1. 'napoleon-crossing-the-alps' と 'death-of-nelson' は seed時のファイル名が誤っており
--      (前者はハイフン誤挿入、後者は accession番号が別作品のものと取り違え)、常に404になっていた
--   2. 正しいファイル名でも、Wikimedia側が時折 429 (レート制限) を返すため、
--      Reveal画面の背景画像がまれに真っ暗になる不安定さがあった
--
-- 対応: 6枚とも正しいファイルを確認した上でSupabase Storage(publicバケット painting-images)に
-- 再アップロードし、image_urlを自前ホスティングのURLに切り替える(Wikimedia依存を排除)。
-- バケット作成・アップロード自体はSQLで表現できないため、migration適用前に別途スクリプトで実施済み。
-- ============================================================

update paintings set image_url = 'https://saprdgpmykqbzhygwtxh.supabase.co/storage/v1/object/public/painting-images/napoleon-crossing-the-alps.jpg'
  where slug = 'napoleon-crossing-the-alps';

update paintings set image_url = 'https://saprdgpmykqbzhygwtxh.supabase.co/storage/v1/object/public/painting-images/washington-crossing-the-delaware.jpg'
  where slug = 'washington-crossing-the-delaware';

update paintings set image_url = 'https://saprdgpmykqbzhygwtxh.supabase.co/storage/v1/object/public/painting-images/death-of-nelson.jpg'
  where slug = 'death-of-nelson';

update paintings set image_url = 'https://saprdgpmykqbzhygwtxh.supabase.co/storage/v1/object/public/painting-images/coronation-of-napoleon.jpg'
  where slug = 'coronation-of-napoleon';

update paintings set image_url = 'https://saprdgpmykqbzhygwtxh.supabase.co/storage/v1/object/public/painting-images/third-of-may-1808.jpg'
  where slug = 'third-of-may-1808';

update paintings set image_url = 'https://saprdgpmykqbzhygwtxh.supabase.co/storage/v1/object/public/painting-images/liberty-leading-the-people.jpg'
  where slug = 'liberty-leading-the-people';
