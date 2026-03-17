# 限界 GM DASHBOARD — Stato del Progetto

> Applicazione desktop per Game Master di giochi di ruolo.
> Gestione sessioni, documenti, calendario, comunicazione con i giocatori via Telegram.

---

## 1. Stack Tecnologico

| Tecnologia | Versione | Ruolo |
|---|---|---|
| **Electron** | 40.x | Runtime desktop, finestra frameless, IPC main↔renderer |
| **React** | 19.x | UI rendering, state management |
| **Vite** | 7.x | Bundler e dev server |
| **electron-store** | 11.x | Persistenza dati (progetti, stati, preferenze finestra) |
| **marked** | 17.x | Rendering Markdown → HTML |
| **howler.js** | 2.x | Riproduzione audio (tracce ambientali, musica) |
| **node-telegram-bot-api** | 0.67.x | Integrazione bot Telegram |
| **lucide-react** | 0.577.x | Icone SVG (SendHorizontal, Loader2, Trash2, SquareArrowOutUpRight) |
| **firebase** | 11.x | Auth, Firestore, Storage (avventure online, AI quota, installazioni) |
| **adm-zip** | 0.5.x | Export/import pacchetti avventura |

**Linguaggio:** JavaScript (JSX), nessun TypeScript.
**CSS:** Inline styles con variabili CSS custom (`var(--name)`), nessun framework CSS.
**Temi:** 8 temi predefiniti tramite CSS custom properties.

---

## 2. Funzionalità Implementate

### 2.1 Sistema Multi-Progetto
- **Selettore progetto** all'avvio con lista progetti recenti (max 20)
- Apertura cartella tramite dialog nativo
- Rimozione progetti dalla lista recenti
- Stato completo salvato per ogni progetto (layout, documenti aperti, scroll, audio, ecc.)
- Cambio progetto con rimontaggio completo (`key={projectPath}`)

### 2.2 Explorer (File Browser)
- Albero navigabile del filesystem di progetto
- Lazy loading delle sotto-cartelle
- Icone per tipo file (documenti, immagini, audio, video)
- Click su file → apertura automatica nel Viewer o nel Media Panel
- Context menu: "Apri in Viewer", "Aggiungi a Media", "Apri in Slot A/B/C", "Invia via Telegram"
- Assegnazione cartelle intere a uno Slot
- Stato cartelle espanse persistente

### 2.3 Viewer (Visualizzatore Documenti)
- Rendering Markdown (tramite `marked`), HTML nativo, file di testo (con `<pre>`)
- **Multi-tab**: tab "Documento" + tab per schede PG + tab "Nota" (per sorgente note)
- Evidenziazione ricerca con scroll automatico al risultato + fade-out animato
- **Keyword highlighting**: evidenziazione parole configurabili con colori personalizzati, integrato nella pipeline HTML (`renderedHtml` → `kwHtml` → `displayHtml`)
- DocToc (indice) inline con hover/pin
- Scroll position memorizzata per ogni documento e restaurata al cambio file
- Gestione immagini inline (attesa caricamento per scroll corretto)

### 2.4 Stage (Palcoscenico)
- 4 tab: **Slot A**, **Slot B**, **Slot C**, **Calendario**
- Ogni Slot mostra il documento selezionato dal relativo SlotPanel
- Supporto **Snippet**: testo selezionato e pinnato negli Slot, renderizzato come Markdown
- Snippet header con titolo, sorgente, link "Apri documento" per tornare al file originale
- DocToc inline per documenti
- Keyword highlighting attivo anche nello Stage

### 2.5 Slot Panel (Pannello Destro)
- 3 pannelli (A, B, C) con lista di documenti e snippet assegnati
- Due tipi di item: **file** (path, nome, estensione) e **snippet** (id, testo, titolo, sorgente)
- Checkbox per selezione multipla + rimozione batch
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
- **Impostazioni** (⚙️): apre SettingsPanel, indicatore bot attivo (🟢/🟡)
- **Chat Telegram** (💬): apre TelegramChat, badge messaggi non letti con animazione flash
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
- **Configurazione bot**: token, verifica, codice sessione
- **Gestione giocatori**: connessione via codice sessione, stato online (🟢/⚪/🟣)
- **Disconnessione individuale** per giocatore
- **Chat bidirezionale**: lista giocatori con contatore non letti, bolle messaggi stile chat, risposte GM
- **Invio file**: modale con selezione destinatari, messaggio opzionale, formati supportati (MD→testo, HTML→immagine, immagini→foto, altri→documento)
- **Invio selezione testo**: modale dedicata per testo selezionato
- **Svuota chat** con conferma "Sicuro?" (3s timeout)
- **Log invii** nel tab Console con stato successo/errore
- Icone lucide-react (SendHorizontal, Loader2, Trash2)

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
- Tracking heading attivo durante lo scroll
- Hover per apertura temporanea, click per pin persistente
- Chiusura su click esterno o Esc
- Presente sia nel Viewer che nello Stage

