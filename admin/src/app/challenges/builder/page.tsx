'use client';
import { Suspense, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import InteractiveCanvas from '@/components/InteractiveCanvas';
import LibraryThumbnail from '@/components/LibraryThumbnail';
import { objectLibrary, objectCategories, getObjectById } from '@/data/objectLibrary';
import type { Scene, SceneObject, Question } from '@/lib/types';

type Mode = 'classic'|'speed'|'spot_the_change';
type Diff = 'easy'|'medium'|'hard';
const WM: Record<number,Mode> = {0:'classic',1:'classic',2:'speed',3:'classic',4:'spot_the_change',5:'classic',6:'speed'};
function modeFor(d:string):Mode{return WM[new Date(d+'T00:00:00Z').getUTCDay()]??'classic';}
function tmrw():string{const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().split('T')[0];}
const ML:Record<Mode,string>={classic:'Classic',speed:'Speed Round',spot_the_change:'Spot The Change'};
const PALETTE=['#FF6B6B','#0984E3','#00B894','#F9CA24','#6C5CE7','#E17055','#FD79A8','#00CEC9','#55EFC4','#FF7675','#2D3436','#A0522D'];
const Q_CATEGORIES = ['count','color','position','size','comparison','presence'] as const;

function generateId(): string { return `q-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function randomCorrectIndex(): 0|1|2|3 { return Math.floor(Math.random() * 4) as 0|1|2|3; }

function autoGenerateQuestions(objects: SceneObject[]): Question[] {
  if (!objects || objects.length === 0) return [];
  const questions: Question[] = [];
  const colorCounts: Record<string, number> = {};
  objects.forEach(o => { colorCounts[o.color] = (colorCounts[o.color] || 0) + 1; });
  const colors = Object.keys(colorCounts);

  // 1. Count question
  if (colors.length > 0) {
    const targetColor = colors[Math.floor(Math.random() * colors.length)];
    const correct = colorCounts[targetColor];
    const ci = randomCorrectIndex();
    const opts: string[] = ['','','',''];
    opts[ci] = `${correct}`;
    const wrongs = shuffle([correct + 1, correct + 2, Math.max(0, correct - 1)].map(String));
    let wi = 0;
    for (let i = 0; i < 4; i++) { if (i !== ci) opts[i] = wrongs[wi++]; }
    questions.push({ id: generateId(), text: `How many ${targetColor} objects were there?`, options: opts as [string,string,string,string], correctIndex: ci, category: 'count', timeLimit: 8 });
  }

  // 2. Color question
  if (objects.length > 0) {
    const obj = objects[Math.floor(Math.random() * objects.length)];
    const name = getObjectById(obj.type)?.name || obj.type;
    const ci = randomCorrectIndex();
    const opts: string[] = ['','','',''];
    opts[ci] = obj.color;
    const allColors = PALETTE.filter(c => c !== obj.color);
    const wrongs = shuffle(allColors).slice(0, 3);
    let wi = 0;
    for (let i = 0; i < 4; i++) { if (i !== ci) opts[i] = wrongs[wi++]; }
    questions.push({ id: generateId(), text: `What colour was the ${name}?`, options: opts as [string,string,string,string], correctIndex: ci, category: 'color', timeLimit: 8 });
  }

  // 3. Position question
  if (objects.length > 0) {
    const obj = objects[Math.floor(Math.random() * objects.length)];
    const name = getObjectById(obj.type)?.name || obj.type;
    const correctPos = obj.x < 50 ? (obj.y < 50 ? 'Top-left' : 'Bottom-left') : (obj.y < 50 ? 'Top-right' : 'Bottom-right');
    const allPos = ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'];
    const ci = randomCorrectIndex();
    const opts: string[] = ['','','',''];
    opts[ci] = correctPos;
    const wrongs = shuffle(allPos.filter(p => p !== correctPos));
    let wi = 0;
    for (let i = 0; i < 4; i++) { if (i !== ci) opts[i] = wrongs[wi++]; }
    questions.push({ id: generateId(), text: `Where was the ${name} positioned?`, options: opts as [string,string,string,string], correctIndex: ci, category: 'position', timeLimit: 8 });
  }

  // 4. Comparison question
  if (colors.length >= 2) {
    const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
    const most = sorted[0];
    const ci = randomCorrectIndex();
    const opts: string[] = ['','','',''];
    opts[ci] = most[0];
    const wrongs = shuffle(colors.filter(c => c !== most[0])).slice(0, 3);
    while (wrongs.length < 3) wrongs.push(PALETTE[Math.floor(Math.random() * PALETTE.length)]);
    let wi = 0;
    for (let i = 0; i < 4; i++) { if (i !== ci) opts[i] = wrongs[wi++]; }
    questions.push({ id: generateId(), text: 'Which colour had the most objects?', options: opts as [string,string,string,string], correctIndex: ci, category: 'comparison', timeLimit: 8 });
  }

  // 5. Presence question
  if (objects.length > 0) {
    const obj = objects[Math.floor(Math.random() * objects.length)];
    const name = getObjectById(obj.type)?.name || obj.type;
    const ci = randomCorrectIndex();
    const opts: string[] = ['','','',''];
    opts[ci] = 'Yes';
    let wi = 0;
    for (let i = 0; i < 4; i++) { if (i !== ci) opts[i] = ['No', 'Not sure', 'Maybe'][wi++]; }
    questions.push({ id: generateId(), text: `Was there a ${obj.color} ${name} in the scene?`, options: opts as [string,string,string,string], correctIndex: ci, category: 'presence', timeLimit: 8 });
  }

  return questions;
}

function BuilderInner() {
  const params = useSearchParams();
  const [date, setDate] = useState(params.get('date')??tmrw());
  const [mode, setMode] = useState<Mode>(modeFor(date));
  const [diff, setDiff] = useState<Diff>('medium');
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeScene, setActiveScene] = useState(0);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [activeTool, setActiveTool] = useState<string|null>(null);
  const [activeColor, setActiveColor] = useState('#6C5CE7');
  const [showGrid, setShowGrid] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(['Basic Shapes']));
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showQuestions, setShowQuestions] = useState(true);

  const filteredLib = useMemo(() => {
    if (!search) return objectLibrary;
    const s = search.toLowerCase();
    return objectLibrary.filter(o => o.name.toLowerCase().includes(s) || o.category.toLowerCase().includes(s));
  }, [search]);

  const onDateChange = useCallback((nd:string)=>{setDate(nd);setMode(modeFor(nd));setScenes([]);}, []);
  const generate = useCallback(async()=>{
    setLoading(true);setError(null);setSuccess(null);
    try{const res=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,mode,difficulty:diff})});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'Failed');
    const sd=data.challenge?.scene_data??data.scene_data??data;setScenes(sd.scenes??[]);setActiveScene(0);
    setSuccess('Generated!');setTimeout(()=>setSuccess(null),3000);}catch(e:any){setError(e.message);}finally{setLoading(false);}
  },[date,mode,diff]);
  const approve = useCallback(async(status:'live'|'draft')=>{
    setApproving(true);setError(null);
    try{const res=await fetch('/api/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dates:[date],status})});
    if(!res.ok){const d=await res.json();throw new Error(d.error||'Failed');}
    setSuccess(status==='live'?'Published!':'Saved as draft');setTimeout(()=>setSuccess(null),3000);}catch(e:any){setError(e.message);}finally{setApproving(false);}
  },[date]);
  const updateSceneObjects = useCallback((objs:SceneObject[])=>{setScenes(prev=>prev.map((s,i)=>i===activeScene?{...s,objects:objs}:s));},[activeScene]);
  const handleCanvasClick = useCallback((e:React.MouseEvent<HTMLDivElement>)=>{
    if(!activeTool)return;
    const rect=(e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x=Math.round(((e.clientX-rect.left)/rect.width)*100);const y=Math.round(((e.clientY-rect.top)/rect.height)*100);
    const newObj:SceneObject={id:`obj-${Date.now()}`,type:activeTool,color:activeColor,x,y,size:35,zIndex:scenes[activeScene]?.objects?.length??0};
    setScenes(prev=>prev.map((s,i)=>i===activeScene?{...s,objects:[...(s.objects||[]),newObj]}:s));
  },[activeTool,activeColor,activeScene,scenes]);
  const updateQuestion = useCallback((qi:number,field:string,value:any)=>{
    setScenes(prev=>prev.map((s,i)=>{if(i!==activeScene)return s;const qs=[...(s.questions||[])];qs[qi]={...qs[qi],[field]:value};return{...s,questions:qs};}));
  },[activeScene]);
  const deleteQuestion = useCallback((qi:number)=>{
    setScenes(prev=>prev.map((s,i)=>{if(i!==activeScene)return s;const qs=[...(s.questions||[])];qs.splice(qi,1);return{...s,questions:qs};}));
  },[activeScene]);
  const regenerateQuestion = useCallback((qi:number)=>{
    const scene = scenes[activeScene];
    if(!scene?.objects?.length) return;
    const generated = autoGenerateQuestions(scene.objects);
    if(generated.length === 0) return;
    const newQ = generated[qi % generated.length] || generated[0];
    updateQuestion(qi, 'text', newQ.text);
    updateQuestion(qi, 'options', newQ.options);
    updateQuestion(qi, 'correctIndex', newQ.correctIndex);
    updateQuestion(qi, 'category', newQ.category);
  },[activeScene, scenes, updateQuestion]);
  const autoGenerateAll = useCallback(()=>{
    const scene = scenes[activeScene];
    if(!scene?.objects?.length) return;
    const generated = autoGenerateQuestions(scene.objects);
    setScenes(prev=>prev.map((s,i)=>i===activeScene?{...s,questions:generated}:s));
  },[activeScene, scenes]);

  const createEmptyScene = useCallback(()=>{
    const sceneCount = mode === 'classic' ? 5 : mode === 'speed' ? 10 : 5;
    const newScenes: Scene[] = [];
    for (let i = 0; i < sceneCount; i++) {
      newScenes.push({ id: `scene-${i}`, viewTime: 4, objects: [], questions: [] });
    }
    setScenes(newScenes);
    setActiveScene(0);
  },[mode]);

  const addSceneQuestion = useCallback(()=>{
    const maxQ = mode === 'speed' ? 1 : 5;
    if (!scenes[activeScene]) return;
    setScenes(prev=>prev.map((s,i)=>{
      if(i!==activeScene)return s;
      if((s.questions||[]).length >= maxQ) return s;
      const newQ: Question = { id: generateId(), text: '', options: ['','','',''], correctIndex: 0, category: 'count', timeLimit: 8 };
      return{...s,questions:[...(s.questions||[]),newQ]};
    }));
  },[activeScene, mode, scenes]);

  const scene=scenes[activeScene];
  const maxQuestions = mode === 'speed' ? 1 : 5;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Object Library (collapsible) */}
      {showLibrary && (
        <div className="w-60 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 sticky top-0 bg-white z-10">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Objects</h3>
            <button onClick={()=>setShowLibrary(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none" title="Hide library">&times;</button>
          </div>
          <div className="p-3 flex-1 overflow-y-auto">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-lg border border-gray-200 px-2.5 py-1 text-xs mb-2.5" />
            <div className="flex gap-1 flex-wrap mb-2.5">{PALETTE.map(c=>(<button key={c} onClick={()=>setActiveColor(c)} style={{width:18,height:18,borderRadius:'50%',backgroundColor:c,border:activeColor===c?'2px solid #1A1A18':'1px solid #ddd',cursor:'pointer'}} />))}</div>
            {objectCategories.map(cat=>{
              const items=filteredLib.filter(o=>o.category===cat.name);
              if(items.length===0)return null;
              const isOpen=expandedCats.has(cat.name);
              return(<div key={cat.id} className="mb-2">
                <button onClick={()=>setExpandedCats(prev=>{const n=new Set(prev);n.has(cat.name)?n.delete(cat.name):n.add(cat.name);return n;})} className="w-full flex justify-between items-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider py-1 hover:text-slate-700">
                  <span>{cat.name} ({items.length})</span><span className="text-[9px]">{isOpen?'\u25B2':'\u25BC'}</span>
                </button>
                {isOpen&&<div className="grid grid-cols-4 gap-1 mt-1">{items.map(obj=>(<button key={obj.id} onClick={()=>setActiveTool(activeTool===obj.id?null:obj.id)} title={obj.name} className={`w-11 h-11 rounded-lg flex items-center justify-center border transition-all ${activeTool===obj.id?'border-purple-500 bg-purple-50 ring-2 ring-purple-300 scale-105':'border-gray-100 hover:bg-gray-50 hover:border-gray-200'}`}>
                  <LibraryThumbnail item={obj} size={26} color={activeColor} />
                </button>))}</div>}
              </div>);
            })}
          </div>
          {activeTool&&<div className="p-2.5 bg-purple-50 border-t border-purple-100"><p className="text-[10px] text-purple-700 font-medium">Placing: {objectLibrary.find(o=>o.id===activeTool)?.name}</p><button onClick={()=>setActiveTool(null)} className="text-[10px] text-purple-500 hover:text-purple-700 mt-0.5">Cancel</button></div>}
        </div>
      )}

      {/* Center: Canvas + Controls */}
      <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-10">
          {/* Panel toggles */}
          <button onClick={()=>setShowLibrary(!showLibrary)} className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${showLibrary?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title="Toggle object library">
            {showLibrary ? '\u25C0 Objects' : 'Objects \u25B6'}
          </button>
          <div className="w-px h-5 bg-gray-200" />

          {/* Date + Mode + Difficulty */}
          <div className="flex items-center gap-2">
            <input type="date" value={date} onChange={e=>onDateChange(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1 text-xs" />
            <select value={mode} onChange={e=>setMode(e.target.value as Mode)} className="rounded-md border border-gray-300 px-2 py-1 text-xs">{Object.entries(ML).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
            <select value={diff} onChange={e=>setDiff(e.target.value as Diff)} className="rounded-md border border-gray-300 px-2 py-1 text-xs">
              <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
            </select>
          </div>

          <button onClick={generate} disabled={loading} className="bg-purple-600 text-white rounded-lg px-4 py-1.5 text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">{loading?'Generating...':'Generate'}</button>

          <div className="flex-1" />

          <button onClick={()=>setShowQuestions(!showQuestions)} className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${showQuestions?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title="Toggle questions panel">
            {showQuestions ? 'Questions \u25B6' : '\u25C0 Questions'}
          </button>
        </div>

        {/* Alerts */}
        <div className="px-4">
          {error&&<div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>}
          {success&&<div className="mt-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-lg px-3 py-2">{success}</div>}
        </div>

        {/* Canvas area */}
        <div className="flex-1 p-4 flex flex-col items-center">
          {scenes.length > 0 ? (<>
            {/* Scene tabs */}
            <div className="flex gap-1 mb-3 self-start">{scenes.map((_,i)=>{const s=scenes[i];const hasObjs=(s?.objects?.length??0)>=3;const hasQs=(s?.questions?.length??0)>=1;return(<button key={i} onClick={()=>{setActiveScene(i);setSelectedId(null);}} className={`px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1.5 transition-colors ${i===activeScene?'bg-purple-600 text-white shadow-sm':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}><span className={`w-1.5 h-1.5 rounded-full ${hasObjs&&hasQs?'bg-green-400':hasObjs?'bg-yellow-400':'bg-red-400'}`}/>Scene {i+1}</button>);})}</div>

            {/* Canvas toolbar */}
            <div className="flex gap-2 mb-3 self-start">
              <button onClick={()=>setShowGrid(!showGrid)} className={`px-2 py-1 text-xs rounded ${showGrid?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-600'}`}>Grid</button>
              <button onClick={()=>{if(confirm('Clear all objects?'))updateSceneObjects([]);}} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200">Clear</button>
              <span className="text-xs text-slate-400 py-1">{scene?.objects?.length??0} objects</span>
            </div>

            {/* The canvas */}
            <div onClick={handleCanvasClick} style={{cursor:activeTool?'crosshair':'default', maxWidth: 560}} className="w-full">
              <InteractiveCanvas objects={scene?.objects??[]} onObjectsChange={updateSceneObjects} selectedId={selectedId} onSelectObject={setSelectedId} width={560} height={560} showGrid={showGrid} />
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex gap-3 self-start">
              <button onClick={()=>approve('live')} disabled={approving} className="bg-green-600 text-white rounded-lg px-4 py-1.5 text-xs font-semibold hover:bg-green-700 disabled:opacity-50">{approving?'Publishing...':'Approve & Publish'}</button>
              <button onClick={()=>approve('draft')} disabled={approving} className="bg-white border border-gray-200 text-gray-700 rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-gray-50">Save as Draft</button>
              <button onClick={generate} disabled={loading} className="bg-orange-500 text-white rounded-lg px-4 py-1.5 text-xs font-medium hover:bg-orange-600 disabled:opacity-50">Regenerate</button>
            </div>
          </>) : (
            /* Empty state - no scenes yet */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="text-5xl mb-4">{'\u{1F3A8}'}</div>
                <h2 className="text-lg font-semibold text-slate-700 mb-1">No challenge loaded</h2>
                <p className="text-sm text-slate-400 mb-5">Generate a challenge with AI, or build one from scratch by placing objects and writing questions yourself.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={generate} disabled={loading} className="bg-purple-600 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">{loading?'Generating...':'Generate with AI'}</button>
                  <button onClick={createEmptyScene} className="bg-white border border-gray-300 text-gray-700 rounded-lg px-5 py-2 text-sm font-medium hover:bg-gray-50">Start from scratch</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Questions Editor (collapsible) */}
      {showQuestions && (
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 sticky top-0 bg-white z-10">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Questions {scene?`(${scene.questions?.length??0}/${maxQuestions})`:''}</h3>
            <div className="flex items-center gap-2">
              {scene && scene.objects?.length > 0 && (
                <button onClick={autoGenerateAll} className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded hover:bg-purple-100 font-semibold">
                  Auto-generate
                </button>
              )}
              <button onClick={()=>setShowQuestions(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none" title="Hide questions">&times;</button>
            </div>
          </div>

          <div className="p-3 flex-1 overflow-y-auto">
            {scene?.questions?.map((q:any,qi:number)=>(
              <div key={q.id || qi} className="border border-gray-100 rounded-lg p-3 mb-3 bg-white shadow-sm">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">{qi+1}</span>
                  <select value={q.category} onChange={e=>updateQuestion(qi,'category',e.target.value)} className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50">
                    {Q_CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                  <div className="flex-1" />
                  <button onClick={()=>regenerateQuestion(qi)} title="Regenerate" className="text-[10px] text-blue-600 hover:text-blue-800 px-1">{'\u{1F504}'}</button>
                  <button onClick={()=>deleteQuestion(qi)} disabled={(scene.questions?.length??0)<=1} title="Delete" className="text-[10px] text-red-500 hover:text-red-700 px-1 disabled:opacity-30 disabled:cursor-not-allowed">{'\u{1F5D1}'}</button>
                </div>

                {/* Question text */}
                <textarea
                  value={q.text}
                  onChange={e=>updateQuestion(qi,'text',e.target.value)}
                  placeholder="Type your question here..."
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 mb-2 resize-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200 outline-none"
                  rows={2}
                />

                {/* Options */}
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {(q.options||['','','','']).map((opt:string,oi:number)=>(
                    <div key={oi} className="flex items-center gap-1">
                      <button
                        onClick={()=>updateQuestion(qi,'correctIndex',oi)}
                        className={`w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full text-[9px] font-bold flex-shrink-0 flex items-center justify-center transition-colors ${oi===q.correctIndex?'bg-green-500 text-white':'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                      >
                        {oi===q.correctIndex ? '\u2713' : String.fromCharCode(65+oi)}
                      </button>
                      <input
                        value={opt}
                        onChange={e=>{const opts=[...(q.options||['','','',''])];opts[oi]=e.target.value;updateQuestion(qi,'options',opts);}}
                        placeholder={`Option ${String.fromCharCode(65+oi)}`}
                        className={`flex-1 text-[10px] border rounded px-1.5 py-1 outline-none transition-colors min-w-0 ${oi===q.correctIndex?'border-green-300 bg-green-50 focus:border-green-400':'border-gray-200 focus:border-purple-300'}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Correct answer pills */}
                <div className="flex gap-0.5">
                  {['A','B','C','D'].map((letter, oi) => (
                    <button key={oi} onClick={()=>updateQuestion(qi,'correctIndex',oi)}
                      className={`flex-1 text-[9px] font-semibold py-0.5 rounded transition-colors ${oi===q.correctIndex?'bg-green-100 text-green-700 border border-green-300':'bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100'}`}>
                      {letter}{oi===q.correctIndex?' \u2713':''}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Add question button */}
            {scene && (scene.questions?.length??0) < maxQuestions && (
              <button onClick={addSceneQuestion} className="w-full py-2 text-xs text-purple-600 border border-dashed border-purple-300 rounded-lg hover:bg-purple-50 hover:border-purple-400 transition-colors font-medium">
                + Add question
              </button>
            )}

            {/* Empty state: scenes exist but no questions yet */}
            {scene && (!scene.questions || scene.questions.length === 0) && (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">{'\u{270F}\u{FE0F}'}</div>
                <p className="text-xs text-slate-700 font-medium mb-1">No questions yet</p>
                <p className="text-[10px] text-slate-400 mb-3">Add questions manually or auto-generate them from the objects on the canvas.</p>
                <div className="flex flex-col gap-2">
                  <button onClick={addSceneQuestion} className="w-full py-1.5 text-xs text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 font-medium">
                    + Write a question
                  </button>
                  {scene.objects?.length > 0 && (
                    <button onClick={autoGenerateAll} className="w-full py-1.5 text-xs text-white bg-purple-600 rounded-lg hover:bg-purple-700 font-medium">
                      Auto-generate from objects
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Empty state: no scenes at all */}
            {!scene&&(
              <div className="text-center py-8">
                <div className="text-3xl mb-2">{'\u{1F9E0}'}</div>
                <p className="text-xs text-slate-500 mb-1">No challenge loaded yet.</p>
                <p className="text-[10px] text-slate-400 mb-3">Generate a challenge or start from scratch to begin adding questions.</p>
                <button onClick={createEmptyScene} className="text-xs text-purple-600 border border-purple-300 rounded-lg px-3 py-1.5 hover:bg-purple-50 font-medium">
                  Start from scratch
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BuilderPage(){return<Suspense fallback={<div className="p-8 text-slate-500">Loading...</div>}><BuilderInner/></Suspense>;}
