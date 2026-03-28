'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
