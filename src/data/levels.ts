import type { Level, Scene, SceneObject, Question } from '@/src/types/game';
import { supabase } from '@/src/lib/supabase';
import { resolveLanguage, getDeviceLanguage } from '@/src/i18n';

/** Convert a Supabase campaign_levels row to the game's Level format */
interface CampaignLevelRow {
  id: string;
  world_id: number;
  level_number: number;
  title: string;
  // Spanish translation of `title`. Null until migrated; the client
  // falls back to `title` (English) when it's missing so users never
  // see a blank label.
  title_es?: string | null;
  scene_data: { objects?: unknown[]; questions?: unknown[] } | null;
  // Spanish translation — populated by translate_scene_data_to_es in
  // Supabase. NULL for any level not yet translated; we fall back to
  // scene_data (English) in that case.
  scene_data_es?: { objects?: unknown[]; questions?: unknown[] } | null;
  view_time?: number;
  required_score?: number;
  par_score?: number;
}

/** Resolve the current UI locale from the gameStore. Requires the
 *  store to have hydrated — safe once the app has booted. Falls back
 *  to device locale if the store isn't ready. */
function currentLocale(): 'en' | 'es' {
  try {
    // Avoid a circular import — inline require keeps this file's
    // test-friendly shape (levels.ts is imported by the scene
    // renderer, which is itself imported by the store's init).
    const { useGameStore } = require('@/src/store');
    const pref = useGameStore.getState().preferredLanguage ?? 'system';
    return resolveLanguage(pref, getDeviceLanguage());
  } catch {
    return 'en';
  }
}

function dbRowToLevel(row: CampaignLevelRow): Level {
  // Pick the right scene_data blob for the active locale. Spanish
  // falls back to English when scene_data_es is NULL — never leaves
  // the user with an empty scene.
  const locale = currentLocale();
  const raw = (locale === 'es' && row.scene_data_es) ? row.scene_data_es : row.scene_data;
  // Handle both single-scene object and multi-scene array from DB
  let scenes: Scene[];
  if (Array.isArray(raw)) {
    scenes = raw.map((s: any, i: number) => ({
      id: `${row.id}-s${i + 1}`,
      viewTime: s.viewTime ?? row.view_time ?? 4,
      objects: Array.isArray(s.objects) ? s.objects : [],
      questions: Array.isArray(s.questions) ? s.questions : [],
    }));
  } else {
    const sceneData = raw ?? { objects: [], questions: [] };
    scenes = [{
      id: `${row.id}-s1`,
      viewTime: row.view_time ?? 4,
      objects: (Array.isArray(sceneData.objects) ? sceneData.objects : []) as SceneObject[],
      questions: (Array.isArray(sceneData.questions) ? sceneData.questions : []) as Question[],
    }];
  }
  // Filter out empty scenes (no objects or no questions)
  if (scenes.length > 1) {
    scenes = scenes.filter(s => s.objects.length > 0 && s.questions.length > 0);
  }
  // Ensure at least one scene exists
  if (scenes.length === 0) {
    scenes = [{ id: `${row.id}-s1`, viewTime: row.view_time ?? 4, objects: [], questions: [] }];
  }
  // Pick the localised title when available. `title_es` is populated
  // by the campaign_level_titles_es migration; null rows (any new
  // levels added later that haven't been translated yet) fall back
  // cleanly to the English title.
  const localisedTitle =
    locale === 'es' && row.title_es && row.title_es.trim().length > 0
      ? row.title_es
      : row.title;

  return {
    id: row.id,
    worldId: row.world_id,
    levelNumber: row.level_number,
    title: localisedTitle ?? `Level ${row.level_number}`,
    scenes,
    requiredScore: row.required_score ?? 60,
    parScore: row.par_score ?? 100,
  };
}

