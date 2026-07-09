import { getProfile } from '@/lib/auth';
import { updateProfile } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const metadata = { title: 'Profilo' };

export default async function CustomerProfiloPage() {
  const profile = await getProfile();

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-3xl uppercase">Profilo</h1>
      <p className="mt-1 text-white/50">I tuoi dati e preferenze</p>
      <form action={updateProfile} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="full_name">Nome e cognome</Label>
          <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ''} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="phone">Telefono</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ''} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="hair_preferences">Preferenze di taglio</Label>
          <textarea
            id="hair_preferences"
            name="hair_preferences"
            defaultValue={profile?.hair_preferences ?? ''}
            rows={3}
            className="mt-1 flex w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2 text-sm text-white"
            placeholder="Es. lato corto, sopra più lungo..."
          />
        </div>
        <div>
          <Label htmlFor="personal_notes">Note personali</Label>
          <textarea
            id="personal_notes"
            name="personal_notes"
            defaultValue={profile?.personal_notes ?? ''}
            rows={3}
            className="mt-1 flex w-full rounded-md border border-white/15 bg-[#1a1a1a] px-4 py-2 text-sm text-white"
          />
        </div>
        <Button type="submit">Salva modifiche</Button>
      </form>
    </div>
  );
}