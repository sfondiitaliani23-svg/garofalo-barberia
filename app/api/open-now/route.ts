import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getOpenStatus, romeClock } from '@/lib/utils/open-now';
import { getShopTimezoneOffset } from '@/lib/utils/booking-datetime';

export const dynamic = 'force-dynamic';

/**
 * Giorni di chiusura nei prossimi 14 giorni: una chiusura del salone
 * (barber_time_off senza barbiere) che copre la giornata, oppure tutti
 * i barbieri attivi assenti per l'intera giornata.
 */
async function closedDates(now: Date): Promise<string[]> {
  try {
    const supabase = await createServiceClient();
    if (!supabase) return [];
    const until = new Date(now.getTime() + 15 * 86_400_000);
    const [{ data: off }, { data: barbers }] = await Promise.all([
      supabase.from('barber_time_off').select('barber_id, start_at, end_at').lte('start_at', until.toISOString()).gte('end_at', now.toISOString()),
      supabase.from('barbers').select('id').eq('is_active', true),
    ]);
    if (!off?.length) return [];
    const active = (barbers ?? []).map((b) => b.id as string);
    const dates: string[] = [];
    for (let i = 0; i < 15; i++) {
      const day = romeClock(new Date(now.getTime() + i * 86_400_000)).date;
      // finestra 09:00–19:00 di Roma: se è tutta coperta, il giorno è chiuso
      const from = new Date(`${day}T09:00:00${getShopTimezoneOffset(day, '09:00')}`).getTime();
      const to = new Date(`${day}T19:00:00${getShopTimezoneOffset(day, '19:00')}`).getTime();
      const covers = (r: { start_at: string; end_at: string }) => new Date(r.start_at).getTime() <= from && new Date(r.end_at).getTime() >= to;
      const shopClosed = off.some((r) => !r.barber_id && covers(r));
      const allAway = active.length > 0 && active.every((id) => off.some((r) => r.barber_id === id && covers(r)));
      if (shopClosed || allAway) dates.push(day);
    }
    return dates;
  } catch {
    return [];
  }
}

export async function GET() {
  const now = new Date();
  const dates = await closedDates(now);
  return NextResponse.json(
    { ...getOpenStatus(now, dates), closedDates: dates },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
