-- Family Hub: Authentication Schema
-- Accounts, sessions, and linking family members to authenticated accounts.

------------------------------------------
-- Accounts
------------------------------------------
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,
  display_name  text not null,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

------------------------------------------
-- Sessions
------------------------------------------
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references accounts(id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_sessions_account on sessions(account_id);
create index if not exists idx_sessions_expires on sessions(expires_at);

------------------------------------------
-- Link family_members to accounts
------------------------------------------
alter table family_members
  add column if not exists account_id uuid references accounts(id) on delete set null;

create index if not exists idx_members_account on family_members(account_id);
