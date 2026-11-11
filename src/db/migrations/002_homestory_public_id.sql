-- HomeStory — the public address of a published home.
--
-- public_id is what a QR plaque encodes: short, unguessable, and fixed for the
-- life of the home. It is independent of homes.id (which is the owner's private
-- handle) and is only ever assigned when a home is published. A row without a
-- public_id has no public page at all.

alter table homes add column if not exists public_id text;

-- Backfill any home that already exists. Random per row, never derived from the
-- id, so knowing a home's id does not reveal its public address.
update homes
set public_id = substr(md5(random()::text || id::text || clock_timestamp()::text), 1, 12)
where public_id is null;

create unique index if not exists homes_public_id_idx on homes (public_id);
