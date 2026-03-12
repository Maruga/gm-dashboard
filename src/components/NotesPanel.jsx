import React, { useState, useRef, useEffect } from 'react';
import { SquareArrowOutUpRight } from 'lucide-react';

function formatTimestamp(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NotesPanel({ notes, onNotesChange, onOpenSource, onClose }) {
  const [text, setText] = useState('');
  const [panelLeft, setPanelLeft] = useState(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Position panel under the 📝 Note button
  useEffect(() => {
    const btn = document.querySelector('[data-notes-toggle]');
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const left = Math.max(8, rect.left + rect.width / 2 - 200);
      setPanelLeft(left);
    }
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      if (e.target.closest?.('[data-notes-toggle]')) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const addNote = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const note = {
      id: crypto.randomUUID(),
      text: trimmed,
      timestamp: new Date().toISOString(),
      source: null
    };
    onNotesChange(prev => [note, ...prev]);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  };

  const removeNote = (id) => {
    onNotesChange(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    if (!window.confirm('Sei sicuro? Tutte le note verranno eliminate.')) return;
    onNotesChange([]);
  };

  return (
    <div ref={panelRef} style={{
      position: 'fixed',
      top: '40px',
      left: panelLeft !== null ? `${panelLeft}px` : '50%',
      transform: panelLeft !== null ? 'none' : 'translateX(-50%)',
      width: '400px',
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
          📝 Note
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {notes.length > 0 && (
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

      {/* Input */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Aggiungi una nota..."
            rows={2}
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
              boxSizing: 'border-box',
              resize: 'none'
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
          />
          <button
            onClick={addNote}
            style={{
              background: 'none',
              border: '1px solid var(--border-default)',
              borderRadius: '4px',
              padding: '4px 12px',
              color: 'var(--accent)',
              fontSize: '11px',
              cursor: 'pointer',
              alignSelf: 'flex-end',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'none'; }}
          >
            Aggiungi
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {notes.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-disabled)', fontSize: '12px', fontStyle: 'italic' }}>
            Nessuna nota
          </div>
        ) : (
          notes.map(note => (
            <div
              key={note.id}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover-subtle)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Left: open source link */}
              {note.sourcePath && onOpenSource ? (
                <span
                  onClick={() => onOpenSource(note)}
                  title={`Apri ${note.source}`}
                  style={{
                    cursor: 'pointer', flexShrink: 0,
                    color: 'var(--accent)', transition: 'all 0.2s',
                    padding: '3px', borderRadius: '3px',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-hover)'; e.currentTarget.style.background = 'var(--accent-a12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <SquareArrowOutUpRight size={14} />
                </span>
              ) : (
                <span style={{ width: '20px', flexShrink: 0 }} />
              )}

              {/* Center: text + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.5',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  marginBottom: '3px'
                }}>
                  {note.text}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted-alt)' }}>
                    {formatTimestamp(note.timestamp)}
                  </span>
                  {note.source && (
                    <span style={{ fontSize: '10px', color: 'var(--text-disabled)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      da: {note.source}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: delete */}
              <span className="close-btn" onClick={() => removeNote(note.id)}>✕</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
