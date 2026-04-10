import React, { useState, useRef } from 'react';

// ── Path helpers ──

function stripLeadingSlash(p) {
  return (p || '').trim().replace(/^\/+/, '');
}
function fileNameFromPath(p) {
  return p ? p.split('/').pop() : '';
}
function makeRelative(absPath, projectPath) {
  if (!absPath || !projectPath) return absPath || '';
  const a = absPath.replace(/\\/g, '/');
  const p = projectPath.replace(/\\/g, '/').replace(/\/$/, '') + '/';
  return a.startsWith(p) ? a.slice(p.length) : a;
}

// ── Module Configurations ──

const MODULE_CONFIGS = {
  players: {
    id: 'players', label: 'Personaggi (PG)', icon: '👥',
    fields: [
      { key: 'characterName', importLabel: 'nome', required: true },
      { key: 'playerName', importLabel: 'giocatore' },
      { key: 'note', importLabel: 'nota' }
    ],
    duplicateKey: (item) => item.characterName?.toLowerCase().trim(),
    createItem: (parsed) => ({
      id: crypto.randomUUID(), characterName: parsed.nome?.trim() || '',
      playerName: parsed.giocatore?.trim() || '', note: parsed.nota?.trim() || '',
      characterSheet: '', telegramChatId: '', aiDocuments: []
    }),
    exportItem: (item) => ({ nome: item.characterName, giocatore: item.playerName, nota: item.note }),
    getItems: (props) => props.players || [],
    setItems: (props, items) => props.onPlayersChange(items),
    exportHeader: '# GM Dashboard — Personaggi (v1)',
    aiPrompt: `Formatta i dati che ti fornisco come lista di personaggi giocanti per un'app di gioco di ruolo.

REGOLE FONDAMENTALI:
- Ogni personaggio deve stare su UNA SOLA RIGA (mai andare a capo nel mezzo)
- I campi sono separati da :: (due punti doppi)
- Non aggiungere spazi prima o dopo ::

CAMPI DISPONIBILI:
- nome:: (OBBLIGATORIO) nome del personaggio
- giocatore:: nome del giocatore reale
- nota:: note libere (classe, razza, equipaggiamento, ecc.)

FORMATO:
nome::Nome PG giocatore::Nome giocatore nota::Note

ESEMPIO CORRETTO:
nome::Thorin Scudodiquercia giocatore::Marco nota::Nano guerriero, armatura pesante, ascia a due mani
nome::Elara Stellaverde giocatore::Sara nota::Elfa maga, specialista in illusioni e incantesimi di protezione

Ecco i miei dati da formattare:
`
  },
  calendarEvents: {
    id: 'calendarEvents', label: 'Eventi Calendario', icon: '📅',
    isDateKeyed: true,
    fields: [
      { key: 'date', importLabel: 'data', required: true },
      { key: 'title', importLabel: 'titolo', required: true },
      { key: 'type', importLabel: 'tipo' },
      { key: 'note', importLabel: 'nota' },
      { key: 'linkedDocument', importLabel: 'documento', isPath: true }
    ],
    duplicateKey: (item) => `${item.date}||${(item.event?.title || item.title || '').toLowerCase().trim()}`,
    createItem: (parsed) => {
      const tipo = (parsed.tipo || '').trim().toLowerCase();
      return {
        date: parsed.data?.trim() || '',
        event: {
          id: crypto.randomUUID(),
          title: parsed.titolo?.trim() || '',
          type: ['indizio', 'promemoria', 'evento'].includes(tipo) ? tipo : 'evento',
          note: parsed.nota?.trim() || '',
          linkedDocument: stripLeadingSlash(parsed.documento),
          telegram: { enabled: false, recipients: [], autoSend: false }
        }
      };
    },
    exportItem: (item) => ({ data: item.date, titolo: item.title, tipo: item.type, nota: item.note, documento: item.linkedDocument ? '/' + item.linkedDocument : '' }),
    exportHeader: '# GM Dashboard — Eventi Calendario (v1)',
    aiPrompt: `Formatta i dati che ti fornisco come eventi calendario per un'app di gioco di ruolo.

REGOLE FONDAMENTALI:
- Ogni evento deve stare su UNA SOLA RIGA (mai andare a capo nel mezzo)
- I campi sono separati da :: (due punti doppi)
- Non aggiungere spazi prima o dopo ::

CAMPI DISPONIBILI:
- data:: (OBBLIGATORIO) data in formato AAAA-MM-GG (es: 2025-06-15)
- titolo:: (OBBLIGATORIO) titolo dell'evento
- tipo:: uno tra: evento, indizio, promemoria (default: evento)
- nota:: (opzionale) descrizione o dettagli
- documento:: (opzionale) percorso a un file collegato, inizia con /

FORMATO:
data::2025-06-15 titolo::Titolo tipo::evento nota::Descrizione documento::/cartella/file.ext

ESEMPIO CORRETTO:
data::2025-06-15 titolo::Arrivo a Mordheim tipo::evento nota::I giocatori incontrano il mercante misterioso documento::/maps/mordheim.png
data::2025-06-16 titolo::Indizio sulla cripta tipo::indizio nota::Un vecchio racconta di rumori sotto la chiesa

Ecco i miei dati da formattare:
`
  },
  notes: {
    id: 'notes', label: 'Note', icon: '📝',
    fields: [
      { key: 'text', importLabel: 'testo', required: true },
      { key: 'sourcePath', importLabel: 'origine', isPath: true }
    ],
    duplicateKey: (item) => item.text?.toLowerCase().trim(),
    createItem: (parsed, projectPath) => {
      const origineRel = stripLeadingSlash(parsed.origine);
      return {
        id: crypto.randomUUID(), text: parsed.testo?.trim() || '',
        timestamp: new Date().toISOString(),
        source: origineRel ? fileNameFromPath(origineRel) : null,
        sourcePath: origineRel && projectPath ? (projectPath.replace(/\\/g, '/') + '/' + origineRel) : null,
        sourceScrollTop: 0
      };
    },
    exportItem: (item, projectPath) => {
      const rel = item.sourcePath ? makeRelative(item.sourcePath, projectPath) : '';
      return { testo: item.text, ...(rel ? { origine: '/' + rel } : {}) };
    },
    getItems: (props) => props.notes || [],
    setItems: (props, items) => props.onNotesChange(items),
    exportHeader: '# GM Dashboard — Note (v1)',
    aiPrompt: `Formatta i dati che ti fornisco come note per un'app di gioco di ruolo.

REGOLE FONDAMENTALI:
- Ogni nota deve stare su UNA SOLA RIGA (mai andare a capo nel mezzo)
- I campi sono separati da :: (due punti doppi)
- Non aggiungere spazi prima o dopo ::

CAMPI DISPONIBILI:
- testo:: (OBBLIGATORIO) contenuto della nota
- origine:: (opzionale) percorso a un file collegato, inizia con /

FORMATO:
testo::Contenuto della nota origine::/cartella/file.ext

ESEMPIO CORRETTO:
testo::Il mercante ha un tatuaggio a forma di serpente sul polso sinistro origine::/sessioni/sessione3.md
testo::La porta segreta si apre con la parola "Kaltenstein"

Ecco i miei dati da formattare:
`
  },
  checklist: {
    id: 'checklist', label: 'Checklist', icon: '☑',
    fields: [
      { key: 'text', importLabel: 'testo', required: true },
      { key: 'checked', importLabel: 'completato' },
      { key: 'sourcePath', importLabel: 'origine', isPath: true }
    ],
    duplicateKey: (item) => item.text?.toLowerCase().trim(),
    createItem: (parsed, projectPath) => {
      const origineRel = stripLeadingSlash(parsed.origine);
      return {
        id: crypto.randomUUID(), text: parsed.testo?.trim() || '',
        checked: ['s', 'sì', 'si', 't', 'true', '1'].includes((parsed.completato || '').trim().toLowerCase()),
        timestamp: new Date().toISOString(),
        source: origineRel ? fileNameFromPath(origineRel) : null,
        sourcePath: origineRel && projectPath ? (projectPath.replace(/\\/g, '/') + '/' + origineRel) : null,
        sourceScrollTop: null
      };
    },
    exportItem: (item, projectPath) => {
      const rel = item.sourcePath ? makeRelative(item.sourcePath, projectPath) : '';
      return { testo: item.text, completato: item.checked ? 'sì' : 'no', ...(rel ? { origine: '/' + rel } : {}) };
    },
    getItems: (props) => props.checklist || [],
    setItems: (props, items) => props.onChecklistChange(items),
    exportHeader: '# GM Dashboard — Checklist (v1)',
    aiPrompt: `Formatta i dati che ti fornisco come checklist per un'app di gioco di ruolo.

REGOLE FONDAMENTALI:
- Ogni elemento deve stare su UNA SOLA RIGA (mai andare a capo nel mezzo)
- I campi sono separati da :: (due punti doppi)
- Non aggiungere spazi prima o dopo ::

CAMPI DISPONIBILI:
- testo:: (OBBLIGATORIO) descrizione del task
- completato:: (obbligatorio) "sì" oppure "no"
- origine:: (opzionale) percorso a un file collegato, inizia con /

FORMATO:
testo::Descrizione del task completato::no origine::/cartella/file.ext

ESEMPIO CORRETTO:
testo::Consegnare il rapporto al detective completato::no origine::/handout/rapporto.html
testo::Preparare la mappa del dungeon completato::sì
testo::Verificare le schede dei PG completato::no

ESEMPIO SBAGLIATO (non fare così):
testo::Consegnare il rapporto
  completato::no
  origine::/handout/rapporto.html
(ERRORE: ogni campo DEVE stare sulla stessa riga del testo)

Ecco i miei dati da formattare:
`
  }
};

