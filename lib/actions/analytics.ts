'use server';

import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import {
  countLiveVisitors,
  endVisitorSession,
  isValidVisitorSessionId,
  touchVisitorSession,
} from '@/lib/analytics/presence';

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
  yesterdayVisits: number;
  weeklyVisits: number;
  monthlyVisits: number;
  liveVisitors: number;
  genderBreakdown: Record<Gender, number>;
  ageBreakdown: Record<AgeRange, number>;
};

function emptyStats(): AnalyticsStats {
  return {
    configured: false,
    dailyVisits: 0,
    yesterdayVisits: 0,
    weeklyVisits: 0,
    monthlyVisits: 0,
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

export async function trackPageView(sessionId: string, path: string) {
  const supabase = await createServiceClient();
  if (!supabase || !isValidVisitorSessionId(sessionId)) return { ok: false };

  const touched = await touchVisitorSession(sessionId);
  if (!touched) return { ok: false };

  const safePath = path.slice(0, 500) || '/';
  await supabase.from('page_views').insert({
    session_id: sessionId,
    path: safePath,
  });

  return { ok: true };
}

export async function trackHeartbeat(sessionId: string) {
  const ok = await touchVisitorSession(sessionId);
  return { ok };
}

export async function trackSessionEnd(sessionId: string) {
  const ok = await endVisitorSession(sessionId);
  return { ok };
}

export async function getLiveVisitorsCount(): Promise<number> {
  await requireAdmin();
  return countLiveVisitors();
}

export async function saveDemographics(
  sessionId: string,
  gender: 'male' | 'female' | 'child' | 'other',
  ageRange: AgeRange
) {
  const supabase = await createServiceClient();
  if (!supabase || !isValidVisitorSessionId(sessionId)) return { ok: false };
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

  const yesterdayStart = new Date(today);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const lastMonthStart = new Date(today);
  lastMonthStart.setDate(lastMonthStart.getDate() - 30);

  const genderKeys = GENDERS.filter((key) => key !== 'unknown');
  const ageKeys = AGE_RANGES.filter((key) => key !== 'unknown');

  const [
    { count: dailyVisits },
    { count: yesterdayVisits },
    { count: weeklyVisits },
    { count: monthlyVisits },
    liveVisitors,
    ...breakdownCounts
  ] = await Promise.all([
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('viewed_at', today.toISOString()),
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('viewed_at', yesterdayStart.toISOString())
      .lt('viewed_at', today.toISOString()),
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('viewed_at', lastWeekStart.toISOString()),
    supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('viewed_at', lastMonthStart.toISOString()),
    countLiveVisitors(),
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
    yesterdayVisits: yesterdayVisits ?? 0,
    weeklyVisits: weeklyVisits ?? 0,
    monthlyVisits: monthlyVisits ?? 0,
    liveVisitors,
    genderBreakdown,
    ageBreakdown,
  };
}

export interface LiveTrafficData {
  liveCount: number;
  todayHourly: number[];
  yesterdayHourly: number[];
  todayTotal: number;
  yesterdayTotalCompare: number;
  percentChange: number;
  isChangePositive: boolean;
  todayDateStr: string;
  yesterdayDateStr: string;
}

export async function getLiveTrafficData(): Promise<LiveTrafficData> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) {
    return {
      liveCount: 0,
      todayHourly: Array(24).fill(0),
      yesterdayHourly: Array(24).fill(0),
      todayTotal: 0,
      yesterdayTotalCompare: 0,
      percentChange: 0,
      isChangePositive: true,
      todayDateStr: '',
      yesterdayDateStr: '',
    };
  }

  const SHOP_TIMEZONE = 'Europe/Rome';
  
  function getRomeTimeParts(date: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: SHOP_TIMEZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
    }).formatToParts(date);

    const getVal = (type: string) => parts.find(p => p.type === type)?.value ?? '0';
    
    const year = getVal('year');
    const month = getVal('month').padStart(2, '0');
    const day = getVal('day').padStart(2, '0');
    const hour = parseInt(getVal('hour'), 10);
    
    return {
      dateKey: `${year}-${month}-${day}`,
      hour,
    };
  }

  const now = new Date();
  const todayParts = getRomeTimeParts(now);
  const todayDateKey = todayParts.dateKey;
  const currentRomeHour = todayParts.hour;

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayDateKey = getRomeTimeParts(yesterdayDate).dateKey;

  const startOfYesterday = new Date();
  startOfYesterday.setHours(startOfYesterday.getHours() - 36);

  const [
    liveCount,
    { data: pageViews }
  ] = await Promise.all([
    countLiveVisitors(),
    supabase
      .from('page_views')
      .select('session_id, viewed_at')
      .gte('viewed_at', startOfYesterday.toISOString())
  ]);

  const todayHourlySessions = Array.from({ length: 24 }, () => new Set<string>());
  const yesterdayHourlySessions = Array.from({ length: 24 }, () => new Set<string>());

  const todayTotalUniqueSessions = new Set<string>();

  if (pageViews) {
    for (const view of pageViews) {
      const date = new Date(view.viewed_at);
      const { dateKey, hour } = getRomeTimeParts(date);
      
      if (dateKey === todayDateKey) {
        todayHourlySessions[hour].add(view.session_id);
        todayTotalUniqueSessions.add(view.session_id);
      } else if (dateKey === yesterdayDateKey) {
        yesterdayHourlySessions[hour].add(view.session_id);
      }
    }
  }

  const todayHourly = todayHourlySessions.map(s => s.size);
  const yesterdayHourly = yesterdayHourlySessions.map(s => s.size);

  const todayTotal = todayTotalUniqueSessions.size;

  const yesterdayCompareSet = new Set<string>();
  for (let h = 0; h <= currentRomeHour; h++) {
    yesterdayHourlySessions[h].forEach(sid => yesterdayCompareSet.add(sid));
  }
  const yesterdayTotalCompare = yesterdayCompareSet.size;

  let percentChange = 0;
  if (yesterdayTotalCompare > 0) {
    percentChange = Math.round(((todayTotal - yesterdayTotalCompare) / yesterdayTotalCompare) * 100);
  } else if (todayTotal > 0) {
    percentChange = 100;
  }

  const itMonthNames = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  
  const formatRomeDateStr = (date: Date) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: SHOP_TIMEZONE,
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    }).formatToParts(date);
    
    const day = parts.find(p => p.type === 'day')?.value ?? '';
    const monthIndex = parseInt(parts.find(p => p.type === 'month')?.value ?? '1', 10) - 1;
    const year = parts.find(p => p.type === 'year')?.value ?? '';
    
    return `${day} ${itMonthNames[monthIndex]} ${year}`;
  };

  const todayDateStr = formatRomeDateStr(now);
  const yesterdayDateStr = formatRomeDateStr(yesterdayDate);

  return {
    liveCount,
    todayHourly,
    yesterdayHourly,
    todayTotal,
    yesterdayTotalCompare,
    percentChange,
    isChangePositive: percentChange >= 0,
    todayDateStr,
    yesterdayDateStr,
  };
}