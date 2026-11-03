// Schermata di benvenuto dell'app installata (03/11/2026), sullo schema delle app sportive:
// foto a tutto schermo con il marchio al centro, «Impostazioni» in alto a sinistra, ✕ in alto a destra,
// foglio in basso con «Accedi» e «Iscriviti» che, tirato su, mostra i vantaggi per gli iscritti.
// Stesso file nei quattro siti; cambia solo la configurazione. Nessun innerHTML: solo nodi DOM.
const SVG = 'http://www.w3.org/2000/svg';
const icona = (d, cls) => {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
  if (cls) s.setAttribute('class', cls);
  const p = document.createElementNS(SVG, 'path'); p.setAttribute('d', d); s.append(p);
  return s;
};
const I = {
  ingranaggio: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', // ingranaggio di Lucide (licenza ISC)
  chiudi: 'M5 5l14 14M19 5 5 19',
  freccia: 'M3 12h17M14 6l6 6-6 6',
  indietro: 'M20 12H4M10 6l-6 6 6 6',
  avanti: 'M9 5l7 7-7 7',
};
const el = (tag, cls, ...figli) => { const n = document.createElement(tag); if (cls) n.className = cls; figli.forEach((f) => { if (f != null) n.append(f); }); return n; };
const vibra = () => { try { navigator.vibrate?.(8); } catch { /* niente */ } };

export function standalone() {
  return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
}

/**
 * cfg: { chiave, nome, logo, logoAlt, sfondo, lingua(): 'it'|'en', lingue: bool, cambiaLingua(l),
 *        testi: { it: {...}, en: {...} }, accedi, iscriviti, privacy, accessibilita, assistenza, versione, loggato(), css }
 */
const DUE_MESI = 60 * 24 * 60 * 60 * 1000;

/**
 * Nell'app installata l'accesso è obbligatorio (03/11/2026, decisione di Eliseo): la schermata resta finché
 * l'utente non entra o si iscrive. Chi è entrato naviga libero; dopo 2 mesi senza aprire l'app deve rientrare.
 * Non compare nelle pagine di accesso (cfg.escludi) e nel browser normale. Prova nel browser: ?benvenuto=1
 */
export async function benvenuto(cfg) {
  // Il sito può coprire la pagina in anticipo (classe bv-attesa nell'<head>) per non far vedere la home prima della schermata
  const libera = () => { document.documentElement.classList.remove('bv-attesa'); document.getElementById('bv-pre')?.remove(); };
  let fatto = null;
  try { fatto = await mostra(cfg); } finally { libera(); }
  if (!fatto) cfg.dopo?.(); // schermata non necessaria (es. utente già dentro): il sito decide dove andare
  return fatto;
}