### 2.14 Manuali di Riferimento (QuickReference)
- Overlay modale a 3 colonne: lista manuali | indice + ricerca | contenuto
- Manuali configurabili nelle Impostazioni (nome + file)
- Ricerca interna con contatore risultati e scroll al primo match
- Keyword highlighting integrato (pipeline HTML string)
- Scroll position persistente per ogni manuale
- Ctrl+F per focus sulla ricerca, Esc per chiudere

### 2.15 Impostazioni (SettingsPanel)
- **Progetto**: nome progetto, data inizio campagna, reset data di gioco
- **PG (Personaggi Giocanti)**: CRUD completo (nome personaggio, nome giocatore, nota, scheda personaggio collegata)
- **Telegram**: token bot, codice sessione, elenco giocatori connessi con disconnessione individuale
- **Manuali di riferimento**: lista manuali con nome e file collegato
- **Aspetto (Temi)**: griglia 4 colonne con 8 temi (5 dark + 2 light + 1 high contrast), slider scala font
- **Parole evidenziate**: toggle ON/OFF, palette 8 colori predefiniti, colore default, lista parole con colore individuale, aggiunta singola/bulk, svuota tutto con conferma

### 2.16 Temi
- 8 temi predefiniti: Dark Gold (default), Dark Blue, Dark Green, Dark Red, Dark Purple, Light Classic, Light Blue, High Contrast
- ~80 variabili CSS per tema (bg, text, accent, border, shadow, overlay, chat, dice, ecc.)
- Applicazione via `document.documentElement.style.setProperty()`
- Persistenza in localStorage
- Scala font configurabile

### 2.17 Context Menu Globale (Selezione Testo)
- Appare su selezione testo in Viewer, Stage, Snippet
- Voci: 📝 Salva come nota | ☐ Aggiungi a Checklist | ── | Slot A / Slot B / Slot C (snippet) | ── | 🔆 Evidenzia parola | ── | 🔍 Cerca | ── | ✉️ Invia via Telegram

### 2.18 Snippet negli Slot
- Selezione testo → context menu → assegnazione a Slot A/B/C
- Lo snippet include: testo, titolo (primi 50 char), sorgente (nome file), path sorgente, scroll position
- Visualizzazione nello Stage come SnippetView (header + contenuto Markdown)
- Link "📄 Apri documento" per aprire il file sorgente

### 2.19 Persistenza
- **electron-store**: progetti recenti, stati progetto, dimensioni finestra
- **Stato per progetto** (salvataggio con debounce 400ms + on unmount):
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

### 2.20 Layout Ridimensionabile
- 3 colonne: Sinistra (Explorer + Media) | Centro (Viewer/Stage + Console) | Destra (Slot A/B/C)
- Tutti i divisori trascinabili tramite `ResizeHandle`
- Rapporto Explorer/Media, Viewer/Stage, Console height, Slot ratios — tutti persistenti

### 2.21 Finestra Frameless
- Nessuna barra titolo nativa, UI custom nella TopMenu
- Controlli finestra (─ □ ✕) con hover effects
- Drag area sulla barra superiore
- F12 per DevTools
- Dimensioni finestra persistenti

### 2.22 Firebase Auth e Account
- Registrazione e login con email + password
- Auto-login tra sessioni (credenziali criptate in electron-store)
- Profilo utente (displayName) mostrato in TopMenu

### 2.23 Assistente AI
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

### 2.24 Avventure Online
- **Export**: pacchetto .zip del progetto con `_adventure.json` (metadati), pattern di esclusione configurabili
- **Import**: da file .zip locale
- **Catalogo online**: sfoglia e scarica avventure pubblicate da altri GM
- **Pubblica**: upload su Firebase Storage + metadati in Firestore (visibilità pubblica/privata)
- **Download quota**: 100 MB/giorno, tracciato localmente in electron-store
- **Rimozione pubblicazione** con eliminazione file e metadati

### 2.25 Installation Tracking
- UUID generato al primo avvio, salvato in electron-store
- Documento Firestore `installations/{uuid}` con firstSeen, lastSeen, appVersion, platform, arch
- Aggiornamento `lastSeen` a ogni avvio
- Visibile da Firebase Console per conteggio installazioni e utenti attivi

---

## 3. Struttura del Progetto

