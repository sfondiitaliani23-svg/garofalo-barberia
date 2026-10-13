/**
 * QR del salone. L'indirizzo stampato è sempre /qr/<id> e non cambia mai:
 * se vuoi cambiare la destinazione, cambi solo "to" qui, senza ristampare.
 */
export type ShopQr = { id: string; label: string; place: string; to: string; invite: string };

export const SHOP_QRS: ShopQr[] = [
  { id: 'vetrina', label: 'Vetrina', place: 'Sulla vetrina, visibile da fuori', to: '/link', invite: 'Inquadra: prenota e seguici' },
  { id: 'cassa', label: 'Cassa', place: 'Vicino alla cassa', to: '/prenota', invite: 'Prenota il prossimo taglio' },
  { id: 'specchio', label: 'Specchio', place: 'Sugli specchi delle postazioni', to: '/feedback', invite: 'Com’è andata? Dicci la tua' },
  { id: 'attesa', label: 'Sala d’attesa', place: 'Sul tavolino della sala d’attesa', to: '/journal', invite: 'Leggi i nostri consigli' },
  { id: 'biglietto', label: 'Biglietto da visita', place: 'Sul retro del biglietto da visita', to: '/prenota', invite: 'Prenota online' },
];

export function getShopQr(id: string) {
  return SHOP_QRS.find((q) => q.id === id);
}
