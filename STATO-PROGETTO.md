# 限界 GM DASHBOARD — Stato del Progetto

> Applicazione desktop per Game Master di giochi di ruolo.
> Gestione sessioni, documenti, calendario, comunicazione con i giocatori via Telegram.
> **Versione corrente: 1.1.0** (2026-03-20) — ottimizzazioni performance e fix.

---

## 1. Stack Tecnologico

| Tecnologia | Versione | Ruolo |
|---|---|---|
| **Electron** | 40.x | Runtime desktop, finestra frameless, IPC main↔renderer |
| **React** | 19.x | UI rendering, state management |
| **Vite** | 7.x | Bundler e dev server |
| **electron-store** | 11.x | Persistenza dati (progetti, stati, preferenze finestra) |
| **electron-updater** | 6.x | Aggiornamenti automatici via GitHub Releases |
| **electron-builder** | 26.x | Packaging e installer NSIS |
| **marked** | 17.x | Rendering Markdown → HTML |
| **DOMPurify** | 3.x | Sanitizzazione HTML (prevenzione XSS) |
| **pdfjs-dist** | 5.x | Rendering PDF con polyfill Chromium 132 |
| **howler.js** | 2.x | Riproduzione audio (tracce ambientali, musica) |
| **node-telegram-bot-api** | 0.67.x | Integrazione bot Telegram |
| **lucide-react** | 0.577.x | Icone SVG |
| **firebase** | 12.x | Auth, Firestore, Storage (avventure online, AI quota, installazioni) |
| **adm-zip** | 0.5.x | Export/import pacchetti avventura |

**Linguaggio:** JavaScript (JSX), nessun TypeScript.
**CSS:** Inline styles con variabili CSS custom (`var(--name)`), nessun framework CSS.
**Temi:** 8 temi predefiniti tramite CSS custom properties.
**Licenza:** GPL-3.0-only.

---

## 2. Funzionalità Implementate

### 2.1 Sistema Multi-Progetto
- **Selettore progetto** all'avvio con lista progetti recenti (max 20)
- Apertura cartella tramite dialog nativo
- **Import da .zip** direttamente dal selettore progetto
- Rimozione progetti dalla lista recenti
- Stato completo salvato per ogni progetto (layout, documenti aperti, scroll, audio, ecc.)
- Cambio progetto con rimontaggio completo (`key={projectPath}`)

### 2.2 Explorer (File Browser)
- Albero navigabile del filesystem di progetto
- Lazy loading delle sotto-cartelle
- Icone per tipo file (documenti, immagini, audio, video, PDF)
- Click su file → apertura automatica nel Viewer o nel Media Panel
- Context menu: "Apri in Viewer", "Aggiungi a Media", "Apri in Slot A/B/C", "Invia via Telegram"
- **Drag & drop** per importazione file nel progetto
- Assegnazione cartelle intere a uno Slot
- Filtro file nascosti (dotfiles)
- Stato cartelle espanse persistente

### 2.3 Viewer (Visualizzatore Documenti)
- Rendering Markdown (tramite `marked` + `DOMPurify`), HTML nativo in iframe, file di testo (con `<pre>`)
- **Supporto PDF** integrato (`PdfViewer` con `pdfjs-dist`)
- Supporto immagini e video inline
- Supporto file `.url` (weblink in iframe)
- **Multi-tab**: tab "Documento" + tab per schede PG + tab "Nota" (per sorgente note)
- **PanelSearch (Ctrl+F)**: ricerca testo nel pannello con navigazione risultati, highlight `<mark>`, supporto DOM e iframe
- **Keyword highlighting**: evidenziazione parole configurabili con colori personalizzati
- **PanelToolbar**: controllo dimensione font (10–24px), toggle fullscreen, toggle ricerca
- DocToc (indice) inline con hover/pin
- Scroll position memorizzata per ogni documento e restaurata al cambio file
- Gestione immagini inline (attesa caricamento per scroll corretto)

### 2.4 Stage (Palcoscenico)
- 5 tab: **Slot A**, **Slot B**, **Slot C**, **Calendario**, **Vista** (relazioni)
- Ogni Slot mostra il documento selezionato dal relativo SlotPanel
- Supporto **Snippet**: testo selezionato e pinnato negli Slot, renderizzato come Markdown
- Snippet header con titolo, sorgente, link "Apri documento" per tornare al file originale
- **Tab Vista**: visualizzazione relazioni PNG in formato tabella (tramite `RelationsView`)
- **PanelSearch (Ctrl+F)**: ricerca anche nello Stage (DOM e iframe)
- **PanelToolbar**: controllo font e fullscreen anche per Stage
- DocToc inline per documenti
- Keyword highlighting attivo anche nello Stage

