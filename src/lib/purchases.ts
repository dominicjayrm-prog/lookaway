/**
 * RevenueCat purchases wrapper.
 *
 * Every IAP interaction in the app routes through this module. It
 * handles:
 *  - Lazy native import (no-ops on web so the Vercel preview works)
 *  - Singleton configuration with the public SDK key
 *  - User identification (maps Supabase user → RevenueCat app user)
 *  - Typed helpers for each purchase scenario (gems, lives, subs)
 *  - Restore flow
 *  - Subscription status polling for cross-device cancellation sync
 *
 * Web callers get graceful no-ops — every function returns a safe
 * default rather than crashing. This is intentional: the shop UI
 * renders on web for preview/marketing purposes but purchases
 * only work inside a native iOS binary.
 */

import { Platform } from 'react-native';
import { log } from '@/src/lib/logger';
import { GEM_PACK_REWARDS, IAP_PRODUCT_IDS } from '@/src/data/iapProducts';

const API_KEY = 'appl_CeUhcxEuMRVyailKleVtsYzPJDd';

// ─── Lazy native import ────────────────────────────────────────────
// react-native-purchases has native iOS code that crashes on web.
// We lazy-load via require() behind a Platform guard so the web
// bundle never tries to resolve the native module.

let _Purchases: any = null;

function getPurchases(): any {
  if (Platform.OS === 'web') return null;
  if (_Purchases) return _Purchases;
  try {
    _Purchases = require('react-native-purchases').default;
    return _Purchases;
  } catch (e) {
    log.warn('purchases', 'could not load react-native-purchases', { error: String(e) });
    return null;
  }
}

let _configured = false;

// ─── Initialisation ────────────────────────────────────────────────

/** Call once on app start (before any purchase calls). Safe to call
 *  multiple times — subsequent calls are no-ops. */
export async function initPurchases(): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases || _configured) return;
  try {
    Purchases.configure({ apiKey: API_KEY });
    _configured = true;
    log.breadcrumb('purchases', 'configured');
  } catch (e) {
    log.error('purchases', 'configure failed', e);
  }
}

/** Associate the current Supabase user with RevenueCat so purchase
 *  history follows the account across devices. Call on sign-in. */
export async function identifyUser(userId: string): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases || !_configured) return;
  try {
    await Purchases.logIn(userId);
    log.breadcrumb('purchases', 'user identified', { userId });
  } catch (e) {
    log.error('purchases', 'logIn failed', e, { userId });
  }
}

/** Disassociate the current user. Call on sign-out so the next
 *  session starts as anonymous until logIn is called again. */
export async function logOutPurchases(): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases || !_configured) return;
  try {
    await Purchases.logOut();
    log.breadcrumb('purchases', 'user logged out');
  } catch (e) {
    log.warn('purchases', 'logOut failed', { error: String(e) });
  }
}

// ─── Purchase helpers ──────────────────────────────────────────────

export type PurchaseResult = 'success' | 'cancelled' | 'error';

/** Wrap a promise with a hard timeout. RevenueCat / StoreKit calls
 *  can hang indefinitely if the App Store is unreachable; without
 *  this the user sees a stuck purchase modal forever and we'd hold
 *  no chance of surfacing a "try again" toast. 30s is generous —
 *  Apple's own purchase UI typically resolves under 10s. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}
const PURCHASE_TIMEOUT_MS = 30_000;

/** Buy a consumable or non-consumable product by its App Store
 *  product ID (e.g. `IAP_PRODUCT_IDS.GEMS_100`). */
export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  const Purchases = getPurchases();
  if (!Purchases) {
    log.warn('purchases', 'purchaseProduct called on unsupported platform');
    return 'error';
  }
  try {
    const products = await Purchases.getProducts([productId]);
    if (!products || products.length === 0) {
      log.warn('purchases', 'product not found', { productId });
      return 'error';
    }
    await withTimeout(Purchases.purchaseStoreProduct(products[0]), PURCHASE_TIMEOUT_MS, 'purchaseStoreProduct');
    log.breadcrumb('purchases', 'product purchased', { productId });
    return 'success';
  } catch (e: any) {
    if (e.userCancelled) {
      log.breadcrumb('purchases', 'purchase cancelled by user', { productId });
      return 'cancelled';
    }
    log.error('purchases', 'purchaseProduct failed', e, { productId });
    return 'error';
  }
}

