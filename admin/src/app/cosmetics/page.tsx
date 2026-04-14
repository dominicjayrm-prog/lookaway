import { supabase } from '@/lib/supabase';
import { ALL_COSMETICS, type CosmeticMeta, type Rarity } from '@/data/cosmetics';

export const dynamic = 'force-dynamic';

const RARITY_COLORS: Record<Rarity, { bg: string; text: string; ring: string }> = {
  common: { bg: '#F3F4F6', text: '#6B7280', ring: '#D1D5DB' },
  rare: { bg: '#DBEAFE', text: '#1D4ED8', ring: '#3B82F6' },
  epic: { bg: '#EDE9FE', text: '#6D28D9', ring: '#8B5CF6' },
  legendary: { bg: '#FEF3C7', text: '#92400E', ring: '#D4A012' },
};

const TYPE_LABELS = { frame: 'Frames', banner: 'Banners', expression: 'Expressions', name_color: 'Name Colours' };
const TYPE_ICONS = { frame: '\u{1F5BC}\uFE0F', banner: '\u{1F3F3}\uFE0F', expression: '\u{1F60A}', name_color: '\u{1F58D}\uFE0F' };

export default async function CosmeticsPage() {
  // Pull every player's owned + equipped cosmetic state
  const { data: profiles } = await supabase
    .from('profiles')
    .select('owned_cosmetics, equipped_frame, equipped_banner, equipped_expression, equipped_name_color, subscription_status');

  const players = profiles ?? [];
  const totalPlayers = players.length;
  const subscribers = players.filter((p: any) => p.subscription_status === 'active').length;

  // Aggregate ownership (count of players who own each cosmetic)
  const ownedCount: Record<string, number> = {};
  const equippedCount: Record<string, number> = {};
  for (const p of players) {
    for (const id of (p.owned_cosmetics ?? []) as string[]) {
      ownedCount[id] = (ownedCount[id] || 0) + 1;
    }
    if (p.equipped_frame) equippedCount[p.equipped_frame] = (equippedCount[p.equipped_frame] || 0) + 1;
    if (p.equipped_banner) equippedCount[p.equipped_banner] = (equippedCount[p.equipped_banner] || 0) + 1;
    if (p.equipped_expression) equippedCount[p.equipped_expression] = (equippedCount[p.equipped_expression] || 0) + 1;
    if (p.equipped_name_color) equippedCount[p.equipped_name_color] = (equippedCount[p.equipped_name_color] || 0) + 1;
  }

  // Collection stats
  const totalCatalog = ALL_COSMETICS.length;
  const totalUniqueOwned = Object.keys(ownedCount).length;
  const totalOwnerships = Object.values(ownedCount).reduce((s, n) => s + n, 0);
  const avgPerPlayer = totalPlayers > 0 ? totalOwnerships / totalPlayers : 0;

  // Top owned + equipped
  const sortedByOwned = [...ALL_COSMETICS]
    .map(c => ({ ...c, owned: ownedCount[c.id] || 0, equipped: equippedCount[c.id] || 0 }))
    .sort((a, b) => b.owned - a.owned);

  const top10Owned = sortedByOwned.slice(0, 10);
  const top10Equipped = [...sortedByOwned].sort((a, b) => b.equipped - a.equipped).slice(0, 10);
  // Items nobody owns yet — discover unloved cosmetics
  const unloved = sortedByOwned.filter(c => c.owned === 0 && c.unlock !== 'subscriber').slice(0, 10);

  // Group by type for the catalog
  const byType: Record<string, typeof sortedByOwned> = { frame: [], banner: [], expression: [], name_color: [] };
  for (const c of sortedByOwned) byType[c.type].push(c);

  // Group by rarity
  const rarityStats: Record<Rarity, { catalog: number; owned: number; ownerships: number }> = {
    common: { catalog: 0, owned: 0, ownerships: 0 },
    rare: { catalog: 0, owned: 0, ownerships: 0 },
    epic: { catalog: 0, owned: 0, ownerships: 0 },
    legendary: { catalog: 0, owned: 0, ownerships: 0 },
  };
  for (const c of sortedByOwned) {
    rarityStats[c.rarity].catalog++;
    if (c.owned > 0) rarityStats[c.rarity].owned++;
    rarityStats[c.rarity].ownerships += c.owned;
  }

  // Group by unlock method
  const unlockStats: Record<string, { catalog: number; ownerships: number }> = {};
  for (const c of sortedByOwned) {
    if (!unlockStats[c.unlock]) unlockStats[c.unlock] = { catalog: 0, ownerships: 0 };
    unlockStats[c.unlock].catalog++;
    unlockStats[c.unlock].ownerships += c.owned;
  }

  const statCard = (label: string, value: string | number, color: string, sub?: string) => (
    <div className="bg-white rounded-xl shadow-sm p-5 border-l-4" style={{ borderLeftColor: color }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Cosmetics</h1>
      <p className="mt-1 text-sm text-slate-500">Ownership, popularity and collection stats across all {totalPlayers.toLocaleString()} players</p>

      {/* Hero row */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCard('Total catalog items', totalCatalog, '#6C5CE7')}
        {statCard('Unique items owned', totalUniqueOwned, '#00B894', `${Math.round((totalUniqueOwned / totalCatalog) * 100)}% of catalog`)}
        {statCard('Total ownerships', totalOwnerships, '#0984E3', `Across ${totalPlayers.toLocaleString()} players`)}
        {statCard('Avg per player', avgPerPlayer.toFixed(1), '#D4A012', `${subscribers} subscribers`)}
      </div>

      {/* Rarity breakdown */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">By rarity</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(Object.entries(rarityStats) as [Rarity, typeof rarityStats.common][]).map(([r, s]) => (
            <div key={r} className="rounded-lg p-3 border" style={{ backgroundColor: RARITY_COLORS[r].bg, borderColor: RARITY_COLORS[r].ring }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: RARITY_COLORS[r].text }}>{r}</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{s.ownerships.toLocaleString()}</p>
              <p className="text-[11px] text-slate-600">{s.owned}/{s.catalog} items in circulation</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top 10 by ownership + equipped, side by side */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Most owned</h2>
          <div className="space-y-1.5">
            {top10Owned.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 py-1">
                <span className="text-xs text-slate-400 w-6 text-right">{i + 1}.</span>
                <span className="text-base">{TYPE_ICONS[c.type as keyof typeof TYPE_ICONS]}</span>
                <span className="flex-1 text-sm text-slate-700 font-medium truncate">{c.name}</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: RARITY_COLORS[c.rarity].bg, color: RARITY_COLORS[c.rarity].text }}>{c.rarity}</span>
                <span className="text-sm font-bold text-slate-900 w-12 text-right">{c.owned}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Most equipped right now</h2>
          <div className="space-y-1.5">
            {top10Equipped.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 py-1">
                <span className="text-xs text-slate-400 w-6 text-right">{i + 1}.</span>
                <span className="text-base">{TYPE_ICONS[c.type as keyof typeof TYPE_ICONS]}</span>
                <span className="flex-1 text-sm text-slate-700 font-medium truncate">{c.name}</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: RARITY_COLORS[c.rarity].bg, color: RARITY_COLORS[c.rarity].text }}>{c.rarity}</span>
                <span className="text-sm font-bold text-slate-900 w-12 text-right">{c.equipped}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Unloved cosmetics — items that exist but nobody has bought yet */}
      {unloved.length > 0 && (
        <div className="mt-4 bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Nobody owns these yet</h2>
          <p className="text-xs text-slate-500 mb-3">Cosmetics in the catalog with zero ownership — candidates for repricing or promotion</p>
          <div className="flex flex-wrap gap-2">
            {unloved.map(c => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ borderColor: RARITY_COLORS[c.rarity].ring, backgroundColor: RARITY_COLORS[c.rarity].bg }}>
                <span>{TYPE_ICONS[c.type as keyof typeof TYPE_ICONS]}</span>
                <span className="text-sm font-medium" style={{ color: RARITY_COLORS[c.rarity].text }}>{c.name}</span>
                {c.gemCost && <span className="text-[11px] font-semibold text-slate-500">{c.gemCost} gems</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unlock method breakdown */}
      <div className="mt-4 bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-3">By unlock method</h2>
        <div className="space-y-2">
          {Object.entries(unlockStats).sort((a, b) => b[1].ownerships - a[1].ownerships).map(([method, s]) => {
            const maxOwn = Math.max(...Object.values(unlockStats).map(x => x.ownerships), 1);
            return (
              <div key={method} className="flex items-center gap-3">
                <span className="text-xs text-slate-600 w-24 font-medium capitalize">{method}</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400 rounded-full" style={{ width: `${(s.ownerships / maxOwn) * 100}%` }} />
                </div>
                <span className="text-[11px] text-slate-500 w-32 text-right">{s.ownerships.toLocaleString()} owned ({s.catalog} items)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full catalog grouped by type */}
      <div className="mt-4 grid grid-cols-1 gap-4">
        {(Object.keys(byType) as (keyof typeof byType)[]).map(type => (
          <div key={type} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900">{TYPE_ICONS[type as keyof typeof TYPE_ICONS]} {TYPE_LABELS[type as keyof typeof TYPE_LABELS]}</h2>
              <span className="text-xs text-slate-400">{byType[type].length} items</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="text-left py-2">Item</th>
                    <th className="text-left py-2">Rarity</th>
                    <th className="text-left py-2">Unlock</th>
                    <th className="text-right py-2">Cost</th>
                    <th className="text-right py-2">Owned</th>
                    <th className="text-right py-2">Equipped</th>
                  </tr>
                </thead>
                <tbody>
                  {byType[type].map(c => (
                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-800">{c.name}</td>
                      <td className="py-2">
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: RARITY_COLORS[c.rarity].bg, color: RARITY_COLORS[c.rarity].text }}>{c.rarity}</span>
                      </td>
                      <td className="py-2 text-slate-600 capitalize">{c.unlock}{c.subscriberOnly ? ' (sub)' : ''}</td>
                      <td className="py-2 text-right text-slate-600">{c.gemCost ? `${c.gemCost}\u{1F48E}` : '—'}</td>
                      <td className="py-2 text-right font-semibold text-slate-900">{c.owned}</td>
                      <td className="py-2 text-right text-slate-600">{c.equipped}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
