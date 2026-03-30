import { supabase } from '@/src/lib/supabase';

/**
 * Log an economy event to Supabase. Fire and forget — never blocks gameplay.
 */
export function logEconomyEvent(
  userId: string,
  eventType: string,
  amount: number,
  details?: Record<string, any>,
) {
  supabase
    .from('economy_events')
    .insert({
      user_id: userId,
      event_type: eventType,
      amount,
      details: details ?? {},
    })
    .then(() => {})
    .catch((e) => console.warn('Economy log error:', e));
}

// Event type constants
export const ECONOMY_EVENTS = {
  GEM_EARN_LEVEL: 'gem_earn_level',
  GEM_EARN_DAILY: 'gem_earn_daily',
  GEM_EARN_STREAK: 'gem_earn_streak',
  GEM_SPEND_POWERUP: 'gem_spend_powerup',
  GEM_SPEND_LIVES: 'gem_spend_lives',
  IAP_GEMS: 'iap_gems',
  IAP_LIVES: 'iap_lives',
  IAP_UNLIMITED: 'iap_unlimited',
  LIFE_LOST: 'life_lost',
  LIFE_REGEN: 'life_regen',
  POWERUP_USED: 'powerup_used',
} as const;
