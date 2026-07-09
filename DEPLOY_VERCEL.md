# 🚀 Garofalo Barberia - Deployment Guide (Step-by-Step)

## STEP 2: Configurazione Fresha (Fatto da te)

### ⏰ Tempo: 15 minuti
### 📍 Dove aggiornare:

**OPZIONE A: Modifica rapida in prenota.html**
1. Apri `prenota.html`
2. Cerca la riga con: `<iframe src="https://www.fresha.com/a/garofalo-barberia-foggia"`
3. Sostituisci `garofalo-barberia-foggia` con il tuo username Fresha reale
4. Salva il file

**OPZIONE B: Aggiorna config.js (consigliato)**
1. Apri `js/config.js`
2. Riga ~29, cambia:
```javascript
freshaUrl: 'https://www.fresha.com/a/SOSTITUISCI-CON-TUO-USERNAME',
```
3. Salva

---

## STEP 3: Deploy su Vercel (ISTRUZIONI DETTAGLIATE)

### ⏰ Tempo: 10 minuti
### 📋 Prerequisiti:
- Accesso a internet
- Account GitHub/Gmail (per Vercel)
- La cartella del sito pronta

### 🎯 Processo di Deploy Vercel

#### Fase 1: Prepara il Codice (2 min)

1. **Apri terminale/PowerShell:**
   - Windows: Tasto Windows + R → digita `powershell` → Enter
   - Mac: Cmd + Spazio → digita `terminal` → Enter

2. **Naviga alla cartella del sito:**
```bash
cd "C:\Users\Eliseo Miraglia\Desktop\BARBERIA GAROFALO SITO"
```

3. **Verifica che tutti i file sono presenti:**
```bash
ls
# Dovresti vedere: index.html, servizi.html, prenota.html, etc.
```

#### Fase 2: Installa Vercel CLI (2 min)

1. **Digita nel terminale:**
```bash
npm install -g vercel
```

2. **Attendi il completamento** (potrebbe prendere 1-2 minuti)

3. **Verifica l'installazione:**
```bash
vercel --version
# Dovrebbe stampare una versione tipo "v28.0.0"
```

#### Fase 3: Login a Vercel (2 min)

1. **Nel terminale, digita:**
```bash
vercel login
```

2. **Verrà chiesto il tuo email:**
   - Digita l'email del tuo account Vercel (o Gmail se usi quella)
   - Premi Enter

3. **Vercelti manderà un link via email:**
   - Apri la email
   - Click sul link di verifica
   - Torna al terminale (dovrebbe dire "✓ Email confirmed")

#### Fase 4: Deploy il Sito (2 min)

1. **Nel terminale (nella cartella del sito), digita:**
```bash
vercel --prod
```

2. **Vercel farà domande, rispondi così:**

```
? Set up and deploy "..." from "..."? (y/N)
→ Digita: y (yes)

? Which scope do you want to deploy to? 
→ Premi Enter (sceglie il default, il tuo account)

? Link to existing project? (y/N)
→ Digita: n (no)

? What's your project's name?
→ Digita: garofalo-barberia
(oppure: garofalo-barberia-foggia)
Premi Enter

? In which directory is your code located?
→ Premi Enter (usa attuale)

? Want to modify these settings?
→ Digita: n (no)
```

3. **Vercel compila il sito:**
```
🔍 Detecting project structure
💾 Uploading [XX files]
⏳ Building...
✅ Build complete!
```

#### Fase 5: Il Sito è LIVE! 🎉

**Vedrai output tipo:**
```
✓ Production
  Domains: garofalo-barberia-foggia.vercel.app
  Created: 2024-01-15T10:30:00.000Z
```

**Il tuo sito è live su:**
```
https://garofalo-barberia-foggia.vercel.app
```

---

## ✅ Dopo il Deploy

### Test Immediato
1. Apri il link nel browser
2. Verifica tutte le pagine:
   - [ ] Home page carica
   - [ ] Immagini visibili
   - [ ] Menu mobile funziona
   - [ ] WhatsApp button funziona
   - [ ] Gallery filters funzionano
   - [ ] Form contact funziona
   - [ ] Link Fresha funziona

### Condividi il Link
- **WhatsApp:** "Guarda il mio nuovo sito!" + link
- **Instagram:** Bio → link sito
- **Facebook:** Page → website
- **Google Business Profile:** Aggiungi website URL

---

## 🎯 Prossimo Step: Dominio Personalizzato (Opzionale)

Se vuoi `www.garofalobarberia.it` invece di `vercel.app`:

### Costo: ~€10/anno (dominio .it)

1. **Compra dominio su:**
   - **Aruba:** aruba.it
   - **Namecheap:** namecheap.com
   - **GoDaddy:** godaddy.com
   - **Ionos:** ionos.it

2. **In Vercel Dashboard:**
   - Progetto → Settings → Domains
   - Click "Add Domain"
   - Digita dominio (es: garofalobarberia.it)
   - Vercel ti da le istruzioni DNS
   - Aggiungi i DNS record nel tuo registrar

3. **Attendi propagazione:** 24-48 ore

---

## 🆘 Troubleshooting

### "vercel: command not found"
```bash
# Reinstalla:
npm install -g vercel

# Se non funziona, prova:
npx vercel --prod
```

### "Error: Not authenticated"
```bash
# Ri-loga:
vercel logout
vercel login
```

### "Build failed"
- Verifica che tutti i file sono in posti corretti
- Niente file corrotti o con nome sbagliato
- Vercel mostrerà l'errore specifico

### Le immagini non caricano
- Assicurati che paths sono relativi (es: `assets/image.jpg`)
- Non usare path assoluti

### Fresha widget non appare
- Verifica che freshaUrl è corretto
- Fresha server a volte è lento da caricare

---

## 📊 Monitoraggio Post-Deploy

### Analytics
1. Accedi a vercel.com
2. Dashboard → Progetto
3. Analytics tab → vedi i visitor

### Errori
1. Dashboard → Logs
2. Se vedi errori, controlla:
   - Browser console (F12)
   - File names e paths

---

## 🎊 Congratulazioni!

Il tuo sito è **LIVE** e accessibile a tutto il mondo! 🚀

**Prossimi passi:**
1. Monitora le visite (Analytics)
2. Raccogli feedback dai clienti
3. Plan Phase 2 (se necessario)

---

**Domande? Controlla QUICK_START.md o README.md**
