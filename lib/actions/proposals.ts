'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminView, requireFullAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

const PREFIX = 'proposal:';
const STATUSES = ['nuova', 'in_valutazione', 'accettata', 'non_ora'] as const;
export type ProposalStatus = (typeof STATUSES)[number];

export interface SiteProposal {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  reply: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredProposal {
  description: string;
  status: ProposalStatus;
  reply: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

function parseStatus(value: unknown): ProposalStatus {
  return STATUSES.includes(value as ProposalStatus) ? (value as ProposalStatus) : 'nuova';
}

export async function listProposals(): Promise<SiteProposal[]> {
  await requireAdminView();
  const supabase = await createServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from('site_content')
    .select('key, title, body, updated_at')
    .like('key', `${PREFIX}%`)
    .order('updated_at', { ascending: false })
    .limit(200);
  return (data ?? []).map((row) => {
    let stored: Partial<StoredProposal> = {};
    try {
      stored = JSON.parse(row.body || '{}') as Partial<StoredProposal>;
    } catch {
      stored = {};
    }
    return {
      id: String(row.key).slice(PREFIX.length),
      title: row.title || 'Proposta',
      description: stored.description || '',
      status: parseStatus(stored.status),
      reply: stored.reply || '',
      authorId: stored.authorId || '',
      authorName: stored.authorName || 'Tester',
      createdAt: stored.createdAt || row.updated_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function createProposal(input: { title: string; description: string }): Promise<{ ok: boolean; error?: string }> {
  const { profile, tester } = await requireAdminView();
  if (!tester) return { ok: false, error: 'Solo un tester può proporre una novità.' };
  const title = input.title.trim().slice(0, 120);
  const description = input.description.trim().slice(0, 4000);
  if (title.length < 3 || description.length < 10) {
    return { ok: false, error: 'Scrivi un titolo e una descrizione di almeno qualche riga.' };
  }
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  const id = crypto.randomUUID();
  const body: StoredProposal = {
    description,
    status: 'nuova',
    reply: '',
    authorId: profile.id,
    authorName: profile.full_name?.trim() || profile.email || 'Tester',
    createdAt: new Date().toISOString(),
  };
  const { error } = await supabase.from('site_content').insert({
    key: `${PREFIX}${id}`,
    title,
    body: JSON.stringify(body),
    is_active: false,
  });
  if (error) return { ok: false, error: 'Non sono riuscito a salvare la proposta.' };
  revalidatePath('/admin/proposte');
  return { ok: true };
}

export async function reviewProposal(input: {
  id: string;
  status: ProposalStatus;
  reply: string;
}): Promise<{ ok: boolean; error?: string }> {
  await requireFullAdmin();
  if (!STATUSES.includes(input.status)) return { ok: false, error: 'Stato non valido.' };
  const supabase = await createServiceClient();
  if (!supabase) return { ok: false, error: 'Database non configurato.' };
  const key = `${PREFIX}${input.id}`;
  const { data } = await supabase.from('site_content').select('body').eq('key', key).maybeSingle();
  if (!data) return { ok: false, error: 'Proposta non trovata.' };
  let stored: StoredProposal;
  try {
    stored = JSON.parse(data.body || '{}') as StoredProposal;
  } catch {
    return { ok: false, error: 'Proposta non leggibile.' };
  }
  stored.status = input.status;
  stored.reply = input.reply.trim().slice(0, 2000);
  const { error } = await supabase.from('site_content').update({ body: JSON.stringify(stored), updated_at: new Date().toISOString() }).eq('key', key);
  if (error) return { ok: false, error: 'Non sono riuscito a aggiornare la proposta.' };
  revalidatePath('/admin/proposte');
  return { ok: true };
}
