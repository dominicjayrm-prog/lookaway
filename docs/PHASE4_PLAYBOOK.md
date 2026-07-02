# Phase 4 Playbook — Release, Re-test, Decide

*The last phase of docs/RESCUE_PLAN.md. Phases 0-3 are built and on the
branch; this document is the operator's checklist for the parts that
need a human with store/ads access. Work through it top to bottom.*

---

## Step 1 — Ship the build

1. Merge `claude/blanked-game-development-ZTZAY` → `main` (open a PR or
   merge directly — your call).
2. `eas build --platform all --profile production` (auto-submit is
   already configured for iOS).
3. iOS: submit the TestFlight build for App Store review.
   Android: promote the internal-testing build (closed testing track).
4. **Do not run the win-back or the ad re-test until the release is
   live** — both send people into whatever build is in the store.

## Step 2 — Smoke test (15 minutes, on a real device)

Fresh install (delete app first), then:

- [ ] Onboarding: 3 warm-up rounds feel winnable, feedback is warm,
      results → "Start playing" lands on home **with no login screen
      and no paywall**
- [ ] Play level 1-3: fail one on purpose → "no life lost — you're
      still warming up" pill, hearts untouched
- [ ] Complete a level → gems land (5/10/15 by stars), day-1 streak
      toast appears
- [ ] "Next Level" from the result screen eventually routes into a
      side mode (Speed Recall at ladder position 6), not w1-l6
- [ ] Notification prompt appears AFTER a win, not during signup;
      accept it and check Settings → Notifications shows granted
- [ ] Daily challenge: card shows "Earn up to 15 gems", completing it
      pays and shows the gems pill on the result screen
- [ ] Kill the app, reopen: no re-onboarding, login-reward calendar
      appears
- [ ] Settings (as guest): "Save your account" card present; upgrade
      via email keeps stars/gems/streak
- [ ] Language → Español: onboarding, save-account, daily card all
      translated

If anything fails, fix before Step 3 — the re-test only gets one
clean read.

## Step 3 — Fire the win-back (one-time)

When the release is live in both stores:

1. Open the Supabase SQL editor.
2. Run `sql/winback_meta_cohort.sql` (this repo). It queues a warm
   push to the May Meta cohort users who still have push tokens
   (~18 people), skipping anyone active in the last 7 days. The
   dispatch cron delivers at ~6pm UK.
3. Verify next day:
   ```sql
   SELECT status, count(*) FROM push_queue
   WHERE notification_type = 'win_back'
     AND created_at > now() - interval '2 days'
   GROUP BY status;
   ```
4. Watch `cohort_funnel_weekly` for the May weeks — any movement in
   `d1_return_pct` in the following days is win-back re-activation.

## Step 4 — The ad re-test (£100–150, 7–10 days)

Campaign config (Meta Ads Manager):

| Setting | Value |
|---|---|
| Objective | App promotion |
| Budget | £15/day, 7–10 days (£105–150 total), £160 lifetime cap |
| Geo / audience | UK, broad, 35-65, no detailed targeting |
| Placements | Advantage+ |
| Creative | The best-performing creative from the May run — **unchanged**. This test measures the app, not the ad; changing both breaks attribution of the improvement. |
| Optimisation event | App install first 2-3 days (learning), then switch to **CompletedRegistration** — which now means *completed first level*, not signed-up-and-bounced |

Why this works now and didn't in May: the pixel event was re-anchored
in Phase 1 (`gameStore.completeLevel`), so Meta's algorithm receives
"this person actually played" as the conversion signal.

## Step 5 — Read the gates

The measurement view is live on prod (dashboard-only, not exposed to
the app API). In the Supabase SQL editor:

```sql
SELECT * FROM cohort_funnel_weekly LIMIT 4;
```

Read the row(s) for the re-test weeks after the campaign has run for
at least 7 full days:

| Gate | Metric | May baseline | Pass |
|---|---|---|---|
| Activation | `activation_pct` | ~33% | **> 80%** |
| Day-1 return | `d1_return_pct` | ~21% | **> 30%** |
| Day-7 return | `d7_return_pct` | ~19% | **> 12%** |
| Push grant | `push_grant_pct` | — | **> 40%** |

(D1/D7 use `last_seen`, the same proxy the original diagnosis used —
apples to apples. PostHog funnels are the fine-grained backup:
install → onboarding_completed → level_completed → paywall_shown.)

## Step 6 — Decide

- **All gates pass** → scale spend stepwise (£25/day, then £50/day),
  and greenlight the growth backlog: memory tracks (Numbers first),
  W1 question-count trim, daily duet. The funnel holds water; growth
  work now compounds instead of leaking.
- **Activation passes, D1 fails** → the front door works but the
  comeback loop doesn't. Check push grant rate first (if < 40%, the
  post-win prompt needs stronger copy/timing); then daily-challenge
  discoverability.
- **Activation fails** → something in the new funnel is broken in the
  wild that the smoke test missed. Pull `cohort_funnel_weekly` +
  PostHog step-by-step funnel, find the cliff, fix, re-test. Do not
  scale.

## Standing weekly checks (5 minutes, every Monday)

```sql
-- 1. Pipeline healthy? (empty = yes)
SELECT * FROM system_alerts WHERE resolved_at IS NULL;

-- 2. Pushes actually sending?
SELECT notification_type, count(*), max(sent_at)::date
FROM notification_log WHERE sent_at > now() - interval '7 days'
GROUP BY 1;

-- 3. Cohort funnel trend
SELECT * FROM cohort_funnel_weekly LIMIT 4;
```
