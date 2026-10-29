'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { getProfile, getSession } from '@/lib/auth';
import { isStaffRole } from '@/lib/auth/staff';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendPushToAll } from '@/lib/utils/push';
import { STORIES_BUCKET, STORIES_TAG, storyMediaUrl } from '@/lib/stories-server';
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  STORY_KINDS,
  VIDEO_TYPES,
  computeWrapped,
  isLiveNow,
  isStoryRatio,
  romeToday,
  safeCtaHref,
  storySlot,
  wrappedSlides,
  type StoryKind,
  type StoryRow,
  type StorySlide,
} from '@/lib/utils/stories';

type Fail = { ok: false; error: string };

// ─── Wrapped personale (cliente con accesso) ────────────────────────────────

/** Le storie "Il tuo anno" del cliente. Vuoto se non ha fatto l'accesso o non ha visite. */
export async function getMyWrappedAction(lang: 'it' | 'en'): Promise<StorySlide[]> {
  try {
    const user = await getSession();
    if (!user) return [];
    const supabase = await createClient();
    if (!supabase) return [];
    const year = Number(romeToday().slice(0, 4));
    const { data } = await supabase
      .from('appointments')
      .select('starts_at, ends_at, status, notes, service:services(name), barber:barbers(name)')
      .eq('customer_id', user.id)
      .gte('starts_at', `${year - 1}-12-31T00:00:00Z`)
      .lte('starts_at', `${year + 1}-01-01T00:00:00Z`)
      .limit(500);
    const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as { name?: string } | null;
    const apts = (data ?? []).map((a) => ({
      starts_at: a.starts_at as string,
      ends_at: a.ends_at as string,
      status: a.status as string,
      notes: (a.notes as string | null) ?? null,
      service: one(a.service)?.name ?? null,
      barber: one(a.barber)?.name ?? null,
    }));
    const profile = await getProfile();
    const firstName = (profile?.full_name ?? '').trim().split(/\s+/)[0] ?? '';
    return wrappedSlides(computeWrapped(apts, year), firstName, lang);
  } catch {
    return [];
  }
}

// ─── Gestione (admin, dipendente, tester) ───────────────────────────────────

async function editor() {
  const profile = await getProfile();
  if (!profile || !isStaffRole(profile.role)) return null;
  return { id: profile.id, tester: profile.role === 'tester' };
}

export type AdminStory = StoryRow & { mediaUrl: string | null; canEdit: boolean; author: string };

/** Storie da 30 giorni fa in avanti, per la pagina di gestione. */
export async function listStoriesAction(): Promise<{ ok: true; stories: AdminStory[]; today: string } | Fail> {
  const me = await editor();
  if (!me) return { ok: false, error: 'Accesso non consentito.' };
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  const today = romeToday();
  const from = romeToday(Date.now() - 30 * 86400000);
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .or(`ends_on.is.null,ends_on.gte.${from}`)
    .order('starts_on', { ascending: false })
    .order('sort_order')
    .limit(300);
  if (error) {
    return { ok: false, error: /relation|does not exist|schema cache/i.test(error.message) ? 'Manca la tabella delle storie: va eseguita la migrazione 016_storie.sql in Supabase.' : 'Non riesco a leggere le storie.' };
  }
  const rows = (data ?? []) as StoryRow[];
  const ids = [...new Set(rows.map((r) => r.created_by).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: people } = await supabase.from('profiles').select('id, full_name').in('id', ids);
    for (const p of people ?? []) names.set(p.id as string, ((p.full_name as string | null) ?? '').split(' ')[0] || 'Staff');
  }
  return {
    ok: true,
    today,
    stories: rows.map((r) => ({
      ...r,
      mediaUrl: storyMediaUrl(r.media_path),
      canEdit: !me.tester || r.created_by === me.id,
      author: (r.created_by && names.get(r.created_by)) || 'Staff',
    })),
  };
}

