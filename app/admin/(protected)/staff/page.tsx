import Image from 'next/image';
import { getBarbers } from '@/lib/actions/bookings';

export const metadata = { title: 'Staff' };

export default async function AdminStaffPage() {
  const barbers = await getBarbers();

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Staff</h1>
      <p className="mt-1 text-white/50">Barbieri e disponibilità settimanale</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {barbers.map((b) => (
          <div key={b.id} className="rounded-lg border border-white/10 bg-[#111] p-4 text-center">
            {b.image_url && (
              <Image src={b.image_url} alt={b.name} width={80} height={100} className="mx-auto mb-3 rounded object-cover object-top" />
            )}
            <p className="font-medium">{b.name}</p>
            <p className="text-sm text-gold">{b.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}