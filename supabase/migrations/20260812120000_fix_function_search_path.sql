-- 多層防御としてsearch_pathを明示固定する
alter function upsert_weak_point(uuid, text, text, text) set search_path = public;
alter function upsert_vocabulary_log(uuid, text, text) set search_path = public;
