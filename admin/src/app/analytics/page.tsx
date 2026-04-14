import { BlinkMini } from '@/components/BlinkMini';
import {
  getActiveUsersSnapshot,
  getActivityTimeseries,
  getSignupsToday,
  getRetentionMatrix,
  getLevelFunnel,
  getMemoryScoreDistribution,
  getGemFlowTimeseries,
  getHotColdLevels,
  getStreakDistribution,
} from '@/lib/analytics';
import { ActivityChart } from './activity-chart';
import { GemFlowChart } from './gem-flow-chart';
import { MemoryScoreChart } from './memory-score-chart';
import { StreakChart } from './streak-chart';
import { FunnelChart } from './funnel-chart';

// Always fetch fresh — analytics should reflect latest events.
export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const [active, signups, activity, retention, funnel, scores, gemFlow, levels, streaks] = await Promise.all([
    getActiveUsersSnapshot(),
    getSignupsToday(),
    getActivityTimeseries(30),
    getRetentionMatrix(8),
    getLevelFunnel(),
    getMemoryScoreDistribution(),
    getGemFlowTimeseries(30),
    getHotColdLevels(10),
    getStreakDistribution(),
  ]);

  const dauDelta = active.dauPrev === 0
    ? (active.dau > 0 ? 100 : 0)
    : Math.round(((active.dau - active.dauPrev) / active.dauPrev) * 100);
  const signupsDelta = signups.yesterday === 0
    ? (signups.today > 0 ? 100 : 0)
    : Math.round(((signups.today - signups.yesterday) / signups.yesterday) * 100);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <BlinkMini size={48} />
        <div>
          <h1 className="text-3xl font-bold text-brand-text">Analytics</h1>
          <p className="text-sm text-brand-textMid">How the game is actually performing</p>
        </div>
      </div>

      {/* Hero row — 4 big number cards */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BigStatCard label="Daily Active" value={active.dau} delta={dauDelta} deltaLabel="vs yesterday" accent="brand-accent" />
        <BigStatCard label="Weekly Active" value={active.wau} accent="brand-blue" />
        <BigStatCard label="Monthly Active" value={active.mau} accent="brand-green" />
        <BigStatCard label="New Signups Today" value={signups.today} delta={signupsDelta} deltaLabel="vs yesterday" accent="brand-gold" />
      </div>

      {/* Active users line chart */}
      <SectionCard title="Active users — last 30 days" subtitle="DAU / WAU / MAU rolling activity" className="mt-8">
        <ActivityChart data={activity} />
      </SectionCard>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        {/* Retention heatmap */}
        <SectionCard title="Retention by weekly cohort" subtitle="Who comes back on day 1, 7, 30?">
          <RetentionTable rows={retention} />
        </SectionCard>

        {/* Level funnel */}
        <SectionCard title="World completion funnel" subtitle="% of players who reached each world">
          <FunnelChart data={funnel} />
        </SectionCard>
      </div>

      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        {/* Memory score distribution */}
        <SectionCard title="Memory score distribution" subtitle="Where your players cluster on the skill curve">
          <MemoryScoreChart data={scores} />
        </SectionCard>

        {/* Streak distribution */}
        <SectionCard title="Streak distribution" subtitle="How many players are on a run right now">
          <StreakChart data={streaks} />
        </SectionCard>
      </div>

      {/* Gem flow */}
      <SectionCard title="Gem flow — last 30 days" subtitle="Earned vs spent per day. Healthy economy = earn ≥ spend." className="mt-8">
        <GemFlowChart data={gemFlow} />
      </SectionCard>

      {/* Hot/cold levels */}
      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        <SectionCard title="Hardest levels" subtitle="Lowest pass rate (min 3 attempts)">
          <LevelTable rows={levels.hardest} tone="coral" />
        </SectionCard>
        <SectionCard title="Easiest levels" subtitle="Highest pass rate (min 3 attempts)">
          <LevelTable rows={levels.easiest} tone="green" />
        </SectionCard>
      </div>
    </div>
  );
}

// ─── Sub-components (server) ────────────────────────────────────────

function BigStatCard({
  label,
  value,
  delta,
  deltaLabel,
  accent,
}: {
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  accent: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="bg-brand-card rounded-brand shadow-brand-card p-6 border border-brand-border">
      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-textMid">{label}</p>
      <p className={`mt-2 text-4xl font-bold text-${accent}`}>{value.toLocaleString()}</p>
      {delta !== undefined && (
        <p className={`mt-1 text-xs font-medium ${up ? 'text-brand-green' : 'text-brand-coral'}`}>
          {up ? '▲' : '▼'} {Math.abs(delta)}% <span className="text-brand-textLight font-normal">{deltaLabel}</span>
        </p>
      )}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-brand-card rounded-brand shadow-brand-card p-6 border border-brand-border ${className ?? ''}`}>
      <h2 className="text-lg font-bold text-brand-text">{title}</h2>
      {subtitle && <p className="text-xs text-brand-textMid mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function RetentionTable({ rows }: { rows: { cohortWeek: string; size: number; d1: number; d7: number; d30: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-brand-textMid">Not enough cohort data yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-brand-textMid border-b border-brand-border">
            <th className="pb-2 pr-4 font-semibold">Cohort</th>
            <th className="pb-2 pr-4 font-semibold">Size</th>
            <th className="pb-2 pr-4 font-semibold text-center">D1</th>
            <th className="pb-2 pr-4 font-semibold text-center">D7</th>
            <th className="pb-2 font-semibold text-center">D30</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.cohortWeek} className="border-b border-brand-border/50">
              <td className="py-2 pr-4 text-brand-text font-mono text-xs">{r.cohortWeek}</td>
              <td className="py-2 pr-4 text-brand-textMid">{r.size}</td>
              <RetCell v={r.d1} />
              <RetCell v={r.d7} />
              <RetCell v={r.d30} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RetCell({ v }: { v: number }) {
  // Heatmap-style: higher retention = more saturated brand-green.
  const alpha = Math.max(0.05, Math.min(0.85, v / 100));
  return (
    <td className="py-2 pr-4 text-center">
      <span
        className="inline-block px-2 py-1 rounded text-xs font-semibold"
        style={{
          backgroundColor: `rgba(0, 184, 148, ${alpha})`,
          color: v > 40 ? '#FFFFFF' : '#1A1A18',
        }}
      >
        {v}%
      </span>
    </td>
  );
}

function LevelTable({ rows, tone }: { rows: { levelId: string; title: string | null; attempts: number; completions: number; passRate: number }[]; tone: 'coral' | 'green' }) {
  if (rows.length === 0) return <p className="text-sm text-brand-textMid">No level data yet.</p>;
  const pctClass = tone === 'coral' ? 'text-brand-coral' : 'text-brand-green';
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-brand-textMid border-b border-brand-border">
            <th className="pb-2 pr-3 font-semibold">Level</th>
            <th className="pb-2 pr-3 font-semibold text-right">Attempts</th>
            <th className="pb-2 font-semibold text-right">Pass rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.levelId} className="border-b border-brand-border/50">
              <td className="py-2 pr-3">
                <div className="text-brand-text">{r.title ?? r.levelId}</div>
                <div className="text-[10px] font-mono text-brand-textLight">{r.levelId}</div>
              </td>
              <td className="py-2 pr-3 text-right text-brand-textMid">{r.attempts}</td>
              <td className={`py-2 text-right font-semibold ${pctClass}`}>{r.passRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
