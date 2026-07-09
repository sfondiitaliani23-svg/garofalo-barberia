'use server';

import { createClient } from '@/lib/supabase/server';
import type { SiteContent } from '@/types/database';

function isContentVisible(item: SiteContent, now = Date.now()) {
  if (!item.is_active) return false;
  if (item.starts_at && new Date(item.starts_at).getTime() > now) return false;
  if (item.ends_at && new Date(item.ends_at).getTime() < now) return false;
  return true;
}

export async function getActiveSiteBanners(): Promise<SiteContent[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from('site_content')
    .select('*')
    .eq('is_active', true)
    .order('key');

  return (data ?? []).filter((item) => isContentVisible(item as SiteContent));
}