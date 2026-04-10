/**
 * Lightweight observability layer for Blanked.
 *
 * Why this exists: before this module, every network failure, every
 * RLS-blocked query, every Supabase edge-case was eaten by
 * `catch(console.warn)`. That meant we had no way to know which errors
 * users were actually hitting in production — the bar for "we noticed"
 * was whoever happened to have their dev tools open.
 *
 * This module is deliberately NOT a full Sentry SDK — it's a seam you
 * can drop Sentry/Logtail/Datadog behind by swapping the transport.
 * The public API mirrors the Sentry shape (breadcrumb → error) so the
 * future migration is a one-file change, not a 60-file rename.
 *
 * How to wire Sentry later (in order, maybe 30 minutes total):
 *
 *   1. `npx expo install sentry-expo`
 *   2. Add `@sentry/react-native/expo` config plugin to app.json
 *   3. Call `Sentry.init({ dsn: '...' })` in `app/_layout.tsx`
 *   4. In this file, replace `consoleTransport` with a transport that
 *      calls `Sentry.addBreadcrumb()` and `Sentry.captureException()`
 *   5. Done. Every existing `log.warn(...)` / `log.error(...)` call
 *      site picks up Sentry routing automatically.
 *
 * Until that migration the logger still has value: it prefixes every
 * message, preserves context (user id, device info), keeps an
 * in-memory breadcrumb ring buffer for post-mortem debugging, and
 * produces grep-friendly output in dev.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Breadcrumb {
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

interface LogContext {
  userId?: string | null;
  username?: string | null;
  platform?: string;
  [key: string]: unknown;
}

export interface LogTransport {
  breadcrumb: (crumb: Breadcrumb) => void;
  captureError: (error: unknown, context: LogContext, breadcrumbs: Breadcrumb[]) => void;
  captureMessage: (level: LogLevel, message: string, context: LogContext, data?: Record<string, unknown>) => void;
}

// ─── In-memory state ────────────────────────────────────────────────
const BREADCRUMB_MAX = 20;
const breadcrumbs: Breadcrumb[] = [];
let context: LogContext = {};
let transport: LogTransport = createConsoleTransport();

function pushBreadcrumb(crumb: Breadcrumb) {
  breadcrumbs.push(crumb);
  if (breadcrumbs.length > BREADCRUMB_MAX) breadcrumbs.shift();
  transport.breadcrumb(crumb);
}

function formatError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

// ─── Default console transport ──────────────────────────────────────
/**
 * Dev-friendly transport that pretty-prints everything with an
 * emoji-prefixed category and caches breadcrumbs for flush on error.
 * In production without a real backend wired up, this becomes
 * effectively a no-op — we don't spam the user's release logs.
 */
function createConsoleTransport(): LogTransport {
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

  return {
    breadcrumb: (crumb) => {
      if (!isDev) return;
      const emoji = crumb.level === 'error' ? '🔴' : crumb.level === 'warn' ? '🟡' : '🔵';
      if (crumb.data) {
        console.log(`${emoji} [${crumb.category}] ${crumb.message}`, crumb.data);
      } else {
        console.log(`${emoji} [${crumb.category}] ${crumb.message}`);
      }
    },
    captureError: (error, ctx, crumbs) => {
      // Always log errors, even in prod, so we have SOMETHING in
      // crash reports until Sentry is wired up.
      console.error('🔴 [error]', formatError(error), {
        context: ctx,
        recentBreadcrumbs: crumbs.slice(-5).map((c) => `[${c.category}] ${c.message}`),
      });
    },
    captureMessage: (level, message, ctx, data) => {
      if (!isDev && level !== 'error') return;
      const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      if (data) {
        fn(`🟡 [${level}] ${message}`, { ...data, context: ctx });
      } else {
        fn(`🟡 [${level}] ${message}`, { context: ctx });
      }
    },
  };
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Attach persistent context that's sent along with every subsequent
 * log call. Call once at login with the user id + username, then
 * again on logout with `null` to clear.
 */
export function setUser(userId: string | null, username?: string | null): void {
  context = { ...context, userId, username: username ?? context.username ?? null };
}

/**
 * Add or update a single context key. Useful for things like
 * `setContext('route', '/shop')` on navigation events.
 */
export function setContext(key: string, value: unknown): void {
  context = { ...context, [key]: value };
}

/**
 * Replace the default console transport with a real backend hook.
 * Call this once from `app/_layout.tsx` after Sentry.init().
 */
export function setTransport(t: LogTransport): void {
  transport = t;
}

/**
 * Record a breadcrumb — a short note about something that happened.
 * Breadcrumbs are cheap and encouraged: they're the trail of actions
 * leading up to an eventual error, not errors themselves.
 *
 * Example: `log.breadcrumb('friends', 'sending request', { targetId })`
 */
export function breadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
  pushBreadcrumb({ level: 'info', category, message, data, timestamp: Date.now() });
}

/**
 * Log an informational message. Shows up in dev, swallowed in prod
 * unless you wire a prod-capable transport.
 */
export function info(category: string, message: string, data?: Record<string, unknown>): void {
  pushBreadcrumb({ level: 'info', category, message, data, timestamp: Date.now() });
  transport.captureMessage('info', `[${category}] ${message}`, context, data);
}

/**
 * Log a warning — something unexpected happened but the app can
 * continue. In prod this becomes a Sentry breadcrumb without
 * triggering an alert.
 */
export function warn(category: string, message: string, data?: Record<string, unknown>): void {
  pushBreadcrumb({ level: 'warn', category, message, data, timestamp: Date.now() });
  transport.captureMessage('warn', `[${category}] ${message}`, context, data);
}

/**
 * Log an error — something broke. In prod this becomes a full Sentry
 * event with stack trace, recent breadcrumbs, and current context.
 *
 * Pass the raw error object, not its message: the transport wants
 * the stack trace too.
 *
 * Example:
 *   ```
 *   try {
 *     await supabase.from('friendships').insert(...);
 *   } catch (e) {
 *     log.error('friends', 'sendFriendRequest failed', e, { targetId });
 *   }
 *   ```
 */
export function error(
  category: string,
  message: string,
  err: unknown,
  data?: Record<string, unknown>,
): void {
  pushBreadcrumb({
    level: 'error',
    category,
    message,
    data: { ...data, errorMessage: formatError(err) },
    timestamp: Date.now(),
  });
  transport.captureError(err, { ...context, category, message, ...data }, [...breadcrumbs]);
}

/**
 * Small convenience for the common pattern of checking a Supabase
 * response's `error` field. If present, logs it with the given
 * category + message and returns true so the caller can early-return.
 *
 * ```
 * const { data, error } = await supabase.from('profiles').select();
 * if (log.supabaseError('friends', 'getFriends', error)) return [];
 * ```
 */
export function supabaseError(
  category: string,
  operation: string,
  err: { message: string } | null,
  data?: Record<string, unknown>,
): err is { message: string } {
  if (!err) return false;
  warn(category, `${operation} failed: ${err.message}`, data);
  return true;
}

// Convenience re-export as a namespace for `import { log } from ...`
// style call sites, which reads a bit more naturally than a handful
// of individual imports.
export const log = {
  setUser,
  setContext,
  setTransport,
  breadcrumb,
  info,
  warn,
  error,
  supabaseError,
};