const MODULE_LIST = Object.values(MODULE_CONFIGS);

// ── Parsers ──

function detectFormat(text) {
  if (!text || !text.trim()) return null;
  const firstLine = text.trim().split('\n').find(l => l.trim() && !l.trim().startsWith('#'));
  if (!firstLine) return null;
  if (text.includes('::')) return 'labeled';
  if (firstLine.includes('\t')) return 'tab';
  if (firstLine.includes(',')) return 'csv';
  return null;
}

function parseLabeledFormat(text, fields) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const labels = fields.map(f => f.importLabel.toLowerCase());
  const results = [];

  for (const line of lines) {
    const parsed = {};
    // Build regex that matches known field names followed by ::
    const fieldPattern = new RegExp(`(?:^|\\s)(${labels.join('|')})::`, 'gi');
    const matches = [...line.matchAll(fieldPattern)];

    if (matches.length === 0) continue;

    for (let i = 0; i < matches.length; i++) {
      const fieldName = matches[i][1].toLowerCase();
      const valueStart = matches[i].index + matches[i][0].length;
      const valueEnd = i + 1 < matches.length ? matches[i + 1].index : line.length;
      parsed[fieldName] = line.slice(valueStart, valueEnd).trim();
    }
    results.push(parsed);
  }
  return results;
}

