import { NextRequest, NextResponse } from 'next/server';
import { SITE_CONFIG } from '@/lib/site-config';
import { getBarbers, getServices } from '@/lib/actions/bookings';
import { getActivePromotions } from '@/lib/actions/promotions';
import { respond, type ChatHistoryItem, type ChatKnowledge } from '@/lib/chat/assistant';

export const dynamic = 'force-dynamic';

const MAX_MESSAGE_LENGTH = 500;
const MAX_HISTORY = 12;

/** Dati reali del sito: servizi, barbieri e promozioni (Supabase, con fallback). */
async function loadKnowledge(): Promise<ChatKnowledge> {
  const [services, barbers, promotions] = await Promise.all([
    getServices({ onlyPublic: true }).catch(() => []),
    getBarbers({ onlyPublic: true }).catch(() => []),
    getActivePromotions().catch(() => []),
  ]);

  return {
    services: [...services]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        price_cents: s.price_cents,
        duration_minutes: s.duration_minutes,
      })),
    barbers: barbers.map((b) => ({ name: b.name, role: b.role })),
    promotions: promotions.map((p) => ({
      title: p.title,
      description: p.description,
      code: p.code,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      ends_at: p.ends_at,
      serviceName: p.service?.name ?? null,
    })),
  };
}

function sanitizeHistory(raw: unknown): ChatHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is ChatHistoryItem =>
        !!m &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string'
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const message = typeof body?.message === 'string' ? body.message.slice(0, MAX_MESSAGE_LENGTH) : '';
    const history = sanitizeHistory(body?.history);

    const knowledge = await loadKnowledge();
    const result = respond(message, history, knowledge);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[api/chat]', error);
    return NextResponse.json(
      {
        replies: [`Mi dispiace, c'è stato un errore. Scrivici su WhatsApp al **${SITE_CONFIG.phoneDisplay}** 📱`],
        actions: [{ label: 'Scrivi su WhatsApp', href: `https://wa.me/${SITE_CONFIG.whatsapp}` }],
        suggestions: [],
      },
      { status: 500 }
    );
  }
}
