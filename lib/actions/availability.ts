'use server';

import { addDays, format, parseISO, startOfDay } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { SITE_CONFIG } from '@/lib/site-config';
import { filterAvailableSlots, generateSlots } from '@/lib/utils/slots';
import { getFallbackSlots } from '@/lib/utils/fallback-slots';

export async function getAvailableSlots(
  barberId: string | null,
  dateStr: string,
  durationMinutes: number
): Promise<{ slots: string[]; error?: string }> {
  if (!isSupabaseConfigured()) {
    return getFallbackSlots(dateStr, durationMinutes);
  }

  try {
    const supabase = await createClient();
    if (!supabase) return getFallbackSlots(dateStr, durationMinutes);

    const date = parseISO(dateStr);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 1) {
      return { slots: [], error: 'Chiuso in questo giorno' };
    }

    const { data: barbers } = await supabase
      .from('barbers')
      .select('id')
      .eq('is_active', true);

    const barberIds = barberId
      ? [barberId]
      : (barbers ?? []).map((b) => b.id);

    if (barberIds.length === 0) return getFallbackSlots(dateStr, durationMinutes);

    const allSlotsSet = new Set<string>();

    for (const bid of barberIds) {
      const { data: availability } = await supabase
        .from('barber_availability')
        .select('*')
        .eq('barber_id', bid)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true)
        .single();

      if (!availability) continue;

      const dayStart = startOfDay(date).toISOString();
      const dayEnd = addDays(startOfDay(date), 1).toISOString();

      const { data: appointments } = await supabase
        .from('appointments')
        .select('starts_at, ends_at')
        .eq('barber_id', bid)
        .eq('status', 'confirmed')
        .gte('starts_at', dayStart)
        .lt('starts_at', dayEnd);

      const { data: timeOff } = await supabase
        .from('barber_time_off')
        .select('start_at, end_at')
        .or(`barber_id.eq.${bid},barber_id.is.null`)
        .lte('start_at', dayEnd)
        .gte('end_at', dayStart);

      const slots = generateSlots(
        date,
        availability.start_time.slice(0, 5),
        availability.end_time.slice(0, 5),
        durationMinutes,
        SITE_CONFIG.slotIntervalMinutes
      );

      const available = filterAvailableSlots(slots, appointments ?? [], timeOff ?? []);

      const minAdvance = new Date();
      minAdvance.setHours(minAdvance.getHours() + 2);

      for (const slot of available) {
        if (slot.startsAt > minAdvance) {
          allSlotsSet.add(slot.time);
        }
      }
    }

    const slots = Array.from(allSlotsSet).sort();
    if (slots.length === 0) return getFallbackSlots(dateStr, durationMinutes);
    return { slots };
  } catch {
    return getFallbackSlots(dateStr, durationMinutes);
  }
}

export async function resolveBarberForSlot(
  dateStr: string,
  timeStr: string,
  durationMinutes: number
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data: barbers } = await supabase
    .from('barbers')
    .select('id')
    .eq('is_active', true)
    .order('sort_order');

  for (const barber of barbers ?? []) {
    const { slots } = await getAvailableSlots(barber.id, dateStr, durationMinutes);
    if (slots.includes(timeStr)) return barber.id;
  }
  return null;
}

export async function getAvailableDates(durationMinutes: number): Promise<string[]> {
  const dates: string[] = [];
  const today = new Date();

  for (let i = 1; i <= SITE_CONFIG.bookingHorizonDays; i++) {
    const d = addDays(today, i);
    const day = d.getDay();
    if (day === 0 || day === 1) continue;
    const dateStr = format(d, 'yyyy-MM-dd');
    const { slots } = await getAvailableSlots(null, dateStr, durationMinutes);
    if (slots.length > 0) dates.push(dateStr);
  }

  return dates;
}