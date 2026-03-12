import React, { useState, useCallback } from 'react';
import { getFileIcon } from '../utils/fileTypes';

export default function SlotPanel({ label, files, isActive, activeFileIndex, onClear, onRemoveFile, onRemoveFiles, onFileSelect }) {
  const [checkedPaths, setCheckedPaths] = useState(new Set());
  const hasChecked = checkedPaths.size > 0;

  const toggleCheck = useCallback((e, path) => {
    e.stopPropagation();
    setCheckedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleRemoveChecked = useCallback(() => {
    onRemoveFiles(label, Array.from(checkedPaths));
    setCheckedPaths(new Set());
  }, [label, checkedPaths, onRemoveFiles]);

  const handleClearAll = useCallback(() => {
    onClear();
    setCheckedPaths(new Set());
  }, [onClear]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#1e1b16',
      borderLeft: isActive ? '2px solid #c9a96e' : '2px solid transparent',
      transition: 'border-color 0.2s'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 10px',
        borderBottom: '1px solid #2a2520',
        flexShrink: 0,
        background: isActive ? '#252018' : 'transparent',
        gap: '6px'
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: isActive ? '#c9a96e' : '#8a7a60',
          flexShrink: 0
        }}>
          Slot {label}
        </span>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {/* Remove checked */}
          {hasChecked && (
            <ActionBtn
              title={`Rimuovi ${checkedPaths.size} selezionati`}
              onClick={handleRemoveChecked}
              color="#c97a6e"
            >
              −{checkedPaths.size}
            </ActionBtn>
          )}
          {/* Clear all */}
          {files.length > 0 && (
            <ActionBtn title="Svuota slot" onClick={handleClearAll} color="#6a5a40">✕</ActionBtn>
          )}
        </div>
      </div>

      {/* File list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {files.map((f, i) => {
          const isSelected = isActive && i === activeFileIndex;
          const isChecked = checkedPaths.has(f.path);
          return (
            <div
              key={f.path}
              onClick={() => onFileSelect(label, i)}
              style={{
                padding: '3px 6px 3px 10px',
                fontSize: '12px',
                cursor: 'pointer',
                color: isSelected ? '#c9a96e' : '#a09080',
                background: isSelected ? '#2a2520' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#201d18'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? '#2a2520' : 'transparent'; }}
            >
              {/* Checkbox */}
              <span
                onClick={(e) => toggleCheck(e, f.path)}
                style={{
                  width: '14px',
                  height: '14px',
                  border: `1px solid ${isChecked ? '#c9a96e' : '#3a3530'}`,
                  borderRadius: '2px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  color: '#c9a96e',
                  background: isChecked ? '#c9a96e20' : 'transparent',
                  cursor: 'pointer'
                }}
              >
                {isChecked ? '✓' : ''}
              </span>

              {/* Icon + name */}
              <span style={{ fontSize: '12px', flexShrink: 0 }}>{getFileIcon(f)}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.name.replace(/\.[^.]+$/, '')}
              </span>

              {/* Individual remove */}
              <span
                className="close-btn"
                onClick={(e) => { e.stopPropagation(); onRemoveFile(label, f.path); }}
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
            color: '#3a3530', fontSize: '11px'
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
