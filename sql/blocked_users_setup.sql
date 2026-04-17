-- ──────────────────────────────────────────────────────────────────
-- Blocked users — Apple guideline 1.2 (UGC moderation)
-- ──────────────────────────────────────────────────────────────────
-- Run in the Supabase SQL editor. Idempotent.
--
-- Apple requires three things for any app with user-to-user
-- interaction:
--   1. A way to REPORT abusive users        → user_reports (existing)
--   2. A way to BLOCK a user                → blocked_users (this file)
--   3. A way for the app to FILTER content  → friends.ts filters below
--
-- "Remove friend" alone doesn't satisfy (2) — a removed friend can
-- still send a new request, appear in search, etc. Blocking is a
-- one-way hard mute.
--
-- Semantics:
--   - blocked_users(blocker_id, blocked_id) is a directed edge.
--   - If A blocks B: A never sees B (search, requests, leaderboards)
--     AND B never sees A (symmetric filtering in friends.ts).
--   - Blocking auto-cancels any friendship and pending requests
--     between the two (handled client-side in blockUser()).

create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Reverse-lookup index: "who has blocked ME?" — used in friends.ts to
-- hide myself from users who have blocked me.
create index if not exists blocked_users_blocked_id_idx
  on public.blocked_users (blocked_id);

alter table public.blocked_users enable row level security;

-- Read: a user can see their own blocks. They can ALSO see
-- rows where they are the blocked party — required so the client can
-- answer "is this person hidden from me?" without a service key.
create policy if not exists "Users can view blocks involving them"
  on public.blocked_users
  for select
  to authenticated
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

-- Insert: users can only block FROM their own account.
create policy if not exists "Users can block others"
  on public.blocked_users
  for insert
  to authenticated
  with check (auth.uid() = blocker_id);

-- Delete (unblock): only the blocker can remove.
create policy if not exists "Users can unblock"
  on public.blocked_users
  for delete
  to authenticated
  using (auth.uid() = blocker_id);
