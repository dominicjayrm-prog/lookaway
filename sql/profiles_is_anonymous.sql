-- Guest mode — mirror auth.users.is_anonymous into profiles so
-- queries that don't already join auth.users (leaderboard, friend
-- search, public profile lookups) can cheaply exclude guest accounts.
--
-- Idempotent — safe to run more than once.
--
-- Paired client work:
--   - AuthProvider.signInAsGuest() calls supabase.auth.signInAnonymously()
--     then upserts profiles with is_anonymous=true and an auto-generated
--     `player_xxxx` username so the home redirect doesn't bounce to
--     the /username picker.
--   - Upgrade path (Settings → Save your account) calls
--     supabase.auth.updateUser({ email, password }) which flips
--     auth.users.is_anonymous to false; the upgrade handler then
--     mirrors the flip into profiles.is_anonymous.
--   - Leaderboard + friend-search queries filter is_anonymous=false.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT false;

-- Index supports the "exclude guests" filter on leaderboard /
-- friend-search hot paths. Partial index because the overwhelming
-- majority of rows are non-anonymous; we only need to find the
-- anonymous ones to subtract them out (in practice the planner uses
-- the absence: `where is_anonymous = false` becomes an index-skip
-- scan on the partial). Cheap to maintain, fast to read.
CREATE INDEX IF NOT EXISTS idx_profiles_is_anonymous_true
  ON public.profiles (id)
  WHERE is_anonymous = true;

-- Update the new-user trigger to mirror auth.users.is_anonymous into
-- profiles.is_anonymous at row creation time. For email + Apple
-- sign-ups is_anonymous is false, so existing flows are unchanged.
-- For supabase.auth.signInAnonymously() the flag is true, which is
-- what we want.
--
-- For anonymous users we leave display_name as the 'Player' fallback
-- (no email or full_name available); the client immediately upserts
-- a deterministic `player_xxxx` username + matching display_name
-- after the auth call resolves.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.profiles (id, display_name, gems, lives, is_anonymous)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1),
      'Player'
    ),
    100,
    5,
    coalesce(new.is_anonymous, false)
  );
  return new;
end;
$function$;