/** Fetch a single level — tries local cache first, then Supabase, then hardcoded */
export async function fetchLevelById(id: string): Promise<Level | undefined> {
  // Try local cache first (works offline)
  try {
    const { LevelCache } = require('@/src/utils/levelCache');
    const cached = await LevelCache.getClassicLevel(id);
    if (cached) return dbRowToLevel(cached);
  } catch { /* fall through */ }

  // Try Supabase
  try {
    const { data, error } = await supabase
      .from('campaign_levels')
      .select('*')
      .eq('id', id)
      .eq('status', 'complete')
      .single();
    if (data && !error) return dbRowToLevel(data);
  } catch { /* fall through */ }

  // Hardcoded fallback
  return getLevelById(id);
}

/** Fetch all levels for a world — tries local cache first */
export async function fetchWorldLevels(worldId: number): Promise<Level[]> {
  // Try local cache first
  try {
    const { LevelCache } = require('@/src/utils/levelCache');
    const cached = await LevelCache.getClassicWorldLevels(worldId);
    if (cached.length > 0) return cached.map(dbRowToLevel);
  } catch { /* fall through */ }

  // Try Supabase
  try {
    const { data, error } = await supabase
      .from('campaign_levels')
      .select('*')
      .eq('world_id', worldId)
      .eq('status', 'complete')
      .order('level_number', { ascending: true });
    if (data && data.length > 0 && !error) return data.map(dbRowToLevel);
  } catch { /* fall through */ }
  return LEVELS.filter(l => l.worldId === worldId);
}

/** Fetch all levels from Supabase, fall back to hardcoded */
export async function fetchAllLevels(): Promise<Level[]> {
  try {
    const { data, error } = await supabase
      .from('campaign_levels')
      .select('*')
      .eq('status', 'complete')
      .order('world_id', { ascending: true })
      .order('level_number', { ascending: true });
    if (data && data.length > 0 && !error) return data.map(dbRowToLevel);
  } catch { /* fall through */ }
  return LEVELS;
}

