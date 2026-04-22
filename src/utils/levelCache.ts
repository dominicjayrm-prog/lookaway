/**
 * Local cache for level definitions.
 * Downloads level data from Supabase on first load, then serves from AsyncStorage.
 * This allows campaign levels to be played offline.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';

var CLASSIC_CACHE_KEY = 'blanked_levels_classic';
var SIDE_CACHE_KEY = 'blanked_levels_side';
var CACHE_VERSION_KEY = 'blanked_levels_version';
// Bumped to 3 when scene_data_es was added — forces existing
// installs to re-download so Spanish users get the translated
// columns instead of the pre-translation cached blobs.
var CURRENT_VERSION = '3';

interface CachedLevel {
  id: string;
  mode?: string;
  world_number?: number;
  world_id?: number;
  level_number: number;
  title?: string;
  world_name?: string;
  difficulty?: number;
  scene_data?: any;
  scene_data_es?: any;
  level_data?: any;
  level_data_es?: any;
  view_time?: number;
  status?: string;
}

/** Get a classic level by ID — tries cache first, then Supabase */
async function getClassicLevel(levelId: string): Promise<CachedLevel | null> {
  try {
    var cached = await AsyncStorage.getItem(CLASSIC_CACHE_KEY);
    if (cached) {
      var levels: CachedLevel[] = JSON.parse(cached);
      var found = levels.find(l => l.id === levelId);
      if (found) return found;
    }
  } catch {}

  // Cache miss — try Supabase
  try {
    var { data, error } = await supabase
      .from('campaign_levels')
      .select('*')
      .eq('id', levelId)
      .eq('status', 'complete')
      .single();
    if (data && !error) return data as CachedLevel;
  } catch {}

  return null;
}

/** Get a side campaign level by ID — tries cache first, then Supabase */
async function getSideLevel(levelId: string): Promise<CachedLevel | null> {
  try {
    var cached = await AsyncStorage.getItem(SIDE_CACHE_KEY);
    if (cached) {
      var levels: CachedLevel[] = JSON.parse(cached);
      var found = levels.find(l => l.id === levelId);
      if (found) return found;
    }
  } catch {}

  // Cache miss — try Supabase
  try {
    var { data, error } = await supabase
      .from('side_campaign_levels')
      .select('*')
      .eq('id', levelId)
      .single();
    if (data && !error) return data as CachedLevel;
  } catch {}

  return null;
}

/** Get all classic levels for a world — tries cache first */
async function getClassicWorldLevels(worldId: number): Promise<CachedLevel[]> {
  try {
    var cached = await AsyncStorage.getItem(CLASSIC_CACHE_KEY);
    if (cached) {
      var levels: CachedLevel[] = JSON.parse(cached);
      return levels.filter(l => (l.world_id ?? l.world_number) === worldId);
    }
  } catch {}

  // Cache miss — try Supabase
  try {
    var { data } = await supabase
      .from('campaign_levels')
      .select('*')
      .eq('world_id', worldId)
      .eq('status', 'complete')
      .order('level_number');
    if (data && data.length > 0) return data as CachedLevel[];
  } catch {}

  return [];
}

/**
 * Download all level definitions from Supabase and cache them locally.
 * Called once on app startup if cache is empty or outdated.
 */
async function syncLevelCache(): Promise<void> {
  try {
    var version = await AsyncStorage.getItem(CACHE_VERSION_KEY);
    if (version === CURRENT_VERSION) {
      // Cache is up to date — check if it exists
      var hasClassic = await AsyncStorage.getItem(CLASSIC_CACHE_KEY);
      var hasSide = await AsyncStorage.getItem(SIDE_CACHE_KEY);
      if (hasClassic && hasSide) return; // All good
    }
  } catch {}

  // Download everything
  try {
    var [classicResult, sideResult] = await Promise.all([
      supabase.from('campaign_levels').select('*').eq('status', 'complete').order('world_id').order('level_number'),
      supabase.from('side_campaign_levels').select('*').order('mode').order('world_number').order('level_number'),
    ]);

    if (classicResult.data && classicResult.data.length > 0) {
      await AsyncStorage.setItem(CLASSIC_CACHE_KEY, JSON.stringify(classicResult.data));
    }
    if (sideResult.data && sideResult.data.length > 0) {
      await AsyncStorage.setItem(SIDE_CACHE_KEY, JSON.stringify(sideResult.data));
    }

    await AsyncStorage.setItem(CACHE_VERSION_KEY, CURRENT_VERSION);
  } catch (e) {
    log.warn('cache', 'Level cache sync failed (offline?)', { error: String(e) });
  }
}

/** Clear the cache (for debugging or forced refresh) */
async function clearLevelCache(): Promise<void> {
  await AsyncStorage.multiRemove([CLASSIC_CACHE_KEY, SIDE_CACHE_KEY, CACHE_VERSION_KEY]);
}

export var LevelCache = {
  getClassicLevel,
  getSideLevel,
  getClassicWorldLevels,
  syncLevelCache,
  clearLevelCache,
};
