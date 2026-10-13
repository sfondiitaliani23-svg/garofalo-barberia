import { NextResponse } from 'next/server';
import { getShopQr } from '@/lib/data/qr';

/** QR del salone: porta alla pagina giusta e segna da quale QR arriva la visita. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qr = getShopQr(id.toLowerCase());
  const url = new URL(qr ? qr.to : '/', request.url);
  if (qr) url.searchParams.set('qr', qr.id);
  return NextResponse.redirect(url, 307);
}
