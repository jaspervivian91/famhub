-- HomeStory — what the address has sold for, from HM Land Registry Price Paid
-- Data (PPD).
--
-- PPD is the register of residential sales in England and Wales since 1995. It
-- holds prices and dates; it holds no names, so a past owner is still on no
-- register we can reach. The sale history is asked for once, for one address,
-- when the owner starts a home, and stored here — the published page reads from
-- this table and never calls Land Registry on a scan.
--
-- A miss is normal: a home that has not sold since 1995, or is in Scotland or
-- Northern Ireland, has no PPD record. That is stored as an empty list with
-- price_paid_checked_at set, which is how the page can tell "the register has
-- nothing" from "this address was never looked up".
--
--   price_paid_sales       — the sales as the register recorded them, newest
--                            first: price, date, new build, tenure.
--   price_paid_checked_at  — when the register was last asked about this
--                            address. Null means never asked.
--   price_paid_postcode    — what was asked, so the page can say what was
--   price_paid_paon          searched, and a later check can be re-run.
--
-- The owner's own typed sale price stays in last_sale_price / last_sale_date,
-- untouched and separate, so their figure is never shown as the register's.
--
-- Price Paid Data is public record under the Open Government Licence v3.0,
-- © Crown copyright, which is why the page carries the attribution line
-- wherever these rows appear.

alter table homes add column if not exists price_paid_sales jsonb not null default '[]'::jsonb;
alter table homes add column if not exists price_paid_checked_at timestamptz;
alter table homes add column if not exists price_paid_postcode text;
alter table homes add column if not exists price_paid_paon text;
