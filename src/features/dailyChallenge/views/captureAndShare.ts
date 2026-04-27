/**
 * Capture-and-share orchestrator for the beautiful daily challenge
 * share card.
 *
 * Native flow (iOS / Android):
 *   1. captureRef(view) -> writes a tmp PNG file at 1080x1080
 *   2. expo-sharing.shareAsync(file) -> OS share sheet opens, user
 *      can drop into Instagram Stories / Feed, FB, Messages, etc.
 *   3. We also pass the formatted text caption alongside so apps
 *      that prefer text (Twitter / X) can grab it.
 *
 * Web flow:
 *   captureRef on web returns a blob URL via html2canvas under
 *   the hood. expo-sharing on web uses the Web Share API when
 *   available; falls back to a plain anchor download. Browsers
 *   without Web Share (most desktops) just download the PNG so
 *   the user can attach it manually.
 *
 * Public API stays clean: caller builds the props for ShareCardImage,
 * mounts the off-screen card with a ref, then calls
 * captureAndShareCard(ref, props). One-shot, returns success/error
 * for telemetry.
 */
import { Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';
import { log } from '@/src/lib/logger';
import { t } from '@/src/i18n';
import { buildShareCardText } from './ShareCardGenerator';
import type { DailyChallengeModeId } from '../types';

export interface CaptureArgs {
  mode: DailyChallengeModeId;
  challengeDate: string;
  score: number;
  timeSeconds: number;
  shareCardEmojiBlocks: string;
  streakCount: number;
}

export type CaptureOutcome = 'shared' | 'cancelled' | 'unavailable' | 'error';

export async function captureAndShareCard(
  cardRef: React.RefObject<View | null>,
  args: CaptureArgs,
): Promise<CaptureOutcome> {
  const message = buildShareCardText(args);

  // Web Share API path (and fallbacks) live inside expo-sharing /
  // react-native-view-shot, but we still defensively wrap the calls
  // so a missing native module on a stripped build doesn't hard-crash.
  try {
    const node = cardRef.current;
    if (!node) {
      log.warn('dailyChallenge', 'capture skipped: card ref not mounted');
      return await fallbackToTextShare(message);
    }

    const uri = await captureRef(node, {
      format: 'png',
      quality: 1,
      // result: 'tmpfile' on native gives us a file:// URI we can
      // hand to the share sheet directly. On web view-shot returns
      // a data URL by default; we accept either.
      result: Platform.OS === 'web' ? 'data-uri' : 'tmpfile',
      // Capture at the card's full 1080x1080 logical size regardless
      // of where it sits on screen, so the PNG dimensions are
      // identical across devices.
      width: 1080,
      height: 1080,
    });

    if (!uri) return await fallbackToTextShare(message);

    if (Platform.OS === 'web') {
      // expo-sharing's web fallback opens the OS share sheet on
      // mobile browsers (Web Share API). On desktop browsers without
      // Web Share, we fall back to a download anchor since there's
      // no share UI available.
      return await webShareOrDownload(uri, message);
    }

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      // Sharing unavailable (uncommon — should only happen on
      // simulator without share sheet). Surface text fallback.
      return await fallbackToTextShare(message);
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: t('daily_challenge.share_text.dialog_title'),
      // UTI for iOS share sheet so target apps recognise it as a
      // public.png image rather than a generic file.
      UTI: 'public.png',
    });
    return 'shared';
  } catch (e) {
    log.error('dailyChallenge', 'captureAndShareCard failed', e);
    return 'error';
  }
}

async function fallbackToTextShare(message: string): Promise<CaptureOutcome> {
  try {
    const result = await Share.share({ message });
    return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
  } catch (e) {
    log.warn('dailyChallenge', 'text-share fallback failed', { error: String(e) });
    return 'error';
  }
}

async function webShareOrDownload(uri: string, message: string): Promise<CaptureOutcome> {
  // Web Share API with files (newer Chrome/Safari/Edge mobile). If
  // unsupported, fall back to triggering a download of the PNG so
  // the user can attach it to a post manually.
  try {
    const w = (typeof window !== 'undefined' ? window : undefined) as
      | (Window & { navigator: Navigator & { canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void> } })
      | undefined;
    if (w?.navigator?.share) {
      const blob = await dataUriToBlob(uri);
      const file = new File([blob], 'blanked-daily.png', { type: 'image/png' });
      const shareData: ShareData = { files: [file], text: message };
      // Some browsers expose share() but not canShare() with files;
      // the call itself will throw NotAllowedError if files aren't
      // supported, which we then fall through to the download path.
      const canShareFiles = w.navigator.canShare ? w.navigator.canShare(shareData) : true;
      if (canShareFiles) {
        await w.navigator.share(shareData);
        return 'shared';
      }
    }
  } catch (e) {
    // Any throw drops us to the download path — never blow up the
    // share button on web.
    log.warn('dailyChallenge', 'web share api failed, falling back to download', { error: String(e) });
  }
  // Download fallback. Most desktops and older mobiles land here.
  try {
    if (typeof document === 'undefined') return 'unavailable';
    const a = document.createElement('a');
    a.href = uri;
    a.download = 'blanked-daily.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return 'shared';
  } catch (e) {
    return 'error';
  }
}

async function dataUriToBlob(dataUri: string): Promise<Blob> {
  // data:image/png;base64,XXXX -> Blob
  const res = await fetch(dataUri);
  return await res.blob();
}
