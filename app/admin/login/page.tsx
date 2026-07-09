import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Admin Login' };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Garofalo</CardTitle>
          <p className="text-sm text-white/50">Accesso riservato</p>
        </CardHeader>
        <CardContent>
          <AdminLoginForm />
        </CardContent>
      </Card>
    </div>
  );
}