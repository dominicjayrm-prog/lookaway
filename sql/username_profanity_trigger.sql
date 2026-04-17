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
--   2. Reserved list — hard-coded below.
--   3. Profanity list — stored in `public.banned_words` so non-devs
--      can extend it without a migration. Both exact matches AND
--      a normalised l33t-speak form are checked (replace 4→a, 0→o,
--      1→i, 3→e, $→s, 7→t, @→a; strip non-letters).
--
-- Limitations:
--   - This is a belt-and-braces layer. It doesn't need to catch
--     every variant that obscenity catches on the client — the
--     client already handles most creative bypasses. The trigger
--     just needs to stop the obvious ones if the client was
--     skipped altogether.
--   - Non-English profanity isn't covered server-side. Add rows to
--     `banned_words` as needed.

-- 1. Banned-words table ------------------------------------------------
create table if not exists public.banned_words (
  word text primary key
);

-- Starter seed — curated lowercase list of common English slurs and
-- profanity that Apple reviewers are most likely to flag on a
-- leaderboard. Safe to extend via `insert into banned_words(word)`.
-- Intentionally short; the client-side `obscenity` dataset catches
-- the wide variant surface, this is just the server-side fallback.
insert into public.banned_words (word) values
  ('fuck'), ('shit'), ('bitch'), ('bastard'), ('asshole'),
  ('dick'), ('cock'), ('pussy'), ('cunt'), ('whore'), ('slut'),
  ('nigger'), ('nigga'), ('faggot'), ('fag'), ('retard'),
  ('kike'), ('spic'), ('chink'), ('tranny'), ('dyke'),
  ('kill'), ('rape'), ('rapist'), ('pedo'), ('pedophile'),
  ('hitler'), ('nazi'), ('isis'),
  ('porn'), ('sex'), ('anal'), ('boob'),
  ('admin'), ('administrator'), ('moderator'), ('support'),
  ('staff'), ('official'), ('system'), ('blanked'), ('blankedapp')
on conflict (word) do nothing;

-- 2. Normaliser --------------------------------------------------------
-- Collapse common l33t-speak to plain letters so we catch "f4ck",
-- "sh1t", "$hit", "h@t3". Strips any remaining non-letter chars
-- (numbers, underscores, symbols) after substitution, so we're
-- checking letter-only roots.
create or replace function public.normalise_for_filter(input text)
returns text language sql immutable as $$
  select regexp_replace(
    translate(lower(input),
      '4013$7@',
      'aoiest a'),
    '[^a-z]', '', 'g'
  );
$$;

-- 3. Cleanliness check -------------------------------------------------
create or replace function public.username_is_clean(candidate text)
returns boolean language plpgsql immutable as $$
declare
  lowered text := lower(trim(candidate));
  normed  text := public.normalise_for_filter(candidate);
  w record;
begin
  -- Format
  if lowered !~ '^[a-z0-9_]{3,20}$' then return false; end if;
  if lowered ~ '^_' or lowered ~ '_$' then return false; end if;
  if lowered ~ '^[0-9]+$' then return false; end if;

  -- Exact match against banned list
  for w in select word from public.banned_words loop
    if lowered = w.word then return false; end if;
    if position(w.word in lowered) > 0 then return false; end if;
    if position(w.word in normed) > 0 then return false; end if;
  end loop;

  return true;
end;
$$;

-- 4. Trigger -----------------------------------------------------------
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

-- 5. Bootstrap existing rows (optional, safe) --------------------------
-- If there are already-dirty usernames in prod, this query surfaces
-- them so they can be manually cleaned up. It doesn't modify data.
--
--   select id, username from public.profiles
--   where not public.username_is_clean(username);
