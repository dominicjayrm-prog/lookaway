# App Store submission checklist — BLANKED

This is the checklist of things you (the human) need to do in App
Store Connect or in the EAS build pipeline. The code-side items are
all already shipped on the `claude/blanked-testflight-setup-SwV71`
branch.

## Code already in place ✅

- `supportsTablet: false` (iPhone-only review surface)
- `ITSAppUsesNonExemptEncryption: false` (no encryption-export form)
- Account deletion in Settings (Apple 5.1.1(v))
- Terms of Use + Privacy Policy in-app via WebView
- Sign in with Apple alongside email signup
- Consent checkbox on signup gating Terms + Privacy
- Subscription paywall with auto-renewal disclosure
- Functional Restore + Terms + Privacy links on the paywall
- Restore Purchases now syncs BOTH `plus` AND `noAds` entitlements
- 30-second timeout on RevenueCat purchase calls
- User reporting + Remove friend (Apple 1.2 — UGC moderation)
- Background audio off (`shouldPlayInBackground: false`)
- Custom SMTP via Namecheap for password reset emails
- Password reset deep link with user-facing error toast on failure
- Notifications settings screen with permission flow
- Sound + haptics settings screens
- Auto-cleanup on sign-out (resetForNewUser wipes user-scoped storage)
- App Tracking Transparency prompt fires before AdMob initialises
- Root-level Error Boundary catches startup crashes

## Things YOU need to do in App Store Connect

### 1. App Privacy nutrition label

Authentication → App Privacy → Get Started. Declare:

| Data type | Linked to user? | Used for tracking? | Purposes |
|---|---|---|---|
| Email address | ✅ | ❌ | Account creation, password reset |
| Username | ✅ | ❌ | Account, social features |
| User ID (Supabase auth) | ✅ | ❌ | Account, app functionality |
| Gameplay data (scores, levels, streak) | ✅ | ❌ | App functionality, analytics |
| Friends list | ✅ | ❌ | Social features |
| Cosmetics owned + equipped | ✅ | ❌ | App functionality |
| Purchase history | ✅ | ❌ | App functionality |
| Device ID (IDFA) | ❌ | ✅ | Third-party advertising |

Third-party SDKs:
- **RevenueCat** — purchases (linked to user)
- **Supabase** — backend (linked to user)
- **AdMob** — advertising identifier (used for tracking, requires ATT)

### 2. Reviewer demo account

Authentication → App Information → App Review Information → Sign-In Information:
- **Email**: e.g. `appstore-reviewer@playblanked.com` (create this account in your Namecheap mailbox or use a +alias on hello@)
- **Password**: a fresh password
- Pre-load this account with: a few completed campaign levels, 1-2 friends, some gems, an active streak. So the reviewer can immediately see the social + gameplay surfaces.
- Notes for reviewer: include text like:

  > Blanked is a memory-training game with daily challenges, social
  > friend-vs-friend matches, IAP gem packs and an optional
  > Blanked+ subscription. Demo account credentials below grant
  > full access to all features. The Friends tab requires both
  > players to be online for live 1v1 challenges — to test, please
  > use two devices logged in as the demo account and a second
  > test account (we can provide one if needed).

### 3. Subscription metadata

Monetization → Subscriptions → "Blanked+" group:
- Localised display name: `Blanked+`
- Description: `Unlimited lives, no ads, 300 gems every month, exclusive cosmetics, premium analytics`
- Add screenshots showing the paywall (use the iPhone simulator)
- 3-day free trial → make sure it's enabled in App Store Connect (separate from the in-app eligibility check)

### 4. App Store assets

Authentication → Media Manager:
- **App Icon**: `assets/icon.png` (1024×1024) — already correct
- **Splash**: `assets/splash-icon.png` is currently 512×512. Upgrade to 1024×1024 for sharper splash on newer devices. Same Blink mark, just upscaled.
- **Screenshots**: 6 portrait shots at 1290×2796 (iPhone 15 Pro Max). See the screenshot plan from earlier in chat.
- **Preview video** (optional): a 15-30s screen recording of the gameplay loop — campaign level → submit → result. Boosts conversion ~10%.

### 5. Verify Privacy Manifest auto-generation

Expo SDK 55 auto-generates `PrivacyInfo.xcprivacy`. After your next EAS build:
1. Download the `.ipa` from EAS
2. Rename to `.zip`, extract
3. Look for `Payload/Blanked.app/PrivacyInfo.xcprivacy`
4. If missing, install `expo-build-properties` privacy-manifest patch (or contact Expo support)

### 6. apple-app-site-association (Universal Links)

You already have `applinks:playblanked.com` in app.json. For Universal Links to actually work (deep link from the email to the iOS app via `https://playblanked.com/...` instead of `blanked://`), you need a file at:

`https://playblanked.com/.well-known/apple-app-site-association`

Contents:
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "P3QXBN4WHT.com.blanked.app",
        "paths": ["*"]
      }
    ]
  }
}
```

Replace `P3QXBN4WHT` with your actual Apple Team ID (look it up in App Store Connect → Membership). Host this file (no extension) on Vercel — must be served as `application/json` over HTTPS at the exact path above.

This is **optional for v1** because we're using the `blanked://` custom scheme for password reset. But it makes the experience smoother (no "Open in Blanked?" Safari prompt) so worth doing once you have a public site.

### 7. Pre-submission test pass

Run the app on a real device (not simulator) and verify:
- [ ] Force-close + relaunch → no crashes
- [ ] Sign up new account → consent checkbox → goes through
- [ ] Sign in existing account → home loads
- [ ] Forgot password → email arrives → tap link → app opens to reset → set new password → sign in works
- [ ] Tap an ad-rewarded action → ATT prompt appears → choose "Ask App Not to Track" → app continues to work, ads still serve (non-personalised)
- [ ] Buy a gem pack via sandbox IAP → gems credited, receipt logged
- [ ] Subscribe to Blanked+ via sandbox → unlimited lives unlocked, banner removed from shop
- [ ] Restore purchases on a new install with the same Apple ID → entitlements restored
- [ ] Account deletion in Settings → row deleted, account signed out
- [ ] Friend challenge with a second account on a second device → live invite + result

If any of these fail, fix before submitting.

### 8. Things that won't trip review but worth noting

- BLANKED is rated 4+. Confirm in App Store Connect → Age Rating questionnaire.
- App Category: Games → Word OR Games → Trivia (Memory training is closest to Trivia, both work)
- Support URL: `https://playblanked.com/support` (or `mailto:hello@playblanked.com`)
- Marketing URL: `https://playblanked.com`
- Copyright: `© 2026 Blanked` (or your legal entity name)
