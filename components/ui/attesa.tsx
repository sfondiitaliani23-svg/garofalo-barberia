// Anello di attesa oro (14/11/2026), stessa forma dei siti di Maurizio, Maximize e M×E.
// Il testo resta leggibile accanto all'anello; con movimento ridotto l'anello non gira.
export function Attesa({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="status" className={`attesa text-sm text-white/60 ${className}`}>
      <span className="attesa__anello" aria-hidden />
      {children}
    </p>
  );
}
