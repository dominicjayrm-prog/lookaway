'use client';
import { useMemo, useState } from 'react';
import type { UserRow } from './page';

type SortKey = 'displayName' | 'stars' | 'gems' | 'streak' | 'completions' | 'joinedRaw';
type SortDir = 'asc' | 'desc';

export function UsersTable({ rows }: { rows: UserRow[] }) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('joinedRaw');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? rows.filter((r) => r.displayName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
      : rows;
    const sorted = [...base].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return sorted;
  }, [rows, query, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'displayName' ? 'asc' : 'desc'); }
  };

  const handleExport = () => {
    const headers = ['id', 'display_name', 'joined', 'total_stars', 'gems', 'streak', 'completions', 'last_active'];
    const lines = [headers.join(',')];
    for (const r of filtered) {
      const cells = [
        r.id,
        csvSafe(r.displayName),
        r.joinedRaw ?? '',
        String(r.stars),
        String(r.gems),
        String(r.streak),
        String(r.completions),
        r.lastActive ?? '',
      ];
      lines.push(cells.join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blanked-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-8 bg-brand-card rounded-brand shadow-brand-card border border-brand-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 border-b border-brand-border">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or ID…"
          className="w-full sm:w-80 px-3 py-2 text-sm rounded-lg border border-brand-border bg-brand-bg focus:outline-none focus:border-brand-accent"
        />
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-textMid">{filtered.length} of {rows.length} players</span>
          <button
            onClick={handleExport}
            className="px-3 py-2 text-xs font-semibold rounded-lg bg-brand-accent text-white hover:opacity-90 transition-opacity"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-surface/60">
              <Th label="User" onClick={() => handleSort('displayName')} active={sortKey === 'displayName'} dir={sortDir} />
              <Th label="ID" />
              <Th label="Joined" onClick={() => handleSort('joinedRaw')} active={sortKey === 'joinedRaw'} dir={sortDir} />
              <Th label="Stars" onClick={() => handleSort('stars')} active={sortKey === 'stars'} dir={sortDir} align="right" />
              <Th label="Gems" onClick={() => handleSort('gems')} active={sortKey === 'gems'} dir={sortDir} align="right" />
              <Th label="Streak" onClick={() => handleSort('streak')} active={sortKey === 'streak'} dir={sortDir} align="right" />
              <Th label="Plays" onClick={() => handleSort('completions')} active={sortKey === 'completions'} dir={sortDir} align="right" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-brand-textMid">No users match.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-brand-border/60 hover:bg-brand-surface/40">
                  <td className="px-6 py-3 font-medium text-brand-text">{r.displayName}</td>
                  <td className="px-6 py-3 text-brand-textLight font-mono text-xs">{r.id.slice(0, 8)}…</td>
                  <td className="px-6 py-3 text-brand-textMid">{r.joined}</td>
                  <td className="px-6 py-3 text-right font-semibold text-brand-gold">{r.stars}</td>
                  <td className="px-6 py-3 text-right font-semibold text-brand-accent">{r.gems.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right font-semibold text-brand-coral">{r.streak}</td>
                  <td className="px-6 py-3 text-right text-brand-text">{r.completions}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ label, onClick, active, dir, align = 'left' }: { label: string; onClick?: () => void; active?: boolean; dir?: SortDir; align?: 'left' | 'right' }) {
  const arrow = active ? (dir === 'asc' ? '▲' : '▼') : '';
  const alignClass = align === 'right' ? 'text-right' : 'text-left';
  return (
    <th className={`px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-brand-textMid ${alignClass}`}>
      {onClick ? (
        <button onClick={onClick} className={`inline-flex items-center gap-1 hover:text-brand-text transition-colors ${active ? 'text-brand-text' : ''}`}>
          {label} <span className="text-[8px] opacity-60">{arrow}</span>
        </button>
      ) : (
        label
      )}
    </th>
  );
}

function csvSafe(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
