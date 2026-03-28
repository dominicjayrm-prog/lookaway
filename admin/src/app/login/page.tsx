'use client';
import { useActionState } from 'react';
import { login } from './actions';

export default function LoginPage() {
  const [error, formAction, isPending] = useActionState(login, null);
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center"><h1 className="text-2xl font-bold tracking-tight text-slate-900">LOOKAWAY</h1><span className="mt-1 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium text-slate-500">Admin</span></div>
        <form action={formAction}>
          <div className="mb-4"><label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label><input id="password" name="password" type="password" required autoFocus className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Enter admin password" /></div>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={isPending} className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50">{isPending ? 'Signing in...' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
