# BLANKED — Claude Code System Prompt

You are building BLANKED, a premium mobile visual memory game. The player studies a scene for a few seconds, it disappears, and they answer questions about what they saw. The app has 200+ campaign levels across 6 worlds, a daily challenge with shareable results, and a Candy Crush-style monetization system with lives, gems, ads, and IAP.

---

## PRODUCT IDENTITY

- **Name:** BLANKED
- **Tagline:** "Memorise. Look away. Answer."
- **Positioning:** A fun, addictive memory game that also trains your brain. NOT a clinical brain-training platform. It's a game first, brain training second.
- **Target audience:** 35-65 year olds. Your mum, your dad, their friends. People who play Candy Crush, do Wordle, scroll Facebook. They want something quick, satisfying, and that makes them feel smart.
- **Session length:** 1-3 minutes per level. Quick sessions, play anywhere.
- **Tone:** Warm, encouraging, premium. Never clinical, never childish. Think Apple Health meets Wordle.

---

## TECH STACK

- **Framework:** React Native with Expo (managed workflow, eject to bare only if absolutely necessary)
- **Language:** TypeScript (strict mode)
- **Navigation:** Expo Router (file-based routing in /app directory)
- **Backend:** Supabase (auth, Postgres database, realtime for leaderboards)
- **State management:** Zustand for global state (gems, lives, user progress). React state for component-level state.
- **Animations:** React Native Reanimated 3 for all transitions, reveals, and micro-interactions
- **Haptics:** expo-haptics for correct/wrong answer feedback, level complete celebrations
- **Sound:** expo-av for sound effects (tap, correct, wrong, timer tick, level complete, star reveal)
- **IAP:** react-native-purchases (RevenueCat) for gem packs, remove ads, future subscription
- **Ads:** react-native-google-mobile-ads (AdMob) for interstitials, rewarded video, banners
- **Storage:** expo-secure-store for sensitive data, @react-native-async-storage/async-storage for preferences and cached progress
- **Sharing:** expo-sharing + react-native-share for daily challenge results
- **Notifications:** expo-notifications for streak reminders and daily challenge alerts
- **Icons:** @expo/vector-icons (Ionicons primarily)

---

## DESIGN SYSTEM — UI/UX IS EVERYTHING

The app must look and feel like a premium product. Every screen should feel intentional, spacious, and calm. No visual clutter. No "game-y" neon aesthetic. Think: clean white surfaces, subtle shadows, generous spacing, and one strong accent colour.

### Colour palette
```typescript
export const colors = {
  // Backgrounds
  bg: '#F7F6F3',           // Main app background — warm off-white
  card: '#FFFFFF',          // Card surfaces
  surface: '#EDEBE6',      // Secondary surfaces, input backgrounds
  
  // Primary accent
  accent: '#6C5CE7',       // Purple — primary action colour, buttons, highlights
  accentSoft: 'rgba(108, 92, 231, 0.08)',  // Purple tint for backgrounds
  accentMid: 'rgba(108, 92, 231, 0.15)',   // Purple tint for hover/active states
  
  // Semantic colours
  correct: '#00B894',      // Green — correct answers, success states
  correctSoft: 'rgba(0, 184, 148, 0.08)',
  wrong: '#FF6B6B',        // Coral — wrong answers, error states, lives
  wrongSoft: 'rgba(255, 107, 107, 0.08)',
  gold: '#D4A012',         // Gold — stars, premium, gems
  goldSoft: 'rgba(212, 160, 18, 0.1)',
  blue: '#0984E3',         // Blue — info, timer, secondary actions
  blueSoft: 'rgba(9, 132, 227, 0.08)',
  
  // Text
  text: '#1A1A18',         // Primary text — near black
  textMid: '#636E72',      // Secondary text — descriptions, labels
  textLight: '#B2BEC3',    // Tertiary text — hints, placeholders, timestamps
  
  // Borders & dividers
  border: 'rgba(0, 0, 0, 0.06)',       // Subtle borders
  borderStrong: 'rgba(0, 0, 0, 0.12)', // Emphasized borders
  
  // Dark mode (implement later, but structure for it now)
  darkBg: '#1A1A2E',
  darkCard: '#16213E',
  darkSurface: '#0F3460',
  darkText: '#F8F8F2',
  darkTextMid: '#A8A8B3',
};
```

