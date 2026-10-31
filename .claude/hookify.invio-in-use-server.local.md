---
name: invio-in-use-server
enabled: true
event: file
action: warn
conditions:
  - field: content
    operator: regex_match
    pattern: ['"]use server['"][\s\S]*export\s+(async\s+)?function\s+(send|invia|notify|notifica)
---

⚠️ **Funzione di invio in un file `'use server'`.**

Ogni funzione esportata da un file `'use server'` diventa chiamabile da chiunque. Sposta l'invio (email, WhatsApp, push) in un modulo normale in `lib/utils/` e chiamalo da un'azione protetta da `requireAdmin()`.
