-- 各テーブルにRLSポリシーは設定済みだが、Postgresの基本テーブル権限(GRANT)が
-- authenticatedロールに一切付与されておらず、RLSが許可する行であっても
-- SELECT/INSERT/UPDATEが42501(permission denied for table)で拒否されていた。
-- RLSは「行の可視性」を絞るだけで、その手前のテーブル権限自体は別途GRANTが要る
-- (Supabaseローカル/プロジェクトのデフォルトではpublicスキーマの新規テーブルに
-- SELECT/INSERT/UPDATE/DELETEがanon/authenticatedへ自動付与されないため)。
--
-- 各GRANTはpg_policiesの既存ポリシーに1:1で対応させている。
-- app_configは意図的に対象外(SECURITY DEFINER関数経由のみで読ませる設計。
-- docs/クレジット・決済導入.md参照)。

grant select, insert on ai2_queries to authenticated;
grant select on credit_balances to authenticated;
grant select on credit_transactions to authenticated;
grant select, insert on drill_attempts to authenticated;
grant select, insert, update on painting_attempts to authenticated;
grant select on painting_noticeable_elements to authenticated;
grant select on painting_tour_pages to authenticated;
grant select on paintings to authenticated;
grant select on profiles to authenticated;
grant select, insert, update on vocabulary_log to authenticated;
grant select, insert, update on weak_points to authenticated;
