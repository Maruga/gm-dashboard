// Helper per lanciare l'app Electron da Playwright con un profilo utente isolato.
// - Usa una cartella temporanea per userData cosi non interferisce con l'installazione reale
// - Espone la window principale e l'istanza Electron
// - Garantisce cleanup

const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function ensureDistBuilt() {
  const distIndex = path.join(REPO_ROOT, 'dist', 'index.html');
  if (!fs.existsSync(distIndex)) {
    throw new Error(
      'dist/ non trovato. Esegui prima "npx vite build" oppure "npm run build".'
    );
  }
}

/**
 * Crea una cartella userData isolata per questo run
 * @returns {string} path alla cartella temporanea
 */
function createIsolatedUserData() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmdash-pw-'));
  return tempDir;
}

/**
 * Lancia l'app Electron con profilo isolato.
 * @param {object} opts
 * @returns {Promise<{ app, window, userDataDir, cleanup }>}
 */
async function launchApp(opts = {}) {
  ensureDistBuilt();
  const userDataDir = createIsolatedUserData();

  const app = await electron.launch({
    args: [
      path.join(REPO_ROOT, 'electron', 'main.js'),
      `--user-data-dir=${userDataDir}`
    ],
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });

  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  const cleanup = async () => {
    try { await app.close(); } catch (_) {}
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
  };

  return { app, window, userDataDir, cleanup };
}

module.exports = { launchApp, REPO_ROOT };
