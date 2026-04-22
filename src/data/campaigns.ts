import { t } from '@/src/i18n';

export interface Campaign {
  id: string;
  /** Translation key for name/desc. */
  nameKey: string;
  descKey: string;
  /** World name keys, indexed by world number (0-based). */
  worldNameKeys: string[];
  /** Live-resolving name + description — re-read on every render so
   *  switching language in Settings updates the journey/shop UI
   *  without remounting. Callers that need the English literal (for
   *  analytics keyed by canonical name) can reach `nameKey`. */
  name: string;
  description: string;
  /** Live-resolving array of localised world names. */
  worldNames: string[];
  color: string;
  unlockAfterWorld: number;
  totalLevels: number;
  worldCount: number;
  levelsPerWorld: number[];
}

function mkCampaign(
  id: string,
  nameKey: string,
  descKey: string,
  worldNameKeys: string[],
  color: string,
  unlockAfterWorld: number,
  totalLevels: number,
  worldCount: number,
  levelsPerWorld: number[],
): Campaign {
  const c = {
    id, nameKey, descKey, worldNameKeys, color,
    unlockAfterWorld, totalLevels, worldCount, levelsPerWorld,
  } as Campaign;
  Object.defineProperty(c, 'name', { get: () => t(nameKey), enumerable: true });
  Object.defineProperty(c, 'description', { get: () => t(descKey), enumerable: true });
  Object.defineProperty(c, 'worldNames', {
    get: () => worldNameKeys.map((k) => t(k)),
    enumerable: true,
  });
  return c;
}

export const CAMPAIGNS: Record<string, Campaign> = {
  classic: mkCampaign(
    'classic', 'data.campaigns.classic_name', 'data.campaigns.classic_desc',
    ['data.worlds.classic_1', 'data.worlds.classic_2', 'data.worlds.classic_3', 'data.worlds.classic_4', 'data.worlds.classic_5', 'data.worlds.classic_6'],
    '#6C5CE7', 0, 200, 6, [20, 30, 35, 35, 40, 40],
  ),
  speed_recall: mkCampaign(
    'speed_recall', 'data.campaigns.speed_recall_name', 'data.campaigns.speed_recall_desc',
    ['data.worlds.speed_recall_1', 'data.worlds.speed_recall_2', 'data.worlds.speed_recall_3'],
    '#FF6B6B', 1, 45, 3, [15, 15, 15],
  ),
  snap_match: mkCampaign(
    'snap_match', 'data.campaigns.snap_match_name', 'data.campaigns.snap_match_desc',
    ['data.worlds.snap_match_1', 'data.worlds.snap_match_2', 'data.worlds.snap_match_3'],
    '#0984E3', 2, 45, 3, [15, 15, 15],
  ),
  sequence: mkCampaign(
    'sequence', 'data.campaigns.sequence_name', 'data.campaigns.sequence_desc',
    ['data.worlds.sequence_1', 'data.worlds.sequence_2', 'data.worlds.sequence_3'],
    '#D4A012', 3, 36, 3, [12, 12, 12],
  ),
  counting_blitz: mkCampaign(
    'counting_blitz', 'data.campaigns.counting_blitz_name', 'data.campaigns.counting_blitz_desc',
    ['data.worlds.counting_blitz_1', 'data.worlds.counting_blitz_2'],
    '#00B894', 4, 30, 2, [15, 15],
  ),
  colour_chain: mkCampaign(
    'colour_chain', 'data.campaigns.colour_chain_name', 'data.campaigns.colour_chain_desc',
    ['data.worlds.colour_chain_1', 'data.worlds.colour_chain_2'],
    '#FD79A8', 5, 24, 2, [12, 12],
  ),
};

export const CAMPAIGN_ORDER = ['classic', 'speed_recall', 'snap_match', 'sequence', 'counting_blitz', 'colour_chain'];

export const TOTAL_MAX_STARS = Object.values(CAMPAIGNS).reduce((sum, c) => sum + c.totalLevels * 3, 0); // 1140
