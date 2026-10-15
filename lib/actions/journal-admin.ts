'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin, requireAdminView } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { getAllArticles, type AdminArticle } from '@/lib/data/journal-store';
import { blocksToText, readMinutes, slugify, textToBlocks } from '@/lib/data/journal-text';



export async function getAdminArticlesAction(): Promise<AdminArticle[]> {
  await requireAdminView();
  const all = await getAllArticles({ includeDrafts: true, fresh: true });
  return all.map((a) => ({
    slug: a.slug,
    title: a.title,
    description: a.description,
    category: a.category,
    date: a.date,
    image: a.image,
    imageAlt: a.imageAlt,
    text: a.text ?? blocksToText(a.blocks),
    published: a.published,
    source: a.source,
  }));
}

function refresh(slug?: string) {
  revalidateTag('journal');
  revalidatePath('/journal');
  if (slug) revalidatePath(`/journal/${slug}`);
  revalidatePath('/sitemap.xml');
  revalidatePath('/llms.txt');
}

export async function saveArticleAction(input: {
  originalSlug?: string | null;
  title: string;
  description: string;
  category: string;
  image: string;
  imageAlt?: string;
  text: string;
  published: boolean;
}): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  await requireAdmin();
  const title = input.title.trim().slice(0, 120);
  const description = input.description.trim().slice(0, 220);
  const text = input.text.trim().slice(0, 20000);
  if (title.length < 5) return { ok: false, error: 'Scrivi un titolo (almeno 5 caratteri).' };
  if (description.length < 20) return { ok: false, error: 'Scrivi una breve descrizione (almeno 20 caratteri): compare su Google.' };
  if (text.length < 80) return { ok: false, error: 'Il testo è troppo corto.' };
  const image = input.image.trim();
  if (!image) return { ok: false, error: 'Scegli una foto di copertina.' };
  if (image.startsWith('data:') && image.length > 450_000) return { ok: false, error: 'La foto è troppo pesante. Scegline una più piccola.' };
  if (!image.startsWith('data:image/') && !image.startsWith('/')) return { ok: false, error: 'Foto non valida.' };

  const slug = input.originalSlug || slugify(title);
  if (!slug) return { ok: false, error: 'Titolo non valido.' };

  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato' };

  // Nuovo articolo: l'indirizzo non deve esistere già.
  if (!input.originalSlug) {
    const existing = await getAllArticles({ includeDrafts: true, fresh: true });
    if (existing.some((a) => a.slug === slug)) return { ok: false, error: 'Esiste già un articolo con questo titolo. Cambia il titolo.' };
  }

  const blocks = textToBlocks(text);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Rome' });
  const prev = (await getAllArticles({ includeDrafts: true, fresh: true })).find((a) => a.slug === slug);
  const body = {
    title,
    description,
    category: input.category.trim().slice(0, 30) || 'Consigli',
    date: prev?.date ?? today,
    readMinutes: readMinutes(blocks),
    image,
    imageAlt: (input.imageAlt ?? '').trim().slice(0, 120) || title,
    cta: prev?.cta ?? { href: '/prenota', label: 'Prenota il tuo appuntamento' },
    blocks,
    text,
    published: input.published,
  };

  const key = `journal:${slug}`;
  const { data: row } = await supabase.from('site_content').select('id').eq('key', key).maybeSingle();
  const payload = { key, title, body: JSON.stringify(body), is_active: false, updated_at: new Date().toISOString() };
  const { error } = row
    ? await supabase.from('site_content').update(payload).eq('id', row.id)
    : await supabase.from('site_content').insert(payload);
  if (error) return { ok: false, error: 'Salvataggio non riuscito. Riprova.' };

  refresh(slug);
  return { ok: true, slug };
}

/** Elimina un articolo scritto dall'admin. Su un articolo di base, ripristina il testo originale. */
export async function deleteArticleAction(slug: string): Promise<{ ok: boolean }> {
  await requireAdmin();
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false };
  const { error } = await supabase.from('site_content').delete().eq('key', `journal:${slug}`);
  refresh(slug);
  return { ok: !error };
}
