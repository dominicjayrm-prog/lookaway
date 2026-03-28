export default function AnalyticsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">Game metrics and charts</p>
      <div className="mt-8 grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6"><p className="text-xs font-semibold uppercase text-slate-400">DAU</p><p className="mt-2 text-3xl font-bold text-slate-900">-</p></div>
        <div className="bg-white rounded-xl shadow-sm p-6"><p className="text-xs font-semibold uppercase text-slate-400">WAU</p><p className="mt-2 text-3xl font-bold text-slate-900">-</p></div>
        <div className="bg-white rounded-xl shadow-sm p-6"><p className="text-xs font-semibold uppercase text-slate-400">MAU</p><p className="mt-2 text-3xl font-bold text-slate-900">-</p></div>
      </div>
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6"><p className="text-sm text-slate-500">Charts coming soon. Install recharts for DAU/WAU/MAU, score distribution, level funnel, and mode popularity visualizations.</p></div>
    </div>
  );
}
