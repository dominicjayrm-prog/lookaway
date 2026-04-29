-- Endgame 20 — sync flag for the Grand Master celebration.
-- Mirrors `has_seen_brain_master` so the position-400 milestone
-- doesn't re-fire across devices once the player has seen it.
--
-- Column is nullable + defaulted to false so existing profiles
-- without the field default cleanly. Idempotent — safe to run more
-- than once.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_seen_grand_master BOOLEAN NOT NULL DEFAULT false;
