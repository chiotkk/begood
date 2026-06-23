import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const appPassword = process.env.APP_PASSWORD;

  // If no password is configured, keep local/dev behavior frictionless.
  if (!appPassword) return NextResponse.next();

  const auth = req.headers.get('authorization');
  const expected = `Basic ${Buffer.from(`begood:${appPassword}`).toString('base64')}`;

  if (auth === expected) return NextResponse.next();

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="BeGood"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
