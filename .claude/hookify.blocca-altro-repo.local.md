---
name: blocca-altro-repo
enabled: true
event: file
action: block
conditions:
  - field: file_path
    operator: contains
    pattern: /maurizio-barber-shop/
  - field: content
    operator: regex_match
    pattern: '[\s\S]'
---

🚫 **Questo è il repository di un altro sito.**

Da qui non si tocca Maurizio Barber Shop: i siti restano separati. Apri una sessione su quel repository e segui le sue regole.
