---
name: blocca-segreti-pubblici
enabled: true
event: file
action: block
conditions:
  - field: content
    operator: regex_match
    pattern: NEXT_PUBLIC_\w*(SERVICE|SECRET|PRIVATE|ROLE|VAPID_PRIVATE)
---

🚫 **Chiave segreta in una variabile `NEXT_PUBLIC_*`.**

Tutto ciò che inizia con `NEXT_PUBLIC_` finisce nel browser e lo vede chiunque. La chiave di servizio Supabase e le chiavi private stanno solo lato server, senza `NEXT_PUBLIC_`.
