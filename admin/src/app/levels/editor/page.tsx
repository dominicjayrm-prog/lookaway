'use client';
import { Suspense, useState, useCallback, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import InteractiveCanvas from '@/components/InteractiveCanvas';
import LibraryThumbnail from '@/components/LibraryThumbnail';
import { objectLibrary, objectCategories, getObjectById } from '@/data/objectLibrary';
import { WORLDS, getWorldConfig, levelsInWorld, generateLevelTitle } from '@/data/worldConfig';
import type { SceneObject, Question } from '@/lib/types';

const PALETTE = ['#FF6B6B','#0984E3','#00B894','#F9CA24','#6C5CE7','#E17055','#FD79A8','#00CEC9','#55EFC4','#FF7675','#2D3436','#A0522D'];
const Q_CATEGORIES = ['count','color','position','size','comparison','presence'] as const;
const SHAPES_FOR_GEN = ['circle','square','triangle','star','diamond','hexagon','pentagon','heart'];

function generateId(): string { return `q-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }
function shuffle<T>(arr: T[]): T[] { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function randomCorrectIndex(): 0|1|2|3 { return Math.floor(Math.random()*4) as 0|1|2|3; }

function dist(x: number, y: number, existing: {x:number;y:number}[]) {
  return existing.every(o => Math.hypot(x - o.x, y - o.y) >= 15);
}

function generateObjects(count: number, allowedCats: string[]) {
  const allowed = objectLibrary.filter(o => {
    const catId = objectCategories.find(c => c.name === o.category)?.id;
    return catId && allowedCats.includes(catId);
  });
  if (allowed.length === 0) return [];
  const colors = shuffle([...PALETTE]).slice(0, Math.min(count, 5));
  const types = shuffle(allowed).slice(0, Math.min(count, 8));
  const objects: SceneObject[] = [];
  for (let i = 0; i < count; i++) {
    let x: number, y: number, attempts = 0;
    do { x = 10 + Math.random() * 80; y = 10 + Math.random() * 80; attempts++; }
    while (!dist(x, y, objects) && attempts < 50);
    objects.push({
      id: `obj-${Date.now()}-${i}`,
      type: types[i % types.length].id,
      color: colors[i % colors.length],
      x: Math.round(x), y: Math.round(y),
      size: 24 + Math.floor(Math.random() * 20),
      zIndex: i,
    });
  }
  return objects;
}

function generateQuestions(objects: SceneObject[]): Question[] {
  if (!objects || objects.length === 0) return [];
  const qs: Question[] = [];
  const colorCounts: Record<string,number> = {};
  objects.forEach(o => { colorCounts[o.color] = (colorCounts[o.color]||0)+1; });
  const colors = Object.keys(colorCounts);

  // Count
  if (colors.length > 0) {
    const tc = colors[Math.floor(Math.random()*colors.length)];
    const c = colorCounts[tc]; const ci = randomCorrectIndex();
    const opts = ['','','','']; opts[ci] = `${c}`;
    const wrongs = shuffle([c+1,c+2,Math.max(0,c-1)].map(String)); let wi=0;
    for (let i=0;i<4;i++) if(i!==ci) opts[i]=wrongs[wi++];
    qs.push({id:generateId(),text:`How many ${tc} objects were there?`,options:opts as any,correctIndex:ci,category:'count',timeLimit:8});
  }

  // Color
  if (objects.length > 0) {
    const obj=objects[Math.floor(Math.random()*objects.length)];
    const name=getObjectById(obj.type)?.name||obj.type;
    const ci=randomCorrectIndex(); const opts=['','','',''];
    opts[ci]=obj.color;
    const wrongs=shuffle(PALETTE.filter(c=>c!==obj.color)).slice(0,3); let wi=0;
    for(let i=0;i<4;i++)if(i!==ci)opts[i]=wrongs[wi++];
    qs.push({id:generateId(),text:`What colour was the ${name}?`,options:opts as any,correctIndex:ci,category:'color',timeLimit:8});
  }

  // Position
  if (objects.length > 0) {
    const obj=objects[Math.floor(Math.random()*objects.length)];
    const name=getObjectById(obj.type)?.name||obj.type;
    const pos=obj.x<50?(obj.y<50?'Top-left':'Bottom-left'):(obj.y<50?'Top-right':'Bottom-right');
    const all=['Top-left','Top-right','Bottom-left','Bottom-right'];
    const ci=randomCorrectIndex(); const opts=['','','',''];
    opts[ci]=pos;
    const wrongs=shuffle(all.filter(p=>p!==pos)); let wi=0;
    for(let i=0;i<4;i++)if(i!==ci)opts[i]=wrongs[wi++];
    qs.push({id:generateId(),text:`Where was the ${name} positioned?`,options:opts as any,correctIndex:ci,category:'position',timeLimit:8});
  }

  // Comparison
  if (colors.length>=2) {
    const sorted=Object.entries(colorCounts).sort((a,b)=>b[1]-a[1]);
    const most=sorted[0]; const ci=randomCorrectIndex(); const opts=['','','',''];
    opts[ci]=most[0];
    const wrongs=shuffle(colors.filter(c=>c!==most[0])).slice(0,3);
    while(wrongs.length<3)wrongs.push(PALETTE[Math.floor(Math.random()*PALETTE.length)]);
    let wi=0; for(let i=0;i<4;i++)if(i!==ci)opts[i]=wrongs[wi++];
    qs.push({id:generateId(),text:'Which colour had the most objects?',options:opts as any,correctIndex:ci,category:'comparison',timeLimit:8});
  }

  // Presence
  if (objects.length > 0) {
    const obj=objects[Math.floor(Math.random()*objects.length)];
    const name=getObjectById(obj.type)?.name||obj.type;
    const ci=randomCorrectIndex(); const opts=['','','',''];
    opts[ci]='Yes'; let wi=0;
    for(let i=0;i<4;i++)if(i!==ci)opts[i]=['No','Not sure','Maybe'][wi++];
    qs.push({id:generateId(),text:`Was there a ${obj.color} ${name} in the scene?`,options:opts as any,correctIndex:ci,category:'presence',timeLimit:8});
  }

  return qs;
}

function EditorInner() {
  const params = useSearchParams();
  const router = useRouter();
  const editId = params.get('id');
  const worldParam = Number(params.get('world') || 1);
  const levelParam = Number(params.get('level') || 1);

  const [worldId, setWorldId] = useState(worldParam);
  const [levelInWorld, setLevelInWorld] = useState(levelParam);
  const [title, setTitle] = useState('');
  const [viewTime, setViewTime] = useState(4.5);
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [activeTool, setActiveTool] = useState<string|null>(null);
  const [activeColor, setActiveColor] = useState('#6C5CE7');
  const [showGrid, setShowGrid] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(['Basic Shapes']));
  const [showLibrary, setShowLibrary] = useState(true);
  const [showQuestions, setShowQuestions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);

  const world = WORLDS[worldId - 1];
  const config = getWorldConfig(worldId, levelInWorld);
  const levelId = `w${worldId}-l${levelInWorld}`;

  // Load existing level if editing
  useEffect(() => {
    if (!editId) return;
    setLoading(true);
    fetch(`/api/levels/${editId}`)
      .then(r => r.json())
      .then(data => {
        if (data.level) {
          const l = data.level;
          setWorldId(l.world_id);
          setLevelInWorld(l.level_number);
          setTitle(l.title);
          setViewTime(l.view_time);
          setObjects(l.scene_data?.objects ?? []);
          setQuestions(l.scene_data?.questions ?? []);
        }
      })
      .catch(() => setError('Failed to load level'))
      .finally(() => setLoading(false));
  }, [editId]);

  // Apply world config on world/level change (only for new levels)
  useEffect(() => {
    if (editId) return;
    if (config) {
      setViewTime(config.viewTime);
    }
  }, [worldId, levelInWorld, editId, config]);

  const allowedCatIds = config?.allowedCategories ?? ['basic'];
  const filteredLib = useMemo(() => {
    let lib = objectLibrary.filter(o => {
      const catId = objectCategories.find(c => c.name === o.category)?.id;
      return catId && allowedCatIds.includes(catId);
    });
    if (search) {
      const s = search.toLowerCase();
      lib = lib.filter(o => o.name.toLowerCase().includes(s) || o.category.toLowerCase().includes(s));
    }
    return lib;
  }, [search, allowedCatIds]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    const newObj: SceneObject = { id: `obj-${Date.now()}`, type: activeTool, color: activeColor, x, y, size: 35, zIndex: objects.length };
    setObjects(prev => [...prev, newObj]);
  }, [activeTool, activeColor, objects.length]);

  const updateQuestion = useCallback((qi: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, [field]: value } : q));
  }, []);

  const deleteQuestion = useCallback((qi: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== qi));
  }, []);

  const addQuestion = useCallback(() => {
    if (questions.length >= 5) return;
    setQuestions(prev => [...prev, { id: generateId(), text: '', options: ['','','',''], correctIndex: 0, category: 'count', timeLimit: 8 }]);
  }, [questions.length]);

  const autoGenerate = useCallback(() => {
    if (!config) return;
    const newObjs = generateObjects(config.suggestedObjectCount, allowedCatIds);
    setObjects(newObjs);
    const newQs = generateQuestions(newObjs);
    setQuestions(newQs);
    if (!title) setTitle(generateLevelTitle(worldId, newObjs.length, viewTime));
  }, [config, allowedCatIds, worldId, viewTime, title]);

  const autoGenQuestions = useCallback(() => {
    if (objects.length === 0) return;
    setQuestions(generateQuestions(objects));
  }, [objects]);

  const save = useCallback(async (status: string) => {
    setSaving(true); setError(null);
    try {
      const body = {
        id: editId || levelId,
        world_id: worldId,
        level_number: levelInWorld,
        title: title || generateLevelTitle(worldId, objects.length, viewTime),
        view_time: viewTime,
        difficulty: objects.length >= 8 || viewTime <= 3.0 ? 'hard' : objects.length >= 6 ? 'medium' : 'easy',
        scene_data: { objects, questions },
        status,
      };
      const res = await fetch('/api/levels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to save'); }
      setSuccess('Saved!'); setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }, [editId, levelId, worldId, levelInWorld, title, viewTime, objects, questions]);

  const difficulty = objects.length >= 8 || viewTime <= 3.0 ? 'hard' : objects.length >= 6 ? 'medium' : 'easy';

  if (loading) return <div className="p-8 text-slate-500">Loading level...</div>;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Object Library */}
      {showLibrary && (
        <div className="w-56 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 sticky top-0 bg-white z-10">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Objects</h3>
            <button onClick={() => setShowLibrary(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
          </div>
          <div className="p-2.5 flex-1 overflow-y-auto">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-lg border border-gray-200 px-2 py-1 text-xs mb-2" />
            <div className="flex gap-1 flex-wrap mb-2">{PALETTE.map(c => (<button key={c} onClick={() => setActiveColor(c)} style={{width:16,height:16,borderRadius:'50%',backgroundColor:c,border:activeColor===c?'2px solid #1A1A18':'1px solid #ddd'}} />))}</div>
            {/* Info: allowed categories for this world */}
            <div className="bg-blue-50 rounded-lg p-2 mb-2 text-[10px] text-blue-700">
              W{worldId}: {allowedCatIds.join(', ')} objects allowed
            </div>
            {objectCategories.filter(cat => allowedCatIds.includes(cat.id)).map(cat => {
              const items = filteredLib.filter(o => o.category === cat.name);
              if (items.length === 0) return null;
              const isOpen = expandedCats.has(cat.name);
              return (
                <div key={cat.id} className="mb-2">
                  <button onClick={() => setExpandedCats(prev => { const n=new Set(prev); n.has(cat.name)?n.delete(cat.name):n.add(cat.name); return n; })} className="w-full flex justify-between items-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-1 hover:text-slate-700">
                    <span>{cat.name} ({items.length})</span><span className="text-[9px]">{isOpen?'\u25B2':'\u25BC'}</span>
                  </button>
                  {isOpen && <div className="grid grid-cols-4 gap-1 mt-1">{items.map(obj => (
                    <button key={obj.id} onClick={() => setActiveTool(activeTool===obj.id?null:obj.id)} title={obj.name} className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${activeTool===obj.id?'border-purple-500 bg-purple-50 ring-2 ring-purple-300':'border-gray-100 hover:bg-gray-50'}`}>
                      <LibraryThumbnail item={obj} size={24} color={activeColor} />
                    </button>
                  ))}</div>}
                </div>
              );
            })}
          </div>
          {activeTool && <div className="p-2 bg-purple-50 border-t border-purple-100"><p className="text-[10px] text-purple-700 font-medium">Placing: {objectLibrary.find(o=>o.id===activeTool)?.name}</p><button onClick={()=>setActiveTool(null)} className="text-[10px] text-purple-500">Cancel</button></div>}
        </div>
      )}

      {/* Center */}
      <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-2 flex-wrap sticky top-0 z-10">
          <Link href="/levels" className="text-xs text-slate-500 hover:text-slate-700">{'\u2190'} Levels</Link>
          <div className="w-px h-4 bg-gray-200" />
          <button onClick={() => setShowLibrary(!showLibrary)} className={`px-2 py-1 text-xs rounded-md font-medium ${showLibrary?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-600'}`}>
            {showLibrary ? '\u25C0 Objects' : 'Objects \u25B6'}
          </button>
          <div className="w-px h-4 bg-gray-200" />

          {/* World + Level */}
          <select value={worldId} onChange={e => { setWorldId(Number(e.target.value)); setLevelInWorld(1); }} className="rounded-md border border-gray-300 px-2 py-1 text-xs">
            {WORLDS.map(w => <option key={w.id} value={w.id}>World {w.id}: {w.name}</option>)}
          </select>
          <span className="text-xs text-slate-400">Level</span>
          <input type="number" value={levelInWorld} onChange={e => setLevelInWorld(Number(e.target.value))} min={1} max={levelsInWorld(worldId)} className="w-12 rounded-md border border-gray-300 px-2 py-1 text-xs text-center" />

          {/* Title */}
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Level title..." className="rounded-md border border-gray-300 px-2 py-1 text-xs flex-1 min-w-[120px]" />

          {/* View time */}
          <span className="text-[10px] text-slate-400">{'\u23F1'}</span>
          <input type="number" value={viewTime} onChange={e => setViewTime(Number(e.target.value))} step={0.5} min={2} max={6} className="w-14 rounded-md border border-gray-300 px-2 py-1 text-xs text-center" />
          <span className="text-[10px] text-slate-400">s</span>

          {/* Difficulty badge */}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${difficulty==='hard'?'bg-red-50 text-red-700':difficulty==='medium'?'bg-yellow-50 text-yellow-700':'bg-green-50 text-green-700'}`}>
            {difficulty.charAt(0).toUpperCase()+difficulty.slice(1)}
          </span>

          <div className="flex-1" />

          <button onClick={() => setShowQuestions(!showQuestions)} className={`px-2 py-1 text-xs rounded-md font-medium ${showQuestions?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-600'}`}>
            {showQuestions ? 'Questions \u25B6' : '\u25C0 Questions'}
          </button>
        </div>

        {/* Alerts */}
        <div className="px-4">
          {error && <div className="mt-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>}
          {success && <div className="mt-2 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg px-3 py-2">{success}</div>}
        </div>

        {/* World hint */}
        {config && (
          <div className="mx-4 mt-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-center gap-3">
            <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded" style={{ backgroundColor: world?.color }}>W{worldId}</span>
            <span className="text-[10px] text-blue-700">Suggested: {config.suggestedObjectCount} objects, {config.viewTime}s viewing, {allowedCatIds.join(' + ')} objects</span>
            <div className="flex-1" />
            <button onClick={autoGenerate} className="text-[10px] font-semibold bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700">Auto-generate level</button>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 p-4 flex flex-col items-center">
          <div className="flex gap-2 mb-3 self-start">
            <button onClick={() => setShowGrid(!showGrid)} className={`px-2 py-1 text-xs rounded ${showGrid?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-600'}`}>Grid</button>
            <button onClick={() => { if(confirm('Clear all objects?')) setObjects([]); }} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200">Clear</button>
            <span className="text-xs text-slate-400 py-1">{objects.length} objects</span>
          </div>

          <div onClick={handleCanvasClick} style={{ cursor: activeTool ? 'crosshair' : 'default', maxWidth: 540 }} className="w-full">
            <InteractiveCanvas objects={objects} onObjectsChange={setObjects} selectedId={selectedId} onSelectObject={setSelectedId} width={540} height={540} showGrid={showGrid} />
          </div>

          {/* Save buttons */}
          <div className="mt-4 flex gap-3 self-start">
            <button onClick={() => save('complete')} disabled={saving} className="bg-green-600 text-white rounded-lg px-4 py-1.5 text-xs font-semibold hover:bg-green-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save as Complete'}</button>
            <button onClick={() => save('draft')} disabled={saving} className="bg-white border border-gray-200 text-gray-700 rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-gray-50">Save as Draft</button>
          </div>
        </div>
      </div>

      {/* Right: Questions */}
      {showQuestions && (
        <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 sticky top-0 bg-white z-10">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Questions ({questions.length}/5)</h3>
            <div className="flex items-center gap-1.5">
              {objects.length > 0 && <button onClick={autoGenQuestions} className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded hover:bg-purple-100 font-semibold">Auto-gen</button>}
              <button onClick={() => setShowQuestions(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">&times;</button>
            </div>
          </div>

          <div className="p-2.5 flex-1 overflow-y-auto">
            {questions.map((q, qi) => (
              <div key={q.id || qi} className="border border-gray-100 rounded-lg p-2.5 mb-2.5 bg-white shadow-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[9px] font-bold">{qi+1}</span>
                  <select value={q.category} onChange={e => updateQuestion(qi,'category',e.target.value)} className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-gray-50">
                    {Q_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                  <div className="flex-1" />
                  <button onClick={() => deleteQuestion(qi)} disabled={questions.length<=1} className="text-[10px] text-red-500 hover:text-red-700 disabled:opacity-30">{'\u{1F5D1}'}</button>
                </div>
                <textarea value={q.text} onChange={e => updateQuestion(qi,'text',e.target.value)} placeholder="Question text..." className="w-full text-[11px] border border-gray-200 rounded-lg px-2 py-1 mb-1.5 resize-none focus:border-purple-300 outline-none" rows={2} />
                <div className="grid grid-cols-2 gap-1 mb-1.5">
                  {(q.options||['','','','']).map((opt: string, oi: number) => (
                    <div key={oi} className="flex items-center gap-0.5">
                      <button onClick={() => updateQuestion(qi,'correctIndex',oi)} className={`w-4 h-4 min-w-[16px] rounded-full text-[8px] font-bold flex items-center justify-center ${oi===q.correctIndex?'bg-green-500 text-white':'bg-gray-200 text-gray-500'}`}>
                        {oi===q.correctIndex?'\u2713':String.fromCharCode(65+oi)}
                      </button>
                      <input value={opt} onChange={e=>{const opts=[...(q.options||['','','',''])];opts[oi]=e.target.value;updateQuestion(qi,'options',opts);}} placeholder={String.fromCharCode(65+oi)} className={`flex-1 text-[10px] border rounded px-1 py-0.5 outline-none min-w-0 ${oi===q.correctIndex?'border-green-300 bg-green-50':'border-gray-200'}`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {questions.length < 5 && (
              <button onClick={addQuestion} className="w-full py-1.5 text-xs text-purple-600 border border-dashed border-purple-300 rounded-lg hover:bg-purple-50 font-medium">+ Add question</button>
            )}

            {questions.length === 0 && (
              <div className="text-center py-6">
                <p className="text-[10px] text-slate-400 mb-2">No questions yet. Write them manually or auto-generate.</p>
                <button onClick={addQuestion} className="text-xs text-purple-600 border border-purple-300 rounded-lg px-3 py-1 hover:bg-purple-50 font-medium">+ Write a question</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LevelEditorPage() {
  return <Suspense fallback={<div className="p-8 text-slate-500">Loading editor...</div>}><EditorInner /></Suspense>;
}
