'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { logout } from './logout-action';
import { BlinkMini } from '@/components/BlinkMini';

interface NavItem { href: string; label: string; icon: string; children?: { href: string; label: string }[]; }

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: String.fromCodePoint(0x1F4CA) },
  { href: '/analytics', label: 'Analytics', icon: String.fromCodePoint(0x1F4C8) },
  { href: '/economy', label: 'Economy', icon: String.fromCodePoint(0x1F48E) },
  { href: '/cosmetics', label: 'Cosmetics', icon: String.fromCodePoint(0x1F3A8) },
  { href: '/levels', label: 'Campaign Levels', icon: String.fromCodePoint(0x1F3AE) },
  { href: '/users', label: 'Users', icon: String.fromCodePoint(0x1F465) },
  { href: '/settings', label: 'Settings', icon: String.fromCodePoint(0x2699, 0xFE0F) },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const item of navItems) if (item.children?.some(c => pathname.startsWith(c.href))) s.add(item.href);
    return s;
  });
  const toggle = (href: string) => setExpanded(prev => { const n = new Set(prev); n.has(href) ? n.delete(href) : n.add(href); return n; });
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className="flex w-64 flex-col bg-[#1A1929] text-white min-h-screen">
      <div className="px-6 py-6">
        <div className="flex items-center gap-3">
          <BlinkMini size={32} />
          <div>
            <h1 className="text-lg font-bold tracking-tight">BLANKED</h1>
            <span className="inline-block rounded-full bg-purple-600/30 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-purple-300">Admin</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">v1.0</p>
      </div>
      <nav className="flex-1 px-3"><ul className="space-y-1">
        {navItems.map(item => {
          const has = !!item.children, exp = expanded.has(item.href), active = isActive(item.href);
          const cls = `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'border-l-2 border-purple-500 bg-purple-900/20 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`;
          if (has) return (<li key={item.href}><button onClick={() => toggle(item.href)} className={`${cls} w-full justify-between`}><span className="flex items-center gap-3"><span className="text-base">{item.icon}</span>{item.label}</span><svg className={`h-4 w-4 transition-transform ${exp ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></button>
            {exp && <ul className="mt-1 space-y-1">{item.children!.map(c => (<li key={c.href}><Link href={c.href} className={`block rounded-lg py-2 pl-10 pr-3 text-sm font-medium transition-colors ${isActive(c.href) ? 'border-l-2 border-purple-500 bg-purple-900/20 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>{c.label}</Link></li>))}</ul>}</li>);
          return <li key={item.href}><Link href={item.href} className={cls}><span className="text-base">{item.icon}</span>{item.label}</Link></li>;
        })}
      </ul></nav>
      <div className="px-3 pb-6"><form action={logout}><button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"><span className="text-base">{String.fromCodePoint(0x1F6AA)}</span>Logout</button></form></div>
    </aside>
  );
}
