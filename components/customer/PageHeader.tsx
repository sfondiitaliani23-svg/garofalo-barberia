/** Testata di pagina dell'area cliente: etichetta, titolo a insegna, sottotitolo, filo tratteggiato. */
export function PageHeader({ eyebrow, title, subtitle, center = false }: { eyebrow?: string; title: string; subtitle?: React.ReactNode; center?: boolean }) {
  return (
    <header className={`mb-7 border-b border-dashed border-gold/35 pb-5 ${center ? 'text-center' : ''}`}>
      {eyebrow && <p className="text-[10px] uppercase tracking-[0.4em] text-gold">{eyebrow}</p>}
      <h1 className="mt-1 font-display text-4xl leading-tight text-[#f7ecd0]">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-[#bda980]">{subtitle}</p>}
    </header>
  );
}
