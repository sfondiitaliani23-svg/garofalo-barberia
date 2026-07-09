# ⚡ DEPLOYMENT CHECKLIST (5 minuti)

## ✅ PRE-DEPLOYMENT (Fai adesso)

### Data & Configuration
- [ ] **js/config.js** aggiornato con:
  - [ ] Numero telefono reale
  - [ ] Email reale
  - [ ] Indirizzo reale
  - [ ] URL Fresha REALE (non placeholder!)
  - [ ] Google Analytics ID (se hai)

### Images Added
- [ ] Foto salone in `assets/`
- [ ] Foto team in `assets/team/`
- [ ] Foto gallery in `assets/gallery/` (6+ immagini)

### Verifica Veloce
- [ ] Apri index.html nel browser
- [ ] Clicca tutti i link → funzionano?
- [ ] Prova WhatsApp button → apre WhatsApp?
- [ ] Prova gallery filters → filtra?
- [ ] Prova form contact → manda WhatsApp?

---

## 🚀 DEPLOYMENT (Segui esattamente)

### Step 1: Apri Terminale (1 min)
```
Windows: Tasto Windows + R → powershell → Enter
Mac: Cmd + Space → terminal → Enter
```

### Step 2: Vai nella Cartella (30 sec)
```bash
cd "C:\Users\Eliseo Miraglia\Desktop\BARBERIA GAROFALO SITO"
```

### Step 3: Installa Vercel (2 min)
```bash
npm install -g vercel
```
*Attendi che finisca*

### Step 4: Login (1 min)
```bash
vercel login
```
Rispondi con il tuo email Vercel/Gmail

### Step 5: Deploy! (1 min)
```bash
vercel --prod
```

Rispondi alle domande:
```
? Set up and deploy "..."? → y
? Which scope? → Enter (default)
? Link to existing project? → n
? Project name? → garofalo-barberia → Enter
? Directory? → Enter (default)
? Modify settings? → n
```

**Aspetta il build... (~1-2 minuti)**

### Step 6: URL Generato ✅
Vedrai:
```
✓ Production
Domains: garofalo-barberia.vercel.app
```

**COPIA QUESTO LINK! È IL TUO SITO!**

---

## 🧪 POST-DEPLOYMENT TEST (3 min)

Apri il link nel browser e verifica:

- [ ] **Home page** carica
- [ ] **Immagini** visibili
- [ ] **Menu mobile** (toggle funziona)
- [ ] **WhatsApp button** (clicca → apre WhatsApp)
- [ ] **Gallery filters** (clicca filtri → filtra)
- [ ] **Contact form** (riempi → invia WhatsApp)
- [ ] **Link Fresha** (funziona)
- [ ] **Tutte le pagine** accessibili

### Se qualcosa NON funziona:
1. F12 → Console → ci sono errori rossi?
2. Controlla usi lo stesso numero WhatsApp in config.js
3. Aspetta 30 sec e ricarica (caching)

---

## 🎊 DONE! Il Sito è LIVE

### Condividi il Link
```
📱 WhatsApp: "Ecco il mio nuovo sito! [LINK]"
📸 Instagram: Metti link in Bio
📘 Facebook: Aggiungi a pagina barberia
```

---

## 📝 Se Vuoi Un Dominio Personalizzato

Es: `www.garofalobarberia.it` (al posto di `.vercel.app`)

### Costo: ~€10/anno
1. Compra dominio su Aruba/Namecheap
2. In Vercel: Aggiungi dominio
3. Copia DNS records nel registrar
4. Aspetta 24-48h

---

## 🆘 Errori Comuni

| Errore | Soluzione |
|--------|-----------|
| "npm: command not found" | Installa Node.js da nodejs.org |
| "vercel: command not found" | Rifa: `npm install -g vercel` |
| "Build failed" | Controlla file paths siano corretti |
| "WhatsApp non funziona" | Config.js ha numero sbagliato |
| "Fresha non carica" | Attendi 30sec, ricarica, Fresha è lento |

---

## ✨ Prossimo Passo

Monitorare il sito:
- Accedi vercel.com → Dashboard → vedi visitor
- Condividi link ai clienti
- Raccogli feedback
- Piano Phase 2 (se necessario)

---

**🎉 CONGRATULAZIONI! Il tuo sito è LIVE! 🚀**

Tempo totale: ~90 minuti dal progetto alla produzione
Status: ✅ **LIVE & WORKING**
