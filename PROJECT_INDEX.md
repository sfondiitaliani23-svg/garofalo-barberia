# Garofalo Barberia · Indice del progetto
Ultima modifica: 2026-10-15

Sito Next.js 15 + Supabase, pubblicato su Vercel. Dominio: barberiagarofalo.it. (La vecchia versione in HTML è in `legacy/`.)

## Cartelle
| Cartella | Cosa contiene |
|---|---|
| `app/(public)` | Pagine pubbliche: home, servizi, prenota, team, galleria, recensioni, journal, FAQ, privacy, contatti, feedback, offerte, lavora con noi |
| `app/area-cliente` | Area del cliente: appuntamenti, storico, profilo, galleria personale, assistenza |
| `app/admin` | Pannello admin: dashboard, prenotazioni, clienti, servizi, promozioni, inventario, analytics, staff, messaggi, journal, segnalazioni |
| `app/api` | Percorsi del server: chat (assistente Eliseo), cron (promemoria, monitor), push, presenza, statistiche, salute |
| `lib/actions` | Azioni del server (leggono e scrivono su Supabase). Ogni azione controlla il ruolo |
| `lib/chat` | Assistente Eliseo con IA (Gemini, poi Groq, poi risposte automatiche) |
| `lib/auth.ts` | Ruoli e controlli di accesso (`requireAdmin`, `requireAdminView`) |
| `lib/utils/tester-mask.ts` | Nasconde i dati dei clienti al ruolo tester |
| `supabase/migrations` | Migrazioni del database, in ordine numerico |
| `tests` | Test automatici (`npm test`) |
| `scripts` | Script di servizio (migrazioni, backup, prove) |

## Ruoli
- **customer**: il cliente. Chi si iscrive è sempre cliente.
- **admin**: gestisce tutto.
- **tester**: vede tutte le schermate dell'admin ma non modifica nulla e non vede i dati personali dei clienti. Si assegna dal SQL Editor di Supabase (vedi `supabase/migrations/012_ruolo_tester.sql`).
Il ruolo si cambia solo da Supabase (SQL Editor o chiave segreta del server), mai dal browser.

## Comandi
- `npm run dev`: prova in locale.
- `npm run build`: controllo prima della pubblicazione.
- `npm test`: test automatici.

## Documenti storici (possono essere vecchi)
`README.md`, `QUICK_START.md`, `START_HERE.md`, `DEPLOY_VERCEL.md`, `DEPLOYMENT_CHECKLIST.md`, `OPTIMIZATION_GUIDE.md`, `DELIVERY.md` descrivono la prima versione. Per lo stato reale vale questo file.

## Da fare
- Eseguire la migrazione 012 su Supabase e assegnare il ruolo tester a Maurizio.
- Aggiornare Next.js (15.5.27) con `yarn.lock` allineato.
- Versione in inglese e pagina Termini: da decidere.
- Chiavi IA: Gemini da riprovare, Groq da aggiungere.
