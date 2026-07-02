# BLANKED — Rescue Plan

*Compiled 2026-07-02 from: full codebase audit (4 parallel deep-dives: onboarding,
gameplay, retention systems, monetization), production database forensics
(85 real users), Supabase infrastructure inspection, and git history review.*

---

## Part 1 — The diagnosis (what the evidence says)

### The headline

**Your Meta money didn't die at level 5. It died before level 1.**

Production data, all 85 users:

| Fact | Number |
|---|---|
| Users stuck at ladder position 1 (never completed a level) | **49 of 85 (58%)** |
| Of those 49: gone within 30 minutes of signup, never returned | **41** |
| Of those 49: ever lost a life (i.e. actually played and failed) | **1** |
| Meta campaign cohorts (May 11–18, 43 signups): median ladder position | **1** |
| Meta cohorts: returned after day 7 | **8 of 43 (19%)** |
| Purchases, all time | **0** |
| Engaged users (position > 1) who ever tried the daily challenge | 9 of 36 |
| Users active in the last 7 days | 7 |

Read that middle row again: **only 1 of the 49 churned users ever failed a level.**
Difficulty didn't kill them. They completed the entire onboarding — memory test,
results, blurred profile, **full email + password + username signup** (this was
pre-guest-mode) — landed on home, and quit within 30 minutes. What happens on
home in the first 30 seconds? The subscription paywall auto-fires at 600ms,
then the tutorial, then the notification prompt stack.

They gave you a signup. The app answered with a sales pitch. They left.

### The five compounding failures

**1. The funnel sells before it plays. (Primary killer)**
The onboarding is an exam engineered for failure (round 3 is deliberately too
hard — the code comments admit it), which tells a 55-year-old *your memory is
weak*, then gates their "results" behind a blurred profile whose content is
literally scrambled placeholder — **the promised brain profile does not exist
anywhere in the app, even for payers**. Then signup. Then, 600ms onto home, a
£29.99/year paywall — before one real level. Two paywalls, zero gameplay,
one insult. For a skeptical 35–65 UK audience this reads as a scam pattern.

**2. The push pipeline has been dead since April 26. (Silent killer)**
The `push-dispatch` edge function was redeployed as v6 with `verify_jwt: true`
on ~April 24–26. The pg_cron tick calls it with only the custom secret header —
no JWT — so **every call since April 26 has returned 401**. It is failing every
minute, right now, today. The cron reports "succeeded" because `net.http_post`
is fire-and-forget, so nothing ever alarmed. Your entire Meta campaign ran with
zero re-engagement pushes. Not one. Additionally: the client's local
notifications ask for iOS permission at the worst moment (mid paywall/tutorial
pile-up on signup), the "soft prompt" fires *after* the native dialog instead
of before, streak-save pushes require streak ≥ 3, evening daily pushes require
streak ≥ 2 — the loss-aversion nudges are structurally unreachable by the
new users who need them.

**3. The economy punishes exactly the players you paid to acquire.**
The gem faucet shipped at 1/6th of design spec (1–3 gems per level vs the
5–20 in CLAUDE.md). Starting balance 50; life refill costs 80 — unaffordable
from minute one. Failing = 0 gems + lose a life. **Quitting a level also costs
a life.** 3 stars requires a perfect 100%. A struggling casual is double-punished
into the OutOfLivesModal (where the gem option renders greyed-out) within
minutes, and the only exits are pay, ad, or wait 30 minutes.

**4. First-session gameplay has real bugs.**
- "Next Level" on the result screen follows `w1-l1 → w1-l2 → …` linearly,
  **bypassing the unified ladder's mode interleaving** — players see 20
  identical shape-quiz levels, never the variety, while the journey map
  silently desyncs from what they're playing.
- The streak reward toast queue mounts at root, above gameplay, and drains a
  backlog at ~4s per toast with sound + haptic — **covering the memorise screen
  mid-level for up to 30s** (the known spam bug; root cause is
  `claimDueStreakRewards` returning the entire backlog and the mounter having
  no gameplay suppression).
- A single-scene level with 0 questions soft-locks the game on a blank screen
  whose only exit costs a life.
- Levels 1–3 ask **5 fine-grained questions about 3 objects** (position, size,
  colour precision) — interrogation, not play.
- The tutorial teaches the shop and the gems pill, not the game mechanic; its
  final button says "Let's play" but dumps you back on home; and it silently
  fails to render if any of 5 layout measurements miss.