// ═══════════════════════════════════════════════════════════
// HARDCODED FALLBACK LEVELS (World 2, levels 1-10)
// ═══════════════════════════════════════════════════════════
export const LEVELS: Level[] = [
  { id: 'w2-l1', worldId: 2, levelNumber: 1, title: 'Shape Basics', requiredScore: 60, parScore: 100, scenes: [{ id: 'w2-l1-s1', viewTime: 5, objects: [{ id: 'o1', type: 'circle', color: '#FF6B6B', x: 22, y: 28, size: 38 },{ id: 'o2', type: 'circle', color: '#0984E3', x: 72, y: 25, size: 32 },{ id: 'o3', type: 'square', color: '#00B894', x: 25, y: 72, size: 36 },{ id: 'o4', type: 'triangle', color: '#F9CA24', x: 70, y: 70, size: 34 }], questions: [{ id: 'q1', text: 'How many shapes were there in total?', options: ['3','4','5','6'], correctIndex: 1, category: 'count', timeLimit: 8 },{ id: 'q2', text: 'What colour was the square?', options: ['Red','Blue','Green','Yellow'], correctIndex: 2, category: 'color', timeLimit: 8 },{ id: 'q3', text: 'Which shape was in the top-right area?', options: ['Square','Triangle','Circle','Star'], correctIndex: 2, category: 'position', timeLimit: 8 },{ id: 'q4', text: 'Were there more circles or triangles?', options: ['More circles','More triangles','Same number','No triangles'], correctIndex: 0, category: 'comparison', timeLimit: 8 },{ id: 'q5', text: 'Was there a star in the scene?', options: ['Yes','No','Two of them','It was behind a square'], correctIndex: 1, category: 'presence', timeLimit: 8 }]}]},
  { id: 'w2-l2', worldId: 2, levelNumber: 2, title: 'Colour Count', requiredScore: 60, parScore: 100, scenes: [{ id: 'w2-l2-s1', viewTime: 5, objects: [{ id: 'o1', type: 'circle', color: '#FF6B6B', x: 20, y: 30, size: 40 },{ id: 'o2', type: 'circle', color: '#FF6B6B', x: 75, y: 25, size: 28 },{ id: 'o3', type: 'square', color: '#0984E3', x: 22, y: 72, size: 34 },{ id: 'o4', type: 'triangle', color: '#00B894', x: 72, y: 70, size: 36 }], questions: [{ id: 'q1', text: 'How many red circles were there?', options: ['1','2','3','4'], correctIndex: 1, category: 'count', timeLimit: 8 },{ id: 'q2', text: 'What colour was the triangle?', options: ['Red','Blue','Green','Yellow'], correctIndex: 2, category: 'color', timeLimit: 8 },{ id: 'q3', text: 'Where was the blue square?', options: ['Top-left','Top-right','Bottom-left','Bottom-right'], correctIndex: 2, category: 'position', timeLimit: 8 },{ id: 'q4', text: 'Which red circle was larger?', options: ['The one on the left','The one on the right','They were the same size','There was only one'], correctIndex: 0, category: 'comparison', timeLimit: 8 },{ id: 'q5', text: 'Was there a yellow shape in the scene?', options: ['Yes, a circle','Yes, a square','Yes, a triangle','No'], correctIndex: 3, category: 'presence', timeLimit: 8 }]}]},
  { id: 'w2-l3', worldId: 2, levelNumber: 3, title: 'Shape Spotter', requiredScore: 60, parScore: 100, scenes: [{ id: 'w2-l3-s1', viewTime: 5, objects: [{ id: 'o1', type: 'circle', color: '#0984E3', x: 50, y: 50, size: 48 },{ id: 'o2', type: 'square', color: '#FF6B6B', x: 18, y: 22, size: 26 },{ id: 'o3', type: 'square', color: '#FF6B6B', x: 82, y: 22, size: 26 },{ id: 'o4', type: 'triangle', color: '#00B894', x: 20, y: 78, size: 30 },{ id: 'o5', type: 'circle', color: '#F9CA24', x: 80, y: 78, size: 28 }], questions: [{ id: 'q1', text: 'How many red squares were there?', options: ['1','2','3','4'], correctIndex: 1, category: 'count', timeLimit: 8 },{ id: 'q2', text: 'What colour was the large circle in the centre?', options: ['Red','Blue','Green','Yellow'], correctIndex: 1, category: 'color', timeLimit: 8 },{ id: 'q3', text: 'Where was the green triangle?', options: ['Top-left','Top-right','Bottom-left','Bottom-right'], correctIndex: 2, category: 'position', timeLimit: 8 },{ id: 'q4', text: 'Which was bigger, the blue circle or the yellow circle?', options: ['Blue circle','Yellow circle','Same size','There was no yellow circle'], correctIndex: 0, category: 'comparison', timeLimit: 8 },{ id: 'q5', text: 'Was there a diamond in the scene?', options: ['Yes','No','Two of them','It was in the centre'], correctIndex: 1, category: 'presence', timeLimit: 8 }]}]},
  { id: 'w2-l4', worldId: 2, levelNumber: 4, title: 'Corner Check', requiredScore: 60, parScore: 100, scenes: [{ id: 'w2-l4-s1', viewTime: 5, objects: [{ id: 'o1', type: 'circle', color: '#FF6B6B', x: 18, y: 18, size: 30 },{ id: 'o2', type: 'square', color: '#0984E3', x: 82, y: 18, size: 30 },{ id: 'o3', type: 'triangle', color: '#00B894', x: 18, y: 80, size: 32 },{ id: 'o4', type: 'circle', color: '#F9CA24', x: 82, y: 80, size: 30 },{ id: 'o5', type: 'square', color: '#6C5CE7', x: 50, y: 50, size: 34 }], questions: [{ id: 'q1', text: 'How many shapes were in the corners?', options: ['2','3','4','5'], correctIndex: 2, category: 'count', timeLimit: 8 },{ id: 'q2', text: 'What colour was the shape in the centre?', options: ['Red','Blue','Green','Purple'], correctIndex: 3, category: 'color', timeLimit: 8 },{ id: 'q3', text: 'Which shape was in the top-right corner?', options: ['Circle','Square','Triangle','Star'], correctIndex: 1, category: 'position', timeLimit: 8 },{ id: 'q4', text: 'Were there more circles or squares?', options: ['More circles','More squares','Same number','Only circles'], correctIndex: 2, category: 'comparison', timeLimit: 8 },{ id: 'q5', text: 'Was there a green triangle?', options: ['Yes','No','There were two','It was a green circle'], correctIndex: 0, category: 'presence', timeLimit: 8 }]}]},
  { id: 'w2-l5', worldId: 2, levelNumber: 5, title: 'Size Matters', requiredScore: 60, parScore: 100, scenes: [{ id: 'w2-l5-s1', viewTime: 5, objects: [{ id: 'o1', type: 'circle', color: '#0984E3', x: 20, y: 25, size: 48 },{ id: 'o2', type: 'circle', color: '#FF6B6B', x: 55, y: 20, size: 22 },{ id: 'o3', type: 'square', color: '#00B894', x: 82, y: 22, size: 35 },{ id: 'o4', type: 'triangle', color: '#F9CA24', x: 20, y: 75, size: 35 },{ id: 'o5', type: 'square', color: '#6C5CE7', x: 50, y: 72, size: 48 },{ id: 'o6', type: 'triangle', color: '#E17055', x: 82, y: 75, size: 22 }], questions: [{ id: 'q1', text: 'How many shapes were there in total?', options: ['4','5','6','7'], correctIndex: 2, category: 'count', timeLimit: 8 },{ id: 'q2', text: 'What colour was the large circle?', options: ['Red','Blue','Green','Purple'], correctIndex: 1, category: 'color', timeLimit: 8 },{ id: 'q3', text: 'Where was the small red circle?', options: ['Top-left','Top-centre','Bottom-left','Bottom-right'], correctIndex: 1, category: 'position', timeLimit: 8 },{ id: 'q4', text: 'Which purple shape was the largest?', options: ['The purple circle','The purple square','The purple triangle','There was no purple shape'], correctIndex: 1, category: 'comparison', timeLimit: 8 },{ id: 'q5', text: 'Was there an orange triangle?', options: ['Yes','No','There were two','It was an orange circle'], correctIndex: 0, category: 'presence', timeLimit: 8 }]}]},
  { id: 'w2-l6', worldId: 2, levelNumber: 6, title: 'New Shapes', requiredScore: 60, parScore: 100, scenes: [{ id: 'w2-l6-s1', viewTime: 5, objects: [{ id: 'o1', type: 'star', color: '#F9CA24', x: 25, y: 22, size: 36 },{ id: 'o2', type: 'diamond', color: '#6C5CE7', x: 75, y: 22, size: 32 },{ id: 'o3', type: 'circle', color: '#FF6B6B', x: 18, y: 58, size: 30 },{ id: 'o4', type: 'square', color: '#0984E3', x: 50, y: 55, size: 34 },{ id: 'o5', type: 'triangle', color: '#00B894', x: 82, y: 58, size: 30 },{ id: 'o6', type: 'star', color: '#E17055', x: 50, y: 82, size: 28 }], questions: [{ id: 'q1', text: 'How many stars were in the scene?', options: ['1','2','3','4'], correctIndex: 1, category: 'count', timeLimit: 8 },{ id: 'q2', text: 'What colour was the diamond?', options: ['Yellow','Purple','Blue','Orange'], correctIndex: 1, category: 'color', timeLimit: 8 },{ id: 'q3', text: 'Where was the blue square?', options: ['Top-left','Top-right','Middle-centre','Bottom-centre'], correctIndex: 2, category: 'position', timeLimit: 8 },{ id: 'q4', text: 'Which star was larger, yellow or orange?', options: ['Yellow','Orange','Same size','There was only one star'], correctIndex: 0, category: 'comparison', timeLimit: 8 },{ id: 'q5', text: 'Was there a heart in the scene?', options: ['Yes, in a corner','Yes, in the centre','No','There were two'], correctIndex: 2, category: 'presence', timeLimit: 8 }]}]},
  { id: 'w2-l7', worldId: 2, levelNumber: 7, title: 'Crowded Scene', requiredScore: 60, parScore: 100, scenes: [{ id: 'w2-l7-s1', viewTime: 5, objects: [{ id: 'o1', type: 'circle', color: '#FF6B6B', x: 18, y: 18, size: 28 },{ id: 'o2', type: 'square', color: '#0984E3', x: 50, y: 18, size: 30 },{ id: 'o3', type: 'triangle', color: '#00B894', x: 82, y: 18, size: 28 },{ id: 'o4', type: 'star', color: '#F9CA24', x: 30, y: 50, size: 32 },{ id: 'o5', type: 'diamond', color: '#6C5CE7', x: 70, y: 50, size: 30 },{ id: 'o6', type: 'circle', color: '#E17055', x: 20, y: 80, size: 26 },{ id: 'o7', type: 'square', color: '#00B894', x: 75, y: 80, size: 30 }], questions: [{ id: 'q1', text: 'How many shapes were there in total?', options: ['5','6','7','8'], correctIndex: 2, category: 'count', timeLimit: 8 },{ id: 'q2', text: 'What colour was the star?', options: ['Red','Blue','Yellow','Purple'], correctIndex: 2, category: 'color', timeLimit: 8 },{ id: 'q3', text: 'Which shape was in the top-left corner?', options: ['Square','Triangle','Circle','Diamond'], correctIndex: 2, category: 'position', timeLimit: 8 },{ id: 'q4', text: 'Were there more circles or squares?', options: ['More circles','More squares','Same number','Only circles'], correctIndex: 2, category: 'comparison', timeLimit: 8 },{ id: 'q5', text: 'Was there a purple diamond?', options: ['Yes','No','It was a purple star','It was a blue diamond'], correctIndex: 0, category: 'presence', timeLimit: 8 }]}]},
  { id: 'w2-l8', worldId: 2, levelNumber: 8, title: 'Quick Scan', requiredScore: 60, parScore: 100, scenes: [{ id: 'w2-l8-s1', viewTime: 5, objects: [{ id: 'o1', type: 'circle', color: '#0984E3', x: 20, y: 20, size: 30 },{ id: 'o2', type: 'square', color: '#0984E3', x: 50, y: 18, size: 32 },{ id: 'o3', type: 'triangle', color: '#0984E3', x: 80, y: 22, size: 28 },{ id: 'o4', type: 'star', color: '#FF6B6B', x: 22, y: 55, size: 34 },{ id: 'o5', type: 'diamond', color: '#F9CA24', x: 55, y: 55, size: 30 },{ id: 'o6', type: 'circle', color: '#00B894', x: 80, y: 58, size: 26 },{ id: 'o7', type: 'triangle', color: '#E17055', x: 50, y: 82, size: 32 }], questions: [{ id: 'q1', text: 'How many blue shapes were there?', options: ['1','2','3','4'], correctIndex: 2, category: 'count', timeLimit: 8 },{ id: 'q2', text: 'What colour was the star?', options: ['Blue','Red','Yellow','Orange'], correctIndex: 1, category: 'color', timeLimit: 8 },{ id: 'q3', text: 'Where was the yellow diamond?', options: ['Top-right','Centre-left','Centre-right area','Bottom-centre'], correctIndex: 2, category: 'position', timeLimit: 8 },{ id: 'q4', text: 'Were there more triangles or circles?', options: ['More triangles','More circles','Same number','No triangles'], correctIndex: 2, category: 'comparison', timeLimit: 8 },{ id: 'q5', text: 'Was there a green circle?', options: ['Yes','No','There were two','It was a green square'], correctIndex: 0, category: 'presence', timeLimit: 8 }]}]},
  { id: 'w2-l9', worldId: 2, levelNumber: 9, title: 'Tricky Pairs', requiredScore: 60, parScore: 100, scenes: [{ id: 'w2-l9-s1', viewTime: 5, objects: [{ id: 'o1', type: 'circle', color: '#FF6B6B', x: 18, y: 22, size: 32 },{ id: 'o2', type: 'square', color: '#FF6B6B', x: 50, y: 18, size: 30 },{ id: 'o3', type: 'circle', color: '#0984E3', x: 82, y: 22, size: 28 },{ id: 'o4', type: 'triangle', color: '#0984E3', x: 20, y: 58, size: 30 },{ id: 'o5', type: 'star', color: '#00B894', x: 50, y: 55, size: 34 },{ id: 'o6', type: 'diamond', color: '#F9CA24', x: 80, y: 58, size: 28 },{ id: 'o7', type: 'square', color: '#6C5CE7', x: 50, y: 82, size: 30 }], questions: [{ id: 'q1', text: 'How many red shapes were there?', options: ['1','2','3','4'], correctIndex: 1, category: 'count', timeLimit: 8 },{ id: 'q2', text: 'What colour was the square at the bottom?', options: ['Red','Blue','Green','Purple'], correctIndex: 3, category: 'color', timeLimit: 8 },{ id: 'q3', text: 'Where was the green star?', options: ['Top-left','Top-right','Centre','Bottom-left'], correctIndex: 2, category: 'position', timeLimit: 8 },{ id: 'q4', text: 'Were there more blue shapes or red shapes?', options: ['More blue','More red','Same number','No blue shapes'], correctIndex: 2, category: 'comparison', timeLimit: 8 },{ id: 'q5', text: 'Was there a blue triangle?', options: ['Yes','No','There were two','It was a blue circle'], correctIndex: 0, category: 'presence', timeLimit: 8 }]}]},
  { id: 'w2-l10', worldId: 2, levelNumber: 10, title: 'World 2 Finale', requiredScore: 60, parScore: 100, scenes: [{ id: 'w2-l10-s1', viewTime: 5, objects: [{ id: 'o1', type: 'circle', color: '#FF6B6B', x: 18, y: 18, size: 30 },{ id: 'o2', type: 'square', color: '#0984E3', x: 50, y: 18, size: 28 },{ id: 'o3', type: 'triangle', color: '#00B894', x: 82, y: 18, size: 30 },{ id: 'o4', type: 'star', color: '#F9CA24', x: 22, y: 50, size: 32 },{ id: 'o5', type: 'diamond', color: '#6C5CE7', x: 78, y: 50, size: 30 },{ id: 'o6', type: 'circle', color: '#E17055', x: 35, y: 80, size: 26 },{ id: 'o7', type: 'triangle', color: '#0984E3', x: 65, y: 80, size: 28 }], questions: [{ id: 'q1', text: 'How many shapes were there in total?', options: ['5','6','7','8'], correctIndex: 2, category: 'count', timeLimit: 8 },{ id: 'q2', text: 'What colour was the diamond?', options: ['Red','Yellow','Purple','Orange'], correctIndex: 2, category: 'color', timeLimit: 8 },{ id: 'q3', text: 'Where was the yellow star?', options: ['Top-left','Centre-left','Bottom-right','Top-right'], correctIndex: 1, category: 'position', timeLimit: 8 },{ id: 'q4', text: 'Were there more triangles or circles?', options: ['More triangles','More circles','Same number','No triangles'], correctIndex: 2, category: 'comparison', timeLimit: 8 },{ id: 'q5', text: 'Was there an orange circle?', options: ['Yes','No','There were two','It was an orange square'], correctIndex: 0, category: 'presence', timeLimit: 8 }]}]},
];

export function getLevelById(id: string): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function getNextLevelId(currentId: string): string | null {
  const idx = LEVELS.findIndex((l) => l.id === currentId);
  if (idx === -1 || idx >= LEVELS.length - 1) return null;
  return LEVELS[idx + 1].id;
}
