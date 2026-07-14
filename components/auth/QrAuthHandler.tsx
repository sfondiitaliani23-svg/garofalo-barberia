'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { authenticateQrSession } from '@/lib/actions/qr-auth';
import { LoginForm } from '@/components/auth/LoginForm';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function QrAuthHandler({
  sessionId,
  authConfigured,
}: {
  sessionId?: string;
  authConfigured: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setErrorMsg('ID della sessione mancante o non valido.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setErrorMsg('Client database non configurato.');
      setLoading(false);
      return;
    }

    // Controlla se l'utente è già loggato sul telefono
    async function checkCurrentSession() {
      try {
        const { data: { session } } = await supabase!.auth.getSession();
        if (session) {
          // Se è loggato, autorizziamo subito la sessione sul PC
          const res = await authenticateQrSession(
            sessionId!,
            session.access_token,
            session.refresh_token
          );
          if (res.ok) {
            setSuccess(true);
            toast.success('Accesso autorizzato sul computer!');
          } else {
            setErrorMsg(res.error || 'Errore di autorizzazione.');
          }
        }
      } catch (err: any) {
        console.error('QR checkCurrentSession error:', err);
      } finally {
        setLoading(false);
      }
    }

    // Ascolta anche gli eventi di login (se l'utente esegue il login adesso sul telefono)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
          setLoading(true);
          const res = await authenticateQrSession(
            sessionId!,
            session.access_token,
            session.refresh_token
          );
          if (res.ok) {
            setSuccess(true);
            toast.success('Accesso autorizzato sul computer!');
          } else {
            setErrorMsg(res.error || 'Errore di autorizzazione.');
          }
          setLoading(false);
        }
      }
    );

    void checkCurrentSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <Card className="w-full max-w-md border border-red-500/20 bg-[#111] p-6 text-center">
        <p className="text-red-400">QR Code non valido o sessione scaduta. Scansiona di nuovo il codice dal tuo computer.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md border border-white/10 bg-[#111] p-8 text-center flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p className="text-sm text-white/60">Verifica della sessione in corso...</p>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md border border-gold/25 bg-[#111] p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gold" />
        <CardHeader>
          <CardTitle className="text-2xl text-gold font-display uppercase">Accesso Completato!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/80">
            La sessione sul tuo computer è stata autorizzata con successo. Ora puoi utilizzare il computer!
          </p>
          <p className="text-xs text-white/40">
            Puoi chiudere questa scheda del telefono o andare alla tua area riservata cliccando qui sotto.
          </p>
          <Button
            onClick={() => router.push('/area-cliente/dashboard')}
            className="w-full bg-gold hover:bg-gold-light text-black py-4 font-semibold rounded-full mt-2"
          >
            Vai alla mia Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (errorMsg) {
    return (
      <Card className="w-full max-w-md border border-red-500/30 bg-[#111] p-6 text-center space-y-4">
        <p className="text-red-400 text-sm">{errorMsg}</p>
        <Button
          onClick={() => {
            setErrorMsg('');
            setLoading(true);
            router.refresh();
          }}
          className="bg-white/10 hover:bg-white/20 text-white rounded-full text-xs py-2 px-4"
        >
          Riprova
        </Button>
      </Card>
    );
  }

  // Se non è loggato sul telefono, gli mostriamo il LoginForm standard sul telefono!
  return (
    <div className="w-full max-w-md space-y-4">
      <div className="rounded-lg border border-gold/30 bg-gold/10 p-4 text-center">
        <p className="text-xs font-semibold text-gold uppercase tracking-wider">
          📲 Autorizzazione computer richiesta
        </p>
        <p className="text-[11px] text-white/70 mt-1">
          Accedi qui sotto sul tuo smartphone per sbloccare automaticamente la sessione anche sul tuo computer.
        </p>
      </div>
      <LoginForm authConfigured={authConfigured} qrSessionId={sessionId} />
    </div>
  );
}
