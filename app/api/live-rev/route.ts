export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Identificativo del deploy corrente. La pagina aperta lo confronta e, se è cambiato, si ricarica.
export function GET() {
  const id = process.env.VERCEL_DEPLOYMENT_ID || '';
  return new Response(id, {
    status: id ? 200 : 204,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
    },
  });
}
