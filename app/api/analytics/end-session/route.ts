import { NextResponse } from 'next/server';
import { endVisitorSession, isValidVisitorSessionId } from '@/lib/analytics/presence';

export async function POST(request: Request) {
  let sessionId = '';

  try {
    const body = await request.json();
    sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!isValidVisitorSessionId(sessionId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ok = await endVisitorSession(sessionId);
  return NextResponse.json({ ok });
}