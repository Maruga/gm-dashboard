// Fase C: screenshot dei pannelli modali. Un test per pannello per isolamento.
// Piu' lento (~5s per test) ma evita interferenze tra modal non chiudibili.

const { test } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { launchApp, REPO_ROOT } = require('../helpers/launchApp');
const { resolveFixtureProjectPath } = require('../helpers/projectPath');

const OUT_DIR = path.join(REPO_ROOT, 'docs-gen', '06-panels');

async function setupAndOpenProject() {
  const fixturePath = resolveFixtureProjectPath();
  const fixtureName = path.basename(fixturePath);

  const ctx = await launchApp({
    recentProjects: [{ path: fixturePath, name: fixtureName, lastOpened: new Date().toISOString() }],
    theme: 'dark-purple'
  });

  await ctx.window.waitForTimeout(1000);
  await ctx.window.locator(`text=${fixtureName}`).first().click();
  await ctx.window.waitForSelector('text=Explorer', { timeout: 15_000 });
  await ctx.window.waitForTimeout(2000);

  return ctx;
}

const panels = [
  { tooltip: 'Calendario',              file: '01-calendario.png' },
  { tooltip: 'Casting al tavolo',       file: '02-casting-panel.png' },
  { tooltip: 'Personaggi giocanti',     file: '03-personaggi.png' },
  { tooltip: 'Documenti AI',            file: '04-documenti-ai.png' },
  { tooltip: 'Note',                    file: '05-note.png' },
  { tooltip: 'Checklist',               file: '06-checklist.png' },
  { tooltip: 'Relazioni PNG',           file: '07-relazioni.png' },
  { tooltip: 'Manuali di riferimento',  file: '08-manuali.png' },
  { tooltip: 'Combat Tracker',          file: '09-combat-tracker.png' },
  { tooltip: 'Librerie',                file: '10-librerie.png' },
  { tooltip: 'Guide Dashboard',         file: '11-guide-dashboard.png' },
  { tooltip: 'Informazioni',            file: '12-informazioni.png' },
  { tooltip: 'Layout pannelli',         file: '13-layout.png' }
];

test.beforeAll(() => { fs.mkdirSync(OUT_DIR, { recursive: true }); });

for (const { tooltip, file } of panels) {
  test(`Pannello: ${tooltip}`, async () => {
    const { window, cleanup } = await setupAndOpenProject();
    try {
      const btn = window.locator(`[title="${tooltip}"]`).first();
      if (await btn.count() === 0) {
        console.warn(`[06] Bottone "${tooltip}" non trovato`);
        return;
      }
      await btn.click({ timeout: 5000 });
      await window.waitForTimeout(1500);
      await window.screenshot({ path: path.join(OUT_DIR, file) });
      console.log(`[06] ${tooltip} salvato -> ${file}`);
    } finally {
      await cleanup();
    }
  });
}
