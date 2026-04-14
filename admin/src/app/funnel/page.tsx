import { getInstallToPayFunnel, getRetentionCurve } from '@/lib/analytics';
import { RetentionCurve } from './retention-curve';

export const dynamic = 'force-dynamic';

const STEP_COLORS = ['#6C5CE7', '#A29BFE', '#0984E3', '#00B894', '#D4A012', '#FD79A8'];

export default async function FunnelPage() {
  const [steps, retention] = await Promise.all([
    getInstallToPayFunnel(),
    getRetentionCurve(30),
  ]);
  const top = steps[0]?.count ?? 0;
  const d1 = retention.find((r) => r.day === 1)?.pct ?? 0;
  const d7 = retention.find((r) => r.day === 7)?.pct ?? 0;
  const d30 = retention.find((r) => r.day === 30)?.pct ?? 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Conversion funnel</h1>
      <p className="mt-1 text-sm text-slate-500">
        How players move from signup all the way to paying — each step shows the % retained vs the previous step (left) and the % retained vs the top of the funnel (right).
      </p>

      {/* The funnel itself — horizontal bars sized by overall % */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6 space-y-5">
        {steps.map((step, i) => {
          const color = STEP_COLORS[i] ?? '#6C5CE7';
          const drop = i > 0 ? steps[i - 1].count - step.count : 0;
          const dropPct = i > 0 && steps[i - 1].count > 0 ? (drop / steps[i - 1].count) * 100 : 0;

          return (
            <div key={step.label}>
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                  <span className="text-sm font-semibold text-slate-800">{step.label}</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-slate-900">{step.count.toLocaleString()}</span>
                  <span className="text-xs text-slate-500 w-16 text-right">{step.pctOverall.toFixed(1)}% overall</span>
                </div>
              </div>
              {/* Funnel bar — width = % of top step, animated tapering */}
              <div className="relative h-9 rounded-lg overflow-hidden bg-slate-50">
                <div
                  className="absolute inset-y-0 left-0 transition-all flex items-center justify-end pr-3"
                  style={{ width: `${Math.max(step.pctOverall, 1)}%`, backgroundColor: color }}
                >
                  {step.pctOverall > 15 && (
                    <span className="text-[11px] font-semibold text-white">
                      {i === 0 ? '100%' : `${step.pct.toFixed(0)}% of prev`}
                    </span>
                  )}
                </div>
                {step.pctOverall <= 15 && (
                  <span className="absolute left-3 inset-y-0 flex items-center text-[11px] font-medium text-slate-500">
                    {i === 0 ? '100%' : `${step.pct.toFixed(0)}% of prev`}
                  </span>
                )}
              </div>
              {/* Drop-off */}
              {i > 0 && drop > 0 && (
                <p className="text-[10px] text-slate-400 mt-1 ml-8">
                  Lost {drop.toLocaleString()} players ({dropPct.toFixed(0)}%) from previous step
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick wins surface */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Biggest drop-offs</h2>
          <p className="text-xs text-slate-500 mb-3">Steps where you lose the most players — these are the highest-leverage points to optimise.</p>
          <div className="space-y-2">
            {steps
              .map((s, i) => ({
                from: i > 0 ? steps[i - 1].label : null,
                to: s.label,
                lostPct: i > 0 && steps[i - 1].count > 0 ? ((steps[i - 1].count - s.count) / steps[i - 1].count) * 100 : 0,
                lostCount: i > 0 ? steps[i - 1].count - s.count : 0,
              }))
              .filter((d) => d.from)
              .sort((a, b) => b.lostCount - a.lostCount)
              .slice(0, 4)
              .map((d, i) => (
                <div key={i} className="flex items-baseline justify-between border-l-2 pl-3 py-1" style={{ borderColor: '#FF6B6B' }}>
                  <div>
                    <p className="text-xs text-slate-500">{d.from} → {d.to}</p>
                    <p className="text-sm font-semibold text-slate-800">−{d.lostCount.toLocaleString()} players</p>
                  </div>
                  <span className="text-base font-bold" style={{ color: '#FF6B6B' }}>{d.lostPct.toFixed(0)}%</span>
                </div>
              ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Funnel summary</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Signup to first level</span>
              <span className="font-semibold text-slate-800">{steps[1] && top > 0 ? `${((steps[1].count / top) * 100).toFixed(0)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">First level to engaged (5+)</span>
              <span className="font-semibold text-slate-800">
                {steps[1] && steps[2] && steps[1].count > 0 ? `${((steps[2].count / steps[1].count) * 100).toFixed(0)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Engaged to gem-spender</span>
              <span className="font-semibold text-slate-800">
                {steps[2] && steps[3] && steps[2].count > 0 ? `${((steps[3].count / steps[2].count) * 100).toFixed(0)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Gem-spender to IAP</span>
              <span className="font-semibold text-slate-800">
                {steps[3] && steps[4] && steps[3].count > 0 ? `${((steps[4].count / steps[3].count) * 100).toFixed(0)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">IAP to subscriber</span>
              <span className="font-semibold text-slate-800">
                {steps[4] && steps[5] && steps[4].count > 0 ? `${((steps[5].count / steps[4].count) * 100).toFixed(0)}%` : '—'}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <span className="text-slate-500 font-medium">Signup → IAP (overall)</span>
              <span className="font-bold text-slate-900">
                {steps[4] && top > 0 ? `${((steps[4].count / top) * 100).toFixed(2)}%` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Retention curve — companion to the funnel */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-base font-semibold text-slate-900">Retention curve</h2>
          <div className="flex gap-4 text-xs">
            <span><span className="text-slate-400">D1: </span><span className="font-bold text-slate-900">{d1.toFixed(0)}%</span></span>
            <span><span className="text-slate-400">D7: </span><span className="font-bold text-slate-900">{d7.toFixed(0)}%</span></span>
            <span><span className="text-slate-400">D30: </span><span className="font-bold text-slate-900">{d30.toFixed(0)}%</span></span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          % of players from cohorts older than 30 days who returned on each day after signup. Dashed reference lines show typical &quot;good&quot; retention benchmarks for casual mobile games.
        </p>
        <div className="h-72">
          <RetentionCurve data={retention} />
        </div>
      </div>

      {/* Methodology note */}
      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
        <strong>How we count:</strong> &quot;Signed up&quot; is any row in the <code className="text-[11px] bg-white px-1 rounded">profiles</code> table. &quot;Played a level&quot; is any user with a <code className="text-[11px] bg-white px-1 rounded">user_progress</code> row. &quot;Spent gems&quot; / &quot;Made an IAP&quot; come from <code className="text-[11px] bg-white px-1 rounded">economy_events</code>. Cosmetic spends were only logged from the latest build onwards. Retention curve uses any economy event as the &quot;active that day&quot; signal.
      </div>
    </div>
  );
}
