import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Versione attualmente pubblicata (senza cache). La scheda dell'admin la confronta con la propria. */
export async function GET() {
  return NextResponse.json(
    { id: process.env.NEXT_PUBLIC_BUILD_ID || 'dev' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
