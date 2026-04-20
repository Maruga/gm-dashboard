// Fase C: screenshot pannello Impostazioni (tutte le sezioni principali).

const { test } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { launchApp, REPO_ROOT } = require('../helpers/launchApp');
const { resolveFixtureProjectPath } = require('../helpers/projectPath');

const OUT_DIR = path.join(REPO_ROOT, 'docs-gen', '05-settings');

async function openProject(window, fixtureName) {
  await window.waitForTimeout(1000);
  await window.locator(`text=${fixtureName}`).first().click();
  await window.waitForSelector('text=Explorer', { timeout: 15_000 });
  await window.waitForTimeout(2000);
}

test.describe('Impostazioni', () => {
  test('tutte le sezioni principali', async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const fixturePath = resolveFixtureProjectPath();
    const fixtureName = path.basename(fixturePath);

    const { window, cleanup } = await launchApp({
      recentProjects: [{ path: fixturePath, name: fixtureName, lastOpened: new Date().toISOString() }],
      theme: 'dark-purple'
    });

    try {
      await openProject(window, fixtureName);

      // Apri Impostazioni via bottone nel TopMenu (title="Impostazioni")
      await window.locator('[title="Impostazioni"]').first().click();
      await window.waitForTimeout(1500);

      // Screenshot iniziale: sezione default aperta
      await window.screenshot({ path: path.join(OUT_DIR, '01-settings-panoramica.png') });
      console.log('[05] Settings panoramica salvato');

      // Itero le sezioni tipicamente presenti. Provo a cliccarne alcune.
      const sections = [
        'Aspetto',
        'Progetto',
        'Personaggi',
        'Telegram',
        'Assistente AI',
        'Documenti AI',
        'Account',
        'Parole evidenziate',
        'Manuali',
        'Casting',
        'Importa/Esporta',
        'Layout',
        'Informazioni'
      ];

      let captured = 0;
      for (const name of sections) {
        const loc = window.locator(`text=${name}`);
        if (await loc.count() === 0) continue;
        try {
          await loc.first().click({ timeout: 2000 });
          await window.waitForTimeout(800);
          const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
          await window.screenshot({ path: path.join(OUT_DIR, `02-${String(captured + 2).padStart(2, '0')}-${safeName}.png`) });
          console.log(`[05] Settings ${name} salvato`);
          captured++;
        } catch (e) {
          console.warn(`[05] Sezione ${name} non cliccabile: ${e.message}`);
        }
      }

      // Chiudi il modal con Escape (pulizia stato)
      await window.keyboard.press('Escape');
    } finally {
      await cleanup();
    }
  });
});
