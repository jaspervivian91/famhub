-- HomeStory — HomeStory Premium, bought once per home.
--
-- Premium is a one-off £24.99 for the house, not a subscription and not a
-- per-person licence: a home that has paid stays Premium for ever, including
-- when the page passes to the next owner. The two Claude features with a real
-- running cost — Story Polish and Ask Your House — are what it buys.
--
-- A row in premium_purchases is written only after the server has asked Stripe
-- about the session and been told it is paid, for this home, at this price. The
-- session id is unique, so replaying the same return does not double-record.
-- No card data is held here: Stripe keeps that, and never sends it to us.

alter table homes add column if not exists premium_at timestamptz;

create table if not exists premium_purchases (
  id uuid primary key,
  home_id uuid not null references homes (id) on delete cascade,
  -- Stripe's checkout session id. Unique: the same payment cannot be recorded twice.
  stripe_session_id text not null unique,
  amount_total integer not null,
  currency text not null,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists premium_purchases_home_idx
  on premium_purchases (home_id, paid_at desc);
