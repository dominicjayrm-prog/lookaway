import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function modeIcon(m: string) { return m === 'classic' ? String.fromCodePoint(0x1F4CB) : m === 'speed' ? String.fromCodePoint(0x26A1) : String.fromCodePoint(0x1F50D); }
function statusDot(s: string) { return s === 'live' ? 'bg-green-500' : s === 'draft' ? 'bg-blue-400' : s === 'pending_review' ? 'bg-yellow-400' : 'bg-gray-300'; }
function pad(n: number) { return n.toString().padStart(2, '0'); }
function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1); const last = new Date(year, month + 1, 0);
  let startDow = first.getDay() - 1; if (startDow < 0) startDow = 6;
  const cells: (number | null)[] = []; for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null); return cells;
}

export default async function DashboardPage() {
  const today = new Date(); const year = today.getFullYear(); const month = today.getMonth();
  const todayStr = `${year}-${pad(month + 1)}-${pad(today.getDate())}`;
  const monthStart = `${year}-${pad(month + 1)}-01`;
  const monthEnd = `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`;

  const { data: challenges } = await supabase.from('daily_challenges').select('challenge_date, mode, status').gte('challenge_date', monthStart).lte('challenge_date', monthEnd).order('challenge_date');
  const { count: queuedCount } = await supabase.from('daily_challenges').select('*', { count: 'exact', head: true }).gte('challenge_date', todayStr).in('status', ['draft', 'pending_review', 'live']);
  const { count: pendingCount } = await supabase.from('daily_challenges').select('*', { count: 'exact', head: true }).eq('status', 'pending_review');

  const futureDates: string[] = []; for (let i = 0; i < 90; i++) { const d = new Date(today); d.setDate(d.getDate() + i); futureDates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`); }
  const { data: futureChallenges } = await supabase.from('daily_challenges').select('challenge_date').gte('challenge_date', todayStr);
  const filledDates = new Set((futureChallenges ?? []).map((c: any) => c.challenge_date));
  const nextEmptyDay = futureDates.find(d => !filledDates.has(d)) ?? todayStr;
  let runway = 0; for (const d of futureDates) { if (filledDates.has(d)) runway++; else break; }

  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = `${weekAgo.getFullYear()}-${pad(weekAgo.getMonth() + 1)}-${pad(weekAgo.getDate())}`;
  const { count: recentPlayers } = await supabase.from('daily_results').select('*', { count: 'exact', head: true }).gte('challenge_date', weekAgoStr);
  const avgDailyPlayers = recentPlayers ? Math.round(recentPlayers / 7) : 0;

  const todayChallenge = challenges?.find((c: any) => c.challenge_date === todayStr);
  const queuedBorder = (queuedCount ?? 0) < 7 ? 'border-l-red-500' : (queuedCount ?? 0) < 14 ? 'border-l-yellow-500' : 'border-l-green-500';

  const challengeMap = new Map<string, { mode: string; status: string }>();
  (challenges ?? []).forEach((c: any) => challengeMap.set(c.challenge_date, { mode: c.mode, status: c.status }));
  const cells = getMonthDays(year, month);
  const monthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Daily challenge pipeline overview</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-l-purple-500"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Users</p><p className="mt-2 text-3xl font-bold text-slate-900">{avgDailyPlayers}</p></div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-l-blue-500"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Daily Active</p><p className="mt-2 text-3xl font-bold text-slate-900">{avgDailyPlayers}</p></div>
        <div className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${queuedBorder}`}><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Challenges Queued</p><p className="mt-2 text-3xl font-bold text-slate-900">{queuedCount ?? 0}</p></div>
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-l-green-500"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Days of Runway</p><p className="mt-2 text-3xl font-bold text-slate-900">{runway}</p></div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {todayChallenge ? (
          <span className="inline-flex items-center gap-2 bg-green-50 text-green-700 rounded-lg px-4 py-2 text-sm font-medium">{String.fromCodePoint(0x2705)} Today's challenge is live</span>
        ) : (
          <Link href={`/challenges/builder?date=${todayStr}`} className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-700">Build today's challenge</Link>
        )}
        <Link href={`/challenges/builder?date=${nextEmptyDay}`} className="bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-600">Generate next 7 days</Link>
        <Link href="/challenges/review" className="bg-white border border-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">Review queue {pendingCount ? <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{pendingCount}</span> : null}</Link>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">{monthName}</h2>
        <div className="mt-4 grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (<div key={d} className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">{d}</div>))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} className="bg-white p-3 min-h-[72px]" />;
            const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
            const ch = challengeMap.get(dateStr);
            const isToday = dateStr === todayStr;
            const isPast = new Date(dateStr) < today;
            const isEmpty = !ch && !isPast;
            return (<Link key={dateStr} href={ch ? `/challenge/${dateStr}` : `/challenges/builder?date=${dateStr}`} className={`bg-white p-3 min-h-[72px] hover:bg-slate-50 transition-colors ${isToday ? 'ring-2 ring-inset ring-purple-500' : ''} ${isEmpty ? 'bg-red-50/50' : ''}`}><div className="flex items-center justify-between"><span className={`text-sm font-medium ${isToday ? 'text-purple-600' : 'text-slate-700'}`}>{day}</span>{ch && <span className={`inline-block w-2 h-2 rounded-full ${statusDot(ch.status)}`} />}</div>{ch && <span className="mt-1 block text-base">{modeIcon(ch.mode)}</span>}</Link>);
          })}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Live</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Pending</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Draft</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Empty</span>
        </div>
      </div>
    </div>
  );
}
