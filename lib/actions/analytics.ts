'use server';

import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const GENDERS = ['male', 'female', 'child', 'other', 'unknown'] as const;
const AGE_RANGES = [
  'under_18',
  '18_24',
  '25_34',
  '35_44',
  '45_54',
  '55_plus',
  'unknown',
] as const;

type Gender = (typeof GENDERS)[number];
type AgeRange = (typeof AGE_RANGES)[number];

export type AnalyticsStats = {
  configured: boolean;
  dailyVisits: number;
  liveVisitors: number;
  genderBreakdown: Record<Gender, number>;
  ageBreakdown: Record<AgeRange, number>;
};

function isValidSessionId(id: string) {
  return UUID_REGEX.test(id);
}

function emptyStats(): AnalyticsStats {
  return {
    configured: false,
    dailyVisits: 0,
    liveVisitors: 0,
    genderBreakdown: { male: 0, female: 0, child: 0, other: 0, unknown: 0 },
    ageBreakdown: {
      under_18: 0,
      '18_24': 0,
      '25_34': 0,
      '35_44': 0,
      '45_54': 0,
      '55_plus': 0,
      unknown: 0,
    },
  };
}

async function touchSession(sessionId: string) {
  const supabase = await createServiceClient();
  if (!supabase || !isValidSessionId(sessionId)) return null;

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('visitor_sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('visitor_sessions')
      .update({ last_seen_at: now })
      .eq('id', sessionId);
  } else {
    await supabase.from('visitor_sessions').insert({
      id: sessionId,
      last_seen_at: now,
      first_seen_at: now,
    });
  }

  return supabase;
}

export async function trackPageView(sessionId: string, path: string) {
  const supabase = await touchSession(sessionId);
  if (!supabase) return { ok: false };

  const safePath = path.slice(0, 500) || '/';
  await supabase.from('page_views').insert({
    session_id: sessionId,
    path: safePath,
  });

  return { ok: true };
}

export async function trackHeartbeat(sessionId: string) {
  const supabase = await touchSession(sessionId);
  return { ok: !!supabase };
}

export async function saveDemographics(
  sessionId: string,
  gender: 'male' | 'female' | 'child' | 'other',
  ageRange: AgeRange
) {
  const supabase = await createServiceClient();
  if (!supabase || !isValidSessionId(sessionId)) return { ok: false };
  if (!AGE_RANGES.includes(ageRange)) return { ok: false };

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('visitor_sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('visitor_sessions')
      .update({ gender, age_range: ageRange, last_seen_at: now })
      .eq('id', sessionId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from('visitor_sessions').insert({
      id: sessionId,
      gender,
      age_range: ageRange,
      first_seen_at: now,
      last_seen_at: now,
    });
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function getAnalyticsStats(): Promise<AnalyticsStats> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return emptyStats();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const genderKeys = GENDERS.filter((key) => key !== 'unknown');
  const ageKeys = AGE_RANGES.filter((key) => key !== 'unknown');

  const [
    { count: dailyVisits },
    { count: liveVisitors },
    ...breakdownCounts
  ] = await Promise.all([
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('viewed_at', today.toISOString()),
    supabase
      .from('visitor_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('last_seen_at', fiveMinAgo.toISOString()),
    ...genderKeys.map((gender) =>
      supabase
        .from('visitor_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('gender', gender)
    ),
    ...ageKeys.map((ageRange) =>
      supabase
        .from('visitor_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('age_range', ageRange)
    ),
  ]);

  const genderBreakdown: Record<Gender, number> = {
    male: 0,
    female: 0,
    child: 0,
    other: 0,
    unknown: 0,
  };
  const ageBreakdown: Record<AgeRange, number> = {
    under_18: 0,
    '18_24': 0,
    '25_34': 0,
    '35_44': 0,
    '45_54': 0,
    '55_plus': 0,
    unknown: 0,
  };

  genderKeys.forEach((gender, index) => {
    genderBreakdown[gender] = breakdownCounts[index]?.count ?? 0;
  });

  ageKeys.forEach((ageRange, index) => {
    ageBreakdown[ageRange] = breakdownCounts[genderKeys.length + index]?.count ?? 0;
  });

  return {
    configured: true,
    dailyVisits: dailyVisits ?? 0,
    liveVisitors: liveVisitors ?? 0,
    genderBreakdown,
    ageBreakdown,
  };
}