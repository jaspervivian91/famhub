-- HomeStory — homes and their photographs.
--
-- There is no records data source connected (Land Registry address API, EPC
-- register, 1921 census). Every value stored in last_sale_price, last_sale_date,
-- epc_rating, build_era and previous_owners was typed by the owner, which is
-- what homes.records_source records. NULL means "not yet on record" — a value is
-- never a placeholder, so a row can never be mistaken for a public record.

create table if not exists homes (
  id uuid primary key,
  address text not null,
  status text not null default 'draft',
  story text not null default '',
  last_sale_price text,
  last_sale_date text,
  epc_rating text,
  build_era text,
  previous_owners text,
  records_source text not null default 'owner',
  key_dates jsonb not null default '[]'::jsonb,
  hidden_gems jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists homes_updated_idx on homes (updated_at desc);

create table if not exists home_photos (
  id uuid primary key,
  home_id uuid not null references homes (id) on delete cascade,
  position integer not null default 0,
  mime text not null,
  width integer,
  height integer,
  bytes bytea not null,
  created_at timestamptz not null default now()
);

create index if not exists home_photos_home_idx on home_photos (home_id, position);
