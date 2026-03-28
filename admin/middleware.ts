import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) return NextResponse.next();
  const session = request.cookies.get('admin_session');
  if (!session || session.value !== 'authenticated') return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
