// Smoke test: verifica che Playwright riesca ad avviare l'app Electron e catturare
// uno screenshot della schermata iniziale (project selector). Non richiede fixture.

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { launchApp, REPO_ROOT } = require('../helpers/launchApp');

const OUT_DIR = path.join(REPO_ROOT, 'docs-gen', '00-smoke');

test('smoke: app si avvia e mostra project selector', async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { window, cleanup } = await launchApp();

  try {
    // Attendiamo che qualcosa di specifico del ProjectSelector sia visibile
    // (fallback: diamo 3s al caricamento iniziale se i selettori specifici non sono noti)
    await window.waitForTimeout(3000);

    const screenshotPath = path.join(OUT_DIR, 'startup.png');
    await window.screenshot({ path: screenshotPath, fullPage: false });

    const stats = fs.statSync(screenshotPath);
    expect(stats.size).toBeGreaterThan(10_000); // >10KB significa che c'e' contenuto reale
    console.log(`[smoke] Screenshot salvato: ${screenshotPath} (${Math.round(stats.size / 1024)} KB)`);
  } finally {
    await cleanup();
  }
});
