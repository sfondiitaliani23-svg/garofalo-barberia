'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { ensureProfileForAuthUser } from '@/lib/auth/ensure-profile';

/**
 * Crea una sessione di login QR temporanea nel database.
 */
export async function createQrSession() {
  const supabase = await createServiceClient();
  if (!supabase) return { error: 'Database non configurato' };

  const { data, error } = await supabase
    .from('qr_login_sessions')
    .insert({})
    .select('id')
    .single();

  if (error) {
    console.error('Errore durante la creazione della sessione QR:', error);
    return { error: 'Impossibile inizializzare la sessione QR' };
  }

  return { id: data.id };
}

/**
 * Controlla lo stato della sessione QR dal PC.
 */
export async function checkQrSessionStatus(sessionId: string) {
  const supabase = await createServiceClient();
  if (!supabase) return { status: 'error', error: 'Database non configurato' };

  const { data, error } = await supabase
    .from('qr_login_sessions')
    .select('status, access_token, refresh_token')
    .eq('id', sessionId)
    .single();

  if (error) {
    return { status: 'expired' };
  }

  return {
    status: data.status,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

/**
 * Associa i token di autenticazione del telefono alla sessione QR del PC.
 */
export async function authenticateQrSession(
  sessionId: string,
  accessToken: string,
  refreshToken: string
) {
  const supabase = await createServiceClient();
  if (!supabase) return { error: 'Database non configurato' };

  // Verifica la validità dei token dell'utente su Supabase Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return { error: 'Token utente non valido o sessione scaduta.' };
  }

  // Estrapola e registra il profilo cliente nel database dei clienti (profiles)
  await ensureProfileForAuthUser(user);

  // Aggiorna lo stato della sessione QR a 'authenticated'
  const { error: updateError } = await supabase
    .from('qr_login_sessions')
    .update({
      status: 'authenticated',
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    .eq('id', sessionId);

  if (updateError) {
    console.error('Errore durante l\'aggiornamento della sessione QR:', updateError);
    return { error: 'Errore di collegamento della sessione' };
  }

  return { ok: true };
}
