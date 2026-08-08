# データベース

1. users
2. profiles
3. drill_attempts
4. weak_points
5. ai2_queries
6. vocabulary_log

## PROFILES

|column|type|constraint|
|---|---|---|
|user_id|uuid|PK|
|display_name|string||

## DRILL_ATTEMPTS

|column|type|constraint|
|---|---|---|
|id|uuid|PK|
|user_id|uuid|FK|
|image_url|string||
|submitted_text|string||
|ai1_response|jsonb||
|created_at|timestamp||

## WEAK_POINTS

|column|type|constraint|
|---|---|---|
|user_id|uuid|PK|
|concept_key|string|PK|
|category|string||
|times_flagged|int||
|last_seen_at|timestamp||

## AI2_QUERIES

|column|type|constraint|
|---|---|---|
|id|uuid|PK|
|user_id|uuid|FK|
|concept_key|string||
|question_text|string||
|was_guess_correct|boolean||
|created_at|timestamp||

## VOCABULARY_LOG

|column|type|constraint|
|---|---|---|
|user_id|uuid|PK|
|lemma|string|PK|
|use_count|int||
|last_used_at|||
