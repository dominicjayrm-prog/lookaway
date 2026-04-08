/**
 * Avatar upload — Uploads profile pictures to Supabase Storage
 * and stores the public URL in the profiles table.
 */
import { supabase } from '@/src/lib/supabase';
import { Platform } from 'react-native';

/**
 * Upload a profile picture (base64 data URI) to Supabase Storage.
 * Returns the public URL, or null if upload fails.
 */
export async function uploadAvatar(userId: string, dataUri: string): Promise<string | null> {
  try {
    // Extract base64 data and mime type
    const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) return null;
    const mimeType = match[1];
    const base64 = match[2];
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const filePath = `${userId}/avatar.${ext}`;

    // Convert base64 to Uint8Array for upload
    let fileData: Uint8Array;
    if (Platform.OS === 'web' && typeof atob !== 'undefined') {
      const binary = atob(base64);
      fileData = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) fileData[i] = binary.charCodeAt(i);
    } else {
      // On native, use Buffer if available
      const buffer = Buffer.from(base64, 'base64');
      fileData = new Uint8Array(buffer);
    }

    // Upload to Supabase Storage (avatars bucket)
    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, fileData, {
        contentType: mimeType,
        upsert: true, // Replace existing avatar
      });

    if (error) {
      console.warn('Avatar upload failed:', error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl ?? null;

    // Store URL in profiles table
    if (publicUrl) {
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
    }

    return publicUrl;
  } catch (e) {
    console.warn('Avatar upload error:', e);
    return null;
  }
}

/**
 * Remove a user's avatar from storage and clear the URL in profiles.
 */
export async function removeAvatar(userId: string): Promise<void> {
  try {
    // Try to remove both possible extensions
    await supabase.storage.from('avatars').remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`]);
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId);
  } catch (e) {
    console.warn('Avatar removal error:', e);
  }
}