```
GmDash/
├── electron/
│   ├── main.js              # Processo principale: finestra, IPC handlers, store, Telegram, AI, avventure, tracking
│   ├── preload.js           # contextBridge → window.electronAPI
│   ├── telegramBot.js       # Classe GmDashBot, verifyToken, htmlToImage
│   ├── firebaseApi.js       # Firebase Auth, Firestore, Storage, AI quota, installation tracking
│   └── aiApi.js             # Provider AI (OpenAI, Anthropic), context builder, system prompt
├── src/
│   ├── main.jsx             # Entry point React (ReactDOM.createRoot)
│   ├── App.jsx              # Router (ProjectSelector ↔ Dashboard), stato centrale, context menu, persistenza
│   ├── components/
│   │   ├── ProjectSelector.jsx   # Schermata iniziale: apri cartella, progetti recenti
│   │   ├── Explorer.jsx          # File browser ad albero con context menu
│   │   ├── Viewer.jsx            # Visualizzatore documenti (MD/HTML/TXT) con keyword + search highlighting
│   │   ├── Stage.jsx             # Area Stage (4 tab: Slot A/B/C + Cal) con SnippetView
│   │   ├── SlotPanel.jsx         # Lista file + snippet per ogni Slot (checkbox, rimuovi)
│   │   ├── MediaPanel.jsx        # Gestore media: audio (Howl), immagini, video
│   │   ├── Console.jsx           # Ricerca full-text + AI Chat + Log Telegram + Pannello Dadi
│   │   ├── TopMenu.jsx           # Barra superiore: data, timer, PG, note, checklist, chat, impostazioni
│   │   ├── DocToc.jsx            # Indice documento (headings) con hover/pin
│   │   ├── SettingsPanel.jsx     # Pannello impostazioni (progetto, PG, Telegram, manuali, temi, keywords)
│   │   ├── CalendarPanel.jsx     # Calendario mensile con CRUD eventi e invio Telegram
│   │   ├── TelegramModal.jsx     # Modali invio file e testo via Telegram
│   │   ├── TelegramChat.jsx      # Chat bidirezionale GM↔giocatori
│   │   ├── QuickReference.jsx    # Viewer manuali di riferimento (3 colonne, ricerca, keyword highlighting)
│   │   ├── NotesPanel.jsx        # Pannello note (aggiunta, sorgente, apertura documento)
│   │   ├── ChecklistPanel.jsx    # Pannello checklist (filtri, bulk paste, sorgente)
│   │   └── ResizeHandle.jsx      # Divisore trascinabile (verticale/orizzontale)
│   ├── hooks/
│   │   └── useScrollMemory.js    # Hook per memorizzazione posizioni scroll con ref esterna
│   ├── themes/
│   │   ├── themeDefinitions.js   # 8 definizioni di tema (~80 variabili CSS ciascuno)
│   │   └── themeEngine.js        # Applicazione tema, persistenza, scala font
│   └── utils/
│       ├── fileTypes.js          # Mapping estensioni → tipi (DOCUMENT, IMAGE, AUDIO, VIDEO) + icone
│       └── markdownRenderer.js   # Configurazione `marked` per rendering Markdown
├── public/                       # Asset statici
├── index.html                    # HTML entry point
├── vite.config.js                # Configurazione Vite
├── package.json                  # Dipendenze e script
└── .gitignore                    # node_modules, dist, release, *.env
```

---

## 4. Cose da Fare

### Build e Distribuzione
- [x] **Build installer** con `electron-builder` — NSIS x64 per Windows, output in `release/`, lingua italiana
- [x] **Aggiornamenti automatici** con `electron-updater` — check al boot (5s delay), toast "Riavvia e aggiorna" / "Dopo", publish su GitHub (Maruga/gm-dashboard), disabilitato in dev mode

### Funzionalità Nuove
- [x] **Pacchetti avventura** — Import/export zip, catalogo online, pubblica/scarica
- [x] **AI Console** — Assistente AI con contesto documenti, quota gratuita una tantum, provider OpenAI/Anthropic
- [x] **AI su Telegram** — Risposte AI ai giocatori con documenti filtrati per PG
- [x] **Firebase Auth** — Registrazione, login, auto-login, profilo utente
- [x] **Installation tracking** — UUID + documento Firestore per conteggio installazioni
- [x] **Relazioni PNG** — Pannello relazioni con punteggi e note, visualizzazione nello Stage
- [x] **Pagina Info** — Versione app, controllo aggiornamenti
- [ ] **Wikilinks `[[NomeFile]]`** stile Obsidian — Link cliccabili nei documenti Markdown
- [ ] **Supporto PDF** — Viewer integrato per file PDF
- [ ] **Temi custom** — Editor con color picker per temi personalizzati

### Shortcut Tastiera
- [ ] `Ctrl+M` — Muta/riattiva audio globale
- [ ] `Ctrl+T` — Focus sul timer
- [ ] `Ctrl+N` — Apri/chiudi pannello Note
- [ ] `Ctrl+K` — Apri/chiudi Checklist
- [ ] `Ctrl+F` — Focus sulla ricerca (Console)
- [ ] `Esc` — Chiude overlay aperti (già funzionante in QuickReference e CalendarPanel)
