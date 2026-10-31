---
name: blocca-push-forzato
enabled: true
event: bash
action: block
pattern: git\s+push\b.*(--force\b|--force-with-lease|\s-f\b)
---

🚫 **Push forzato bloccato.**

Su `main` cancellerebbe il lavoro già pubblicato. Fai `git fetch`, `git rebase origin/main`, i controlli e un push normale. Se serve davvero, chiedi prima a Eliseo.
