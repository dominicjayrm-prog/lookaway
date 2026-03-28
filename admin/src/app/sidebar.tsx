'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from './logout-action';

const navItems = [{ href: '/', label: 'Dashboard' },{ href: '/create', label: 'Create' },{ href: '/review', label: 'Review' },{ href: '/batch', label: 'Batch' }];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-64 flex-col bg-slate-900 text-white min-h-screen">
      <div className="px-6 py-6"><h1 className="text-lg font-bold tracking-tight">LOOKAWAY</h1><span className="mt-1 inline-block rounded-full bg-slate-700 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">Admin</span></div>
      <nav className="flex-1 px-3"><ul className="space-y-1">{navItems.map((item) => { const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href); return (<li key={item.href}><Link href={item.href} className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}>{item.label}</Link></li>); })}</ul></nav>
      <div className="px-3 pb-6"><form action={logout}><button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white">Logout</button></form></div>
    </aside>
  );
}
