// ============================================================================
// GAROFALO BARBERIA - SITE CONFIGURATION
// ============================================================================
// Configurazione centralizzata del sito. Modifica i valori qui per 
// aggiornare il comportamento globale del sito.
// ============================================================================

const SITE_CONFIG = {
  // Identità Azienda
  name: 'Barberia Garofalo',
  logo: 'assets/sostituisci-immagini/icone/barberia_garofalo.png',
  whatsappIcon: 'assets/sostituisci-immagini/icone/whatsapp.png',
  tagline: 'Tagli precisi per uomo, ragazzo e bimbo a Foggia',
  
  // Contatti
  phone: '+393201886277',
  phoneDisplay: '320 188 6277',
  whatsapp: '393201886277',
  whatsappMessage: 'Ciao! Vorrei prenotare un appuntamento a Garofalo Barberia. Potete aiutarmi?',
  email: 'luigigarofalo1996@gmail.com',
  
  // Indirizzo
  address: "Viale Ignazio d'Addedda, 236, 71122 Foggia (FG)",
  latitude: 41.455,
  longitude: 15.541,
  
  // Social Media
  instagram: 'https://www.instagram.com/barberia_garofalo?igsh=MXc1ZzJ1NHdpamRzNg==',
  facebook: 'https://www.facebook.com/garofalobarberia',
  
  // Prenotazione integrata (nessun servizio esterno)
  booking: {
    minAdvanceHours: 2,
    cancellationHours: 3,
    timeSlots: [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    ],
    closedDays: [0, 1], // 0 = Domenica, 1 = Lunedì
  },
  // Google Maps - Sostituisci con coordinate della tua barberia
  googleMapsEmbed: "https://www.google.com/maps?q=Viale+Ignazio+d'Addedda,+236,+71122+Foggia+FG&hl=it&z=16&output=embed",
  googleReviewsUrl: 'https://g.page/r/garofalobarberia/review',
  
  // Google Analytics
  ga4Id: 'G-XXXXXXXXXX', // Sostituire con ID reale
  
  // Orari di apertura
  hours: [
    { day: 'Lunedì', time: 'Chiuso' },
    { day: 'Martedì – Venerdì', time: '09:00 – 19:30' },
    { day: 'Sabato', time: '09:00 – 18:00' },
    { day: 'Domenica', time: 'Chiuso' },
  ],
  
  // Servizi e Prezzi
  services: {
    taglio: [
      { name: 'Taglio e shampoo', price: 17, duration: '30 min' },
    ],
    baby: [
      { name: 'Taglio baby', price: 13, duration: '25 min' },
    ],
    barba: [
      { name: 'Barba rasata / lama', price: 6, duration: '15 min' },
      { name: 'Barba modellata a forbici', price: 8, duration: '20 min' },
      { name: 'Barba con panno caldo', price: 10, duration: '25 min' },
    ],
    styling: [
      { name: 'Shampoo e acconciatura', price: 8, duration: '15 min' },
    ],
  },
  
  // Team
  team: [
    {
      name: 'Luigi Garofalo',
      role: 'Titolare · Barbiere professionista',
      image: 'assets/sostituisci-immagini/team/luigi-garofalo.png',
      specialties: ['Tagli uomo', 'Barba', 'Styling'],
      experience: '15+ anni',
    },
    {
      name: 'Vittorio Morlino',
      role: 'Barbiere professionista',
      image: 'assets/sostituisci-immagini/team/vittorio-morlino.png',
      specialties: ['Tagli uomo', 'Barba', 'Tagli baby'],
      experience: '',
    },
    {
      name: 'Francesco Costantino',
      role: 'Barbiere professionista',
      image: 'assets/sostituisci-immagini/team/francesco-costantino.png',
      specialties: ['Tagli uomo', 'Barba', 'Styling'],
      experience: '',
    },
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Genera il link WhatsApp con messaggio predefinito
 * @returns {string} URL WhatsApp con testo codificato
 */
function getWhatsAppLink() {
  const message = encodeURIComponent(SITE_CONFIG.whatsappMessage);
  return `https://wa.me/${SITE_CONFIG.whatsapp}?text=${message}`;
}

/**
 * Formatta il prezzo in EUR
 * @param {number} price - Prezzo in euro
 * @returns {string} Prezzo formattato
 */
function formatPrice(price) {
  return `€${price}`;
}

/**
 * Ottiene l'URL di Google Maps
 * @returns {string} URL Google Maps
 */
function getGoogleMapsUrl() {
  return `https://maps.google.com/?q=${encodeURIComponent(SITE_CONFIG.address)}`;
}

/**
 * Apre Gmail con nuova email al destinatario
 * @param {string} [to] - Indirizzo destinatario
 * @param {string} [subject] - Oggetto
 * @param {string} [body] - Corpo del messaggio
 * @returns {string} URL Gmail compose
 */
function getGmailComposeLink(to, subject = '', body = '') {
  const email = to || SITE_CONFIG.email;
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: email });
  if (subject) params.set('su', subject);
  if (body) params.set('body', body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}
