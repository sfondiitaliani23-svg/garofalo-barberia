---
name: migrazione-gia-eseguita
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: /supabase/migrations/\d+_[^/]+\.sql$
  - field: old_text
    operator: regex_match
    pattern: '[\s\S]'
---

⚠️ **Stai modificando una migrazione che esiste già.**

Se Eliseo l'ha già eseguita in Supabase, la modifica non arriva mai al database. Crea una **migrazione nuova** con il numero dopo, con RLS dentro, e aggiungila a `MIGRATIONS` in `tests/booking-e2e.test.mjs` se tocca le prenotazioni. Non dire "fatto" finché Eliseo non conferma di averla eseguita.
