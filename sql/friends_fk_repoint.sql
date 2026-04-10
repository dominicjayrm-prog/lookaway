-- ──────────────────────────────────────────────────────────────────
-- Friends system: FK repoint — applied 2026-04
-- ──────────────────────────────────────────────────────────────────
-- The friendships + friend_challenges tables originally had their FKs
-- pointing at `auth.users(id)`, but the JS code in
-- `src/utils/friends.ts` uses PostgREST embedded selects that name the
-- constraint and expect it to resolve to `public.profiles`:
--
--   .select('id, created_at, requester:profiles!friendships_requester_id_fkey(...)')
--
-- Because the named constraint pointed at auth.users, PostgREST could
-- not traverse it to profiles and the joined row came back null —
-- which is why incoming friend requests were invisible to the
-- addressee. Same story for friend_challenges.
--
-- Fix: drop the existing auth.users FKs and recreate them with the
-- SAME names targeting `profiles.id`. Because `profiles.id` already
-- references `auth.users(id)`, overall referential integrity is
-- preserved — the deletion path becomes auth.users → profiles →
-- friendships (cascade at each step).

alter table public.friendships
  drop constraint if exists friendships_requester_id_fkey,
  drop constraint if exists friendships_addressee_id_fkey;

alter table public.friendships
  add constraint friendships_requester_id_fkey
    foreign key (requester_id) references public.profiles(id) on delete cascade,
  add constraint friendships_addressee_id_fkey
    foreign key (addressee_id) references public.profiles(id) on delete cascade;

alter table public.friend_challenges
  drop constraint if exists friend_challenges_challenger_id_fkey,
  drop constraint if exists friend_challenges_challenged_id_fkey;

alter table public.friend_challenges
  add constraint friend_challenges_challenger_id_fkey
    foreign key (challenger_id) references public.profiles(id) on delete cascade,
  add constraint friend_challenges_challenged_id_fkey
    foreign key (challenged_id) references public.profiles(id) on delete cascade;
