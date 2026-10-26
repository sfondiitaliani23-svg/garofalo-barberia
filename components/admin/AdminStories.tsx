'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { ArrowDown, ArrowUp, Eye, Film, Hash, ImageIcon, Pencil, Plus, Trash2, Type, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_VIDEO_SECONDS,
  VIDEO_TYPES,
  isStoryLive,
  isStoryRatio,
  moveInOrder,
  sortStories,
  toSlide,
  type StoryKind,
} from '@/lib/utils/stories';
import type { AdminStory, StoryInput } from '@/lib/actions/stories';

const StoriesViewer = dynamic(() => import('@/components/stories/StoriesViewer').then((m) => m.StoriesViewer), { ssr: false });

const KINDS: { id: StoryKind; label: string; icon: typeof ImageIcon; hint: string }[] = [
  { id: 'foto', label: 'Foto', icon: ImageIcon, hint: 'Solo verticale 9:16 (es. 1080x1920). JPG, PNG o WebP fino a 8 MB.' },
  { id: 'video', label: 'Video', icon: Film, hint: `Solo verticale 9:16 (es. 1080x1920), fino a ${MAX_VIDEO_SECONDS} secondi e 20 MB.` },
  { id: 'testo', label: 'Testo o promo', icon: Type, hint: 'Un annuncio, una promo, un orario speciale.' },
  { id: 'numero', label: 'Numero', icon: Hash, hint: 'Stile Wrapped: un numero grande (es. "1.200 tagli nel 2026").' },
];

type Form = {
  id?: string;
  kind: StoryKind;
  title: string;
  body: string;
  title_en: string;
  body_en: string;
  big_number: string;
  media_path: string | null;
  mediaUrl: string | null;
  cta_label: string;
  cta_label_en: string;
  cta_href: string;
  starts_on: string;
  durata: 'giorno' | 'fino' | 'sempre';
  ends_on: string;
  has_release: boolean;
};

const blank = (day: string): Form => ({
  kind: 'foto',
  title: '',
  body: '',
  title_en: '',
  body_en: '',
  big_number: '',
  media_path: null,
  mediaUrl: null,
  cta_label: '',
  cta_label_en: '',
  cta_href: '',
  starts_on: day,
  durata: 'giorno',
  ends_on: day,
  has_release: false,
});

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmtDay = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Larghezza e altezza di una foto o di un video, letti nel browser. */
function mediaSize(file: File, video: boolean): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (w: number, h: number) => {
      URL.revokeObjectURL(url);
      resolve({ w, h });
    };
    if (video) {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => done(v.videoWidth, v.videoHeight);
      v.onerror = () => done(0, 0);
      v.src = url;
    } else {
      const img = new Image();
      img.onload = () => done(img.naturalWidth, img.naturalHeight);
      img.onerror = () => done(0, 0);
      img.src = url;
    }
  });
}

function videoSeconds(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(file);
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration || 0);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    v.src = url;
  });
}

