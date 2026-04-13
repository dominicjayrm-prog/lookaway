/**
 * In-app purchase product identifiers.
 *
 * These strings are the canonical product IDs we register in App Store
 * Connect (and eventually Google Play) and route through RevenueCat.
 * They MUST match the App Store Connect product IDs exactly, including
 * the reverse-DNS prefix — a typo here means the product won't be
 * found at purchase time and the SDK will throw "no product for id".
 *
 * Product IDs are permanent. App Store Connect does not allow deleting
 * or renaming a product once it's created (you can only mark it
 * "Removed from Sale"). Before changing any of these constants, make
 * sure the new id exists in App Store Connect and is fully propagated
 * (Apple can take up to 24h for new products to show in sandbox).
 *
 * Used by:
 *  - app/(tabs)/shop.tsx           Gem packs, lives, remove ads, starter pack
 *  - src/components/SubscriptionPaywall.tsx   Blanked+ monthly/yearly
 *  - src/lib/purchases.ts (phase 5)           RevenueCat purchase calls
 */
export const IAP_PRODUCT_IDS = {
  // ── Consumables ────────────────────────────────────────────────
  // Gem packs — reward the user with in-game currency on purchase.
  // Price tiers: £0.99 / £3.99 / £7.99.
  GEMS_100: 'com.blanked.app.gems_100',
  GEMS_500: 'com.blanked.app.gems_500',
  GEMS_1200: 'com.blanked.app.gems_1200',

  // Lives — refill or time-limited unlimited. Both consumables because
  // they can be purchased repeatedly (unlimited-1h expires client-side).
  LIVES_REFILL: 'com.blanked.app.lives_refill',
  LIVES_UNLIMITED_1H: 'com.blanked.app.lives_unlimited_1h',

  // ── Non-consumables ────────────────────────────────────────────
  // Starter pack — one-time unlock shown during the first 24h. The
  // 24h window is a client-side UI trick; Apple just knows it's a
  // "buy once forever" purchase.
  STARTER_PACK: 'com.blanked.app.starter_pack',

  // Remove ads — permanent unlock, restored via RevenueCat on reinstall.
  REMOVE_ADS: 'com.blanked.app.remove_ads',

  // ── Auto-renewable subscriptions ───────────────────────────────
  // Both live inside the "Blanked Plus" subscription group in App
  // Store Connect, so users can upgrade monthly → yearly without
  // losing their entitlement (Apple handles proration).
  PLUS_MONTHLY: 'com.blanked.app.plus_monthly',
  PLUS_YEARLY: 'com.blanked.app.plus_yearly',
} as const;

/** Union of every known IAP product id, for type-safe switches. */
export type IapProductId = typeof IAP_PRODUCT_IDS[keyof typeof IAP_PRODUCT_IDS];

/**
 * How many gems a successful gem-pack purchase should add to the
 * player's balance. Used in phase 5 after the purchase call resolves
 * — we read customerInfo → look up the product id here → call
 * gameStore.addGems(amount).
 */
export const GEM_PACK_REWARDS: Readonly<Record<string, number>> = {
  [IAP_PRODUCT_IDS.GEMS_100]: 100,
  [IAP_PRODUCT_IDS.GEMS_500]: 500,
  [IAP_PRODUCT_IDS.GEMS_1200]: 1200,
};
