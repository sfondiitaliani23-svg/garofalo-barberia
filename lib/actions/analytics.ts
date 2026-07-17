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
  visitsHistory?: number[];
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
    visitsHistory: [0, 0, 0, 0, 0, 0],
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

  const SHOP_TIMEZONE = 'Europe/Rome';
  function getRomeDateKey(date: Date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: SHOP_TIMEZONE,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(date);
    const getV = (t: string) => parts.find(p => p.type === t)?.value ?? '0';
    return `${getV('year')}-${getV('month').padStart(2,'0')}-${getV('day').padStart(2,'0')}`;
  }

  const now = new Date();
  const todayKey = getRomeDateKey(now);
  const yesterdayDate = new Date(now); yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getRomeDateKey(yesterdayDate);
  const lastWeekDate = new Date(now); lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeekKey = getRomeDateKey(lastWeekDate);
  const lastMonthDate = new Date(now); lastMonthDate.setDate(lastMonthDate.getDate() - 30);
  const lastMonthKey = getRomeDateKey(lastMonthDate);

  // Fetch all page_views covering last 31 days to count unique sessions per period
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 31);
  const [{ data: allViews }, liveVisitors, ...breakdownCounts] = await Promise.all([
    supabase
      .from('page_views')
      .select('session_id, viewed_at')
      .gte('viewed_at', cutoff.toISOString()),
    countLiveVisitors(),
    ...(['male', 'female', 'child', 'other'] as const).map((gender) =>
      supabase
        .from('visitor_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('gender', gender)
    ),
    ...(['under_18', '18_24', '25_34', '35_44', '45_54', '55_plus'] as const).map((ageRange) =>
      supabase
        .from('visitor_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('age_range', ageRange)
    ),
  ]);

  // Count raw page views per time window (same method as getLiveTrafficData)
  let dailyVisits = 0;
  let yesterdayVisits = 0;
  let weeklyVisits = 0;
  let monthlyVisits = 0;

  if (allViews) {
    for (const view of allViews) {
      const dateKey = getRomeDateKey(new Date(view.viewed_at));
      if (dateKey === todayKey) dailyVisits++;
      if (dateKey === yesterdayKey) yesterdayVisits++;
      if (dateKey >= lastWeekKey) weeklyVisits++;
      if (dateKey >= lastMonthKey) monthlyVisits++;
    }
  }

  const genderKeys = GENDERS.filter((key) => key !== 'unknown');
  const ageKeys = AGE_RANGES.filter((key) => key !== 'unknown');

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

  const dateKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dateKeys.push(getRomeDateKey(d));
  }

  const visitsHistory = dateKeys.map(key => {
    let count = 0;
    if (allViews) {
      for (const view of allViews) {
        if (getRomeDateKey(new Date(view.viewed_at)) === key) {
          count++;
        }
      }
    }
    return count;
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
    visitsHistory,
  };
}

export interface LiveTrafficData {
  liveCount: number;
  todayHourly: number[];
  yesterdayHourly: number[];
  todayTotal: number;
  yesterdayTotal: number;   // sessioni uniche ieri (giorno completo)
  weeklyTotal: number;     // sessioni uniche ultimi 7 giorni
  monthlyTotal: number;    // sessioni uniche ultimi 30 giorni
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
      yesterdayTotal: 0,
      weeklyTotal: 0,
      monthlyTotal: 0,
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
      hour12: false,
    }).formatToParts(date);

    const getVal = (type: string) => parts.find(p => p.type === type)?.value ?? '0';
    
    const year = getVal('year');
    const month = getVal('month').padStart(2, '0');
    const day = getVal('day').padStart(2, '0');
    let hour = parseInt(getVal('hour'), 10);
    if (hour === 24) hour = 0;
    
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

  // Extend window to 31 days to cover weekly + monthly stats
  const cutoff31 = new Date();
  cutoff31.setDate(cutoff31.getDate() - 31);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoKey = getRomeTimeParts(sevenDaysAgo).dateKey;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoKey = getRomeTimeParts(thirtyDaysAgo).dateKey;

  const [
    liveCount,
    { data: pageViews }
  ] = await Promise.all([
    countLiveVisitors(),
    supabase
      .from('page_views')
      .select('session_id, viewed_at')
      .gte('viewed_at', cutoff31.toISOString())
  ]);

  const todayHourlyCount = Array(24).fill(0);
  const yesterdayHourlyCount = Array(24).fill(0);

  let todayTotal = 0;
  let yesterdayTotal = 0;
  let weeklyTotal = 0;
  let monthlyTotal = 0;
  let yesterdayTotalCompare = 0;

  if (pageViews) {
    for (const view of pageViews) {
      const date = new Date(view.viewed_at);
      const { dateKey, hour } = getRomeTimeParts(date);

      if (dateKey === todayDateKey) {
        todayHourlyCount[hour]++;
        todayTotal++;
      }
      if (dateKey === yesterdayDateKey) {
        yesterdayHourlyCount[hour]++;
        yesterdayTotal++;
        if (hour <= currentRomeHour) yesterdayTotalCompare++;
      }
      if (dateKey >= sevenDaysAgoKey) weeklyTotal++;
      if (dateKey >= thirtyDaysAgoKey) monthlyTotal++;
    }
  }

  const todayHourly = todayHourlyCount;
  const yesterdayHourly = yesterdayHourlyCount;

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
    yesterdayTotal,
    weeklyTotal,
    monthlyTotal,
    yesterdayTotalCompare,
    percentChange,
    isChangePositive: percentChange >= 0,
    todayDateStr,
    yesterdayDateStr,
  };
}