-- Family Hub: Waitlist Signups
-- Captures email signups from the marketing landing page.

create table if not exists waitlist_signups (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  created_at  timestamptz not null default now()
);
