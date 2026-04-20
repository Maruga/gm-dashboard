// Resolve del path al progetto GM Dashboard usato come fixture per gli screenshot.
// Priorita:
//   1. GM_DASHBOARD_FIXTURE (variabile d'ambiente)
//   2. tests/.fixture-path.txt (prima riga non-vuota, non-commento)
// Entrambe le sorgenti sono in .gitignore, il progetto fixture NON viene committato.

const fs = require('fs');
const path = require('path');

function resolveFixtureProjectPath() {
  // 1. Env var
  const fromEnv = process.env.GM_DASHBOARD_FIXTURE;
  if (fromEnv && fromEnv.trim()) return path.resolve(fromEnv.trim());

  // 2. File locale
  const fileA = path.join(__dirname, '..', '.fixture-path.txt');
  const fileB = path.join(__dirname, '..', '.fixture-path');
  for (const f of [fileA, fileB]) {
    if (!fs.existsSync(f)) continue;
    const content = fs.readFileSync(f, 'utf-8');
    const line = content.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('#'));
    if (line) return path.resolve(line);
  }

  throw new Error(
    'Path del progetto fixture non trovato.\n' +
    'Impostare GM_DASHBOARD_FIXTURE oppure creare tests/.fixture-path.txt con il path.'
  );
}

module.exports = { resolveFixtureProjectPath };
