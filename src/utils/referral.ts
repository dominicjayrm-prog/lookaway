/**
 * Referral system — invite a friend, both get 50 gems.
 * Uses a unique referral code per user. Tracks referrals in Supabase.
 * Gems are awarded when the referred user completes their first level.
 */
import { supabase } from '@/src/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share, Platform } from 'react-native';

const REFERRAL_CODE_KEY = 'blanked_referral_code';
const REFERRAL_REWARD = 50; // gems for both referrer and referee

// ── Referral code generation ──────────────────────────────────────────
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (I/1/O/0)
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

/** Get or create the user's referral code */
export async function getMyReferralCode(userId: string): Promise<string> {
  // Check local cache first
  const cached = await AsyncStorage.getItem(REFERRAL_CODE_KEY);
  if (cached) return cached;

  // Check Supabase
  const { data } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single();

  if (data?.referral_code) {
    await AsyncStorage.setItem(REFERRAL_CODE_KEY, data.referral_code);
    return data.referral_code;
  }

  // Generate and save new code
  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const { error } = await supabase
      .from('profiles')
      .update({ referral_code: code })
      .eq('id', userId);
    if (!error) break;
    code = generateCode();
    attempts++;
  }
  await AsyncStorage.setItem(REFERRAL_CODE_KEY, code);
  return code;
}

// ── Referral tracking ─────────────────────────────────────────────────

/** Store a referral code that was entered during signup */
export async function storeReferralCode(code: string): Promise<void> {
  await AsyncStorage.setItem('blanked_referred_by_code', code.toUpperCase().trim());
}

/** Process a referral after the new user completes their first level.
 *  Awards gems to both the referrer and the new user.
 *  Returns the gems awarded (0 if already processed or invalid). */
export async function processReferral(newUserId: string): Promise<number> {
  const code = await AsyncStorage.getItem('blanked_referred_by_code');
  if (!code) return 0;

  // Check if already processed
  const processed = await AsyncStorage.getItem('blanked_referral_processed');
  if (processed) return 0;

  // Find referrer by code
  const { data: referrer } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', code.toUpperCase())
    .single();

  if (!referrer || referrer.id === newUserId) return 0;

  // Check if this pair already has a referral
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referrer_id', referrer.id)
    .eq('referred_id', newUserId)
    .limit(1);

  if (existing && existing.length > 0) {
    await AsyncStorage.setItem('blanked_referral_processed', 'true');
    return 0;
  }

  // Record referral
  await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: newUserId,
    reward_gems: REFERRAL_REWARD,
    status: 'completed',
  });

  // Award gems to referrer
  await supabase.rpc('increment_gems', { user_id: referrer.id, amount: REFERRAL_REWARD });

  // Mark as processed locally
  await AsyncStorage.setItem('blanked_referral_processed', 'true');

  return REFERRAL_REWARD;
}

// ── Sharing ───────────────────────────────────────────────────────────

/** Share referral invite with the user's code */
export async function shareReferralLink(code: string, username?: string): Promise<void> {
  const name = username ? `@${username}` : 'Your friend';
  const message = Platform.select({
    ios: `${name} thinks you'd love Blanked — the visual memory game.\n\nUse code ${code} when you sign up and you'll both get 50 free gems! ${'\u{1F48E}'}\n\nplayblanked.app`,
    default: `${name} thinks you'd love Blanked — the visual memory game. Use code ${code} when you sign up and you'll both get 50 free gems! playblanked.app`,
  }) ?? '';

  try {
    await Share.share({ message });
  } catch {}
}

// ── Stats ─────────────────────────────────────────────────────────────

export interface ReferralStats {
  totalReferred: number;
  totalGemsEarned: number;
}

/** Get referral stats for a user */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .eq('status', 'completed');

  const totalReferred = count ?? 0;
  return {
    totalReferred,
    totalGemsEarned: totalReferred * REFERRAL_REWARD,
  };
}

export { REFERRAL_REWARD };
