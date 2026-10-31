# Cose legali da controllare
Ultima modifica: 2026-11-01 (strada gratuita)

## Assistente IA della chat (01/11/2026)
L'assistente (`lib/chat/ai.ts`) manda a un servizio esterno il messaggio del cliente e le ultime 8 battute della chat. Se il cliente scrive nome, telefono o altro, anche quelli escono dal sito. Le istruzioni dicono all'IA di non chiedere dati personali, ma non li tolgono dal messaggio.

| Cosa | Perché | Chi |
|---|---|---|
| **Gemini: togliere dalla chat** | Termini Gemini API: sul piano gratuito Google usa i contenuti per migliorare i prodotti e delle persone possono leggerli; chiede di non mandare dati personali; per app usate da persone in Europa i termini chiedono il piano a pagamento. Eliseo non vuole spese (01/11/2026): quindi Gemini si toglie. Fonte: ai.google.dev/gemini-api/terms (letto il 01/11/2026). | Eliseo |
| Groq (diventa l'unica IA): attivare «Zero Data Retention» | Groq dice di non conservare le richieste, salvo registri fino a 30 giorni per guasti o abusi; i dati stanno negli Stati Uniti. Con ZDR (Impostazioni → Data Controls) non conserva nulla. Fonte: console.groq.com/docs/your-data (01/11/2026). Resta un trasferimento fuori dall'UE. | Eliseo |
| Informativa privacy del sito | Deve dire che la chat usa un servizio di IA esterno (Google, ed eventualmente Groq), cosa riceve, dove sono i server, per quanto tempo. | Eliseo con consulente |
| Accordo sul trattamento dei dati | Con Google (piano a pagamento: termini per i servizi a pagamento) e con Groq. | Eliseo con consulente |

### Strada gratuita (decisa il 01/11/2026: niente a pagamento)
1. Admin → riga privata `cfg:ai`: cancellare la chiave Gemini. Resta Groq, e se Groq non risponde c'è il motore a regole del sito (nessun servizio esterno). Nel codice non cambia niente.
2. Groq → Impostazioni → Data Controls → «Zero Data Retention» (gratis).
3. Scrivere a Claude «fatto»: controlla che la chat risponda.

### Miglioria possibile (da decidere)
Togliere dal messaggio, prima dell'invio all'IA, numeri di telefono ed email scritti dal cliente (sostituiti con «[telefono]», «[email]»). Non cambia le risposte e riduce i dati che escono.
