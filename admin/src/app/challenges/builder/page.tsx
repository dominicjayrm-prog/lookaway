'use client';
import { Suspense, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import InteractiveCanvas from '@/components/InteractiveCanvas';
import { objectLibrary, CATEGORIES } from '@/data/objectLibrary';
import type { Scene, SceneObject } from '@/lib/types';

type Mode = 'classic'|'speed'|'spot_the_change';
type Diff = 'easy'|'medium'|'hard';
const WM: Record<number,Mode> = {0:'classic',1:'classic',2:'speed',3:'classic',4:'spot_the_change',5:'classic',6:'speed'};
function modeFor(d:string):Mode{return WM[new Date(d+'T00:00:00Z').getUTCDay()]??'classic';}
function tmrw():string{const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().split('T')[0];}
const ML:Record<Mode,string>={classic:'Classic',speed:'Speed Round',spot_the_change:'Spot The Change'};
const PALETTE=['#FF6B6B','#0984E3','#00B894','#F9CA24','#6C5CE7','#E17055','#FD79A8','#00CEC9','#55EFC4','#FF7675','#2D3436','#A0522D'];

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

  const updateSceneObjects = useCallback((objs:SceneObject[])=>{
    setScenes(prev=>prev.map((s,i)=>i===activeScene?{...s,objects:objs}:s));
  },[activeScene]);

  const handleCanvasClick = useCallback((e:React.MouseEvent<HTMLDivElement>)=>{
    if(!activeTool)return;
    const rect=(e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x=Math.round(((e.clientX-rect.left)/rect.width)*100);
    const y=Math.round(((e.clientY-rect.top)/rect.height)*100);
    const newObj:SceneObject={id:`obj-${Date.now()}`,type:activeTool,color:activeColor,x,y,size:35,zIndex:scenes[activeScene]?.objects?.length??0};
    setScenes(prev=>prev.map((s,i)=>i===activeScene?{...s,objects:[...(s.objects||[]),newObj]}:s));
  },[activeTool,activeColor,activeScene,scenes]);

  const updateQuestion = useCallback((qi:number,field:string,value:any)=>{
    setScenes(prev=>prev.map((s,i)=>{
      if(i!==activeScene)return s;
      const qs=[...(s.questions||[])];
      qs[qi]={...qs[qi],[field]:value};
      return{...s,questions:qs};
    }));
  },[activeScene]);

  const scene=scenes[activeScene];
  const sceneCount=mode==='classic'?5:mode==='speed'?10:5;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left: Object Library */}
      <div className="w-60 bg-white border-r border-gray-200 overflow-y-auto p-3 flex-shrink-0">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Objects</h3>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm mb-3" />
        <div className="flex gap-1 flex-wrap mb-3">{PALETTE.map(c=>(<button key={c} onClick={()=>setActiveColor(c)} style={{width:20,height:20,borderRadius:'50%',backgroundColor:c,border:activeColor===c?'2px solid #1A1A18':'1px solid #ddd'}} />))}</div>
        {CATEGORIES.map(cat=>{
          const items=filteredLib.filter(o=>o.category===cat);
          if(items.length===0)return null;
          const isOpen=expandedCats.has(cat);
          return(<div key={cat} className="mb-2">
            <button onClick={()=>setExpandedCats(prev=>{const n=new Set(prev);n.has(cat)?n.delete(cat):n.add(cat);return n;})} className="w-full flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wider py-1 hover:text-slate-700">
              {cat}<span>{isOpen?'\u25B2':'\u25BC'}</span>
            </button>
            {isOpen&&<div className="grid grid-cols-4 gap-1 mt-1">{items.map(obj=>(<button key={obj.id} onClick={()=>setActiveTool(activeTool===obj.id?null:obj.id)} title={obj.name} className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border ${activeTool===obj.id?'border-purple-500 bg-purple-50 ring-2 ring-purple-300':'border-gray-100 hover:bg-gray-50'}`}>
              {obj.id==='circle'?'\u25CF':obj.id==='square'?'\u25A0':obj.id==='triangle'?'\u25B2':obj.id==='star'?'\u2605':obj.id==='heart'?'\u2665':obj.id==='diamond'?'\u25C6':obj.label?obj.label:obj.name[0]}
            </button>))}</div>}
          </div>);
        })}
        {activeTool&&<p className="mt-2 text-xs text-purple-600 font-medium">Click canvas to place: {activeTool}</p>}
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

      {/* Right: Questions */}
      <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4 flex-shrink-0">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Questions {scene?`(${scene.questions?.length??0}/${mode==='speed'?1:5})`:''}</h3>
        {scene?.questions?.map((q:any,qi:number)=>(
          <div key={qi} className="border border-gray-100 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">{qi+1}</span>
              <select value={q.category} onChange={e=>updateQuestion(qi,'category',e.target.value)} className="text-xs border border-gray-200 rounded px-1 py-0.5">
                {['count','color','position','size','comparison','presence'].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <textarea value={q.text} onChange={e=>updateQuestion(qi,'text',e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1 mb-2 resize-none" rows={2} />
            <div className="grid grid-cols-2 gap-1">
              {(q.options||[]).map((opt:string,oi:number)=>(
                <div key={oi} className="flex items-center gap-1">
                  <button onClick={()=>updateQuestion(qi,'correctIndex',oi)} className={`w-5 h-5 rounded-full text-xs font-bold flex-shrink-0 ${oi===q.correctIndex?'bg-green-500 text-white':'bg-gray-200 text-gray-500'}`}>{String.fromCharCode(65+oi)}</button>
                  <input value={opt} onChange={e=>{const opts=[...(q.options||[])];opts[oi]=e.target.value;updateQuestion(qi,'options',opts);}} className={`flex-1 text-xs border rounded px-1.5 py-1 ${oi===q.correctIndex?'border-green-300 bg-green-50':'border-gray-200'}`} />
                </div>
              ))}
            </div>
          </div>
        ))}
        {!scene&&<p className="text-sm text-slate-400">Generate a challenge to see questions here.</p>}
      </div>
    </div>
  );
}

export default function BuilderPage(){return<Suspense fallback={<div className="p-8 text-slate-500">Loading...</div>}><BuilderInner/></Suspense>;}
