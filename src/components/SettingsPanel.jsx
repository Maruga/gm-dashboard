import React, { useState, useRef, useEffect } from 'react';
import { THEMES, THEME_LIST } from '../themes/themeDefinitions';
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
  onExportAdventure, onOpenAdventures
}) {
  const [showToken, setShowToken] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [wizardToken, setWizardToken] = useState('');
  // GitHub token state
  const [ghToken, setGhToken] = useState('');
  const [ghShowToken, setGhShowToken] = useState(false);
  const [ghVerifying, setGhVerifying] = useState(false);
  const [ghVerified, setGhVerified] = useState(null); // { username } or null
  const [ghError, setGhError] = useState(null);
  const ghLoaded = useRef(false);
  const [currentTheme, setCurrentTheme] = useState(getStoredThemeId);
  const [fontScale, setFontScale] = useState(getStoredFontScale);
  const [newWord, setNewWord] = useState('');
  const [bulkWords, setBulkWords] = useState('');
  const [confirmClearWords, setConfirmClearWords] = useState(false);
  const confirmWordsTimer = useRef(null);

  // Load GitHub token on mount
  useEffect(() => {
    if (ghLoaded.current) return;
    ghLoaded.current = true;
    window.electronAPI?.githubGetToken?.().then(token => {
      if (token) {
        setGhToken(token);
        window.electronAPI.githubVerifyToken(token).then(res => {
          if (res.valid) setGhVerified({ username: res.username });
        });
      }
    });
  }, []);

  const handleGhVerify = async () => {
    if (!ghToken.trim()) return;
    setGhVerifying(true);
    setGhError(null);
    setGhVerified(null);
    const res = await window.electronAPI.githubVerifyToken(ghToken.trim());
    setGhVerifying(false);
    if (res.valid) {
      setGhVerified({ username: res.username });
      await window.electronAPI.githubSaveToken(ghToken.trim());
    } else {
      setGhError(res.error || 'Token non valido');
    }
  };

  const handleGhRemove = async () => {
    setGhToken('');
    setGhVerified(null);
    setGhError(null);
    await window.electronAPI?.githubClearToken?.();
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
      telegramChatId: ''
    }]);
  };

  const updatePlayer = (id, key, value) => {
    onPlayersChange(prev => prev.map(p => p.id === id ? { ...p, [key]: value } : p));
  };

  const removePlayer = (id) => {
    if (!window.confirm('Rimuovere questo personaggio?')) return;
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

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

          {/* === ASPETTO === */}
          <div style={sectionStyle}>Aspetto</div>

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
            <label style={labelStyle}>Sistema</label>
            <input
              type="text"
              value={settings.system || ''}
              placeholder="es. GENKAI 限界 v1.2"
              onChange={e => updateSetting('system', e.target.value)}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            />
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
                  Rimuovi
                </button>
              </div>
            </div>
          ))}

          {/* === TELEGRAM === */}
          <div style={{ ...sectionStyle, marginTop: '16px' }}>Telegram</div>

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

              {/* Instructions */}
              <div style={{
                padding: '10px 14px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
                borderRadius: '4px', fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.5'
              }}>
                Comunica ai giocatori di cercare il bot su Telegram e scrivere:<br />
                <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>/join {telegram.sessionCode || '------'}</span>
              </div>

              {/* Reset token */}
              <button onClick={() => {
                if (window.confirm('Rimuovere il token e riconfigurare?')) {
                  if (botStatus?.running) onStopBot();
                  onTelegramChange({ botToken: '', configured: false, sessionCode: '', botActive: false, botInfo: null });
                }
              }} style={{
                background: 'none', border: 'none', padding: '8px 0', color: 'var(--text-disabled)',
                fontSize: '11px', cursor: 'pointer', marginTop: '8px'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-disabled)'}
              >🗑️ Rimuovi token e riconfigura</button>
            </>
          )}

          {/* === MANUALI DI RIFERIMENTO === */}
          <div style={{ ...sectionStyle, marginTop: '16px' }}>Manuali di Riferimento</div>

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
                  if (window.confirm(`Rimuovere "${manual.name}"?`)) {
                    onReferenceChange(prev => prev.filter(m => m.id !== manual.id));
                  }
                }}
                style={{
                  background: 'none', border: '1px solid var(--color-danger-bg)', borderRadius: '3px',
                  padding: '3px 8px', color: 'var(--color-danger)', fontSize: '11px',
                  cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-danger-bg)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                ✕
              </button>
            </div>
          ))}

          {/* === GITHUB === */}
          <div style={{ ...sectionStyle, marginTop: '16px' }}>🔑 GitHub</div>

          <div style={{
            padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
            borderRadius: '6px', fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.6', marginBottom: '16px'
          }}>
            Per pubblicare avventure serve un Personal Access Token GitHub.<br />
            <span style={{ color: 'var(--text-secondary)' }}>
              github.com → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new → scope: <strong>repo</strong>
            </span>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Token</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type={ghShowToken ? 'text' : 'password'}
                  value={ghToken}
                  placeholder="ghp_..."
                  onChange={e => { setGhToken(e.target.value); setGhVerified(null); setGhError(null); }}
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                />
                <span
                  onClick={() => setGhShowToken(v => !v)}
                  style={{
                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                    cursor: 'pointer', fontSize: '14px', opacity: 0.6
                  }}
                  title={ghShowToken ? 'Nascondi' : 'Mostra'}
                >
                  {ghShowToken ? '🙈' : '👁'}
                </span>
              </div>
              <button
                onClick={handleGhVerify}
                disabled={!ghToken.trim() || ghVerifying}
                style={{
                  background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                  padding: '6px 14px', fontSize: '12px', cursor: !ghToken.trim() || ghVerifying ? 'not-allowed' : 'pointer',
                  color: !ghToken.trim() || ghVerifying ? 'var(--text-disabled)' : 'var(--accent)',
                  transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}
                onMouseEnter={e => { if (ghToken.trim() && !ghVerifying) e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              >
                {ghVerifying ? '⏳ Verifica...' : 'Verifica'}
              </button>
            </div>
          </div>

          {ghVerified && (
            <div style={{ fontSize: '12px', color: 'var(--color-success)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅ Verificato — account: <strong>{ghVerified.username}</strong></span>
            </div>
          )}
          {ghError && (
            <div style={{ fontSize: '12px', color: 'var(--color-danger)', marginBottom: '12px' }}>
              ❌ {ghError}
            </div>
          )}

          {ghToken && (
            <button
              onClick={handleGhRemove}
              style={{
                background: 'none', border: 'none', padding: '4px 0',
                color: 'var(--text-disabled)', fontSize: '11px', cursor: 'pointer', marginBottom: '8px'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-disabled)'}
            >
              🗑️ Rimuovi token
            </button>
          )}

          {/* Info link */}
          {onOpenInfo && (
            <div
              onClick={() => { onClose(); onOpenInfo(); }}
              style={{
                marginTop: '16px', textAlign: 'center',
                fontSize: '12px', color: 'var(--text-tertiary)',
                cursor: 'pointer', transition: 'color 0.2s',
                paddingBottom: '4px'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
            >
              ℹ️ Informazioni su GM Dashboard
            </div>
          )}

          <div style={{ height: '24px' }} />
        </div>
      </div>
    </div>
  );
}
