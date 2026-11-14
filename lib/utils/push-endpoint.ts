// Notifiche anche senza account (14/11/2026): si accettano solo indirizzi dei servizi di notifica veri
// (Google/Android, Apple, Mozilla, Microsoft), così nessuno riempie l'archivio con indirizzi inventati.
const HOSTS = /^https:\/\/(fcm\.googleapis\.com|android\.googleapis\.com|web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com)\//;

export function isPushEndpoint(endpoint: unknown): boolean {
  return typeof endpoint === 'string' && endpoint.length <= 1000 && HOSTS.test(endpoint);
}
