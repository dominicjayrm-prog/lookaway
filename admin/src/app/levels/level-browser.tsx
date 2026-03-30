'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { WORLDS } from '@/data/worldConfig';
import { getObjectById } from '@/data/objectLibrary';

interface LevelRow {
  id: string;
  world_id: number;
  level_number: number;
  title: string;
  view_time: number;
  difficulty: string;
  status: string;
  scene_data: any;
  created_at: string;
}

function SceneThumbnail({ objects }: { objects: any[] }) {
  if (!objects || objects.length === 0) {
    return (
      <div className="w-full aspect-[4/3] bg-gray-50 rounded-lg flex items-center justify-center">
        <span className="text-xs text-slate-300">No scene</span>
      </div>
    );
  }
  return (
    <div className="w-full aspect-[4/3] bg-white rounded-lg border border-gray-100 relative overflow-hidden">
      {objects.slice(0, 12).map((obj: any) => {
        const libItem = getObjectById(obj.type);
        return (
          <div
            key={obj.id}
            className="absolute"
            style={{
              left: `${obj.x}%`,
              top: `${obj.y}%`,
              transform: 'translate(-50%, -50%)',
              width: 16,
              height: 16,
            }}
          >
            {libItem ? libItem.render(obj.color, 16) : (
              <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: obj.color }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function diffBadge(d: string) {
  if (d === 'easy') return 'bg-green-50 text-green-700';
  if (d === 'hard') return 'bg-red-50 text-red-700';
  return 'bg-yellow-50 text-yellow-700';
}

function statusDot(s: string) {
  if (s === 'complete') return 'bg-green-500';
  if (s === 'draft') return 'bg-yellow-400';
  return 'bg-red-400';
}

export default function LevelBrowser({ levels }: { levels: LevelRow[] }) {
  const [worldFilter, setWorldFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'level_number' | 'created_at' | 'difficulty'>('level_number');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const filtered = useMemo(() => {
    let result = [...levels];
    if (worldFilter) result = result.filter(l => l.world_id === worldFilter);
    if (statusFilter !== 'all') result = result.filter(l => l.status === statusFilter);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(l =>
        l.title?.toLowerCase().includes(s) ||
        l.id.toLowerCase().includes(s) ||
        `${l.level_number}`.includes(s)
      );
    }
    result.sort((a, b) => {
      if (sort === 'level_number') return (a.world_id * 1000 + a.level_number) - (b.world_id * 1000 + b.level_number);
      if (sort === 'created_at') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });
    return result;
  }, [levels, worldFilter, statusFilter, search, sort]);

  return (
    <div>
      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-4 flex items-center gap-3 flex-wrap">
        <select
          value={worldFilter ?? ''}
          onChange={e => setWorldFilter(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
        >
          <option value="">All Worlds</option>
          {WORLDS.map(w => <option key={w.id} value={w.id}>World {w.id}: {w.name}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
        >
          <option value="all">All Status</option>
          <option value="complete">Complete</option>
          <option value="draft">Draft</option>
        </select>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search levels..."
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs flex-1 min-w-[140px]"
        />

        <select
          value={sort}
          onChange={e => setSort(e.target.value as any)}
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs"
        >
          <option value="level_number">Level number</option>
          <option value="created_at">Date created</option>
        </select>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`px-2.5 py-1.5 text-xs font-medium ${view === 'grid' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-2.5 py-1.5 text-xs font-medium border-l border-gray-200 ${view === 'list' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            List
          </button>
        </div>

        <span className="text-xs text-slate-400">{filtered.length} levels</span>
      </div>

      {/* Grid view */}
      {view === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(l => {
            const world = WORLDS[l.world_id - 1];
            const objects = l.scene_data?.objects ?? [];
            const questions = l.scene_data?.questions ?? [];
            return (
              <div key={l.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-3">
                  <SceneThumbnail objects={objects} />
                </div>
                <div className="px-3 pb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: world?.color ?? '#666' }}
                    >
                      W{l.world_id}-L{l.level_number}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot(l.status)}`} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700 truncate">{l.title || 'Untitled'}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span>{objects.length} obj</span>
                    <span>{'\u2022'}</span>
                    <span>{questions.length} Q</span>
                    <span>{'\u2022'}</span>
                    <span>{'\u23F1'} {l.view_time}s</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${diffBadge(l.difficulty)}`}>
                      {l.difficulty?.charAt(0).toUpperCase() + l.difficulty?.slice(1) || 'Medium'}
                    </span>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <Link
                      href={`/levels/editor?id=${l.id}`}
                      className="flex-1 text-center text-[10px] font-medium text-purple-600 border border-purple-200 rounded-lg py-1 hover:bg-purple-50"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/levels/preview?id=${l.id}`}
                      className="flex-1 text-center text-[10px] font-medium text-slate-500 border border-gray-200 rounded-lg py-1 hover:bg-gray-50"
                    >
                      Preview
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12">
              <div className="text-4xl mb-3">{'\u{1F3AE}'}</div>
              <p className="text-sm text-slate-500">No levels found.</p>
              <p className="text-xs text-slate-400 mt-1">Create your first level or adjust filters.</p>
            </div>
          )}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">#</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">World</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Title</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Objects</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Questions</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">View time</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Difficulty</th>
                <th className="text-left px-3 py-2 text-slate-500 font-semibold">Status</th>
                <th className="text-right px-3 py-2 text-slate-500 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const world = WORLDS[l.world_id - 1];
                const objects = l.scene_data?.objects ?? [];
                const questions = l.scene_data?.questions ?? [];
                return (
                  <tr key={l.id} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-purple-50/30`}>
                    <td className="px-3 py-2 font-medium text-slate-600">{l.level_number}</td>
                    <td className="px-3 py-2">
                      <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: world?.color ?? '#666' }}>
                        W{l.world_id}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 font-medium">{l.title || 'Untitled'}</td>
                    <td className="px-3 py-2 text-slate-500">{objects.length}</td>
                    <td className="px-3 py-2 text-slate-500">{questions.length}</td>
                    <td className="px-3 py-2 text-slate-500">{l.view_time}s</td>
                    <td className="px-3 py-2">
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${diffBadge(l.difficulty)}`}>
                        {l.difficulty?.charAt(0).toUpperCase() + l.difficulty?.slice(1) || 'Medium'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${statusDot(l.status)}`} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/levels/editor?id=${l.id}`} className="text-purple-600 hover:text-purple-800 font-medium mr-2">Edit</Link>
                      <Link href={`/levels/preview?id=${l.id}`} className="text-slate-500 hover:text-slate-700 font-medium">Preview</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-slate-500">No levels found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
