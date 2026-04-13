/**
 * RevenueCat purchases wrapper.
 *
 * Every IAP interaction in the app routes through this module. It
 * handles:
 *   - Lazy native import (no-ops on web so the Vercel preview works)
 *   - Singleton configuration with the public SDK key
 *   - User identification (maps Supabase user → RevenueCat app user)
 *   - Typed helpers for each purchase scenario (gems, lives, subs)
 *   - Restore flow
 *   - Subscription status polling for cross-device cancellation sync
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
    await Purchases.purchaseStoreProduct(products[0]);
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
 *  the `plus` entitlement is now active. */
export async function purchaseSubscription(
  plan: 'monthly' | 'yearly',
): Promise<{ result: PurchaseResult; isActive: boolean }> {
  const Purchases = getPurchases();
  if (!Purchases) return { result: 'error', isActive: false };
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    if (!current) {
      log.warn('purchases', 'no current offering');
      return { result: 'error', isActive: false };
    }
    const pkg = plan === 'monthly' ? current.monthly : current.annual;
    if (!pkg) {
      log.warn('purchases', `no ${plan} package in current offering`);
      return { result: 'error', isActive: false };
    }
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isActive = !!customerInfo.entitlements?.active?.['plus'];
    log.breadcrumb('purchases', 'subscription purchased', { plan, isActive });
    return { result: 'success', isActive };
  } catch (e: any) {
    if (e.userCancelled) {
      log.breadcrumb('purchases', 'subscription cancelled by user', { plan });
      return { result: 'cancelled', isActive: false };
    }
    log.error('purchases', 'purchaseSubscription failed', e, { plan });
    return { result: 'error', isActive: false };
  }
}

// ─── Restore + status ──────────────────────────────────────────────

export interface EntitlementStatus {
  plus: boolean;
  noAds: boolean;
}

/** Restore previously purchased products (non-consumables +
 *  subscriptions). Returns which entitlements are now active. */
export async function restorePurchases(): Promise<EntitlementStatus> {
  const Purchases = getPurchases();
  if (!Purchases) return { plus: false, noAds: false };
  try {
    const customerInfo = await Purchases.restorePurchases();
    const status: EntitlementStatus = {
      plus: !!customerInfo.entitlements?.active?.['plus'],
      noAds: !!customerInfo.entitlements?.active?.['no_ads'],
    };
    log.breadcrumb('purchases', 'purchases restored', { plus: status.plus, noAds: status.noAds });
    return status;
  } catch (e) {
    log.error('purchases', 'restorePurchases failed', e);
    return { plus: false, noAds: false };
  }
}

/** Check current entitlement status without triggering a purchase.
 *  Used on app foreground to detect subscription cancellations that
 *  happened outside the app (via iOS Settings → Subscriptions). */
export async function getEntitlementStatus(): Promise<EntitlementStatus> {
  const Purchases = getPurchases();
  if (!Purchases) return { plus: false, noAds: false };
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return {
      plus: !!customerInfo.entitlements?.active?.['plus'],
      noAds: !!customerInfo.entitlements?.active?.['no_ads'],
    };
  } catch (e) {
    log.warn('purchases', 'getEntitlementStatus failed', { error: String(e) });
    return { plus: false, noAds: false };
  }
}

// ─── Gem reward lookup ─────────────────────────────────────────────

/** Given a product ID, return how many gems to add — 0 if it's not
 *  a gem pack product. Used by the shop after a successful purchase
 *  to credit the player's balance. */
export function gemsForProduct(productId: string): number {
  return GEM_PACK_REWARDS[productId] ?? 0;
}
