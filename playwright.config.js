// Configurazione Playwright per screenshot automatizzati dell'app Electron.
// Gli screenshot finiscono in docs-gen/ (gitignored). Il progetto fixture
// (carico di dati realistici) vive fuori dal repo, il path viene letto da:
//   1. env var GM_DASHBOARD_FIXTURE
//   2. file tests/.fixture-path.txt (prima riga)
// Vedi tests/helpers/projectPath.js.

const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests', 'screenshots'),
  // Un test alla volta: Electron non supporta bene sessioni parallele sullo stesso profilo
  workers: 1,
  fullyParallel: false,
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  outputDir: 'test-results',

  use: {
    // Risoluzione standard web 1920x1080
    viewport: { width: 1920, height: 1080 },
    // Catturiamo video solo in caso di errore (utile per debug)
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    screenshot: 'off' // gli screenshot li scattiamo esplicitamente dentro i test
  }
});
