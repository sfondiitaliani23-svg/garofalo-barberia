'use client';

import { useMemo, useState, useTransition } from 'react';
import Image from 'next/image';
import { ExternalLink, Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminArticle } from '@/lib/data/journal-store';
import { GALLERY_IMAGES } from '@/lib/data/gallery';
import { JOURNAL } from '@/lib/data/journal';

const CATEGORIES = ['Capelli', 'Barba', 'Bambini', 'Consigli', 'Novità'];
const BASE_SLUGS = new Set(JOURNAL.map((a) => a.slug));
const COVERS = [
  ...GALLERY_IMAGES.filter((g) => g.category !== 'bimbo').map((g) => ({ src: g.src, alt: g.alt })),
  { src: '/assets/sostituisci-immagini/homepage/3.jpg', alt: 'Il salone' },
];

type Form = {
  originalSlug: string | null;
  title: string;
  description: string;
  category: string;
  image: string;
  imageAlt: string;
  text: string;
  published: boolean;
};

const EMPTY: Form = {
  originalSlug: null,
  title: '',
  description: '',
  category: 'Consigli',
  image: '',
  imageAlt: '',
  text: 'Scrivi qui l’introduzione.\n\n## Primo titoletto\nUn paragrafo di testo.\n\n- primo punto\n- secondo punto\n\n> Un consiglio da evidenziare.',
  published: false,
};

function compress(file: File, max = 1200, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('img'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(file);
  });
}

const dateIt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