### Typography
```typescript
export const typography = {
  // Use system fonts — they feel native and load instantly
  fontFamily: undefined, // System default (-apple-system on iOS, Roboto on Android)
  
  sizes: {
    xs: 10,      // Labels, badges, timestamps
    sm: 12,      // Secondary text, button labels
    md: 14,      // Body text, descriptions
    lg: 16,      // Section headers, prominent text
    xl: 20,      // Screen titles
    xxl: 28,     // Hero numbers (scores, timers)
    display: 36, // Title screen logo
  },
  
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
    black: '900' as const,
  },
};
```

### Spacing & layout
```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};
```

### Design rules — FOLLOW THESE WITHOUT EXCEPTION
1. **Generous whitespace.** When in doubt, add more space. Screens should breathe. Padding on screen containers: minimum 16px horizontal, 12px vertical between sections.
2. **Cards have subtle shadows, not borders.** Use `shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2`. Borders only on interactive elements (buttons, inputs) using `border: 1px solid colors.border`.
3. **One accent colour per screen.** The purple accent is for primary actions. Don't use coral AND blue AND green on the same screen. Correct/wrong feedback colours are the exception.
4. **Rounded corners everywhere.** Minimum borderRadius: 8. Cards: 16-20. Buttons: 12-16. Pills/badges: 999.
5. **No ALL CAPS except tiny labels** (10px category labels like "LEVEL 28" or "DAILY CHALLENGE"). Everything else is sentence case.
6. **Animations on everything.** Every screen transition fades (300ms). Every button press scales down (0.96, 100ms). Stars pop in with spring animation. Score numbers count up. Timer bars animate smoothly. Nothing should appear or disappear without a transition.
7. **Haptic feedback on every interaction.** Light haptic on button tap. Medium haptic on correct answer. Error haptic on wrong answer. Heavy haptic on level complete.
8. **Sound effects are subtle, not annoying.** Soft tap sound. Gentle "ding" on correct. Brief "buzz" on wrong. Satisfying ascending chime on level complete. All sounds should be under 0.5 seconds.
9. **The scene card is the hero.** During memorise phase, the scene card should take up ~50% of the screen. Clean white background, subtle shadow, rounded corners. Objects inside are crisp and clear. No background noise.
10. **Dark mode readiness.** All colours referenced through the theme object, never hardcoded. Structure the theme as a context provider so dark mode is a single toggle.

### Component library to build
Build these reusable components FIRST before any screens:
- `Button` — primary (filled accent), secondary (outlined), ghost (text only). All with press animation.
- `Card` — white surface with shadow. Accepts children.
- `Badge` — small pill with coloured background and text (e.g. "LEVEL 28", "3 ⭐")
- `ProgressBar` — animated fill bar with colour prop. Used for timers, XP, world progress.
- `StarRating` — 1-3 stars, each animates in with spring physics and delay.
- `CountdownTimer` — circular or bar timer with smooth animation and colour change (green → yellow → red).
- `SceneRenderer` — takes scene JSON data, renders objects on a white card canvas.
- `QuestionCard` — displays question text + 4 option buttons with selection state.
- `OptionButton` — large tap target, shows correct/wrong state with colour + icon after selection.
- `ShareCard` — generates the emoji grid result and renders a preview. Has share buttons.
- `LivesIndicator` — row of 5 heart icons (filled/empty) with regen timer.
- `GemCounter` — displays gem count with icon, animates on change.
- `StreakBadge` — fire icon + number, pulses on milestone.

---

## APP STRUCTURE (Expo Router)

```
app/
├── _layout.tsx              // Root layout with providers (theme, auth, store)
├── index.tsx                // Entry — redirects to (tabs) or onboarding
├── onboarding.tsx           // First-time tutorial (3 guided levels)
├── (auth)/
│   ├── login.tsx            // Sign in with Apple/Google/Guest
│   └── _layout.tsx
├── (tabs)/
│   ├── _layout.tsx          // Bottom tab bar (Play, Journey, Daily, Shop)
│   ├── index.tsx            // Play tab — current level or daily prompt
│   ├── journey.tsx          // World/level map
│   ├── daily.tsx            // Daily challenge hub
│   └── shop.tsx             // Gems, power-ups, lives, IAP
├── game/
│   ├── [levelId].tsx        // Campaign level gameplay screen
│   ├── daily.tsx            // Daily challenge gameplay
│   └── result.tsx           // Level complete / fail result screen
├── share/
│   └── daily.tsx            // Share result screen with emoji grid
└── settings.tsx             // Preferences, sound, notifications, account
```

---

## CORE GAMEPLAY IMPLEMENTATION

