-- ──────────────────────────────────────────────────────────────────
-- Username profanity + reserved-name trigger
-- ──────────────────────────────────────────────────────────────────
-- Run in the Supabase SQL editor. Idempotent.
--
-- Server-side authoritative check. The client does a matching check
-- (src/utils/profanityFilter.ts via the `obscenity` package) for
-- fast feedback on signup, but this trigger is what actually stops
-- a banned username from landing in `public.profiles` if the client
-- is bypassed (devtools console, a third-party tool, etc.).
--
-- Matching strategy:
--   1. Format rule: 3-20 chars, [a-z0-9_], can't start or end with
--      an underscore, can't be all digits.
--   2. Reserved list — stored in the same `banned_words` table as
--      profanity (admin, blanked, support, etc.).
--   3. Profanity — `banned_words` table with seed list. Can be
--      extended at runtime without a new migration.
--
-- Two normalised forms are checked per candidate:
--   a) `normalise_for_filter` — 4→a, 0→o, 1→i, 3→e, $→s, 7→t, @→' '.
--      Catches visual l33t substitutions like 'sh1t' or '@sshole'.
--   b) `normalise_strip_digits` — strips all non-letters. Catches
--      bypasses like 'fu4ck' where the digit sits inside a word.
--
-- Both forms are needed because certain substitutions (e.g. '4'
-- replacing a U-sound in 'f4ckface') work only when the digit is
-- dropped rather than translated visually.

-- 1. Banned-words table ------------------------------------------------
create table if not exists public.banned_words (
  word text primary key
);

-- Starter seed — curated lowercase list of English slurs, common
-- profanity, reserved impersonation vectors, and short
-- consonant-skip bypass roots ('fck', 'btch', etc.). Extend by
-- running `insert into banned_words(word) values (...)`.
insert into public.banned_words (word) values
  ('fuck'), ('shit'), ('bitch'), ('bastard'), ('asshole'),
  ('dick'), ('cock'), ('pussy'), ('cunt'), ('whore'), ('slut'),
  ('nigger'), ('nigga'), ('faggot'), ('fag'), ('retard'),
  ('kike'), ('spic'), ('chink'), ('tranny'), ('dyke'),
  ('kill'), ('rape'), ('rapist'), ('pedo'), ('pedophile'),
  ('hitler'), ('nazi'), ('isis'),
  ('porn'), ('sex'), ('anal'), ('boob'),
  ('admin'), ('administrator'), ('moderator'), ('support'),
  ('staff'), ('official'), ('system'), ('blanked'), ('blankedapp'),
  -- Consonant-skip bypass roots
  ('fck'), ('fuk'), ('phuck'), ('phuk'),
  ('sht'), ('shyt'),
  ('btch'), ('biatch'),
  ('n1g'), ('nigg'),
  ('cnt'), ('cck')
on conflict (word) do nothing;

-- 2. Normaliser A: visual l33t → letters -------------------------------
create or replace function public.normalise_for_filter(input text)
returns text language sql immutable as $$
  select regexp_replace(
    translate(lower(input),
      '4013$7@',
      'aoiest a'),
    '[^a-z]', '', 'g'
  );
$$;

-- 3. Normaliser B: strip digits entirely -------------------------------
-- 'fu4ck' → 'fuck'. Complementary to normaliser A.
create or replace function public.normalise_strip_digits(input text)
returns text language sql immutable as $$
  select regexp_replace(lower(input), '[^a-z]', '', 'g');
$$;

-- 4. Cleanliness check -------------------------------------------------
create or replace function public.username_is_clean(candidate text)
returns boolean language plpgsql immutable as $$
declare
  lowered   text := lower(trim(candidate));
  normed_a  text := public.normalise_for_filter(candidate);
  normed_b  text := public.normalise_strip_digits(candidate);
  w record;
begin
  -- Format
  if lowered !~ '^[a-z0-9_]{3,20}$' then return false; end if;
  if lowered ~ '^_' or lowered ~ '_$' then return false; end if;
  if lowered ~ '^[0-9]+$' then return false; end if;

  -- Check banned list against original, translated, and
  -- digit-stripped forms.
  for w in select word from public.banned_words loop
    if lowered = w.word then return false; end if;
    if position(w.word in lowered) > 0 then return false; end if;
    if position(w.word in normed_a) > 0 then return false; end if;
    if position(w.word in normed_b) > 0 then return false; end if;
  end loop;

  return true;
end;
$$;

-- 5. Trigger -----------------------------------------------------------
create or replace function public.enforce_username_clean()
returns trigger language plpgsql as $$
begin
  if new.username is null then
    return new;
  end if;
  if not public.username_is_clean(new.username) then
    raise exception 'Username not allowed'
      using errcode = 'check_violation',
            hint = 'Please choose a different username';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_username_clean on public.profiles;
create trigger trg_enforce_username_clean
  before insert or update of username on public.profiles
  for each row
  execute function public.enforce_username_clean();

-- 6. Surface any already-dirty usernames (read-only audit) -------------
--
--   select id, username from public.profiles
--   where not public.username_is_clean(username);
