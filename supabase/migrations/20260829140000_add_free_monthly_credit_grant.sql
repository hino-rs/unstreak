-- Freeプラン(plan is null)向けの毎月少量クレジット付与。docs/料金プラン設計.md参照。
-- Standard/Proは既存のStripe invoice.paidでの付与(サブスクの請求サイクルに連動)を継続するため対象外。

insert into app_config (key, value) values
  ('free_monthly_credits', '15')
on conflict (key) do nothing;

-- ============================================================
-- grant_monthly_free_credits — Vercel Cron等の月次バッチからservice_role経由でのみ呼ばれる。
-- 呼び出し元の認可(cronシークレット検証)はAPIルート側の責務。
-- 月ごとの一意なstripe_event_id('free_monthly:YYYY-MM:user_id')でON CONFLICT DO NOTHINGにより
-- 二重付与(バッチの誤発火・リトライ)を防ぐ。stripe_event_idという名前だがStripe起因のイベントに限らない
-- 冪等性キーとして流用している(credit_transactionsの唯一のunique制約列のため)。
-- ============================================================
create or replace function public.grant_monthly_free_credits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount integer;
  v_period text := to_char(now(), 'YYYY-MM');
  v_user record;
  v_granted integer := 0;
begin
  select value::integer into v_amount
  from app_config
  where key = 'free_monthly_credits';

  if v_amount is null or v_amount <= 0 then
    return 0;
  end if;

  for v_user in
    select user_id from credit_balances where plan is null
  loop
    perform public.grant_credit(
      v_user.user_id,
      v_amount,
      'free_monthly',
      'free_monthly:' || v_period || ':' || v_user.user_id
    );
    v_granted := v_granted + 1;
  end loop;

  return v_granted;
end;
$$;

revoke execute on function public.grant_monthly_free_credits() from public, anon, authenticated;
grant execute on function public.grant_monthly_free_credits() to service_role;
