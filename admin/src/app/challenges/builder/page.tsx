'use client';
import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import SceneCanvas from '@/components/SceneCanvas';
import type { Scene } from '@/lib/types';

type Mode = 'classic' | 'speed' | 'spot_the_change';
type Diff = 'easy' | 'medium' | 'hard';

const WEEKDAY_MODES: Record<number, Mode> = { 0:'classic', 1:'classic', 2:'speed', 3:'classic', 4:'spot_the_change', 5:'classic', 6:'speed' };
function getModeForDate(d: string): Mode { return WEEKDAY_MODES[new Date(d+'T00:00:00Z').getUTCDay()] ?? 'classic'; }
function tomorrow(): string { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; }
const ML: Record<Mode,string> = { classic:'Classic', speed:'Speed Round', spot_the_change:'Spot The Change' };

export default function BuilderPage() {
  const params = useSearchParams();
  const [date, setDate] = useState(params.get('date') ?? tomorrow());
  const [mode, setMode] = useState<Mode>(getModeForDate(date));
  const [diff, setDiff] = useState<Diff>('medium');
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [challenge, setChallenge] = useState<any>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [activeScene, setActiveScene] = useState(0);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);

  const handleDateChange = useCallback((newDate: string) => { setDate(newDate); setMode(getModeForDate(newDate)); setChallenge(null); setScenes([]); }, []);

  const generate = useCallback(async () => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch('/api/generate', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ date, mode, difficulty: diff }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setChallenge(data.challenge ?? data);
      const sd = data.challenge?.scene_data ?? data.scene_data ?? data;
      setScenes(sd.scenes ?? []);
      setActiveScene(0);
      setSuccess('Challenge generated!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, [date, mode, diff]);

  const approve = useCallback(async (status: 'live'|'draft') => {
    setApproving(true); setError(null);
    try {
      const res = await fetch('/api/approve', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ dates: [date], status }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setSuccess(status === 'live' ? 'Published!' : 'Saved as draft');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) { setError(e.message); } finally { setApproving(false); }
  }, [date]);

  const scene = scenes[activeScene];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Challenge Builder</h1>
      <p className="mt-1 text-sm text-slate-500">Create and preview daily challenges</p>

      {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">{success}</div>}

      <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input type="date" value={date} onChange={e => handleDateChange(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Mode</label><select value={mode} onChange={e => setMode(e.target.value as Mode)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">{Object.entries(ML).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label><div className="flex gap-1">{(['easy','medium','hard'] as Diff[]).map(d => (<button key={d} onClick={() => setDiff(d)} className={`px-3 py-2 text-sm rounded-lg font-medium ${diff === d ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{d[0].toUpperCase()+d.slice(1)}</button>))}</div></div>
          <button onClick={generate} disabled={loading} className="bg-purple-600 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50">{loading ? 'Generating...' : 'Auto-generate'}</button>
        </div>
      </div>

      {scenes.length > 0 && (
        <>
          <div className="mt-6 flex gap-2">
            {scenes.map((_, i) => (<button key={i} onClick={() => setActiveScene(i)} className={`px-4 py-2 text-sm rounded-lg font-medium ${i === activeScene ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Scene {i+1}</button>))}
          </div>

          {scene && (
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-semibold text-slate-500 mb-3">SCENE PREVIEW</h3>
                <SceneCanvas objects={scene.objects} width={400} height={400} showGrid />
                <p className="mt-2 text-xs text-slate-400">View time: {scene.viewTime}s | {scene.objects.length} objects</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-semibold text-slate-500 mb-3">QUESTIONS ({scene.questions?.length ?? 0})</h3>
                <div className="space-y-4">
                  {(scene.questions ?? []).map((q: any, qi: number) => (
                    <div key={qi} className="border border-gray-100 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">{qi+1}</span><span className="text-xs font-medium text-slate-400 uppercase">{q.category}</span></div>
                      <p className="text-sm font-medium text-slate-900">{q.text}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {q.options.map((opt: string, oi: number) => (<div key={oi} className={`px-3 py-2 text-sm rounded-lg ${oi === q.correctIndex ? 'bg-green-50 text-green-700 border border-green-200 font-medium' : 'bg-gray-50 text-gray-600'}`}>{opt}</div>))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button onClick={() => approve('live')} disabled={approving} className="bg-green-600 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50">{approving ? 'Publishing...' : 'Approve & Publish'}</button>
            <button onClick={() => approve('draft')} disabled={approving} className="bg-white border border-gray-200 text-gray-700 rounded-lg px-6 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">Save as Draft</button>
            <button onClick={generate} disabled={loading} className="bg-orange-500 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-50">Regenerate</button>
          </div>
        </>
      )}
    </div>
  );
}
