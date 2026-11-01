# DESIGN.md — Barberia Garofalo

Stile del sito e dell'app barberiagarofalo.it, scritto per chi crea pagine, grafiche o demo (persone o IA).
Fonti di verità: `app/globals.css` (`@theme`), `app/look.css` (versione oro), `components/layout/cust-skin.css` e `admin-insegna.css` (aree riservate).
Ultima modifica: 2026-11-02.

## In una riga
Barberia di quartiere a Foggia, calda e classica: nero e oro, titoli a insegna in Rye, testi in Montserrat. Due aspetti scelti dal cliente: **nero** (predefinito) e **oro**.

## Colori — versione nera (predefinita)
| Ruolo | Variabile | Valore |
|---|---|---|
| Fondo | `--color-black` | nero (`#000` / `#0a0807` nelle aree riservate) |
| Testo | `--color-white` | bianco; crema `#f3e6c8` nelle aree riservate |
| Oro | `--color-gold` | `#cd9a4f` |
| Oro chiaro | `--color-gold-light` | `#ffb949` |
| Oro scuro | `--color-gold-dark` | `#c88c23` |

## Colori — versione oro (`html[data-look='gold']`)
| Ruolo | Valore |
|---|---|
| Fondo | `#e4c36a` |
| Testo e pulsanti | `#1a140c` |
| Testo secondario | `rgba(26,20,12,.66–.78)` |
| Card chiare | `#fff8e6` |

I riquadri che restano neri anche nella versione oro (profumi, journal, prodotti, FAQ, prezzi, QR, accesso, `/link`) riportano dentro i colori della versione nera: vedi la lista in `app/look.css`. Ogni componente nuovo va provato in **tutte e due** le versioni.

## Caratteri
- **Rye** (titoli, `font-display`): maiuscolo, a insegna. Solo per titoli brevi.
- **Montserrat** (testi, `font-sans`).
- Tutti e due tramite `next/font`.

## Forme
- Sito pubblico: pulsanti a pillola (`rounded-full`). `.btn-primary`: fondo oro, testo nero. `.btn-outline`: bordo e testo oro.
- Aree riservate («Insegna»): **angoli squadrati**, bordi oro sottili `rgba(205,154,79,.4)`, **linee tratteggiate**, fondo `#0a0807` con righe verticali appena visibili.
- WhatsApp: i colori di stato (verde, rosso) restano com'è, di proposito.

## Movimento
- Solo `transform`, `opacity`, `clip-path`, `filter` (vedi skill `animazioni-siti`). Da sistemare alla prossima modifica: 4 animazioni su `width`/`top`/`left`.
- Movimento ridotto sempre.

## Contenuti
- Testi sempre in italiano e in inglese (`L(lang, it, en)`).
- Foto di persone solo con liberatoria. Nessuna promessa medica sui massaggi.
- Dati dei clienti mai in grafiche, storie o «Wrapped» (mai importi).

## Da evitare
- Oswald e i pulsanti a parallelogramma di Maurizio/Maximize: sono un altro brand.
- Testi bianchi scritti a mano senza variabile: nella versione oro finiscono bianco su oro.
- Grigi freddi e gradienti viola o blu.
