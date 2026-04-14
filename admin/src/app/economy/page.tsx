import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function pad(n: number) { return n.toString().padStart(2, '0'); }

export default async function EconomyPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = `${weekAgo.getFullYear()}-${pad(weekAgo.getMonth() + 1)}-${pad(weekAgo.getDate())}`;

  // Fetch aggregate stats
  const { data: allEvents } = await supabase.from('economy_events').select('event_type, amount, created_at, details');
  const events = (allEvents ?? []).filter((e: any) => e.details?.reason !== 'starting_gems'); // Exclude starting gems spam

  // Get actual gem balance from player profiles (ground truth)
  const { data: profiles } = await supabase.from('profiles').select('gems');
  const actualGemsInCirculation = (profiles ?? []).reduce((s, p) => s + (p.gems ?? 0), 0);

  const todayEvents = events.filter(e => e.created_at?.startsWith(todayStr));
  const earnTypes = ['gem_earn_level', 'gem_earn_daily', 'gem_earn_streak', 'gem_earn_ad', 'iap_gems'];
  const spendTypes = ['gem_spend_powerup', 'gem_spend_lives', 'gem_spend_cosmetic'];

  const totalEarned = events.filter(e => earnTypes.includes(e.event_type)).reduce((s, e) => s + (e.amount ?? 0), 0);
  const totalSpent = events.filter(e => spendTypes.includes(e.event_type)).reduce((s, e) => s + Math.abs(e.amount ?? 0), 0);
  const netCirculation = totalEarned - totalSpent;

  const todayEarned = todayEvents.filter(e => earnTypes.includes(e.event_type)).reduce((s, e) => s + (e.amount ?? 0), 0);
  const todaySpent = todayEvents.filter(e => spendTypes.includes(e.event_type)).reduce((s, e) => s + Math.abs(e.amount ?? 0), 0);
  const todayNet = todayEarned - todaySpent;

  const livesLost = events.filter(e => e.event_type === 'life_lost').length;
  const powerUpsUsed = events.filter(e => e.event_type === 'powerup_used').length;
  const powerUpsBought = events.filter(e => e.event_type === 'gem_spend_powerup').length;

  // Power-up breakdown
  const puBreakdown: Record<string, number> = {};
  events.filter(e => e.event_type === 'powerup_used' || e.event_type === 'gem_spend_powerup').forEach(e => {
    const pu = (e as any).details?.powerUp ?? 'unknown';
    puBreakdown[pu] = (puBreakdown[pu] || 0) + 1;
  });

  // Weekly earn/spend
  const weekEvents = events.filter(e => e.created_at >= weekAgoStr);
  const dailyFlow: Record<string, { earned: number; spent: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    dailyFlow[ds] = { earned: 0, spent: 0 };
  }
  weekEvents.forEach(e => {
    const day = e.created_at?.split('T')[0];
    if (day && dailyFlow[day]) {
      if (earnTypes.includes(e.event_type)) dailyFlow[day].earned += (e.amount ?? 0);
      if (spendTypes.includes(e.event_type)) dailyFlow[day].spent += Math.abs(e.amount ?? 0);
    }
  });

  const statCard = (label: string, value: string | number, color: string) => (
    <div className={`bg-white rounded-xl shadow-sm p-5 border-l-4`} style={{ borderLeftColor: color }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Economy</h1>
      <p className="mt-1 text-sm text-slate-500">Gem flow, lives, power-ups, and monetisation tracking</p>

      {/* Top stat cards */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCard('Total gems in circulation', actualGemsInCirculation, '#6C5CE7')}
        {statCard('Gems earned today', todayEarned, '#00B894')}
        {statCard('Gems spent today', todaySpent, '#FF6B6B')}
        {statCard('Net flow today', todayNet >= 0 ? `+${todayNet}` : `${todayNet}`, todayNet >= 0 ? '#F9A825' : '#00B894')}
      </div>

      {/* Activity stats */}
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCard('Lives lost (all time)', livesLost, '#E17055')}
        {statCard('Power-ups used', powerUpsUsed, '#0984E3')}
        {statCard('Power-ups bought', powerUpsBought, '#6C5CE7')}
        {statCard('Total events', events.length, '#636E72')}
      </div>

      {/* Weekly gem flow */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Gem flow — Last 7 days</h2>
        {Object.keys(dailyFlow).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(dailyFlow).map(([day, { earned, spent }]) => {
              const maxVal = Math.max(...Object.values(dailyFlow).map(d => Math.max(d.earned, d.spent)), 1);
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-20 shrink-0">{day.slice(5)}</span>
                  <div className="flex-1 flex gap-1">
                    <div className="h-5 rounded bg-green-400" style={{ width: `${Math.max((earned / maxVal) * 100, 0)}%`, minWidth: earned > 0 ? 4 : 0 }} />
                    <div className="h-5 rounded bg-red-400" style={{ width: `${Math.max((spent / maxVal) * 100, 0)}%`, minWidth: spent > 0 ? 4 : 0 }} />
                  </div>
                  <span className="text-[10px] text-slate-400 w-16 text-right">+{earned} / -{spent}</span>
                </div>
              );
            })}
            <div className="flex gap-4 text-xs text-slate-400 mt-2">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-400" /> Earned</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400" /> Spent</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No events yet. Economy data will appear as players earn and spend gems.</p>
        )}
      </div>

      {/* Power-up popularity */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Power-up popularity</h2>
          {Object.keys(puBreakdown).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(puBreakdown).sort((a, b) => b[1] - a[1]).map(([pu, count]) => {
                const maxPu = Math.max(...Object.values(puBreakdown), 1);
                return (
                  <div key={pu} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 w-24 font-medium capitalize">{pu}</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(count / maxPu) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No power-up data yet.</p>
          )}
        </div>

        {/* Economy reference */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Economy reference</h2>
          <div className="space-y-3 text-xs">
            <div>
              <p className="font-semibold text-slate-600 mb-1">Gem earnings</p>
              <p className="text-slate-400">1/2/3 per level (1/2/3 stars)</p>
              <p className="text-slate-400">Streak: 5/15/30/50/100/200 gems at 3/7/14/30/60/100 days</p>
            </div>
            <div>
              <p className="font-semibold text-slate-600 mb-1">Power-up costs</p>
              <p className="text-slate-400">50/50: 25 | Slow Time: 30 | Peek: 40 | Skip: 50</p>
            </div>
            <div>
              <p className="font-semibold text-slate-600 mb-1">Lives</p>
              <p className="text-slate-400">80 gems or {'\u00A3'}0.99 refill | {'\u00A3'}1.99/hr unlimited</p>
            </div>
            <div>
              <p className="font-semibold text-slate-600 mb-1">Starting gems</p>
              <p className="text-slate-400">50 gems for new players</p>
            </div>
            <div>
              <p className="font-semibold text-slate-600 mb-1">Gem packs (IAP)</p>
              <p className="text-slate-400">100/{'\u00A3'}0.99 | 500/{'\u00A3'}3.99 | 1,200/{'\u00A3'}7.99</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
