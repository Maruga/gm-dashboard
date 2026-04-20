// Fase B: verifica che il progetto fixture appaia nella lista dei recenti
// e che il tema dark-amethyst sia applicato.

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { launchApp, REPO_ROOT } = require('../helpers/launchApp');
const { resolveFixtureProjectPath } = require('../helpers/projectPath');

const OUT_DIR = path.join(REPO_ROOT, 'docs-gen', '01-project-selector');

test.describe('Project selector con fixture', () => {
  test('mostra progetto recente con tema dark-purple', async () => {
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
      // Attendo che la lista progetti sia renderizzata
      await window.waitForTimeout(1500);

      // Verifica che il tema sia effettivamente applicato
      const accent = await window.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
      );
      expect(accent).toBe('#9b6ed9'); // dark-purple

      // Verifica che il nome del progetto sia visibile nella UI
      const projectVisible = await window.locator(`text=${fixtureName}`).first().isVisible();
      expect(projectVisible).toBeTruthy();

      // Screenshot della schermata iniziale con progetto recente
      await window.screenshot({ path: path.join(OUT_DIR, '01-selector-con-progetto.png') });
      console.log(`[01] Screenshot selector con progetto salvato.`);
    } finally {
      await cleanup();
    }
  });
});
