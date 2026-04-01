import { supabase } from '@/lib/supabase';
import { WORLDS } from '@/data/worldConfig';
import LevelPreview from './level-preview';

export const dynamic = 'force-dynamic';

export default async function PreviewPage({ searchParams }: { searchParams: { id?: string } }) {
  const levelId = searchParams.id;
  if (!levelId) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <p className="text-sm text-slate-500">No level ID provided.</p>
      </div>
    );
  }

  const { data: level } = await supabase
    .from('campaign_levels')
    .select('*')
    .eq('id', levelId)
    .single();

  if (!level) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <p className="text-sm text-slate-500">Level not found: {levelId}</p>
      </div>
    );
  }

  const world = WORLDS[level.world_id - 1];
  const objects = level.scene_data?.objects ?? [];
  const questions = level.scene_data?.questions ?? [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <a href="/levels" className="text-slate-400 hover:text-slate-600 text-sm">&larr; Back to levels</a>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-bold text-white px-2 py-1 rounded" style={{ backgroundColor: world?.color ?? '#666' }}>
          W{level.world_id}-L{level.level_number}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${level.difficulty === 'easy' ? 'bg-green-50 text-green-700' : level.difficulty === 'hard' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
          {level.difficulty}
        </span>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-1">{level.title || 'Untitled'}</h1>
      <p className="text-sm text-slate-500 mb-6">
        {objects.length} objects &middot; {questions.length} questions &middot; {level.view_time}s viewing time
      </p>

      <LevelPreview objects={objects} questions={questions} content={level.scene_data} />
    </div>
  );
}
