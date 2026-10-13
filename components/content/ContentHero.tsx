export function ContentHero({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <section className="page-hero">
      <div className="container-lux">
        <div className="eyebrow justify-center">
          <div className="eyebrow-line" />
          <span className="eyebrow-text">{eyebrow}</span>
          <div className="eyebrow-line" />
        </div>
        <h1 className="hero-heading">{title}</h1>
        {sub && <p className="hero-sub mx-auto max-w-2xl">{sub}</p>}
        {children}
      </div>
    </section>
  );
}
