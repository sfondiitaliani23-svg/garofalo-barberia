# Cose legali da controllare
Ultima modifica: 2026-11-01

## Assistente IA della chat (01/11/2026)
L'assistente (`lib/chat/ai.ts`) manda a un servizio esterno il messaggio del cliente e le ultime 8 battute della chat. Se il cliente scrive nome, telefono o altro, anche quelli escono dal sito. Le istruzioni dicono all'IA di non chiedere dati personali, ma non li tolgono dal messaggio.

| Cosa | Perché | Chi |
|---|---|---|
| **Gemini: passare al piano a pagamento** | Termini Gemini API: sul piano gratuito Google usa i contenuti per migliorare i prodotti e delle persone possono leggerli; Google chiede di non mandare dati personali; per app usate da persone in Europa (SEE, Svizzera, Regno Unito) i termini chiedono il piano a pagamento. Sul piano a pagamento i contenuti **non** servono a migliorare i prodotti. Fonte: ai.google.dev/gemini-api/terms e /docs/pricing (letti il 01/11/2026). | Eliseo |
| Groq (riserva): attivare «Zero Data Retention» | Groq dice di non conservare le richieste, salvo registri fino a 30 giorni per guasti o abusi; i dati stanno negli Stati Uniti. Con ZDR (Impostazioni → Data Controls) non conserva nulla. Fonte: console.groq.com/docs/your-data (01/11/2026). Resta un trasferimento fuori dall'UE. | Eliseo |
| Informativa privacy del sito | Deve dire che la chat usa un servizio di IA esterno (Google, ed eventualmente Groq), cosa riceve, dove sono i server, per quanto tempo. | Eliseo con consulente |
| Accordo sul trattamento dei dati | Con Google (piano a pagamento: termini per i servizi a pagamento) e con Groq. | Eliseo con consulente |

### Come passare Gemini al piano a pagamento (Eliseo)
1. Apri Google AI Studio con l'account della chiave usata dal sito (Admin → riga privata `cfg:ai`, o variabile d'ambiente).
2. Sul progetto di quella chiave attiva la fatturazione (Billing → collega un account di fatturazione). La chiave resta la stessa: nel codice non cambia niente.
3. Imposta un budget con avviso (es. 5 € al mese). Per una chat di barberia il consumo atteso è di pochi centesimi al mese.
4. Scrivi a Claude «fatto»: controlla che la chat risponda ancora e aggiorna questa tabella.

### Miglioria possibile (da decidere)
Togliere dal messaggio, prima dell'invio all'IA, numeri di telefono ed email scritti dal cliente (sostituiti con «[telefono]», «[email]»). Non cambia le risposte e riduce i dati che escono.
