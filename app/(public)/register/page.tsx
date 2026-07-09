import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata = { title: 'Registrati' };

export default function RegisterPage() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <RegisterForm />
    </section>
  );
}