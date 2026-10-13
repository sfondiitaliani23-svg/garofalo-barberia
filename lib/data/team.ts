/**
 * Testi delle pagine del team. Solo fatti veri.
 * La "Bio" scritta in Admin → Gestione team compare sempre sopra questi testi.
 */
export const TEAM_EXTRA: Record<string, { intro?: string; facts?: string[]; quote?: string }> = {
  'luigi-garofalo': {
    intro:
      'Titolare della Barberia Garofalo. Ha iniziato nel 2012 e, prima di aprire il suo salone, ha fatto 13 anni di gavetta tra corsi di aggiornamento e lezioni dai maestri del mestiere.',
    facts: ['In barberia dal 2012', '13 anni di gavetta prima di aprire', 'Ha dato il suo cognome al salone'],
    quote: 'La Barberia è il posto di tutti, da bambini ad adulti: un posto dove si sta bene insieme.',
  },
  'francesco-costantino': {
    intro:
      'Francesco fa il barbiere da 4 anni. Mano ferma e occhio per i dettagli: ama le sfumature pulite e i contorni precisi, e non lascia la poltrona finché il taglio non è in ordine da ogni lato.',
    facts: ['In barberia da 4 anni', 'Sfumature e contorni', 'Precisione nei dettagli'],
    quote: 'Un taglio si giudica da vicino: è lì che si vede il lavoro.',
  },
  'vittorio-morlino': {
    intro:
      'Vittorio fa il barbiere da 2 anni e lavora fianco a fianco con Luigi. Giovane, curioso e sempre aggiornato sugli stili del momento: ascolta cosa vuoi e ti consiglia il look che ti rappresenta.',
    facts: ['In barberia da 2 anni', 'Stili di tendenza', 'In squadra con Luigi'],
    quote: 'Prima ascolto, poi taglio: il look giusto è quello in cui ti riconosci.',
  },
};