export function AdminStories({ initial, today, tester }: { initial: AdminStory[]; today: string; tester: boolean }) {
  const [stories, setStories] = useState(initial);
  const [day, setDay] = useState(today);
  const [form, setForm] = useState<Form | null>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const ofDay = useMemo(() => sortStories(stories.filter((s) => isStoryLive(s, day))), [stories, day]);
  const daysWithStories = useMemo(() => {
    const map = new Map<string, number>();
    for (let k = -3; k <= 14; k++) {
      const d = addDays(today, k);
      const n = stories.filter((s) => isStoryLive(s, d)).length;
      if (n || k === 0 || k === 1) map.set(d, n);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [stories, today]);

  async function refresh() {
    const { listStoriesAction } = await import('@/lib/actions/stories');
    const res = await listStoriesAction();
    if (res.ok) setStories(res.stories);
  }

  async function onFile(file: File) {
    if (!form) return;
    const isVideo = VIDEO_TYPES.includes(file.type);
    const isImage = IMAGE_TYPES.includes(file.type);
    if (form.kind === 'video' && !isVideo) return toast.error('Scegli un video MP4, WebM o MOV.');
    if (form.kind === 'foto' && !isImage) return toast.error('Scegli una foto JPG, PNG o WebP.');
    if (file.size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) return toast.error(isVideo ? 'Il video supera 20 MB.' : 'La foto supera 8 MB.');
    const { w, h } = await mediaSize(file, isVideo);
    if (!isStoryRatio(w, h)) return toast.error(`Formato non valido (${w}x${h}). Servono foto e video verticali 9:16, per esempio 1080x1920.`);
    if (isVideo) {
      const secs = await videoSeconds(file);
      if (secs > MAX_VIDEO_SECONDS + 0.5) return toast.error(`Il video dura ${Math.round(secs)} secondi: il massimo è ${MAX_VIDEO_SECONDS}.`);
    }
    setUploading(true);
    try {
      const { createStoryUploadAction } = await import('@/lib/actions/stories');
      const res = await createStoryUploadAction({ mime: file.type, size: file.size, width: w, height: h });
      if (!res.ok) return toast.error(res.error);
      const sb = createClient();
      if (!sb) return toast.error('Database non configurato.');
      const { error } = await sb.storage.from('storie').uploadToSignedUrl(res.path, res.token, file, { contentType: file.type });
      if (error) return toast.error('Caricamento non riuscito. Riprova.');
      setForm((f) => (f ? { ...f, media_path: res.path, mediaUrl: URL.createObjectURL(file) } : f));
      toast.success('File caricato');
    } finally {
      setUploading(false);
    }
  }

  function edit(s: AdminStory) {
    setForm({
      id: s.id,
      kind: s.kind,
      title: s.title ?? '',
      body: s.body ?? '',
      title_en: s.title_en ?? '',
      body_en: s.body_en ?? '',
      big_number: s.big_number ?? '',
      media_path: s.media_path,
      mediaUrl: s.mediaUrl,
      cta_label: s.cta_label ?? '',
      cta_label_en: s.cta_label_en ?? '',
      cta_href: s.cta_href ?? '',
      starts_on: s.starts_on,
      durata: !s.ends_on ? 'sempre' : s.ends_on === s.starts_on ? 'giorno' : 'fino',
      ends_on: s.ends_on ?? s.starts_on,
      has_release: s.has_release,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function save() {
    if (!form) return;
    const input: StoryInput = {
      id: form.id,
      kind: form.kind,
      title: form.title,
      body: form.body,
      title_en: form.title_en,
      body_en: form.body_en,
      big_number: form.big_number,
      media_path: form.media_path,
      cta_label: form.cta_label,
      cta_label_en: form.cta_label_en,
      cta_href: form.cta_href,
      starts_on: form.starts_on,
      ends_on: form.durata === 'sempre' ? null : form.durata === 'giorno' ? form.starts_on : form.ends_on,
      has_release: form.has_release,
    };
    start(async () => {
      const { saveStoryAction } = await import('@/lib/actions/stories');
      const res = await saveStoryAction(input);
      if (!res.ok) return void toast.error(res.error);
      toast.success(form.id ? 'Storia aggiornata' : 'Storia pubblicata');
      setDay(form.starts_on);
      setForm(null);
      await refresh();
    });
  }

  function remove(s: AdminStory) {
    if (!window.confirm('Eliminare questa storia? Anche il file viene cancellato.')) return;
    start(async () => {
      const { deleteStoryAction } = await import('@/lib/actions/stories');
      const res = await deleteStoryAction(s.id);
      if (!res.ok) return void toast.error(res.error);
      setStories((list) => list.filter((x) => x.id !== s.id));
      toast.success('Storia eliminata');
    });
  }

  function move(id: string, dir: -1 | 1) {
    const ids = moveInOrder(ofDay.map((s) => s.id), id, dir);
    const pos = new Map(ids.map((x, k) => [x, k]));
    setStories((list) => list.map((s) => (pos.has(s.id) ? { ...s, sort_order: pos.get(s.id)! } : s)));
    start(async () => {
      const { reorderStoriesAction } = await import('@/lib/actions/stories');
      const res = await reorderStoriesAction(ids);
      if (!res.ok) toast.error(res.error);
    });
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const media = form?.kind === 'foto' || form?.kind === 'video';
  const input = 'w-full border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-gold focus:outline-none';
  const label = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60';

  return (
    <div className="space-y-6">
      {/* Giorni */}
      <section className="border border-dashed border-gold/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {daysWithStories.map(([d, n]) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className={`inline-flex min-h-10 items-center gap-2 border px-3 text-sm transition ${d === day ? 'border-gold bg-gold text-black' : 'border-white/15 text-white/75 hover:border-gold/60'}`}
            >
              {d === today ? 'Oggi' : d === addDays(today, 1) ? 'Domani' : fmtDay(d)}
              <span className={`px-1.5 text-[11px] ${d === day ? 'bg-black/20' : 'bg-white/10'}`}>{n}</span>
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-xs text-white/60">
            Altro giorno
            <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className={`${input} w-auto`} />
          </label>
        </div>
      </section>

      {/* Modulo */}
      {form ? (
        <section className="space-y-4 border border-gold/40 bg-[#14120e] p-4 sm:p-5">
          <h2 className="font-display text-xl text-gold">{form.id ? 'Modifica storia' : 'Nuova storia'}</h2>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo di storia">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={form.kind === k.id}
                disabled={!!form.id}
                onClick={() => setForm({ ...form, kind: k.id, media_path: null, mediaUrl: null, has_release: false })}
                className={`inline-flex min-h-10 items-center gap-2 border px-3 text-sm transition disabled:opacity-60 ${form.kind === k.id ? 'border-gold bg-gold text-black' : 'border-white/15 text-white/75 hover:border-gold/60'}`}
              >
                <k.icon size={15} aria-hidden /> {k.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-white/50">{KINDS.find((k) => k.id === form.kind)?.hint}</p>

          {media && (
            <div className="space-y-3">
              <div role="note" className="flex items-start gap-3 border border-dashed border-gold bg-gold/10 p-3 text-sm text-white/90">
                <span className="mt-0.5 inline-flex h-12 w-7 shrink-0 items-center justify-center border-2 border-gold text-[10px] font-bold text-gold" aria-hidden>9:16</span>
                <span>
                  <strong className="block text-gold-light">Solo formato verticale 9:16</strong>
                  {form.kind === 'video' ? 'Il video deve essere verticale, come una storia di Instagram (es. 1080x1920), e durare al massimo 15 secondi.' : 'La foto deve essere verticale, come una storia di Instagram (es. 1080x1920).'} Foto e video in altri formati (quadrati, 4:5, orizzontali) vengono rifiutati.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex min-h-10 items-center gap-2 border border-gold/60 px-4 text-sm font-semibold text-gold-light hover:bg-gold/10 disabled:opacity-60">
                  <Upload size={15} aria-hidden /> {uploading ? 'Caricamento…' : form.media_path ? 'Cambia file' : form.kind === 'video' ? 'Scegli il video' : 'Scegli la foto'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  accept={(form.kind === 'video' ? VIDEO_TYPES : IMAGE_TYPES).join(',')}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void onFile(f);
                  }}
                />
                {form.mediaUrl && (
                  <span className="relative block h-28 w-16 overflow-hidden border border-white/15 bg-black">
                    {form.kind === 'video' ? (
                      <video src={form.mediaUrl} muted playsInline className="h-full w-full object-cover" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={form.mediaUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </span>
                )}
              </div>
              <label className="flex items-start gap-2 text-sm text-white/80">
                <input type="checkbox" checked={form.has_release} onChange={(e) => set('has_release', e.target.checked)} className="mt-1 accent-[#cd9a4f]" />
                <span>Non ci sono persone riconoscibili, oppure ho la <strong>liberatoria firmata</strong> di chi compare (obbligatorio).</span>
              </label>
            </div>
          )}

          {form.kind === 'numero' && (
            <div>
              <label className={label} htmlFor="st-num">Numero grande</label>
              <input id="st-num" className={input} maxLength={24} value={form.big_number} onChange={(e) => set('big_number', e.target.value)} placeholder="es. 1.200" />
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="st-title">Titolo {form.kind === 'testo' ? '(obbligatorio)' : '(facoltativo)'}</label>
              <input id="st-title" className={input} maxLength={90} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={form.kind === 'numero' ? 'es. Tagli fatti nel 2026' : 'es. Promo di novembre'} />
            </div>
            <div>
              <label className={label} htmlFor="st-body">Testo (facoltativo)</label>
              <input id="st-body" className={input} maxLength={280} value={form.body} onChange={(e) => set('body', e.target.value)} placeholder="Una o due frasi" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="st-cta">Pulsante (facoltativo)</label>
              <input id="st-cta" className={input} maxLength={30} value={form.cta_label} onChange={(e) => set('cta_label', e.target.value)} placeholder="es. Prenota" />
            </div>
            <div>
              <label className={label} htmlFor="st-href">Link del pulsante</label>
              <input id="st-href" className={input} maxLength={300} value={form.cta_href} onChange={(e) => set('cta_href', e.target.value)} placeholder="/prenota oppure https://…" />
            </div>
          </div>
          <details className="text-sm text-white/70">
            <summary className="cursor-pointer select-none text-white/60">Testi in inglese (facoltativi: se vuoti si usa l&apos;italiano)</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <input className={input} maxLength={90} value={form.title_en} onChange={(e) => set('title_en', e.target.value)} placeholder="Title" aria-label="Titolo in inglese" />
              <input className={input} maxLength={280} value={form.body_en} onChange={(e) => set('body_en', e.target.value)} placeholder="Text" aria-label="Testo in inglese" />
              <input className={input} maxLength={30} value={form.cta_label_en} onChange={(e) => set('cta_label_en', e.target.value)} placeholder="Button" aria-label="Pulsante in inglese" />
            </div>
          </details>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={label} htmlFor="st-from">Dal giorno</label>
              <input id="st-from" type="date" className={input} value={form.starts_on} onChange={(e) => set('starts_on', e.target.value)} />
            </div>
            <div>
              <label className={label} htmlFor="st-dur">Durata</label>
              <select id="st-dur" className={input} value={form.durata} onChange={(e) => set('durata', e.target.value as Form['durata'])}>
                <option value="giorno">Solo quel giorno</option>
                <option value="fino">Fino al giorno…</option>
                <option value="sempre">Finché non la tolgo</option>
              </select>
            </div>
            {form.durata === 'fino' && (
              <div>
                <label className={label} htmlFor="st-to">Fino al</label>
                <input id="st-to" type="date" className={input} min={form.starts_on} value={form.ends_on} onChange={(e) => set('ends_on', e.target.value)} />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={save} disabled={pending || uploading} className="inline-flex min-h-10 items-center gap-2 bg-gold px-5 text-sm font-bold uppercase tracking-wider text-black hover:bg-gold-light disabled:opacity-60">
              {pending ? 'Salvo…' : form.id ? 'Salva modifiche' : 'Pubblica'}
            </button>
            <button type="button" onClick={() => setForm(null)} className="inline-flex min-h-10 items-center border border-white/15 px-4 text-sm text-white/75 hover:border-white/40">
              Annulla
            </button>
          </div>
        </section>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setForm(blank(day))} className="inline-flex min-h-11 items-center gap-2 bg-gold px-5 text-sm font-bold uppercase tracking-wider text-black hover:bg-gold-light">
            <Plus size={16} aria-hidden /> Nuova storia
          </button>
          {ofDay.length > 0 && (
            <button type="button" onClick={() => setPreview(true)} className="inline-flex min-h-11 items-center gap-2 border border-gold/60 px-4 text-sm font-semibold text-gold-light hover:bg-gold/10">
              <Eye size={16} aria-hidden /> Anteprima del giorno
            </button>
          )}
        </div>
      )}

      {/* Storie del giorno */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/60">
          {day === today ? 'Oggi' : fmtDay(day)} · {ofDay.length} {ofDay.length === 1 ? 'storia' : 'storie'} in quest&apos;ordine
        </h2>
        {ofDay.length === 0 ? (
          <p className="border border-dashed border-white/15 p-6 text-center text-sm text-white/50">Nessuna storia per questo giorno.</p>
        ) : (
          <ol className="space-y-2">
            {ofDay.map((s, k) => (
              <li key={s.id} className="flex items-center gap-3 border border-white/10 bg-black/30 p-2 pr-3">
                <span className="w-6 text-center font-display text-gold">{k + 1}</span>
                <span className="relative block h-16 w-10 shrink-0 overflow-hidden border border-white/10 bg-black">
                  {s.kind === 'foto' && s.mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.mediaUrl} alt="" className="h-full w-full object-cover" />
                  ) : s.kind === 'video' && s.mediaUrl ? (
                    <video src={s.mediaUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full place-items-center px-0.5 text-center text-[10px] text-gold">{s.kind === 'numero' ? s.big_number : 'Aa'}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">{s.title || s.body || KINDS.find((x) => x.id === s.kind)?.label}</span>
                  <span className="block text-xs text-white/45">
                    {KINDS.find((x) => x.id === s.kind)?.label} · di {s.author} · {s.ends_on === s.starts_on ? 'solo ' + fmtDay(s.starts_on) : s.ends_on ? `${fmtDay(s.starts_on)} → ${fmtDay(s.ends_on)}` : `dal ${fmtDay(s.starts_on)}, senza fine`}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => move(s.id, -1)} disabled={k === 0 || pending} aria-label="Sposta su" className="grid h-9 w-9 place-items-center border border-white/10 text-white/70 hover:border-gold disabled:opacity-30">
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" onClick={() => move(s.id, 1)} disabled={k === ofDay.length - 1 || pending} aria-label="Sposta giù" className="grid h-9 w-9 place-items-center border border-white/10 text-white/70 hover:border-gold disabled:opacity-30">
                    <ArrowDown size={15} />
                  </button>
                  {s.canEdit && (
                    <>
                      <button type="button" onClick={() => edit(s)} aria-label="Modifica" className="grid h-9 w-9 place-items-center border border-white/10 text-white/70 hover:border-gold">
                        <Pencil size={15} />
                      </button>
                      <button type="button" onClick={() => remove(s)} aria-label="Elimina" className="grid h-9 w-9 place-items-center border border-white/10 text-white/70 hover:border-red-400 hover:text-red-300">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}
        {tester && <p className="mt-3 text-xs text-white/45">Come tester puoi caricare storie e cambiare l&apos;ordine. Modifichi ed elimini solo le tue.</p>}
      </section>

      {preview && (
        <StoriesViewer
          groups={[{ id: 'anteprima', label: 'Anteprima', slides: ofDay.map((s) => toSlide(s, 'it', s.mediaUrl)) }]}
          startGroup={0}
          lang="it"
          onClose={() => setPreview(false)}
          onSeen={() => {}}
        />
      )}
    </div>
  );
}
