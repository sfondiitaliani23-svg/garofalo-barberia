# 🚀 Garofalo Barberia - Quick Start Guide

## Testare il Sito Localmente

### Opzione 1: Live Server (VS Code)
1. Installa l'estensione "Live Server" da Microsoft
2. Click destro su `index.html` → "Open with Live Server"
3. Il sito si apre su http://localhost:5500

### Opzione 2: Usare Python
```bash
cd "c:\Users\Eliseo Miraglia\Desktop\BARBERIA GAROFALO SITO"
python -m http.server 8000
# Apri http://localhost:8000
```

### Opzione 3: Usare Node.js
```bash
npm install -g http-server
http-server
# Apri http://localhost:8080
```

---

## 📋 Checklist Pre-Deploy

### Personalizzazione Dati
- [ ] **js/config.js** - Aggiorna:
  - `phone`: Il tuo numero reale
  - `whatsapp`: Il tuo numero WhatsApp
  - `email`: Email aziendale
  - `address`: Indirizzo reale salone
  - `freshaUrl`: URL Fresha shop reale
  - `ga4Id`: Google Analytics ID reale

### Immagini
- [ ] Carica foto salone in `assets/`
- [ ] Carica foto team in `assets/team/`
- [ ] Carica foto gallery in `assets/gallery/`
- [ ] Aggiungi lazy loading paths in HTML (src="path" data-src="url")

### Contenuti
- [ ] Verifica nomi team e specialità
- [ ] Controlla prezzi servizi
- [ ] Aggiorna orari apertura
- [ ] Personalizza testimoniali

### Integrazione Fresha
- [ ] Accedi a fresha.com
- [ ] Crea shop per barberia
- [ ] Copia URL embed
- [ ] Incolla in `prenota.html` iframe src

### Google Maps
- [ ] Vai a google.com/maps
- [ ] Cerca tua posizione
- [ ] Click "Condividi" → "Incorpora mappa"
- [ ] Copia iframe code
- [ ] Sostituisci in `contatti.html`

### Google Analytics
- [ ] Crea proprietà Google Analytics 4
- [ ] Copia ID (formato: G-XXXXXXXXXX)
- [ ] Sostituisci `ga4Id` in `js/config.js`

### Form Backend (Opzionale)
Attualmente il form invia via WhatsApp. Per email delivery:

**Opzione A: Formspree (Gratuito)**
1. Vai formspree.io
2. Crea nuovo form
3. Aggiungi action in HTML: `<form action="https://formspree.io/f/YOUR_ID" method="POST">`

**Opzione B: Netlify Forms**
Se deployato su Netlify, aggiungi `netlify` attribute al form

**Opzione C: Backend personalizzato**
Crea endpoint API che processa form data

---

## 🧪 Testing Checklist

### Desktop (Chrome/Firefox/Safari)
- [ ] Carica index.html
- [ ] Click su tutti i nav links
- [ ] Verifica tutti i bottoni
- [ ] Prova gallery filter
- [ ] Riempi contact form
- [ ] Prova WhatsApp links

### Mobile (Smartphone)
- [ ] Apri site su iPhone/Android
- [ ] Menu toggle funziona?
- [ ] Bottoni sono clickabili?
- [ ] WhatsApp float visible?
- [ ] Form responsive?
- [ ] Immagini caricano?

### Accessibilità
- [ ] Keyboard navigation (Tab)
- [ ] Screen reader test (NVDA/JAWS)
- [ ] Color contrast check
- [ ] Focus states visible

### Performance
- [ ] Page load time < 3s
- [ ] Core Web Vitals check
- [ ] Mobile speed score > 80 (PageSpeed Insights)

---

## 🌐 Deploy Options

### Opzione 1: Vercel (Consigliato - Gratuito)
```bash
# Installa Vercel CLI
npm install -g vercel

# Deploy
vercel

# Vercel ti guida attraverso il setup
# Il sito sarà online immediatamente
```

### Opzione 2: Netlify (Gratuito)
1. Vai netlify.com
2. Drag & drop cartella sito
3. Sito online in 30 secondi
4. Configura custom domain

### Opzione 3: GitHub Pages (Gratuito)
```bash
# Crea repo GitHub
# Push cartella sito
# Settings → Pages → Deploy from branch
# Sito online su username.github.io/repo
```

### Opzione 4: Hosting Tradizionale
1. Compra hosting da Aruba/SiteGround/Bluehost
2. Scarica FileZilla
3. Connetti via FTP
4. Upload cartella sito
5. Configura dominio DNS

### Opzione 5: Azure Static Web Apps
1. Connetti GitHub repo
2. Crea Azure Static Web Apps resource
3. Configura domain
4. Auto-deploy da GitHub

---

## 🔒 Sicurezza

Prima di deployare:
- [ ] Niente password in files
- [ ] Niente API keys esposte
- [ ] HTTPS abilitato (tutti i hosting moderni lo fanno)
- [ ] robots.txt configurato (se su server proprio)
- [ ] sitemap.xml generato (SEO)

---

## 📈 Post-Deploy Checklist

### Google Business Profile
- [ ] Crea/Aggiorna Google Business Profile
- [ ] Aggiungi foto salone & team
- [ ] Imposta orari apertura
- [ ] Verifica dominio

### SEO Basics
- [ ] Google Search Console setup
- [ ] Bing Webmaster Tools setup
- [ ] Sitemap submission
- [ ] Robots.txt created
- [ ] Meta tags verificati

### Analytics Setup
- [ ] GA4 tracking verificato
- [ ] Goal conversions configurati
- [ ] WhatsApp clicks tracciati

### Social Media
- [ ] Instagram link funziona
- [ ] Facebook page linked
- [ ] Share buttons testati

---

## 🐛 Troubleshooting Comuni

### Bottoni WhatsApp non funzionano
- Verifica `js/config.js` - numero WhatsApp corretto?
- Testa link: `https://wa.me/TUNUMERO?text=ciao`

### Gallery filter non filtra
- Verifica che `.gallery-item` ha attributo `data-category`
- Controlla console browser per errori JS

### Form non invia
- Se usi Formspree: verificato action URL?
- Se WhatsApp: numero configurato in config.js?

### Immagini non caricano
- Verificati file paths in HTML?
- Immagini presenti in assets/?
- Formato file supportato (jpg, png, webp)?

### Mobile menu non funziona
- Verifica che `js/main.js` è caricato
- Check console per errori JavaScript
- ID "menu-toggle" e "mobile-menu" corretti?

---

## 📞 Support

Se hai problemi:
1. Controlla console browser (F12)
2. Verifica file paths sono corretti
3. Assicurati tutte le risorse esterne sono accessibili
4. Test con diversi browser

---

## 🎯 Prossimi Passi (Fase 2)

Dopo il lancio MVP, puoi aggiungere:
- [ ] Blog/Notizie salone
- [ ] Loyalty program
- [ ] Video testimonianze
- [ ] Live chat support
- [ ] Virtual tour 3D
- [ ] Sistema booking avanzato
- [ ] Email newsletter
- [ ] Promozioni seasonal

---

**Buona fortuna con il lancio! 🚀**
