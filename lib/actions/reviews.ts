'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath, unstable_cache } from 'next/cache';

export interface CreateReviewInput {
  customerName: string;
  rating: number;
  comment: string;
  authorizedByCustomer: boolean;
}

const getCachedReviews = unstable_cache(
  async () => {
    try {
      const client = (await createServiceClient()) ?? (
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? (await import('@supabase/supabase-js')).createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            )
          : null
      );
      if (!client) return [];

      const { data, error } = await client
        .from('reviews')
        .select('comment, customer_name, rating, created_at')
        .eq('authorized_by_customer', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        return [];
      }

      return data || [];
    } catch {
      return [];
    }
  },
  ['approved-reviews-list'],
  { revalidate: 60, tags: ['reviews'] }
);

export async function getApprovedReviews() {
  return getCachedReviews();
}

export async function createReview(input: CreateReviewInput) {
  try {
    const supabase = await createClient();
    if (!supabase) return { ok: false, error: 'Database non configurato' };

    const customerName = input.customerName?.trim();
    const comment = input.comment?.trim();

    if (!customerName || !comment) {
      return { ok: false, error: 'Compila tutti i campi obbligatori' };
    }

    if (input.rating < 1 || input.rating > 5) {
      return { ok: false, error: 'La valutazione deve essere compresa tra 1 e 5 stelle' };
    }

    const { error } = await supabase
      .from('reviews')
      .insert({
        customer_name: customerName,
        rating: input.rating,
        comment: comment,
        authorized_by_customer: input.authorizedByCustomer,
      });

    if (error) {
      console.error('Errore inserimento recensione:', error);
      return { ok: false, error: 'Errore durante l\'inserimento della recensione.' };
    }

    revalidatePath('/');
    return { ok: true };
  } catch (err: any) {
    console.error('Eccezione inserimento recensione:', err);
    return { ok: false, error: err.message || 'Errore imprevisto' };
  }
}

export interface ReviewStats {
  total: number;
  average: number;
  /** Percentuale di recensioni con 4 o 5 stelle. */
  satisfiedPercent: number;
}

const getCachedReviewStats = unstable_cache(
  async (): Promise<ReviewStats> => {
    const empty = { total: 0, average: 0, satisfiedPercent: 0 };
    try {
      const client = (await createServiceClient()) ?? (
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? (await import('@supabase/supabase-js')).createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            )
          : null
      );
      if (!client) return empty;

      const { data, error } = await client
        .from('reviews')
        .select('rating')
        .eq('authorized_by_customer', true);

      if (error || !data || data.length === 0) return empty;

      const ratings = data.map((r) => Number(r.rating) || 0).filter((r) => r >= 1 && r <= 5);
      if (ratings.length === 0) return empty;
      const sum = ratings.reduce((a, b) => a + b, 0);
      const satisfied = ratings.filter((r) => r >= 4).length;
      return {
        total: ratings.length,
        average: Math.round((sum / ratings.length) * 10) / 10,
        satisfiedPercent: Math.round((satisfied / ratings.length) * 100),
      };
    } catch {
      return empty;
    }
  },
  ['approved-reviews-stats'],
  { revalidate: 60, tags: ['reviews'] }
);

/** Numeri reali su tutte le recensioni pubblicate (non solo le ultime 20). */
export async function getReviewStats() {
  return getCachedReviewStats();
}
