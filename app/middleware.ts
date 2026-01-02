import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  // ログインページは認証不要
  if (request.nextUrl.pathname.startsWith('/login')) {
    if (token) {
      return NextResponse.redirect(new URL('/documents', request.url));
    }
    return NextResponse.next();
  }

  // APIルートの認証チェック
  if (request.nextUrl.pathname.startsWith('/api/documents')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 保護されたルートの認証チェック
  if (request.nextUrl.pathname.startsWith('/documents')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/documents',
    '/documents/:path*',
    '/api/documents/:path*',
    '/login',
  ],
};