- On native iOS, a user who bails at the auth gate is **forced through the
  entire onboarding test again** on next launch (`hasSeenOnboarding` reads
  localStorage, which doesn't exist on native).

**5. Nothing answers "why come back tomorrow?"**
The daily login reward calendar is hidden on day 0 (tutorial branch returns
early and never re-fires). Streaks give zero acknowledgement until day 3 (then:
3 gems). The daily challenge grants no visible reward. The comeback reward
needs 7 full days of absence. Every "come back" mechanic is gated above the
level of a day-1 user, hidden, or routed through the dead push pipeline.

### What's actually good (don't touch)

- The core mechanic is genuinely fun and differentiated; polish (animations,
  haptics, timers) is real and premium-feeling.
- The ad implementation is respectful: 5-level grace, 3/session cap, never on
  fail, no banners. Ads are NOT the problem.
- Content depth is enormous: 400-position ladder, 6 modes, 4 daily modes,
  cosmetics, achievements, friends. This is a real game. It's wearing the
  wrong front door.
- Guest mode (shipped June 12) already removed the signup wall for future
  installs.

---

## Part 2 — The plan

Four phases. Each independently shippable. Phases 0–2 before spending another
pound on ads.

### Phase 0 — Stop the bleeding (server-side, no app release, ~1 day)

**STATUS: ✅ APPLIED TO PROD 2026-07-02** (see `sql/push_pipeline_phase0_fix.sql`)

| # | Action | Where |
|---|---|---|
| 0.1 | ✅ **Fixed push-dispatch 401**: cron tick now sends the anon-key JWT alongside the dispatch secret, satisfying `verify_jwt`. Verified 200s on every tick since. Two stale April `pending` rows marked skipped so they didn't fire months late. | cron.alter_job on job 1 |
| 0.2 | ✅ Dead-man alarm live: hourly `push-pipeline-healthcheck` cron opens rows in `public.system_alerts` on non-200 dispatch responses or stuck queue rows; auto-resolves when clear. Verified firing. | migration `push_pipeline_deadman_alarm` |
| 0.3 | ⏳ Win-back blast to the 43 Meta-cohort users with valid push tokens (guarded, one-time, warm copy). Deliberately deferred until Phase 1 ships, so they return to a better app. | push_queue |
| 0.4 | ✅ RLS enabled on `banned_words`, `level_string_translations` (locked, server-only) and `unified_ladder_snapshot` (public read policy). | migration `enable_rls_reference_tables` |

### Phase 1 — A front door that earns trust (client, ~1 week)

The single principle: **play first, ask later.** Duolingo/Candy Crush pattern:
first win → habit → then account, then money.

| # | Action | Detail |
|---|---|---|
| 1.1 | **Rebuild onboarding as play-first.** Cold open → straight into a real, winnable level 1 (guest session created silently). No welcome deck, no exam framing, no countdown anxiety: generous view time, 3 questions, celebrate every correct answer. Win → confetti + FirstLevelCelebration → level 2. | Replaces the test-as-exam. The 3-round "memory test" becomes 3 real ladder levels. |
| 1.2 | **Kill the engineered failure + "weak memory" messaging.** If we keep a score reveal, it's warm and flattering at every tier ("Sharp start — your visual memory is above average for first-timers"). | onboarding.tsx, onboardingScore.ts |
| 1.3 | **Kill the blurred-profile bait.** Either build a real (simple, honest) memory profile screen that exists post-signup and updates weekly — or delete the promise entirely. No selling content that doesn't exist. | New: app/profile insights section (v1 can be 4 real stats). |
| 1.4 | **One paywall moment, after value.** Paywall fires once, after the player's first 3-star OR level 5 completion, whichever first. Frequency cap: max 1 auto-show per 72h, stored per-user. All other entry points stay manual (settings, shop). | (tabs)/index.tsx, new paywallGate util |
| 1.5 | **Fix the native re-onboarding loop** (AsyncStorage check in app/index.tsx, not localStorage). | app/index.tsx |
| 1.6 | **Move Meta `CompletedRegistration` to first-level-complete** (activation), not guest creation. Add `AchievedLevel` at 3 and 10. Meta optimises toward people who actually play. | metaEvents.ts, AuthProvider |
| 1.7 | Tutorial: teach the mechanic contextually inside level 1 (memorise → look away → answer beats), not the shop tour. "Let's play" actually launches the next level. | TutorialOverlay.tsx |

### Phase 2 — A first session that feels good (client, ~1 week)

| # | Action | Detail |
|---|---|---|
| 2.1 | **Difficulty on-ramp.** W1 L1–5: 3 questions per scene (not 5), question timer 12s (not 8), 3★ threshold = 90% for World 1, view time explicit 5s. Level data update in `campaign_levels` + seed fallback for World 1 checked into the repo (offline first-run currently 404s). | SQL + src/data/levels.ts |
| 2.2 | **Economy reset to spec.** Level clear: 5/10/15 gems by stars (heals the faucet). Life refill: 40 gems. Fail: no life loss for the player's first 5 fails ever ("protected hearts" — teach without punishing), and a fail still pays 2 gems "effort reward". Quit no longer costs a life. | scoring.ts, gameStore.ts, [levelId].tsx |
| 2.3 | **Fix "Next Level" to follow the unified ladder** (next position, not `w1-l(n+1)`), keeping the map and the mode interleave in sync. | result.tsx |
| 2.4 | **Fix streak toast spam**: coalesce backlog into one summary toast ("3 rewards claimed! +23 💎"), and hard-suppress the toast mounter during MEMORISE/QUESTION states. | StreakRewardToast.tsx, streakRewards.ts, _layout.tsx |
| 2.5 | Fix the 0-question scene soft-lock (filter at load, always). | levels.ts |
| 2.6 | Result-screen decongestion: one celebration per result, others queue to next home visit. | useCelebrations.ts |
| 2.7 | Fail screen tone: "So close — 2 of 5. One more look?" + free instant retry with a fresh scene variant, not a broken heart + FAILED. | result.tsx |

### Phase 3 — A reason to come back tomorrow (client + server, ~1–2 weeks)

| # | Action | Detail |
|---|---|---|
| 3.1 | **Notification permission after the first win** (soft prompt: "Want a nudge to keep your streak alive?" → native dialog). Remove the unconditional `requestPermissionsAsync` on login. | _layout.tsx, notifications.ts |
| 3.2 | **Guaranteed local D1 + D2 reminders**, scheduled on first win, independent of the server pipeline. | notifications.ts |
| 3.3 | **Streak day 1 & 2 acknowledgement**: day 1 = celebratory moment + 5 gems, day 2 = 10 gems + shield preview. Milestones stop being invisible until day 3. | streakMilestones.ts |
| 3.4 | **Login-reward calendar visible on D0** (fix the tutorial-branch early return), with tomorrow's reward teased on the home card. | (tabs)/index.tsx |
| 3.5 | **Daily challenge pays visibly**: 10–25 gems by score, shown on the card before playing ("Today's challenge · 🏆 up to 25 💎"). | dailyChallenge/service.ts, DailyChallengeCard |
| 3.6 | Comeback reward triggers at 48h absence (not 7 days), warm copy. | comebackReward.ts |
| 3.7 | Un-gate the loss-aversion pushes: evening daily reminder from streak ≥ 1, streak-save from streak ≥ 2. | dailyChallenge/notifications.ts |

### Phase 4 — Prove it, then scale (2 weeks after Phase 3)

1. **Re-test with £100–150, not £1k.** Same UK 35–65 broad targeting, the
   best-performing prior creative. You need ~40–60 installs to compare cohorts.
2. **Gates before spending more:**
   - Activation (complete level 1): **> 80%** (was ~33%)
   - D1 retention: **> 30%** (was ~21% overall, near 0 for the stuck cohort)
   - D7 retention: **> 12%**
   - Push permission grant: > 40%
3. Only when the gates pass: scale spend, and *then* invest in the growth bets
   (memory tracks / Numbers mode, daily duet, weekend editions — the
   brainstorm backlog is real but worthless until the funnel holds water).

### Explicitly deprioritised (do not spend time here yet)

New endgame content, cosmetics drops, friends features, new game modes,
Android open-testing progression, App Store price changes. All fine ideas —
after the bucket stops leaking.

---

## Part 3 — Measurement discipline

- PostHog funnel to watch weekly: install → onboarding start → L1 complete →
  L3 complete → D1 return → D7 return → paywall view → trial start.
- The `upgrade_sheet_shown/action` events (already shipped with guest mode)
  tell you which contextual prompts convert.
- `notification_log` should show daily sends again after Phase 0 — check it
  every Monday. If it's silent, the dead-man alarm (0.2) failed too.

## Part 4 — Effort summary

| Phase | Calendar | Risk |
|---|---|---|
| 0 — server fixes | 1 day | none (no app release) |
| 1 — trust-first funnel | ~1 week | medium (onboarding rewrite) |
| 2 — first session | ~1 week | low (mostly tuning + bug fixes) |
| 3 — comeback loops | 1–2 weeks | low |
| 4 — re-test | 2 weeks elapsed | £150 |

Total: ~4–5 weeks of build to a re-testable product.

---

*The game is good. The economy, the funnel, and a silent 401 are what buried
it. Fix the front door, pay the player fairly, make tomorrow matter, and the
content you've already built — 400 levels, 10 modes, real polish — gets its
chance.*