function parseTabFormat(text, fields) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (lines.length < 2) return [];
  const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const parsed = {};
    headers.forEach((h, idx) => { if (values[idx] !== undefined) parsed[h] = values[idx].trim(); });
    results.push(parsed);
  }
  return results;
}

function parseCsvFormat(text, fields) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const parsed = {};
    headers.forEach((h, idx) => { if (values[idx] !== undefined) parsed[h] = values[idx].trim(); });
    results.push(parsed);
  }
  return results;
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { values.push(current); current = ''; continue; }
    current += ch;
  }
  values.push(current);
  return values;
}

function parseInput(text, format, fields) {
  const fmt = format === 'auto' ? detectFormat(text) : format;
  if (!fmt) return { records: [], format: null };
  switch (fmt) {
    case 'labeled': return { records: parseLabeledFormat(text, fields), format: 'labeled' };
    case 'tab': return { records: parseTabFormat(text, fields), format: 'tab' };
    case 'csv': return { records: parseCsvFormat(text, fields), format: 'csv' };
    default: return { records: [], format: null };
  }
}

// ── Analysis ──

function analyzeImport(records, config, existingItems, projectPath) {
  const existing = new Set(existingItems.map(item => config.duplicateKey(item)).filter(Boolean));
  const valid = [];
  const invalid = [];
  const newItems = [];
  const duplicates = [];

  for (let i = 0; i < records.length; i++) {
    const item = config.createItem(records[i], projectPath);
    const hasRequired = config.fields.filter(f => f.required).every(f => {
      const importLabel = f.importLabel;
      return records[i][importLabel]?.trim();
    });
    if (!hasRequired) {
      const missing = config.fields.filter(f => f.required && !records[i][f.importLabel]?.trim()).map(f => f.importLabel);
      invalid.push({ line: i + 1, record: records[i], missing });
      continue;
    }
    valid.push(item);
    const key = config.duplicateKey(item);
    if (key && existing.has(key)) duplicates.push(item);
    else newItems.push(item);
  }

  return { valid, newItems, duplicates, invalid, total: records.length };
}

