import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { WORLDS, TOTAL_LEVELS, levelsInWorld } from '@/data/worldConfig';
import LevelBrowser from './level-browser';

export default async function LevelsPage() {
  // Fetch all campaign levels from Supabase
  const { data: levels } = await supabase
    .from('campaign_levels')
    .select('id, world_id, level_number, title, view_time, difficulty, status, scene_data, created_at')
    .order('world_id')
    .order('level_number');

  const allLevels = levels ?? [];
  const totalBuilt = allLevels.length;
  const pct = Math.round((totalBuilt / TOTAL_LEVELS) * 100);

  // Count per world
  const worldCounts: Record<number, number> = {};
  const worldCompleteCounts: Record<number, number> = {};
  WORLDS.forEach(w => { worldCounts[w.id] = 0; worldCompleteCounts[w.id] = 0; });
  allLevels.forEach((l: any) => {
    worldCounts[l.world_id] = (worldCounts[l.world_id] || 0) + 1;
    if (l.status === 'complete') worldCompleteCounts[l.world_id] = (worldCompleteCounts[l.world_id] || 0) + 1;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaign Levels</h1>
          <p className="mt-1 text-sm text-slate-500">Build and manage all 200 levels across 6 worlds</p>
        </div>
        <div className="flex gap-2">
          <Link href="/levels/batch" className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-700">
            Batch generate
          </Link>
          <Link href="/levels/editor" className="bg-white border border-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">
            + New level
          </Link>
        </div>
      </div>

      {/* Launch progress bar */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Launch progress</span>
          <span className="text-sm font-bold text-slate-900">{totalBuilt} / {TOTAL_LEVELS} levels ({pct}%)</span>
        </div>
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #6C5CE7, #A29BFE)' }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {totalBuilt >= TOTAL_LEVELS
            ? 'Ready for launch! \u{1F680}'
            : `You need ${TOTAL_LEVELS} levels for launch. Keep building!`
          }
        </p>
      </div>

      {/* World cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
        {WORLDS.map(w => {
          const count = worldCounts[w.id] || 0;
          const total = levelsInWorld(w.id);
          const worldPct = Math.round((count / total) * 100);
          const nextLevel = count + 1;
          return (
            <div key={w.id} className="bg-white rounded-xl shadow-sm p-4 border-t-4" style={{ borderTopColor: w.color }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: w.color }}>
                  W{w.id}
                </span>
                <span className="text-xs font-semibold text-slate-700 truncate">{w.name}</span>
              </div>
              <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${worldPct}%`, backgroundColor: w.color }} />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{count}/{total} levels</p>
              <div className="mt-2 space-y-0.5">
                <p className="text-[10px] text-slate-400">View: {w.viewingTimeRange[0]}–{w.viewingTimeRange[1]}s</p>
                <p className="text-[10px] text-slate-400">Objects: {w.objectCountRange[0]}–{w.objectCountRange[1]}</p>
              </div>
              {nextLevel <= total && (
                <Link
                  href={`/levels/editor?world=${w.id}&level=${nextLevel}`}
                  className="mt-3 block text-center text-[10px] font-semibold text-purple-600 border border-purple-200 rounded-lg py-1 hover:bg-purple-50"
                >
                  + Add level {nextLevel}
                </Link>
              )}
              {nextLevel > total && (
                <p className="mt-3 text-center text-[10px] font-medium text-green-600">{'\u2713'} Complete</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Level browser (client component) */}
      <LevelBrowser levels={allLevels} />
    </div>
  );
}
