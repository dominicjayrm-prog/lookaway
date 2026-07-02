-- Phase 4 — one-time win-back push to the May Meta-ads cohort.
--
-- ⚠️  DO NOT RUN until the rescue-plan build (Phases 1-3) is LIVE in
--     the App Store / Play Store. These users churned off the old
--     funnel; this is the one re-engagement shot they'll give us,
--     and it must land them in the improved app, not the one that
--     lost them. Run in the Supabase SQL editor when ready.
--
-- Audience: profiles created during the Meta campaign window
-- (2026-05-05 → 2026-05-25) that have a registered push token
-- (18 users at time of writing). Guards:
--   - skips anyone who opened the app in the last 7 days (they're
--     not churned; a "come back" push would read as broken)
--   - skips anyone already sent a win_back push in the last 30 days
--     (notification_log check)
--   - schedules for 17:00 UTC (≈ 6pm UK) — evening phone time
--
-- The push-dispatch cron drains the queue every minute once
-- scheduled_for passes. Copy is warm, names the concrete change
-- (easier start, daily gem rewards), no guilt-trip.

INSERT INTO public.push_queue
  (user_id, scheduled_for, notification_type, title, body, data, status)
SELECT
  p.id,
  (CURRENT_DATE + interval '17 hours')
    + CASE WHEN now() > CURRENT_DATE + interval '16 hours 30 minutes'
           THEN interval '1 day' ELSE interval '0' END,
  'win_back',
  'BLANKED got a glow-up ✨',
  'Easier levels to start, gems for every win, and a daily challenge that pays. Your journey is right where you left it.',
  jsonb_build_object('type', 'win_back', 'deepLink', 'blanked://home'),
  'pending'
FROM public.profiles p
WHERE p.created_at >= '2026-05-05' AND p.created_at < '2026-05-26'
  AND p.push_token IS NOT NULL
  AND (p.last_seen IS NULL OR p.last_seen < now() - interval '7 days')
  AND NOT EXISTS (
    SELECT 1 FROM public.notification_log nl
    WHERE nl.user_id = p.id
      AND nl.notification_type = 'win_back'
      AND nl.sent_at > now() - interval '30 days'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.push_queue q
    WHERE q.user_id = p.id
      AND q.notification_type = 'win_back'
      AND q.status = 'pending'
  )
RETURNING user_id, scheduled_for;
