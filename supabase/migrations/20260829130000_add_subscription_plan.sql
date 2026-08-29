-- Standard/Proの2段階サブスクを導入するため、現在有効なプランをcredit_balancesに保持する。
-- null = Free（サブスク未加入）。Stripe webhookのcustomer.subscription.*で同期する。
alter table credit_balances
  add column if not exists plan text check (plan in ('standard', 'pro'));
