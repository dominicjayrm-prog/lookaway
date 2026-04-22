-- Translation infrastructure for BLANKED's ~1,000 distinct level-
-- content strings. The approach: a (en→es) dictionary table plus a
-- PL/pgSQL function that walks a scene_data JSONB and produces a
-- translated copy. Anything not in the dictionary is left as-is, so
-- partial coverage ships safely — the client falls back to scene_data
-- (English) per-string when its Spanish counterpart is missing.
--
-- Coverage target on first ship: ~92% of 5,000 string instances in
-- campaign_levels are either directly translated or pass-through
-- (numbers, single letters, empty strings). The long-tail Stage 1/2/3
-- question variants and some one-off phrasings will show in English
-- on the first run — we can extend the dictionary later without
-- re-migrating because translate_scene_data_to_es() is IMMUTABLE
-- and can be re-applied idempotently.
--
-- Side campaigns don't need question translation — they're procedurally
-- generated from colour/shape pools, not hand-authored. The empty
-- level_data_es column is reserved for future config overrides but is
-- unused by the shipping client.

create table if not exists public.level_string_translations (
  en text primary key,
  es text not null
);

comment on table public.level_string_translations
  is 'English→Spanish string map used by translate_scene_data_to_es() to build scene_data_es in bulk. Partial coverage is fine — untranslated strings fall through to English.';

-- Dictionary seed (666 entries covering colours, shapes, positions,
-- numbers-as-words, common Yes/No/Both variants, and all the frequent
-- "How many X?" / "Where was X?" / "What colour was X?" / "Was there
-- a X?" question templates). Full content is in the project SQL
-- migrations — this file documents the shape.

create or replace function public.translate_scene_data_to_es(src jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  q jsonb;
  opt text;
  new_text text;
  new_opts jsonb;
  new_questions jsonb := '[]'::jsonb;
  translated_q jsonb;
begin
  if src is null or src->'questions' is null then
    return src;
  end if;

  for q in select * from jsonb_array_elements(src->'questions')
  loop
    select coalesce(t.es, q->>'text') into new_text
      from public.level_string_translations t
      where t.en = q->>'text';
    if new_text is null then new_text := q->>'text'; end if;

    new_opts := '[]'::jsonb;
    for opt in select jsonb_array_elements_text(q->'options')
    loop
      new_opts := new_opts || to_jsonb(
        coalesce(
          (select es from public.level_string_translations where en = opt),
          opt
        )
      );
    end loop;

    translated_q := q
      || jsonb_build_object('text', new_text)
      || jsonb_build_object('options', new_opts);

    new_questions := new_questions || jsonb_build_array(translated_q);
  end loop;

  return src || jsonb_build_object('questions', new_questions);
end;
$$;

comment on function public.translate_scene_data_to_es(jsonb)
  is 'Bulk-translates a campaign_levels.scene_data blob into Spanish using level_string_translations. Untranslated strings pass through unchanged. Pure (IMMUTABLE) so repeated calls are idempotent.';

-- Rename to match the table's actual data column (side levels store
-- config in `level_data`, not `scene_data` — the original migration
-- picked the wrong column name).
alter table public.side_campaign_levels rename column scene_data_es to level_data_es;

-- Apply: populate scene_data_es for every campaign_levels row. Re-run
-- this UPDATE whenever the dictionary grows.
-- UPDATE public.campaign_levels SET scene_data_es = public.translate_scene_data_to_es(scene_data);

-- Achievement translations (13 rows) — shipped inline rather than via
-- the dictionary table because there are only 13 and they're authored
-- copy, not generated.
-- UPDATE achievements SET name_es = ..., description_es = ... WHERE id = ...;
