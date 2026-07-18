# 💈 Barberia Garofalo — Sito Web

**Sito web completo, con sistema di prenotazione, area clienti e pannello admin.**  
Barbiere professionale a Foggia — uomo, ragazzo e bimbo.

🌐 **Live:** [garofalo-barberia.vercel.app](https://garofalo-barberia.vercel.app)  
🏠 **Dominio:** [barberiagarofalo.it](https://barberiagarofalo.it)  
📁 **Repository:** [github.com/sfondiitaliani23-svg/garofalo-barberia](https://github.com/sfondiitaliani23-svg/garofalo-barberia)

---

## 👨‍💻 Team di Sviluppo Assegnato

Questo progetto è seguito da un **team di sviluppatori senior** con piena responsabilità tecnica, incaricato di mantenerlo, migliorarlo e garantirne la qualità nel tempo.

### Ruoli e Responsabilità

| Ruolo | Responsabilità |
|---|---|
| **Lead Full-Stack** | Architettura Next.js, integrazione Supabase, server actions |
| **Frontend Engineer** | UI/UX, design system, responsive layout, animazioni |
| **Backend Engineer** | API routes, sistema di prenotazione, disponibilità barbieri |
| **DevOps** | Deploy Vercel, variabili d'ambiente, CI/CD |
| **DBA** | Schema Supabase, migrazioni, RLS policies, performance |

### Standard di Qualità

Il team si impegna a rispettare i seguenti standard ad **ogni intervento**:

- ✅ **Zero regressioni**: ogni modifica viene verificata con `npm run build` prima del deploy
- ✅ **Codice pulito**: TypeScript strict, nomi descrittivi, zero `any` dove evitabile
- ✅ **Mobile-first**: ogni componente è testato su viewport mobile (375px+)
- ✅ **Performance**: nessuna importazione non necessaria, immagini ottimizzate con `next/image`
- ✅ **UX premium**: animazioni fluide, feedback visivo su ogni azione utente
- ✅ **Sicurezza**: RLS Supabase attiva, middleware di autenticazione, nessun dato sensibile esposto lato client
- ✅ **Commit semantici**: messaggi commit chiari (`feat:`, `fix:`, `chore:`)
- ✅ **Documentazione aggiornata**: questo README riflette sempre lo stato reale del progetto

---

## 🏗️ Stack Tecnologico

| Layer | Tecnologia |
|---|---|
| **Framework** | Next.js 15 (App Router, Turbopack in dev) |
| **Linguaggio** | TypeScript 5 |
| **Database** | Supabase (PostgreSQL + Auth + Storage) |
| **Styling** | TailwindCSS 4 + CSS custom per componenti complessi |
| **UI Components** | Radix UI (accessibili, non-styled) |
| **Email** | Resend |
| **Deploy** | Vercel (CI/CD automatico da `main`) |
| **Charts** | Recharts (admin analytics) |
| **Toast** | Sonner |

---

## 📁 Struttura del Progetto

```
BARBERIA GAROFALO SITO/
│
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (metadata, Toaster globale)
│   ├── globals.css               # Stili globali (WhatsApp float, utility)
│   │
│   ├── (public)/                 # Pagine pubbliche con header/footer
│   │   ├── layout.tsx            # Layout con SiteHeader, Footer, WhatsApp, ScrollToTop
│   │   ├── page.tsx              # Home page
│   │   ├── home.css              # Stili home (hero, sezioni, animazioni)
│   │   ├── public-pages.css      # Stili condivisi pagine pubbliche
│   │   ├── chi-siamo/            # Pagina "Chi siamo" con cartoon + storia
│   │   ├── servizi/              # Listino servizi con prezzi
│   │   ├── galleria/             # Galleria foto
│   │   ├── contatti/             # Contatti + mappa
│   │   └── prenota/              # Funnel di prenotazione (3 step)
│   │
│   ├── (auth)/                   # Pagine di autenticazione (login, register)
│   │
│   ├── area-cliente/             # Zona riservata clienti (richiede login)
│   │   ├── layout.tsx            # Layout con sidebar navigazione
│   │   ├── dashboard/            # Dashboard con benvenuto + appuntamenti
│   │   ├── appuntamenti/         # Gestione appuntamenti
│   │   ├── storico/              # Storico prenotazioni
│   │   ├── galleria/             # Foto prima/dopo del cliente
│   │   ├── profilo/              # Dati personali + preferenze
│   │   └── assistenza/           # FAQ e supporto
│   │
│   ├── admin/                    # Pannello admin (richiede ruolo admin)
│   │   ├── login/                # Login admin separato
│   │   └── (protected)/          # Tutte le sezioni protette:
│   │       ├── dashboard/        # KPI, grafici, attività recente
│   │       ├── prenotazioni/     # Gestione appuntamenti
│   │       ├── clienti/          # Anagrafica clienti
│   │       ├── staff/            # Gestione barbieri
│   │       ├── servizi/          # Gestione servizi e prezzi
│   │       ├── inventario/       # Prodotti e magazzino
│   │       ├── promozioni/       # Codici sconto
│   │       ├── contenuti/        # Banner e annunci sito
│   │       ├── analytics/        # Analytics avanzati
│   │       └── report/           # Report e export
│   │
│   ├── api/                      # API Routes
│   │   ├── analytics/            # Tracking visite e comportamento
│   │   └── cron/                 # Job schedulati (reminder, cleanup)
│   │
│   └── auth/                     # Callback OAuth (Google etc.)
│
├── components/                   # Componenti riutilizzabili
│   ├── layout/                   # SiteHeader, SiteFooter, WhatsAppFloat, ScrollToTop
│   ├── booking/                  # Wizard prenotazione multi-step
│   ├── admin/                    # Componenti pannello admin
│   ├── customer/                 # Componenti area cliente (AppointmentCard, SavedToast)
│   ├── analytics/                # VisitorTracker
│   ├── auth/                     # Form login/register
│   ├── galleria/                 # Galleria con filtri
│   ├── home/                     # Sezioni homepage
│   ├── chi-siamo/                # Sezioni chi siamo
│   ├── contatti/                 # Mappa e form contatti
│   ├── servizi/                  # Lista servizi
│   └── ui/                       # Primitivi UI (Button, Input, Label, ecc.)
│
├── lib/                          # Logica e utilità
│   ├── site-config.ts            # ⭐ Config centralizzata (tel, orari, servizi, ecc.)
│   ├── auth.ts                   # Helper autenticazione (getProfile, getSession)
│   ├── utils.ts                  # Utility generali (cn, formatters)
│   ├── actions/                  # Server Actions
│   │   ├── auth.ts               # signIn, signUp, signOut, updateProfile
│   │   ├── bookings.ts           # createAppointment, cancelAppointment
│   │   ├── availability.ts       # getAvailableSlots, resolveBarber
│   │   ├── admin.ts              # Tutte le azioni admin (CRUD completo)
│   │   ├── analytics.ts          # Record visite, stats
│   │   └── promotions.ts         # Valida e applica codici promo
│   ├── supabase/                 # Client Supabase (server, client, admin)
│   ├── auth/                     # Sessione cliente, ensure-profile
│   ├── data/                     # Dati statici (homepage.ts: PRICE_LIST, REVIEWS, ecc.)
│   └── utils/                    # Utilità specifiche (booking-datetime, notifications)
│
├── supabase/
│   ├── migrations/               # 8 migrazioni SQL versionate
│   ├── full_setup.sql            # Setup completo DB da zero
│   └── seed.sql                  # Dati iniziali (barbieri, servizi)
│
├── middleware.ts                 # Auth guard: /area-cliente e /admin
├── next.config.ts                # Config Next.js (immagini remote, redirect legacy)
├── package.json                  # Dipendenze
└── .env.local                    # Variabili d'ambiente (NON in git)
```

---

## 🗃️ Schema Database (Supabase)

| Tabella | Descrizione |
|---|---|
| `profiles` | Estende `auth.users`. Campi: `role`, `full_name`, `phone`, `hair_preferences`, `personal_notes` |
| `barbers` | Barbieri attivi con disponibilità, bio, immagine |
| `services` | Servizi con prezzo (in centesimi), durata, categoria |
| `barber_availability` | Orari settimanali per barbiere (giorno + fascia oraria) |
| `barber_time_off` | Assenze/chiusure puntuali |
| `appointments` | Prenotazioni con constraint EXCLUDE anti-sovrapposizione |
| `appointment_photos` | Foto prima/dopo associate agli appuntamenti |
| `site_content` | Banner e annunci gestibili da admin |
| `promotions` | Codici sconto con scadenza e utilizzi massimi |
| `products` | Inventario prodotti |

**RLS attiva su tutte le tabelle.** Il middleware autentica le route `/area-cliente` e `/admin`.  
La sessione cliente scade dopo **2 mesi** (cookie `customer_session_until`).

---

## 🔐 Autenticazione e Ruoli

```
Utente non autenticato → può navigare tutte le pagine pubbliche e prenotare
Utente con ruolo 'customer' → accede a /area-cliente/*
Utente con ruolo 'admin' → accede a /admin/* (redirect automatico da /area-cliente)
```

**Flusso prenotazione:** anonimo o autenticato → crea appuntamento → notifica WhatsApp admin.

---

## ⚙️ Configurazione Centrale

Tutti i dati statici del sito (telefono, orari, servizi, indirizzo) sono in **un solo file**:

```
lib/site-config.ts → SITE_CONFIG
```

Per aggiornare un dato, si modifica solo questo file.

---

## 🚀 Comandi Principali

```bash
npm run dev          # Dev server con Turbopack (http://localhost:3000)
npm run build        # Build produzione (verifica prima del deploy)
npm run lint         # Linting ESLint
npm run db:check     # Controlla migrazioni pendenti
npm run db:migrate   # Esegue migrazioni pendenti
```

---

## 🚀 Ultime Funzionalità Implementate (Luglio 2026)

Abbiamo aggiunto le seguenti funzionalità avanzate per migliorare l'esperienza utente e la stabilità del sistema:

### 1. Doppia Scelta e Modifica Combo Appuntamenti (Admin)
- **Selezione Multipla dei Servizi**: Il pannello admin per la creazione e la modifica degli appuntamenti supporta la selezione contemporanea di più servizi.
- **Risoluzione Combo**: In fase di modifica, il sistema pre-seleziona automaticamente tutti i servizi collegati alla combo notes e li rischedula in sequenza temporale (back-to-back) sul calendario, prevenendo la frammentazione o sovrapposizioni orarie.

### 2. Recensioni Real-Time su Supabase
- **Tabella Database Dedicata**: Schema delle recensioni integrato in Supabase con Row Level Security (RLS) attiva per l'inserimento pubblico e la visibilità ristretta ai soli consensi.
- **Modulo di Invio e Pagina Completa**: Introdotte le pagine `/recensioni/nuova` (per inviare la recensione con spunta di consenso) e `/recensioni` (per visualizzare l'archivio di tutti i commenti in un layout responsive a griglia).
- **Animazione Premium**: Animazione hover dorata che attiva un riflesso lucido diagonale (sheen sweep) in loop infinito, con uno scorrimento di `1.3s` seguito da una pausa di `1.5s`.

### 3. Sincronizzazione Login QR Code su PC
- **Gestione Asincrona Server-side**: Collegamento del token QR delegato direttamente all'interno delle server actions `signInWithEmail`/`signUpWithEmail` del telefono prima del redirect, evitando l'interruzione della chiamata di rete sul cellulare.
- **Sincronizzazione Cookie PC**: L'azione server `signInWithQrTokens` imposta immediatamente i cookie lato server sul browser del PC, garantendo un accesso istantaneo e sicuro alla dashboard senza respingimenti dal middleware.

---

## 🌍 Deploy

Il deploy avviene automaticamente su **Vercel** ad ogni push su `main`.

**Variabili d'ambiente richieste in Vercel:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`

---

## 📝 Note Operative

- **Aggiungere un servizio:** modifica `lib/site-config.ts` (lista `services`) e il seed DB
- **Aggiungere un barbiere:** usa il pannello admin → Staff → Nuovo barbiere
- **Modificare orari:** modifica `SITE_CONFIG.hours` in `lib/site-config.ts`
- **Aggiungere un banner:** usa il pannello admin → Contenuti → Nuovo banner
- **Eseguire una migrazione DB:** `npm run db:migrate` o esegui il file SQL direttamente su Supabase

---

**Versione corrente:** 2.0 (Next.js 15 full-stack)  
**Ultimo aggiornamento:** Luglio 2026  
**Status:** ✅ In produzione su garofalo-barberia.vercel.app
