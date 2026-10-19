# Barberia Garofalo

Sito e prenotazioni (barberiagarofalo.it). Parte di M×E Barber Lab. Next.js 15.5 (App Router) + Tailwind v4 + Supabase. Deploy: Vercel da GitHub Actions a ogni push su `main`.
Repo: sfondiitaliani23-svg/garofalo-barberia. Amministratori: Luigi Garofalo (titolare) ed Eliseo (co-founder, dal 17/10/2026, ruolo `admin`).

## Regole fisse
- Risposte a Eliseo in italiano, frasi corte e semplici. Il suo nome è Eliseo.
- Testi del sito sempre in italiano e inglese: `L(lang, it, en)` e `useLang`.
- Mai chiavi segrete in `NEXT_PUBLIC_*`. La chiave di servizio Supabase sta solo lato server.
- Ogni azione admin passa da `requireAdmin` (`@/lib/auth`). Le rotte cron richiedono il codice segreto.
- `createServiceClient()` non ha sessione (`auth.getUser()` dà null): il controllo admin è `requireAdmin()`.
- Nuove tabelle: RLS nella migrazione. Le migrazioni SQL le esegue Eliseo in Supabase: non dire "fatto" finché non conferma.
- Nessuna foto di persone senza liberatoria. Nessuna promessa medica nei testi sui massaggi.
- Non toccare il repository di Maurizio Barber Shop da qui.
- Dati dei clienti: mai in log, mai nei prompt dell'assistente IA.
- WhatsApp: i colori di stato (verde, rosso) restano com'è, di proposito.

## Azioni del server
- In produzione Next nasconde i messaggi di errore lanciati. Le azioni restituiscono `{ ok: true, … }` o `{ ok: false, error }`, non lanciano. Il client mostra `error`.
- Non mettere funzioni di invio dentro file `'use server'`: ogni funzione esportata diventa chiamabile da chiunque.

## Prima di un push
- `npx tsc --noEmit`, poi `git checkout tsconfig.tsbuildinfo`.
- `npm test` (109 test, Node 22, alias `@/…` da `tests/register-alias.mjs`). I moduli in `lib/` usano solo TypeScript "cancellabile" (niente enum, niente parametri con modificatori).
- `tests/booking-e2e.test.mjs`: prenotazione vera su Postgres in memoria (PGlite) con le migrazioni di `supabase/migrations`; finto Supabase in `tests/helpers/fake-supabase.mjs`, finti moduli in `tests/mocks/`. Una migrazione che tocca le prenotazioni va nella lista `MIGRATIONS` lì. Nei test serve `NEXT_PUBLIC_SUPABASE_URL`, altrimenti il sito usa gli orari di ripiego.
- `tests/links.test.mjs` boccia `revalidatePath` e link verso pagine che non esistono.
- `next build` non funziona nel sandbox (Google Fonts): il controllo vero è il deploy. Niente eslint.
- Commit in italiano, chiari, con le righe di attribuzione della sessione. Solo documenti: `[skip ci]`.

## Deploy
- Un push nuovo annulla la corsa precedente. Prima di dire "è online", verificare per SHA (`gh run list`) che "Deploy su Vercel" sia `completed success`. Il flusso "Controllo backend" è separato.
- Se un passo Vercel fallisce senza motivo: `gh run rerun --failed`.
- Il sito vero non è raggiungibile dal sandbox: Eliseo verifica con Ctrl+F5 e screenshot.
- `sleep` è bloccato: per aspettare `timeout 25 tail -f /dev/null`.

