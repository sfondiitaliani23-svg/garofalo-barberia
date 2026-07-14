import type { AnalyticsStats } from '@/lib/actions/analytics';
import { AGE_LABELS, GENDER_LABELS } from '@/lib/analytics/labels';
import { ADMIN_LIVE_POLL_MS } from '@/lib/analytics/live-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LiveVisitorsCounter } from '@/components/admin/LiveVisitorsCounter';

function BreakdownBar({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <span className="text-white/50">
          {value} ({pct}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AnalyticsSection({
  stats,
  showBreakdown = true,
}: {
  stats: AnalyticsStats;
  showBreakdown?: boolean;
}) {
  const genderTotal =
    stats.genderBreakdown.male +
    stats.genderBreakdown.female +
    stats.genderBreakdown.child +
    stats.genderBreakdown.other;
  const knownGender = genderTotal;

  const ageTotal = Object.entries(stats.ageBreakdown)
    .filter(([key]) => key !== 'unknown')
    .reduce((sum, [, v]) => sum + v, 0);

  return (
    <section className="mt-10">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-display text-xl uppercase">Analytics sito</h2>
          <p className="mt-1 text-sm text-white/50">
            Visite, visitatori live e profilo audience
          </p>
        </div>
        {!stats.configured && (
          <p className="text-xs text-white/40">Database non configurato</p>
        )}
      </div>

      {/* Prima riga: Panoramica visite (traffico) */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60">Visitatori live</CardTitle>
          </CardHeader>
          <CardContent>
            <LiveVisitorsCounter initialCount={stats.liveVisitors} />
            <p className="mt-1 text-xs text-white/40">
              Connessi adesso · aggiornato ogni {ADMIN_LIVE_POLL_MS / 1000}s
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60">Visite oggi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gold">{stats.dailyVisits}</p>
            <p className="mt-1 text-xs text-white/40">Page view odierne</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60">Visite ieri</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gold">{stats.yesterdayVisits}</p>
            <p className="mt-1 text-xs text-white/40">Page view ieri</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60">Ultimi 7 giorni</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gold">{stats.weeklyVisits}</p>
            <p className="mt-1 text-xs text-white/40">Page view settimanali</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60">Ultimi 30 giorni</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gold">{stats.monthlyVisits}</p>
            <p className="mt-1 text-xs text-white/40">Page view mensili</p>
          </CardContent>
        </Card>
      </div>

      {/* Seconda riga: Risposte sondaggio pubblico */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60">Uomini</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gold">{stats.genderBreakdown.male}</p>
            <p className="mt-1 text-xs text-white/40">Risposte sondaggio</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60">Donne</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gold">{stats.genderBreakdown.female}</p>
            <p className="mt-1 text-xs text-white/40">Risposte sondaggio</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white/60">Bimbi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gold">{stats.genderBreakdown.child}</p>
            <p className="mt-1 text-xs text-white/40">Risposte sondaggio</p>
          </CardContent>
        </Card>
      </div>

      {showBreakdown && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-[#111] p-6">
            <h3 className="text-sm font-medium text-white/70">Genere (uomo/donna/bimbi)</h3>
            <div className="mt-4 space-y-3">
              {(['male', 'female', 'child'] as const).map((key) => (
                <BreakdownBar
                  key={key}
                  label={GENDER_LABELS[key]}
                  value={stats.genderBreakdown[key]}
                  total={knownGender || 1}
                />
              ))}
            </div>
            {knownGender === 0 && (
              <p className="mt-4 text-xs text-white/40">
                Nessun dato ancora — il sondaggio appare ai nuovi visitatori.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-white/10 bg-[#111] p-6">
            <h3 className="text-sm font-medium text-white/70">Target di età</h3>
            <div className="mt-4 space-y-3">
              {Object.entries(stats.ageBreakdown)
                .filter(([key]) => key !== 'unknown')
                .map(([key, value]) => (
                  <BreakdownBar
                    key={key}
                    label={AGE_LABELS[key] ?? key}
                    value={value}
                    total={ageTotal || 1}
                  />
                ))}
            </div>
            {ageTotal === 0 && (
              <p className="mt-4 text-xs text-white/40">
                Nessun dato ancora — il sondaggio raccoglie la fascia d&apos;età.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}