/**
 * Parse a relations file in format:
 *   NomePNG -> NomePG -> Punteggio:Nota
 *
 * Returns { relations: { [pngName]: { [pgName]: { value, note } } }, errors: [] }
 */
export function parseRelationsFile(text) {
  const relations = {};
  const errors = [];

  if (!text) return { relations, errors };

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith('#')) continue;

    const parts = raw.split(' -> ');
    if (parts.length < 3) {
      errors.push({ line: i + 1, text: raw, message: 'formato non valido (servono 3 campi separati da " -> ")' });
      continue;
    }

    const pngName = parts[0].trim();
    const pgName = parts[1].trim();
    const scoreNote = parts.slice(2).join(' -> ').trim();

    if (!pngName || !pgName) {
      errors.push({ line: i + 1, text: raw, message: 'nome PNG o PG vuoto' });
      continue;
    }

    // Parse score:note — split only on first ":"
    const colonIdx = scoreNote.indexOf(':');
    let scoreStr, note;
    if (colonIdx === -1) {
      scoreStr = scoreNote;
      note = '';
    } else {
      scoreStr = scoreNote.substring(0, colonIdx).trim();
      note = scoreNote.substring(colonIdx + 1).trim();
    }

    let value = parseInt(scoreStr, 10);
    if (isNaN(value)) {
      errors.push({ line: i + 1, text: raw, message: `punteggio non valido: "${scoreStr}"` });
      continue;
    }

    if (!relations[pngName]) relations[pngName] = {};
    // Last line wins for duplicates
    relations[pngName][pgName] = { value, note };
  }

  return { relations, errors };
}
