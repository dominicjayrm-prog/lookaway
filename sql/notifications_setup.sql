-- ═══════════════════════════════════════════════════════════════════
-- BLANKED — Notifications & Online Status Database Setup
-- Run these statements in the Supabase SQL Editor
-- ════════════════════════════════���══════════════════════════���═══════

-- 1. Add last_active_at column to profiles (for 3-tier online status)
-- Note: if 'last_seen' already exists, this adds a more explicit column.
-- The app uses 'last_seen' already — no change needed unless renaming.
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now();

-- 2. Add notification_preferences column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
  "streak_reminder": true,
  "friend_challenge": true,
  "friend_online": true,
  "challenge_result": true,
  "lives_full": true,
  "tournament": true,
  "achievements": true,
  "friend_request": true,
  "win_back": true
}'::jsonb;

-- 3. Create notification log table (for rate limiting + dedup)
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL,
  user_id text,
  notification_type text,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  UNIQUE(key)
);

CREATE INDEX IF NOT EXISTS idx_notification_log_key ON notification_log(key);
CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id, sent_at);

-- 4. RLS policies for notification_log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert notification logs" ON notification_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read own notification logs" ON notification_log
  FOR SELECT USING (user_id = auth.uid()::text);

-- 5. Allow update on profiles for notification_preferences and push_token
-- (Should already exist from auth setup, but ensure the column is updatable)
