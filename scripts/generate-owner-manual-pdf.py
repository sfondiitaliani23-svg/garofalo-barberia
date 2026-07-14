# -*- coding: utf-8 -*-
"""Genera il manuale PDF per il titolare della Barberia Garofalo."""

from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Image,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT = Path(r"D:\UsersData\Eliseo Miraglia\Desktop\PROGETTO-GAROFALO-SITO.pdf")

# Anteprime visive dal progetto (immagini reali del sito)
SECTION_IMAGES = {
    "home": PROJECT_ROOT / "public/assets/sostituisci-immagini/homepage/1.jpg",
    "servizi": PROJECT_ROOT / "public/assets/sostituisci-immagini/homepage/quadro-prezzi.jpg",
    "chi-siamo": PROJECT_ROOT / "public/assets/sostituisci-immagini/homepage/3.jpg",
    "galleria": PROJECT_ROOT / "public/assets/gallery/1000313558.jpg",
    "contatti": PROJECT_ROOT / "public/assets/sostituisci-immagini/homepage/chi-siamo-banner.jpg",
    "logo": PROJECT_ROOT / "public/assets/sostituisci-immagini/icone/barberia_garofalo-yellow.png",
    "team_luigi": PROJECT_ROOT / "public/assets/sostituisci-immagini/team/luigi-garofalo.png",
}


def build_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=26,
            textColor=colors.HexColor("#1a1a1a"),
            spaceAfter=14,
            alignment=TA_CENTER,
        ),
        "subtitle": ParagraphStyle(
            "Subtitle",
            parent=base["Normal"],
            fontSize=12,
            textColor=colors.HexColor("#555555"),
            alignment=TA_CENTER,
            spaceAfter=24,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=18,
            textColor=colors.HexColor("#cd9a4f"),
            spaceBefore=18,
            spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=13,
            textColor=colors.HexColor("#222222"),
            spaceBefore=12,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["Normal"],
            fontSize=10.5,
            leading=15,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["Normal"],
            fontSize=10.5,
            leading=14,
            leftIndent=12,
            spaceAfter=4,
        ),
        "cred": ParagraphStyle(
            "Cred",
            parent=base["Normal"],
            fontSize=11,
            leading=16,
            textColor=colors.HexColor("#111111"),
            spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["Normal"],
            fontSize=9,
            textColor=colors.HexColor("#666666"),
            alignment=TA_CENTER,
        ),
    }
    return styles


def add_image(styles, key, caption, max_width_cm=15.5, max_height_cm=7.5):
    """Inserisce un'anteprima visiva se il file esiste."""
    path = SECTION_IMAGES.get(key)
    if not path or not path.exists():
        return []
    img = Image(str(path))
    ratio = min((max_width_cm * cm) / img.imageWidth, (max_height_cm * cm) / img.imageHeight)
    img.drawWidth = img.imageWidth * ratio
    img.drawHeight = img.imageHeight * ratio
    return [
        Spacer(1, 0.3 * cm),
        img,
        Paragraph(f"<i>Anteprima: {caption}</i>", styles["small"]),
        Spacer(1, 0.4 * cm),
    ]


def bullet_list(items, styles):
    return ListFlowable(
        [ListItem(Paragraph(item, styles["bullet"]), leftIndent=12) for item in items],
        bulletType="bullet",
        start="•",
        leftIndent=18,
    )