// ── Calendar helpers ──

function flattenCalendarEvents(calendarData) {
  const items = [];
  const events = calendarData?.events || {};
  for (const [date, evts] of Object.entries(events)) {
    for (const evt of evts) {
      items.push({ date, ...evt });
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  return items;
}

function unflattenCalendarEvents(items, existingCalendar) {
  const events = {};
  for (const item of items) {
    if (!item.date) continue;
    if (!events[item.date]) events[item.date] = [];
    events[item.date].push(item.event || item);
  }
  return { ...existingCalendar, events };
}

// ── Export ──

function exportText(items, config, projectPath) {
  const date = new Date().toISOString().split('T')[0];
  const lines = [config.exportHeader, `# Esportato il ${date}`, ''];

  for (const item of items) {
    const exported = config.exportItem ? config.exportItem(item, projectPath) : item;
    const parts = config.fields
      .map(f => {
        const val = exported[f.importLabel] || '';
        if (f.isPath && !val) return null;
        return `${f.importLabel}::${val}`;
      })
      .filter(Boolean);
    lines.push(parts.join(' '));
  }
  return lines.join('\n');
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Components ──

function PromptModal({ prompt, onClose }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '500px', maxHeight: '70vh', background: 'var(--bg-panel)',
        border: '1px solid var(--border-default)', borderRadius: '8px', padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '12px'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Prompt per AI</div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>
          Copia questo testo e incollalo in ChatGPT, Claude o qualsiasi AI. Aggiungi i tuoi dati in fondo. L'AI genererà il testo nel formato corretto da incollare qui.
        </div>
        <textarea readOnly value={prompt} rows={12} style={{
          flex: 1, padding: '10px', fontSize: '12px', fontFamily: 'monospace', lineHeight: '1.5',
          background: 'var(--bg-main)', border: '1px solid var(--border-default)',
          borderRadius: '4px', color: 'var(--text-primary)', resize: 'none', outline: 'none'
        }} />
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <span onClick={onClose} style={{ fontSize: '12px', padding: '6px 12px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>Chiudi</span>
          <span onClick={handleCopy} style={{
            fontSize: '12px', fontWeight: '600', padding: '6px 16px', borderRadius: '4px',
            background: copied ? 'var(--color-success)' : 'var(--accent)', color: 'var(--bg-main)', cursor: 'pointer'
          }}>{copied ? 'Copiato!' : 'Copia prompt'}</span>
        </div>
      </div>
    </div>
  );
}

function PreviewDialog({ analysis, config, existingCount, onMerge, onReplace, onCancel }) {
  const [showInvalid, setShowInvalid] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const confirmTimer = useRef(null);

  React.useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  const handleReplace = () => {
    if (!confirmReplace) {
      setConfirmReplace(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmReplace(false), 3000);
    } else {
      onReplace();
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-dark)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '420px', background: 'var(--bg-panel)',
        border: '1px solid var(--border-default)', borderRadius: '8px', padding: '20px'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '16px' }}>
          Anteprima importazione — {config.label}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '16px' }}>
          <div>{analysis.total} record trovati</div>
          {analysis.invalid.length > 0 && (
            <div>
              <span style={{ color: 'var(--color-warning)', cursor: 'pointer' }} onClick={() => setShowInvalid(!showInvalid)}>
                {analysis.invalid.length} scartati (campi obbligatori mancanti) {showInvalid ? '▲' : '▼'}
              </span>
              {showInvalid && (
                <div style={{ marginTop: '4px', padding: '6px', background: 'var(--bg-main)', borderRadius: '4px', fontSize: '11px', maxHeight: '80px', overflowY: 'auto' }}>
                  {analysis.invalid.map((inv, i) => (
                    <div key={i} style={{ color: 'var(--text-tertiary)' }}>Riga {inv.line}: manca {inv.missing.join(', ')}</div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div>{analysis.valid.length} validi: <span style={{ color: 'var(--color-success)' }}>{analysis.newItems.length} nuovi</span>, <span style={{ color: 'var(--text-tertiary)' }}>{analysis.duplicates.length} già esistenti</span></div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <span onClick={onCancel} style={{ fontSize: '12px', padding: '6px 14px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>Annulla</span>
          {analysis.newItems.length > 0 && (
            <span onClick={onMerge} style={{
              fontSize: '12px', fontWeight: '600', padding: '6px 16px', borderRadius: '4px',
              background: 'var(--accent)', color: 'var(--bg-main)', cursor: 'pointer'
            }}>Unisci ({analysis.newItems.length})</span>
          )}
          <span onClick={handleReplace} style={{
            fontSize: '12px', fontWeight: '500', padding: '6px 14px', borderRadius: '4px',
            border: `1px solid ${confirmReplace ? 'var(--color-danger)' : 'var(--border-default)'}`,
            background: confirmReplace ? 'var(--color-danger-bg)' : 'transparent',
            color: confirmReplace ? 'var(--color-danger)' : 'var(--text-secondary)', cursor: 'pointer'
          }}>{confirmReplace ? `Sicuro? (${existingCount} cancellati)` : `Sostituisci tutto (${analysis.valid.length})`}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──

export default function DataImportPanel({ projectPath, players, onPlayersChange, notes, onNotesChange, checklist, onChecklistChange, calendarData, onCalendarChange }) {
  const [selectedModule, setSelectedModule] = useState('players');
  const [mode, setMode] = useState('import');
  const [inputText, setInputText] = useState('');
  const [format, setFormat] = useState('auto');
  const [analysis, setAnalysis] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [importDone, setImportDone] = useState(null); // null | { count, action }
  const [clipboardCopied, setClipboardCopied] = useState(false);
  const fileInputRef = useRef(null);

  const config = MODULE_CONFIGS[selectedModule];
  const props = { players, onPlayersChange, notes, onNotesChange, checklist, onChecklistChange, calendarData, onCalendarChange };

  // Get current items for selected module
  const getExistingItems = () => {
    if (config.isDateKeyed) return flattenCalendarEvents(calendarData);
    return config.getItems(props);
  };

  const handlePreview = () => {
    const { records } = parseInput(inputText, format, config.fields);
    if (records.length === 0) { setAnalysis(null); return; }
    const existing = getExistingItems();
    const result = analyzeImport(records, config, existing, projectPath);
    setAnalysis(result);
  };

  const handleMerge = () => {
    if (!analysis) return;
    if (config.isDateKeyed) {
      const existing = flattenCalendarEvents(calendarData);
      const merged = [...existing.map(e => { const { date, ...evt } = e; return { date, event: evt }; }), ...analysis.newItems];
      onCalendarChange(unflattenCalendarEvents(merged, calendarData));
    } else {
      const existing = config.getItems(props);
      config.setItems(props, [...existing, ...analysis.newItems]);
    }
    setImportDone({ count: analysis.newItems.length, action: 'uniti' });
    setAnalysis(null);
    setInputText('');
    setTimeout(() => setImportDone(null), 3000);
  };

  const handleReplace = () => {
    if (!analysis) return;
    if (config.isDateKeyed) {
      onCalendarChange(unflattenCalendarEvents(analysis.valid, calendarData));
    } else {
      config.setItems(props, analysis.valid);
    }
    setImportDone({ count: analysis.valid.length, action: 'sostituiti' });
    setAnalysis(null);
    setInputText('');
    setTimeout(() => setImportDone(null), 3000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setInputText(reader.result);
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = () => {
    const items = getExistingItems();
    const text = exportText(items, config, projectPath);
    downloadText(text, `${config.id}.txt`);
  };

  const handleCopyClipboard = async () => {
    const items = getExistingItems();
    const text = exportText(items, config, projectPath);
    await navigator.clipboard.writeText(text);
    setClipboardCopied(true);
    setTimeout(() => setClipboardCopied(false), 2000);
  };

  const existingCount = getExistingItems().length;
  const exportPreview = mode === 'export' ? exportText(getExistingItems().slice(0, 5), config, projectPath) + (existingCount > 5 ? '\n...' : '') : '';

  const inputStyle = {
    padding: '4px 8px', fontSize: '12px', minHeight: '28px',
    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
    borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Module selector */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {MODULE_LIST.map(m => (
          <span key={m.id} onClick={() => { setSelectedModule(m.id); setInputText(''); setAnalysis(null); setImportDone(null); }} style={{
            padding: '5px 12px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
            background: selectedModule === m.id ? 'var(--accent-a10)' : 'transparent',
            color: selectedModule === m.id ? 'var(--accent)' : 'var(--text-secondary)',
            border: selectedModule === m.id ? '1px solid var(--accent)' : '1px solid transparent'
          }}>{m.icon} {m.label}</span>
        ))}
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '12px' }}>
        {['import', 'export'].map(m => (
          <span key={m} onClick={() => setMode(m)} style={{
            padding: '5px 16px', fontSize: '12px', cursor: 'pointer', fontWeight: '500',
            borderBottom: mode === m ? '2px solid var(--accent)' : '2px solid transparent',
            color: mode === m ? 'var(--accent)' : 'var(--text-tertiary)'
          }}>{m === 'import' ? 'Importa' : 'Esporta'}</span>
        ))}
      </div>

      {/* Import done feedback */}
      {importDone && (
        <div style={{ padding: '6px 12px', marginBottom: '8px', borderRadius: '4px', fontSize: '12px',
          background: 'color-mix(in srgb, var(--color-success) 10%, transparent)', color: 'var(--color-success)' }}>
          ✓ {importDone.count} record {importDone.action}
        </div>
      )}

      {mode === 'import' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Format + buttons row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={format} onChange={e => setFormat(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', width: '140px' }}>
              <option value="auto">Formato: auto</option>
              <option value="labeled">Campi etichettati (::)</option>
              <option value="tab">Tab (Excel)</option>
              <option value="csv">CSV</option>
            </select>
            <span onClick={() => setShowPrompt(true)} style={{
              fontSize: '11px', padding: '5px 12px', borderRadius: '4px',
              border: '1px solid var(--color-info)', color: 'var(--color-info)', cursor: 'pointer'
            }}>🤖 Genera con AI</span>
            <span onClick={() => fileInputRef.current?.click()} style={{
              fontSize: '11px', padding: '5px 12px', borderRadius: '4px',
              border: '1px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer'
            }}>📁 Carica file</span>
            <input ref={fileInputRef} type="file" accept=".txt,.csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          </div>

          {/* Textarea */}
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={`Incolla qui i dati per ${config.label}...\n\nFormato: ${config.fields.map(f => `${f.importLabel}::valore`).join(' ')}`}
            rows={10}
            style={{ ...inputStyle, flex: 1, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5' }}
          />

          {/* Field reference */}
          <div style={{ fontSize: '10px', color: 'var(--text-disabled)', lineHeight: '1.5' }}>
            Campi: {config.fields.map(f => <span key={f.key} style={{ color: f.required ? 'var(--text-secondary)' : 'var(--text-disabled)' }}>{f.importLabel}{f.required ? '*' : ''}</span>).reduce((a, b) => [a, ', ', b])}
          </div>

          {/* Preview button */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <span onClick={handlePreview} style={{
              fontSize: '12px', fontWeight: '600', padding: '6px 16px', borderRadius: '4px',
              background: inputText.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
              color: inputText.trim() ? 'var(--bg-main)' : 'var(--text-disabled)',
              cursor: inputText.trim() ? 'pointer' : 'default'
            }}>Anteprima</span>
          </div>
        </div>
      )}

      {mode === 'export' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            {existingCount} {config.label.toLowerCase()} presenti
          </div>

          {/* Export preview */}
          <textarea readOnly value={exportPreview} rows={8} style={{
            ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.5',
            color: 'var(--text-tertiary)', resize: 'none'
          }} />

          {/* Export buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <span onClick={existingCount > 0 ? handleExport : undefined} style={{
              fontSize: '12px', padding: '6px 14px', borderRadius: '4px',
              border: '1px solid var(--border-default)', color: 'var(--text-secondary)',
              cursor: existingCount > 0 ? 'pointer' : 'default', opacity: existingCount > 0 ? 1 : 0.5
            }}>Esporta .txt</span>
            <span onClick={existingCount > 0 ? handleCopyClipboard : undefined} style={{
              fontSize: '12px', padding: '6px 14px', borderRadius: '4px',
              border: '1px solid var(--border-default)',
              color: clipboardCopied ? 'var(--color-success)' : 'var(--text-secondary)',
              cursor: existingCount > 0 ? 'pointer' : 'default', opacity: existingCount > 0 ? 1 : 0.5
            }}>{clipboardCopied ? 'Copiato!' : 'Copia appunti'}</span>
          </div>
        </div>
      )}

      {/* Modals */}
      {showPrompt && <PromptModal prompt={config.aiPrompt} onClose={() => setShowPrompt(false)} />}
      {analysis && (
        <PreviewDialog
          analysis={analysis} config={config} existingCount={existingCount}
          onMerge={handleMerge} onReplace={handleReplace} onCancel={() => setAnalysis(null)}
        />
      )}
    </div>
  );
}
