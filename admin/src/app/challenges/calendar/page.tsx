import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function pad(n: number) { return n.toString().padStart(2, '0'); }
function modeIcon(m: string) { return m === 'classic' ? '\u{1F4CB}' : m === 'speed' ? '\u26A1' : '\u{1F50D}'; }
function statusColor(s: string) { return s === 'live' ? 'bg-green-500' : s === 'draft' ? 'bg-blue-400' : s === 'pending_review' ? 'bg-yellow-400' : 'bg-gray-300'; }
function statusLabel(s: string) { return s === 'live' ? 'Live' : s === 'draft' ? 'Draft' : s === 'pending_review' ? 'Review' : s; }

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  let startDow = first.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getMonthName(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

interface ChallengeInfo { mode: string; status: string; difficulty?: string; }

function MonthGrid({ year, month, challengeMap, todayStr }: { year: number; month: number; challengeMap: Map<string, ChallengeInfo>; todayStr: string }) {
  const cells = getMonthDays(year, month);
  const monthName = getMonthName(year, month);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-base font-semibold text-slate-900">{monthName}</h3>
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-100">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="bg-gray-50 px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="bg-white min-h-[68px]" />;
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const ch = challengeMap.get(dateStr);
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const isFutureMissing = !ch && !isPast;

          return (
            <Link
              key={dateStr}
              href={ch ? `/challenge/${dateStr}` : `/challenges/builder?date=${dateStr}`}
              className={`bg-white p-1.5 min-h-[68px] hover:bg-slate-50 transition-colors relative group ${isToday ? 'ring-2 ring-inset ring-purple-500' : ''} ${isFutureMissing ? 'bg-red-50/40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isToday ? 'text-purple-600 font-bold' : isPast && !ch ? 'text-slate-300' : 'text-slate-600'}`}>{day}</span>
                {ch && <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusColor(ch.status)}`} />}
              </div>
              {ch && (
                <div className="mt-1">
                  <span className="text-xs leading-none">{modeIcon(ch.mode)}</span>
                  <span className={`ml-1 text-[9px] font-medium px-1 py-0.5 rounded ${
                    ch.status === 'live' ? 'bg-green-50 text-green-700' :
                    ch.status === 'draft' ? 'bg-blue-50 text-blue-600' :
                    ch.status === 'pending_review' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-gray-50 text-gray-500'
                  }`}>{statusLabel(ch.status)}</span>
                </div>
              )}
              {isFutureMissing && (
                <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] text-purple-500 font-medium">+ Create</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function CalendarPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // 3 months: current, next, month after
  const months: { year: number; month: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  const startDate = `${months[0].year}-${pad(months[0].month + 1)}-01`;
  const lastMonth = months[2];
  const lastDay = new Date(lastMonth.year, lastMonth.month + 1, 0).getDate();
  const endDate = `${lastMonth.year}-${pad(lastMonth.month + 1)}-${pad(lastDay)}`;

  const { data: challenges } = await supabase
    .from('daily_challenges')
    .select('challenge_date, mode, status, difficulty')
    .gte('challenge_date', startDate)
    .lte('challenge_date', endDate)
    .order('challenge_date');

  const challengeMap = new Map<string, ChallengeInfo>();
  (challenges ?? []).forEach((c: any) => challengeMap.set(c.challenge_date, {
    mode: c.mode, status: c.status, difficulty: c.difficulty
  }));

  // Stats
  const totalDays = months.reduce((sum, m) => sum + new Date(m.year, m.month + 1, 0).getDate(), 0);
  const filledCount = challenges?.length ?? 0;
  const liveCount = challenges?.filter((c: any) => c.status === 'live').length ?? 0;
  const draftCount = challenges?.filter((c: any) => c.status === 'draft').length ?? 0;
  const reviewCount = challenges?.filter((c: any) => c.status === 'pending_review').length ?? 0;

  // Runway: consecutive days from today with a challenge
  let runway = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (challengeMap.has(ds)) runway++;
    else break;
  }

  // Next empty day
  let nextEmpty = '';
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    if (!challengeMap.has(ds)) { nextEmpty = ds; break; }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Challenge Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">3-month overview — {months.map(m => getMonthName(m.year, m.month).split(' ')[0]).join(', ')}</p>
        </div>
        <div className="flex gap-2">
          {nextEmpty && (
            <Link href={`/challenges/builder?date=${nextEmpty}`} className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-700">
              Fill next gap
            </Link>
          )}
          <Link href="/challenges/review" className="bg-white border border-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Review queue {reviewCount > 0 && <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">{reviewCount}</span>}
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-l-green-500">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Live</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{liveCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-l-yellow-400">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pending Review</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{reviewCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-l-blue-400">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Drafts</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{draftCount}</p>
        </div>
        <div className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${runway >= 14 ? 'border-l-green-500' : runway >= 7 ? 'border-l-yellow-400' : 'border-l-red-500'}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Runway</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{runway} days</p>
        </div>
      </div>

      {/* Coverage bar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-500">Coverage</span>
          <span className="text-xs text-slate-400">{filledCount} / {totalDays} days filled ({Math.round(filledCount / totalDays * 100)}%)</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${Math.round(filledCount / totalDays * 100)}%` }} />
        </div>
      </div>

      {/* 3-month grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {months.map(m => (
          <MonthGrid key={`${m.year}-${m.month}`} year={m.year} month={m.month} challengeMap={challengeMap} todayStr={todayStr} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-5 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Live</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Pending review</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> Draft</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-50 border border-red-200" /> Missing</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded ring-2 ring-purple-500 ring-inset" /> Today</span>
      </div>
    </div>
  );
}
