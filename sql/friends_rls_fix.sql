-- ──────────────────────────────────────────────────────────────────
-- Friends system RLS fix — applied 2026-04
-- ──────────────────────────────────────────────────────────────────
-- Run on `public.profiles` and `public.friendships` in the Supabase
-- SQL editor. Idempotent.
--
-- Fixes two bugs in the friends flow:
--
-- 1. User search ("no results found" for valid usernames) and the
--    username availability check on sign-up were broken because the
--    only SELECT policy on profiles was `auth.uid() = id`, meaning a
--    user could literally never see any row other than their own.
--    All calls to `searchUsers()`, `checkAvailability()`, and the
--    PostgREST embedded selects inside `getFriends()` /
--    `getFriendRequests()` / `getActiveChallenges()` silently
--    filtered their joined profile rows to zero.
--
-- 2. `removeFriend()` and `declineFriendRequest()` in
--    `src/utils/friends.ts` both call `.delete()` on `friendships`,
--    but there was no DELETE policy on the table — so those
--    operations silently no-op'd.
--
-- Safe because:
--   - Column-level sensitive data (email, password hash) lives in
--     `auth.users`, not `public.profiles`.
--   - The new SELECT policy is limited to the `authenticated` role,
--     so the anon key still can't scrape profiles.

create policy if not exists "Authenticated users can view any profile"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy if not exists "Users can delete own friendships"
  on public.friendships
  for delete
  to authenticated
  using ((auth.uid() = requester_id) or (auth.uid() = addressee_id));
