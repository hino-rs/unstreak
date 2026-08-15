-- ============================================================
-- 1. app_config（運用パラメータ。再デプロイなしでSQL UPDATEのみで変更可能）
-- ============================================================
create table if not exists app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- 金額未確定のためプレースホルダー値。本番決定後はUPDATEで変更する
insert into app_config (key, value) values
  ('signup_bonus_credits', '20')
on conflict (key) do nothing;

alter table app_config enable row level security;
-- ポリシーを一切作らない = authenticated/anonから完全に不可視。SECURITY DEFINER関数からのみ読める。

-- ============================================================
-- 2. credit_balances（残高 + Stripe連携情報。1ユーザー1行）
-- ============================================================
create table if not exists credit_balances (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0 check (credits >= 0),
  stripe_customer_id text unique,
  stripe_subscription_status text,
  updated_at timestamptz not null default now()
);

alter table credit_balances enable row level security;

create policy "select own credit_balances"
  on credit_balances for select
  using (auth.uid() = user_id);

-- INSERT/UPDATEポリシーは意図的に作らない。全書き込みは
-- consume_credit / refund_credit / grant_credit / set_stripe_customer_id
-- (すべてSECURITY DEFINER) または Stripe webhookのservice-roleクライアント経由のみ。
-- profiles.update系ポリシーのようにwith checkなしで直接書けてしまう穴を作らないため。

-- ============================================================
-- 3. credit_transactions（元帳。監査・冪等性の唯一の情報源）
-- ============================================================
create table if not exists credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null,
  stripe_event_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_id_idx
  on credit_transactions (user_id);

alter table credit_transactions enable row level security;

create policy "select own credit_transactions"
  on credit_transactions for select
  using (auth.uid() = user_id);
-- INSERTポリシーは作らない。全書き込みはRPC/service-role経由。

-- ============================================================
-- 4. consume_credit — 原子的な条件付き減算 + 元帳挿入
--    authenticated から呼ばれる想定。auth.uid()チェックが唯一の防御
--    (SECURITY DEFINERはRLSをバイパスするため必須のチェック)。
-- ============================================================
create or replace function public.consume_credit(
  p_user_id uuid,
  p_amount integer,
  p_reason text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'consume_credit: p_user_id must match auth.uid()';
  end if;

  if p_amount <= 0 then
    raise exception 'consume_credit: p_amount must be positive';
  end if;

  update credit_balances
  set credits = credits - p_amount,
      updated_at = now()
  where user_id = p_user_id
    and credits >= p_amount;

  if not found then
    return false;
  end if;

  insert into credit_transactions (user_id, delta, reason)
  values (p_user_id, -p_amount, p_reason);

  return true;
end;
$$;

revoke execute on function public.consume_credit(uuid, integer, text) from public, anon;
grant execute on function public.consume_credit(uuid, integer, text) to authenticated;

-- ============================================================
-- 5. refund_credit — consume_creditの逆操作。
--    Claude呼び出し失敗時など、課金後に処理が失敗したケースの自己返金専用。
-- ============================================================
create or replace function public.refund_credit(
  p_user_id uuid,
  p_amount integer,
  p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'refund_credit: p_user_id must match auth.uid()';
  end if;

  if p_amount <= 0 then
    raise exception 'refund_credit: p_amount must be positive';
  end if;

  update credit_balances
  set credits = credits + p_amount,
      updated_at = now()
  where user_id = p_user_id;

  insert into credit_transactions (user_id, delta, reason)
  values (p_user_id, p_amount, p_reason);
end;
$$;

revoke execute on function public.refund_credit(uuid, integer, text) from public, anon;
grant execute on function public.refund_credit(uuid, integer, text) to authenticated;

-- ============================================================
-- 6. grant_credit — Stripe webhook (service_role) と handle_new_user
--    (すでにSECURITY DEFINERで昇格済みのトリガーコンテキスト) からのみ呼ばれる。
--    auth.uid()チェックを持たない = 危険。よってEXECUTEをservice_roleのみに
--    絞ることが唯一かつ必須の防御線(SECURITY DEFINERだけでは不十分)。
--    stripe_event_id での ON CONFLICT DO NOTHING が冪等性(Webhook再送対策)を担保する。
-- ============================================================
create or replace function public.grant_credit(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_stripe_event_id text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_count integer;
begin
  if p_amount <= 0 then
    -- 例外にしない: signup_bonus_creditsを一時的に0運用にする等を壊さないため
    return;
  end if;

  insert into credit_transactions (user_id, delta, reason, stripe_event_id)
  values (p_user_id, p_amount, p_reason, p_stripe_event_id)
  on conflict (stripe_event_id) do nothing;

  get diagnostics v_row_count = row_count;

  if v_row_count > 0 then
    insert into credit_balances (user_id, credits, updated_at)
    values (p_user_id, p_amount, now())
    on conflict (user_id) do update
    set credits = credit_balances.credits + p_amount,
        updated_at = now();
  end if;
end;
$$;

revoke execute on function public.grant_credit(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.grant_credit(uuid, integer, text, text) to service_role;

-- ============================================================
-- 7. set_stripe_customer_id — checkout route (ユーザーセッション)から
--    stripe_customer_idを書き込むための最小RPC。admin clientを
--    webhook以外に持ち込まないためにこれを用意する。
-- ============================================================
create or replace function public.set_stripe_customer_id(
  p_user_id uuid,
  p_stripe_customer_id text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'set_stripe_customer_id: p_user_id must match auth.uid()';
  end if;

  update credit_balances
  set stripe_customer_id = p_stripe_customer_id,
      updated_at = now()
  where user_id = p_user_id;
end;
$$;

revoke execute on function public.set_stripe_customer_id(uuid, text) from public, anon;
grant execute on function public.set_stripe_customer_id(uuid, text) to authenticated;

-- ============================================================
-- 8. handle_new_user を更新し、サインアップボーナスを付与する
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_signup_bonus integer;
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');

  select value::integer into v_signup_bonus
  from app_config
  where key = 'signup_bonus_credits';

  perform public.grant_credit(new.id, coalesce(v_signup_bonus, 0), 'signup_bonus');

  return new;
end;
$$ language plpgsql security definer set search_path = public;
-- トリガー自体(on_auth_user_created)は既存のものを再利用、drop/re-createは不要
