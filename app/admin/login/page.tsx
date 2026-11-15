import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { LiquidGlassBackdrop } from '@/components/auth/LiquidGlassBackdrop';
import '@/components/auth/login.css';

export const metadata = { title: 'Admin Login' };

// 15/11/2026 (Eliseo): accesso admin e verifica in due passaggi con lo stesso aspetto dell'accesso clienti:
// fumo d'oro dietro (LiquidGlassBackdrop) e scheda di vetro scuro col bordo d'oro (.adm-accesso in login.css).
export default function AdminLoginPage() {
  return (
    <section className="login-vetro adm-accesso-pag relative bg-black text-white">
      <LiquidGlassBackdrop />
      <div className="login-vetro__dentro">
        <div className="adm-accesso">
          <p className="adm-accesso__eti">Area riservata</p>
          <h1 className="adm-accesso__titolo">Admin Garofalo</h1>
          <AdminLoginForm />
        </div>
      </div>
    </section>
  );
}
