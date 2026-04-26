# Notifications — what fires, why some haven't been firing

Status as of this branch (`claude/journey-purple-unified`):

## All notifications wired up

| Notification | Where it lives | When it fires | Conditions |
|---|---|---|---|
| Lives full | client | when regen timer would complete | NOT for Plus / Remove-Ads (skipped) |
| Streak save | client | 6pm local (was 8pm) | streak ≥ 3 |
| Daily reminder | client | user's chosen time (default 9am) | daily_reminder pref ≠ false, time set |
| Win-back day 3 | client | 3 days after backgrounding | cancelled on app open |
| Win-back day 7 | client | 7 days after backgrounding | **carries 15-gem reward** |
| Win-back day 14 | client | 14 days after backgrounding | **carries 15-gem reward** |
| Onboarding day 1 | client | 6pm on day after first launch | new system this branch |
| Onboarding day 2 | client | 6pm 2 days after first launch | new system this branch |
| Onboarding day 3 | client | 6pm 3 days after first launch | new system this branch |
| Onboarding day 5 | client | 6pm 5 days after first launch | new system this branch |
| Onboarding day 7 | client | 6pm 7 days after first launch | new system this branch |
| Weekly challenge | client | Sunday 7pm local | weekly_challenge pref ≠ false |
| Friend challenge | server | when challenge is sent | INSERT trigger on `friend_challenges` |
| Challenge result | server | when opponent finishes | INSERT trigger on `challenge_results` |
| Challenge declined | server | when opponent declines | INSERT trigger |
| Friend request | server | when request created | INSERT trigger |
| Friend accepted | server | when accepted | INSERT trigger |
| Friend online | server | when friend toggles online | (rate-limited server-side) |
| Achievement | server-or-client | on tier unlock | depending on path |
| Morning hype | server | 9am user-local | edge fn `push-dispatch` |

## Why a player might only see the lives notification

Common reasons, in order of likelihood:

1. **Streak < 3** — streak save reminder requires streak ≥ 3, so a fresh user who hasn't strung 3 days together yet won't get the 6pm push.
2. **Daily reminder is set to a time the user is already in-app** — iOS suppresses notifications fired while the app is in the foreground.
3. **App opened more often than every 3 days** — win-back pushes are scheduled when the app is backgrounded, then cancelled on next foreground. A user opening daily never sees them.
4. **Sunday hasn't passed yet** — weekly challenge fires Sunday 7pm only.
5. **First-open onboarding pushes weren't in the app yet** — these only fire for users who installed AFTER this branch ships.
6. **Server-side cron not deployed** — friend / challenge / morning hype pushes all require the Supabase edge function to be running.

## Server-side fixes needed (NOT in this repo)

### 1. The "Good morning at 6pm" bug

The morning hype push lives in a Supabase edge function (`push-dispatch` or similar — the name lives in `src/utils/notifications.ts:638` as a comment). The function isn't checked into this repo, so I can't change its text.

**Quick fix**: in the Supabase dashboard → Edge Functions, find the function that sends the morning push, and either:
- Change `Good morning!` to `Hey!` (or similar time-neutral greeting), OR
- Compute the user's local hour from `profiles.timezone` and pick a greeting accordingly:

```ts
// Pseudo-code for inside the edge function body:
const hour = new Date().toLocaleString('en-US', { timeZone: profile.timezone, hour: 'numeric', hour12: false });
const greeting =
  hour >= 5 && hour < 12 ? 'Good morning' :
  hour >= 12 && hour < 17 ? 'Good afternoon' :
  hour >= 17 && hour < 21 ? 'Good evening' :
  'Hey night owl';
```

If the easier path is just `'Hey'` for everyone, that works fine too.

### 2. Friend score-beaten push (not built yet)

Suggested implementation when you next touch the edge function:

```sql
-- Trigger fires when a friend's leaderboard row updates and their
-- new score now exceeds the user's score on the same level.
-- Sends one push per day max per user-friend pair.
```

Body: `"{friendName} just beat your score on Level {N}. Reclaim it?"`
Deep-link: `blanked://game/{levelId}` (or whatever the level launcher route is).

## Client-side debugging checklist for "I'm not getting notifications"

If a user says they're not getting any:

1. iOS Settings → Blanked → Notifications — must be ON
2. In-app: Settings → Sound & Notifications — `daily_reminder` and `streak_reminder` should be ON
3. In-app: Settings → Daily reminder time — should be set (default 09:00)
4. Open the app, then close it. Check `expo-notifications` `getAllScheduledNotificationsAsync` from a debug build to see what's actually scheduled.
5. Check `profiles.notification_preferences` in Supabase — should match what's in the app
6. Check `profiles.daily_reminder_time` is non-null
7. Check `profiles.push_token` is set (server-side pushes need this)

## Files touched this branch (notification work)

- `src/utils/notifications.ts` — bail subs from lives push, streak push 8→6pm, onboarding scheduler, win-back gem payload, COMEBACK_GEMS constant
- `src/lib/comebackReward.ts` (NEW) — eligibility + claim helpers
- `src/components/ComebackRewardModal.tsx` (NEW) — in-app claim UI
- `src/i18n/locales/en.json`, `es.json` — onboarding keys + comeback modal copy
- `app/_layout.tsx` — schedule onboarding on launch, mount ComebackRewardModal
