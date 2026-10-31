---
name: ricorda-check-prima-del-push
enabled: true
event: bash
action: warn
pattern: git\s+push\b
---

⚠️ **Prima e dopo il push**

- Prima: `npx tsc --noEmit`, poi `git checkout tsconfig.tsbuildinfo`; `npm test` tutto verde.
- Commit in italiano con le righe di attribuzione; solo documenti: `[skip ci]`.
- Dopo: "Deploy su Vercel" `completed success` per lo SHA (`gh run list`) prima di dire "è online". Il sito vero lo verifica Eliseo (Ctrl+F5).
