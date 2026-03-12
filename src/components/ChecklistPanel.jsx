import React, { useState, useRef, useEffect, useMemo } from 'react';
import { SquareArrowOutUpRight } from 'lucide-react';

function formatTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ChecklistPanel({ items, onItemsChange, onOpenSource, onClose }) {
  const [text, setText] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [filter, setFilter] = useState('todo'); // 'all' | 'todo' | 'done'
  const [panelLeft, setPanelLeft] = useState(null);
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

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      if (e.target.closest?.('[data-checklist-toggle]')) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

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
    onItemsChange(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const removeItem = (id) => {
    onItemsChange(prev => prev.filter(i => i.id !== id));
  };

  const clearAll = () => {
    if (!window.confirm('Sei sicuro? Tutti gli elementi verranno eliminati.')) return;
    onItemsChange([]);
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
                fontSize: '11px', color: 'var(--text-tertiary)', cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
            >
              Svuota tutto
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
            <div
              key={item.id}
              style={{
                padding: '8px 14px',
                borderBottom: '1px solid var(--border-subtle)',
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
          ))
        )}
      </div>
    </div>
  );
}
