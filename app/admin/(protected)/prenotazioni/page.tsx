import { getAdminAppointments, completeAppointmentAction, cancelAppointmentAction } from '@/lib/actions/admin';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = { title: 'Prenotazioni Admin' };

export default async function AdminPrenotazioniPage() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 7);
  const to = new Date(now);
  to.setDate(to.getDate() + 30);

  const appointments = await getAdminAppointments(from.toISOString(), to.toISOString());

  const statusColors: Record<string, string> = {
    confirmed: 'text-gold',
    completed: 'text-green-400',
    cancelled: 'text-red-400',
    no_show: 'text-white/40',
  };

  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Prenotazioni</h1>
      <p className="mt-1 text-white/50">Calendario appuntamenti — prossimi 30 giorni</p>

      <div className="mt-8 space-y-3">
        {appointments.length === 0 ? (
          <p className="text-white/50">Nessun appuntamento in questo periodo.</p>
        ) : (
          appointments.map((apt) => {
            const barber = apt.barber as { name: string } | null;
            const service = apt.service as { name: string; price_cents: number } | null;
            const startsAt = new Date(apt.starts_at);

            return (
              <Card key={apt.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="font-semibold">{apt.customer_name} — {apt.customer_phone}</p>
                    <p className="text-sm text-white/60">
                      {format(startsAt, "EEEE d MMMM yyyy 'alle' HH:mm", { locale: it })}
                    </p>
                    <p className="text-sm text-gold">
                      {service?.name} con {barber?.name}
                    </p>
                    {apt.notes && <p className="text-xs text-white/40 mt-1">{apt.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium uppercase ${statusColors[apt.status] ?? ''}`}>
                      {apt.status}
                    </span>
                    {apt.status === 'confirmed' && (
                      <>
                        <form action={completeAppointmentAction}>
                          <input type="hidden" name="id" value={apt.id} />
                          <Button type="submit" size="sm" variant="outline">Completato</Button>
                        </form>
                        <form action={cancelAppointmentAction}>
                          <input type="hidden" name="id" value={apt.id} />
                          <Button type="submit" size="sm" variant="destructive">Annulla</Button>
                        </form>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}