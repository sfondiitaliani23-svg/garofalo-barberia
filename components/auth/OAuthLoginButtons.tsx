'use client';

import { useFormStatus } from 'react-dom';
import { signInWithOAuth } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';

// SVGs dei loghi ufficiali per un look ultra-premium
const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

const AppleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.2.67-2.92 1.49-.63.71-1.18 1.85-1.03 2.96 1.12.09 2.26-.56 2.96-1.39z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="mr-2 h-4 w-4 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="mr-2 h-4 w-4 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.66.986 3.284 1.48 4.961 1.482 5.429 0 9.85-4.42 9.855-9.852.002-2.63-1.018-5.101-2.873-6.958C16.738 1.969 14.269 1.95 12.01 1.95c-5.435 0-9.856 4.417-9.86 9.853-.001 1.778.475 3.51 1.378 5.083L2.517 21.6l4.13-1.446zm11.23-5.321c-.266-.134-1.57-.775-1.814-.863-.243-.089-.42-.134-.596.134-.176.267-.68.863-.83 1.034-.15.172-.3.19-.566.057-.266-.134-1.124-.415-2.14-1.32-.79-.705-1.324-1.576-1.48-1.842-.155-.267-.017-.411.116-.544.12-.12.266-.312.4-.467.133-.156.177-.267.265-.445.089-.178.045-.334-.022-.468-.067-.134-.597-1.437-.818-1.971-.215-.518-.432-.448-.597-.456-.153-.008-.33-.008-.507-.008-.177 0-.465.067-.708.333-.243.267-.93.909-.93 2.217s.951 2.564 1.084 2.742c.133.178 1.87 2.854 4.53 4.004.633.273 1.127.436 1.513.559.636.202 1.213.174 1.67.106.51-.077 1.57-.641 1.79-1.26.22-.619.22-1.149.155-1.26-.066-.109-.243-.176-.51-.31z" />
  </svg>
);

const PasskeyIcon = () => (
  <svg className="mr-2 h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.25v2.25M10.5 14.25h3" />
  </svg>
);

function OAuthSubmitButton({
  provider,
  label,
  pendingLabel,
  icon,
}: {
  provider: 'google' | 'github' | 'apple' | 'facebook';
  label: string;
  pendingLabel: string;
  icon?: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      className="w-full bg-[#161616] hover:bg-white/5 border-white/10 hover:border-gold/30 transition-all duration-300 py-6 text-sm font-medium"
      disabled={pending}
    >
      {icon}
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function OAuthLoginButtons({
  redirectTo = '/area-cliente/dashboard',
  disabled = false,
  onWhatsAppClick,
  onPasskeyClick,
}: {
  redirectTo?: string;
  disabled?: boolean;
  onWhatsAppClick?: () => void;
  onPasskeyClick?: () => void;
}) {
  if (disabled) {
    return (
      <div className="space-y-3">
        <Button type="button" variant="outline" className="w-full py-6 text-sm font-medium opacity-50 cursor-not-allowed" disabled>
          <GoogleIcon /> Accedi con Google
        </Button>
        <Button type="button" variant="outline" className="w-full py-6 text-sm font-medium opacity-50 cursor-not-allowed" disabled>
          <AppleIcon /> Accedi con Apple
        </Button>
        <Button type="button" variant="outline" className="w-full py-6 text-sm font-medium opacity-50 cursor-not-allowed" disabled>
          <FacebookIcon /> Accedi con Facebook
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      {/* Separatore visivo */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-[#111] px-3 text-white/40">Oppure accedi con</span>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {/* Google OAuth */}
        <form action={signInWithOAuth}>
          <input type="hidden" name="provider" value="google" />
          <input type="hidden" name="redirect" value={redirectTo} />
          <OAuthSubmitButton
            provider="google"
            label="Google"
            pendingLabel="Apertura..."
            icon={<GoogleIcon />}
          />
        </form>

        {/* Apple OAuth */}
        {process.env.NEXT_PUBLIC_ENABLE_APPLE_AUTH === 'true' && (
          <form action={signInWithOAuth}>
            <input type="hidden" name="provider" value="apple" />
            <input type="hidden" name="redirect" value={redirectTo} />
            <OAuthSubmitButton
              provider="apple"
              label="Apple"
              pendingLabel="Apertura..."
              icon={<AppleIcon />}
            />
          </form>
        )}

        {/* Facebook OAuth */}
        {process.env.NEXT_PUBLIC_ENABLE_FACEBOOK_AUTH === 'true' && (
          <form action={signInWithOAuth}>
            <input type="hidden" name="provider" value="facebook" />
            <input type="hidden" name="redirect" value={redirectTo} />
            <OAuthSubmitButton
              provider="facebook"
              label="Facebook"
              pendingLabel="Apertura..."
              icon={<FacebookIcon />}
            />
          </form>
        )}

        {/* Passkeys Access */}
        {onPasskeyClick && (
          <Button
            type="button"
            variant="outline"
            onClick={onPasskeyClick}
            className="w-full bg-[#161616] hover:bg-white/5 border-white/10 hover:border-gold/30 transition-all duration-300 py-6 text-sm font-medium"
          >
            <PasskeyIcon />
            Passkey
          </Button>
        )}
      </div>

      {/* WhatsApp Access (Full width for emphasis) */}
      {onWhatsAppClick && (
        <Button
          type="button"
          variant="outline"
          onClick={onWhatsAppClick}
          className="w-full bg-[#161616] hover:bg-white/5 border-white/10 hover:border-gold/30 transition-all duration-300 py-6 text-sm font-medium"
        >
          <WhatsAppIcon />
          Accedi tramite WhatsApp (OTP)
        </Button>
      )}
    </div>
  );
}