import { createServiceClient } from '@/lib/supabase/server';
import { DEFAULT_UNLOCKED_DAYS, UNLOCKED_DAYS_KEY, parseUnlockedDays } from '@/lib/utils/unlocked-days';

/** Giorni sbloccati salvati dall'admin (o i valori di partenza). Non lancia mai errori. */
export async function readUnlockedDays(): Promise<string[]> {
  try {
    const supabase = await createServiceClient();
    if (!supabase) return [...DEFAULT_UNLOCKED_DAYS];
    const { data, error } = await supabase.from('site_content').select('body').eq('key', UNLOCKED_DAYS_KEY).maybeSingle();
    if (error) return [...DEFAULT_UNLOCKED_DAYS];
    return parseUnlockedDays((data?.body as string | null | undefined) ?? null);
  } catch {
    return [...DEFAULT_UNLOCKED_DAYS];
  }
}
