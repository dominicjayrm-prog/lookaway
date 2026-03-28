export default function SettingsPage() {
  const schedule = [{day:'Monday',mode:'Classic'},{day:'Tuesday',mode:'Speed Round'},{day:'Wednesday',mode:'Classic'},{day:'Thursday',mode:'Spot The Change'},{day:'Friday',mode:'Classic'},{day:'Saturday',mode:'Speed Round'},{day:'Sunday',mode:'Classic'}];
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-slate-500">App configuration</p>
      <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Daily Mode Schedule</h2>
        <table className="w-full text-sm"><thead><tr className="border-b border-gray-100"><th className="px-4 py-2 text-left font-semibold text-slate-500">Day</th><th className="px-4 py-2 text-left font-semibold text-slate-500">Mode</th></tr></thead><tbody>{schedule.map(s => (<tr key={s.day} className="border-b border-gray-50 hover:bg-gray-50"><td className="px-4 py-3 text-slate-700">{s.day}</td><td className="px-4 py-3 text-slate-700">{s.mode}</td></tr>))}</tbody></table>
      </div>
    </div>
  );
}
