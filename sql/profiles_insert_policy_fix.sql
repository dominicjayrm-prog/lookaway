-- ──────────────────────────────────────────────────────────────────
-- profiles — missing INSERT policy fix (applied 2026-04)
-- ──────────────────────────────────────────────────────────────────
-- Symptom: a player could log in on a new browser / device and see
-- none of their cosmetics, gems, equipped items, streak or login
-- reward state — only their level progress came through. The
-- server-side `profiles` row was stuck at defaults (50 gems, empty
-- `owned_cosmetics`, default equipped slots) despite the player
-- having earned hundreds of gems and purchased multiple cosmetics
-- on their main device.
--
-- Root cause: `public.profiles` had SELECT and UPDATE policies but
-- NO INSERT policy. The client syncs profile state via
--
--   supabase.from('profiles').upsert(payload, { onConflict: 'id' })
--
-- which PostgREST translates into
--
--   INSERT INTO profiles (...) VALUES (...)
--   ON CONFLICT (id) DO UPDATE SET ...
--
-- Postgres validates both the INSERT policy (for the incoming row)
-- and the UPDATE policy (for the conflicting row) on every upsert,
-- even when the conflict always resolves to an UPDATE in practice.
-- With no INSERT policy the statement was rejected at the policy
-- check. The client swallowed the error in a try/catch and logged
-- a warning to console, which nobody sees on production builds.
--
-- Level progress kept flowing because `user_progress` is a separate
-- table and already had its own INSERT + UPDATE policies. That's
-- why `levels_done`, `total_stars` and `highest_world` were fine
-- on every device but cosmetics and gems weren't.
--
-- Fix: add an INSERT policy scoped to the row's own user so a
-- player can only seed / merge their own row. The UPDATE policy
-- continues to apply to the DO UPDATE branch.
--
-- Once this is live, the main device's next saveState call pushes
-- the complete profile up to Supabase and future fresh-device
-- loads receive the full state via loadFromCloud.

create policy if not exists "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);
