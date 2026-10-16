# Barberia Garofalo

Sito e prenotazioni di una barberia (barberiagarofalo.it). Parte del progetto M×E Barber Lab.
Next.js 15.5 (App Router) + Tailwind v4 + Supabase. Pubblicazione: Vercel tramite GitHub Actions a ogni push su `main`.
Repository: sfondiitaliani23-svg/garofalo-barberia. Unico amministratore: Luigi Garofalo.

## Regole fisse
- Testi e risposte a Eliseo in italiano, frasi corte e semplici. Il suo nome è Eliseo.
- Testi del sito in italiano e inglese con `L(lang, it, en)` e `useLang`. Mai un testo in una sola lingua.
- Mai chiavi segrete in `NEXT_PUBLIC_*`. La chiave di servizio Supabase sta solo lato server.
- Ogni azione admin passa da `requireAdmin` (`@/lib/auth`). Le rotte cron richiedono sempre il codice segreto.
- `createServiceClient()` non ha sessione: `auth.getUser()` lì dà null. Il controllo admin si fa con `requireAdmin()`.
- Nuove tabelle: regole RLS nella migrazione. Le migrazioni SQL le esegue Eliseo in Supabase; non dire "fatto" finché non conferma.
- Nessuna foto di persone senza liberatoria. Nessuna promessa medica nei testi sui massaggi.
- Non toccare il repository di Maurizio Barber Shop da qui.

## Errori nelle azioni del server
- In produzione Next nasconde il messaggio di un errore lanciato da un'azione ("An error occurred in the Server Components render…").
- Le azioni devono restituire `{ ok: true, … }` o `{ ok: false, error }`, non lanciare. Il client mostra `error`.

## Controlli prima di un push
- `npx tsc --noEmit`
- `npm test` (89 test; usa `tests/register-alias.mjs` per capire gli indirizzi `@/…`). I test importano i file `.ts` direttamente con Node 22: i moduli in `lib/` usano solo TypeScript "cancellabile" (niente enum, niente parametri con modificatori).
- `tests/booking-e2e.test.mjs`: prenotazione vera contro un Postgres in memoria (PGlite) con le migrazioni di `supabase/migrations`. Finto Supabase in `tests/helpers/fake-supabase.mjs`, finti moduli in `tests/mocks/`. Se aggiungi una migrazione che tocca prenotazioni, aggiungila alla lista `MIGRATIONS` lì. Nei test `NEXT_PUBLIC_SUPABASE_URL` va impostato, altrimenti il sito usa gli orari di ripiego senza database.
- `tests/links.test.mjs` boccia `revalidatePath` e link verso pagine che non esistono.
- `next build` non funziona nel sandbox (non raggiunge Google Fonts): il controllo vero è il deploy su GitHub Actions.
- Non c'è configurazione eslint.
- Dopo `tsc` il file `tsconfig.tsbuildinfo` risulta modificato: `git checkout tsconfig.tsbuildinfo` prima del commit.
- Messaggi di commit: in italiano, chiari. Fine messaggio con le righe di attribuzione richieste dalla sessione. Per solo documenti si può usare `[skip ci]`.

## Deploy
- Un push nuovo annulla la corsa di deploy precedente. Prima di dire "è online", controllare per SHA (`gh run list`) che quella corsa "Deploy su Vercel" sia `completed success`.
- Se un passo Vercel fallisce senza motivo: `gh run rerun --failed`.
- Il sito vero non è raggiungibile dal sandbox: Eliseo verifica con Ctrl+F5 e screenshot.
- `sleep` è bloccato nel sandbox: per aspettare usare `timeout 25 tail -f /dev/null`.

## Prenotazioni
- Online i tagli ("Taglio e shampoo", "Taglio baby") si prenotano solo con Luigi Garofalo (richiesta di Francesco, 16/10/2026). Francesco e Vittorio: barba e styling. Dal pannello admin si prenota con tutti.
  - `isBarberAllowedForCut` in `lib/utils/barber-schedule.ts`, filtro in `components/booking/BookingWizard.tsx`, controllo server in `lib/actions/bookings.ts` e `lib/actions/availability.ts`.
- Prenotazione istantanea (admin): `components/admin/AdminInstantBookingModal.tsx`, voce e 3 passi (Dati, Servizi, Riepilogo). Il riepilogo compare solo al passo 3.
- Riconoscimento vocale: `lib/utils/voice-booking.ts` (`parseBookingSpeech`, test in `tests/voice-booking.test.mjs`). Usato anche da `AdminAppointmentForm.tsx`. Solo Chrome. `recognition.phrases` non va usato (rifiutato). L'errore `aborted` è normale.
- Il microfono dipende da `Permissions-Policy` in `next.config.ts`: deve restare `microphone=(self)`.
- Dopo disdetta o "completato" compare "Annulla" per 8 secondi (`undoStatusToast`).
- Eliminare un cliente richiede di scrivere ELIMINA (`AdminCustomerDialogs.tsx`).

## Sessione e uscita
- `lib/supabase/session-config.ts`: i cookie rimossi devono tenere `maxAge: 0`, altrimenti l'uscita non funziona.
- `components/layout/LogoutSubmit.tsx`: pulsante di uscita con stato di attesa, usato nelle barre laterali.
- `middleware.ts`: senza cookie `sb-*-auth-token` porta a /login; admin e tester vanno a /admin/dashboard.
- `components/auth/LoginForm.tsx`: dopo l'accesso usare `window.location.assign`, non `router.push`.

## Grafica "Insegna" (nero e oro)
- Area cliente: `components/layout/cust-skin.css`, classe `.cust-skin`.
- Admin: `components/layout/admin-insegna.css`, classi `.adm-skin` e `.adm-side`, caricato dopo `admin-skin.css`.
- Dashboard admin: classi `ov-*` in `components/admin/overview/overview.css`; scheda "Oggi" in `AdminOverview.tsx` (`todaySummary` in `lib/utils/dashboard-overview.ts`).
- Solo grafica: la logica non si tocca. Oro `#cd9a4f`, titoli in Rye (`font-display`), angoli squadrati, linee tratteggiate.
- Finestre e portali stanno fuori da `.adm-skin`: vanno stilizzati a parte (le finestre `role="dialog"` hanno uno sfondo pieno in `admin-insegna.css`).

## Altri strumenti nel repository
- `.agents/AGENTS.md` e `.gemini/` vengono da altri strumenti. In `.agents/AGENTS.md` il flusso di deploy (`git push origin master:main`, `npx vercel --prod`) è vecchio: con Claude vale questo file (push su `main`, deploy da GitHub Actions).

## Da sapere
- WhatsApp: i colori di stato (verde e rosso) restano come sono, di proposito.
- Migrazione `011_qr_login_sicuro.sql`: eseguita da Eliseo (login con QR).
- Dati dei clienti: mai in log, mai nei prompt dell'assistente IA.
