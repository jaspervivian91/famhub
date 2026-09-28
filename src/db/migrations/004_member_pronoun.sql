-- 004_member_pronoun.sql
-- Optional pronoun for a family member ("she" / "he" / "they").
--
-- Used only for warm, human copy on the relationship profile screen:
--   "You talk most on Sundays. Sundays matter to her."
-- When it is NULL the app falls back to "them", so this column is entirely
-- optional and additive — existing rows and existing code are unaffected.
--
-- This is family-set profile data, not message content: the app never reads
-- or stores what anyone says, only interaction metadata.

alter table family_members add column if not exists pronoun text;
