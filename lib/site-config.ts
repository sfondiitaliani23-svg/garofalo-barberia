const EMAIL = process.env.ADMIN_EMAIL ?? 'luigigarofalo1996@gmail.com';

export const SITE_CONFIG = {
  name: 'Barberia Garofalo',
  tagline: 'Tagli precisi per uomo, ragazzo e bimbo a Foggia',
  phone: '+393201886277',
  phoneDisplay: '320 188 6277',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '393201886277',
  email: EMAIL,
  address: "Viale Ignazio d'Addedda, 236, 71122 Foggia (FG)",
  addressShort: "Viale Ignazio d'Addedda, 236",
  addressCity: '71122 Foggia (FG)',
  instagram: 'https://www.instagram.com/barberia_garofalo?igsh=MXc1ZzJ1NHdpamRzNg==',
  instagramHandle: '@barberia_garofalo',
  googleMapsUrl:
    "https://maps.google.com/?q=Viale+Ignazio+d'Addedda,+236,+71122+Foggia+FG",
  googleMapsEmbed:
    "https://www.google.com/maps?q=Viale+Ignazio+d'Addedda,+236,+71122+Foggia+FG&hl=it&z=16&output=embed",
  gmailComposeUrl: `https://mail.google.com/mail/?view=cm&fs=1&to=${EMAIL}`,
  cancellationMinutes: 30,
  slotIntervalMinutes: 30,
  bookingEndDate: '2026-12-31',
  services: [
    'Taglio e shampoo',
    'Taglio baby',
    'Barba rasata / lama',
    'Barba modellata a forbici',
    'Barba con panno caldo',
    'Shampoo e acconciatura',
  ],
  hours: [
    { day: 'Lunedì', time: 'Chiuso' },
    { day: 'Martedì – Sabato', time: '08:30 – 13:00 · 15:30 – 20:30' },
    { day: 'Domenica', time: 'Chiuso' },
  ],
  detailedHours: [
    { day: 'Lunedì', time: 'Chiuso' },
    { day: 'Martedì', time: '08:30 – 13:00 · 15:30 – 20:30' },
    { day: 'Mercoledì', time: '08:30 – 13:00 · 15:30 – 20:30' },
    { day: 'Giovedì', time: '08:30 – 13:00 · 15:30 – 20:30' },
    { day: 'Venerdì', time: '08:30 – 13:00 · 15:30 – 20:30' },
    { day: 'Sabato', time: '08:30 – 13:00 · 15:30 – 20:30' },
    { day: 'Domenica', time: 'Chiuso' },
  ],
} as const;

export function getWhatsAppLink(message?: string) {
  const text = encodeURIComponent(
    message ?? 'Ciao! Vorrei prenotare un appuntamento a Garofalo Barberia. Potete aiutarmi?'
  );
  return `https://wa.me/${SITE_CONFIG.whatsapp}?text=${text}`;
}