/** Buy a subscription via the RevenueCat offering. Uses the `default`
 *  offering's `$rc_monthly` or `$rc_annual` package. Returns whether
 *  the `plus` entitlement is now active AND the `periodType` of the
 *  resulting entitlement, so callers can tell whether the purchase
 *  granted a free-trial / intro period or a full paid period. This
 *  matters for the monthly-gem grant — we must NOT credit the 300
 *  signup gems during a free trial, otherwise a user could start
 *  and cancel the trial repeatedly for gems. */
export async function purchaseSubscription(
  plan: 'monthly' | 'yearly',
): Promise<{ result: PurchaseResult; isActive: boolean; periodType: PeriodType }> {
  const Purchases = getPurchases();
  if (!Purchases) return { result: 'error', isActive: false, periodType: 'unknown' };
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    if (!current) {
      log.warn('purchases', 'no current offering');
      return { result: 'error', isActive: false, periodType: 'unknown' };
    }
    const pkg = plan === 'monthly' ? current.monthly : current.annual;
    if (!pkg) {
      log.warn('purchases', `no ${plan} package in current offering`);
      return { result: 'error', isActive: false, periodType: 'unknown' };
    }
    const { customerInfo } = await withTimeout(Purchases.purchasePackage(pkg), PURCHASE_TIMEOUT_MS, 'purchasePackage');
    const plusEnt = customerInfo.entitlements?.active?.['plus'];
    const isActive = !!plusEnt;
    const periodType = normalisePeriodType(plusEnt?.periodType);
    log.breadcrumb('purchases', 'subscription purchased', { plan, isActive, periodType });
    return { result: 'success', isActive, periodType };
  } catch (e: any) {
    if (e.userCancelled) {
      log.breadcrumb('purchases', 'subscription cancelled by user', { plan });
      return { result: 'cancelled', isActive: false, periodType: 'unknown' };
    }
    log.error('purchases', 'purchaseSubscription failed', e, { plan });
    return { result: 'error', isActive: false, periodType: 'unknown' };
  }
}

// ─── Trial eligibility ─────────────────────────────────────────────

/**
 * Whether the current Apple ID is eligible for the intro-offer free
 * trial on the given product. Used by the paywall to only advertise
 * "3 days free" to users who would actually receive it — Apple
 * specifically calls out in guideline 2.1(b) that an advertised free
 * trial must be offered in sandbox + production to the reviewer.
 * Showing the trial banner to an ineligible reviewer (whose sandbox
 * account already redeemed it) produces the exact "advertised but
 * not in sandbox" rejection we're trying to avoid.
 */
export async function isTrialEligible(productId: string): Promise<boolean> {
  const Purchases = getPurchases();
  if (!Purchases) return false;
  try {
    const result = await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
    const entry = result?.[productId];
    // RevenueCat returns: 0 = unknown, 1 = ineligible, 2 = eligible,
    // 3 = no_intro_offer_exists.
    const status = entry?.status;
    return status === 2;
  } catch (e) {
    log.warn('purchases', 'trial eligibility check failed', { error: String(e), productId });
    return false;
  }
}

// ─── Period type helpers ───────────────────────────────────────────

export type PeriodType = 'trial' | 'intro' | 'normal' | 'unknown';

function normalisePeriodType(raw: string | undefined | null): PeriodType {
  if (!raw) return 'unknown';
  const lower = String(raw).toLowerCase();
  if (lower === 'trial' || lower === 'intro' || lower === 'normal') return lower as PeriodType;
  return 'unknown';
}

// ─── Restore + status ──────────────────────────────────────────────

export interface EntitlementStatus {
  plus: boolean;
  noAds: boolean;
  /** Period of the `plus` entitlement if active. 'trial' = the user
   *  is inside a free-trial intro offer, no money has changed hands
   *  yet; 'intro' = a paid-but-discounted intro period; 'normal' =
   *  full-price paid period; 'unknown' = entitlement inactive or
   *  period couldn't be determined. Used by the home-tab foreground
   *  check to credit the monthly gems once a trial converts. */
  periodType: PeriodType;
}

/** Restore previously purchased products (non-consumables +
 *  subscriptions). Returns which entitlements are now active. */