### 2.5 Slot Panel (Pannello Destro)
- 3 pannelli (A, B, C) con lista di documenti e snippet assegnati
- Due tipi di item: **file** (path, nome, estensione) e **snippet** (id, testo, titolo, sorgente)
- Checkbox per selezione multipla + rimozione batch
- Context menu: rimuovi, svuota, invia via Telegram
- Svuota slot individuale
- Deduplicazione automatica dei file (non degli snippet)
- Selezione item → visualizzazione nello Stage

### 2.6 Media Panel
- Gestione **audio**: play/pause, skip ±10s, loop, velocità (0.5x–2x), volume, seek, progress bar
- Gestione **immagini**: thumbnail, click per lightbox fullscreen
- Gestione **video**: elemento nella lista, click per player fullscreen
- **Filtri**: Tutti, Audio, Immagini, Video con contatori
- **Mute globale**, **Stop tutto**, **Svuota tutto** (con conferma "Sicuro?" 3s)
- Tracce audio sempre montate (Howl vivo) anche se filtrate, per non interrompere la riproduzione
- Context menu per invio via Telegram
- Stato audio persistente (tracce, volume, loop, rate)
- Stabilità audio migliorata (cleanup risorse e gestione errori)

### 2.7 Console (Ricerca + AI + Log)
- **Tab Ricerca**: ricerca full-text nei documenti del progetto (.md, .html, .htm, .txt)
- Debounce 400ms, snippet con contesto, evidenziazione risultati
- Click su risultato → apertura file nel Viewer con scroll al punto esatto
- Storico ricerche con autocomplete (max 30, persistente in localStorage)
- Ricerca esterna tramite context menu ("Cerca" su testo selezionato)
- **Tab AI**: assistente AI con contesto sui documenti del progetto
- **Tab Log Telegram**: cronologia invii con stato (successo/errore), svuota log
- **Pannello Dadi** laterale: d4, d6, d8, d10, d12, d20, d100 con risultati colorati, raggruppamento temporale, svuota

### 2.8 Top Menu (Barra Superiore)
- Finestra frameless con drag area
- Titolo "限界 GM DASHBOARD"
- **Navigazione data di gioco**: ◀ giorno ▶, click sulla data apre mini-calendario picker
- **Campanella eventi** (🔔) animata quando ci sono eventi nel giorno corrente
- **Pulsante Calendario** (📅) → apre CalendarPanel
- **Timer**: countdown configurabile (1m–30m), aggiungi tempo, beep a scadenza, pulsante ⏱ con dropdown
- **Menu PG** (👥): dropdown con lista giocatori, stato connessione Telegram (🟢/⚪), link a scheda personaggio
- **Note** (📝): apre NotesPanel
- **Checklist** (☐): apre ChecklistPanel
- **Highlight toggle** (🔆): attiva/disattiva evidenziazione parole
- **Manuali** (📖): apre QuickReference
- **Info** (ℹ️): apre InfoPanel (versione, stack, aggiornamenti)
- **Impostazioni** (⚙️): apre SettingsPanel, indicatore bot attivo (🟢/🟡)
- **Chat Telegram** (💬): apre TelegramChat, badge messaggi non letti con animazione flash
- **Account utente**: login/logout Firebase, displayName
- **Cambia progetto** (📂)
- **Controlli finestra**: minimizza, massimizza/ripristina, chiudi

### 2.9 Calendario
- Griglia mensile navigabile con nomi giorni in italiano
- Evidenziazione giorno di gioco corrente e giorno selezionato
- **CRUD eventi**: titolo, tipo (Indizio/Promemoria/Evento), nota, colore per tipo
- **Documento collegato**: selezione file dal progetto, apertura diretta
- **Invio Telegram**: toggle abilitazione, selezione destinatari, modalità automatica/manuale
- Click su giorno → imposta data di gioco

