// Fase C: apre il progetto fixture cliccando sulla card dei recenti,
// attende il caricamento della dashboard e scatta screenshot panoramici.

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { launchApp, REPO_ROOT } = require('../helpers/launchApp');
const { resolveFixtureProjectPath } = require('../helpers/projectPath');

const OUT_DIR = path.join(REPO_ROOT, 'docs-gen', '02-dashboard');

test.describe('Dashboard principale', () => {
  test('apre progetto e cattura panoramica + explorer', async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const fixturePath = resolveFixtureProjectPath();
    const fixtureName = path.basename(fixturePath);

    const { window, cleanup } = await launchApp({
      recentProjects: [{
        path: fixturePath,
        name: fixtureName,
        lastOpened: new Date().toISOString()
      }],
      theme: 'dark-purple'
    });

    try {
      // 1. Click sul progetto recente per aprirlo
      await window.waitForTimeout(1000); // attesa rendering selector
      await window.locator(`text=${fixtureName}`).first().click();

      // 2. Attendo che la dashboard sia caricata: Explorer visibile
      await window.waitForSelector('text=Explorer', { timeout: 15_000 });
      // Piccolo delay per rendering completo (file tree, viewer iniziale)
      await window.waitForTimeout(2500);

      // 3. Screenshot panoramica dashboard (viewport completa)
      await window.screenshot({ path: path.join(OUT_DIR, '01-panoramica.png') });
      console.log('[02] Screenshot panoramica salvato');

      // 4. Screenshot ritagliato al solo pannello Explorer (per manuale dedicato)
      //    L'Explorer occupa circa il 17% sinistro dello schermo.
      const explorerPanel = window.locator('text=EXPLORER').locator('..').locator('..');
      if (await explorerPanel.count() > 0) {
        await explorerPanel.first().screenshot({ path: path.join(OUT_DIR, '02-explorer.png') });
        console.log('[02] Screenshot explorer salvato');
      } else {
        // Fallback: ritaglio con coordinate fisse (viewport 1920x1080)
        await window.screenshot({
          path: path.join(OUT_DIR, '02-explorer.png'),
          clip: { x: 0, y: 40, width: 340, height: 820 }
        });
        console.log('[02] Screenshot explorer (clip) salvato');
      }

      // 5. Screenshot del TopMenu (barra superiore con tutti i bottoni)
      await window.screenshot({
        path: path.join(OUT_DIR, '03-topmenu.png'),
        clip: { x: 0, y: 0, width: 1920, height: 56 }
      });
      console.log('[02] Screenshot topmenu salvato');

      // Verifica che i pannelli principali siano caricati
      await expect(window.locator('text=Explorer').first()).toBeVisible();
      await expect(window.locator('text=Viewer').first()).toBeVisible();
      await expect(window.locator('text=Stage').first()).toBeVisible();
      // Verifica che i file dell'Explorer siano caricati (contenuto del progetto fixture)
      await expect(window.locator('text=Avventura.md').first()).toBeVisible();

    } finally {
      await cleanup();
    }
  });
});
