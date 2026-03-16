# GENKAI GM Dashboard — Istruzioni per AI

## Memoria del progetto
Prima di iniziare qualsiasi lavoro, leggi i file di memoria in:
```
C:\Users\Maruga\.claude\projects\C--Public--Clienti-Maruga-GmDash\memory\
```

File disponibili:
- `MEMORY.md` — Indice generale con quick reference (versione corrente, repo, link a tutti i file)
- `user_profile.md` — Profilo utente, preferenze, stile di lavoro
- `feedback_theming.md` — CRITICO: tutte le regole sui colori e CSS variables
- `feedback_build_release.md` — Build, gh CLI, processo di release
- `project_architecture.md` — Architettura completa: struttura file, componenti, state, IPC, Telegram, Relations, Search
- `project_known_fixes.md` — Bug risolti e pattern da evitare

## Regole fondamentali
1. **Chiedi prima di fare**: se non sei sicuro di qualcosa, chiedi PRIMA di agire. Non assumere, non inventare, non modificare codice esistente senza conferma
2. **Colori**: MAI usare hex/rgb hardcoded — sempre `var(--nome)`. Vedi `feedback_theming.md`
3. **Build**: dopo ogni modifica, verificare con `npx vite build`
4. **Lingua UI**: italiano per label, commenti, messaggi
5. **Release**: seguire `RELEASE-GUIDE.md` nella root del progetto

## File principali del codice
- `electron/main.js` — Main process Electron
- `electron/preload.js` — Bridge API
- `src/App.jsx` — TUTTO lo state dell'app (700+ righe di logica)
- `src/components/` — 18 componenti React
- `src/themes/themeDefinitions.js` — 8 temi (unico file con hex hardcoded)