/** Permesso per caricare un file direttamente nello spazio "storie" (foto fino a 8 MB, video fino a 20 MB). */
export async function createStoryUploadAction(input: { mime: string; size: number; width: number; height: number }): Promise<{ ok: true; path: string; token: string } | Fail> {
  const me = await editor();
  if (!me) return { ok: false, error: 'Accesso non consentito.' };
  const isImage = IMAGE_TYPES.includes(input.mime);
  const isVideo = VIDEO_TYPES.includes(input.mime);
  if (!isImage && !isVideo) return { ok: false, error: 'Formato non accettato: foto JPG, PNG, WebP o video MP4, WebM, MOV.' };
  if (!isStoryRatio(Number(input.width), Number(input.height))) return { ok: false, error: 'Servono foto e video verticali 9:16, per esempio 1080x1920.' };
  if (input.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) return { ok: false, error: isVideo ? 'Il video supera 20 MB.' : 'La foto supera 8 MB.' };
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' }[input.mime] ?? 'bin';
  const path = `${romeToday()}/${randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(STORIES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: 'Spazio per le storie non pronto: va eseguita la migrazione 016_storie.sql.' };
  return { ok: true, path, token: data.token };
}

export type StoryInput = {
  id?: string;
  kind: StoryKind;
  title?: string;
  body?: string;
  title_en?: string;
  body_en?: string;
  big_number?: string;
  media_path?: string | null;
  cta_label?: string;
  cta_label_en?: string;
  cta_href?: string;
  starts_on: string;
  ends_on?: string | null;
  has_release?: boolean;
};

const txt = (v: unknown, max: number) => {
  const s = String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
  return s || null;
};
const isDay = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function touchStories() {
  revalidateTag(STORIES_TAG);
  revalidatePath('/');
  revalidatePath('/en');
  revalidatePath('/wrapped');
  revalidatePath('/en/wrapped');
}

/** Crea o modifica una storia. Il tester modifica solo le sue. La durata è sempre 24 ore e non si sposta. */
export async function saveStoryAction(input: StoryInput): Promise<{ ok: true; id: string; message: string } | Fail> {
  const me = await editor();
  if (!me) return { ok: false, error: 'Accesso non consentito.' };
  if (!STORY_KINDS.includes(input.kind)) return { ok: false, error: 'Tipo di storia non valido.' };
  if (!input.id && !isDay(input.starts_on)) return { ok: false, error: 'Scegli il giorno di inizio.' };
  const media = input.kind === 'foto' || input.kind === 'video';
  const mediaPath = media ? txt(input.media_path, 200) : null;
  if (media && (!mediaPath || !/^\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|mp4|webm|mov)$/.test(mediaPath))) return { ok: false, error: input.kind === 'video' ? 'Carica il video.' : 'Carica la foto.' };
  if (media && input.has_release !== true) return { ok: false, error: 'Conferma la liberatoria (o che non ci sono persone riconoscibili).' };
  const title = txt(input.title, 90);
  const bigNumber = txt(input.big_number, 24);
  if (input.kind === 'numero' && !bigNumber) return { ok: false, error: 'Scrivi il numero da mostrare.' };
  if (input.kind === 'testo' && !title) return { ok: false, error: 'Scrivi il titolo.' };
  const href = txt(input.cta_href, 300);
  if (href && !safeCtaHref(href)) return { ok: false, error: 'Il link del pulsante deve iniziare con / oppure https://' };

  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };

  const row = {
    kind: input.kind,
    title,
    body: txt(input.body, 280),
    title_en: txt(input.title_en, 90),
    body_en: txt(input.body_en, 280),
    big_number: input.kind === 'numero' ? bigNumber : null,
    media_path: mediaPath,
    cta_label: href ? txt(input.cta_label, 30) : null,
    cta_label_en: href ? txt(input.cta_label_en, 30) : null,
    cta_href: href,
    has_release: media ? true : false,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data: old } = await supabase.from('stories').select('created_by, kind').eq('id', input.id).maybeSingle();
    if (!old) return { ok: false, error: 'Storia non trovata.' };
    if (me.tester && old.created_by !== me.id) return { ok: false, error: 'Puoi modificare solo le storie che hai caricato tu.' };
    const { error } = await supabase.from('stories').update({ ...row, kind: old.kind }).eq('id', input.id);
    if (error) return { ok: false, error: 'Salvataggio non riuscito.' };
    touchStories();
    return { ok: true, id: input.id, message: 'Storia aggiornata. Le 24 ore non cambiano.' };
  }

  let slot: { starts_on: string; ends_on: string; created_at: string };
  try {
    slot = storySlot(input.starts_on, Date.now());
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Il giorno di inizio è oggi o un giorno futuro.' };
  }
  const { count } = await supabase.from('stories').select('id', { head: true, count: 'exact' }).eq('starts_on', slot.starts_on);
  const { data, error } = await supabase
    .from('stories')
    .insert({ ...row, ...slot, sort_order: count ?? 0, created_by: me.id })
    .select('id')
    .single();
  if (error || !data) return { ok: false, error: 'Salvataggio non riuscito.' };
  touchStories();

  let message = isLiveNow(slot) ? 'Storia pubblicata. È già online.' : 'Storia pubblicata. Si vedrà per 24 ore dal giorno scelto.';
  if (isLiveNow(slot)) {
    try {
      const push = await sendPushToAll({
        title: (title || 'Nuova storia').slice(0, 60),
        body: (row.body || bigNumber || 'C’è una nuova storia sul sito. Aprilo per vederla.').slice(0, 160),
        url: '/#storie',
        tag: 'storia-nuova',
      });
      message += push.sent > 0
        ? ` Avviso inviato a ${push.sent} ${push.sent === 1 ? 'dispositivo' : 'dispositivi'}.`
        : push.total > 0
          ? ' L’avviso sul telefono non è partito.'
          : ' Nessun dispositivo ha gli avvisi attivi.';
    } catch {
      message += ' L’avviso sul telefono non è partito.';
    }
  }
  return { ok: true, id: data.id as string, message };
}

/** Manda l’avviso di questa storia a tutti i telefoni che hanno le notifiche attive. */
export async function notifyStoryAction(id: string): Promise<{ ok: true; message: string } | Fail> {
  const me = await editor();
  if (!me) return { ok: false, error: 'Accesso non consentito.' };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: 'Storia non trovata.' };
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  const { data: story } = await supabase.from('stories').select('title, body, big_number').eq('id', id).maybeSingle();
  if (!story) return { ok: false, error: 'Storia non trovata.' };
  const title = String(story.title || 'Nuova storia').slice(0, 60);
  const body = String(story.body || story.big_number || 'C’è una nuova storia sul sito. Aprilo per vederla.').slice(0, 160);
  try {
    const push = await sendPushToAll({ title, body, url: '/#storie', tag: `storia-${id}-${Date.now()}` });
    if (push.sent > 0) return { ok: true, message: `Avviso inviato a ${push.sent} ${push.sent === 1 ? 'dispositivo' : 'dispositivi'}.` };
    if (push.total > 0) return { ok: false, error: 'L’avviso sul telefono non è partito.' };
    return { ok: false, error: 'Nessun dispositivo ha gli avvisi attivi.' };
  } catch {
    return { ok: false, error: 'L’avviso sul telefono non è partito.' };
  }
}

/** Elimina una storia e il suo file. Il tester elimina solo le sue. */
export async function deleteStoryAction(id: string): Promise<{ ok: true } | Fail> {
  const me = await editor();
  if (!me) return { ok: false, error: 'Accesso non consentito.' };
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  const { data: old } = await supabase.from('stories').select('created_by, media_path').eq('id', id).maybeSingle();
  if (!old) return { ok: false, error: 'Storia non trovata.' };
  if (me.tester && old.created_by !== me.id) return { ok: false, error: 'Puoi eliminare solo le storie che hai caricato tu.' };
  const { error } = await supabase.from('stories').delete().eq('id', id);
  if (error) return { ok: false, error: 'Eliminazione non riuscita.' };
  if (old.media_path) await supabase.storage.from(STORIES_BUCKET).remove([old.media_path as string]);
  touchStories();
  return { ok: true };
}

/** Salva il nuovo ordine delle storie di un giorno. Tutti gli editor possono riordinare. */
export async function reorderStoriesAction(ids: string[]): Promise<{ ok: true } | Fail> {
  const me = await editor();
  if (!me) return { ok: false, error: 'Accesso non consentito.' };
  if (!Array.isArray(ids) || ids.length > 100 || ids.some((i) => typeof i !== 'string')) return { ok: false, error: 'Ordine non valido.' };
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from('stories').update({ sort_order: i }).eq('id', ids[i]);
    if (error) return { ok: false, error: 'Riordino non riuscito.' };
  }
  touchStories();
  return { ok: true };
}
