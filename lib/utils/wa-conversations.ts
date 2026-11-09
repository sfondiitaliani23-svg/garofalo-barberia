// Conversazioni dell'area Eliseo come WhatsApp Web (09/11/2026):
// una riga per chat (non per messaggio), con l'ultimo messaggio e il numero dei non letti.
// I gruppi WhatsApp (id che finisce con @g.us) non sono clienti: restano fuori.

export function isGroupChat(contatto: string | null | undefined): boolean {
  return /@g\.us\b|g\.us$/i.test(String(contatto || ''));
}

export function chatKeyOf(item: { contatto?: string | null; nome?: string | null; rif: string }): string {
  const k = String(item.contatto || item.nome || '').trim().toLowerCase();
  return k || `rif:${item.rif}`;
}

export type ChatRowInput = {
  rif: string;
  contatto?: string | null;
  nome?: string | null;
  quando?: string | null;
  nuovo?: boolean;
};

/**
 * Raggruppa i messaggi per chat. Ogni chat è rappresentata dal suo messaggio più recente;
 * `unread` conta i messaggi non letti di quella chat, `rifs` sono tutti i messaggi della chat.
 */
export function groupByChat<T extends ChatRowInput>(items: T[]): Array<{ item: T; unread: number; rifs: string[] }> {
  const map = new Map<string, { item: T; unread: number; rifs: string[] }>();
  for (const it of items) {
    if (isGroupChat(it.contatto)) continue;
    const key = chatKeyOf(it);
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { item: it, unread: it.nuovo ? 1 : 0, rifs: [it.rif] });
      continue;
    }
    cur.rifs.push(it.rif);
    if (it.nuovo) cur.unread++;
    if (String(it.quando || '') > String(cur.item.quando || '')) cur.item = it;
  }
  return Array.from(map.values());
}
