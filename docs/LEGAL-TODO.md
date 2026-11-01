# Cose legali da controllare
Ultima modifica: 2026-11-01 (Gemini spento nel codice)

## Assistente IA della chat (01/11/2026)
L'assistente (`lib/chat/ai.ts`) manda a un servizio esterno il messaggio del cliente e le ultime 8 battute della chat. Se il cliente scrive nome, telefono o altro, anche quelli escono dal sito. Le istruzioni dicono all'IA di non chiedere dati personali, ma non li tolgono dal messaggio.

| Cosa | Perché | Chi |
|---|---|---|
| **Gemini: tolto dalla chat (fatto)** | Termini Gemini API: sul piano gratuito Google usa i contenuti per migliorare i prodotti e delle persone possono leggerli; chiede di non mandare dati personali; per app usate da persone in Europa i termini chiedono il piano a pagamento. Eliseo non vuole spese (01/11/2026): quindi Gemini si toglie. Fonte: ai.google.dev/gemini-api/terms (letto il 01/11/2026). | Eliseo |
| Groq (diventa l'unica IA): attivare «Zero Data Retention» | Groq dice di non conservare le richieste, salvo registri fino a 30 giorni per guasti o abusi; i dati stanno negli Stati Uniti. Con ZDR (Impostazioni → Data Controls) non conserva nulla. Fonte: console.groq.com/docs/your-data (01/11/2026). Resta un trasferimento fuori dall'UE. | Eliseo |
| Informativa privacy del sito | Deve dire che la chat usa un servizio di IA esterno (Groq, server negli Stati Uniti), cosa riceve, dove sono i server, per quanto tempo. | Eliseo con consulente |
| Accordo sul trattamento dei dati | Con Groq (termini e trattamento dei dati del piano gratuito). | Eliseo con consulente |

### Fatto il 01/11/2026 (strada gratuita)
- Gemini spento nel codice (`GEMINI_IN_USE = false` in `lib/chat/ai.ts`): non si usa più, anche se la chiave resta salvata in admin. In admin è scritto «Spento».
- Telefono ed email scritti dal cliente vengono tolti prima dell'invio all'IA (`lib/utils/redact-contacts.ts`, test `redact-contacts.test.mjs`).
- Privacy (IT/EN): ora dice Groq, server negli Stati Uniti, contatti tolti prima dell'invio. Da far vedere al consulente.
- Resta a Eliseo: Groq → Impostazioni → Data Controls → «Zero Data Retention» (gratis).
