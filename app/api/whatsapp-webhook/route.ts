import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { isGroupChat } from '@/lib/utils/wa-conversations';

export async function POST(req: Request) {
  // Se è impostato GREEN_API_WEBHOOK_TOKEN (lo stesso «webhookUrlToken» della console Green API),
  // si accettano solo le chiamate con «Authorization: Bearer <token>». Senza variabile resta aperto come prima.
  const expected = process.env.GREEN_API_WEBHOOK_TOKEN;
  if (expected && req.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const body = await req.json();

    // Gestione solo dei messaggi in ingresso da Green API
    if (body?.typeWebhook === 'incomingMessageReceived') {
      const senderData = body?.senderData || {};
      const messageData = body?.messageData || {};

      // Estrai il mittente e il testo
      const rawChatId = senderData.chatId || senderData.sender || '';
      // I gruppi non sono conversazioni con i clienti (come in WhatsApp Web restano separati): non si salvano.
      if (isGroupChat(rawChatId)) return NextResponse.json({ ok: true });
      const phoneDigits = rawChatId.replace('@c.us', '').replace('@s.whatsapp.net', '');
      const senderName = senderData.senderName || senderData.chatName || `Cliente WhatsApp (${phoneDigits})`;

      let textMessage = '';
      if (messageData.typeMessage === 'textMessage') {
        textMessage = messageData.textMessageData?.textMessage || '';
      } else if (messageData.typeMessage === 'extendedTextMessage') {
        textMessage = messageData.extendedTextMessageData?.text || '';
      }

      if (textMessage && phoneDigits) {
        const supabase = await createServiceClient();
        if (supabase) {
          // Inserisci nella tabella eliseo_richieste
          await supabase.from('eliseo_richieste').insert({
            nome: senderName.slice(0, 80),
            contatto: phoneDigits.slice(0, 120),
            motivo: 'informazioni',
            messaggio: textMessage.slice(0, 1500),
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[whatsapp webhook error]:', err);
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
