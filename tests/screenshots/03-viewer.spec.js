// Fase C: cattura screenshot del Viewer con documenti veri e con bottoni comando.

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const { launchApp, REPO_ROOT } = require('../helpers/launchApp');
const { resolveFixtureProjectPath } = require('../helpers/projectPath');

const OUT_DIR = path.join(REPO_ROOT, 'docs-gen', '03-viewer');

const DEMO_CONTENT = `# Esempi di comandi nel documento

Questo file mostra tutti i tipi di bottoni generati dai comandi speciali.

## Sezione narrativa

I personaggi arrivano alla Taverna del Drago Addormentato.

[tlg|Tutti|L'odore di birra calda e stufato vi avvolge. Il locandiere orco vi guarda con sospetto.]

Notano un vecchio in un angolo che li osserva.

[ai|Mario|Parla come il vecchio saggio: saluta il gruppo con un enigma e insinua che conosce il loro passato]

## Immagini e mappe

[cast|mappe/taverna.jpg|La sala principale della taverna]

Quando escono dalla taverna, la scena cambia.

[cast|blank]

## Pausa AI

Lo stregone che li contattava telepaticamente viene stordito.

[aipause|Tutti|Il contatto mentale si interrompe bruscamente. Silenzio assoluto.]

Dopo 20 minuti di gioco, riprende conoscenza.

[airesume|Tutti]
`;

test.describe('Viewer documenti', () => {
  test('Viewer con documento reale + demo comandi', async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const fixturePath = resolveFixtureProjectPath();
    const fixtureName = path.basename(fixturePath);

    // Crea file demo temporaneo nel progetto fixture
    const demoFile = path.join(fixturePath, 'zz-demo-comandi.md');
    fs.writeFileSync(demoFile, DEMO_CONTENT, 'utf-8');

    const { window, cleanup } = await launchApp({
      recentProjects: [{ path: fixturePath, name: fixtureName, lastOpened: new Date().toISOString() }],
      theme: 'dark-purple'
    });

    try {
      // Apri il progetto
      await window.waitForTimeout(1000);
      await window.locator(`text=${fixtureName}`).first().click();
      await window.waitForSelector('text=Explorer', { timeout: 15_000 });
      await window.waitForTimeout(2000);

      // 1. Apro Avventura.md (file reale del progetto)
      await window.locator('text=Avventura.md').first().click();
      await window.waitForTimeout(2500);
      await window.screenshot({ path: path.join(OUT_DIR, '01-viewer-documento-reale.png') });
      console.log('[03] Viewer con Avventura.md salvato');

      // 2. Apro il file demo con tutti i bottoni comando
      // Explorer carica dinamicamente, il file demo appare solo dopo refresh
      // Provo a cliccare l'icona refresh accanto al titolo Explorer
      try {
        const refreshBtn = window.locator('text=EXPLORER').locator('..').locator('..').locator('button, [title*="aggiorn" i], [title*="refresh" i]').first();
        await refreshBtn.click({ timeout: 2000 });
        await window.waitForTimeout(1000);
      } catch (_) { /* fallback, il file potrebbe gia' essere visibile */ }

      // Cerco il file demo nell'explorer
      const demoLocator = window.locator('text=zz-demo-comandi.md').first();
      if (await demoLocator.count() > 0) {
        await demoLocator.click();
        await window.waitForTimeout(2500);
        await window.screenshot({ path: path.join(OUT_DIR, '02-viewer-comandi-demo.png') });
        console.log('[03] Viewer con demo comandi salvato');
      } else {
        console.warn('[03] File demo non visibile nell\'Explorer — skip screenshot comandi');
      }

      // Verifica che il viewer abbia renderizzato contenuto
      await expect(window.locator('.viewer-content').first()).toBeVisible();
    } finally {
      // Cleanup: rimuovo file demo dal progetto fixture
      try { fs.unlinkSync(demoFile); } catch (_) {}
      await cleanup();
    }
  });
});
