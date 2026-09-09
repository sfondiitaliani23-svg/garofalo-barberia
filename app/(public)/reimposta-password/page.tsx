import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reimposta Password | Garofalo Barberia' };

export default function ResetPasswordPage() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <ResetPasswordForm />
    </section>
  );
}
