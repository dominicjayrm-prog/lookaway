import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function modeIcon(mode: string) { return mode === 'classic' ? '\u{1F4CB}' : mode === 'speed' ? '\u26A1' : '\u{1F50D}'; }
function statusDot(status: string) { return status === 'live' ? 'bg-green-500' : status === 'draft' ? 'bg-blue-400' : status === 'pending_review' ? 'bg-yellow-400' : 'bg-gray-300'; }
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

  const futureDates: string[] = []; for (let i = 0; i < 90; i++) { const d = new Date(today); d.setDate(d.getDate() + i); futureDates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`); }
  const { data: futureChallenges } = await supabase.from('daily_challenges').select('challenge_date').gte('challenge_date', todayStr);
  const filledDates = new Set((futureChallenges ?? []).map((c: any) => c.challenge_date));
  const nextEmptyDay = futureDates.find((d) => !filledDates.has(d)) ?? 'N/A';
  let runway = 0; for (const d of futureDates) { if (filledDates.has(d)) runway++; else break; }

  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = `${weekAgo.getFullYear()}-${pad(weekAgo.getMonth() + 1)}-${pad(weekAgo.getDate())}`;
  const { count: recentResults } = await supabase.from('daily_results').select('*', { count: 'exact', head: true }).gte('challenge_date', weekAgoStr).lte('challenge_date', todayStr);
  const avgDailyPlayers = recentResults ? Math.round(recentResults / 7) : 0;

  const challengeMap = new Map<string, { mode: string; status: string }>();
  (challenges ?? []).forEach((c: any) => { challengeMap.set(c.challenge_date, { mode: c.mode, status: c.status }); });
  const cells = getMonthDays(year, month);
  const monthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Daily challenge pipeline overview</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Challenges Queued</p><p className="mt-2 text-3xl font-bold text-slate-900">{queuedCount ?? 0}</p></div>
        <div className="bg-white rounded-xl shadow-sm p-6"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Next Empty Day</p><p className="mt-2 text-lg font-bold text-slate-900">{nextEmptyDay}</p></div>
        <div className="bg-white rounded-xl shadow-sm p-6"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Days of Runway</p><p className="mt-2 text-3xl font-bold text-slate-900">{runway}</p></div>
        <div className="bg-white rounded-xl shadow-sm p-6"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Daily Players</p><p className="mt-2 text-3xl font-bold text-slate-900">{avgDailyPlayers}</p></div>
      </div>
      <div className="mt-6 flex items-center gap-4"><Link href={`/create?date=${nextEmptyDay}`} className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-700 transition-colors">Generate next 7 days</Link></div>
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">{monthName}</h2>
        <div className="mt-4 grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => (<div key={day} className="bg-slate-50 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">{day}</div>))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} className="bg-white p-3 min-h-[72px]" />;
            const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
            const ch = challengeMap.get(dateStr);
            const isToday = dateStr === todayStr;
            return (<Link key={dateStr} href={ch ? `/challenge/${dateStr}` : `/create?date=${dateStr}`} className={`bg-white p-3 min-h-[72px] hover:bg-slate-50 transition-colors ${isToday ? 'ring-2 ring-inset ring-purple-500' : ''}`}><div className="flex items-center justify-between"><span className={`text-sm font-medium ${isToday ? 'text-purple-600' : 'text-slate-700'}`}>{day}</span>{ch && <span className={`inline-block w-2 h-2 rounded-full ${statusDot(ch.status)}`} />}</div>{ch && <span className="mt-1 block text-base">{modeIcon(ch.mode)}</span>}</Link>);
          })}
        </div>
      </div>
    </div>
  );
}
