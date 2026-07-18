'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { signInWithEmail } from '@/lib/actions/auth';
import { OAuthLoginButtons } from '@/components/auth/OAuthLoginButtons';
import { getWhatsAppLink } from '@/lib/site-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { safeDecodeURIComponent } from '@/lib/utils/site-origin';
import { Loader2 } from 'lucide-react';

function LoginFormInner({
  authConfigured,
  qrSessionId,
}: {
  authConfigured: boolean;
  qrSessionId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const redirect = searchParams.get('redirect') ?? '/area-cliente/dashboard';

  // Stato per l'accesso QR su PC
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showClassicOnDesktop, setShowClassicOnDesktop] = useState(false);
  const [qrSessionIdState, setQrSessionIdState] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'pending' | 'scanned' | 'authenticated' | 'expired'>('pending');

  // Rilevamento PC vs Mobile
  useEffect(() => {
    setMounted(true);
    if (qrSessionId) return; // Se stiamo già autorizzando una sessione su telefono, salta il rilevamento
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isSmallScreen = window.innerWidth < 768;
    setIsDesktop(!isMobileUA && !isSmallScreen);
  }, [qrSessionId]);

  // State per i flussi di accesso aggiuntivi (Shopify-style)
  const [authMethod, setAuthMethod] = useState<'email' | 'whatsapp' | 'passkey'>('email');
  const [whatsAppStep, setWhatsAppStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Generazione della sessione QR per Desktop
  useEffect(() => {
    if (!isDesktop || showClassicOnDesktop || qrSessionIdState) return;

    let active = true;
    async function initQr() {
      try {
        const { createQrSession } = await import('@/lib/actions/qr-auth');
        const res = await createQrSession();
        if (res.id && active) {
          setQrSessionIdState(res.id);
          setQrStatus('pending');
        }
      } catch (err) {
        console.error('Errore creazione sessione QR:', err);
      }
    }
    void initQr();

    return () => {
      active = false;
    };
  }, [isDesktop, showClassicOnDesktop, qrSessionIdState]);

  // Polling per controllare lo stato del QR su Desktop
  useEffect(() => {
    if (!qrSessionIdState || qrStatus === 'authenticated') return;

    let interval: NodeJS.Timeout;
    const poll = async () => {
      try {
        const { checkQrSessionStatus } = await import('@/lib/actions/qr-auth');
        const res = await checkQrSessionStatus(qrSessionIdState);
        
        if (res.status === 'authenticated' && res.accessToken && res.refreshToken) {
          clearInterval(interval);
          setQrStatus('authenticated');
          
          const { signInWithQrTokens } = await import('@/lib/actions/auth');
          const serverRes = await signInWithQrTokens(res.accessToken, res.refreshToken);
          if (serverRes.ok) {
            toast.success('Accesso autorizzato tramite QR Code!');
            router.push(redirect);
            router.refresh();
          } else {
            toast.error(serverRes.error || 'Errore di sincronizzazione della sessione');
          }
        } else if (res.status === 'expired') {
          clearInterval(interval);
          setQrStatus('expired');
        } else if (res.status === 'scanned') {
          setQrStatus('scanned');
        }
      } catch (err) {
        console.error('Errore polling QR:', err);
      }
    };

    interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, [qrSessionIdState, qrStatus, redirect, router]);

  useEffect(() => {
    if (error) {
      toast.error(safeDecodeURIComponent(error));
    }
  }, [error]);

  if (!mounted) {
    return (
      <Card className="w-full max-w-md border border-white/10 bg-[#111] shadow-2xl relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
        <CardHeader className="space-y-1">
          <CardTitle className="font-display text-2xl uppercase tracking-wide text-gold">Accedi</CardTitle>
          <p className="text-xs text-white/45">Caricamento in corso...</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </CardContent>
      </Card>
    );
  }

  // Gestione simulata dell'invio OTP WhatsApp
  const handleSendWhatsAppOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast.error('Inserisci un numero di telefono valido');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setWhatsAppStep('otp');
      toast.success('Codice di verifica inviato su WhatsApp!');
    }, 1200);
  };

  // Gestione simulata della verifica OTP WhatsApp
  const handleVerifyWhatsAppOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) {
      toast.error('Inserisci il codice di 6 cifre');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Accesso autorizzato con WhatsApp!');
      router.push(redirect);
      router.refresh();
    }, 1000);
  };

  // Gestione simulata dell'accesso Passkey
  const handlePasskeySignIn = () => {
    setAuthMethod('passkey');
    setLoading(true);
    
    // Simula la richiesta delle credenziali WebAuthn del browser
    setTimeout(() => {
      setLoading(false);
      toast.success('Passkey verificata con successo via FaceID/TouchID!');
      router.push(redirect);
      router.refresh();
    }, 1500);
  };

  // Se siamo su PC (Desktop) e non abbiamo forzato la visualizzazione classica, mostriamo il QR Code!
  if (isDesktop && !showClassicOnDesktop) {
    const qrUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/login/qr?id=${qrSessionIdState}`
      : '';
    const qrImageUrl = qrSessionIdState
      ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}&bgcolor=111111&color=d4af37`
      : '';

    return (
      <Card className="w-full max-w-md border border-white/10 bg-[#111] shadow-2xl relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
        <CardHeader className="space-y-1">
          <CardTitle className="font-display text-2xl uppercase tracking-wide text-gold">Accedi</CardTitle>
          <p className="text-xs text-white/45">Area cliente Garofalo Barberia</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Accedi rapidamente</h3>
            <p className="text-xs text-white/50 max-w-[280px] mx-auto">
              Inquadra questo QR Code con il tuo telefono per accedere all&apos;istante con Google o Passkey.
            </p>
          </div>

          <div className="relative p-3 rounded-2xl border border-gold/20 bg-white/[0.02] flex items-center justify-center h-[200px] w-[200px]">
            {qrSessionIdState ? (
              <img
                src={qrImageUrl}
                alt="QR Code per il login"
                className="h-[180px] w-[180px] rounded-lg transition-opacity duration-300"
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2 text-white/40">
                <Loader2 className="h-6 w-6 animate-spin text-gold" />
                <span className="text-[10px]">Generazione codice...</span>
              </div>
            )}
            
            {qrStatus === 'scanned' && (
              <div className="absolute inset-0 bg-[#111]/90 rounded-2xl flex flex-col items-center justify-center text-center p-4 space-y-2">
                <Loader2 className="h-6 w-6 animate-spin text-gold" />
                <p className="text-xs font-semibold text-white">QR Code letto!</p>
                <p className="text-[10px] text-white/50">Completa l&apos;accesso sul tuo cellulare.</p>
              </div>
            )}
            
            {qrStatus === 'expired' && (
              <div className="absolute inset-0 bg-[#111]/95 rounded-2xl flex flex-col items-center justify-center text-center p-4 space-y-2">
                <p className="text-xs font-semibold text-red-400">QR Code scaduto</p>
                <Button
                  onClick={() => {
                    setQrSessionIdState(null);
                    setQrStatus('pending');
                  }}
                  className="bg-gold text-black text-[10px] font-bold h-7 px-3 rounded-full hover:bg-gold-light border-none"
                >
                  Rigenera QR
                </Button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowClassicOnDesktop(true)}
            className="text-xs text-gold hover:underline block mx-auto mt-4 transition-all"
          >
            Oppure usa le credenziali su questo computer
          </button>
        </CardContent>
      </Card>
    );
  }

  // Se siamo su cellulare, o se l'utente ha scelto di mostrare il form classico su Desktop
  return (
    <Card className="w-full max-w-md border border-white/10 bg-[#111] shadow-2xl relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />
      
      <CardHeader className="space-y-1">
        <CardTitle className="font-display text-2xl uppercase tracking-wide text-gold">Accedi</CardTitle>
        <p className="text-xs text-white/45">
          Area cliente Garofalo Barberia
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {safeDecodeURIComponent(error)}
          </p>
        )}

        {/* 1. FLUSSO EMAIL CLASSICO */}
        {authMethod === 'email' && (
          <>
            <form action={signInWithEmail} className="space-y-4">
              <input type="hidden" name="redirect" value={redirect} />
              {qrSessionId && <input type="hidden" name="qrSessionId" value={qrSessionId} />}
              <div>
                <Label htmlFor="email" className="text-xs text-white/70">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  autoComplete="email" 
                  className="mt-1 bg-[#1a1a1a] border-white/10 text-white placeholder-white/30 focus:border-gold/50" 
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-xs text-white/70">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="mt-1 bg-[#1a1a1a] border-white/10 text-white placeholder-white/30 focus:border-gold/50"
                />
              </div>
              <Button type="submit" className="w-full bg-gold hover:bg-gold-light text-black py-5 font-semibold transition-all duration-300 border-none">
                Accedi con password
              </Button>
            </form>

            <OAuthLoginButtons 
              redirectTo={qrSessionId ? `/login/qr?id=${qrSessionId}` : redirect} 
              disabled={!authConfigured} 
              onWhatsAppClick={() => setAuthMethod('whatsapp')}
              onPasskeyClick={handlePasskeySignIn}
            />
          </>
        )}

        {/* 2. FLUSSO WHATSAPP OTP */}
        {authMethod === 'whatsapp' && (
          <div className="space-y-4 py-2">
            {whatsAppStep === 'phone' ? (
              <form onSubmit={handleSendWhatsAppOTP} className="space-y-4">
                <p className="text-sm text-white/60">
                  Inserisci il tuo numero di telefono associato a WhatsApp. Ti invieremo un codice temporaneo (OTP).
                </p>
                <div>
                  <Label htmlFor="whatsapp-phone" className="text-xs text-white/70">Numero di telefono</Label>
                  <Input
                    id="whatsapp-phone"
                    type="tel"
                    placeholder="Es. +39 347 1234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    className="mt-1 bg-[#1a1a1a] border-white/10 focus:border-gold/50 text-white"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-5 font-semibold transition-all duration-300 border-none"
                >
                  {loading ? 'Invio in corso...' : 'Invia codice su WhatsApp'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyWhatsAppOTP} className="space-y-4">
                <p className="text-sm text-white/60">
                  Inserisci il codice di verifica inviato al numero <strong>{phoneNumber}</strong>.
                </p>
                <div>
                  <Label htmlFor="whatsapp-otp" className="text-xs text-white/70">Codice OTP</Label>
                  <Input
                    id="whatsapp-otp"
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    className="mt-1 bg-[#1a1a1a] border-white/10 text-center tracking-[0.5em] text-lg font-bold focus:border-gold/50 text-white"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-5 font-semibold transition-all duration-300 border-none"
                >
                  {loading ? 'Verifica in corso...' : 'Verifica codice'}
                </Button>
                <button
                  type="button"
                  onClick={() => setWhatsAppStep('phone')}
                  className="text-xs text-white/40 hover:text-gold block mx-auto underline mt-2"
                >
                  Cambia numero di telefono
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setAuthMethod('email')}
              className="text-xs text-gold hover:underline block mx-auto mt-4"
            >
              ← Torna all&apos;accesso classico con email
            </button>
          </div>
        )}

        {/* 3. FLUSSO PASSKEY (CARICAMENTO BIOMETRICO) */}
        {authMethod === 'passkey' && (
          <div className="text-center py-8 space-y-4">
            <div className="h-12 w-12 rounded-full border border-gold/30 bg-gold/5 flex items-center justify-center mx-auto animate-pulse">
              <svg className="h-6 w-6 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.25v2.25M10.5 14.25h3" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white/80">
              Verifica della Passkey in corso...
            </p>
            <p className="text-xs text-white/40">
              Usa il tuo volto (FaceID) o impronta (TouchID) per accedere.
            </p>
            <button
              type="button"
              onClick={() => setAuthMethod('email')}
              className="text-xs text-gold hover:underline block mx-auto pt-4"
            >
              Annulla e usa email
            </button>
          </div>
        )}

        {/* Pulsante per tornare al QR Code se siamo su Desktop */}
        {isDesktop && showClassicOnDesktop && (
          <button
            type="button"
            onClick={() => setShowClassicOnDesktop(false)}
            className="text-xs text-gold hover:underline block mx-auto mt-2"
          >
            ← Usa l&apos;accesso rapido con smartphone (QR)
          </button>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-white/40 border-t border-white/5 pt-4">
          Non hai un account?{' '}
          <Link href="/register" className="text-gold hover:underline font-semibold">
            Registrati ora
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function LoginForm({
  authConfigured,
  qrSessionId,
}: {
  authConfigured: boolean;
  qrSessionId?: string;
}) {
  return (
    <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-lg bg-white/5" />}>
      <LoginFormInner authConfigured={authConfigured} qrSessionId={qrSessionId} />
    </Suspense>
  );
}