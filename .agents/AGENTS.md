# Garofalo Barberia - Project Customizations and Rules

## 🚀 Regola Tassativa Post-Modifica (Auto Fix, Commit, Push & Deploy)

Dopo OGNI singola modifica al codice (file React, CSS, TypeScript, componenti, ecc.):
1. **Verifica & Fix**: Esegui immediatamente il controllo dei tipi (`npx tsc --noEmit`) e risolvi tutti gli eventuali errori di compilazione.
2. **Git Commit & Push**: Aggiungi i file modificati (`git add .`), fai il commit con un messaggio chiaro e descrittivo (`git commit -m "..."`) ed effettua il push sul ramo principale (`git push origin master:main`).
3. **Deploy Forzato Vercel**: Lancia subito il deploy di produzione per forzare l'aggiornamento live su Vercel (`npx vercel --prod --yes`).

## 🎨 Regole di Progettazione Interfacce Utente (UI) e Modal

### 1. Struttura dei Modal e Gestione dello Scroll
Per evitare che l'intera pagina del browser crei barre di scorrimento esterne quando i modal sono molto alti, tutti i componenti modali (es. prenotazioni rapide, form complessi) devono essere strutturati per scorrere internamente:
* **Contenitore del Modal**: Deve avere altezza massima e gestione overflow per evitare l'estensione fuori schermo:
  ```tsx
  className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden ..."
  ```
* **Header e Footer (Bottoni)**: Devono rimanere fissi in alto e in basso per essere sempre raggiungibili (usando ad esempio `shrink-0` o posizionamento fuori dal contenitore di scorrimento).
* **Corpo del Form**: Deve essere il solo a scorrere verticalmente:
  ```tsx
  className="admin-modal-scroll flex-1 overflow-y-auto min-h-0 pr-1 ..."
  ```

### 2. Visibilità ed Estetica delle Scrollbar
* Non utilizzare classi come `no-scrollbar` per nascondere le barre di scorrimento nelle liste lunghe (es. selezione servizi). Rende difficile per l'utente capire che la lista è scorrevole.
* Utilizzare sempre la classe CSS `.admin-modal-scroll` definita in `globals.css` per mostrare la scrollbar dorata stilizzata del brand, coerente con il design di sistema.