### 2.10 Telegram
- **Configurazione bot**: token (criptato con safeStorage), verifica, codice sessione
- **Gestione giocatori**: connessione via codice sessione, stato online (🟢/⚪/🟣)
- **Disconnessione individuale** per giocatore
- **Chat bidirezionale**: lista giocatori con contatore non letti, bolle messaggi stile chat, risposte GM
- **Risposte AI**: pulsante per risposta automatica AI al giocatore
- **Invio file**: modale con selezione destinatari, messaggio opzionale, formati supportati (MD→testo, HTML→immagine, immagini→foto, altri→documento)
- **Invio selezione testo**: modale dedicata per testo selezionato
- **Svuota chat** con conferma "Sicuro?" (3s timeout)
- **Log invii** nel tab Console con stato successo/errore

### 2.11 Note
- Pannello dropdown sotto la barra superiore
- Aggiunta manuale (input + Enter)
- **Salvataggio da selezione testo** (context menu "📝 Salva come nota")
- Tracciamento sorgente (nome file + path + scroll position)
- Link "📄 Apri" per aprire il documento sorgente al punto esatto (tab dedicato nel Viewer)
- Timestamp per ogni nota
- Svuota tutto

### 2.12 Checklist
- Pannello dropdown con filtri: Da fare / Completate / Tutte
- Aggiunta singola (input + Enter) e **bulk paste** (incolla lista, una riga per elemento)
- Toggle completamento con checkbox, strikethrough per completate
- **Salvataggio da selezione testo** (context menu "☐ Aggiungi a Checklist")
- Tracciamento sorgente con link apertura documento
- Contatori per stato
- Svuota tutto

### 2.13 DocToc (Indice Documento)
- Estrazione automatica headings (h1–h6, solo i 2 livelli principali)
- **Outline PDF** per file PDF (tramite pdfjs)
- Tracking heading attivo durante lo scroll
- **MutationObserver** per aggiornamento dinamico dell'indice
- Hover per apertura temporanea, click per pin persistente
- Chiusura su click esterno o Esc
- Presente sia nel Viewer che nello Stage

### 2.14 Supporto PDF
- Rendering pagine con `pdfjs-dist` v5 e polyfill Chromium 132
- **Lazy rendering**: solo le pagine visibili vengono renderizzate
- **Ricerca testo**: debounce 400ms, estrazione batch (20 pagine), cap 200 risultati
- **Outline navigabile** integrato con DocToc
- Protocollo `app://` per caricamento sicuro file locali

### 2.15 Relazioni PNG
- **RelationsPanel**: editor relazioni con upload/parsing file
- **RelationsView**: tabella relazioni con punteggi colorati (rosso ≤-2, giallo -1, grigio 0, verde ≥1)
- Formato file: `NomePNG -> NomePG -> Score:Note` (separatore ` -> `), estensioni .md/.txt
- Relazioni sessione (temporanee) e base (persistenti)
- Visualizzazione nel **tab Vista** dello Stage
- Ordinamento italiano (locale-aware)

### 2.16 Manuali di Riferimento (QuickReference)
- Overlay modale a 3 colonne: lista manuali | indice + ricerca | contenuto
- Manuali configurabili nelle Impostazioni (nome + file)
- Rendering HTML in iframe (`srcdoc`) con iniezione tema CSS
- Ricerca interna con contatore risultati e scroll al primo match
- Keyword highlighting integrato
- Scroll position persistente per ogni manuale
- Ctrl+F per focus sulla ricerca, Esc per chiudere

### 2.17 Impostazioni (SettingsPanel)
- **Progetto**: nome progetto, data inizio campagna, reset data di gioco
- **PG (Personaggi Giocanti)**: CRUD completo (nome personaggio, nome giocatore, nota, scheda personaggio collegata)
- **Telegram**: token bot, codice sessione, elenco giocatori connessi con disconnessione individuale
- **Relazioni**: file relazioni base collegato
- **Manuali di riferimento**: lista manuali con nome e file collegato
- **Aspetto (Temi)**: griglia 4 colonne con 8 temi (5 dark + 2 light + 1 high contrast), slider scala font
- **Parole evidenziate**: toggle ON/OFF, palette 8 colori predefiniti, colore default, lista parole con colore individuale, aggiunta singola/bulk, svuota tutto con conferma