def cred_box(styles):
    data = [
        [Paragraph("<b>ACCESSO AREA AMMINISTRATIVA — CREDENZIALI</b>", styles["cred"])],
        [Paragraph("<b>URL:</b> https://barberiagarofalo.it/admin/login", styles["cred"])],
        [Paragraph("<b>Email:</b> luigigarofalo1996@gmail.com", styles["cred"])],
        [Paragraph("<b>Password attuale:</b> Garofalo2026!Admin", styles["cred"])],
        [
            Paragraph(
                "<b>IMPORTANTE:</b> Conserva queste credenziali in un posto sicuro. "
                "Al primo accesso cambia la password da Supabase o contatta Eliseo Miraglia. "
                "Non condividere la password con persone non autorizzate.",
                styles["cred"],
            )
        ],
    ]
    table = Table(data, colWidths=[16.5 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fff8ec")),
                ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor("#cd9a4f")),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return table


def section_public_home(styles):
    blocks = [
        Paragraph("1. Home (pagina principale)", styles["h1"]),
        Paragraph(
            "<b>Cosa mostra ai clienti:</b> La vetrina principale del salone con banner hero, "
            "sezione Chi siamo, galleria fotografica a scorrimento, listino prezzi in cornice, "
            "recensioni Google, profumi Mood in vendita, modulo newsletter "
            "e pulsanti per prenotare subito.",
            styles["body"],
        ),
    ]
    blocks.extend(add_image(styles, "home", "Home — banner principale con pulsante Prenota ora"))
    blocks.extend(
        [
            Paragraph("<b>Perché è utile:</b>", styles["h2"]),
            bullet_list(
                [
                    "È la prima impressione del salone: trasmette professionalità e stile.",
                    "Guida il cliente verso la prenotazione online con un solo clic.",
                    "Mostra servizi e prezzi senza che il cliente debba telefonare.",
                    "Raccoglie iscrizioni alla newsletter per future comunicazioni.",
                    "Menu di navigazione fisso in alto: Home, Servizi, Chi siamo, Galleria, Contatti, Prenota.",
                ],
                styles,
            ),
        ]
    )
    return blocks


def build_story(styles):
    story = []

    # Copertina
    story.extend(add_image(styles, "logo", "Logo Barberia Garofalo", max_width_cm=5, max_height_cm=3))
    story.append(Spacer(1, 1.5 * cm))
    story.append(Paragraph("BARBERIA GAROFALO", styles["title"]))
    story.append(Paragraph("Documentazione completa del sito web", styles["subtitle"]))
    story.append(Paragraph("Manuale per il titolare dell'attività", styles["subtitle"]))
    story.append(Spacer(1, 1 * cm))
    story.append(
        Paragraph(
            f"Sito live: <b>https://barberiagarofalo.it</b><br/>"
            f"Documento generato il {date.today().strftime('%d/%m/%Y')}",
            styles["subtitle"],
        )
    )
    story.append(Spacer(1, 1.5 * cm))
    story.append(
        Paragraph(
            "Realizzato da <b>Eliseo Miraglia</b> — @eliseomiraglia / @elisee_graphic",
            styles["small"],
        )
    )
    story.append(PageBreak())

    # Panoramica
    story.append(Paragraph("Panoramica generale", styles["h1"]))
    story.append(
        Paragraph(
            "Il sito <b>barberiagarofalo.it</b> è la presenza online ufficiale della Barberia Garofalo di Foggia. "
            "Permette ai clienti di scoprire i servizi, prenotare online, registrarsi e gestire i propri appuntamenti. "
            "Include un'area riservata per il titolare (admin) dove gestire prenotazioni, team, servizi, "
            "promozioni, inventario e statistiche.",
            styles["body"],
        )
    )
    story.append(Paragraph("Struttura del sito", styles["h2"]))
    bullet_list(
        [
            "<b>Parte pubblica</b> — visibile a tutti: Home, Servizi, Chi siamo, Galleria, Contatti, Prenota, Login/Registrazione.",
            "<b>Area cliente</b> — per utenti registrati: dashboard, appuntamenti, storico, profilo, galleria personale.",
            "<b>Area admin</b> — solo per il titolare: gestione completa dell'attività da browser o telefono.",
        ],
        styles,
    )
    story.append(Paragraph("Contatti salone (visibili sul sito)", styles["h2"]))
    bullet_list(
        [
            "Indirizzo: Viale Ignazio d'Addedda, 236 — 71122 Foggia (FG)",
            "Telefono / WhatsApp: 320 188 6277",
            "Email: luigigarofalo1996@gmail.com",
            "Instagram: @barberia_garofalo",
            "Orari: Mar–Ven 09:00–13:00 / 14:00–19:30 · Sab 09:00–13:00 / 14:00–18:00 · Lun e Dom chiuso",
        ],
        styles,
    )
    story.append(PageBreak())

    # Indice
    story.append(Paragraph("Indice", styles["h1"]))
    story.append(
        bullet_list(
            [
                "Panoramica generale e struttura del sito",
                "Sezioni pubbliche (Home, Servizi, Chi siamo, Galleria, Contatti, Prenota, Login, Area cliente, Privacy)",
                "Accesso area amministrativa e credenziali",
                "Guida admin sezione per sezione",
                "Funzionalità automatiche",
                "Guida rapida operativa",
            ],
            styles,
        )
    )
    story.append(PageBreak())

    # Sezioni pubbliche
    story.append(Paragraph("Sezioni pubbliche del sito", styles["h1"]))
    story.extend(section_public_home(styles))

    sections = [
        (
            "2. Servizi (/servizi)",
            "Elenco completo di tutti i servizi offerti (taglio, barba, taglio baby, ecc.) con descrizione, durata e prezzo. "
            "Mostra anche le promozioni attive con eventuali sconti.",
            [
                "Il cliente vede subito quanto costa ogni servizio.",
                "Le promozioni attive incentivano le prenotazioni.",
                "I prezzi si aggiornano automaticamente quando li modifichi dall'admin.",
            ],
            "servizi",
            "Servizi — listino prezzi",
        ),
        (
            "3. Chi siamo (/chi-siamo)",
            "Presentazione del salone, della filosofia e del team (Luigi Garofalo, Vittorio Morlino, Francesco Costantino "
            "con foto, ruolo e specialità).",
            [
                "Crea fiducia mostrando chi lavorerà sul cliente.",
                "Racconta la storia e i valori del salone.",
            ],
            "chi-siamo",
            "Chi siamo — presentazione team",
        ),
        (
            "4. Galleria (/galleria)",
            "Portfolio fotografico dei lavori realizzati, filtrabile per categoria (taglio uomo, barba, bambini, ecc.).",
            [
                "Mostra la qualità del lavoro prima che il cliente prenoti.",
                "Rispetta la privacy dei bambini (mai volti in primo piano).",
            ],
            "galleria",
            "Galleria — portfolio lavori",
        ),
        (
            "5. Contatti (/contatti)",
            "Mappa Google interattiva, indirizzo, telefono, email, link WhatsApp, orari, feed Instagram "
            "e modulo messaggi che apre WhatsApp con testo precompilato (nome, email, telefono, messaggio).",
            [
                "Il cliente trova subito come raggiungerti o contattarti.",
                "WhatsApp con messaggio precompilato per prenotazioni rapide.",
                "Il modulo contatti non invia email: reindirizza direttamente su WhatsApp.",
            ],
            "contatti",
            "Contatti — mappa, orari e modulo messaggi",
        ),
        (
            "6. Prenota online (/prenota)",
            "Sistema di prenotazione in 3 passaggi: (1) scegli servizio, (2) scegli barbiere e orario, (3) conferma con nome e telefono. "
            "Gli orari occupati non compaiono. Funziona da telefono e computer.",
            [
                "Riduce le telefonate per prendere appuntamenti.",
                "Gli orari rispettano automaticamente pausa pranzo e orari reali del salone.",
                "Il cliente può scegliere un barbiere preferito o 'nessuna preferenza'.",
                "Supporta codici promozionali.",
                "Se il cliente è loggato, nome/email/telefono si compilano da soli.",
            ],
            None,
            None,
        ),
        (
            "7. Login e Registrazione (/login, /register)",
            "Accesso area cliente con email/password, Google o GitHub. La sessione resta attiva per 2 mesi sul dispositivo.",
            [
                "I clienti abituali gestiscono appuntamenti senza ripetere i dati.",
                "Possono modificare o disdire entro 30 minuti dall'appuntamento.",
            ],
            None,
            None,
        ),
        (
            "8. Area cliente (/area-cliente)",
            "Area riservata con menu laterale: Dashboard, Appuntamenti, Storico, Galleria tagli, Profilo.",
            [
                "Migliora l'esperienza dei clienti fedeli.",
                "Riduce le chiamate per modifiche o disdette.",
            ],
            "team_luigi",
            "Area cliente — esempio profilo team",
        ),
        (
            "9. Privacy e Cookie (/privacy)",
            "Informativa privacy e banner cookie GDPR all'apertura del sito (accetta tutti, solo necessari, personalizza).",
            [
                "Conformità normativa europea.",
                "Sondaggio 'Aiutaci a conoscerti' solo dopo consenso cookie.",
            ],
            None,
            None,
        ),
    ]

    for title, shows, benefits, img_key, img_caption in sections:
        story.append(Paragraph(title, styles["h1"]))
        story.append(Paragraph(f"<b>Cosa mostra ai clienti:</b> {shows}", styles["body"]))
        if img_key and img_caption:
            story.extend(add_image(styles, img_key, img_caption))
        story.append(Paragraph("<b>Perché è utile:</b>", styles["h2"]))
        story.append(bullet_list(benefits, styles))

    # Dettaglio sottosezioni area cliente
    story.append(Paragraph("Dettaglio area cliente — sottosezioni", styles["h1"]))
    customer_subsections = [
        (
            "Dashboard (/area-cliente/dashboard)",
            "Riepilogo dei prossimi appuntamenti e accesso rapido alla prenotazione.",
        ),
        (
            "Appuntamenti (/area-cliente/appuntamenti)",
            "Lista di tutti gli appuntamenti futuri con pulsanti per modificare o cancellare (entro 30 min dall'orario).",
        ),
        (
            "Storico (/area-cliente/storico)",
            "Elenco degli appuntamenti passati già completati.",
        ),
        (
            "Galleria tagli (/area-cliente/galleria)",
            "Foto dei tagli del cliente caricate dalla barberia dopo l'appuntamento (visibili solo al cliente loggato).",
        ),
        (
            "Profilo (/area-cliente/profilo)",
            "Modifica nome, telefono, email e preferenze capelli (tipo, lunghezza, note).",
        ),
    ]
    for title, desc in customer_subsections:
        story.append(Paragraph(title, styles["h2"]))
        story.append(Paragraph(desc, styles["body"]))

    story.append(PageBreak())

    # Accesso admin
    story.append(Paragraph("Accesso all'area amministrativa", styles["h1"]))
    story.append(cred_box(styles))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("Come cambiare la password (consigliato al primo accesso)", styles["h2"]))
    story.append(
        bullet_list(
            [
                "Accedi all'area admin con le credenziali sopra.",
                "Per cambiare la password in autonomia: contatta Eliseo Miraglia che la aggiornerà su Supabase in modo sicuro.",
                "In alternativa, da Supabase Dashboard → Authentication → Users → seleziona il tuo utente → Reset password.",
                "Usa una password lunga con lettere, numeri e simboli. Non riutilizzare password di altri servizi.",
            ],
            styles,
        )
    )
    story.append(PageBreak())

    # Admin sections
    story.append(Paragraph("Area amministrativa — Guida sezione per sezione", styles["h1"]))

    admin_sections = [
        (
            "Dashboard (/admin/dashboard)",
            "Panoramica rapida: appuntamenti di oggi, incasso stimato oggi/settimana, numero clienti registrati, visitatori sul sito.",
            [
                "Apri il sito e vai su /admin/dashboard.",
                "Controlla ogni mattina quanti appuntamenti hai oggi e l'incasso stimato.",
            ],
            "I dati si calcolano automaticamente dalle prenotazioni confermate nel database.",
        ),
        (
            "Prenotazioni (/admin/prenotazioni)",
            "Calendario settimanale per barbiere: vedi tutti gli slot, crea prenotazioni manuali (clienti in salone), modifica o disdici cliccando su un appuntamento.",
            [
                "Seleziona il barbiere in alto (Luigi, Vittorio, Francesco).",
                "Cambia settimana con il selettore data.",
                "Clicca su uno slot libero (+) per creare una prenotazione.",
                "Clicca su un appuntamento esistente per modificarlo o cancellarlo.",
                "Usa '+ Nuova prenotazione' per aggiungere senza cliccare lo slot.",
            ],
            "Quando crei/modifichi una prenotazione, il sistema verifica che l'orario sia libero. "
            "Gli orari occupati da altri clienti non sono selezionabili. Le modifiche aggiornano subito il calendario online.",
        ),
        (
            "Storico Prenotazioni (/admin/prenotazioni/storico)",
            "Lista di tutte le prossime prenotazioni confermate, ordinata per data. Cerca per nome/telefono. Pulsanti Modifica e Rimuovi.",
            [
                "Vai su Storico Prenotazioni nel menu a sinistra.",
                "Cerca il cliente se necessario.",
                "Clicca Modifica per cambiare orario/servizio, oppure Rimuovi per disdire.",
            ],
            "Ideale quando arriva una telefonata e devi trovare o modificare un appuntamento senza usare il calendario.",
        ),
        (
            "Clienti (/admin/clienti)",
            "Elenco di tutti i clienti registrati con nome, email, telefono e data registrazione. Barra di ricerca integrata.",
            [
                "Cerca un cliente per nome, email o telefono.",
                "Usa l'elenco per ricontattare clienti o verificare chi è registrato.",
            ],
            "I profili si creano automaticamente quando un cliente si registra o prenota con login Google.",
        ),
        (
            "Servizi (/admin/servizi)",
            "Gestione listino: aggiungi, modifica o disattiva servizi. Per ogni servizio: nome, descrizione, durata (minuti), prezzo.",
            [
                "Clicca per modificare un servizio esistente.",
                "Aggiorna prezzo o durata quando cambiano.",
                "Disattiva un servizio che non offri più (non lo vedranno i clienti).",
                "Clicca Salva in basso a destra dopo le modifiche.",
            ],
            "Le modifiche si riflettono subito su /servizi e nel flusso di prenotazione online.",
        ),
        (
            "Promozioni (/admin/promozioni)",
            "Crea sconti e codici promozionali (es. PRIMAVERA20). Puoi associarli a servizi specifici, con date di validità.",
            [
                "Clicca '+ Nuova promozione'.",
                "Imposta titolo, percentuale o importo sconto, codice opzionale, date inizio/fine.",
                "I clienti vedono le promo attive su /servizi e possono inserire il codice in fase di prenotazione.",
            ],
            "Lo sconto si applica automaticamente al totale della prenotazione.",
        ),
        (
            "Inventario (/admin/inventario)",
            "Gestione prodotti in negozio (profumi Mood e altri). Quantità in stock, avviso 'scorte basse', aggiungi/modifica/elimina prodotti.",
            [
                "Controlla le quantità con i pulsanti + e -.",
                "Clicca Modifica per cambiare nome, descrizione o quantità.",
                "Aggiungi nuovi prodotti con '+ Nuovo prodotto'.",
                "Il banner arancione avvisa quando un prodotto è quasi esaurito.",
            ],
            "L'inventario è interno al sito: serve a tenere traccia delle scorte, non gestisce pagamenti.",
        ),
        (
            "Analytics (/admin/analytics)",
            "Statistiche avanzate sulle prenotazioni: servizi più richiesti, barbieri più prenotati, andamento nel tempo.",
            [
                "Consulta periodicamente per capire quali servizi funzionano meglio.",
                "Utile per decidere promozioni o orari del team.",
            ],
            "I dati si aggiornano automaticamente ad ogni nuova prenotazione.",
        ),
        (
            "Gestione team (/admin/staff)",
            "Gestione barbieri: foto, nome, ruolo, orari settimanali (mattina/pomeriggio), ferie e assenze.",
            [
                "Modifica gli orari di ogni barbiere per giorno della settimana.",
                "Imposta ferie o assenze con date di inizio e fine.",
                "Quando un barbiere è in ferie, non appare disponibile nelle prenotazioni online.",
                "Salva le modifiche con il pulsante Salva.",
            ],
            "Cambiare orari o ferie aggiorna subito gli slot disponibili sul sito. I clienti con appuntamenti esistenti possono ricevere notifica email se cambiano gli orari del salone.",
        ),
        (
            "Report (/admin/report)",
            "Report riassuntivo: incasso settimanale stimato, appuntamenti oggi, statistiche visitatori del sito (genere, età se compilati).",
            [
                "Consulta a fine settimana per un quadro generale.",
            ],
            "L'incasso è stimato dalla somma dei prezzi dei servizi prenotati, non sostituisce la contabilità.",
        ),
    ]

    for title, purpose, steps, background in admin_sections:
        story.append(Paragraph(title, styles["h1"]))
        story.append(Paragraph(f"<b>A cosa serve:</b> {purpose}", styles["body"]))
        story.append(Paragraph("<b>Come si usa:</b>", styles["h2"]))
        story.append(bullet_list(steps, styles))
        story.append(Paragraph(f"<b>Cosa succede in background:</b> {background}", styles["body"]))

    story.append(PageBreak())

    # Funzionalità automatiche
    story.append(Paragraph("Funzionalità automatiche (spiegate in modo semplice)", styles["h1"]))
    auto_features = [
        (
            "Notifiche nuova prenotazione",
            "Quando un cliente prenota online, il sistema invia automaticamente un'email di notifica "
            "all'indirizzo luigigarofalo1996@gmail.com con nome cliente, servizio, barbiere, data e ora. "
            "L'orario nell'email corrisponde all'orario reale del salone (fuso orario Italia).",
        ),
        (
            "Promemoria clienti (6 ore prima)",
            "Se il cliente ha indicato telefono e/o email, il sistema invia un promemoria automatico circa 6 ore prima "
            "dell'appuntamento via WhatsApp e/o email. Funziona tramite un processo automatico sul server (cron job).",
        ),
        (
            "Orari e slot intelligenti",
            "Il sito conosce gli orari reali del salone: pausa pranzo 13:00–14:00, chiusura sabato alle 18:00, "
            "nessuna prenotazione il lunedì e domenica. Gli orari già occupati spariscono dalla lista.",
        ),
        (
            "Login cliente per 2 mesi",
            "I clienti registrati restano loggati per 2 mesi sullo stesso dispositivo, poi devono rifare il login.",
        ),
        (
            "Pulsante WhatsApp",
            "Icona verde sempre visibile (tranne quando appare il banner cookie) per contattare il salone direttamente.",
        ),
        (
            "Sicurezza",
            "L'area admin è protetta: solo l'account con ruolo 'admin' può accedere. I clienti vedono solo i propri dati.",
        ),
        (
            "Backup automatico",
            "Il progetto include script di backup del codice e del database dopo ogni modifica importante.",
        ),
    ]
    for title, desc in auto_features:
        story.append(Paragraph(f"<b>{title}</b>", styles["h2"]))
        story.append(Paragraph(desc, styles["body"]))

    story.append(PageBreak())

    # Guida rapida
    story.append(Paragraph("Guida rapida operativa — Cosa fare più spesso", styles["h1"]))
    story.append(
        Paragraph(
            "<b>1. Arriva una prenotazione online</b><br/>"
            "→ Controlla l'email di notifica o vai su Admin → Storico Prenotazioni o Calendario Prenotazioni.<br/>"
            "→ Verifica data, ora, barbiere e servizio. Non serve confermare manualmente: è già confermata.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>2. Cliente chiama per prenotare al telefono</b><br/>"
            "→ Admin → Prenotazioni → clicca lo slot libero sul calendario del barbiere giusto.<br/>"
            "→ Inserisci nome, telefono, servizio e conferma.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>3. Cliente vuole spostare o cancellare</b><br/>"
            "→ Admin → Storico Prenotazioni → cerca il nome → Modifica (cambia data/ora) oppure Rimuovi.<br/>"
            "→ Oppure usa il Calendario Prenotazioni cliccando sull'appuntamento.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>4. Cambio prezzo o nuovo servizio</b><br/>"
            "→ Admin → Servizi → modifica o aggiungi → Salva.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>5. Barbiere in ferie</b><br/>"
            "→ Admin → Gestione team → seleziona barbiere → imposta ferie con date → Salva.<br/>"
            "→ Il barbiere non sarà prenotabile online in quel periodo.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>6. Promozione o sconto</b><br/>"
            "→ Admin → Promozioni → Nuova promozione → imposta codice e sconto → Salva.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "<b>7. Controllo mattutino (2 minuti)</b><br/>"
            "→ Admin → Dashboard: appuntamenti oggi e incasso stimato.<br/>"
            "→ Admin → Prenotazioni: calendario della giornata.",
            styles["body"],
        )
    )

    story.append(Spacer(1, 1 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cd9a4f")))
    story.append(Spacer(1, 0.5 * cm))
    story.append(
        Paragraph(
            "<b>Supporto tecnico:</b> Eliseo Miraglia — @eliseomiraglia (Instagram)<br/>"
            "Per modifiche al sito, problemi tecnici o nuove funzionalità, contattare il referente tecnico.",
            styles["body"],
        )
    )
    story.append(
        Paragraph(
            "© 2026 Barberia Garofalo — Documento riservato al titolare dell'attività",
            styles["small"],
        )
    )

    return story


def main():
    styles = build_styles()
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Barberia Garofalo — Documentazione Sito",
        author="Eliseo Miraglia",
    )

    def add_page_number(canvas, doc_):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#999999"))
        canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Pagina {canvas.getPageNumber()}")
        canvas.drawString(2 * cm, 1.2 * cm, "barberiagarofalo.it — Manuale titolare")
        canvas.restoreState()

    doc.build(build_story(styles), onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f"PDF creato: {OUTPUT}")
    print(f"Dimensione: {OUTPUT.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()