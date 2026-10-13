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
};
