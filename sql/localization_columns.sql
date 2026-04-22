-- Localisation infrastructure for BLANKED's Spanish (and future locale)
-- support. Three things:
--
--  1. User preference — persisted on profiles so the user's choice
--     follows them across devices. 'system' defers to the device
--     locale; 'en' / 'es' pin explicitly.
--
--  2. Localised game content — denormalised ES columns on the two
--     level tables so the client can read `scene_data_es` for the
--     same level id when the resolved locale is Spanish. If a row's
--     ES column is NULL the client falls back to `scene_data`
--     (English) — strictly additive, never breaks existing users.
--
--  3. Localised achievements — same denormalised pattern for the
--     ~13 achievement rows' user-visible fields.
--
-- When we add a third language (French/German later), this should
-- be refactored into a proper `<table>_translations (entity_id, locale,
-- payload)` schema. For a single second locale the denorm is cleaner
-- and avoids a join on every scene fetch.

alter table public.profiles
  add column if not exists preferred_language text default 'system'
  check (preferred_language in ('system', 'en', 'es'));

comment on column public.profiles.preferred_language
  is '"system" defers to device locale; "en"/"es" pin explicitly. Synced across devices.';

alter table public.campaign_levels
  add column if not exists scene_data_es jsonb;

comment on column public.campaign_levels.scene_data_es
  is 'Spanish scene_data. NULL = not translated yet; client falls back to scene_data.';

alter table public.side_campaign_levels
  add column if not exists scene_data_es jsonb;

comment on column public.side_campaign_levels.scene_data_es
  is 'Spanish scene_data. NULL = not translated yet; client falls back to scene_data.';

alter table public.achievements
  add column if not exists name_es text,
  add column if not exists description_es text;

comment on column public.achievements.name_es
  is 'Spanish name. NULL = not translated yet; client falls back to name.';
comment on column public.achievements.description_es
  is 'Spanish description. NULL = not translated yet; client falls back to description.';
