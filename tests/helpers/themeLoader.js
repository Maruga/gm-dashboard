// Parser minimalista di src/themes/themeDefinitions.js per estrarre i valori
// delle CSS variables di un tema specifico. Usato dai test Playwright per
// applicare un tema senza dover ricaricare l'app.

const fs = require('fs');
const path = require('path');

const THEMES_FILE = path.resolve(__dirname, '..', '..', 'src', 'themes', 'themeDefinitions.js');

/**
 * Estrae i valori CSS variables di un tema dal file themeDefinitions.js.
 * @param {string} themeId - es. 'dark-amethyst'
 * @returns {Record<string, string>}
 */
function loadThemeVars(themeId) {
  const src = fs.readFileSync(THEMES_FILE, 'utf-8');

  // Mappa theme id -> nome costante nel file
  // es. 'dark-purple' -> 'DARK_PURPLE', 'light-classic' -> 'LIGHT_CLASSIC'
  const varName = themeId.toUpperCase().replace(/-/g, '_');

  const pattern = new RegExp(`const\\s+${varName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`, 'm');
  const match = src.match(pattern);
  if (!match) {
    throw new Error(`Tema '${themeId}' (var '${varName}') non trovato in themeDefinitions.js`);
  }

  const body = match[1];
  const vars = {};
  // Pattern: '--nome': 'valore',  oppure  '--nome': "valore",
  const propPattern = /'(--[a-z0-9-]+)'\s*:\s*['"]([^'"]*)['"]/gi;
  let m;
  while ((m = propPattern.exec(body)) !== null) {
    vars[m[1]] = m[2];
  }
  return vars;
}

module.exports = { loadThemeVars };
