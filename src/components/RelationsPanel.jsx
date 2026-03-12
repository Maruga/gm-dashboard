import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { parseRelationsFile } from '../utils/relationsParser';

function scoreColor(v) {
  if (v <= -2) return 'var(--color-danger-bright)';
  if (v === -1) return 'var(--color-warning)';
  if (v === 0) return 'var(--text-disabled)';
  if (v === 1) return 'var(--color-success)';
  return 'var(--color-success-bright)'; // >= 2
}

export default function RelationsPanel({
  onClose, projectPath,
  projectSettings, onUpdateSettings,
  relationsBase, relationsSession,
  onSetRelationsBase, onSetRelationsSession
}) {
  const [pngList, setPngList] = useState([]);
  const [selectedPng, setSelectedPng] = useState(null);
  const [search, setSearch] = useState('');
  const [parseErrors, setParseErrors] = useState([]);
  const [parseSummary, setParseSummary] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [editNoteValue, setEditNoteValue] = useState('');
  const [confirmResetPng, setConfirmResetPng] = useState(false);
  const panelRef = useRef(null);
  const noteInputRef = useRef(null);
  const confirmTimerRef = useRef(null);

  const relationsFile = projectSettings.relationsFile || '';

  // Build PNG list from relations base data only
  useEffect(() => {
    const sorted = Object.keys(relationsBase).sort((a, b) => a.localeCompare(b, 'it'));
    setPngList(sorted);
    if (sorted.length > 0 && !selectedPng) setSelectedPng(sorted[0]);
  }, [relationsBase]);

  // Get PG names for the selected PNG (from base + session)
  const pgNamesForSelected = useMemo(() => {
    if (!selectedPng) return [];
    const names = new Set();
    const base = relationsBase[selectedPng];
    if (base) Object.keys(base).forEach(n => names.add(n));
    const session = relationsSession[selectedPng];
    if (session) Object.keys(session).forEach(n => names.add(n));
    return [...names].sort((a, b) => a.localeCompare(b, 'it'));
  }, [selectedPng, relationsBase, relationsSession]);

  // Load and parse relations file
  const loadRelationsFile = useCallback(async () => {
    if (!relationsFile || !projectPath) return;
    try {
      const fullPath = projectPath + '/' + relationsFile;
      const text = await window.electronAPI.readFile(fullPath);
      const { relations, errors } = parseRelationsFile(text);
      onSetRelationsBase(relations);
      setParseErrors(errors);

      const pngCount = Object.keys(relations).length;
      const pgNames = new Set();
      let relCount = 0;
      Object.values(relations).forEach(pgs => {
        Object.keys(pgs).forEach(n => pgNames.add(n));
        relCount += Object.keys(pgs).length;
      });
      setParseSummary(`Caricate ${relCount} relazioni tra ${pngCount} PNG e ${pgNames.size} PG`);
    } catch (err) {
      setParseErrors([{ line: 0, text: '', message: 'Impossibile leggere il file: ' + err.message }]);
      setParseSummary('');
    }
  }, [relationsFile, projectPath, onSetRelationsBase]);

  // Auto-load on mount if file is configured
  useEffect(() => {
    if (relationsFile) loadRelationsFile();
  }, [relationsFile]);

  // Clear confirm state when switching PNG or unmounting
  useEffect(() => {
    setConfirmResetPng(false);
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
  }, [selectedPng]);
  useEffect(() => () => { if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current); }, []);

  // Esc to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus note input when editing
  useEffect(() => {
    if (editingNote && noteInputRef.current) noteInputRef.current.focus();
  }, [editingNote]);

  // Get effective value for a PNG-PG pair
  const getRelation = useCallback((pngName, pgName) => {
    const session = relationsSession[pngName]?.[pgName];
    if (session) return session;
    const base = relationsBase[pngName]?.[pgName];
    if (base) return base;
    return { value: 0, note: '' };
  }, [relationsBase, relationsSession]);

  // Check if a value was modified from base
  const isModified = useCallback((pngName, pgName) => {
    return !!relationsSession[pngName]?.[pgName];
  }, [relationsSession]);

  // Update session value
  const updateSessionValue = useCallback((pngName, pgName, newValue) => {
    onSetRelationsSession(prev => ({
      ...prev,
      [pngName]: {
        ...(prev[pngName] || {}),
        [pgName]: {
          ...(prev[pngName]?.[pgName] || getRelation(pngName, pgName)),
          value: newValue
        }
      }
    }));
  }, [onSetRelationsSession, getRelation]);

  // Update session note
  const updateSessionNote = useCallback((pngName, pgName, newNote) => {
    onSetRelationsSession(prev => ({
      ...prev,
      [pngName]: {
        ...(prev[pngName] || {}),
        [pgName]: {
          ...(prev[pngName]?.[pgName] || getRelation(pngName, pgName)),
          note: newNote
        }
      }
    }));
  }, [onSetRelationsSession, getRelation]);

  // Reset single PNG
  const resetPng = useCallback((pngName) => {
    onSetRelationsSession(prev => {
      const next = { ...prev };
      delete next[pngName];
      return next;
    });
  }, [onSetRelationsSession]);

  // Handle score change
  const handleScoreUp = useCallback((pngName, pgName) => {
    const current = getRelation(pngName, pgName);
    updateSessionValue(pngName, pgName, current.value + 1);
  }, [getRelation, updateSessionValue]);

  const handleScoreDown = useCallback((pngName, pgName) => {
    const current = getRelation(pngName, pgName);
    updateSessionValue(pngName, pgName, current.value - 1);
  }, [getRelation, updateSessionValue]);

  // Handle note edit
  const handleNoteSubmit = useCallback(() => {
    if (!editingNote) return;
    updateSessionNote(editingNote.png, editingNote.pg, editNoteValue);
    setEditingNote(null);
  }, [editingNote, editNoteValue, updateSessionNote]);

  // Browse for relations file
  const handleBrowseFile = useCallback(async () => {
    const rel = await window.electronAPI.selectProjectFile(projectPath, [
      { name: 'Relazioni', extensions: ['md', 'txt'] }
    ]);
    if (rel) {
      onUpdateSettings({ ...projectSettings, relationsFile: rel });
    }
  }, [projectPath, projectSettings, onUpdateSettings]);

  // Remove relations file
  const handleRemoveFile = useCallback(() => {
    onUpdateSettings({ ...projectSettings, relationsFile: '' });
    onSetRelationsBase({});
    setParseErrors([]);
    setParseSummary('');
  }, [projectSettings, onUpdateSettings, onSetRelationsBase]);

  // Filtered PNG list
  const filteredPng = useMemo(() => {
    if (!search.trim()) return pngList;
    const q = search.toLowerCase();
    return pngList.filter(name => name.toLowerCase().includes(q));
  }, [pngList, search]);

  // Check if selected PNG has any session modifications
  const selectedHasOverrides = selectedPng && relationsSession[selectedPng] && Object.keys(relationsSession[selectedPng]).length > 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--overlay-dark)',
      zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} style={{
        width: 'min(700px, 90vw)', height: '70vh', background: 'var(--bg-panel)',
        border: '1px solid var(--border-default)', borderRadius: '8px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 16px 48px var(--shadow-dropdown)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--accent)', letterSpacing: '1px' }}>
              Relazioni PNG ↔ PG
            </div>
            {parseSummary && (
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{parseSummary}</div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-tertiary)',
            fontSize: '18px', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px'
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >✕</button>
        </div>

        {/* File config bar */}
        {!relationsFile && (
          <div style={{
            padding: '10px 20px', borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
            background: 'var(--bg-main)'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Nessun file relazioni configurato.</span>
            <button onClick={handleBrowseFile} style={{
              background: 'none', border: '1px solid var(--accent)', borderRadius: '4px',
              padding: '3px 10px', fontSize: '11px', color: 'var(--accent)', cursor: 'pointer',
              fontWeight: '600'
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-a10)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Sfoglia...
            </button>
          </div>
        )}

        {relationsFile && (
          <div style={{
            padding: '6px 20px', borderBottom: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0,
            fontSize: '11px', background: 'var(--bg-main)'
          }}>
            <span style={{ color: 'var(--text-tertiary)' }}>File:</span>
            <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{relationsFile}</span>
            <span className="close-btn" onClick={handleRemoveFile} style={{ fontSize: '10px' }} title="Rimuovi file">✕</span>
            <button onClick={loadRelationsFile} style={{
              background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
              padding: '2px 8px', fontSize: '10px', color: 'var(--text-secondary)', cursor: 'pointer'
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              title="Ricarica da file"
            >
              Ricarica
            </button>
          </div>
        )}

        {/* Parse errors */}
        {parseErrors.length > 0 && (
          <div style={{ padding: '6px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0, maxHeight: '60px', overflowY: 'auto' }}>
            {parseErrors.map((err, i) => (
              <div key={i} style={{ fontSize: '10px', color: 'var(--color-warning)' }}>
                ⚠️ Riga {err.line}: {err.message}
              </div>
            ))}
          </div>
        )}

        {/* Main content: two columns */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: PNG list */}
          <div style={{
            width: '180px', flexShrink: 0, borderRight: '1px solid var(--border-subtle)',
            display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredPng.map(name => {
                const isSelected = name === selectedPng;
                const hasOverride = relationsSession[name] && Object.keys(relationsSession[name]).length > 0;
                return (
                  <div
                    key={name}
                    onClick={() => { setSelectedPng(name); setEditingNote(null); }}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                      background: isSelected ? 'var(--accent-a10)' : 'transparent',
                      borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover-subtle)'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'var(--accent-a10)' : 'transparent'; }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {hasOverride && <span style={{ color: 'var(--color-warning)', marginRight: '4px' }}>*</span>}
                      {name}
                    </span>
                  </div>
                );
              })}
              {filteredPng.length === 0 && (
                <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                  {pngList.length === 0 ? 'Configura un file relazioni' : 'Nessun risultato'}
                </div>
              )}
            </div>
            {/* Search */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '6px 8px', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Cerca PNG..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-default)',
                  borderRadius: '3px', padding: '4px 8px', fontSize: '11px', color: 'var(--text-primary)',
                  outline: 'none', boxSizing: 'border-box'
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              />
            </div>
          </div>

          {/* Right: PG relations table */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selectedPng ? (
              <>
                {/* PNG header */}
                <div style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0
                }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)', letterSpacing: '0.5px' }}>
                    {selectedPng}
                  </div>
                </div>

                {/* Relations table */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
                  {pgNamesForSelected.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                      Nessuna relazione per questo PNG
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>PG</th>
                          <th style={{ padding: '6px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', width: '80px' }}>Valore</th>
                          <th style={{ padding: '6px 12px', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pgNamesForSelected.map(pgName => {
                          const rel = getRelation(selectedPng, pgName);
                          const modified = isModified(selectedPng, pgName);
                          const isEditingThis = editingNote?.png === selectedPng && editingNote?.pg === pgName;
                          const color = scoreColor(rel.value);

                          return (
                            <tr key={pgName} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              {/* PG Name */}
                              <td style={{ padding: '8px 12px', color: 'var(--text-primary)', fontWeight: '500' }}>
                                {pgName}
                              </td>
                              {/* Score */}
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    padding: '2px 6px', borderRadius: '10px',
                                    background: modified ? 'var(--accent-a08)' : 'transparent',
                                    border: modified ? '1px solid var(--accent-a15)' : '1px solid transparent',
                                    userSelect: 'none'
                                  }}
                                >
                                  <span
                                    onClick={() => handleScoreDown(selectedPng, pgName)}
                                    style={{ cursor: 'pointer', fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1, padding: '2px' }}
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                                    title="Diminuisci"
                                  >▼</span>
                                  <span style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: color, flexShrink: 0
                                  }} />
                                  <span style={{ fontSize: '12px', fontWeight: '700', color, minWidth: '20px', textAlign: 'center' }}>
                                    {rel.value > 0 ? '+' : ''}{rel.value}
                                  </span>
                                  <span
                                    onClick={() => handleScoreUp(selectedPng, pgName)}
                                    style={{ cursor: 'pointer', fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1, padding: '2px' }}
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                                    title="Aumenta"
                                  >▲</span>
                                </span>
                              </td>
                              {/* Note */}
                              <td style={{ padding: '8px 12px' }}>
                                {isEditingThis ? (
                                  <input
                                    ref={noteInputRef}
                                    type="text"
                                    value={editNoteValue}
                                    onChange={e => setEditNoteValue(e.target.value)}
                                    onBlur={handleNoteSubmit}
                                    onKeyDown={e => { if (e.key === 'Enter') handleNoteSubmit(); if (e.key === 'Escape') setEditingNote(null); }}
                                    style={{
                                      width: '100%', background: 'var(--bg-main)', border: '1px solid var(--accent)',
                                      borderRadius: '3px', padding: '3px 6px', fontSize: '11px', color: 'var(--text-primary)',
                                      outline: 'none', boxSizing: 'border-box'
                                    }}
                                  />
                                ) : (
                                  <span
                                    onClick={() => { setEditingNote({ png: selectedPng, pg: pgName }); setEditNoteValue(rel.note); }}
                                    style={{
                                      cursor: 'pointer', color: rel.note ? 'var(--text-secondary)' : 'var(--text-disabled)',
                                      fontStyle: rel.note ? 'normal' : 'italic', fontSize: '11px',
                                      display: 'block', minHeight: '16px', padding: '2px 0',
                                      borderBottom: '1px dashed transparent', transition: 'border-color 0.15s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'var(--border-default)'}
                                    onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                                    title="Click per modificare"
                                  >
                                    {rel.note || 'Aggiungi nota...'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Reset */}
                  <div style={{ padding: '12px 16px' }}>
                    {selectedHasOverrides && (
                      <button
                        onClick={() => {
                          if (confirmResetPng) {
                            resetPng(selectedPng);
                            setConfirmResetPng(false);
                            if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
                          } else {
                            setConfirmResetPng(true);
                            confirmTimerRef.current = setTimeout(() => setConfirmResetPng(false), 3000);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: `1px solid ${confirmResetPng ? 'var(--color-warning)' : 'var(--border-default)'}`,
                          borderRadius: '4px',
                          padding: '4px 12px', fontSize: '11px',
                          color: confirmResetPng ? 'var(--color-warning)' : 'var(--text-secondary)',
                          cursor: 'pointer', transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => { if (!confirmResetPng) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; } }}
                        onMouseLeave={e => { if (!confirmResetPng) { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                      >
                        {confirmResetPng ? 'Sicuro?' : 'Reset a valori base'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-disabled)', fontSize: '13px', fontStyle: 'italic'
              }}>
                {pngList.length === 0 ? 'Configura un file relazioni' : 'Seleziona un PNG dalla lista'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
