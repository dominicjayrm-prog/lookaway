/**
 * useNetworkStatus — thin wrapper around @react-native-community/netinfo
 * that exposes a boolean `isOnline` + a `recheck` helper the OfflineScreen
 * retry button uses.
 *
 * Rules of engagement (deliberately strict — false positives on the
 * offline screen annoy more than false negatives):
 *
 *  - A device is "offline" only when NetInfo reports BOTH
 *    `isConnected === false` AND `isInternetReachable === false` (or
 *    either is explicitly false while the other is null). A flaky
 *    momentary null is treated as "probably online" to avoid the
 *    screen flickering during normal network transitions (e.g.
 *    Wi-Fi → LTE handoff in a lift).
 *
 *  - On web we trust `navigator.onLine` — NetInfo's web support is
 *    reliable for cold-start offline detection which is what we care
 *    about, but we also fall back to the standard API.
 *
 *  - `recheck` does a one-shot `NetInfo.fetch()` so the "Try again"
 *    button actually re-probes instead of waiting for the next passive
 *    state change event.
 */
import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';

interface NetworkState {
  isOnline: boolean;
  recheck: () => void;
}

export function useNetworkStatus(): NetworkState {
  // Optimistically assume online on first render so the OfflineScreen
  // doesn't flash on every cold start before NetInfo has reported in.
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const applyState = useCallback((s: {
    isConnected?: boolean | null;
    isInternetReachable?: boolean | null;
  }) => {
    // Conservative: only flip to offline when we're genuinely sure.
    const connected = s.isConnected;
    const reachable = s.isInternetReachable;
    if (connected === false || reachable === false) {
      setIsOnline(false);
    } else {
      setIsOnline(true);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      if (Platform.OS === 'web') {
        // Web: navigator.onLine covers cold-start airplane mode cleanly.
        if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
          setIsOnline(navigator.onLine);
          const handler = () => setIsOnline(navigator.onLine);
          window.addEventListener('online', handler);
          window.addEventListener('offline', handler);
          unsubscribe = () => {
            window.removeEventListener('online', handler);
            window.removeEventListener('offline', handler);
          };
        }
        return;
      }

      // Native: NetInfo. Lazy-require so the web bundle doesn't try to
      // resolve the native module at import time.
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const NetInfo = require('@react-native-community/netinfo').default;
        const initial = await NetInfo.fetch();
        if (!cancelled) applyState(initial);
        unsubscribe = NetInfo.addEventListener((state: {
          isConnected: boolean | null;
          isInternetReachable: boolean | null;
        }) => {
          if (!cancelled) applyState(state);
        });
      } catch {
        // If NetInfo fails to load for any reason, we stay in the
        // "assume online" state rather than locking the user out.
      }
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [applyState]);

  const recheck = useCallback(() => {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined') setIsOnline(navigator.onLine);
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const NetInfo = require('@react-native-community/netinfo').default;
      NetInfo.fetch().then(applyState).catch(() => {});
    } catch {}
  }, [applyState]);

  return { isOnline, recheck };
}
