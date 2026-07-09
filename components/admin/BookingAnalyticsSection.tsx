import type { BookingAnalytics } from '@/lib/actions/booking-analytics';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Scissors, TrendingUp, Users } from 'lucide-react';

function RankingBar({
  label,
  value,
  total,
  detail,
}: {
  label: string;
  value: number;
  total: number;
  detail?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1 flex justify-between gap-2 text-sm">
        <span className="text-white/80">{label}</span>
        <span className="shrink-0 text-white/50">
          {value} ({pct}%)
        </span>
      </div>
      {detail && <p className="mb-1 text-xs text-white/40">{detail}</p>}
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${Math.max(pct, value > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

export function BookingAnalyticsSection({ stats }: { stats: BookingAnalytics }) {
  const maxServiceCount = stats.topServices[0]?.count ?? 1;
  const maxCustomerCount = stats.topCustomers[0]?.count ?? 1;
  const maxMonthCount = Math.max(...stats.bookingsByMonth.map((m) => m.count), 1);

  return (
    <section>
      {!stats.configured && (
        <p className="mb-4 text-sm text-white/40">Database non configurato</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60">Prenotazioni totali</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gold">{stats.totalBookings}</p>
            <p className="mt-1 text-xs text-white/40">
              {stats.activeBookings} attive · {stats.completedBookings} completate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60">Incasso stimato</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gold">{formatPrice(stats.totalRevenueCents)}</p>
            <p className="mt-1 text-xs text-white/40">
              Ticket medio {formatPrice(stats.averageTicketCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm text-white/60">
              <Scissors size={14} />
              Servizio top
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.mostRequestedService ? (
              <>
                <p className="text-lg font-bold text-gold">{stats.mostRequestedService.name}</p>
                <p className="mt-1 text-xs text-white/40">
                  {stats.mostRequestedService.count} prenotazioni
                </p>
              </>
            ) : (
              <p className="text-sm text-white/40">Nessun dato</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm text-white/60">
              <Crown size={14} />
              Cliente più fedele
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.mostLoyalCustomer ? (
              <>
                <p className="text-lg font-bold text-gold">{stats.mostLoyalCustomer.name}</p>
                <p className="mt-1 text-xs text-white/40">
                  {stats.mostLoyalCustomer.count} visite · {stats.mostLoyalCustomer.phone}
                </p>
              </>
            ) : (
              <p className="text-sm text-white/40">Nessun dato</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-[#111] p-6">
          <div className="flex items-center gap-2">
            <Scissors size={16} className="text-gold" />
            <h3 className="text-sm font-medium text-white/70">Servizi più richiesti</h3>
          </div>
          <div className="mt-4 space-y-4">
            {stats.topServices.length > 0 ? (
              stats.topServices.map((service) => (
                <RankingBar
                  key={service.id}
                  label={service.name}
                  value={service.count}
                  total={maxServiceCount}
                  detail={`Incasso stimato ${formatPrice(service.revenueCents)}`}
                />
              ))
            ) : (
              <p className="text-xs text-white/40">Nessuna prenotazione registrata.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#111] p-6">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gold" />
            <h3 className="text-sm font-medium text-white/70">Clienti più fedeli</h3>
          </div>
          <div className="mt-4 space-y-4">
            {stats.topCustomers.length > 0 ? (
              stats.topCustomers.map((customer) => (
                <RankingBar
                  key={customer.key}
                  label={customer.name}
                  value={customer.count}
                  total={maxCustomerCount}
                  detail={customer.phone}
                />
              ))
            ) : (
              <p className="text-xs text-white/40">Nessun cliente con visite ripetute.</p>
            )}
          </div>
        </div>
      </div>

      {stats.bookingsByMonth.length > 0 && (
        <div className="mt-6 rounded-lg border border-white/10 bg-[#111] p-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-gold" />
            <h3 className="text-sm font-medium text-white/70">Andamento prenotazioni (ultimi 6 mesi)</h3>
          </div>
          <div className="mt-4 flex items-end gap-3">
            {stats.bookingsByMonth.map((month) => {
              const heightPct = Math.round((month.count / maxMonthCount) * 100);
              return (
                <div key={month.month} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-medium text-gold">{month.count}</span>
                  <div className="flex h-24 w-full items-end">
                    <div
                      className="w-full rounded-t bg-gold/70 transition-all"
                      style={{ height: `${Math.max(heightPct, month.count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                  <span className="text-[10px] uppercase text-white/40">{month.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.topBarbers.length > 0 && (
        <div className="mt-6 rounded-lg border border-white/10 bg-[#111] p-6">
          <h3 className="text-sm font-medium text-white/70">Barbieri più prenotati</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.topBarbers.map((barber, index) => (
              <div
                key={barber.id}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-[#1a1a1a] px-4 py-3"
              >
                <div>
                  <p className="font-medium">{barber.name}</p>
                  <p className="text-xs text-white/40">#{index + 1} in classifica</p>
                </div>
                <span className="text-lg font-bold text-gold">{barber.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}