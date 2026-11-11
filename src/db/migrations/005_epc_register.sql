-- HomeStory — the physical record, from the EPC register.
--
-- The EPC register is the first record source HomeStory is actually connected
-- to. It holds the building: floor area, energy band, walls, roof, windows and
-- — where the certificate carries it — the construction age band. It does not
-- hold people: previous owners and dates are still not available from anywhere,
-- and nothing here pretends otherwise.
--
-- Provenance is stored, not assumed:
--   epc_sourced          — the facts below came from a certificate in the
--                          register, not from the owner's memory.
--   epc_certificate_date — the certificate's registration date, so the page can
--                          say when the record was made.
--   epc_fields           — the field keys still exactly as the register recorded
--                          them. When the owner edits or clears a value, its key
--                          leaves this list, so an owner's correction is never
--                          attributed to the register.
--
-- Every EPC-derived fact is public record under the Open Government Licence
-- v3.0, © Crown copyright, which is why the published page carries the
-- attribution line whenever any of these fields is still as recorded.

alter table homes add column if not exists floor_area text;
alter table homes add column if not exists wall_type text;
alter table homes add column if not exists roof_type text;
alter table homes add column if not exists window_type text;

alter table homes add column if not exists epc_certificate_number text;
alter table homes add column if not exists epc_certificate_date text;
alter table homes add column if not exists epc_uprn text;
alter table homes add column if not exists epc_sourced boolean not null default false;
alter table homes add column if not exists epc_fields jsonb not null default '[]'::jsonb;
