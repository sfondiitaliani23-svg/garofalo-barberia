import { LoginForm } from '@/components/auth/LoginForm';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { L, type Lang } from '@/lib/i18n';

const HERO_IMAGE = '/assets/gallery/web/1000313548.webp';

export default function LoginView({ lang }: { lang: Lang }) {
  return (
    <section className="relative bg-black text-white">
      {/* Foto del salone in bianco e nero, versione scura */}
      <div className="relative h-[300px] sm:h-[340px] overflow-hidden" aria-hidden>
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url(${HERO_IMAGE})`,
            backgroundPosition: 'center 40%',
            filter: 'grayscale(1) brightness(0.45) contrast(1.15)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="container-lux max-w-5xl px-4 mx-auto">
        <div className="relative -mt-[250px] sm:-mt-[280px] mb-10 max-w-md">
          <h1
            className="text-4xl sm:text-5xl leading-[1.1] text-white"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {L(lang, 'Il tuo stile,', 'Your style,')}
            <br />
            {L(lang, 'la nostra cura.', 'our care.')}
          </h1>
          <p className="mt-4 text-sm text-white/70 max-w-xs">
            {L(lang, 'Accedi alla tua area cliente per gestire appuntamenti e storico dei tagli.', 'Sign in to your account to manage your appointments and your haircut history.')}
          </p>
        </div>

        <div className="relative pb-16">
          <LoginForm authConfigured={isSupabaseConfigured()} />
        </div>
      </div>
    </section>
  );
}
