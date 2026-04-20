# Playwright — Screenshot automatici

Sistema di automazione per catturare screenshot dell'app Electron e generare documentazione visuale del manuale utente.

## Struttura

```
tests/
├── README.md                    ← questo file
├── helpers/
│   ├── launchApp.js             ← lancia Electron con profilo isolato (userData temp)
│   └── projectPath.js           ← risolve il path del progetto fixture
├── screenshots/
│   ├── 00-smoke.spec.js         ← verifica base che tutto funzioni
│   └── (altri spec verranno aggiunti nelle fasi successive)
└── .fixture-path.txt            ← [locale, gitignored] path al progetto fixture
```

## Prerequisiti

1. **`dist/` buildato**: prima di runnare i test serve `npx vite build` (o `npm run build`)
2. **Progetto fixture** (per test diversi dal smoke): serve un path a un progetto GM Dashboard con dati realistici

## Configurare il fixture (solo per test oltre lo smoke)

Il progetto fixture NON viene committato (privacy, dimensione, copyright). Puoi specificarlo in due modi:

### Opzione A — Variabile d'ambiente
```bash
export GM_DASHBOARD_FIXTURE="C:/percorso/al/mio/progetto"
npm run screenshots
```

### Opzione B — File locale
Crea `tests/.fixture-path.txt` (gitignored) con una sola riga:
```
C:/percorso/al/mio/progetto
```

## Comandi

```bash
# Runna tutti gli screenshot test (headless, veloce)
npm run screenshots

# Runna con browser visibile (utile per debug)
npm run screenshots:headed

# Runna in modalita' debug interattivo (step-by-step)
npm run screenshots:debug

# Runna un singolo spec
npx playwright test tests/screenshots/00-smoke.spec.js
```

## Output

Gli screenshot vengono salvati in `docs-gen/` (gitignored). La struttura e' documentata nella Fase D del piano (vedi conversazione / plan).

## Aggiungere nuovi screenshot

1. Crea `tests/screenshots/XX-nome-sezione.spec.js`
2. Importa `launchApp` da `../helpers/launchApp.js`
3. Scatta con `window.screenshot({ path: ... })` o `locator.screenshot({ path: ... })`
4. Salva in `docs-gen/XX-nome-sezione/`

Pattern base:

```javascript
const { test } = require('@playwright/test');
const path = require('path');
const { launchApp, REPO_ROOT } = require('../helpers/launchApp');

const OUT = path.join(REPO_ROOT, 'docs-gen', 'XX-mia-sezione');

test('titolo test', async () => {
  const { window, cleanup } = await launchApp();
  try {
    // naviga, clicca, aspetta
    await window.click('text=Impostazioni');
    await window.waitForSelector('.settings-panel');
    await window.screenshot({ path: path.join(OUT, '01-settings.png') });
  } finally {
    await cleanup();
  }
});
```