### Scene data structure
```typescript
interface SceneObject {
  id: string;
  type: 'circle' | 'square' | 'triangle' | 'star' | 'diamond' | 'hexagon' | 'heart' | 'number' | 'letter';
  color: string;          // Named colour or hex
  x: number;              // 0-100 percentage position
  y: number;              // 0-100 percentage position
  size: number;           // Relative size 20-60
  rotation?: number;      // Degrees
  label?: string;         // For number/letter types — the text displayed on/in the shape
  zIndex?: number;        // Layering order
}

interface Question {
  id: string;
  text: string;
  options: string[];      // Always exactly 4 options
  correctIndex: number;   // 0-3
  category: 'count' | 'color' | 'position' | 'size' | 'detail' | 'comparison' | 'presence';
  timeLimit: number;      // Seconds (default 8)
}

interface Scene {
  id: string;
  viewTime: number;       // Seconds to memorise (2-5)
  objects: SceneObject[];
  questions: Question[];
}

interface Level {
  id: string;
  worldId: number;        // 1-6
  levelNumber: number;    // 1-200
  title: string;          // e.g. "Colour count"
  scenes: Scene[];        // 1-3 scenes per level
  requiredScore: number;  // Minimum % to pass (typically 60)
  parScore: number;       // Score needed for 3 stars (typically 100)
}
```

### Gameplay state machine
The game screen operates as a state machine with these states:
1. `READY` — "Level 28: Colour Count" title card with play button
2. `MEMORISE` — Scene visible, countdown timer running
3. `TRANSITION` — Scene fades out (0.5s), "Look Away!" text briefly shown
4. `QUESTION` — Questions appear one at a time, timer per question
5. `REVEAL` — After answering, briefly show correct/wrong feedback (0.8s)
6. `SCENE_SCORE` — Show score for this scene if multiple scenes in level
7. `COMPLETE` — Level results: stars, score, stats, share button
8. `FAILED` — Score too low, retry options (costs 1 life)

Implement this as a `useReducer` with clear action types for each transition. The gameplay screen should be ONE component that renders different content based on state.

### Timer implementation
Use `Reanimated` shared values for smooth countdown animation. The timer bar should:
- Start at 100% width, green colour
- Animate smoothly to 0%
- Change to yellow at 40% remaining
- Change to red at 15% remaining
- Pulse/flash in the last 2 seconds
- Trigger haptic at each colour change

### Scene renderer
The `SceneRenderer` component takes a `Scene` object and renders it:
- White card background, rounded corners, subtle shadow
- Objects are absolutely positioned using percentage-based x/y coordinates
- Each object type is a separate component (CircleShape, SquareShape, etc.)
- Objects should NOT overlap significantly — the scene generator should handle this
- Objects appear with a subtle fade-in when the scene starts (staggered, 50ms apart)
- The card should feel like looking at a piece of paper with objects placed on it

### Answer selection
When the player taps an option:
1. Immediately highlight their selection (accent border)
2. After 0.3s, reveal the correct answer (green) and wrong answers (red if selected)
3. Haptic feedback: success or error
4. Sound: correct ding or wrong buzz
5. After 0.8s, auto-advance to next question
6. Score tally updates

---

## MONETIZATION IMPLEMENTATION

### Lives system
- Max 5 lives. Stored locally AND in Supabase (synced).
- Lose 1 life when failing a level (score < 60%)
- Regenerate 1 life every 30 minutes
- The regen timer runs from the moment a life is lost, not from app open
- When lives = 0, show the "Out of Lives" modal with options:
  1. Watch rewarded ad → +1 life (FREE)
  2. Spend 80 gems → refill all 5 lives
  3. Buy unlimited lives for 1 hour → $1.99 IAP
  4. "No thanks, I'll wait" → show time until next free life
- Lives indicator always visible on the level map and game HUD

### Gem economy
- Single currency: gems (💎)
- Earning: 5-20 gems per level clear (based on stars), 10-50 gems per daily challenge (based on score), 15 gems per rewarded ad, streak milestone bonuses
- Spending: power-ups (25-100 gems), life refills (80 gems), streak shields (100 gems)
- Purchasing: IAP gem packs ($0.99-$14.99)
- Display gem count in top-right corner of most screens with animated counter on change

### Ad placement rules — STRICT
- **Interstitial ads:** Show after every 3rd completed level ONLY. Never mid-gameplay. Never on daily challenge. Skippable after 5 seconds.
- **Rewarded video ads:** Always opt-in. Offered for: 1 free life, 15 free gems, 1 free hint on current level. 30 seconds max.
- **Banner ads:** Bottom of level map screen and shop screen ONLY. Never during gameplay. 50px height.
- **Ad-free IAP:** $4.99 one-time purchase removes ALL interstitials and banners. Rewarded ads remain (opt-in). This should be promoted subtly in settings and after every 5th interstitial.

