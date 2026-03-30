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

  // 1. Count question
  const colorCounts: Record<string, number> = {};
  objects.forEach(o => { colorCounts[o.color] = (colorCounts[o.color] || 0) + 1; });
  const colors = Object.keys(colorCounts);
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
  const addQuestion = useCallback(()=>{
    const maxQ = mode === 'speed' ? 1 : 5;
    setScenes(prev=>prev.map((s,i)=>{
      if(i!==activeScene)return s;
      if((s.questions||[]).length >= maxQ) return s;
      const newQ: Question = { id: generateId(), text: '', options: ['','','',''], correctIndex: 0, category: 'count', timeLimit: 8 };
      return{...s,questions:[...(s.questions||[]),newQ]};
    }));
  },[activeScene, mode]);
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

  const scene=scenes[activeScene];
  const maxQuestions = mode === 'speed' ? 1 : 5;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Object Library */}
      <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto p-3 flex-shrink-0">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Object Library</h3>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search objects..." className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm mb-3" />
        <div className="flex gap-1 flex-wrap mb-3">{PALETTE.map(c=>(<button key={c} onClick={()=>setActiveColor(c)} style={{width:20,height:20,borderRadius:'50%',backgroundColor:c,border:activeColor===c?'2px solid #1A1A18':'1px solid #ddd',cursor:'pointer'}} />))}</div>
        {objectCategories.map(cat=>{
          const items=filteredLib.filter(o=>o.category===cat.name);
          if(items.length===0)return null;
          const isOpen=expandedCats.has(cat.name);
          return(<div key={cat.id} className="mb-3">
            <button onClick={()=>setExpandedCats(prev=>{const n=new Set(prev);n.has(cat.name)?n.delete(cat.name):n.add(cat.name);return n;})} className="w-full flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-1.5 hover:text-slate-700">
              <span>{cat.name} ({items.length})</span><span className="text-[10px]">{isOpen?'\u25B2':'\u25BC'}</span>
            </button>
            {isOpen&&<div className="grid grid-cols-4 gap-1.5 mt-1">{items.map(obj=>(<button key={obj.id} onClick={()=>setActiveTool(activeTool===obj.id?null:obj.id)} title={obj.name} className={`w-12 h-12 rounded-lg flex items-center justify-center border transition-all ${activeTool===obj.id?'border-purple-500 bg-purple-50 ring-2 ring-purple-300 scale-105':'border-gray-100 hover:bg-gray-50 hover:border-gray-200'}`}>
              <LibraryThumbnail item={obj} size={28} color={activeColor} />
            </button>))}</div>}
          </div>);
        })}
        {activeTool&&<div className="mt-3 p-2 bg-purple-50 rounded-lg"><p className="text-xs text-purple-700 font-medium">Click canvas to place:</p><p className="text-xs text-purple-600">{objectLibrary.find(o=>o.id===activeTool)?.name}</p></div>}
      </div>

      {/* Center: Canvas + Controls */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-slate-900">Challenge Builder</h1>
            <div className="flex items-end gap-3">
              <div><label className="text-xs text-slate-500">Date</label><input type="date" value={date} onChange={e=>onDateChange(e.target.value)} className="block rounded border border-gray-300 px-2 py-1 text-sm" /></div>
              <div><label className="text-xs text-slate-500">Mode</label><select value={mode} onChange={e=>setMode(e.target.value as Mode)} className="block rounded border border-gray-300 px-2 py-1 text-sm">{Object.entries(ML).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
              <button onClick={generate} disabled={loading} className="bg-purple-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-purple-700 disabled:opacity-50">{loading?'Generating...':'Generate'}</button>
            </div>
          </div>
          {error&&<div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>}
          {success&&<div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-2">{success}</div>}
          {scenes.length>0&&(<>
            <div className="flex gap-1 mb-3">{scenes.map((_,i)=>{const s=scenes[i];const hasObjs=(s?.objects?.length??0)>=3;const hasQs=(s?.questions?.length??0)>=1;return(<button key={i} onClick={()=>{setActiveScene(i);setSelectedId(null);}} className={`px-3 py-1.5 text-xs rounded-lg font-medium flex items-center gap-1 ${i===activeScene?'bg-purple-600 text-white':'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}><span className={`w-2 h-2 rounded-full ${hasObjs&&hasQs?'bg-green-400':hasObjs?'bg-yellow-400':'bg-red-400'}`}/>Scene {i+1}</button>);})}</div>
            <div className="flex gap-2 mb-3">
              <button onClick={()=>setShowGrid(!showGrid)} className={`px-2 py-1 text-xs rounded ${showGrid?'bg-purple-100 text-purple-700':'bg-gray-100 text-gray-600'}`}>Grid</button>
              <button onClick={()=>{if(confirm('Clear all objects?'))updateSceneObjects([]);}} className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200">Clear</button>
              <span className="text-xs text-slate-400 py-1">{scene?.objects?.length??0} objects</span>
            </div>
            <div onClick={handleCanvasClick} style={{cursor:activeTool?'crosshair':'default'}}>
              <InteractiveCanvas objects={scene?.objects??[]} onObjectsChange={updateSceneObjects} selectedId={selectedId} onSelectObject={setSelectedId} width={500} height={500} showGrid={showGrid} />
            </div>
          </>)}
          {scenes.length>0&&<div className="mt-6 flex gap-3">
            <button onClick={()=>approve('live')} disabled={approving} className="bg-green-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">{approving?'Publishing...':'Approve & Publish'}</button>
            <button onClick={()=>approve('draft')} disabled={approving} className="bg-white border border-gray-200 text-gray-700 rounded-lg px-5 py-2 text-sm font-medium hover:bg-gray-50">Save as Draft</button>
            <button onClick={generate} disabled={loading} className="bg-orange-500 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-50">Regenerate</button>
          </div>}
        </div>
      </div>

      {/* Right: Questions Editor */}
      <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900">Questions {scene?`(${scene.questions?.length??0}/${maxQuestions})`:''}</h3>
          {scene && scene.objects?.length > 0 && (
            <button onClick={autoGenerateAll} className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-100 font-medium">
              Auto-generate all
            </button>
          )}
        </div>

        {scene?.questions?.map((q:any,qi:number)=>(
          <div key={q.id || qi} className="border border-gray-100 rounded-lg p-3 mb-3 bg-white shadow-sm">
            {/* Header: number + category */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">{qi+1}</span>
              <select value={q.category} onChange={e=>updateQuestion(qi,'category',e.target.value)} className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50">
                {Q_CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
              <div className="flex-1" />
              <button onClick={()=>regenerateQuestion(qi)} title="Regenerate this question" className="text-xs text-blue-600 hover:text-blue-800 px-1">🔄</button>
              <button onClick={()=>deleteQuestion(qi)} disabled={(scene.questions?.length??0)<=1} title="Delete question" className="text-xs text-red-500 hover:text-red-700 px-1 disabled:opacity-30 disabled:cursor-not-allowed">🗑</button>
            </div>

            {/* Question text */}
            <textarea
              value={q.text}
              onChange={e=>updateQuestion(qi,'text',e.target.value)}
              placeholder="Type your question here..."
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 mb-2 resize-none focus:border-purple-300 focus:ring-1 focus:ring-purple-200 outline-none"
              rows={2}
            />

            {/* 2x2 option grid */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {(q.options||['','','','']).map((opt:string,oi:number)=>(
                <div key={oi} className="flex items-center gap-1">
                  <button
                    onClick={()=>updateQuestion(qi,'correctIndex',oi)}
                    className={`w-5 h-5 rounded-full text-[10px] font-bold flex-shrink-0 flex items-center justify-center transition-colors ${oi===q.correctIndex?'bg-green-500 text-white shadow-sm':'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                  >
                    {oi===q.correctIndex ? '✓' : String.fromCharCode(65+oi)}
                  </button>
                  <input
                    value={opt}
                    onChange={e=>{const opts=[...(q.options||['','','',''])];opts[oi]=e.target.value;updateQuestion(qi,'options',opts);}}
                    placeholder={`Option ${String.fromCharCode(65+oi)}`}
                    className={`flex-1 text-xs border rounded px-1.5 py-1 outline-none transition-colors ${oi===q.correctIndex?'border-green-300 bg-green-50 focus:border-green-400':'border-gray-200 focus:border-purple-300'}`}
                  />
                </div>
              ))}
            </div>

            {/* Correct answer label */}
            <div className="flex gap-1">
              {['A','B','C','D'].map((letter, oi) => (
                <button key={oi} onClick={()=>updateQuestion(qi,'correctIndex',oi)}
                  className={`flex-1 text-[10px] font-semibold py-0.5 rounded transition-colors ${oi===q.correctIndex?'bg-green-100 text-green-700 border border-green-300':'bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100'}`}>
                  {letter}{oi===q.correctIndex?' ✓':''}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Add question button */}
        {scene && (scene.questions?.length??0) < maxQuestions && (
          <button onClick={addQuestion} className="w-full py-2 text-sm text-purple-600 border border-dashed border-purple-300 rounded-lg hover:bg-purple-50 hover:border-purple-400 transition-colors font-medium">
            + Add question
          </button>
        )}

        {/* Empty state */}
        {!scene&&(
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🧠</div>
            <p className="text-sm text-slate-500 mb-1">No challenge loaded yet.</p>
            <p className="text-xs text-slate-400">Click Generate to create a challenge, or start adding objects to the canvas manually.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BuilderPage(){return<Suspense fallback={<div className="p-8 text-slate-500">Loading...</div>}><BuilderInner/></Suspense>;}
