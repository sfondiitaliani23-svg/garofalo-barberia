import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

function getGreenApiCredentials() {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  const url = process.env.GREEN_API_URL || (instanceId ? `https://${instanceId.slice(0, 4)}.api.greenapi.com` : 'https://api.green-api.com');
  if (!instanceId || !token) return null;
  return { instanceId, token, host: url.replace(/\/$/, '') };
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const creds = getGreenApiCredentials();
    const supabase = await createServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Database non pronto' }, { status: 500 });
    }

    let insertedCount = 0;

    // 1. Interroga Green API per gli ultimi messaggi se configurato
    if (creds) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s max timeout
        const res = await fetch(
          `${creds.host}/waInstance${creds.instanceId}/lastIncomingMessages/${creds.token}?minutes=60`,
          { cache: 'no-store', signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const messages: any[] = Array.isArray(data) ? data : (data?.value ?? []);

          const direct = messages.filter((m: any) => {
            const chatId: string = m.chatId || m.sender || '';
            if (chatId.includes('@g.us')) return false;
            const text = m.textMessage || m.extendedTextMessage?.text || '';
            return text.trim().length > 0;
          });

          if (direct.length > 0) {
            const phones = direct.map((m: any) => {
              const chatId: string = m.chatId || m.sender || '';
              return chatId.replace('@c.us', '').replace('@s.whatsapp.net', '');
            });

            const { data: existing } = await supabase
              .from('eliseo_richieste')
              .select('contatto, messaggio, creato_il')
              .in('contatto', phones);

            const existingSet = new Set<string>(
              (existing ?? []).map((r: any) => `${r.contatto}::${(r.messaggio || '').slice(0, 30)}`)
            );

            const toInsert: any[] = [];
            for (const m of direct) {
              const chatId: string = m.chatId || m.sender || '';
              const phone = chatId.replace('@c.us', '').replace('@s.whatsapp.net', '');
              const senderName: string = m.senderName || m.senderContactName || `+${phone}`;
              const text: string = (m.textMessage || m.extendedTextMessage?.text || '').trim();
              const ts: number = m.timestamp || Math.floor(Date.now() / 1000);
              const isoDate = new Date(ts * 1000).toISOString();
              const key = `${phone}::${text.slice(0, 30)}`;

              if (existingSet.has(key)) continue;
              existingSet.add(key);

              toInsert.push({
                nome: senderName.slice(0, 80),
                contatto: phone.slice(0, 120),
                motivo: 'whatsapp',
                messaggio: text.slice(0, 1500),
                creato_il: isoDate,
              });
            }

            if (toInsert.length > 0) {
              const { error: insErr } = await supabase.from('eliseo_richieste').insert(toInsert);
              if (!insErr) insertedCount = toInsert.length;
            }
          }
        }
      } catch (waErr) {
        // timeout o rete Green API non deve bloccare la risposta
      }
    }

    // 2. Recupera l'elenco aggiornato delle richieste e degli stati da Supabase
    const [{ data: reqsData }, { data: statiData }] = await Promise.all([
      supabase.from('eliseo_richieste').select('*').order('creato_il', { ascending: false }).limit(100),
      supabase.from('eliseo_casella_stato').select('*'),
    ]);

    const statiMap = new Map((statiData ?? []).map((s: any) => [`${s.tipo}:${s.rif}`, s]));

    const casella = (reqsData ?? []).map((r: any) => {
      const s = statiMap.get(`richiesta:${r.id}`);
      return {
        tipo: 'richiesta' as const,
        rif: r.id,
        nome: r.nome,
        quando: r.creato_il,
        nuovo: !s,
        messaggio: r.messaggio,
        contatto: r.contatto,
        motivo: r.motivo,
        stato: (s?.stato ?? 'aperta') as 'aperta' | 'in_corso' | 'chiusa',
        assegnato: s?.assegnato ?? null,
        contatto_id: s?.contatto_id ?? null,
        cartella: s?.cartella ?? null,
      };
    });

    return NextResponse.json({ ok: true, inserted: insertedCount, casella });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
