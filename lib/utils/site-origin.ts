/** Origine del sito per redirect OAuth — usa il dominio della richiesta corrente. */
export function resolveSiteOriginFromRequest(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = forwardedHost ?? request.headers.get('host');

  if (host) {
    const protocol =
      forwardedProto ??
      (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${protocol}://${host}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  return 'https://barberiagarofalo.it';
}

export function resolveSiteOriginFromHeaders(getHeader: (name: string) => string | null): string {
  const host = getHeader('x-forwarded-host') ?? getHeader('host');
  const forwardedProto = getHeader('x-forwarded-proto');

  if (host) {
    const protocol =
      forwardedProto ??
      (host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
    return `${protocol}://${host}`;
  }

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  return 'https://barberiagarofalo.it';
}

export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}