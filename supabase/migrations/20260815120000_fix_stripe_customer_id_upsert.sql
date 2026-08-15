-- set_stripe_customer_id が UPDATE のみだったため、このマイグレーション以前に
-- サインアップしたユーザー(credit_balances行が存在しない)ではstripe_customer_idの
-- 保存が0件更新のまま握りつぶされていた。Stripe顧客が重複作成され続け、
-- Billing Portalにも到達できなくなるバグの修正。

-- 既存ユーザーのcredit_balances行を補完(handle_new_userはこのマイグレーション以前の
-- ユーザーには適用されていないため)
insert into credit_balances (user_id)
select id from auth.users
where id not in (select user_id from credit_balances)
on conflict (user_id) do nothing;

-- upsertに変更し、以後同様の欠落があっても書き込みが握りつぶされないようにする
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

  insert into credit_balances (user_id, stripe_customer_id, updated_at)
  values (p_user_id, p_stripe_customer_id, now())
  on conflict (user_id) do update
  set stripe_customer_id = excluded.stripe_customer_id,
      updated_at = now();
end;
$$;

revoke execute on function public.set_stripe_customer_id(uuid, text) from public, anon;
grant execute on function public.set_stripe_customer_id(uuid, text) to authenticated;
