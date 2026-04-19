import React, { useState, useRef, useEffect, useCallback } from 'react';
import DataImportPanel from './DataImportPanel';
import { THEMES, THEME_LIST } from '../themes/themeDefinitions';
import QRCode from 'qrcode';
import { applyTheme, saveThemeId, getStoredThemeId, applyFontScale, saveFontScale, getStoredFontScale } from '../themes/themeEngine';

const HIGHLIGHT_PALETTE = [
  'rgba(201,169,110,0.55)',
  'rgba(220,60,60,0.50)',
  'rgba(70,130,230,0.50)',
  'rgba(80,185,80,0.50)',
  'rgba(160,90,230,0.50)',
  'rgba(230,160,30,0.55)',
  'rgba(50,190,190,0.50)',
  'rgba(220,80,150,0.50)'
];

function rgbaToHex(rgba) {
  const m = rgba.match(/\d+/g);
  if (!m) return '#c9a96e';
  return '#' + [m[0], m[1], m[2]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box'
};

const labelStyle = {
  fontSize: '12px',
  color: 'var(--text-secondary)',
  marginBottom: '4px',
  display: 'block'
};

const sectionStyle = {
  fontSize: '13px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  color: 'var(--accent)',
  marginBottom: '16px',
  paddingBottom: '8px',
  borderBottom: '1px solid var(--border-default)'
};

function parseDate(dateStr) {
  if (!dateStr) return { day: 1, month: 0, year: 2000 };
  const [y, m, d] = dateStr.split('-').map(Number);
  return { day: d || 1, month: (m || 1) - 1, year: y || 2000 };
}

function formatDateISO(day, month, year) {
  const d = String(day).padStart(2, '0');
  const m = String(month + 1).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// Sezione asset casting: passepartout + import predefiniti + accesso cartella suoni
function CastAssetsSection({ projectPath, castConfig, onCastConfigChange }) {
  const [passepartouts, setPassepartouts] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);

  const refreshPassepartouts = useCallback(async () => {
    const r = await window.electronAPI.assetsListPassepartouts(projectPath);
    setPassepartouts(r?.images || []);
  }, [projectPath]);

  useEffect(() => { refreshPassepartouts(); }, [refreshPassepartouts]);

  const handleImportDefaults = async () => {
    setImporting(true);
    setImportStatus(null);
    const r = await window.electronAPI.assetsImportDefaults(projectPath);
    setImporting(false);
    if (r?.error) {
      setImportStatus({ type: 'err', text: r.error });
    } else {
      setImportStatus({ type: 'ok', text: `${r.copied} file copiati, ${r.skipped} già presenti` });
      await refreshPassepartouts();
    }
    setTimeout(() => setImportStatus(null), 4000);
  };

  const handleChoosePasseExternal = async () => {
    const external = await window.electronAPI.selectProjectFile(projectPath, [
      { name: 'Immagini', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }
    ]);
    if (!external) return;
    // Se il file è GIA' dentro _assets/media/passepartout/, usalo direttamente.
    if (external.startsWith('_assets/media/passepartout/')) {
      onCastConfigChange(prev => ({ ...prev, passepartoutFile: external }));
      return;
    }
    // Altrimenti copia in _assets/media/passepartout/
    // selectProjectFile torna path relativo al projectPath
    const sourceAbs = projectPath + '/' + external.replace(/^\/+/, '');
    const r = await window.electronAPI.assetsCopy(projectPath, sourceAbs, 'media/passepartout');
    if (r?.success && r.relativePath) {
      onCastConfigChange(prev => ({ ...prev, passepartoutFile: r.relativePath }));
      await refreshPassepartouts();
    }
  };

  return (
    <>
      {/* Import asset predefiniti */}
      <div style={{
        marginBottom: '16px', padding: '10px 12px',
        border: '1px solid var(--border-subtle)', borderRadius: '6px',
        background: 'var(--bg-main)'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '6px' }}>
          📦 Asset predefiniti
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
          Copia in <code>_assets/</code> del progetto i suoni dei dadi e le immagini di sfondo incluse con l'app.
          I file già presenti non vengono sovrascritti.
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleImportDefaults}
            disabled={importing}
            style={{
              background: 'none', border: '1px solid var(--accent)',
              borderRadius: '4px', padding: '5px 14px',
              color: 'var(--accent)',
              fontSize: '11px', cursor: importing ? 'wait' : 'pointer', fontFamily: 'inherit'
            }}
          >
            {importing ? 'Importazione...' : '📦 Importa asset predefiniti'}
          </button>
          {importStatus && (
            <span style={{
              fontSize: '11px',
              color: importStatus.type === 'ok' ? 'var(--color-success)' : 'var(--color-danger)'
            }}>
              {importStatus.type === 'ok' ? '✓ ' : '✗ '}{importStatus.text}
            </span>
          )}
        </div>
      </div>

      {/* Passepartout */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
          Sfondo passepartout (immagine/GIF mostrata quando il display è vuoto)
        </label>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={castConfig.passepartoutFile || ''}
            onChange={e => onCastConfigChange(prev => ({ ...prev, passepartoutFile: e.target.value }))}
            style={{
              flex: 1, minWidth: '200px', background: 'var(--bg-input)',
              border: '1px solid var(--border-default)', borderRadius: '4px',
              padding: '6px 10px', color: 'var(--text-primary)',
              fontSize: '12px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
            <option value="">— Nessuno sfondo (nero) —</option>
            {passepartouts.map(p => (
              <option key={p} value={p}>{p.replace('_assets/media/passepartout/', '')}</option>
            ))}
          </select>
          <button
            onClick={handleChoosePasseExternal}
            style={{
              background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
              padding: '6px 12px', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer'
            }}
            title="Scegli un'immagine dal progetto — se fuori da _assets/ verrà copiata lì"
          >📁 Aggiungi...</button>
          {castConfig.passepartoutFile && (
            <button
              onClick={() => onCastConfigChange(prev => ({ ...prev, passepartoutFile: '' }))}
              style={{
                background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer'
              }}
            >✕ Rimuovi</button>
          )}
        </div>
      </div>
    </>
  );
}

// Editor regole critico/fallimento per ogni tipo di dado.
// Il GM può attivare/disattivare crit (max=critico) e fail (1=fallimento) per ogni dado
// e personalizzare le etichette mostrate sul display.
function DiceRulesEditor({ castConfig, onCastConfigChange }) {
  const DICE = [4, 6, 8, 10, 12, 20, 100];
  const rules = castConfig?.diceRules || {};

  const updateRule = (sides, patch) => {
    onCastConfigChange(prev => {
      const current = (prev.diceRules || {})[sides] || {};
      const next = {
        critOn: 'none', failOn: 'none',
        critLabel: 'Critico!', failLabel: 'Fallimento',
        ...current,
        ...patch
      };
      // Mutua esclusione: critico e fallimento non possono scattare sullo stesso valore.
      // Se l'utente imposta critOn a un valore già usato da failOn (e non 'none'), azzera failOn.
      // Stesso in senso opposto.
      if (patch.critOn !== undefined && patch.critOn !== 'none' && next.failOn === patch.critOn) {
        next.failOn = 'none';
      }
      if (patch.failOn !== undefined && patch.failOn !== 'none' && next.critOn === patch.failOn) {
        next.critOn = 'none';
      }
      return { ...prev, diceRules: { ...(prev.diceRules || {}), [sides]: next } };
    });
  };

  const cellTd = { padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', verticalAlign: 'middle' };
  const inputBase = {
    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
    borderRadius: '3px', padding: '4px 8px', color: 'var(--text-primary)',
    fontSize: '11px', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box'
  };
  const selectBase = { ...inputBase, cursor: 'pointer' };

  // Converte eventuale vecchio formato (critEnabled/failEnabled) a 'max'/'none' e 'min'/'none' per la UI.
  // NB: uso ?? (nullish) invece di || per preservare stringhe vuote — l'utente deve poter svuotare
  // il campo label senza che si ripopoli automaticamente con "Critico!".
  const normalize = (r) => {
    if (!r) return { critOn: 'none', failOn: 'none', critLabel: '', failLabel: '' };
    return {
      critOn: r.critOn !== undefined ? r.critOn : (r.critEnabled ? 'max' : 'none'),
      failOn: r.failOn !== undefined ? r.failOn : (r.failEnabled ? 'min' : 'none'),
      critLabel: r.critLabel ?? '',
      failLabel: r.failLabel ?? ''
    };
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>
        🎲 Regole critico / fallimento per tipo di dado
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.5 }}>
        Per ogni dado scegli quale valore attiva il critico e quale il fallimento (es. D&D d20: Critico=Massimo, Fallimento=1; Genkai d6: Critico=1, Fallimento=Massimo). Personalizza le etichette mostrate sul display.
      </div>
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-elevated)' }}>
              <th style={{ ...cellTd, textAlign: 'left', fontWeight: '600', color: 'var(--text-tertiary)' }}>Dado</th>
              <th style={{ ...cellTd, textAlign: 'left', fontWeight: '600', color: 'var(--color-success)' }}>Critico quando esce</th>
              <th style={{ ...cellTd, textAlign: 'left', fontWeight: '600', color: 'var(--text-tertiary)' }}>Etichetta critico</th>
              <th style={{ ...cellTd, textAlign: 'left', fontWeight: '600', color: 'var(--color-danger)' }}>Fallimento quando esce</th>
              <th style={{ ...cellTd, textAlign: 'left', fontWeight: '600', color: 'var(--text-tertiary)' }}>Etichetta fallimento</th>
            </tr>
          </thead>
          <tbody>
            {DICE.map(sides => {
              const r = normalize(rules[sides]);
              const critEnabled = r.critOn !== 'none';
              const failEnabled = r.failOn !== 'none';
              return (
                <tr key={sides}>
                  <td style={{ ...cellTd, fontWeight: '600', color: 'var(--accent)' }}>d{sides}</td>
                  <td style={cellTd}>
                    <select
                      value={r.critOn}
                      onChange={e => updateRule(sides, { critOn: e.target.value })}
                      style={selectBase}
                    >
                      <option value="none">Nessuno</option>
                      <option value="max">Massimo ({sides})</option>
                      <option value="min">1</option>
                    </select>
                  </td>
                  <td style={cellTd}>
                    <input
                      type="text"
                      value={r.critLabel}
                      onChange={e => updateRule(sides, { critLabel: e.target.value })}
                      disabled={!critEnabled}
                      placeholder="Critico!"
                      style={{ ...inputBase, opacity: critEnabled ? 1 : 0.4 }}
                    />
                  </td>
                  <td style={cellTd}>
                    <select
                      value={r.failOn}
                      onChange={e => updateRule(sides, { failOn: e.target.value })}
                      style={selectBase}
                    >
                      <option value="none">Nessuno</option>
                      <option value="max">Massimo ({sides})</option>
                      <option value="min">1</option>
                    </select>
                  </td>
                  <td style={cellTd}>
                    <input
                      type="text"
                      value={r.failLabel}
                      onChange={e => updateRule(sides, { failLabel: e.target.value })}
                      disabled={!failEnabled}
                      placeholder="Fallimento"
                      style={{ ...inputBase, opacity: failEnabled ? 1 : 0.4 }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Editor suoni dadi. Scansiona _assets/sounds/ e mostra quanti sample ci sono per categoria
// (single/few/many). Permette anteprima, apertura cartella, volume, sorgente (PC o display).
function DiceSoundsEditor({ castConfig, onCastConfigChange, projectPath }) {
  const [catalog, setCatalog] = useState({ single: [], few: [], many: [] });
  const [previewingKey, setPreviewingKey] = useState(null);
  const audioRef = useRef(null);

  const sounds = castConfig?.sounds || { enabled: true, volume: 0.7, source: 'pc' };

  const refresh = useCallback(async () => {
    const r = await window.electronAPI.assetsListSounds?.(projectPath);
    if (r?.sounds) setCatalog(r.sounds);
  }, [projectPath]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => () => { try { audioRef.current?.pause(); } catch (_) {} }, []);

  const updateSounds = (patch) => {
    onCastConfigChange(prev => ({
      ...prev,
      sounds: { ...(prev.sounds || { enabled: true, volume: 0.7, source: 'pc' }), ...patch }
    }));
  };

  const playSample = async (fileName) => {
    try {
      const url = await window.electronAPI.getFileUrl(projectPath + '/_assets/sounds/' + fileName);
      if (audioRef.current) { try { audioRef.current.pause(); } catch (_) {} }
      const audio = new Audio(url);
      audio.volume = Math.min(1, Math.max(0, sounds.volume ?? 0.7));
      audioRef.current = audio;
      setPreviewingKey(fileName);
      audio.onended = () => {
        // Spegni l'evidenziazione SOLO se questo audio è ancora quello corrente
        if (audioRef.current === audio) setPreviewingKey(null);
      };
      audio.play().catch(() => setPreviewingKey(null));
    } catch (_) {
      setPreviewingKey(null);
    }
  };

  const totalSounds = catalog.single.length + catalog.few.length + catalog.many.length;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '4px' }}>
        🔊 Suoni dadi
      </div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: 1.5 }}>
        I suoni vengono selezionati casualmente in base al numero di dadi lanciati (1 = single, 2-3 = few, 4+ = many). File da inserire in <code>_assets/sounds/</code> con nome <code>single.mp3</code>, <code>single_1.mp3</code>, <code>few.mp3</code>, <code>many.mp3</code>, ecc.
      </div>

      {/* Toggle attivi */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}>
        <input
          type="checkbox"
          checked={sounds.enabled !== false}
          onChange={e => updateSounds({ enabled: e.target.checked })}
          style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: '16px', height: '16px' }}
        />
        Attiva suoni dadi
      </label>

      {/* Sorgente audio */}
      <div style={{ marginBottom: '10px', opacity: sounds.enabled === false ? 0.5 : 1 }}>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Sorgente audio
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { value: 'pc', label: '💻 PC (qui)', desc: 'Suoni dalle casse della macchina GM' },
            { value: 'display', label: '📺 Display', desc: 'Suoni dal dispositivo collegato' }
          ].map(opt => (
            <label
              key={opt.value}
              title={opt.desc}
              style={{
                flex: 1, padding: '6px 10px', borderRadius: '4px',
                border: `1px solid ${sounds.source === opt.value ? 'var(--accent)' : 'var(--border-default)'}`,
                background: sounds.source === opt.value ? 'var(--accent-a08)' : 'transparent',
                cursor: sounds.enabled === false ? 'not-allowed' : 'pointer',
                fontSize: '11px', color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <input
                type="radio"
                name="sound-source"
                value={opt.value}
                checked={sounds.source === opt.value}
                onChange={() => updateSounds({ source: opt.value })}
                disabled={sounds.enabled === false}
                style={{ accentColor: 'var(--accent)' }}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Volume */}
      <div style={{ marginBottom: '12px', opacity: sounds.enabled === false ? 0.5 : 1 }}>
        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
          Volume: <span style={{ color: 'var(--accent)' }}>{Math.round((sounds.volume ?? 0.7) * 100)}%</span>
        </label>
        <input
          type="range" min="0" max="100" step="5"
          value={Math.round((sounds.volume ?? 0.7) * 100)}
          onChange={e => updateSounds({ volume: parseInt(e.target.value, 10) / 100 })}
          disabled={sounds.enabled === false}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
      </div>

      {/* Catalog */}
      <div style={{
        padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: '6px',
        background: 'var(--bg-main)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '600' }}>
            Suoni disponibili: {totalSounds}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={refresh}
              style={{
                background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                padding: '3px 10px', color: 'var(--text-secondary)', fontSize: '10px', cursor: 'pointer'
              }}
            >↻ Aggiorna</button>
            <button
              onClick={() => window.electronAPI.assetsOpenSounds?.(projectPath)}
              style={{
                background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                padding: '3px 10px', color: 'var(--accent)', fontSize: '10px', cursor: 'pointer'
              }}
              title="Apri _assets/sounds/ in Esplora Risorse"
            >📂 Apri cartella</button>
          </div>
        </div>

        {totalSounds === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '8px 0' }}>
            Nessun suono trovato. Importa gli asset predefiniti dal bottone in cima, oppure copia i tuoi file .mp3/.wav/.ogg in <code>_assets/sounds/</code> con nome che inizia per <code>single</code>, <code>few</code> o <code>many</code>.
          </div>
        ) : (
          ['single', 'few', 'many'].map(cat => {
            const files = catalog[cat] || [];
            const catLabel = cat === 'single' ? '1 dado' : cat === 'few' ? '2-3 dadi' : '4+ dadi';
            return (
              <div key={cat} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {cat} ({catLabel}) — {files.length} sample
                </div>
                {files.length === 0 ? (
                  <div style={{ fontSize: '10px', color: 'var(--text-disabled)', fontStyle: 'italic', padding: '2px 0' }}>
                    Nessun file in questa categoria
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {files.map(f => {
                      const active = previewingKey === f;
                      return (
                        <button
                          key={f}
                          onClick={() => playSample(f)}
                          style={{
                            background: active ? 'var(--accent-a08)' : 'none',
                            border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
                            borderRadius: '3px', padding: '3px 8px',
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                            fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit'
                          }}
                          title={'Anteprima ' + f}
                        >
                          {active ? '▶' : '▷'} {f}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RagSettings({ aiConfig, onAiConfigChange }) {
  const rag = aiConfig?.rag || { chunkSize: 500, overlapPercent: 10, topK: 7, contextExpand: 1 };
  const [localRag, setLocalRag] = useState(rag);
  const [ragStats, setRagStats] = useState(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildProgress, setRebuildProgress] = useState(null);

  const needsReindex = localRag.chunkSize !== rag.chunkSize || localRag.overlapPercent !== rag.overlapPercent;

  useEffect(() => {
    window.electronAPI?.ragGetStats?.().then(s => setRagStats(s)).catch(() => {});
    const unsub = window.electronAPI?.onRagProgress?.((p) => {
      setRebuildProgress(p);
      if (p.phase === 'done') {
        setRebuilding(false);
        window.electronAPI?.ragGetStats?.().then(s => setRagStats(s)).catch(() => {});
        setTimeout(() => setRebuildProgress(null), 3000);
      }
    });
    return () => unsub?.();
  }, []);

  const updateField = (key, value) => {
    const next = { ...localRag, [key]: value };
    setLocalRag(next);
    // topK and contextExpand don't need reindex — save immediately
    if (key === 'topK' || key === 'contextExpand') {
      onAiConfigChange(prev => ({ ...prev, rag: { ...(prev.rag || rag), [key]: value } }));
      window.electronAPI?.ragApplyOptions?.({ [key]: value });
    }
  };

  const handleSaveAndReindex = async () => {
    const opts = { ...localRag, chunkOverlap: Math.round(localRag.chunkSize * (localRag.overlapPercent || 10) / 100) };
    onAiConfigChange(prev => ({ ...prev, rag: localRag }));
    await window.electronAPI?.ragApplyOptions?.(opts);
    setRebuilding(true);
    setRebuildProgress({ phase: 'indexing', message: 'Avvio ricostruzione...', progress: 0 });
    window.electronAPI?.ragIndexAll?.().catch(err => {
      console.error('RAG reindex failed:', err);
      setRebuilding(false);
    });
  };

  const inputStyle = {
    padding: '4px 8px', fontSize: '12px', minHeight: '28px',
    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
    borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
    textAlign: 'center', width: '80px'
  };
  const labelSt = { fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '2px', display: 'block' };

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Status */}
      {ragStats && (
        <div style={{ marginBottom: '12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: rebuilding ? 'var(--color-warning)' : ragStats.totalFiles > 0 ? 'var(--color-success)' : 'var(--text-disabled)'
          }} />
          <span style={{ color: 'var(--text-secondary)' }}>
            {rebuilding ? 'Ricostruzione in corso...' : `${ragStats.totalFiles} file, ${ragStats.totalChunks} blocchi (${(ragStats.dbSizeBytes / 1024).toFixed(0)} KB)`}
          </span>
        </div>
      )}

      {/* Progress bar */}
      {rebuildProgress && rebuildProgress.phase === 'indexing' && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-info)', marginBottom: '4px' }}>{rebuildProgress.message}</div>
          <div style={{ height: '3px', borderRadius: '2px', background: 'var(--border-subtle)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '2px', background: 'var(--accent)', width: `${rebuildProgress.progress || 0}%`, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Fields */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div>
          <label style={labelSt}>Dimensione blocco</label>
          <input type="number" min="100" max="2000" step="50" value={localRag.chunkSize}
            onChange={e => updateField('chunkSize', Math.max(100, Math.min(2000, parseInt(e.target.value, 10) || 500)))}
            style={inputStyle} />
          <div style={{ fontSize: '9px', color: 'var(--text-disabled)', marginTop: '2px' }}>caratteri (300-800)</div>
        </div>
        <div>
          <label style={labelSt}>Sovrapposizione</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input type="number" min="0" max="30" step="1" value={localRag.overlapPercent ?? 10}
              onChange={e => updateField('overlapPercent', Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0)))}
              style={inputStyle} />
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>%</span>
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-disabled)', marginTop: '2px' }}>consigliato 10-15%</div>
        </div>
        <div>
          <label style={labelSt}>Risultati per ricerca</label>
          <input type="number" min="1" max="20" value={localRag.topK}
            onChange={e => updateField('topK', Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 7)))}
            style={inputStyle} />
          <div style={{ fontSize: '9px', color: 'var(--text-disabled)', marginTop: '2px' }}>blocchi (5-10)</div>
        </div>
        <div>
          <label style={labelSt}>Espansione contesto</label>
          <select value={localRag.contextExpand ?? 1}
            onChange={e => updateField('contextExpand', parseInt(e.target.value, 10))}
            style={{ ...inputStyle, width: '100px', cursor: 'pointer' }}>
            <option value="0">Nessuna</option>
            <option value="1">±1 blocco</option>
            <option value="2">±2 blocchi</option>
            <option value="3">±3 blocchi</option>
            <option value="4">±4 blocchi</option>
            <option value="5">±5 blocchi</option>
          </select>
          <div style={{ fontSize: '9px', color: 'var(--text-disabled)', marginTop: '2px' }}>blocchi adiacenti</div>
        </div>
      </div>

      {/* Reindex warning + button */}
      {needsReindex && (
        <div style={{ fontSize: '11px', color: 'var(--color-warning)', marginBottom: '8px' }}>
          ⚠ Le modifiche a dimensione blocco o sovrapposizione richiedono la ricostruzione dell'indice.
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={handleSaveAndReindex}
          disabled={rebuilding}
          style={{
            padding: '6px 14px', fontSize: '12px', borderRadius: '4px', cursor: rebuilding ? 'default' : 'pointer',
            border: needsReindex ? 'none' : '1px solid var(--border-default)',
            background: needsReindex ? 'var(--accent)' : 'transparent',
            color: needsReindex ? 'var(--bg-main)' : 'var(--text-secondary)',
            fontWeight: needsReindex ? '600' : '400',
            opacity: rebuilding ? 0.6 : 1
          }}
        >
          {rebuilding ? 'Ricostruzione...' : needsReindex ? '🔄 Ricostruisci indice (richiesto)' : '🔄 Ricostruisci indice'}
        </button>
      </div>

      {/* Auto-index toggle */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={localRag.autoIndex || false}
          onChange={e => {
            const next = { ...localRag, autoIndex: e.target.checked };
            setLocalRag(next);
            onAiConfigChange(prev => ({ ...prev, rag: { ...(prev.rag || rag), autoIndex: e.target.checked } }));
          }}
          style={{ accentColor: 'var(--accent)' }}
        />
        Indicizza automaticamente all'apertura del progetto
      </label>
    </div>
  );
}

export default function SettingsPanel({
  projectPath, defaultProjectName,
  settings, onSettingsChange,
  players, onPlayersChange,
  telegram, onTelegramChange,
  botStatus, onStartBot, onStopBot, onDisconnectAllPlayers,
  referenceManuals, onReferenceChange,
  onClose,
  onResetGameDate,
  highlightKeywords, onHighlightChange,
  onOpenInfo,
  onExportAdventure, onOpenAdventures,
  onResetAllRelations,
  aiConfig, onAiConfigChange, onClearAiHistory,
  castConfig = { passepartoutFile: '', fit: 'contain' }, onCastConfigChange,
  panelVisibility, onPanelVisibilityChange,
  layoutPresets, onLayoutPresetsChange,
  initialSection,
  librariesData,
  notes, onNotesChange,
  checklist, onChecklistChange,
  calendarData, onCalendarChange
}) {
  const [showToken, setShowToken] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [wizardToken, setWizardToken] = useState('');
  const [aiVerifying, setAiVerifying] = useState(false);
  const [aiVerifyResult, setAiVerifyResult] = useState(null);
  const [aiQuota, setAiQuota] = useState(null);
  const [showAiKey, setShowAiKey] = useState(false);
  const [showImageKey, setShowImageKey] = useState(false);
  const [imageKeyVerifying, setImageKeyVerifying] = useState(false);
  const [imageKeyVerifyResult, setImageKeyVerifyResult] = useState(null);
  const [confirmClearAi, setConfirmClearAi] = useState(false);
  const confirmClearAiTimer = useRef(null);
  // Firebase auth state
  const [fbUser, setFbUser] = useState(null);
  const fbLoaded = useRef(false);
  const [currentTheme, setCurrentTheme] = useState(getStoredThemeId);
  const [fontScale, setFontScale] = useState(getStoredFontScale);
  const [newWord, setNewWord] = useState('');
  const [bulkWords, setBulkWords] = useState('');
  const [confirmClearWords, setConfirmClearWords] = useState(false);
  const confirmWordsTimer = useRef(null);
  const [confirmResetRelations, setConfirmResetRelations] = useState(false);
  const confirmRelationsTimer = useRef(null);
  const [section, setSection] = useState(initialSection || 'aspetto');
  const [presetName, setPresetName] = useState('');
  const [confirmDeletePreset, setConfirmDeletePreset] = useState(null);
  const [confirmRemovePlayer, setConfirmRemovePlayer] = useState(null);
  const confirmRemovePlayerTimer = useRef(null);
  const [confirmResetToken, setConfirmResetToken] = useState(false);
  const confirmResetTokenTimer = useRef(null);
  const [confirmRemoveManual, setConfirmRemoveManual] = useState(null);
  const confirmRemoveManualTimer = useRef(null);
  const confirmDeletePresetTimer = useRef(null);

  // Load Firebase user on mount
  useEffect(() => {
    if (fbLoaded.current) return;
    fbLoaded.current = true;
    (async () => {
      let u = await window.electronAPI?.firebaseGetUser?.();
      if (!u) u = await window.electronAPI?.firebaseAutoLogin?.();
      if (u) setFbUser(u);
    })();
  }, []);

  const handleFbLogout = async () => {
    await window.electronAPI?.firebaseLogout?.();
    setFbUser(null);
  };

  const updateSetting = (key, value) => {
    onSettingsChange(prev => ({ ...prev, [key]: value }));
  };

  const date = parseDate(settings.startDate);

  const updateDate = (field, value) => {
    const d = { ...date, [field]: value };
    updateSetting('startDate', formatDateISO(d.day, d.month, d.year));
  };

  const addPlayer = () => {
    onPlayersChange(prev => [...prev, {
      id: crypto.randomUUID(),
      characterName: '',
      playerName: '',
      note: '',
      characterSheet: '',
      telegramChatId: '',
      aiDocuments: []
    }]);
  };

  const updatePlayer = (id, key, value) => {
    onPlayersChange(prev => prev.map(p => p.id === id ? { ...p, [key]: value } : p));
  };

  const removePlayer = (id) => {
    if (confirmRemovePlayer !== id) {
      setConfirmRemovePlayer(id);
      if (confirmRemovePlayerTimer.current) clearTimeout(confirmRemovePlayerTimer.current);
      confirmRemovePlayerTimer.current = setTimeout(() => setConfirmRemovePlayer(prev => prev === id ? null : prev), 3000);
      return;
    }
    setConfirmRemovePlayer(null);
    if (confirmRemovePlayerTimer.current) clearTimeout(confirmRemovePlayerTimer.current);
    onPlayersChange(prev => prev.filter(p => p.id !== id));
  };

  const selectSheet = async (playerId) => {
    const result = await window.electronAPI.selectProjectFile(projectPath);
    if (result) updatePlayer(playerId, 'characterSheet', result);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--overlay-medium)',
        zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '80%', maxWidth: '800px',
          height: '80vh',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: 'var(--bg-elevated)'
        }}>
          <span style={{
            fontSize: '14px', fontWeight: '600',
            color: 'var(--accent)', letterSpacing: '1px'
          }}>
            Impostazioni
          </span>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '16px' }}>✕</span>
        </div>

        {/* Two-column layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left nav */}
          <div style={{
            width: '180px', flexShrink: 0, borderRight: '1px solid var(--border-default)',
            background: 'var(--bg-main)', overflowY: 'auto', padding: '8px 0'
          }}>
            {[
              { id: 'aspetto', icon: '🎨', label: 'Aspetto' },
              { id: 'progetto', icon: '📋', label: 'Progetto' },
              { id: 'pg', icon: '👥', label: 'Personaggi' },
              { id: 'telegram', icon: '📱', label: 'Telegram' },
              { id: 'ai', icon: '🤖', label: 'Assistente AI' },
              { id: 'aidocs', icon: '📄', label: 'Documenti AI' },
              { id: 'account', icon: '👤', label: 'Account' },
              { id: 'parole', icon: '🔆', label: 'Parole evidenziate' },
              { id: 'manuali', icon: '📖', label: 'Manuali' },
              { id: 'casting', icon: '📡', label: 'Casting' },
              { id: 'importexport', icon: '📦', label: 'Importa/Esporta' },
              { id: 'layout', icon: '🖥️', label: 'Layout' },
            ].map(item => (
              <div
                key={item.id}
                onClick={() => setSection(item.id)}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: section === item.id ? 'var(--accent)' : 'var(--text-secondary)',
                  background: section === item.id ? 'var(--accent-a10)' : 'transparent',
                  borderRight: section === item.id ? '2px solid var(--accent)' : '2px solid transparent',
                  fontWeight: section === item.id ? '600' : '400',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (section !== item.id) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { if (section !== item.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '13px' }}>{item.icon}</span>
                {item.label}
              </div>
            ))}

            {/* Info link at bottom */}
            {onOpenInfo && (
              <div
                onClick={() => { onClose(); onOpenInfo(); }}
                style={{
                  padding: '8px 16px', marginTop: '8px',
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: '12px',
                  cursor: 'pointer', fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
              >
                <span style={{ fontSize: '13px' }}>ℹ️</span>
                Informazioni
              </div>
            )}
          </div>

          {/* Right content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

          {section === 'aspetto' && (<>
          {/* === ASPETTO === */}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Tema</label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              marginBottom: '8px'
            }}>
              {THEME_LIST.map(t => {
                const theme = THEMES[t.id];
                const isActive = t.id === currentTheme;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      applyTheme(t.id);
                      saveThemeId(t.id);
                      setCurrentTheme(t.id);
                    }}
                    style={{
                      cursor: 'pointer',
                      border: isActive ? '2px solid var(--accent)' : '1px solid var(--border-default)',
                      borderRadius: '6px',
                      padding: isActive ? '7px' : '8px',
                      background: 'var(--bg-main)',
                      transition: 'all 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {/* Color swatches */}
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '3px', background: theme['--bg-main'], border: '1px solid ' + theme['--border-default'] }} />
                      <div style={{ width: '18px', height: '18px', borderRadius: '3px', background: theme['--accent'] }} />
                      <div style={{ width: '18px', height: '18px', borderRadius: '3px', background: theme['--text-primary'], opacity: 0.8 }} />
                    </div>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: isActive ? '600' : '400',
                      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      textAlign: 'center',
                      lineHeight: '1.2'
                    }}>
                      {t.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={labelStyle}>
              Scala caratteri: {fontScale.toFixed(1)}x
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>A</span>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.1"
                value={fontScale}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  setFontScale(v);
                  applyFontScale(v);
                  saveFontScale(v);
                }}
                style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: '16px', color: 'var(--text-tertiary)' }}>A</span>
            </div>
          </div>

          </>)}

          {section === 'parole' && (<>
          {/* === PAROLE EVIDENZIATE === */}
          <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Parole evidenziate</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '400', textTransform: 'none', letterSpacing: '0' }}>
              <span style={{ color: highlightKeywords?.enabled ? 'var(--color-success)' : 'var(--text-disabled)' }}>
                {highlightKeywords?.enabled ? 'ON' : 'OFF'}
              </span>
              <span
                onClick={() => onHighlightChange(prev => ({ ...prev, enabled: !prev.enabled }))}
                style={{
                  width: '32px', height: '16px', borderRadius: '8px',
                  background: highlightKeywords?.enabled ? 'var(--accent)' : 'var(--border-default)',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                  display: 'inline-block', flexShrink: 0
                }}
              >
                <span style={{
                  width: '12px', height: '12px', borderRadius: '50%',
                  background: 'var(--text-bright)',
                  position: 'absolute', top: '2px',
                  left: highlightKeywords?.enabled ? '18px' : '2px',
                  transition: 'left 0.2s'
                }} />
              </span>
            </label>
          </div>

          {/* Default color + palette */}
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Colore predefinito</label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {HIGHLIGHT_PALETTE.map(c => (
                <span
                  key={c}
                  onClick={() => onHighlightChange(prev => ({ ...prev, defaultColor: c }))}
                  style={{
                    width: '22px', height: '22px', borderRadius: '3px',
                    background: c, cursor: 'pointer',
                    border: highlightKeywords?.defaultColor === c ? '2px solid var(--accent)' : '1px solid var(--border-default)',
                    transition: 'border 0.15s'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Word list */}
          {(highlightKeywords?.words || []).length > 0 && (
            <div style={{
              border: '1px solid var(--border-default)', borderRadius: '4px',
              marginBottom: '12px', maxHeight: '200px', overflowY: 'auto'
            }}>
              {highlightKeywords.words.map((w, idx) => (
                <div key={idx} style={{
                  padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '8px',
                  borderBottom: idx < highlightKeywords.words.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                }}>
                  <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-primary)' }}>{w.text}</span>
                  {/* Color picker swatch */}
                  <span style={{ position: 'relative', flexShrink: 0 }}>
                    <input
                      type="color"
                      value={rgbaToHex(w.color)}
                      onChange={e => {
                        const hex = e.target.value;
                        const rgba = hexToRgba(hex, 0.3);
                        onHighlightChange(prev => ({
                          ...prev,
                          words: prev.words.map((ww, i) => i === idx ? { ...ww, color: rgba } : ww)
                        }));
                      }}
                      style={{
                        width: '18px', height: '18px', border: 'none', padding: 0,
                        cursor: 'pointer', background: 'transparent'
                      }}
                      title="Cambia colore"
                    />
                    <span style={{
                      position: 'absolute', inset: 0, pointerEvents: 'none',
                      background: w.color, borderRadius: '2px', border: '1px solid var(--border-default)'
                    }} />
                  </span>
                  {/* Quick color palette */}
                  {HIGHLIGHT_PALETTE.map(c => (
                    <span
                      key={c}
                      onClick={() => onHighlightChange(prev => ({
                        ...prev,
                        words: prev.words.map((ww, i) => i === idx ? { ...ww, color: c } : ww)
                      }))}
                      style={{
                        width: '12px', height: '12px', borderRadius: '2px',
                        background: c, cursor: 'pointer', flexShrink: 0,
                        border: w.color === c ? '1px solid var(--accent)' : '1px solid transparent'
                      }}
                    />
                  ))}
                  <span
                    className="close-btn"
                    onClick={() => onHighlightChange(prev => ({
                      ...prev,
                      words: prev.words.filter((_, i) => i !== idx)
                    }))}
                    style={{ fontSize: '12px', flexShrink: 0 }}
                  >✕</span>
                </div>
              ))}
            </div>
          )}

          {/* Add single word */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const w = newWord.trim();
                  if (!w) return;
                  onHighlightChange(prev => {
                    if (prev.words.some(ww => ww.text.toLowerCase() === w.toLowerCase())) return prev;
                    return { ...prev, words: [...prev.words, { text: w, color: prev.defaultColor }] };
                  });
                  setNewWord('');
                }
              }}
              placeholder="Aggiungi parola..."
              style={{ ...inputStyle, flex: 1 }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            />
          </div>

          {/* Bulk add */}
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Aggiunta rapida (una parola per riga)</label>
            <textarea
              value={bulkWords}
              onChange={e => setBulkWords(e.target.value)}
              rows={3}
              style={{
                ...inputStyle, resize: 'none', fontFamily: 'inherit',
                lineHeight: '1.5', marginBottom: '6px'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  const lines = bulkWords.split('\n').map(l => l.trim()).filter(Boolean);
                  if (lines.length === 0) return;
                  onHighlightChange(prev => {
                    const existing = new Set(prev.words.map(w => w.text.toLowerCase()));
                    const newWords = lines.filter(l => !existing.has(l.toLowerCase()))
                      .map(text => ({ text, color: prev.defaultColor }));
                    return { ...prev, words: [...prev.words, ...newWords] };
                  });
                  setBulkWords('');
                }}
                disabled={!bulkWords.trim()}
                style={{
                  background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                  padding: '4px 12px', color: bulkWords.trim() ? 'var(--accent)' : 'var(--text-disabled)',
                  fontSize: '11px', cursor: bulkWords.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s'
                }}
              >
                Aggiungi tutte
              </button>
              {(highlightKeywords?.words || []).length > 0 && (
                <button
                  onClick={() => {
                    if (confirmClearWords) {
                      onHighlightChange(prev => ({ ...prev, words: [] }));
                      setConfirmClearWords(false);
                      clearTimeout(confirmWordsTimer.current);
                    } else {
                      setConfirmClearWords(true);
                      if (confirmWordsTimer.current) clearTimeout(confirmWordsTimer.current);
                      confirmWordsTimer.current = setTimeout(() => setConfirmClearWords(false), 3000);
                    }
                  }}
                  style={{
                    background: 'none', border: '1px solid var(--color-danger-bg)', borderRadius: '4px',
                    padding: '4px 12px', color: 'var(--color-danger)',
                    fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {confirmClearWords ? 'Sicuro?' : 'Svuota tutto'}
                </button>
              )}
            </div>
          </div>

          </>)}

          {section === 'progetto' && (<>
          {/* === PROGETTO === */}
          <div style={sectionStyle}>Progetto</div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Nome progetto</label>
            <input
              type="text"
              value={settings.projectName || ''}
              placeholder={defaultProjectName}
              onChange={e => updateSetting('projectName', e.target.value)}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Data iniziale del gioco</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="1" max="31"
                value={date.day}
                onChange={e => updateDate('day', parseInt(e.target.value) || 1)}
                style={{ ...inputStyle, width: '70px', textAlign: 'center' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              />
              <select
                value={date.month}
                onChange={e => updateDate('month', parseInt(e.target.value))}
                style={{
                  ...inputStyle, width: '150px', cursor: 'pointer',
                  appearance: 'auto'
                }}
              >
                {MONTHS_IT.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
              <input
                type="number"
                value={date.year}
                onChange={e => updateDate('year', parseInt(e.target.value) || 2000)}
                style={{ ...inputStyle, width: '90px', textAlign: 'center' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              />
              {onResetGameDate && (
                <button
                  onClick={onResetGameDate}
                  title="Riporta la data del gioco alla data iniziale configurata"
                  style={{
                    background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                    padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
                    whiteSpace: 'nowrap', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  🔄 Reimposta data gioco
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Tipo calendario</label>
            <select disabled style={{ ...inputStyle, width: '200px', cursor: 'not-allowed', opacity: 0.5 }}>
              <option>Gregoriano</option>
            </select>
          </div>

          {/* Hidden extensions */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Estensioni nascoste nell'Explorer</label>
            <input
              type="text"
              value={settings.hiddenExtensions ?? '.json, .yml, .yaml, .git, .gitignore, .DS_Store, .thumbs.db, .ini, .cfg, .log, .bak, .tmp, .swp, .lock'}
              onChange={e => updateSetting('hiddenExtensions', e.target.value)}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              placeholder=".json, .yml, .bak, .tmp"
            />
            <div style={{ fontSize: '10px', color: 'var(--text-disabled)', marginTop: '4px' }}>
              Separate da virgola. Cartelle con punto e file con _ sono sempre nascosti.
            </div>
          </div>

          {/* Relations file */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>File relazioni PNG ↔ PG</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {settings.relationsFile ? (
                <>
                  <span style={{ ...inputStyle, flex: 1, padding: '7px 10px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {settings.relationsFile}
                  </span>
                  <span className="close-btn" onClick={() => updateSetting('relationsFile', '')} style={{ fontSize: '12px' }} title="Rimuovi">✕</span>
                </>
              ) : (
                <button
                  onClick={async () => {
                    const rel = await window.electronAPI.selectProjectFile(projectPath, [
                      { name: 'Relazioni', extensions: ['md', 'txt'] }
                    ]);
                    if (rel) updateSetting('relationsFile', rel);
                  }}
                  style={{
                    background: 'none', border: '1px solid var(--accent)', borderRadius: '4px',
                    padding: '6px 14px', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer',
                    fontWeight: '600', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-a10)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  Sfoglia...
                </button>
              )}
            </div>
            {settings.relationsFile && onResetAllRelations && (
              <button
                onClick={() => {
                  if (confirmResetRelations) {
                    onResetAllRelations();
                    setConfirmResetRelations(false);
                    if (confirmRelationsTimer.current) clearTimeout(confirmRelationsTimer.current);
                  } else {
                    setConfirmResetRelations(true);
                    confirmRelationsTimer.current = setTimeout(() => setConfirmResetRelations(false), 3000);
                  }
                }}
                style={{
                  background: 'none',
                  border: `1px solid ${confirmResetRelations ? 'var(--color-warning)' : 'var(--border-default)'}`,
                  borderRadius: '4px',
                  padding: '4px 12px',
                  color: confirmResetRelations ? 'var(--color-warning)' : 'var(--text-secondary)',
                  fontSize: '11px', cursor: 'pointer',
                  marginTop: '6px', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (!confirmResetRelations) { e.currentTarget.style.borderColor = 'var(--color-warning)'; e.currentTarget.style.color = 'var(--color-warning)'; } }}
                onMouseLeave={e => { if (!confirmResetRelations) { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
              >
                {confirmResetRelations ? 'Sicuro?' : 'Reset tutte le relazioni'}
              </button>
            )}
          </div>

          {/* Adventure metadata fields */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Autore</label>
            <input
              type="text"
              value={settings.author || ''}
              placeholder="es. Claudio Bartolini"
              onChange={e => updateSetting('author', e.target.value)}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Sistema di gioco</label>
            {librariesData?.gameSystems?.length > 1 ? (
              <select
                value={settings.system || ''}
                onChange={e => updateSetting('system', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">— Nessuno —</option>
                {librariesData.gameSystems.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={settings.system || ''}
                placeholder="es. D&D, Vampiri, SWADE..."
                onChange={e => updateSetting('system', e.target.value)}
                style={inputStyle}
              />
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Descrizione avventura</label>
            <textarea
              value={settings.description || ''}
              placeholder="Breve descrizione dell'avventura..."
              onChange={e => updateSetting('description', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Versione avventura</label>
              <input
                type="text"
                value={settings.adventureVersion || ''}
                placeholder="es. 1.0"
                onChange={e => updateSetting('adventureVersion', e.target.value)}
                style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Giocatori</label>
              <input
                type="text"
                value={settings.players || ''}
                placeholder="es. 3-5"
                onChange={e => updateSetting('players', e.target.value)}
                style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Durata</label>
              <input
                type="text"
                value={settings.duration || ''}
                placeholder="es. 60-90 min"
                onChange={e => updateSetting('duration', e.target.value)}
                style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Lingua</label>
              <select
                value={settings.language || 'it'}
                onChange={e => updateSetting('language', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' }}
              >
                <option value="it">Italiano</option>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Tag (separati da virgola)</label>
              <input
                type="text"
                value={settings.tags || ''}
                placeholder="es. investigativo, giappone, horror"
                onChange={e => updateSetting('tags', e.target.value)}
                style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              />
            </div>
          </div>

          {/* Export excludes */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Escludi dall'export</label>
            <textarea
              value={settings.exportExcludes || ''}
              placeholder={".git/\nnode_modules/\n.DS_Store\nThumbs.db\n.claude/\nCLAUDE.md\n*.bak\n*.tmp\n*.log\n*.swp"}
              onChange={e => updateSetting('exportExcludes', e.target.value)}
              rows={6}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', lineHeight: '1.5' }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-disabled)' }}>
                Un pattern per riga. Usa *.ext per estensioni, nome/ per cartelle.
              </div>
              <button
                onClick={() => updateSetting('exportExcludes', '.git/\nnode_modules/\n.DS_Store\nThumbs.db\n.claude/\nCLAUDE.md\n*.bak\n*.tmp\n*.log\n*.swp')}
                style={{
                  background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                  padding: '2px 8px', color: 'var(--text-disabled)', fontSize: '10px',
                  cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-disabled)'; }}
              >
                Ripristina default
              </button>
            </div>
          </div>

          {/* Adventure action buttons */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '32px' }}>
            {onExportAdventure && (
              <button
                onClick={() => { onClose(); onExportAdventure(); }}
                style={{
                  background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                  padding: '6px 14px', color: 'var(--text-secondary)', fontSize: '12px',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                📦 Esporta avventura
              </button>
            )}
            {onOpenAdventures && (
              <button
                onClick={() => { onClose(); onOpenAdventures(); }}
                style={{
                  background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                  padding: '6px 14px', color: 'var(--text-secondary)', fontSize: '12px',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                📤 Pubblica su catalogo online
              </button>
            )}
          </div>

          </>)}

          {section === 'pg' && (<>
          {/* === PERSONAGGI GIOCANTI === */}
          <div style={sectionStyle}>Personaggi Giocanti (PG)</div>

          <button
            onClick={addPlayer}
            style={{
              background: 'none',
              border: '1px solid var(--border-default)',
              borderRadius: '4px',
              padding: '6px 16px',
              color: 'var(--accent)',
              fontSize: '13px',
              cursor: 'pointer',
              marginBottom: '16px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'none'; }}
          >
            ➕ Aggiungi PG
          </button>

          {players.length === 0 && (
            <div style={{ color: 'var(--text-disabled)', fontSize: '13px', fontStyle: 'italic', marginBottom: '16px' }}>
              Nessun personaggio configurato
            </div>
          )}

          {players.map((pg, idx) => (
            <div key={pg.id} style={{
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '12px',
              background: 'var(--bg-main)'
            }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Nome personaggio</label>
                  <input
                    type="text"
                    value={pg.characterName}
                    placeholder="es. Ispettore Kimura"
                    onChange={e => updatePlayer(pg.id, 'characterName', e.target.value)}
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Nome giocatore</label>
                  <input
                    type="text"
                    value={pg.playerName}
                    placeholder="es. Marco"
                    onChange={e => updatePlayer(pg.id, 'playerName', e.target.value)}
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Nota</label>
                <input
                  type="text"
                  value={pg.note}
                  placeholder="es. Specialista in interrogatori, ex militare"
                  onChange={e => updatePlayer(pg.id, 'note', e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Scheda personaggio</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => selectSheet(pg.id)}
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                    >
                      Sfoglia...
                    </button>
                    <span style={{
                      fontSize: '12px',
                      color: pg.characterSheet ? 'var(--text-primary)' : 'var(--text-disabled)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {pg.characterSheet || 'Nessun file selezionato'}
                    </span>
                    {pg.characterSheet && (
                      <span className="close-btn" onClick={() => updatePlayer(pg.id, 'characterSheet', '')}
                        style={{ fontSize: '12px', flexShrink: 0 }}>✕</span>
                    )}
                  </div>
                </div>
                <div style={{ width: '180px', flexShrink: 0 }}>
                  <label style={labelStyle}>Telegram Chat ID</label>
                  <input
                    type="text"
                    value={pg.telegramChatId}
                    placeholder="ID numerico"
                    onChange={e => updatePlayer(pg.id, 'telegramChatId', e.target.value)}
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={() => removePlayer(pg.id)}
                  style={{
                    background: 'none',
                    border: '1px solid var(--color-danger-bg)',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    color: 'var(--color-danger)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-bg)'; e.currentTarget.style.borderColor = 'var(--color-danger)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--color-danger-bg)'; }}
                >
                  {confirmRemovePlayer === pg.id ? 'Sicuro?' : 'Rimuovi'}
                </button>
              </div>
            </div>
          ))}

          </>)}

          {section === 'telegram' && (<>
          {/* === TELEGRAM === */}
          <div style={sectionStyle}>Telegram</div>

          {!telegram.botToken ? (
            /* === WIZARD === */
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)', marginBottom: '12px' }}>
                📱 Configurazione Telegram — Prima volta
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '16px' }}>
                Per ricevere e inviare messaggi ai giocatori serve un bot Telegram.<br />
                Crearlo richiede 2 minuti:<br /><br />
                1. Apri Telegram e cerca <span style={{ color: 'var(--accent)' }}>@BotFather</span><br />
                2. Scrivi <span style={{ color: 'var(--accent)' }}>/newbot</span><br />
                3. Scegli un nome per il bot (es. "GENKAI Dashboard")<br />
                4. Scegli un username che finisca con "bot"<br />
                5. BotFather ti darà un token — copialo qui sotto
              </div>
              <input
                type="text"
                value={wizardToken}
                onChange={e => { setWizardToken(e.target.value); setVerifyError(null); }}
                placeholder="Incolla il token qui"
                style={{ ...inputStyle, marginBottom: '12px' }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              />
              {verifyError && <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginBottom: '8px' }}>{verifyError}</div>}
              <button
                disabled={!wizardToken.trim() || verifying}
                onClick={async () => {
                  setVerifying(true); setVerifyError(null);
                  try {
                    const result = await window.electronAPI.telegramVerifyToken(wizardToken.trim());
                    setVerifying(false);
                    if (result.success) {
                      const code = String(Math.floor(100000 + Math.random() * 900000));
                      onTelegramChange(prev => ({ ...prev, botToken: wizardToken.trim(), configured: true, sessionCode: code, botInfo: result.botInfo }));
                      setWizardToken('');
                    } else {
                      setVerifyError(result.error || 'Errore sconosciuto');
                    }
                  } catch (err) {
                    setVerifying(false);
                    setVerifyError(err.message || 'Errore di comunicazione');
                  }
                }}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '4px',
                  padding: '8px 20px', color: wizardToken.trim() ? 'var(--accent)' : 'var(--text-disabled)',
                  fontSize: '13px', cursor: wizardToken.trim() && !verifying ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                {verifying ? 'Verifica in corso...' : '✅ Verifica e salva'}
              </button>
            </div>
          ) : (
            /* === CONFIGURED === */
            <>
              {/* Token row */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Bot Token</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={telegram.botToken}
                    onChange={e => onTelegramChange(prev => ({ ...prev, botToken: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  />
                  <span onClick={() => setShowToken(v => !v)} style={{ cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)', flexShrink: 0, userSelect: 'none' }} title={showToken ? 'Nascondi' : 'Mostra'}>
                    {showToken ? '🙈' : '👁'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-success)', flexShrink: 0 }}>✅ Configurato</span>
                </div>
                {telegram.botInfo && (
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    Bot: @{telegram.botInfo.username} — {telegram.botInfo.firstName}
                  </div>
                )}
              </div>

              {/* Session code */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Codice Sessione</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent)', letterSpacing: '3px', fontFamily: 'monospace' }}>
                    {telegram.sessionCode || '------'}
                  </span>
                  <button
                    onClick={() => {
                      let code;
                      do { code = String(Math.floor(100000 + Math.random() * 900000)); } while (code === telegram.sessionCode);
                      onTelegramChange(prev => ({ ...prev, sessionCode: code }));
                    }}
                    style={{
                      background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                      padding: '4px 10px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    🔄 Genera nuovo
                  </button>
                </div>
              </div>

              {/* Bot status + start/stop */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Stato Bot</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: botStatus?.running ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                    {botStatus?.running
                      ? `🟢 Attiva — ${players.filter(p => p.telegramChatId).length} giocatori connessi`
                      : '🔴 Non attiva'}
                  </span>
                  {botStatus?.running ? (
                    <button onClick={onStopBot} style={{
                      background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                      padding: '4px 12px', color: 'var(--color-danger)', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-danger)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                    >⏹ Ferma bot</button>
                  ) : (
                    <button onClick={onStartBot} disabled={!telegram.sessionCode} style={{
                      background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                      padding: '4px 12px', color: telegram.sessionCode ? 'var(--color-success)' : 'var(--text-disabled)',
                      fontSize: '11px', cursor: telegram.sessionCode ? 'pointer' : 'not-allowed', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { if (telegram.sessionCode) e.currentTarget.style.borderColor = 'var(--color-success)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                    >▶ Avvia bot</button>
                  )}
                </div>
                {botStatus?.error && <div style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '4px' }}>{botStatus.error}</div>}
              </div>

              {/* Connected players */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Giocatori connessi</label>
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '10px 14px' }}>
                  {players.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>Nessun PG configurato</div>
                  ) : (
                    players.map(pg => (
                      <div key={pg.id} style={{ fontSize: '12px', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '8px' }}>{pg.telegramChatId ? '🟢' : '🟣'}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{pg.characterName || 'Senza nome'}</span>
                        {pg.playerName && <span style={{ color: 'var(--text-tertiary)' }}>— {pg.playerName}</span>}
                        {pg.telegramChatId && <span style={{ color: 'var(--text-disabled)', fontSize: '10px' }}>(Chat ID: {pg.telegramChatId})</span>}
                        {pg.telegramChatId && (
                          <span
                            onClick={() => updatePlayer(pg.id, 'telegramChatId', '')}
                            style={{
                              fontSize: '10px', color: 'var(--text-tertiary)', cursor: 'pointer',
                              transition: 'color 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                          >
                            Disconnetti
                          </span>
                        )}
                        {!pg.telegramChatId && <span style={{ color: 'var(--text-disabled)', fontSize: '10px', fontStyle: 'italic' }}>(in attesa)</span>}
                      </div>
                    ))
                  )}
                </div>
                {players.some(p => p.telegramChatId) && (
                  <button onClick={onDisconnectAllPlayers} style={{
                    background: 'none', border: '1px solid var(--color-danger-bg)', borderRadius: '4px',
                    padding: '4px 12px', color: 'var(--color-danger)', fontSize: '11px', cursor: 'pointer',
                    marginTop: '8px', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-bg)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  >Disconnetti tutti i giocatori</button>
                )}
              </div>

              {/* QR Code + Link per connessione rapida */}
              {telegram.botInfo?.username && telegram.sessionCode && (
                <TelegramQRPanel
                  botUsername={telegram.botInfo.username}
                  sessionCode={telegram.sessionCode}
                />
              )}
              {(!telegram.botInfo?.username || !telegram.sessionCode) && (
                <div style={{
                  padding: '10px 14px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
                  borderRadius: '4px', fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.5'
                }}>
                  Configura il bot e genera un codice sessione per mostrare il QR code ai giocatori.
                </div>
              )}

              {/* Reset token */}
              <button onClick={() => {
                if (!confirmResetToken) {
                  setConfirmResetToken(true);
                  if (confirmResetTokenTimer.current) clearTimeout(confirmResetTokenTimer.current);
                  confirmResetTokenTimer.current = setTimeout(() => setConfirmResetToken(false), 3000);
                  return;
                }
                setConfirmResetToken(false);
                if (confirmResetTokenTimer.current) clearTimeout(confirmResetTokenTimer.current);
                if (botStatus?.running) onStopBot();
                onTelegramChange({ botToken: '', configured: false, sessionCode: '', botActive: false, botInfo: null });
              }} style={{
                background: 'none', border: 'none', padding: '8px 0',
                color: confirmResetToken ? 'var(--color-danger)' : 'var(--text-disabled)',
                fontSize: '11px', cursor: 'pointer', marginTop: '8px'
              }}
              onMouseEnter={e => { if (!confirmResetToken) e.currentTarget.style.color = 'var(--color-danger)'; }}
              onMouseLeave={e => { if (!confirmResetToken) e.currentTarget.style.color = 'var(--text-disabled)'; }}
              >{confirmResetToken ? 'Sicuro? Clicca di nuovo' : '🗑️ Rimuovi token e riconfigura'}</button>
            </>
          )}

          </>)}

          {section === 'ai' && (<>
          {/* === ASSISTENTE AI === */}
          <div style={sectionStyle}>Assistente AI</div>

          {/* Provider */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Provider</label>
            <select
              value={aiConfig?.provider || ''}
              onChange={e => {
                const prov = e.target.value;
                const defaultModel = prov === 'anthropic' ? 'claude-sonnet-4-6' : prov === 'openai' ? 'gpt-5-mini' : '';
                onAiConfigChange(prev => ({ ...prev, provider: prov, model: defaultModel }));
                setAiVerifyResult(null);
              }}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">— Seleziona provider —</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="grok" disabled>Grok (xAI) — in arrivo</option>
              <option value="groq" disabled>Groq — in arrivo</option>
              <option value="gemini" disabled>Gemini (Google) — in arrivo</option>
            </select>
          </div>

          {/* API Key */}
          {aiConfig?.provider && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>API Key (opzionale)</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type={showAiKey ? 'text' : 'password'}
                  value={aiConfig?.apiKey || ''}
                  onChange={e => { onAiConfigChange(prev => ({ ...prev, apiKey: e.target.value })); setAiVerifyResult(null); }}
                  placeholder={`Inserisci la tua ${aiConfig.provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key`}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => setShowAiKey(v => !v)}
                  style={{
                    background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                    padding: '0 10px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer'
                  }}
                >{showAiKey ? '🙈' : '👁️'}</button>
                <button
                  onClick={async () => {
                    if (!aiConfig.apiKey) return;
                    setAiVerifying(true);
                    setAiVerifyResult(null);
                    const result = await window.electronAPI.aiVerifyKey(aiConfig.provider, aiConfig.apiKey);
                    setAiVerifying(false);
                    if (result.success) {
                      setAiVerifyResult({ ok: true });
                      onAiConfigChange(prev => ({ ...prev, configured: true }));
                    } else {
                      setAiVerifyResult({ ok: false, error: result.error });
                    }
                  }}
                  disabled={!aiConfig.apiKey || aiVerifying}
                  style={{
                    background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                    padding: '0 12px', color: aiConfig.apiKey && !aiVerifying ? 'var(--accent)' : 'var(--text-disabled)',
                    fontSize: '11px', cursor: aiConfig.apiKey && !aiVerifying ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s', flexShrink: 0
                  }}
                >{aiVerifying ? '...' : 'Verifica'}</button>
              </div>
              {aiVerifyResult && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: aiVerifyResult.ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {aiVerifyResult.ok ? '✅ Chiave valida' : `❌ ${aiVerifyResult.error}`}
                </div>
              )}
              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                Senza chiave API hai circa 250 domande gratuite incluse (richiede login). Esaurite quelle, inserisci la tua chiave per uso illimitato.
                {!aiConfig.apiKey && (
                  <button
                    onClick={async () => {
                      const q = await window.electronAPI.aiGetQuota();
                      if (q && !q.error) setAiQuota(q);
                    }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11px',
                      cursor: 'pointer', textDecoration: 'underline', marginLeft: '4px'
                    }}
                  >Verifica quota</button>
                )}
                {aiQuota && !aiConfig.apiKey && (
                  <span style={{ marginLeft: '6px', color: 'var(--text-secondary)' }}>
                    — {aiQuota.remaining?.toLocaleString()} token rimasti su {aiQuota.tokenAllowance?.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Modello */}
          {aiConfig?.provider && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Modello</label>
              <select
                value={aiConfig?.model || ''}
                onChange={e => onAiConfigChange(prev => ({ ...prev, model: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {aiConfig.provider === 'openai' ? (
                  <>
                    <option value="gpt-5-mini">gpt-5-mini — $0.13 / $1.00 per 1M token</option>
                    <option value="gpt-5.2">gpt-5.2 — $1.75 / $14.00 per 1M token</option>
                    <option value="gpt-5.4">gpt-5.4 — $2.50 / $15.00 per 1M token</option>
                  </>
                ) : (
                  <>
                    <option value="claude-haiku-4-5-20251001">Haiku 4.5 — $1 / $5 per 1M token</option>
                    <option value="claude-sonnet-4-6">Sonnet 4.6 — $3 / $15 per 1M token</option>
                    <option value="claude-opus-4-6">Opus 4.6 — $5 / $25 per 1M token</option>
                    <option value="claude-opus-4-7">Opus 4.7 — contesto 1M token</option>
                  </>
                )}
              </select>
              {!aiConfig.apiKey && (
                <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                  Con la quota gratuita viene usato gpt-5-mini. I token inclusi non si rinnovano.
                </div>
              )}
            </div>
          )}

          {/* Effort (solo Anthropic con chiave custom) */}
          {aiConfig?.provider === 'anthropic' && aiConfig?.apiKey && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Effort (profondità di ragionamento)</label>
              <select
                value={aiConfig?.effort || 'medium'}
                onChange={e => onAiConfigChange(prev => ({ ...prev, effort: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="low">Low — veloce, meno ragionamento</option>
                <option value="medium">Medium — bilanciato (consigliato)</option>
                <option value="high">High — massima intelligenza, più lento</option>
              </select>
              <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                Il livello di effort controlla quanto Claude ragiona prima di rispondere. I token di ragionamento sono conteggiati come output.
              </div>
            </div>
          )}

          {/* Generazione immagini — solo se provider NON è OpenAI (OpenAI usa stessa key) */}
          {aiConfig?.provider && aiConfig?.provider !== 'openai' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...sectionStyle, marginTop: '24px' }}>Generazione immagini</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                Le immagini vengono generate tramite OpenAI. Inserisci una chiave OpenAI dedicata oppure usa la quota gratuita (richiede login).
              </div>
              <label style={labelStyle}>Chiave OpenAI per immagini</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type={showImageKey ? 'text' : 'password'}
                  value={aiConfig?.openaiImageKey || ''}
                  onChange={e => { onAiConfigChange(prev => ({ ...prev, openaiImageKey: e.target.value })); setImageKeyVerifyResult(null); }}
                  placeholder="Inserisci la tua OpenAI API key (facoltativo)"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => setShowImageKey(v => !v)}
                  style={{
                    background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                    padding: '0 10px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer'
                  }}
                >{showImageKey ? '🙈' : '👁️'}</button>
                <button
                  onClick={async () => {
                    if (!aiConfig.openaiImageKey) return;
                    setImageKeyVerifying(true);
                    setImageKeyVerifyResult(null);
                    const result = await window.electronAPI.aiVerifyKey('openai', aiConfig.openaiImageKey);
                    setImageKeyVerifying(false);
                    setImageKeyVerifyResult(result.success ? { ok: true } : { ok: false, error: result.error });
                  }}
                  disabled={!aiConfig.openaiImageKey || imageKeyVerifying}
                  style={{
                    background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                    padding: '0 12px', color: aiConfig.openaiImageKey && !imageKeyVerifying ? 'var(--accent)' : 'var(--text-disabled)',
                    fontSize: '11px', cursor: aiConfig.openaiImageKey && !imageKeyVerifying ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s', flexShrink: 0
                  }}
                >{imageKeyVerifying ? '...' : 'Verifica'}</button>
              </div>
              {imageKeyVerifyResult && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: imageKeyVerifyResult.ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {imageKeyVerifyResult.ok ? '✅ Chiave valida' : `❌ ${imageKeyVerifyResult.error}`}
                </div>
              )}
              <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                Senza chiave, le immagini usano la quota gratuita (richiede login). 1 immagine ≈ 100.000 token.
              </div>
            </div>
          )}

          {/* Console AI settings */}
          <div style={{ ...sectionStyle, marginTop: '24px' }}>Console AI — Ricerca documenti</div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Dimensione contesto fallback (caratteri)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min="8000"
                max="200000"
                step="1000"
                value={aiConfig?.contextMaxChars || 48000}
                onChange={e => onAiConfigChange(prev => ({ ...prev, contextMaxChars: Math.max(8000, Math.min(200000, parseInt(e.target.value, 10) || 48000)) }))}
                style={{ ...inputStyle, width: '100px', textAlign: 'center' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>caratteri</span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>
              Usato quando la ricerca semantica non è disponibile. Modelli economici: 16.000. Modelli avanzati: 48.000-100.000.
            </div>
          </div>

          <RagSettings aiConfig={aiConfig} onAiConfigChange={onAiConfigChange} />

          {/* Telegram AI */}
          <div style={{ ...sectionStyle, marginTop: '24px' }}>Telegram AI</div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={aiConfig?.telegramAiEnabled ?? true}
                onChange={e => onAiConfigChange(prev => ({ ...prev, telegramAiEnabled: e.target.checked }))}
                style={{ accentColor: 'var(--accent)' }}
              />
              Abilita risposte AI su Telegram
            </label>
          </div>

          {aiConfig?.telegramAiEnabled && (
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Modalità</label>
              <select
                value={aiConfig?.telegramAiMode || 'manual'}
                onChange={e => onAiConfigChange(prev => ({ ...prev, telegramAiMode: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="manual">Manuale — solo con /ai domanda</option>
                <option value="auto">Automatico — risponde a tutti i messaggi</option>
              </select>
            </div>
          )}

          {/* Clear history */}
          <div style={{ marginTop: '24px' }}>
            {confirmClearAi ? (
              <button
                onClick={() => {
                  onClearAiHistory();
                  setConfirmClearAi(false);
                  clearTimeout(confirmClearAiTimer.current);
                }}
                style={{
                  background: 'none', border: '1px solid var(--color-danger)', borderRadius: '4px',
                  padding: '6px 16px', color: 'var(--color-danger)', fontSize: '12px',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Sicuro?
              </button>
            ) : (
              <button
                onClick={() => {
                  setConfirmClearAi(true);
                  clearTimeout(confirmClearAiTimer.current);
                  confirmClearAiTimer.current = setTimeout(() => setConfirmClearAi(false), 3000);
                }}
                style={{
                  background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                  padding: '6px 16px', color: 'var(--text-secondary)', fontSize: '12px',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-danger)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                🗑️ Svuota conversazione AI
              </button>
            )}
          </div>

          </>)}

          {section === 'aidocs' && (<>
          {/* === DOCUMENTI AI === */}
          <div style={sectionStyle}>Documenti AI per Telegram</div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '16px', lineHeight: '1.6' }}>
            Quando un giocatore usa <span style={{ color: 'var(--accent)' }}>/ai</span> su Telegram, l'AI risponde basandosi solo sui documenti attivi qui sotto.<br />
            I documenti <b>comuni</b> sono visibili a tutti. Quelli <b>per personaggio</b> sono visibili solo al giocatore associato.
          </div>

          {/* Documenti comuni */}
          <div style={{
            border: '1px solid var(--border-default)', borderRadius: '6px',
            padding: '12px 16px', marginBottom: '16px', background: 'var(--bg-main)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>📋 Comuni (tutti i giocatori)</span>
              <button
                onClick={async () => {
                  const file = await window.electronAPI.selectProjectFile(projectPath, [
                    { name: 'Documenti', extensions: ['md', 'html', 'htm', 'txt'] }
                  ]);
                  if (!file) return;
                  const name = file.split('/').pop().replace(/\.[^.]+$/, '');
                  onAiConfigChange(prev => ({
                    ...prev,
                    commonDocs: [...(prev.commonDocs || []), { id: crypto.randomUUID(), name, file, active: true, activeFromDate: '' }]
                  }));
                }}
                style={{
                  background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                  padding: '2px 10px', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              >➕ Aggiungi</button>
            </div>
            {(aiConfig.commonDocs || []).length === 0 && (
              <div style={{ fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>Nessun documento comune</div>
            )}
            {(aiConfig.commonDocs || []).map(doc => (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '4px 6px', marginBottom: '2px',
                background: 'var(--bg-elevated)', borderRadius: '3px'
              }}>
                <input
                  type="checkbox" checked={doc.active}
                  onChange={e => onAiConfigChange(prev => ({
                    ...prev,
                    commonDocs: (prev.commonDocs || []).map(d => d.id === doc.id ? { ...d, active: e.target.checked } : d)
                  }))}
                  style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
                />
                <span style={{ fontSize: '12px', color: doc.active ? 'var(--text-primary)' : 'var(--text-disabled)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={doc.file}>{doc.name}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={doc.file}>{doc.file}</span>
                <span className="close-btn" onClick={() => onAiConfigChange(prev => ({
                  ...prev, commonDocs: (prev.commonDocs || []).filter(d => d.id !== doc.id)
                }))} style={{ fontSize: '12px', flexShrink: 0 }}>✕</span>
              </div>
            ))}
          </div>

          {/* Documenti per personaggio */}
          {players.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
              Configura i personaggi nella sezione Personaggi per aggiungere documenti specifici.
            </div>
          ) : players.map(pg => (
            <div key={pg.id} style={{
              border: '1px solid var(--border-default)', borderRadius: '6px',
              padding: '12px 16px', marginBottom: '10px', background: 'var(--bg-main)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  🎭 {pg.characterName || 'Senza nome'}{pg.playerName ? ` (${pg.playerName})` : ''}
                </span>
                <button
                  onClick={async () => {
                    const file = await window.electronAPI.selectProjectFile(projectPath, [
                      { name: 'Documenti', extensions: ['md', 'html', 'htm', 'txt'] }
                    ]);
                    if (!file) return;
                    const name = file.split('/').pop().replace(/\.[^.]+$/, '');
                    onPlayersChange(prev => prev.map(p => p.id === pg.id ? {
                      ...p,
                      aiDocuments: [...(p.aiDocuments || []), { id: crypto.randomUUID(), name, file, active: true, activeFromDate: '' }]
                    } : p));
                  }}
                  style={{
                    background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                    padding: '2px 10px', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                >➕ Aggiungi</button>
              </div>
              {(pg.aiDocuments || []).length === 0 && (
                <div style={{ fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>Nessun documento</div>
              )}
              {(pg.aiDocuments || []).map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '4px 6px', marginBottom: '2px',
                  background: 'var(--bg-elevated)', borderRadius: '3px'
                }}>
                  <input
                    type="checkbox" checked={doc.active}
                    onChange={e => onPlayersChange(prev => prev.map(p => p.id === pg.id ? {
                      ...p,
                      aiDocuments: (p.aiDocuments || []).map(d => d.id === doc.id ? { ...d, active: e.target.checked } : d)
                    } : p))}
                    style={{ accentColor: 'var(--accent)', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '12px', color: doc.active ? 'var(--text-primary)' : 'var(--text-disabled)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={doc.file}>{doc.name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={doc.file}>{doc.file}</span>
                  <span className="close-btn" onClick={() => onPlayersChange(prev => prev.map(p => p.id === pg.id ? {
                    ...p, aiDocuments: (p.aiDocuments || []).filter(d => d.id !== doc.id)
                  } : p))} style={{ fontSize: '12px', flexShrink: 0 }}>✕</span>
                </div>
              ))}
            </div>
          ))}

          </>)}

          {section === 'casting' && (<>
          <div style={sectionStyle}>Casting — Display al tavolo</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
            Configura il display secondario che mostrerà immagini, testi e tiri di dado ai giocatori.
            Il server si avvia manualmente dal pulsante 📡 nella barra in alto.
          </div>

          <CastAssetsSection
            projectPath={projectPath}
            castConfig={castConfig}
            onCastConfigChange={onCastConfigChange}
          />

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Adattamento immagini al display
            </label>
            <select
              value={castConfig.fit || 'contain'}
              onChange={e => onCastConfigChange(prev => ({ ...prev, fit: e.target.value }))}
              style={{
                background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                borderRadius: '4px', padding: '5px 8px', color: 'var(--text-primary)',
                fontSize: '12px', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="contain">Contieni (mostra tutta l'immagine)</option>
              <option value="cover">Riempi (ritaglia per coprire lo schermo)</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              Tipo di transizione tra contenuti
            </label>
            <select
              value={castConfig.transition || 'crossfade'}
              onChange={e => onCastConfigChange(prev => ({ ...prev, transition: e.target.value }))}
              style={{
                background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                borderRadius: '4px', padding: '5px 8px', color: 'var(--text-primary)',
                fontSize: '12px', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="crossfade">Dissolvenza (crossfade)</option>
              <option value="cut">Stacco istantaneo (cut)</option>
            </select>
          </div>

          {(castConfig.transition || 'crossfade') !== 'cut' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Durata dissolvenza: <span style={{ color: 'var(--accent)' }}>{castConfig.fadeMs ?? 250} ms</span>
              </label>
              <input
                type="range" min="0" max="1000" step="50"
                value={castConfig.fadeMs ?? 250}
                onChange={e => onCastConfigChange(prev => ({ ...prev, fadeMs: parseInt(e.target.value, 10) }))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>
          )}

          <DiceRulesEditor castConfig={castConfig} onCastConfigChange={onCastConfigChange} />

          <DiceSoundsEditor castConfig={castConfig} onCastConfigChange={onCastConfigChange} projectPath={projectPath} />
          </>)}

          {section === 'manuali' && (<>
          {/* === MANUALI DI RIFERIMENTO === */}
          <div style={sectionStyle}>Manuali di Riferimento</div>

          <button
            onClick={async () => {
              const result = await window.electronAPI.selectProjectFile(projectPath);
              if (result) {
                const name = result.split('/').pop().replace(/\.[^.]+$/, '');
                onReferenceChange(prev => [...prev, { id: crypto.randomUUID(), name, file: result }]);
              }
            }}
            style={{
              background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
              padding: '6px 16px', color: 'var(--accent)', fontSize: '13px',
              cursor: 'pointer', marginBottom: '16px', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'none'; }}
          >
            ➕ Aggiungi manuale
          </button>

          {(referenceManuals || []).length === 0 && (
            <div style={{ color: 'var(--text-disabled)', fontSize: '13px', fontStyle: 'italic', marginBottom: '16px' }}>
              Nessun manuale configurato
            </div>
          )}

          {(referenceManuals || []).map((manual, idx) => (
            <div key={manual.id} style={{
              border: '1px solid var(--border-default)', borderRadius: '6px',
              padding: '12px 16px', marginBottom: '10px', background: 'var(--bg-main)',
              display: 'flex', gap: '10px', alignItems: 'center'
            }}>
              {/* Reorder buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                <button
                  disabled={idx === 0}
                  onClick={() => {
                    onReferenceChange(prev => {
                      const arr = [...prev];
                      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                      return arr;
                    });
                  }}
                  style={{
                    background: 'none', border: 'none', color: idx === 0 ? 'var(--border-subtle)' : 'var(--text-secondary)',
                    cursor: idx === 0 ? 'default' : 'pointer', fontSize: '10px', padding: '0', lineHeight: '1'
                  }}
                >▲</button>
                <button
                  disabled={idx === (referenceManuals || []).length - 1}
                  onClick={() => {
                    onReferenceChange(prev => {
                      const arr = [...prev];
                      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                      return arr;
                    });
                  }}
                  style={{
                    background: 'none', border: 'none',
                    color: idx === (referenceManuals || []).length - 1 ? 'var(--border-subtle)' : 'var(--text-secondary)',
                    cursor: idx === (referenceManuals || []).length - 1 ? 'default' : 'pointer',
                    fontSize: '10px', padding: '0', lineHeight: '1'
                  }}
                >▼</button>
              </div>

              {/* Name */}
              <input
                type="text"
                value={manual.name}
                onChange={e => onReferenceChange(prev => prev.map(m => m.id === manual.id ? { ...m, name: e.target.value } : m))}
                placeholder="Nome manuale"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              />

              {/* File path */}
              <span style={{
                fontSize: '11px', color: 'var(--text-tertiary)', maxWidth: '200px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0
              }} title={manual.file}>
                {manual.file}
              </span>

              {/* Remove */}
              <button
                onClick={() => {
                  if (confirmRemoveManual !== manual.id) {
                    setConfirmRemoveManual(manual.id);
                    if (confirmRemoveManualTimer.current) clearTimeout(confirmRemoveManualTimer.current);
                    confirmRemoveManualTimer.current = setTimeout(() => setConfirmRemoveManual(prev => prev === manual.id ? null : prev), 3000);
                    return;
                  }
                  setConfirmRemoveManual(null);
                  if (confirmRemoveManualTimer.current) clearTimeout(confirmRemoveManualTimer.current);
                  onReferenceChange(prev => prev.filter(m => m.id !== manual.id));
                }}
                style={{
                  background: 'none', border: '1px solid var(--color-danger-bg)', borderRadius: '3px',
                  padding: '3px 8px', color: 'var(--color-danger)', fontSize: '11px',
                  cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                {confirmRemoveManual === manual.id ? 'Sicuro?' : '✕'}
              </button>
            </div>
          ))}

          </>)}

          {section === 'account' && (<>
          {/* === ACCOUNT AVVENTURE === */}
          <div style={sectionStyle}>Account Avventure</div>

          <div style={{
            padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
            borderRadius: '6px', fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.6', marginBottom: '16px'
          }}>
            Per pubblicare avventure è necessario un account. Puoi accedere o registrarti dalla sezione Avventure.
          </div>

          {fbUser ? (
            <>
              <div style={{ fontSize: '12px', color: 'var(--color-success)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>✅ Connesso come <strong>{fbUser.displayName || fbUser.email}</strong></span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
                {fbUser.email}
              </div>
              <button
                onClick={handleFbLogout}
                style={{
                  background: 'none', border: 'none', padding: '4px 0',
                  color: 'var(--text-disabled)', fontSize: '11px', cursor: 'pointer', marginBottom: '8px'
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-disabled)'}
              >
                Esci dall'account
              </button>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Non sei connesso.
              <span
                onClick={onOpenAdventures}
                style={{ color: 'var(--accent)', cursor: 'pointer', marginLeft: '6px' }}
              >
                Accedi dalla sezione Avventure →
              </span>
            </div>
          )}

          </>)}

          {section === 'importexport' && (
            <DataImportPanel
              projectPath={projectPath}
              players={players} onPlayersChange={onPlayersChange}
              notes={notes} onNotesChange={onNotesChange}
              checklist={checklist} onChecklistChange={onChecklistChange}
              calendarData={calendarData} onCalendarChange={onCalendarChange}
            />
          )}

          {section === 'layout' && (<>
          {/* === LAYOUT PANNELLI === */}
          <div style={sectionStyle}>Layout pannelli</div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Pannelli visibili</label>
            {[
              { id: 'explorer', label: 'Explorer' },
              { id: 'media', label: 'Media' },
              { id: 'viewer', label: 'Viewer' },
              { id: 'stage', label: 'Stage' },
              { id: 'console', label: 'Console' },
              { id: 'slotA', label: 'Slot A' },
              { id: 'slotB', label: 'Slot B' },
              { id: 'slotC', label: 'Slot C' }
            ].map(panel => (
              <label key={panel.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input type="checkbox"
                  checked={panelVisibility[panel.id]}
                  onChange={() => onPanelVisibilityChange(prev => ({ ...prev, [panel.id]: !prev[panel.id] }))}
                />
                {panel.label}
              </label>
            ))}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Salva layout corrente</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                placeholder="Nome preset..."
                style={inputStyle}
                onKeyDown={e => {
                  if (e.key === 'Enter' && presetName.trim()) {
                    onLayoutPresetsChange(prev => {
                      const filtered = prev.filter(p => p.name !== presetName.trim());
                      return [...filtered, { name: presetName.trim(), panels: { ...panelVisibility } }];
                    });
                    setPresetName('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (!presetName.trim()) return;
                  onLayoutPresetsChange(prev => {
                    const filtered = prev.filter(p => p.name !== presetName.trim());
                    return [...filtered, { name: presetName.trim(), panels: { ...panelVisibility } }];
                  });
                  setPresetName('');
                }}
                disabled={!presetName.trim()}
                style={{
                  background: 'none', border: '1px solid var(--accent)',
                  borderRadius: '4px', padding: '6px 16px',
                  color: !presetName.trim() ? 'var(--text-disabled)' : 'var(--accent)',
                  fontSize: '12px', cursor: !presetName.trim() ? 'not-allowed' : 'pointer',
                  fontWeight: '600', transition: 'all 0.15s', flexShrink: 0
                }}
              >
                Salva
              </button>
            </div>
          </div>

          {layoutPresets.length > 0 && (
            <div>
              <label style={labelStyle}>Preset salvati</label>
              {layoutPresets.map(preset => (
                <div key={preset.name} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid var(--border-subtle)'
                }}>
                  <div>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{preset.name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginLeft: '8px' }}>
                      {Object.entries(preset.panels).filter(([, v]) => v).map(([k]) => k).join(', ')}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (confirmDeletePreset !== preset.name) {
                        setConfirmDeletePreset(preset.name);
                        if (confirmDeletePresetTimer.current) clearTimeout(confirmDeletePresetTimer.current);
                        confirmDeletePresetTimer.current = setTimeout(() => setConfirmDeletePreset(null), 3000);
                        return;
                      }
                      onLayoutPresetsChange(prev => prev.filter(p => p.name !== preset.name));
                      setConfirmDeletePreset(null);
                    }}
                    style={{
                      background: 'none', border: 'none', padding: '2px 8px',
                      fontSize: '11px', cursor: 'pointer',
                      color: confirmDeletePreset === preset.name ? 'var(--color-danger)' : 'var(--text-disabled)',
                      transition: 'color 0.15s'
                    }}
                    onMouseEnter={e => { if (confirmDeletePreset !== preset.name) e.currentTarget.style.color = 'var(--color-danger)'; }}
                    onMouseLeave={e => { if (confirmDeletePreset !== preset.name) e.currentTarget.style.color = 'var(--text-disabled)'; }}
                  >
                    {confirmDeletePreset === preset.name ? 'Sicuro?' : 'Elimina'}
                  </button>
                </div>
              ))}
            </div>
          )}
          </>)}

          </div>{/* end right content */}
        </div>{/* end two-column */}
      </div>
    </div>
  );
}

function TelegramQRPanel({ botUsername, sessionCode }) {
  const [qrSvg, setQrSvg] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const deepLink = `https://t.me/${botUsername}?start=${sessionCode}`;

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const dark = style.getPropertyValue('--accent').trim() || '#c9a96e';
    const light = style.getPropertyValue('--bg-main').trim() || '#1a1815';
    QRCode.toString(deepLink, {
      type: 'svg', margin: 1,
      color: { dark, light }
    }).then(svg => setQrSvg(svg)).catch(() => {});
  }, [deepLink]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(deepLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [deepLink]);

  return (
    <>
      <div style={{
        padding: '14px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
        borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
      }}>
        <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Connessione giocatori
        </div>

        {qrSvg && (
          <div
            onClick={() => setFullscreen(true)}
            style={{ width: '160px', height: '160px', borderRadius: '8px', cursor: 'pointer', border: '2px solid var(--accent)', transition: 'transform 0.2s', overflow: 'hidden' }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Clicca per ingrandire"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        )}

        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', wordBreak: 'break-all' }}>
          {deepLink}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleCopy}
            style={{
              background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
              padding: '4px 12px', color: copied ? 'var(--color-success)' : 'var(--text-secondary)',
              fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {copied ? '✅ Copiato!' : '📋 Copia link'}
          </button>
          <button
            onClick={() => setFullscreen(true)}
            style={{
              background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
              padding: '4px 12px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            🔍 Mostra grande
          </button>
        </div>

        <div style={{ fontSize: '10px', color: 'var(--text-disabled)', textAlign: 'center', lineHeight: '1.4' }}>
          I giocatori scansionano il QR o cliccano il link → premono Avvia → scelgono il personaggio
        </div>
      </div>

      {/* Fullscreen QR overlay — da mostrare ai giocatori al tavolo */}
      {fullscreen && (
        <div
          onClick={() => setFullscreen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 99999, cursor: 'pointer'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent)', letterSpacing: '4px', marginBottom: '24px' }}>
            UNISCITI ALLA SESSIONE
          </div>
          {qrSvg && (
            <div
              style={{ width: '320px', height: '320px', borderRadius: '16px', border: '3px solid var(--accent)', overflow: 'hidden' }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          )}
          <div style={{ fontSize: '18px', color: 'var(--text-primary)', marginTop: '20px', fontFamily: 'monospace', letterSpacing: '2px' }}>
            @{botUsername}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
            Scansiona il QR code con il telefono
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent)', marginTop: '16px', fontFamily: 'monospace', letterSpacing: '6px' }}>
            {sessionCode}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-disabled)', marginTop: '24px' }}>
            oppure cerca @{botUsername} su Telegram e scrivi /join {sessionCode}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '40px' }}>
            Clicca ovunque per chiudere
          </div>
        </div>
      )}
    </>
  );
}