### Power-ups
- **Slow Time** (30 gems): +3 seconds viewing time for one scene. Applied before scene starts. Icon: ⏱
- **Peek** (40 gems): During a question, tap to briefly flash the scene for 1 second. One use per question. Icon: 👁
- **50/50** (25 gems): Remove 2 incorrect options, leaving correct + 1 wrong. Icon: ✂️
- **Skip** (50 gems): Skip current question, counts as correct for scoring. Icon: ⏭
- Power-ups are selected BEFORE a level starts (like boosters in Candy Crush) or bought mid-level

---

## DAILY CHALLENGE SYSTEM

### How it works
- A new challenge is published daily at 00:00 UTC
- 5 scenes, 5 questions each = 25 total questions
- Identical for every player worldwide
- Stored in Supabase `daily_challenges` table, keyed by date
- Players can only attempt once per day (result stored in `daily_results`)

### Share format generator
After completing the daily challenge, generate a shareable text result:
```
BLANKED — Mar 26, 2026
Scene 1: 🟢🟢🟢🟢🟢 5/5
Scene 2: 🟢🟢🟢🔴🟢 4/5
Scene 3: 🟢🟢🟢🟢🟢 5/5
Scene 4: 🟢🟢🔴🟢🟢 4/5
Scene 5: 🟢🟢🟢🟢🔴 4/5

🧠 Memory score: 88% (22/25)
blanked.app
```
🟢 = correct answer, 🔴 = wrong answer. This format does NOT spoil the questions or answers — safe to share.

### Streak system
- Completing the daily challenge increments the streak counter
- Missing a day resets to 0 (unless streak shield is active)
- Streak milestones: 7 days (50 gems), 30 days (200 gems), 100 days (500 gems + badge)
- Streak counter shown on daily tab and profile

---

## SUPABASE SCHEMA

```sql
-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users primary key,
  display_name text,
  gems integer default 0,
  lives integer default 5,
  lives_last_lost_at timestamptz,
  streak_count integer default 0,
  streak_last_date date,
  total_stars integer default 0,
  highest_world integer default 1,
  memory_score_avg real default 0,
  ads_removed boolean default false,
  created_at timestamptz default now()
);

-- Level definitions (seeded, not user-generated)
create table public.levels (
  id text primary key,
  world_id integer not null,
  level_number integer not null,
  title text,
  scene_data jsonb not null,  -- Array of Scene objects
  required_score integer default 60,
  par_score integer default 100,
  created_at timestamptz default now()
);

-- User progress per level
create table public.user_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  level_id text references public.levels not null,
  stars integer default 0,
  best_score integer default 0,
  attempts integer default 0,
  completed_at timestamptz,
  unique(user_id, level_id)
);

-- Daily challenges
create table public.daily_challenges (
  id uuid default gen_random_uuid() primary key,
  challenge_date date unique not null,
  scene_data jsonb not null,
  created_at timestamptz default now()
);

-- Daily results
create table public.daily_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  challenge_date date not null,
  score integer not null,
  answers jsonb not null,
  completed_at timestamptz default now(),
  unique(user_id, challenge_date)
);

-- Purchases log
create table public.purchases (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles not null,
  product_id text not null,
  gems_added integer default 0,
  amount_usd real,
  purchased_at timestamptz default now()
);
```

---

## SCENE GENERATION GUIDELINES

When creating scenes (either manually or with a generator tool), follow these rules:

1. **No overlapping objects.** Minimum 15% distance between object centres.
2. **Objects fill the space.** Use the full canvas — don't cluster everything in the centre.
3. **Colour variety.** Each scene should use 3-5 distinct colours. Never all one colour.
4. **Shape variety.** Each scene should have at least 2 different shape types.
5. **Question fairness.** Every question must be answerable from what was shown. No trick questions. If the question asks about colour, that colour must have been clearly visible.
6. **Question variety.** Each scene's 5 questions should test different categories (count, colour, position, size, detail). Never 2 counting questions in a row.
7. **Difficulty scaling:**
   - World 1: 4-6 objects, 5s viewing, simple questions
   - World 2: 7-10 objects, 4s viewing, position/grouping questions
   - World 3: 8-12 objects including numbers/letters, 4s viewing
   - World 4: 6-8 animated objects, 3.5s viewing
   - World 5: realistic scene illustrations, 3s viewing
   - World 6: combined mechanics, 2-2.5s viewing, 7 questions

