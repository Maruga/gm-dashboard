import React, { useState, useCallback } from 'react';
import { getFileIcon } from '../utils/fileTypes';

function itemKey(f) {
  return f.type === 'snippet' ? f.id : f.path;
}

export default function SlotPanel({ label, files, isActive, activeFileIndex, onClear, onRemoveFile, onRemoveFiles, onFileSelect }) {
  const [checkedKeys, setCheckedKeys] = useState(new Set());
  const hasChecked = checkedKeys.size > 0;

  const toggleCheck = useCallback((e, key) => {
    e.stopPropagation();
    setCheckedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleRemoveChecked = useCallback(() => {
    onRemoveFiles(label, Array.from(checkedKeys));
    setCheckedKeys(new Set());
  }, [label, checkedKeys, onRemoveFiles]);

  const handleClearAll = useCallback(() => {
    onClear();
    setCheckedKeys(new Set());
  }, [onClear]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-panel)',
      borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
      transition: 'border-color 0.2s'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 10px',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        background: isActive ? 'var(--bg-elevated)' : 'transparent',
        gap: '6px'
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
          flexShrink: 0
        }}>
          Slot {label}
        </span>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {hasChecked && (
            <ActionBtn
              title={`Rimuovi ${checkedKeys.size} selezionati`}
              onClick={handleRemoveChecked}
              color="var(--color-danger)"
            >
              −{checkedKeys.size}
            </ActionBtn>
          )}
          {files.length > 0 && (
            <ActionBtn title="Svuota slot" onClick={handleClearAll} color="var(--text-tertiary)">✕</ActionBtn>
          )}
        </div>
      </div>

      {/* Items list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {files.map((f, i) => {
          const isSnippet = f.type === 'snippet';
          const key = itemKey(f);
          const isSelected = isActive && i === activeFileIndex;
          const isChecked = checkedKeys.has(key);
          const sourceName = isSnippet && f.source ? f.source : null;
          return (
            <div
              key={key}
              onClick={() => onFileSelect(label, i)}
              style={{
                padding: isSnippet ? '4px 6px 4px 10px' : '3px 6px 3px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                color: isSelected ? 'var(--accent)' : 'var(--text-secondary-light)',
                background: isSelected ? 'var(--bg-hover-strong)' : 'transparent',
                display: 'flex',
                alignItems: isSnippet ? 'flex-start' : 'center',
                gap: '4px',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover-subtle)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'var(--bg-hover-strong)' : 'transparent'; }}
            >
              {/* Checkbox */}
              <span
                onClick={(e) => toggleCheck(e, key)}
                style={{
                  width: '14px',
                  height: '14px',
                  border: isChecked ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                  borderRadius: '2px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  color: 'var(--accent)',
                  background: isChecked ? 'var(--accent-a12)' : 'transparent',
                  cursor: 'pointer',
                  marginTop: isSnippet ? '1px' : '0'
                }}
              >
                {isChecked ? '✓' : ''}
              </span>

              {isSnippet ? (
                /* Snippet item */
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', flexShrink: 0 }}>✂️</span>
                    <span style={{
                      flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontStyle: 'italic', fontSize: '11px'
                    }}>
                      "{f.title}"
                    </span>
                  </div>
                  {sourceName && (
                    <div style={{
                      fontSize: '9px', color: 'var(--text-disabled)',
                      paddingLeft: '19px', marginTop: '1px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      da: {sourceName}
                    </div>
                  )}
                </div>
              ) : (
                /* File item */
                <>
                  <span style={{ fontSize: '12px', flexShrink: 0 }}>{getFileIcon(f)}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name.replace(/\.[^.]+$/, '')}
                  </span>
                </>
              )}

              {/* Individual remove */}
              <span
                className="close-btn"
                onClick={(e) => { e.stopPropagation(); onRemoveFile(label, key); }}
                style={{ fontSize: '13px', flexShrink: 0 }}
                title="Rimuovi"
              >
                ✕
              </span>
            </div>
          );
        })}
        {files.length === 0 && (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--border-default)', fontSize: '11px'
          }}>
            Vuoto
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ children, onClick, title, color }) {
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={title}
      style={{
        cursor: 'pointer',
        fontSize: '12px',
        color,
        padding: '1px 5px',
        borderRadius: '3px',
        border: `1px solid ${color}40`,
        lineHeight: '1.2',
        transition: 'background 0.1s'
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${color}15`}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {children}
    </span>
  );
}
