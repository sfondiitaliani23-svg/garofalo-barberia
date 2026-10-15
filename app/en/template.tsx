/** Ogni cambio pagina rimonta questo contenitore: in modalità app entra con una breve animazione. */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
