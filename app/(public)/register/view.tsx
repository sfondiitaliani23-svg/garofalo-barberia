import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterView() {
  return (
    <section className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <RegisterForm />
    </section>
  );
}