### 2.18 Temi
- 8 temi predefiniti: Dark Gold (default), Dark Blue, Dark Green, Dark Red, Dark Purple, Light Classic, Light Blue, High Contrast
- ~80 variabili CSS per tema (bg, text, accent, border, shadow, overlay, chat, dice, scrollbar, ecc.)
- Applicazione via `document.documentElement.style.setProperty()`
- Iniezione tema CSS anche negli iframe HTML (`buildIframeThemeStyle`)
- Persistenza in localStorage
- Scala font configurabile

### 2.19 Context Menu Globale (Selezione Testo)
- Appare su selezione testo in Viewer, Stage, Snippet
- Voci: 📝 Salva come nota | ☐ Aggiungi a Checklist | ── | Slot A / Slot B / Slot C (snippet) | ── | 🔆 Evidenzia parola | ── | 🔍 Cerca | ── | ✉️ Invia via Telegram

### 2.20 Snippet negli Slot
- Selezione testo → context menu → assegnazione a Slot A/B/C
- Lo snippet include: testo, titolo (primi 50 char), sorgente (nome file), path sorgente, scroll position
- Visualizzazione nello Stage come SnippetView (header + contenuto Markdown)
- Link "📄 Apri documento" per aprire il file sorgente

### 2.21 Persistenza
- **electron-store**: progetti recenti, stati progetto, dimensioni finestra
- **Accesso granulare per progetto**: dot-notation su electron-store (`projectStates.{path}.key`), evita full-read/write dell'intero oggetto `projectStates`
- **Stato per progetto** (salvataggio con debounce 1000ms + on unmount):
  - Layout: larghezze colonne, altezza console, ratio viewer/stage, ratio slot
  - Documenti: viewer tabs, slot files, stage tab attivo, indici selezionati
  - Scroll: posizioni scroll per viewer, stage, slot, manuali
  - Audio: tracce media con volume/loop/rate
  - Calendario: eventi, data di gioco
  - PG: lista giocatori
  - Telegram: configurazione bot, chat messages, log invii
  - Note e Checklist: lista completa
  - DocToc: stato pin
  - Keyword highlights: abilitazione, colore default, lista parole
  - Explorer: cartelle espanse
  - Manuali: lista, manuale selezionato, scroll positions
  - Filtro media
  - Relazioni sessione, Vista content
  - Font size viewer

### 2.22 Layout Ridimensionabile
- 3 colonne: Sinistra (Explorer + Media) | Centro (Viewer/Stage + Console) | Destra (Slot A/B/C)
- Tutti i divisori trascinabili tramite `ResizeHandle`
- Rapporto Explorer/Media, Viewer/Stage, Console height, Slot ratios — tutti persistenti

### 2.23 Finestra Frameless
- Nessuna barra titolo nativa, UI custom nella TopMenu
- Controlli finestra (─ □ ✕) con hover effects
- Drag area sulla barra superiore
- F12 per DevTools
- Dimensioni finestra persistenti

### 2.24 Firebase Auth e Account
- Registrazione e login con email + password
- Auto-login tra sessioni (credenziali criptate con safeStorage in electron-store)
- Profilo utente (displayName) mostrato in TopMenu
- Persistenza in-memory (no IndexedDB)

### 2.25 Assistente AI
- **Console AI** nella Console: chat con contesto sui documenti del progetto
- **AI su Telegram**: giocatori chiedono con `/ai`, risposte basate su documenti autorizzati
- **Documenti filtrati per giocatore**: documenti comuni + specifici per PG, toggle attivo/disattivo
- **Modalità Telegram AI**: manuale (solo `/ai`) o automatica (risponde a ogni messaggio)
- **Provider**: OpenAI (GPT-5 family) e Anthropic (Claude), modello selezionabile
- **Effort AI**: regolabile per Anthropic (low/medium/high)
- **Quota gratuita**: 1M token una tantum (~250 domande, gpt-5-mini), non si rinnova
- **customAllowance**: campo Firestore per concedere token bonus a utenti specifici (admin da Firebase Console)
- **Contatore token**: per risposta e per sessione, barra quota con indicatore esaurimento
- Con chiave API propria: uso illimitato, scelta modello e provider
- Implementazione HTTP pura (zero dipendenze npm per le chiamate API)

