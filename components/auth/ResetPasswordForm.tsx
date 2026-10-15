'use client';

import { useState } from 'react';
import { LocLink as Link } from '@/components/i18n/LocLink';
import { useLang } from '@/components/i18n/LangProvider';
import { L } from '@/lib/i18n';
import { translateMessage } from '@/lib/i18n/content-booking';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateUserPassword } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, Lock } from 'lucide-react';

export function ResetPasswordForm() {
  const router = useRouter();
  const lang = useLang();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError(L(lang, 'La nuova password deve contenere almeno 6 caratteri.', 'The new password must be at least 6 characters long.'));
      return;
    }

    if (password !== confirmPassword) {
      setError(L(lang, 'Le due password inserite non coincidono.', 'The two passwords do not match.'));
      return;
    }

    setLoading(true);

    try {
      const res = await updateUserPassword(password);
      if (res.error) {
        setError(translateMessage(lang, res.error));
      } else {
        setSuccess(true);
        toast.success(L(lang, 'Password aggiornata con successo!', 'Password updated successfully!'));
        setTimeout(() => {
          router.push('/area-cliente/dashboard');
          router.refresh();
        }, 1500);
      }
    } catch {
      setError(L(lang, 'Si è verificato un errore durante l\'aggiornamento. Riprova più tardi.', 'Something went wrong while updating your password. Please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border border-white/10 bg-[#111] shadow-2xl relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />

      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2 text-gold mb-1">
          <Lock className="h-5 w-5" />
          <span className="text-xs uppercase tracking-widest text-white/50 font-semibold">{L(lang, 'Sicurezza Account', 'Account security')}</span>
        </div>
        <CardTitle className="font-display text-2xl uppercase tracking-wide text-gold">
          {L(lang, 'Nuova Password', 'New password')}
        </CardTitle>
        <p className="text-xs text-white/60">
          {L(lang, 'Inserisci la nuova password per il tuo account Garofalo Barberia.', 'Enter the new password for your Garofalo Barberia account.')}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {success ? (
          <div className="rounded-lg border border-gold/30 bg-gold/10 p-6 space-y-4 text-center">
            <div className="h-12 w-12 rounded-full bg-gold/20 text-gold flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{L(lang, 'Password aggiornata con successo!', 'Password updated successfully!')}</p>
              <p className="text-xs text-white/70 mt-1">
                {L(lang, 'Ti stiamo reindirizzando alla tua area personale...', 'We are taking you to your account area...')}
              </p>
            </div>
            <div className="flex justify-center pt-2">
              <Loader2 className="h-5 w-5 animate-spin text-gold" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <div>
              <Label htmlFor="new-password" className="text-xs text-white/70">
                {L(lang, 'Nuova Password (min. 6 caratteri)', 'New password (min. 6 characters)')}
              </Label>
              <Input
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 bg-[#1a1a1a] border-white/10 text-white placeholder-white/30 focus:border-gold/50"
              />
            </div>

            <div>
              <Label htmlFor="confirm-password" className="text-xs text-white/70">
                {L(lang, 'Conferma Nuova Password', 'Confirm new password')}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 bg-[#1a1a1a] border-white/10 text-white placeholder-white/30 focus:border-gold/50"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-gold-light text-black py-5 font-semibold transition-all duration-300 border-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {L(lang, 'Aggiornamento in corso...', 'Updating...')}
                </span>
              ) : (
                L(lang, 'Aggiorna Password', 'Update password')
              )}
            </Button>

            <p className="text-center text-xs text-white/60 pt-2">
              <Link href="/login" className="text-gold hover:underline">
                {L(lang, '← Torna alla pagina di accesso', '← Back to the sign-in page')}
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
