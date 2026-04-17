/**
 * Avatar upload — Uploads profile pictures to Supabase Storage
 * and stores the public URL in the profiles table.
 *
 * History: the first version used `Buffer.from(base64, 'base64')` to
 * convert the picker's base64 string into bytes. Buffer is a Node.js
 * global and does NOT exist in the React Native runtime, so every
 * upload threw a ReferenceError that was silently swallowed by the
 * outer try/catch. `avatar_url` stayed null in the DB and the
 * Storage bucket stayed empty for every single user. Profile.tsx
 * only appeared to work because it rendered the local file:// URI
 * via component state and AsyncStorage — the moment any other
 * surface (friends list, leaderboard, friend profile popup) tried
 * to read the cloud URL, it fell back to Blink.
 *
 * The correct pattern on React Native is `base64-arraybuffer`'s
 * `decode()`, which produces an ArrayBuffer the Supabase JS client
 * accepts directly — no Node polyfills, no atob encoding
 * weirdness, byte-accurate for binary image formats.
 */
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';

/**
 * Result of an upload attempt. On failure we surface the error
 * message so the caller can put it in an Alert rather than a
 * generic "Upload failed" toast — the previous silent-fail UX
 * made it impossible for users (or us) to tell something had gone
 * wrong until we queried the DB and found everyone's avatar_url
 * still null.
 */
export interface UploadResult {
  ok: boolean;
  /** Public Supabase Storage URL on success. */
  publicUrl?: string;
  /** Human-readable error on failure. Safe to show in an Alert. */
  error?: string;
}

/**
 * Upload a profile picture (base64 data URI) to Supabase Storage.
 * The data URI is the format `data:image/jpeg;base64,...` produced
 * either by `FileReader.readAsDataURL` on web or by reconstructing
 * `data:<mime>;base64,<asset.base64>` from `expo-image-picker`'s
 * asset on native.
 */
export async function uploadAvatar(userId: string, dataUri: string): Promise<UploadResult> {
  try {
    // Parse the data URI. If we were handed a bare file:// URI (which
    // would happen if expo-image-picker returned without base64), the
    // regex fails and we return a specific error — callers can then
    // retry with base64 or show a friendlier message rather than
    // silently doing nothing.
    const match = dataUri.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (!match) {
      log.warn('avatar', 'upload: bad data uri', { sample: dataUri.slice(0, 40) });
      return { ok: false, error: 'Could not read the image. Please try a different photo.' };
    }
    const mimeType = match[1];
    const base64 = match[2];
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const filePath = `${userId}/avatar.${ext}`;

    // decode() → ArrayBuffer. Works on web AND native without any
    // polyfills and preserves every byte accurately (no atob
    // latin-1 encoding drift). Supabase JS accepts ArrayBuffer
    // directly as of v2.
    const arrayBuffer = decodeBase64(base64);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType: mimeType,
        upsert: true, // Replace existing avatar for the same user
      });

    if (uploadError) {
      log.supabaseError('avatar', 'upload', uploadError, { userId, filePath });
      return { ok: false, error: `Storage upload failed: ${uploadError.message}` };
    }

    // Public URL. Bucket is configured public in sql + the
    // `Avatars are publicly readable` policy, so no signed URL
    // round-trip is needed. Cache-bust with a timestamp query param
    // so the image component refetches after a re-upload (same
    // filePath = same URL otherwise, and the <Image> cache would
    // serve the stale photo indefinitely).
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const baseUrl = urlData?.publicUrl;
    if (!baseUrl) {
      return { ok: false, error: 'Could not resolve uploaded photo URL.' };
    }
    const publicUrl = `${baseUrl}?v=${Date.now()}`;

    // Persist the URL on the profile row so every cloud-read
    // surface (leaderboard, friend profile popup, friends list)
    // picks it up automatically on their next load.
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);
    if (updateError) {
      log.supabaseError('avatar', 'profile update', updateError, { userId });
      // Storage upload succeeded but the profile row didn't update —
      // common cause is an expired auth session. The photo is safe
      // in Storage, just unreferenced; user can retry.
      return { ok: false, error: `Saved to cloud but couldn't update profile: ${updateError.message}` };
    }

    log.breadcrumb('avatar', 'upload succeeded', { userId, bytes: arrayBuffer.byteLength });
    return { ok: true, publicUrl };
  } catch (e: any) {
    log.error('avatar', 'upload threw', e, { userId });
    const message = e instanceof Error ? e.message : 'Unknown upload error';
    return { ok: false, error: message };
  }
}

/**
 * Remove a user's avatar from storage and clear the URL in profiles.
 * Best-effort — failures are logged but don't throw.
 */
export async function removeAvatar(userId: string): Promise<void> {
  try {
    await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`]);
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
  } catch (e) {
    log.error('avatar', 'removal threw', e);
  }
}
