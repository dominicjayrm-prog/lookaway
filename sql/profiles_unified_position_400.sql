-- Endgame 20: extend unified_position constraint from 1-380 to 1-400.
--
-- Without this, advanceUnifiedPosition() will fail to write past 380 on
-- any device that round-trips through Supabase, because the existing
-- profiles_unified_position_range check rejects values > 380.
--
-- Idempotent: drops + recreates the constraint.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_unified_position_range;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_unified_position_range
  CHECK (unified_position >= 1 AND unified_position <= 400);
