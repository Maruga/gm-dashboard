import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SquareArrowOutUpRight, Send } from 'lucide-react';

function formatTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── Modal configurazione Telegram per un item ── */
function TelegramConfigModal({ item, players, onSave, onCancel }) {
  const [enabled, setEnabled] = useState(item.telegram?.enabled || false);
  const [commonText, setCommonText] = useState(item.telegram?.commonText || '');
  const [personalTexts, setPersonalTexts] = useState(item.telegram?.personalTexts || {});
  const [recipients, setRecipients] = useState(() => {
    const saved = item.telegram?.recipients;
    if (saved && Object.keys(saved).length > 0) return saved;
    const s = {};
    (players || []).filter(p => p.telegramChatId).forEach(p => { s[p.id] = true; });
    return s;
  });

  const connectedPlayers = (players || []).filter(p => p.telegramChatId);
  const toggleRecipient = (id) => setRecipients(prev => ({ ...prev, [id]: !prev[id] }));
  const selectAll = () => { const s = {}; connectedPlayers.forEach(p => { s[p.id] = true; }); setRecipients(s); };
  const selectNone = () => { const s = {}; connectedPlayers.forEach(p => { s[p.id] = false; }); setRecipients(s); };
  const selectRandom = () => {
    const selectedCount = connectedPlayers.filter(p => recipients[p.id]).length;
    if (selectedCount >= connectedPlayers.length) {
      const pick = connectedPlayers[Math.floor(Math.random() * connectedPlayers.length)];
      setRecipients(pick ? { [pick.id]: true } : {});
      return;
    }
    const unsel = connectedPlayers.filter(p => !recipients[p.id]);
    if (unsel.length === 0) return;
    const pick = unsel[Math.floor(Math.random() * unsel.length)];
    setRecipients(prev => ({ ...prev, [pick.id]: true }));
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const updatePersonal = (playerId, text) => {
    setPersonalTexts(prev => ({ ...prev, [playerId]: text }));
  };

  const handleSave = () => {
    onSave({
      enabled,
      commonText: commonText.trim(),
      personalTexts,
      recipients,
      sent: item.telegram?.sent || false
    });
  };

  const textareaStyle = {
    width: '100%',
    padding: '6px 10px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-default)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    resize: 'vertical'
  };

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'var(--overlay-medium)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '500px', maxHeight: '80vh',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          boxShadow: 'var(--shadow-panel)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-elevated)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)' }}>
            Configura invio Telegram
          </span>
          <span className="close-btn" onClick={onCancel}>✕</span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Item text */}
          <div style={{
            fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px',
            padding: '8px', background: 'var(--bg-elevated)', borderRadius: '4px',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word'
          }}>
            {item.text}
          </div>

          {/* Enable toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px',
            color: 'var(--accent)', cursor: 'pointer', marginBottom: '14px'
          }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              style={{ accentColor: 'var(--accent)' }}
            />
            Invia via Telegram al check
          </label>

          {enabled && (
            <>
              {/* Destinatari */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Destinatari</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span onClick={selectAll} style={{ fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }}>Tutti</span>
                    <span onClick={selectNone} style={{ fontSize: '11px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>Nessuno</span>
                    <span onClick={selectRandom} style={{ fontSize: '11px', color: 'var(--color-warning)', cursor: 'pointer' }}>Casuale</span>
                  </div>
                </div>
                {connectedPlayers.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                    Nessun giocatore connesso
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {connectedPlayers.map(p => (
                      <label key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px',
                        borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                        background: recipients[p.id] ? 'var(--accent-a10)' : 'transparent',
                        border: recipients[p.id] ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                        transition: 'all 0.15s'
                      }}>
                        <input type="checkbox" checked={!!recipients[p.id]} onChange={() => toggleRecipient(p.id)}
                          style={{ accentColor: 'var(--accent)' }} />
                        <span style={{ color: 'var(--text-primary)' }}>{p.characterName || p.playerName}</span>
                        {p.playerName && p.characterName && (
                          <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>({p.playerName})</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Common text */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  Testo comune (destinatari selezionati):
                </label>
                <textarea
                  value={commonText}
                  onChange={e => setCommonText(e.target.value)}
                  placeholder="Questo testo verrà inviato ai destinatari selezionati..."
                  rows={3}
                  style={textareaStyle}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                />
              </div>

              {/* Per-player texts */}
              {connectedPlayers.filter(p => recipients[p.id]).length > 0 && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Testo personalizzato per giocatore:
                  </label>
                  {connectedPlayers.filter(p => recipients[p.id]).map(pg => (
                    <div key={pg.id} style={{ marginBottom: '10px' }}>
                      <div style={{
                        fontSize: '11px', color: 'var(--text-primary)', marginBottom: '3px',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        {pg.characterName || pg.playerName || 'Giocatore'}
                        {pg.playerName && pg.characterName && (
                          <span style={{ color: 'var(--text-disabled)' }}>({pg.playerName})</span>
                        )}
                      </div>
                      <textarea
                        value={personalTexts[pg.id] || ''}
                        onChange={e => updatePersonal(pg.id, e.target.value)}
                        placeholder={`Testo per ${pg.characterName || pg.playerName || 'questo giocatore'}...`}
                        rows={2}
                        style={textareaStyle}
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                      />
                    </div>
                  ))}
                </div>
              )}

              {connectedPlayers.filter(p => recipients[p.id]).length === 0 && connectedPlayers.length > 0 && (
                <div style={{ fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                  Seleziona almeno un destinatario per il testo personalizzato.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-default)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-elevated)'
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-disabled)', maxWidth: '280px' }}>
            Al check, i messaggi saranno inviati ai destinatari selezionati
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onCancel}
              style={{
                background: 'none', border: '1px solid var(--border-default)',
                borderRadius: '4px', padding: '5px 14px',
                color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Annulla
            </button>
            <button
              onClick={handleSave}
              style={{
                background: 'var(--accent-a12)', border: '1px solid var(--accent)',
                borderRadius: '4px', padding: '5px 14px',
                color: 'var(--accent)', fontSize: '11px', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-a15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-a12)'}
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── ChecklistPanel principale ── */
export default function ChecklistPanel({ items, onItemsChange, onOpenSource, onClose, players, onToggleCheck }) {
  const [text, setText] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [filter, setFilter] = useState('todo'); // 'all' | 'todo' | 'done'
  const [panelLeft, setPanelLeft] = useState(null);
  const [configItem, setConfigItem] = useState(null); // item per la modal Telegram
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimer = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Position panel under the ☐ Checklist button
  useEffect(() => {
    const btn = document.querySelector('[data-checklist-toggle]');
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const left = Math.max(8, rect.left + rect.width / 2 - 225);
      setPanelLeft(left);
    }
  }, []);

  // Close on click outside (but not when modal is open)
  useEffect(() => {
    const handler = (e) => {
      if (configItem) return; // modal aperta, non chiudere panel
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      if (e.target.closest?.('[data-checklist-toggle]')) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, configItem]);

  // Cleanup confirm timer
  useEffect(() => {
    return () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); };
  }, []);

  const counts = useMemo(() => {
    const todo = items.filter(i => !i.checked).length;
    const done = items.filter(i => i.checked).length;
    return { todo, done, all: items.length };
  }, [items]);

  const filtered = useMemo(() => {
    let list;
    if (filter === 'todo') list = items.filter(i => !i.checked);
    else if (filter === 'done') list = items.filter(i => i.checked);
    else {
      // 'all': unchecked first (chronological), then checked at bottom
      const unchecked = items.filter(i => !i.checked);
      const checked = items.filter(i => i.checked);
      list = [...unchecked, ...checked];
    }
    return list;
  }, [items, filter]);

  const addItem = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const item = {
      id: crypto.randomUUID(),
      text: trimmed,
      checked: false,
      timestamp: new Date().toISOString(),
      source: null,
      sourcePath: null,
      sourceScrollTop: null
    };
    onItemsChange(prev => [item, ...prev]);
    setText('');
  };

  const addBulk = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    const newItems = lines.map(line => ({
      id: crypto.randomUUID(),
      text: line,
      checked: false,
      timestamp: new Date().toISOString(),
      source: null,
      sourcePath: null,
      sourceScrollTop: null
    }));
    onItemsChange(prev => [...newItems.reverse(), ...prev]);
    setBulkText('');
    setBulkOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      addItem();
    }
  };

  const toggleCheck = (id) => {
    if (onToggleCheck) {
      onToggleCheck(id);
    } else {
      onItemsChange(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
    }
  };

  const removeItem = (id) => {
    onItemsChange(prev => prev.filter(i => i.id !== id));
  };

  const clearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    setConfirmClear(false);
    onItemsChange([]);
  };

  const handleSaveTelegramConfig = (itemId, telegramData) => {
    onItemsChange(prev => prev.map(i =>
      i.id === itemId ? { ...i, telegram: telegramData } : i
    ));
    setConfigItem(null);
  };

  const handleResetSent = (itemId) => {
    onItemsChange(prev => prev.map(i =>
      i.id === itemId ? { ...i, telegram: { ...i.telegram, sent: false } } : i
    ));
  };

  const btnStyle = {
    background: 'none',
    border: '1px solid var(--border-default)',
    borderRadius: '4px',
    padding: '4px 12px',
    color: 'var(--accent)',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0
  };

  const filterBtnStyle = (active) => ({
    background: active ? 'var(--accent-a12)' : 'none',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border-default)'}`,
    borderRadius: '4px',
    padding: '2px 8px',
    color: active ? 'var(--accent)' : 'var(--text-tertiary)',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    flexShrink: 0
  });

  // Colore icona Telegram in base allo stato
  const getTelegramIconColor = (item) => {
    if (item.telegram?.sent) return 'var(--color-success)';
    if (item.telegram?.enabled) return 'var(--accent)';
    return 'var(--text-disabled)';
  };

  return (
    <div ref={panelRef} style={{
      position: 'fixed',
      top: '40px',
      left: panelLeft !== null ? `${panelLeft}px` : '50%',
      transform: panelLeft !== null ? 'none' : 'translateX(-50%)',
      width: '450px',
      maxHeight: '70vh',
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-default)',
      borderRadius: '0 0 8px 8px',
      boxShadow: 'var(--shadow-dropdown)',
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        background: 'var(--bg-elevated)'
      }}>
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)' }}>
          ☐ Checklist
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {items.length > 0 && (
            <span
              onClick={clearAll}
              style={{
                fontSize: '11px',
                color: confirmClear ? 'var(--color-danger)' : 'var(--text-tertiary)',
                cursor: 'pointer',
                transition: 'color 0.2s',
                fontWeight: confirmClear ? '600' : 'normal'
              }}
              onMouseEnter={e => { if (!confirmClear) e.currentTarget.style.color = 'var(--color-danger)'; }}
              onMouseLeave={e => { if (!confirmClear) e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              {confirmClear ? 'Sicuro?' : 'Svuota tutto'}
            </span>
          )}
          <span className="close-btn" onClick={onClose}>✕</span>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        padding: '6px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        gap: '6px',
        flexShrink: 0
      }}>
        <button style={filterBtnStyle(filter === 'todo')} onClick={() => setFilter('todo')}>
          Da fare ({counts.todo})
        </button>
        <button style={filterBtnStyle(filter === 'done')} onClick={() => setFilter('done')}>
          Completate ({counts.done})
        </button>
        <button style={filterBtnStyle(filter === 'all')} onClick={() => setFilter('all')}>
          Tutte ({counts.all})
        </button>
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Aggiungi elemento..."
            style={{
              flex: 1,
              padding: '6px 10px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
          />
          <button
            onClick={addItem}
            style={btnStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'none'; }}
          >
            Aggiungi
          </button>
          <button
            onClick={() => setBulkOpen(!bulkOpen)}
            style={{ ...btnStyle, color: bulkOpen ? 'var(--accent-hover)' : 'var(--accent)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'none'; }}
            title="Incolla lista"
          >
            📋
          </button>
        </div>

        {/* Bulk paste area */}
        {bulkOpen && (
          <div style={{ marginTop: '8px' }}>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder="Incolla qui una lista — ogni riga diventa un elemento della checklist"
              rows={5}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              autoFocus
            />
            <button
              onClick={addBulk}
              style={{ ...btnStyle, marginTop: '6px', width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'none'; }}
            >
              Aggiungi tutto
            </button>
          </div>
        )}
      </div>

      {/* Items list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-disabled)', fontSize: '12px', fontStyle: 'italic' }}>
            {filter === 'todo' ? 'Nessun elemento da fare' : filter === 'done' ? 'Nessun elemento completato' : 'Nessun elemento'}
          </div>
        ) : (
          filtered.map(item => (
            <div key={item.id}>
              <div
                style={{
                  padding: '8px 14px',
                  borderBottom: item.telegram?.sent ? 'none' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background 0.1s',
                  opacity: item.checked ? 0.5 : 1
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover-subtle)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Checkbox */}
                <span
                  onClick={() => toggleCheck(item.id)}
                  style={{
                    width: '16px', height: '16px', flexShrink: 0,
                    border: `1px solid ${item.checked ? 'var(--accent)' : 'var(--text-muted-alt)'}`,
                    borderRadius: '3px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: item.checked ? 'var(--accent-a15)' : 'transparent',
                    transition: 'all 0.15s',
                    fontSize: '11px', color: 'var(--accent)', lineHeight: '1'
                  }}
                >
                  {item.checked ? '✓' : ''}
                </span>

                {/* Open source */}
                {item.sourcePath && onOpenSource ? (
                  <span
                    onClick={() => onOpenSource(item)}
                    title={`Apri ${item.source}`}
                    style={{
                      cursor: 'pointer', flexShrink: 0,
                      color: 'var(--accent)', transition: 'all 0.2s',
                      padding: '3px', borderRadius: '3px',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-hover)'; e.currentTarget.style.background = 'var(--accent-a12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <SquareArrowOutUpRight size={13} />
                  </span>
                ) : (
                  <span style={{ width: '19px', flexShrink: 0 }} />
                )}

                {/* Telegram config icon */}
                <span
                  onClick={() => setConfigItem(item)}
                  title={item.telegram?.sent ? 'Telegram: inviato' : item.telegram?.enabled ? 'Telegram: configurato' : 'Configura invio Telegram'}
                  style={{
                    cursor: 'pointer', flexShrink: 0,
                    color: getTelegramIconColor(item),
                    transition: 'all 0.2s',
                    padding: '3px', borderRadius: '3px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-a12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Send size={12} />
                </span>

                {/* Text + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.5',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    textDecoration: item.checked ? 'line-through' : 'none'
                  }}>
                    {item.text}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted-alt)' }}>
                      {formatTimestamp(item.timestamp)}
                    </span>
                    {item.source && (
                      <span style={{ fontSize: '10px', color: 'var(--text-disabled)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        da: {item.source}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <span className="close-btn" onClick={() => removeItem(item.id)}>✕</span>
              </div>

              {/* Sent indicator + reset */}
              {item.telegram?.sent && (
                <div style={{
                  padding: '4px 14px 6px 51px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  opacity: item.checked ? 0.5 : 1
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-success)' }}>Inviato via Telegram</span>
                  <button
                    onClick={() => handleResetSent(item.id)}
                    style={{
                      background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                      padding: '1px 6px', color: 'var(--text-secondary)', fontSize: '9px', cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    Reset invio
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Telegram config modal */}
      {configItem && (
        <TelegramConfigModal
          item={configItem}
          players={players || []}
          onSave={(data) => handleSaveTelegramConfig(configItem.id, data)}
          onCancel={() => setConfigItem(null)}
        />
      )}
    </div>
  );
}