---

## PERFORMANCE REQUIREMENTS

- App launch to interactive: under 2 seconds
- Scene render time: under 100ms
- Animation frame rate: 60fps minimum
- No jank during timer countdown or scene transitions
- Offline support: campaign levels cached locally, playable without internet. Daily challenge requires internet to fetch and submit.
- App size: target under 50MB at launch

---

## ACCESSIBILITY

- All text minimum 12px (10px only for tiny labels)
- Colour contrast ratio minimum 4.5:1 for all text
- Touch targets minimum 44x44pt
- VoiceOver / TalkBack support for navigation (not for gameplay — the visual memory mechanic is inherently visual)
- Respect system font size preferences where possible (non-gameplay screens)

---

## TESTING CHECKLIST BEFORE ANY PR

- [ ] All animations run at 60fps
- [ ] Haptic feedback fires on correct/wrong/complete
- [ ] Timer countdown is smooth (no jumps)
- [ ] Scene objects don't overlap
- [ ] Lives regeneration works correctly when app is backgrounded
- [ ] Gem count updates immediately after earning/spending
- [ ] Share text generates correctly with emoji grid
- [ ] Dark mode doesn't break any screen (even if not fully styled yet, no white-on-white or black-on-black)
- [ ] Offline mode: campaign levels work without internet
- [ ] Memory usage doesn't grow across levels (no leaks)

---

## BUILD ORDER — WHAT TO BUILD FIRST

### Sprint 1: Foundation (Week 1-2)
1. Expo project setup with TypeScript + Expo Router
2. Theme provider with colour system
3. Component library (Button, Card, Badge, ProgressBar)
4. Tab navigation skeleton (Play, Journey, Daily, Shop)
5. Supabase connection + auth (Apple Sign In, Guest mode)

### Sprint 2: Core gameplay (Week 3-5)
1. SceneRenderer component
2. Gameplay state machine (memorise → transition → question → reveal → complete)
3. CountdownTimer component
4. QuestionCard + OptionButton components
5. Level complete screen with StarRating animation
6. Level fail screen
7. 10 hand-crafted test levels in JSON

### Sprint 3: Progression + economy (Week 6-7)
1. World/level map screen
2. Star-gating logic
3. Lives system with regeneration timer
4. Gem currency (earn + spend)
5. Zustand store for all global state
6. Power-ups (Slow Time, Peek, 50/50, Skip)

### Sprint 4: Daily challenge (Week 8-9)
1. Daily challenge fetch from Supabase
2. Daily gameplay flow
3. Share result generator (emoji grid)
4. Streak tracker
5. Daily leaderboard

### Sprint 5: Monetization (Week 10-11)
1. RevenueCat setup + gem pack IAP
2. AdMob integration (interstitial, rewarded, banner)
3. "Out of Lives" modal with all options
4. Remove Ads IAP
5. Shop screen with all purchasable items

### Sprint 6: Content + polish (Week 12-14)
1. Scene editor tool (for creating levels efficiently)
2. 50 campaign levels (World 1 + World 2)
3. Sound effects integration
4. Haptic feedback on all interactions
5. Onboarding tutorial (first 3 guided levels)
6. Settings screen
7. App icon, splash screen
8. App Store screenshots

### Sprint 7: Launch prep (Week 15-16)
1. Performance audit
2. Beta via TestFlight
3. App Store submission
4. Marketing site (blanked.app)
5. Pre-curate 30 days of daily challenges

---

## KEY RULES FOR CLAUDE CODE

1. **Never skip animations.** Every state change needs a transition. If something appears or disappears, it animates.
2. **Never hardcode colours.** Always reference the theme/colors object.
3. **Type everything.** No `any` types. Scene data, questions, user state — all strictly typed.
4. **Keep components small.** Max 150 lines per component. Extract sub-components aggressively.
5. **Test on both platforms.** iOS and Android rendering can differ. Test both.
6. **Scenes are data, not code.** Levels are loaded from JSON/Supabase, never hardcoded in components.
7. **Performance first.** Use `React.memo`, `useMemo`, `useCallback` where needed. The gameplay screen re-renders every frame during timer countdown — optimise for this.
8. **Monetization is respectful.** Never interrupt gameplay with ads. Never make the player feel punished for not paying. The game should be fully enjoyable for free — paying just makes it more convenient.
