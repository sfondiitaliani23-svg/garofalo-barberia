export const metadata = { title: 'Contenuti' };

export default function AdminContenutiPage() {
  return (
    <div>
      <h1 className="font-display text-3xl uppercase">Contenuti</h1>
      <p className="mt-1 text-white/50">Banner chiusura e annunci — tabella site_content in Supabase</p>
      <p className="mt-8 text-sm text-white/40">
        Attiva un banner impostando <code className="text-gold">is_active = true</code> su site_content con key &quot;closure_banner&quot;.
      </p>
    </div>
  );
}