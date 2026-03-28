import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from './sidebar';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = { title: 'LOOKAWAY Admin', description: 'Admin panel for LOOKAWAY game' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex">
        <SidebarWrapper>{children}</SidebarWrapper>
      </body>
    </html>
  );
}

function SidebarWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="flex-1 bg-gray-50 min-h-screen overflow-y-auto">
        {children}
      </main>
    </>
  );
}
