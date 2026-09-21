'use server';

import { unstable_cache } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { SiteContent } from '@/types/database';

function isContentVisible(item: SiteContent, now = Date.now()) {
  if (!item.is_active) return false;
  if (item.starts_at && new Date(item.starts_at).getTime() > now) return false;
  if (item.ends_at && new Date(item.ends_at).getTime() < now) return false;
  return true;
}

const getCachedSiteContent = unstable_cache(
  async () => {
    try {
      const supabase = await createClient();
      if (!supabase) return [];

      const { data } = await supabase
        .from('site_content')
        .select('*')
        .eq('is_active', true)
        .order('key');

      return (data ?? []) as SiteContent[];
    } catch {
      return [];
    }
  },
  ['site-content-banners'],
  { revalidate: 60, tags: ['site-content'] }
);

export async function getActiveSiteBanners(): Promise<SiteContent[]> {
  try {
    const data = await getCachedSiteContent();
    const now = Date.now();
    return data.filter((item) => isContentVisible(item, now));
  } catch {
    return [];
  }
}