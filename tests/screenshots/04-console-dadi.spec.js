// Fase C: screenshot Console (4 tab) + Dadi animati.
// Ogni screenshot e' full 1920x1080 con focus sulla Console/Dadi.

const { test } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { launchApp, REPO_ROOT } = require('../helpers/launchApp');
const { resolveFixtureProjectPath } = require('../helpers/projectPath');

const OUT_DIR = path.join(REPO_ROOT, 'docs-gen', '04-console-dadi');

async function openProject(window, fixtureName) {
  await window.waitForTimeout(1000);
  await window.locator(`text=${fixtureName}`).first().click();
  await window.waitForSelector('text=Explorer', { timeout: 15_000 });
  await window.waitForTimeout(2000);
}

test.describe('Console e Dadi', () => {
  test('Console 4 tab + Dadi animazione', async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const fixturePath = resolveFixtureProjectPath();
    const fixtureName = path.basename(fixturePath);

    const { window, cleanup } = await launchApp({
      recentProjects: [{ path: fixturePath, name: fixtureName, lastOpened: new Date().toISOString() }],
      theme: 'dark-purple'
    });

    try {
      await openProject(window, fixtureName);

      // Tab RICERCA attiva (default)
      await window.screenshot({ path: path.join(OUT_DIR, '01-console-ricerca.png') });
      console.log('[04] Console RICERCA (full dashboard) salvato');

      // Tab AI
      await window.locator('text=AI').first().click();
      await window.waitForTimeout(700);
      await window.screenshot({ path: path.join(OUT_DIR, '02-console-ai.png') });
      console.log('[04] Console AI salvato');

      // Tab PROVA PG
      await window.locator('text=PROVA PG').first().click();
      await window.waitForTimeout(700);
      await window.screenshot({ path: path.join(OUT_DIR, '03-console-prova-pg.png') });
      console.log('[04] Console PROVA PG salvato');

      // Tab LOG TELEGRAM
      await window.locator('text=LOG TELEGRAM').first().click();
      await window.waitForTimeout(700);
      await window.screenshot({ path: path.join(OUT_DIR, '04-console-log-telegram.png') });
      console.log('[04] Console LOG TELEGRAM salvato');

      // Torno su RICERCA per pulizia prima dei dadi
      await window.locator('text=RICERCA').first().click();
      await window.waitForTimeout(500);

      // Lancio d20 (singolo tiro)
      await window.locator('text=d20').first().click();
      await window.waitForTimeout(400);
      await window.screenshot({ path: path.join(OUT_DIR, '05-dadi-d20-lancio.png') });
      console.log('[04] Dadi d20 singolo salvato');

      // Tiri multipli
      await window.locator('text=d20').first().click();
      await window.locator('text=d20').first().click();
      await window.locator('text=d6').first().click();
      await window.locator('text=d6').first().click();
      await window.waitForTimeout(1500);
      await window.screenshot({ path: path.join(OUT_DIR, '06-dadi-multipli.png') });
      console.log('[04] Dadi multipli salvato');

    } finally {
      await cleanup();
    }
  });
});
