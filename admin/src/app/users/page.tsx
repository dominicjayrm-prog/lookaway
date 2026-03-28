export default function UsersPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900">Users</h1>
      <p className="mt-1 text-sm text-slate-500">Player stats and activity</p>
      <div className="mt-8 bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm"><thead><tr className="border-b border-gray-100"><th className="px-6 py-3 text-left font-semibold text-slate-500">User ID</th><th className="px-6 py-3 text-left font-semibold text-slate-500">Last Active</th><th className="px-6 py-3 text-left font-semibold text-slate-500">Levels</th><th className="px-6 py-3 text-left font-semibold text-slate-500">Avg Score</th><th className="px-6 py-3 text-left font-semibold text-slate-500">Streak</th></tr></thead><tbody><tr className="text-slate-400"><td className="px-6 py-4" colSpan={5}>No user data yet. Users will appear here after playing.</td></tr></tbody></table>
      </div>
    </div>
  );
}
