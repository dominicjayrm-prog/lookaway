'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import { WORLDS, getWorldConfig, levelsInWorld, generateLevelTitle } from '@/data/worldConfig';
import { objectLibrary, objectCategories, getObjectById } from '@/data/objectLibrary';
import type { SceneObject, Question } from '@/lib/types';

const PALETTE = ['#FF6B6B','#0984E3','#00B894','#F9CA24','#6C5CE7','#E17055','#FD79A8','#00CEC9','#55EFC4','#FF7675','#2D3436','#A0522D'];

function generateId(): string { return `q-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }
function shuffle<T>(a: T[]): T[] { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; }
function randomCI(): 0|1|2|3 { return Math.floor(Math.random()*4) as 0|1|2|3; }

function dist(x: number, y: number, existing: {x:number;y:number}[]) {
  return existing.every(o => Math.hypot(x-o.x,y-o.y) >= 15);
}

function genObjects(count: number, allowedCatIds: string[]): SceneObject[] {
  const allowed = objectLibrary.filter(o => {
    const catId = objectCategories.find(c => c.name === o.category)?.id;
    return catId && allowedCatIds.includes(catId);
  });
  if (allowed.length === 0) return [];
  const colors = shuffle([...PALETTE]).slice(0, Math.min(count, 5));
  const types = shuffle(allowed).slice(0, Math.min(count, 8));
  const objects: SceneObject[] = [];
  for (let i = 0; i < count; i++) {
    let x: number, y: number, att = 0;
    do { x = 10+Math.random()*80; y = 10+Math.random()*80; att++; } while (!dist(x,y,objects) && att < 50);
    objects.push({ id: `obj-${Date.now()}-${i}-${Math.random().toString(36).slice(2,5)}`, type: types[i%types.length].id, color: colors[i%colors.length], x: Math.round(x), y: Math.round(y), size: 24+Math.floor(Math.random()*20), zIndex: i });
  }
  return objects;
}

function genQuestions(objects: SceneObject[]): Question[] {
  if (!objects.length) return [];
  const qs: Question[] = [];
  const cc: Record<string,number> = {};
  objects.forEach(o => cc[o.color]=(cc[o.color]||0)+1);
  const colors = Object.keys(cc);

  if (colors.length > 0) {
    const tc=colors[Math.floor(Math.random()*colors.length)]; const c=cc[tc]; const ci=randomCI();
    const opts=['','','','']; opts[ci]=`${c}`;
    const w=shuffle([c+1,c+2,Math.max(0,c-1)].map(String)); let wi=0;
    for(let i=0;i<4;i++)if(i!==ci)opts[i]=w[wi++];
    qs.push({id:generateId(),text:`How many ${tc} objects were there?`,options:opts as any,correctIndex:ci,category:'count',timeLimit:8});
  }
  if (objects.length > 0) {
    const obj=objects[Math.floor(Math.random()*objects.length)];
    const name=getObjectById(obj.type)?.name||obj.type;
    const ci=randomCI(); const opts=['','','',''];
    opts[ci]=obj.color;
    const w=shuffle(PALETTE.filter(c=>c!==obj.color)).slice(0,3); let wi=0;
    for(let i=0;i<4;i++)if(i!==ci)opts[i]=w[wi++];
    qs.push({id:generateId(),text:`What colour was the ${name}?`,options:opts as any,correctIndex:ci,category:'color',timeLimit:8});
  }
  if (objects.length > 0) {
    const obj=objects[Math.floor(Math.random()*objects.length)];
    const name=getObjectById(obj.type)?.name||obj.type;
    const pos=obj.x<50?(obj.y<50?'Top-left':'Bottom-left'):(obj.y<50?'Top-right':'Bottom-right');
    const all=['Top-left','Top-right','Bottom-left','Bottom-right'];
    const ci=randomCI(); const opts=['','','',''];
    opts[ci]=pos; const w=shuffle(all.filter(p=>p!==pos)); let wi=0;
    for(let i=0;i<4;i++)if(i!==ci)opts[i]=w[wi++];
    qs.push({id:generateId(),text:`Where was the ${name}?`,options:opts as any,correctIndex:ci,category:'position',timeLimit:8});
  }
  if (colors.length>=2) {
    const sorted=Object.entries(cc).sort((a,b)=>b[1]-a[1]); const ci=randomCI(); const opts=['','','',''];
    opts[ci]=sorted[0][0];
    const w=shuffle(colors.filter(c=>c!==sorted[0][0])).slice(0,3);
    while(w.length<3)w.push(PALETTE[Math.floor(Math.random()*PALETTE.length)]);
    let wi=0; for(let i=0;i<4;i++)if(i!==ci)opts[i]=w[wi++];
    qs.push({id:generateId(),text:'Which colour had the most objects?',options:opts as any,correctIndex:ci,category:'comparison',timeLimit:8});
  }
  if (objects.length > 0) {
    const obj=objects[Math.floor(Math.random()*objects.length)];
    const name=getObjectById(obj.type)?.name||obj.type;
    const ci=randomCI(); const opts=['','','',''];
    opts[ci]='Yes'; let wi=0;
    for(let i=0;i<4;i++)if(i!==ci)opts[i]=['No','Not sure','Maybe'][wi++];
    qs.push({id:generateId(),text:`Was there a ${obj.color} ${name}?`,options:opts as any,correctIndex:ci,category:'presence',timeLimit:8});
  }
  return qs;
}

interface GeneratedLevel {
  id: string;
  world_id: number;
  level_number: number;
  title: string;
  view_time: number;
  difficulty: string;
  scene_data: { objects: SceneObject[]; questions: Question[] };
  status: string;
  approved: boolean;
}

export default function BatchPage() {
  const [worldId, setWorldId] = useState(1);
  const [count, setCount] = useState(10);
  const [startFrom, setStartFrom] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedLevel[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState(false);

  const world = WORLDS[worldId - 1];

  const generate = useCallback(() => {
    setGenerating(true);
    setGenerated([]);
    setSaved(false);
    const levels: GeneratedLevel[] = [];
    const max = Math.min(count, levelsInWorld(worldId));

    for (let i = 0; i < max; i++) {
      const levelNum = startFrom + i;
      const config = getWorldConfig(worldId, levelNum);
      if (!config) continue;
      const objs = genObjects(config.suggestedObjectCount, config.allowedCategories);
      const qs = genQuestions(objs);
      const vt = config.viewTime;
      const diff = objs.length >= 8 || vt <= 3.0 ? 'hard' : objs.length >= 6 ? 'medium' : 'easy';
      levels.push({
        id: `w${worldId}-l${levelNum}`,
        world_id: worldId,
        level_number: levelNum,
        title: generateLevelTitle(worldId, objs.length, vt),
        view_time: vt,
        difficulty: diff,
        scene_data: { objects: objs, questions: qs },
        status: 'complete',
        approved: true,
      });
      setProgress(i + 1);
    }
    setGenerated(levels);
    setGenerating(false);
  }, [worldId, count, startFrom]);

  const toggleApproval = useCallback((idx: number) => {
    setGenerated(prev => prev.map((l, i) => i === idx ? { ...l, approved: !l.approved } : l));
  }, []);

  const saveApproved = useCallback(async () => {
    const toSave = generated.filter(l => l.approved);
    if (toSave.length === 0) return;
    setSaving(true);
    try {
      for (const l of toSave) {
        await fetch('/api/levels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: l.id,
            world_id: l.world_id,
            level_number: l.level_number,
            title: l.title,
            view_time: l.view_time,
            difficulty: l.difficulty,
            scene_data: l.scene_data,
            status: l.status,
          }),
        });
      }
      setSaved(true);
    } catch (e) {
      alert('Failed to save some levels');
    } finally {
      setSaving(false);
    }
  }, [generated]);

  const approvedCount = generated.filter(l => l.approved).length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/levels" className="text-sm text-slate-500 hover:text-slate-700">{'\u2190'} Back</Link>
        <h1 className="text-2xl font-bold text-slate-900">Batch Generate Levels</h1>
      </div>

      {/* Config */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="text-xs text-slate-500 block mb-1">World</label>
            <select value={worldId} onChange={e => setWorldId(Number(e.target.value))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {WORLDS.map(w => <option key={w.id} value={w.id}>W{w.id}: {w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Count</label>
            <input type="number" value={count} onChange={e => setCount(Number(e.target.value))} min={1} max={35} className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-20" />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Starting from level</label>
            <input type="number" value={startFrom} onChange={e => setStartFrom(Number(e.target.value))} min={1} max={levelsInWorld(worldId)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-20" />
          </div>
          <button onClick={generate} disabled={generating} className="bg-purple-600 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-purple-700 disabled:opacity-50">
            {generating ? `Generating... ${progress}/${count}` : `Generate ${count} levels`}
          </button>
        </div>
        {world && (
          <div className="mt-3 text-xs text-slate-400">
            {world.name} — {world.allowedCategories.join(', ')} objects, {world.viewingTimeRange[0]}–{world.viewingTimeRange[1]}s viewing, {world.objectCountRange[0]}–{world.objectCountRange[1]} objects
          </div>
        )}
      </div>

      {/* Generated results */}
      {generated.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">{generated.length} levels generated</h2>
            <div className="flex gap-2">
              <span className="text-sm text-slate-500">{approvedCount} approved</span>
              {!saved ? (
                <button onClick={saveApproved} disabled={saving || approvedCount === 0} className="bg-green-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                  {saving ? 'Saving...' : `Save ${approvedCount} levels`}
                </button>
              ) : (
                <span className="text-sm text-green-600 font-medium">{'\u2713'} Saved!</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {generated.map((l, i) => (
              <div key={l.id} className={`bg-white rounded-xl shadow-sm p-3 border-2 transition-colors ${l.approved ? 'border-green-300' : 'border-red-200 opacity-60'}`}>
                {/* Mini scene preview */}
                <div className="w-full aspect-square bg-gray-50 rounded-lg relative overflow-hidden mb-2">
                  {l.scene_data.objects.map(obj => {
                    const lib = getObjectById(obj.type);
                    return (
                      <div key={obj.id} className="absolute" style={{ left: `${obj.x}%`, top: `${obj.y}%`, transform: 'translate(-50%,-50%)' }}>
                        {lib ? lib.render(obj.color, 20) : <div style={{width:20,height:20,borderRadius:'50%',backgroundColor:obj.color}} />}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs font-semibold text-slate-700">{l.title}</p>
                <p className="text-[10px] text-slate-400">W{l.world_id}-L{l.level_number} {'\u2022'} {l.scene_data.objects.length} obj {'\u2022'} {l.scene_data.questions.length} Q {'\u2022'} {l.view_time}s</p>

                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => toggleApproval(i)} className={`flex-1 text-[10px] font-medium py-1 rounded-lg ${l.approved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {l.approved ? '\u2713 Approved' : '\u2717 Rejected'}
                  </button>
                  <Link href={`/levels/editor?world=${l.world_id}&level=${l.level_number}`} className="text-[10px] font-medium text-purple-600 border border-purple-200 rounded-lg px-2 py-1 hover:bg-purple-50">
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {generated.length === 0 && !generating && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">{'\u{1F3AD}'}</div>
          <h2 className="text-lg font-semibold text-slate-700 mb-1">Ready to generate</h2>
          <p className="text-sm text-slate-400">Choose a world and count, then click Generate to batch-create levels.</p>
        </div>
      )}
    </div>
  );
}
