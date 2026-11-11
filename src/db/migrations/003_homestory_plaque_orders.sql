-- HomeStory — brass plaque orders.
--
-- No workshop is connected and no payment is taken. A row here is a *reserved*
-- order: the owner has asked to be first in the queue for a plaque, and their
-- delivery details are held so it can be made once a supplier is connected.
-- Nothing in this table means paid, in production or on its way.
--
-- There are deliberately no payment columns: no card data, no amount taken, no
-- Stripe reference. The price shown on screen is the intended price, not a
-- charge.

create table if not exists plaque_orders (
  id uuid primary key,
  home_id uuid not null references homes (id) on delete cascade,
  name text not null,
  address_line1 text not null,
  address_line2 text,
  town text not null,
  postcode text not null,
  note text,
  -- 'reserved' is the only status that exists today: saved, not paid, not made.
  status text not null default 'reserved',
  created_at timestamptz not null default now()
);

create index if not exists plaque_orders_home_idx on plaque_orders (home_id, created_at desc);