### 2.26 Avventure Online
- **Export**: pacchetto .zip del progetto con `_adventure.json` (metadati), pattern di esclusione configurabili
- **Import**: da file .zip locale (anche dal selettore progetto)
- **Catalogo online** (AdventuresPanel): sfoglia e scarica avventure, filtro per lingua
- **Pubblica**: upload su Firebase Storage + metadati in Firestore (visibilità pubblica/privata)
- **Download quota**: 100 MB/giorno, tracciato localmente in electron-store
- **Rimozione pubblicazione** con eliminazione file e metadati

### 2.27 Installation Tracking
- UUID generato al primo avvio, salvato in electron-store
- Documento Firestore `installations/{uuid}` con firstSeen, lastSeen, appVersion, platform, arch
- Aggiornamento `lastSeen` a ogni avvio
- Visibile da Firebase Console per conteggio installazioni e utenti attivi

### 2.28 Pagina Info
- Stack tecnologico dell'app
- Versione corrente
- Controllo aggiornamenti manuale (idle → checking → available → downloaded)

### 2.29 Sicurezza
- **Content Security Policy (CSP)**: header restrittivo in `index.html` (no eval, no inline script, whitelist app://)
- **DOMPurify**: sanitizzazione di tutto l'output Markdown
- **Protocollo `app://`**: protocollo Electron custom con privilegi sicuri per servire file locali
- **safeStorage**: crittografia credenziali (token Telegram, credenziali Firebase) tramite Electron safeStorage
- **Validazione path `app://`**: prevenzione path traversal
- **Cleanup listener IPC**: rimozione listener al cambio finestra/progetto
- **Nessun `nodeIntegration`**: comunicazione solo via contextBridge/preload

### 2.30 Ottimizzazioni Performance

**Fase 1** (`80d1ef4`):
- `requestAnimationFrame` throttle su eventi resize/scroll (elimina jank da eventi ad alta frequenza)
- Cleanup listener iframe al unmount (previene memory leak)
- `chatFlash` GPU-friendly (`will-change: transform`) per animazione badge Telegram

**Fase 2** (`bc8e6b2`):
- 29 `useCallback` stabili in App.jsx — eliminazione inline arrow nelle props, referenze stabili per i figli memoizzati
- `React.memo` su 6 componenti pesanti: TopMenu, Explorer, MediaPanel, Console, SlotPanel, Stage
- electron-store: accesso granulare per progetto con dot-notation (elimina full-read/write di `projectStates`)
- Cache file AI: `dirCache` 5s TTL + `fileCache` con mtime check, max 50 entry LRU
- Cache `fetchAiConfig()` con TTL 60s
- Calcolo quota locale post-increment AI (riduzione da 5 a 2 chiamate Firebase per messaggio)

**Fix correlati** (`90d5b30`):
- `firebaseUser` passato correttamente ad `AdventuresPanel` da `ProjectSelector`
- Stabilità audio `MediaPanel` migliorata (cleanup risorse)

---

## 3. Struttura del Progetto

```
GmDash/
├── electron/
│   ├── main.js              # Main process: finestra, IPC, store, Telegram, AI, avventure, tracking, app:// protocol
│   ├── preload.js           # contextBridge → window.electronAPI (100+ handlers)
│   ├── telegramBot.js       # Classe GmDashBot, verifyToken, htmlToImage
│   ├── firebaseApi.js       # Firebase Auth, Firestore, Storage, AI quota, installation tracking
│   └── aiApi.js             # Provider AI (OpenAI, Anthropic), context builder, system prompt, HTTP puro
├── src/
│   ├── main.jsx             # Entry point React (ReactDOM.createRoot)
│   ├── App.jsx              # Router (ProjectSelector ↔ Dashboard), stato centrale (~2000 righe), context menu, persistenza
│   ├── components/
│   │   ├── AdventuresPanel.jsx    # Catalogo avventure online, download/pubblicazione
│   │   ├── CalendarPanel.jsx      # Calendario mensile con CRUD eventi e invio Telegram
│   │   ├── ChecklistPanel.jsx     # Pannello checklist (filtri, bulk paste, sorgente)
│   │   ├── Console.jsx            # Ricerca full-text + AI Chat + Log Telegram + Pannello Dadi
│   │   ├── DocToc.jsx             # Indice documento (headings/PDF outline) con hover/pin
│   │   ├── Explorer.jsx           # File browser ad albero con drag & drop e context menu
│   │   ├── InfoPanel.jsx          # Pagina info: stack, versione, controllo aggiornamenti
│   │   ├── MediaPanel.jsx         # Gestore media: audio (Howl), immagini, video
│   │   ├── NotesPanel.jsx         # Pannello note (aggiunta, sorgente, apertura documento)
│   │   ├── PanelSearch.jsx        # Ricerca Ctrl+F nel pannello (DOM e iframe)
│   │   ├── PanelToolbar.jsx       # Toolbar: font size, fullscreen, ricerca
│   │   ├── PdfViewer.jsx          # Viewer PDF con pdfjs-dist, lazy rendering, ricerca
│   │   ├── ProjectSelector.jsx    # Schermata iniziale: apri cartella/zip, progetti recenti
│   │   ├── QuickReference.jsx     # Viewer manuali (3 colonne, ricerca, keyword highlighting, iframe srcdoc)
│   │   ├── RelationsPanel.jsx     # Editor relazioni PNG con upload/parsing file
│   │   ├── RelationsView.jsx      # Tabella relazioni con punteggi colorati
│   │   ├── ResizeHandle.jsx       # Divisore trascinabile (verticale/orizzontale)
│   │   ├── SettingsPanel.jsx      # Impostazioni (progetto, PG, Telegram, manuali, temi, keywords, relazioni)
│   │   ├── SlotPanel.jsx          # Lista file + snippet per Slot A/B/C (checkbox, context menu)
│   │   ├── Stage.jsx              # Area Stage (5 tab: Slot A/B/C + Cal + Vista)
│   │   ├── TelegramChat.jsx       # Chat bidirezionale GM↔giocatori con risposte AI
│   │   ├── TelegramModal.jsx      # Modali invio file e testo via Telegram
│   │   ├── TopMenu.jsx            # Barra superiore: data, timer, PG, note, checklist, chat, info, impostazioni
│   │   └── Viewer.jsx             # Visualizzatore documenti (MD/HTML/PDF/TXT/immagini/video)
│   ├── hooks/
│   │   └── useScrollMemory.js     # Hook per memorizzazione posizioni scroll con ref esterna
│   ├── themes/
│   │   ├── themeDefinitions.js    # 8 definizioni di tema (~80 variabili CSS ciascuno)
│   │   └── themeEngine.js         # Applicazione tema, persistenza, scala font
│   └── utils/
│       ├── fileTypes.js           # Mapping estensioni → tipi (DOCUMENT, PDF, IMAGE, AUDIO, VIDEO, WEBLINK) + icone
│       ├── htmlHelpers.js         # Keyword highlighting HTML, tema iframe, preparazione srcdoc app://
│       ├── markdownRenderer.js    # Rendering marked + sanitizzazione DOMPurify
│       └── relationsParser.js     # Parser formato relazioni (NomePNG -> NomePG -> Score:Note)
├── public/                        # Asset statici
├── index.html                     # HTML entry point con CSP header
├── vite.config.js                 # Configurazione Vite
├── package.json                   # Dipendenze e script (v1.0.0, GPL-3.0-only)
├── CODE-SIGNING.md                # Policy code signing (SignPath) e privacy policy
├── RELEASE-GUIDE.md               # Guida al processo di release
└── .gitignore                     # node_modules, dist, release, *.env
```

---

## 4. Build e Distribuzione

- [x] **Build installer** con `electron-builder` — NSIS x64 per Windows, output in `release/`, lingua italiana
- [x] **Aggiornamenti automatici** con `electron-updater` — check al boot (5s delay), toast "Riavvia e aggiorna" / "Dopo", publish su GitHub (Maruga/gm-dashboard), disabilitato in dev mode
- [x] **GitHub Actions** — Workflow automatizzato per build e release
- [x] **Code signing** — Richiesta certificato SignPath (free OSS), `CODE-SIGNING.md` presente
- [ ] **Code signing attivo** — In attesa approvazione SignPath

---

## 5. Cose da Fare

### Funzionalità Nuove
- [ ] **Wikilinks `[[NomeFile]]`** stile Obsidian — Link cliccabili nei documenti Markdown
- [ ] **Temi custom** — Editor con color picker per temi personalizzati

### Shortcut Tastiera
- [ ] `Ctrl+M` — Muta/riattiva audio globale
- [ ] `Ctrl+T` — Focus sul timer
- [ ] `Ctrl+N` — Apri/chiudi pannello Note
- [ ] `Ctrl+K` — Apri/chiudi Checklist