## Prenotazioni
- Online i tagli ("Taglio e shampoo", "Taglio baby") solo con Luigi (richiesta di Francesco, 16/10/2026). Francesco e Vittorio: barba e styling. Dall'admin si prenota con tutti. Codice: `isBarberAllowedForCut` (`lib/utils/barber-schedule.ts`), filtro in `BookingWizard.tsx`, controlli server in `lib/actions/bookings.ts` e `availability.ts`.
- Prenotazione istantanea (admin): `AdminInstantBookingModal.tsx`, 3 passi (Dati, Servizi, Riepilogo, che compare solo al passo 3).
- Voce: `lib/utils/voice-booking.ts` (`parseBookingSpeech`, test `voice-booking.test.mjs`), usato anche da `AdminAppointmentForm.tsx`. Solo Chrome. `recognition.phrases` rifiutato. L'errore `aborted` è normale. `Permissions-Policy` in `next.config.ts` deve restare `microphone=(self)`.
- Dopo disdetta o "completato" compare "Annulla" per 8 secondi (`undoStatusToast`). Eliminare un cliente richiede di scrivere ELIMINA (`AdminCustomerDialogs.tsx`).

## Lista d'attesa
- Giorno al completo: `WaitlistForm.tsx` (in `BookingWizard`) → `joinWaitlist` (`lib/actions/waitlist.ts`). Tabella `waitlist_entries`, migrazione `014_lista_attesa.sql` (eseguita da Eliseo).
- Dopo una disdetta (`cancelAppointment`, o `updateAppointmentStatus` con `cancelled`) `notifyWaitlistForDate` (`lib/utils/waitlist-notify.ts`) scrive a chi aspetta: al massimo 3 per volta, solo se c'è un orario libero. Non lancia mai errori.

## Notifiche sul telefono
- Web Push in `lib/utils/push.ts` (chiavi VAPID create da sole, iscrizioni in `site_content`), `components/customer/PushManager.tsx`, invio dall'admin in Inbox → "Notifiche ai clienti" (`lib/actions/push-admin.ts`).

## Recensioni
- Email "com'è andata?" (`lib/utils/review-request.ts`, scelta dei destinatari in `review-request-select.ts`): parte 24 ore dopo la fine di un appuntamento confermato o completato, con email, mai disdetto. Gira ogni 15 minuti dentro `/api/cron/appointment-reminders`, solo tra le 08:00 e le 22:00. Una richiesta ogni 30 giorni, 10 per giro. Si spegne con `REVIEW_EMAILS=off`; `/api/cron/review-requests?dry=1` mostra chi la riceverebbe.
- Le stelle nell'email portano a `/recensioni/nuova?stelle=N` (e `/en/...`). "Non inviarmele più" è separato da quello di "è ora di tornare" (`optout-rec:` contro `optout:`).
- Non c'è un campo "prenotato dal sito": l'email parte per ogni appuntamento con email, anche se inserito dall'admin. Per limitarla al sito serve una colonna `source` (migrazione, la esegue Eliseo).

## Sessione e uscita
- `lib/supabase/session-config.ts`: i cookie rimossi tengono `maxAge: 0`, altrimenti l'uscita non funziona.
- `LogoutSubmit.tsx`: pulsante di uscita con attesa. `middleware.ts`: senza cookie `sb-*-auth-token` → /login; admin e tester → /admin/dashboard.
- Dopo l'accesso (`LoginForm.tsx`, `AdminLoginForm.tsx`) usare `window.location.assign`, non `router.push`.

## Grafica "Insegna" (nero e oro)
- Cliente: `components/layout/cust-skin.css` (`.cust-skin`). Admin: `admin-insegna.css` (`.adm-skin`, `.adm-side`), caricato dopo `admin-skin.css`. Dashboard: classi `ov-*` in `components/admin/overview/overview.css`; scheda "Oggi" in `AdminOverview.tsx` (`todaySummary` in `lib/utils/dashboard-overview.ts`).
- Solo grafica, la logica non si tocca. Oro `#cd9a4f`, titoli in Rye (`font-display`), angoli squadrati, linee tratteggiate.
- Finestre e portali stanno fuori da `.adm-skin` e vanno stilizzati a parte (le `role="dialog"` hanno sfondo pieno in `admin-insegna.css`).

## Altro
- `.agents/AGENTS.md` e `.gemini/` vengono da altri strumenti: il loro flusso di deploy (`git push origin master:main`, `npx vercel --prod`) è vecchio. Con Claude vale questo file.
- Migrazione `011_qr_login_sicuro.sql`: eseguita da Eliseo (login con QR).
