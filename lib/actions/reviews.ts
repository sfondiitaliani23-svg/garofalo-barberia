'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface CreateReviewInput {
  customerName: string;
  rating: number;
  comment: string;
  authorizedByCustomer: boolean;
}

export async function getApprovedReviews() {
  try {
    const supabase = await createClient();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('reviews')
      .select('comment, customer_name, rating, created_at')
      .eq('authorized_by_customer', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Errore durante il recupero delle recensioni:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Eccezione durante il recupero delle recensioni:', err);
    return [];
  }
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