async function mostra(cfg) {
  if (!document.body) await new Promise((ok) => document.addEventListener('DOMContentLoaded', ok, { once: true }));
  const prova = new URLSearchParams(location.search).has('benvenuto');
  if (!prova && !standalone()) return;
  if ((cfg.escludi || []).some((p) => (p instanceof RegExp ? p.test(location.pathname) : location.pathname.startsWith(p)))) return;
  const chiaveUso = `bv-uso-${cfg.chiave}`;
  let ultimo = 0;
  try { ultimo = Number(localStorage.getItem(chiaveUso) || 0); } catch { /* niente */ }
  const dentro = cfg.loggato ? await cfg.loggato() : false;
  if (dentro && ultimo && Date.now() - ultimo > DUE_MESI) {
    // Due mesi di assenza: si esce e si rifà l'accesso
    try { await cfg.esci?.(); } catch { /* niente */ }
  } else if (dentro) {
    try { localStorage.setItem(chiaveUso, String(Date.now())); } catch { /* niente */ }
    if (!prova) return;
  }
  // Da qui in poi: al prossimo accesso riuscito il contatore riparte dalla pagina successiva
  try { localStorage.removeItem(chiaveUso); } catch { /* niente */ }
  if (document.querySelector('.bv')) return;
  if (cfg.css) {
    let l = document.querySelector(`link[href="${cfg.css}"]`);
    if (!l) { l = document.createElement('link'); l.rel = 'stylesheet'; l.href = cfg.css; document.head.append(l); }
    if (!l.sheet) await new Promise((ok) => { l.addEventListener('load', ok, { once: true }); l.addEventListener('error', ok, { once: true }); setTimeout(ok, 2500); });
  }

  const T = () => cfg.testi[cfg.lingua() === 'en' ? 'en' : 'it'];
  const ricorda = () => { try { sessionStorage.setItem(`bv-${cfg.chiave}`, '1'); } catch { /* niente */ } };
  const temaPrima = document.querySelector('meta[name="theme-color"]')?.getAttribute('content');

  const root = el('div', 'bv');
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
  if (cfg.classe) root.classList.add(cfg.classe);

  // Fondo: foto mossa (come in movimento) + velo scuro
  const fondo = el('div', 'bv-fondo');
  if (cfg.sfondo) fondo.style.backgroundImage = `url("${cfg.sfondo}")`;
  // Video di sfondo (senza audio): se c'è, prende il posto della foto. Parte sempre (richiesta di Eliseo, 03/11/2026):
  // se il telefono blocca l'avvio automatico, riparte al primo tocco.
  let video = null;
  if (cfg.video) {
    fondo.classList.add('bv-fondo--video');
    if (cfg.poster) fondo.style.backgroundImage = `url("${cfg.poster}")`;
    // Se il sito ha già fatto partire il video nell'<head> (id bv-pre), si usa quello: niente ripartenza.
    const pre = document.getElementById('bv-pre');
    video = pre || document.createElement('video');
    if (pre) { pre.removeAttribute('style'); pre.removeAttribute('id'); }
    video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true; video.autoplay = true; video.preload = 'auto';
    ['muted', 'playsinline', 'webkit-playsinline', 'autoplay', 'loop'].forEach((a) => video.setAttribute(a, ''));
    video.setAttribute('aria-hidden', 'true'); video.disablePictureInPicture = true;
    if (cfg.poster) video.poster = cfg.poster;
    if (!pre) { const src = document.createElement('source'); src.src = cfg.video; src.type = 'video/mp4'; video.append(src); }
    fondo.append(video);
  }
  // Animazione (WebP animato): parte sempre da sola, anche dove il telefono blocca i video (03/11/2026)
  if (cfg.animazione && !video) {
    fondo.classList.add('bv-fondo--video');
    if (cfg.poster) fondo.style.backgroundImage = `url("${cfg.poster}")`;
    const img = document.createElement('img');
    img.src = cfg.animazione; img.alt = ''; img.className = 'bv-riserva'; img.decoding = 'async'; img.fetchPriority = 'high';
    fondo.append(img);
  }
  const avvia = () => { if (video && video.paused) video.play?.().catch(() => {}); };
  const velo = el('div', 'bv-velo');

  // Barra in alto
  const btnImp = el('button', 'bv-imp', icona(I.ingranaggio), el('span'));
  btnImp.type = 'button';
  const btnX = el('button', 'bv-x', icona(I.chiudi)); btnX.type = 'button';
  const top = el('div', 'bv-top', btnImp, cfg.obbligo ? el('span') : btnX);

  // Marchio al centro
  let logo = null;
  if (cfg.logo) { logo = el('img', 'bv-logo'); logo.src = cfg.logo; logo.alt = cfg.logoAlt || cfg.nome; logo.decoding = 'async'; }
  const centro = el('div', 'bv-centro', logo);

  // Foglio in basso
  const maniglia = el('button', 'bv-maniglia', el('span')); maniglia.type = 'button';
  const info = el('div', 'bv-info');
  const tasto = (cls, href) => { const a = el('a', `bv-btn ${cls}`, el('span'), icona(I.freccia)); a.href = href; a.addEventListener('click', () => { vibra(); ricorda(); }); return a; };
  const bAcc = tasto('bv-btn--linea', cfg.accedi);
  const bIsc = tasto('bv-btn--pieno', cfg.iscriviti);
  const foglio = el('div', 'bv-foglio', maniglia, info, el('div', 'bv-azioni', bAcc, bIsc));

  // Impostazioni
  const indietro = el('button', 'bv-indietro', icona(I.indietro)); indietro.type = 'button';
  const titImp = el('h2', 'bv-imp-titolo');
  const lista = el('ul', 'bv-lista');
  const ver = el('p', 'bv-versione');
  const pannello = el('div', 'bv-pannello', el('div', 'bv-pannello-top', indietro, titImp, el('span')), lista, ver);
  pannello.hidden = true;

  // Documenti (privacy, accessibilità): si leggono dentro la schermata, senza entrare nel sito (03/11/2026)
  const indietroDoc = el('button', 'bv-indietro', icona(I.indietro)); indietroDoc.type = 'button';
  const titDoc = el('h2', 'bv-imp-titolo');
  const testoDoc = el('div', 'bv-doc');
  const docPan = el('div', 'bv-pannello bv-pannello--doc', el('div', 'bv-pannello-top', indietroDoc, titDoc, el('span')), testoDoc);
  docPan.hidden = true;

  root.append(fondo, velo, top, centro, foglio, pannello, docPan);

  async function apriDoc(titolo, url) {
    vibra();
    titDoc.textContent = titolo;
    testoDoc.replaceChildren(el('p', 'bv-doc-attesa', T().caricamento || '…'));
    docPan.hidden = false; requestAnimationFrame(() => docPan.classList.add('su'));
    indietroDoc.focus({ preventScroll: true });
    try {
      const r = await fetch(url, { credentials: 'same-origin' });
      const html = await r.text();
      const d = new DOMParser().parseFromString(html, 'text/html');
      const base = d.querySelector('main') || d.body;
      base.querySelectorAll('nav, header, footer, script, style, noscript, aside, form, button, svg, [aria-hidden="true"], [hidden]').forEach((n) => n.remove());
      const blocchi = [];
      base.querySelectorAll('h1, h2, h3, h4, p, li, td').forEach((n) => {
        if (n.tagName !== 'LI' && n.closest('li')) return;
        if (n.tagName === 'P' && n.closest('td')) return;
        const t = n.textContent.replace(/\s+/g, ' ').trim();
        if (!t) return;
        const tag = /^H[1-4]$/.test(n.tagName) ? (n.tagName === 'H1' ? 'h3' : 'h4') : 'p';
        blocchi.push(el(tag, n.tagName === 'LI' ? 'bv-doc-voce' : null, t));
      });
      if (!blocchi.length) throw new Error('vuoto');
      testoDoc.replaceChildren(...blocchi);
      testoDoc.scrollTop = 0;
    } catch {
      testoDoc.replaceChildren(el('p', null, T().docErrore || 'Non riesco a caricare il testo. Riprova.'));
    }
  }
  indietroDoc.addEventListener('click', () => { docPan.classList.remove('su'); setTimeout(() => { docPan.hidden = true; }, 280); indietro.focus({ preventScroll: true }); });

  function riga(etichetta, sotto, azione, destra) {
    const b = el(azione.href ? 'a' : 'button', 'bv-riga', el('span', 'bv-riga-t', etichetta, sotto ? el('small', null, sotto) : null), destra || icona(I.avanti));
    if (azione.href) { b.href = azione.href; if (azione.esterno) { b.target = '_blank'; b.rel = 'noopener noreferrer'; } } else { b.type = 'button'; b.addEventListener('click', azione.click); }
    return el('li', null, b);
  }

  function testi() {
    const t = T();
    btnImp.querySelector('span').textContent = t.impostazioni;
    btnImp.setAttribute('aria-label', t.impostazioni);
    btnX.setAttribute('aria-label', t.chiudi);
    root.setAttribute('aria-label', cfg.nome);
    maniglia.setAttribute('aria-label', t.vantaggiTitolo);
    bAcc.querySelector('span').textContent = t.accedi;
    bIsc.querySelector('span').textContent = t.iscriviti;
    info.replaceChildren(el('h2', null, t.vantaggiTitolo), el('p', null, t.vantaggi), el('h2', null, t.iscrivitiTitolo), el('p', null, t.iscrivitiTesto), t.gia ? el('p', 'bv-gia', t.gia) : null);
    titImp.textContent = t.impostazioni;
    indietro.setAttribute('aria-label', t.indietro);
    const righe = [];
    if (cfg.lingue) {
      const sel = el('span', 'bv-lingue');
      ['it', 'en'].forEach((l) => { const b = el('button', null, l.toUpperCase()); b.type = 'button'; b.setAttribute('aria-pressed', String(cfg.lingua() === l)); b.addEventListener('click', (e) => { e.stopPropagation(); vibra(); cfg.cambiaLingua(l); setTimeout(testi, 60); }); sel.append(b); });
      const li = el('li', null, el('div', 'bv-riga', el('span', 'bv-riga-t', t.lingua), sel));
      righe.push(li);
    }
    // Con l'accesso obbligatorio niente link verso il sito: le notifiche si attivano dopo l'accesso
    if (cfg.notifiche && !cfg.obbligo) righe.push(riga(t.notifiche, t.notificheSotto, { href: cfg.notifiche }));
    if (cfg.privacy) righe.push(riga(t.privacy, null, { click: () => apriDoc(t.privacy, cfg.privacy) }));
    if (cfg.assistenza) righe.push(riga(t.assistenza, t.assistenzaSotto, { href: cfg.assistenza, esterno: true }));
    if (cfg.accessibilita) righe.push(riga(t.accessibilita, null, { click: () => apriDoc(t.accessibilita, cfg.accessibilita) }));
    lista.replaceChildren(...righe);
    ver.textContent = cfg.versione ? `${cfg.nome} · ${cfg.versione}` : cfg.nome;
  }
  testi();

  // Aperture e chiusure
  const apriInfo = (si) => { foglio.classList.toggle('aperto', si); root.classList.toggle('info', si); vibra(); };
  maniglia.addEventListener('click', () => apriInfo(!foglio.classList.contains('aperto')));
  let y0 = null;
  foglio.addEventListener('pointerdown', (e) => { y0 = e.clientY; });
  foglio.addEventListener('pointerup', (e) => { if (y0 == null) return; const dy = e.clientY - y0; y0 = null; if (dy < -40) apriInfo(true); else if (dy > 40) apriInfo(false); });
  btnImp.addEventListener('click', () => { vibra(); pannello.hidden = false; requestAnimationFrame(() => pannello.classList.add('su')); indietro.focus({ preventScroll: true }); });
  indietro.addEventListener('click', () => { pannello.classList.remove('su'); setTimeout(() => { pannello.hidden = true; }, 280); btnImp.focus({ preventScroll: true }); root.scrollLeft = 0; });
  const chiudi = () => {
    ricorda(); vibra();
    root.classList.add('via');
    document.documentElement.classList.remove('bv-aperto');
    if (temaPrima) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', temaPrima);
    setTimeout(() => root.remove(), 320);
  };
  btnX.addEventListener('click', chiudi);
  root.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!docPan.hidden) indietroDoc.click(); else if (!pannello.hidden) indietro.click(); else if (foglio.classList.contains('aperto')) apriInfo(false); else if (!cfg.obbligo) chiudi();
  });

  document.body.append(root);
  document.documentElement.classList.add('bv-aperto');
  if (video) {
    avvia();
    ['loadeddata', 'canplay'].forEach((ev) => video.addEventListener(ev, avvia));
    root.addEventListener('pointerdown', avvia, { passive: true });
    // Se dopo 1,5 secondi il video è ancora fermo (telefono che blocca i video), al suo posto va l'animazione WebP
    if (cfg.videoRiserva) {
      setTimeout(() => {
        if (!video.isConnected || (!video.paused && video.currentTime > 0.05)) return;
        const img = document.createElement('img');
        img.src = cfg.videoRiserva; img.alt = ''; img.className = 'bv-riserva'; img.decoding = 'async';
        img.onload = () => { if (video.paused || video.currentTime < 0.05) video.remove(); else img.remove(); };
        fondo.append(img);
      }, 1200);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) avvia(); });
  }
  if (cfg.tema) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cfg.tema);
  requestAnimationFrame(() => root.classList.add('dentro'));
  (cfg.obbligo ? bIsc : btnX).focus({ preventScroll: true });
  return { chiudi, aggiornaTesti: testi };
}

export const TESTI_BASE = {
  it: { caricamento: 'Caricamento…', docErrore: 'Non riesco a caricare il testo. Controlla la connessione e riprova.', impostazioni: 'Impostazioni', chiudi: 'Chiudi', indietro: 'Indietro', lingua: 'Lingua', notifiche: 'Notifiche', notificheSotto: 'Le attivi dalla tua area', privacy: 'Privacy e cookie', assistenza: 'Servizio clienti', assistenzaSotto: 'Scrivici su WhatsApp', accessibilita: 'Accessibilità' },
  en: { caricamento: 'Loading…', docErrore: 'Cannot load the text. Check your connection and try again.', impostazioni: 'Settings', chiudi: 'Close', indietro: 'Back', lingua: 'Language', notifiche: 'Notifications', notificheSotto: 'Turn them on in your area', privacy: 'Privacy and cookies', assistenza: 'Customer service', assistenzaSotto: 'Message us on WhatsApp', accessibilita: 'Accessibility' },
};
