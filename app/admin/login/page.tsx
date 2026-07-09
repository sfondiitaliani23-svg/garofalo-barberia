import { signInWithEmail } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
          <form action={signInWithEmail} className="space-y-4">
            <input type="hidden" name="redirect" value="/admin/dashboard" />
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required className="mt-1" />
            </div>
            <Button type="submit" className="w-full">Accedi</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}