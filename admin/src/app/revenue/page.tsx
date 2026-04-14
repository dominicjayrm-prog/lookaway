import { getRevenueSnapshot, getRevenueByProduct, getRevenueTimeseries } from '@/lib/analytics';
import { RevenueChart } from './revenue-chart';

export const dynamic = 'force-dynamic';

const fmtUSD = (n: number) => `$${n.toFixed(2)}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;

export default async function RevenuePage() {
  const [snapshot, byProduct, timeseries] = await Promise.all([
    getRevenueSnapshot(),
    getRevenueByProduct(),
    getRevenueTimeseries(30),
  ]);

  const statCard = (label: string, value: string, sub: string, color: string) => (
    <div className="bg-white rounded-xl shadow-sm p-5 border-l-4" style={{ borderLeftColor: color }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Revenue</h1>
      <p className="mt-1 text-sm text-slate-500">
        IAP revenue tracked from <code className="text-[11px] bg-slate-100 px-1 rounded">economy_events</code> rows where event_type starts with <code className="text-[11px] bg-slate-100 px-1 rounded">iap_</code>. Prices fall back to a hardcoded book where details.usdAmount is missing.
      </p>

      {/* Hero — total $ + key ratios */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCard('Revenue (all-time)', fmtUSD(snapshot.totalRevenue), `${snapshot.totalPayingUsers} paying players`, '#00B894')}
        {statCard('Today', fmtUSD(snapshot.todayRevenue), `${snapshot.payingUsers30d} paid in last 30d`, '#6C5CE7')}
        {statCard('Last 30 days', fmtUSD(snapshot.monthRevenue), 'Past 30d revenue', '#0984E3')}
        {statCard('ARPDAU', fmtUSD(snapshot.arpdau), 'Avg revenue per daily active user', '#D4A012')}
      </div>

      {/* Per-user economics */}
      <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCard('ARPU', fmtUSD(snapshot.arpu), 'Avg revenue per user (all)', '#A29BFE')}
        {statCard('ARPPU', fmtUSD(snapshot.arppu), 'Avg revenue per paying user', '#FD79A8')}
        {statCard('Conversion rate', fmtPct(snapshot.conversionRate), '% of players who have paid', '#FF6B6B')}
      </div>

      {/* Daily revenue chart (last 30 days) */}
      <div className="mt-8 bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Daily revenue — last 30 days</h2>
        <p className="text-xs text-slate-500 mb-4">Green bars: $ value. Purple line: units sold.</p>
        <div className="h-64">
          <RevenueChart data={timeseries} />
        </div>
      </div>

      {/* Per-product breakdown */}
      <div className="mt-4 bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Revenue by product</h2>
        {byProduct.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No IAP events logged yet. Once players make purchases, revenue will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="text-left py-2">Product</th>
                  <th className="text-right py-2">Units sold</th>
                  <th className="text-right py-2">Unique buyers</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">Avg per buyer</th>
                  <th className="text-left py-2 pl-8">Share</th>
                </tr>
              </thead>
              <tbody>
                {byProduct.map((p) => {
                  const share = snapshot.totalRevenue > 0 ? (p.revenue / snapshot.totalRevenue) * 100 : 0;
                  return (
                    <tr key={p.productId} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2">
                        <span className="font-medium text-slate-800">{p.displayName}</span>
                        <span className="ml-2 text-[10px] text-slate-400 font-mono">{p.productId}</span>
                      </td>
                      <td className="py-2 text-right text-slate-700">{p.units.toLocaleString()}</td>
                      <td className="py-2 text-right text-slate-700">{p.uniqueBuyers.toLocaleString()}</td>
                      <td className="py-2 text-right font-semibold text-slate-900">{fmtUSD(p.revenue)}</td>
                      <td className="py-2 text-right text-slate-600">{p.uniqueBuyers > 0 ? fmtUSD(p.revenue / p.uniqueBuyers) : '—'}</td>
                      <td className="py-2 pl-8">
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden w-32">
                          <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: '#6C5CE7' }} />
                        </div>
                        <span className="text-[10px] text-slate-500 ml-1">{share.toFixed(1)}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note on data quality */}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
        <strong>Note on data quality:</strong> revenue numbers above are derived from in-app IAP logging.
        For ground-truth $ figures (refunds, taxes, store fees, currency conversion), reconcile with App Store Connect / Google Play Console reports. RevenueCat is the source of truth for subscription state and renewals.
      </div>
    </div>
  );
}
