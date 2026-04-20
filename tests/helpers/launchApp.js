// Helper per lanciare l'app Electron da Playwright con un profilo utente isolato.
// - Usa una cartella temporanea per userData cosi non interferisce con l'installazione reale
// - Espone la window principale e l'istanza Electron
// - Garantisce cleanup

const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { loadThemeVars } = require('./themeLoader');

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
 * Preload del file config.json di electron-store nel userData dir,
 * cosi' l'app al primo avvio vede gia' il progetto nei "recent".
 */
function preloadRecentProjects(userDataDir, projects) {
  const configPath = path.join(userDataDir, 'config.json');
  const content = {
    recentProjects: projects,
    projectStates: {},
    windowBounds: { width: 1920, height: 1080 }
  };
  fs.writeFileSync(configPath, JSON.stringify(content, null, 2), 'utf-8');
}

/**
 * Imposta il tema applicando direttamente le CSS variables al DOM root.
 * Non fa reload (evita race con mount React). Setta anche localStorage
 * cosi' componenti che leggono da li' vedono il valore corretto.
 */
async function setTheme(window, themeId) {
  const vars = loadThemeVars(themeId);
  await window.evaluate(({ id, vars }) => {
    try { localStorage.setItem('gm-dashboard-theme', id); } catch (_) {}
    const root = document.documentElement;
    for (const [prop, value] of Object.entries(vars)) {
      root.style.setProperty(prop, value);
    }
  }, { id: themeId, vars });
}

/**
 * Lancia l'app Electron con profilo isolato.
 * @param {object} opts
 * @param {Array<{path: string, name: string, lastOpened?: string}>} [opts.recentProjects]
 *        Progetti da precaricare nella schermata iniziale.
 * @param {string} [opts.theme]
 *        Tema da applicare subito dopo il primo load (es. 'dark-amethyst').
 * @returns {Promise<{ app, window, userDataDir, cleanup }>}
 */
async function launchApp(opts = {}) {
  ensureDistBuilt();
  const userDataDir = createIsolatedUserData();

  if (opts.recentProjects?.length) {
    preloadRecentProjects(userDataDir, opts.recentProjects);
  }

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

  if (opts.theme) {
    await setTheme(window, opts.theme);
  }

  const cleanup = async () => {
    try { await app.close(); } catch (_) {}
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
  };

  return { app, window, userDataDir, cleanup, setTheme: (id) => setTheme(window, id) };
}

module.exports = { launchApp, REPO_ROOT };
