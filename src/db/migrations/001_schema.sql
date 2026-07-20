-- Family Hub: Core Schema
-- Privacy-first: interactions store ONLY metadata (type, timestamps, member refs).
-- NEVER store message content in interactions.metadata.

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

------------------------------------------
-- Family Groups
------------------------------------------
create table if not exists family_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now(),
  plan        text not null default 'free' check (plan in ('free', 'premium')),
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
);

------------------------------------------
-- Family Members
------------------------------------------
create table if not exists family_members (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references family_groups(id) on delete cascade,
  display_name  text not null,
  relationship  text not null default 'family',
  avatar_url    text,
  timezone      text not null default 'UTC',
  created_at    timestamptz not null default now()
);

create index if not exists idx_members_group on family_members(group_id);

------------------------------------------
-- Member Preferences
------------------------------------------
create table if not exists member_preferences (
  id                    uuid primary key default gen_random_uuid(),
  member_id             uuid not null unique references family_members(id) on delete cascade,
  ui_mode               text not null default 'standard' check (ui_mode in ('standard', 'grandparent')),
  notifications_enabled boolean not null default true,
  digest_frequency      text not null default 'weekly' check (digest_frequency in ('daily', 'weekly', 'monthly'))
);

------------------------------------------
-- Interactions (metadata ONLY — no message content)
------------------------------------------
create table if not exists interactions (
  id               uuid primary key default gen_random_uuid(),
  from_member_id   uuid not null references family_members(id) on delete cascade,
  to_member_id     uuid references family_members(id) on delete cascade,
  group_id         uuid not null references family_groups(id) on delete cascade,
  interaction_type text not null check (interaction_type in (
    'nudge_sent', 'nudge_acknowledged', 'message_sent',
    'reaction', 'call_started', 'digest_opened'
  )),
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists idx_interactions_group on interactions(group_id);
create index if not exists idx_interactions_member on interactions(from_member_id, to_member_id);
create index if not exists idx_interactions_created on interactions(group_id, created_at desc);

------------------------------------------
-- Nudges
------------------------------------------
create table if not exists nudges (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references family_groups(id) on delete cascade,
  from_member_id   uuid not null references family_members(id) on delete cascade,
  to_member_id     uuid not null references family_members(id) on delete cascade,
  nudge_type       text not null check (nudge_type in ('dormancy', 'cooling', 'celebration', 'conversation_starter')),
  message_text     text not null,
  status           text not null default 'pending' check (status in ('pending', 'acknowledged', 'ignored')),
  created_at       timestamptz not null default now(),
  acknowledged_at  timestamptz
);

create index if not exists idx_nudges_member on nudges(to_member_id, status);

------------------------------------------
-- Digests
------------------------------------------
create table if not exists digests (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references family_groups(id) on delete cascade,
  member_id   uuid not null references family_members(id) on delete cascade,
  content     jsonb not null default '{}'::jsonb,
  sent_at     timestamptz,
  opened_at   timestamptz
);

create index if not exists idx_digests_member on digests(member_id);