export function AdminJournalManager({ articles: initial }: { articles: AdminArticle[] }) {
  const [articles, setArticles] = useState(initial);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(
    () => ({ pub: articles.filter((a) => a.published).length, draft: articles.filter((a) => !a.published).length }),
    [articles]
  );

  async function reload() {
    const { getAdminArticlesAction } = await import('@/lib/actions/journal-admin');
    setArticles(await getAdminArticlesAction());
  }

  function edit(a: AdminArticle) {
    setError(null);
    setForm({ originalSlug: a.slug, title: a.title, description: a.description, category: a.category, image: a.image, imageAlt: a.imageAlt, text: a.text, published: a.published });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function save(publish?: boolean) {
    if (!form) return;
    setError(null);
    const data = { ...form, published: publish ?? form.published };
    start(async () => {
      const { saveArticleAction } = await import('@/lib/actions/journal-admin');
      const res = await saveArticleAction(data);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(data.published ? 'Articolo pubblicato' : 'Bozza salvata');
      setForm(null);
      await reload();
    });
  }

  function remove(a: AdminArticle) {
    const base = BASE_SLUGS.has(a.slug);
    if (!window.confirm(base ? 'Ripristinare il testo originale di questo articolo?' : 'Eliminare definitivamente questo articolo?')) return;
    start(async () => {
      const { deleteArticleAction } = await import('@/lib/actions/journal-admin');
      const res = await deleteArticleAction(a.slug);
      if (!res.ok) toast.error('Operazione non riuscita');
      await reload();
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !form) return;
    try {
      const dataUrl = await compress(file);
      setForm({ ...form, image: dataUrl, imageAlt: form.imageAlt || form.title });
    } catch {
      toast.error('Foto non leggibile');
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase text-white">Journal</h1>
          <p className="mt-1 text-sm text-white/50">
            Articoli e consigli del salone. {counts.pub} pubblicati · {counts.draft} bozze.
          </p>
        </div>
        {!form && (
          <button onClick={() => { setError(null); setForm({ ...EMPTY }); }} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gold px-4 text-sm font-semibold text-black">
            <Plus size={16} aria-hidden /> Nuovo articolo
          </button>
        )}
      </header>

      {form && (
        <section className="rounded-xl border border-gold/30 bg-[#0e0e0e] p-5" aria-label="Editor articolo">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-white">{form.originalSlug ? 'Modifica articolo' : 'Nuovo articolo'}</h2>
            <button onClick={() => setForm(null)} className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Chiudi editor">
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              <Field label="Titolo" hint="Breve e chiaro, come una domanda che un cliente fa.">
                <input value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-dark" placeholder="Es. Come mantenere la sfumatura più a lungo" />
              </Field>
              <Field label="Descrizione" hint={`Compare su Google e nell’elenco. ${form.description.length}/220`}>
                <textarea value={form.description} maxLength={220} rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-dark" />
              </Field>
              <Field label="Testo" hint="Riga vuota = nuovo paragrafo · ## Titoletto · - Elenco · > Consiglio evidenziato">
                <textarea value={form.text} rows={16} onChange={(e) => setForm({ ...form, text: e.target.value })} className="input-dark font-mono text-[13px] leading-relaxed" />
              </Field>
            </div>

            <div className="space-y-4">
              <Field label="Categoria">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-dark">
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-white/70">Foto di copertina</p>
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-white/10 bg-black">
                  {form.image ? (
                    <Image src={form.image} alt={form.imageAlt || 'Copertina'} fill sizes="280px" className="object-cover" unoptimized={form.image.startsWith('data:')} />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-xs text-white/40">Nessuna foto</span>
                  )}
                </div>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-gold/60">
                  <ImagePlus size={14} aria-hidden /> Carica una foto
                  <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                </label>
                <p className="mt-3 mb-1.5 text-[11px] text-white/45">Oppure scegli dalla galleria:</p>
                <div className="grid max-h-44 grid-cols-4 gap-1.5 overflow-y-auto pr-1">
                  {COVERS.map((c) => (
                    <button
                      key={c.src}
                      type="button"
                      onClick={() => setForm({ ...form, image: c.src, imageAlt: c.alt })}
                      className={`relative aspect-square overflow-hidden rounded-md border ${form.image === c.src ? 'border-gold ring-1 ring-gold' : 'border-white/10'}`}
                      aria-label={c.alt}
                    >
                      <Image src={c.src} alt="" fill sizes="64px" className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-300" role="alert">{error}</p>}

          <div className="mt-5 flex flex-wrap gap-2">
            <button disabled={saving} onClick={() => save(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gold px-5 text-sm font-semibold text-black disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" aria-hidden />} Pubblica
            </button>
            <button disabled={saving} onClick={() => save(false)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-white/85 disabled:opacity-50">
              Salva come bozza
            </button>
          </div>
        </section>
      )}

      <ul className="space-y-2">
        {articles.map((a) => (
          <li key={a.slug} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0e0e0e] p-3">
            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-black">
              <Image src={a.image} alt="" fill sizes="80px" className="object-cover" unoptimized={a.image.startsWith('data:')} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{a.title}</p>
              <p className="text-xs text-white/45">
                {a.category} · {dateIt(a.date)} ·{' '}
                {a.published ? <span className="text-emerald-400">Pubblicato</span> : <span className="text-amber-300">Bozza</span>}
                {a.source === 'admin' && BASE_SLUGS.has(a.slug) && <span className="text-white/35"> · modificato</span>}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {a.published && (
                <a href={`/journal/${a.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-md p-2 text-white/55 hover:bg-white/10 hover:text-white" aria-label="Apri sul sito">
                  <ExternalLink size={15} />
                </a>
              )}
              <button onClick={() => edit(a)} className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Modifica">
                <Pencil size={15} />
              </button>
              <button
                onClick={() => {
                  setForm(null);
                  start(async () => {
                    const { saveArticleAction } = await import('@/lib/actions/journal-admin');
                    const res = await saveArticleAction({ ...a, originalSlug: a.slug, published: !a.published });
                    if (!res.ok) toast.error(res.error);
                    else toast.success(a.published ? 'Articolo nascosto' : 'Articolo pubblicato');
                    await reload();
                  });
                }}
                className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
                aria-label={a.published ? 'Nascondi dal sito' : 'Pubblica'}
              >
                {a.published ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              {a.source === 'admin' && (
                <button onClick={() => remove(a)} className="rounded-md p-2 text-red-400/80 hover:bg-red-500/10 hover:text-red-400" aria-label={BASE_SLUGS.has(a.slug) ? 'Ripristina originale' : 'Elimina'}>
                  {BASE_SLUGS.has(a.slug) ? <RotateCcw size={15} /> : <Trash2 size={15} />}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-white/70">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-white/40">{hint}</span>}
    </label>
  );
}
