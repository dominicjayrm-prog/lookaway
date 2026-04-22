-- Fix: new-user trigger now falls back through a sensible chain
-- before landing on the generic "Player" placeholder:
--
--   1. raw_user_meta_data.display_name — set by email signup
--   2. raw_user_meta_data.full_name    — set by Supabase for Apple OAuth
--   3. email local-part                — e.g. "tomo" from "tomo@icloud.com"
--   4. 'Player'                        — last-resort placeholder
--
-- Pre-fix: Apple Sign-In users ended up with display_name='Player'
-- because Apple populates raw_user_meta_data.full_name, NOT
-- display_name, and the old trigger only checked display_name. The
-- admin dashboard reads display_name, so all Apple users showed up
-- as "Player" in the user list.
--
-- Paired client fix: the /username picker now writes both `username`
-- AND `display_name` on first save (see app/username.tsx) so any
-- future Apple user who picks a username has both columns set.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.profiles (id, display_name, gems, lives)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      split_part(new.email, '@', 1),
      'Player'
    ),
    100,
    5
  );
  return new;
end;
$function$;

-- One-time retroactive backfill applied via MCP, not in this file:
--   UPDATE public.profiles
--   SET display_name = username
--   WHERE display_name = 'Player'
--     AND username IS NOT NULL AND username <> '';
-- Fixed 6 Apple users (bulldog, leapayne, tomo, annix, ethan, keko).