export async function restorePurchases(): Promise<EntitlementStatus> {
  const Purchases = getPurchases();
  if (!Purchases) return { plus: false, noAds: false, periodType: 'unknown' };
  try {
    const customerInfo = await Purchases.restorePurchases();
    const plusEnt = customerInfo.entitlements?.active?.['plus'];
    const status: EntitlementStatus = {
      plus: !!plusEnt,
      noAds: !!customerInfo.entitlements?.active?.['no_ads'],
      periodType: normalisePeriodType(plusEnt?.periodType),
    };
    log.breadcrumb('purchases', 'purchases restored', { ...status });
    return status;
  } catch (e) {
    log.error('purchases', 'restorePurchases failed', e);
    return { plus: false, noAds: false, periodType: 'unknown' };
  }
}

/** Check current entitlement status without triggering a purchase.
 *  Used on app foreground to detect subscription cancellations that
 *  happened outside the app (via iOS Settings → Subscriptions). */
export async function getEntitlementStatus(): Promise<EntitlementStatus> {
  const Purchases = getPurchases();
  if (!Purchases) return { plus: false, noAds: false, periodType: 'unknown' };
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const plusEnt = customerInfo.entitlements?.active?.['plus'];
    return {
      plus: !!plusEnt,
      noAds: !!customerInfo.entitlements?.active?.['no_ads'],
      periodType: normalisePeriodType(plusEnt?.periodType),
    };
  } catch (e) {
    log.warn('purchases', 'getEntitlementStatus failed', { error: String(e) });
    return { plus: false, noAds: false, periodType: 'unknown' };
  }
}

// ─── Subscription pricing ──────────────────────────────────────────

/** Locale-formatted pricing for the monthly + yearly subscription
 *  packages, pulled from RevenueCat's current offering. `priceString`
 *  is already formatted for the user's Apple ID region — "£19.99" in
 *  the UK, "€19.99" in Spain, "US$19.99" in the US, "$399.00" in
 *  Mexico, etc. The paywall interpolates these into its CTAs and
 *  legal disclosures instead of hardcoding a currency symbol, which
 *  would have Apple rejecting under guideline 3.1.2 (displayed
 *  price must match what StoreKit actually charges). */
export interface SubscriptionPrice {
  /** Locale-formatted price ready to display — e.g. "£19.99". */
  priceString: string;
  /** Numeric price in the user's local currency. */
  price: number;
  /** ISO 4217 currency code — e.g. "GBP", "EUR", "USD", "MXN". */
  currencyCode: string;
}

export interface SubscriptionOfferings {
  monthly: SubscriptionPrice | null;
  annual: SubscriptionPrice | null;
}

export async function getSubscriptionOfferings(): Promise<SubscriptionOfferings> {
  const Purchases = getPurchases();
  if (!Purchases) return { monthly: null, annual: null };
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    if (!current) return { monthly: null, annual: null };
    const pack = (p: any): SubscriptionPrice | null => {
      if (!p?.product) return null;
      return {
        priceString: p.product.priceString,
        price: p.product.price,
        currencyCode: p.product.currencyCode,
      };
    };
    return { monthly: pack(current.monthly), annual: pack(current.annual) };
  } catch (e) {
    log.warn('purchases', 'getSubscriptionOfferings failed', { error: String(e) });
    return { monthly: null, annual: null };
  }
}

/** Format a numeric amount in the given currency using the runtime's
 *  Intl implementation. Intl.NumberFormat with `undefined` locale uses
 *  the device's own locale, so a Spanish user sees "19,99 €" and an
 *  American sees "$19.99" — matching the formatting convention of the
 *  priceString RevenueCat gives us for the whole price. Used by the
 *  paywall to display the "£1.66/month" breakdown on the yearly plan
 *  (annualPrice / 12) and the "Save £17" savings badge
 *  (monthlyPrice × 12 − annualPrice). */
export function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

// ─── Gem reward lookup ─────────────────────────────────────────────

/** Given a product ID, return how many gems to add — 0 if it's not
 *  a gem pack product. Used by the shop after a successful purchase
 *  to credit the player's balance. */
export function gemsForProduct(productId: string): number {
  return GEM_PACK_REWARDS[productId] ?? 0;
}
