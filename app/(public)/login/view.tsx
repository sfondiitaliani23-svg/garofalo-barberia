import { LoginForm } from '@/components/auth/LoginForm';
import { LiquidGlassBackdrop } from '@/components/auth/LiquidGlassBackdrop';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { L, type Lang } from '@/lib/i18n';

const HERO_IMAGE = '/assets/gallery/web/1000313548.webp';

// Accesso con vetro liquido (14/11/2026): la foto del salone e i fasci di luce stanno in un canvas
// (components/auth/LiquidGlassBackdrop.tsx); la scheda e i pulsanti segnati data-vetro diventano vetro vero.
// Senza WebGL resta la foto scura con la scheda sfocata, come prima.
export default function LoginView({ lang }: { lang: Lang }) {
  return (
    <section className="login-vetro relative bg-black text-white">
      <div
        className="login-vetro__foto"
        aria-hidden
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
      />
      <LiquidGlassBackdrop />

      <div className="login-vetro__dentro">
        <div className="login-vetro__testa">
          <h1 className="text-4xl sm:text-5xl leading-[1.1] text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {L(lang, 'Il tuo stile,', 'Your style,')}
            <br />
            {L(lang, 'la nostra cura.', 'our care.')}
          </h1>
          <p className="mt-3 text-sm text-white/75">
            {L(lang, 'Accedi alla tua area cliente per gestire appuntamenti e storico dei tagli.', 'Sign in to your account to manage your appointments and your haircut history.')}
          </p>
        </div>
        <div className="login-vetro__scheda">
          <LoginForm authConfigured={isSupabaseConfigured()} />
        </div>
      </div>
    </section>
  );
}
