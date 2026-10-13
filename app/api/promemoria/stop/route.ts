import { optOutEmail, verifyStopToken } from '@/lib/utils/comeback';

export const dynamic = 'force-dynamic';

function decode(e: string | null) {
  try {
    return e ? Buffer.from(e, 'base64url').toString('utf8') : '';
  } catch {
    return '';
  }
}

function page(title: string, body: string, form = '') {
  return new Response(
    `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#000;color:#fff;font-family:Helvetica,Arial,sans-serif;text-align:center;padding:24px;box-sizing:border-box}
main{max-width:380px}h1{font-size:20px;letter-spacing:1px;text-transform:uppercase}p{color:rgba(255,255,255,.7);line-height:1.6}
button,a.btn{display:inline-block;margin-top:12px;padding:12px 22px;border-radius:999px;font-weight:700;font-size:14px;border:0;cursor:pointer;background:#cd9a4f;color:#000;text-decoration:none}a{color:#cd9a4f}</style></head>
<body><main><img src="/pwa/icon-192.png" alt="" width="90" height="90"><h1>${title}</h1><p>${body}</p>${form}<p><a href="/">Torna al sito</a></p></main></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/** Pagina di conferma (un GET non cancella: i programmi di posta aprono i link da soli). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = decode(url.searchParams.get('e'));
  const token = url.searchParams.get('t') ?? '';
  if (!email || !verifyStopToken(email, token)) return page('Link non valido', 'Il link non è valido o è incompleto.');
  return page(
    'Promemoria via email',
    'Vuoi smettere di ricevere i promemoria “è ora di tornare”? Le conferme e i promemoria dei tuoi appuntamenti continueranno ad arrivare.',
    `<form method="post"><button type="submit">Sì, non inviarmeli più</button></form>`
  );
}

/** Conferma dal sito oppure "un clic" dal programma di posta (List-Unsubscribe-Post). */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const email = decode(url.searchParams.get('e'));
  const token = url.searchParams.get('t') ?? '';
  if (!email || !verifyStopToken(email, token)) return page('Link non valido', 'Il link non è valido o è incompleto.');
  const ok = await optOutEmail(email);
  return ok
    ? page('Fatto', 'Non riceverai più i promemoria “è ora di tornare”. Ti aspettiamo quando vuoi.')
    : page('Riprova', 'Non siamo riusciti a salvare la tua scelta. Riprova tra poco oppure scrivici su WhatsApp.');
}
