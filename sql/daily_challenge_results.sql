-- ──────────────────────────────────────────────────────────────────
-- Daily Challenge: results table
-- ──────────────────────────────────────────────────────────────────
-- Idempotent. One row per (user, UTC date). Single-attempt-per-day
-- is enforced at the DB level via the UNIQUE constraint, so no
-- amount of client-side bypassing can produce a second submission
-- for the same date.
--
-- Two earlier placeholder tables (daily_challenges + daily_results)
-- were dropped before this migration ran. They were defined in
-- CLAUDE.md as part of an old design but never wired into any code,
-- and `src/types/daily.ts` carried a comment confirming the feature
-- had been removed. The 1 stray row in daily_challenges was test
-- seed data, not user data.

drop table if exists public.daily_results cascade;
drop table if exists public.daily_challenges cascade;

create table if not exists public.daily_challenge_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Stored as a DATE (not timestamp) so daily lookups are trivial.
  -- This is the UTC calendar day the challenge belongs to, so
  -- everyone in the world plays the same daily on the same row.
  challenge_date date not null,
  mode text not null,
  -- Normalised score 0-100 for cross-mode comparability. Each mode
  -- defines its own raw scoring then projects to this range.
  score integer not null check (score >= 0 and score <= 100),
  -- Time taken in seconds. Used for tiebreakers and trend analysis;
  -- the spec is explicit that this is NOT displayed prominently to
  -- the player so they don't feel rushed away from the memorise
  -- phase.
  time_seconds numeric(6,2) not null check (time_seconds >= 0),
  completed_at timestamptz not null default now(),
  -- Single-attempt enforcement. A second insert for the same
  -- (user, date) pair will fail at the DB. Clients catch the
  -- duplicate-key error and surface "Already played today" UI.
  unique(user_id, challenge_date)
);

create index if not exists idx_dcr_user_date
  on public.daily_challenge_results(user_id, challenge_date desc);

-- Date+mode index supports future leaderboard / per-date analytics.
create index if not exists idx_dcr_date_mode
  on public.daily_challenge_results(challenge_date, mode);

alter table public.daily_challenge_results enable row level security;

-- Each user can only read their own results. The future leaderboard
-- (if added) will need a separate aggregate view exposed via a
-- security-definer function rather than relaxing RLS here.
drop policy if exists dcr_select_own on public.daily_challenge_results;
create policy dcr_select_own on public.daily_challenge_results
  for select using (auth.uid() = user_id);

drop policy if exists dcr_insert_own on public.daily_challenge_results;
create policy dcr_insert_own on public.daily_challenge_results
  for insert with check (auth.uid() = user_id);

drop policy if exists dcr_update_own on public.daily_challenge_results;
create policy dcr_update_own on public.daily_challenge_results
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
