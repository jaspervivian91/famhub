-- HomeStory — estate agent accounts and the homes they own.
--
-- An agent's homes are theirs alone: homes.agent_id records the agent who added
-- the property, and every route that reads or writes a home checks it. NULL
-- agent_id is an individual owner's page, reached by its unguessable id — those
-- behave exactly as they did before agents existed.
--
-- Agent accounts are free while the product is being set up. Nothing here
-- records a subscription, a plan or a payment, because none can be sold: the
-- connected Stripe account is an express account and cannot take subscriptions.

create table if not exists agents (
  id uuid primary key,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_signed_in_at timestamptz
);

-- Only the hash of a session token is stored, so a copy of this table cannot be
-- replayed as a signed-in agent.
create table if not exists agent_sessions (
  token_hash text primary key,
  agent_id uuid not null references agents (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists agent_sessions_agent_idx on agent_sessions (agent_id);
create index if not exists agent_sessions_expiry_idx on agent_sessions (expires_at);

alter table homes add column if not exists agent_id uuid references agents (id) on delete set null;

create index if not exists homes_agent_idx on homes (agent_id, updated_at desc);
