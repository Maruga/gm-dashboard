import React, { useState, useEffect, useCallback, useRef } from 'react';
import { renderMarkdown } from '../utils/markdownRenderer';

export default function GuidesPanel({ onClose }) {
  const [guides, setGuides] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const contentRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    (async () => {
      const list = await window.electronAPI.guidesList();
      setGuides(list || []);
      if (list?.length > 0) setSelectedId(list[0].id);
    })();
  }, []);

  // Chiudi su click esterno
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [onClose]);

  const selected = guides.find(g => g.id === selectedId) || null;

  const copyMarkdown = useCallback(async (guide) => {
    if (!guide) return;
    try {
      await navigator.clipboard.writeText(guide.content);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = guide.content;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (__) {}
      document.body.removeChild(ta);
    }
    setCopiedId(guide.id);
    setTimeout(() => setCopiedId(prev => prev === guide.id ? null : prev), 1500);
  }, []);

  // Scroll to top quando cambia guida
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [selectedId]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--overlay-medium)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
    }}>
      <div
        ref={panelRef}
        style={{
          width: 'min(960px, 94vw)', height: 'min(720px, 88vh)',
          background: 'var(--bg-panel)', border: '1px solid var(--border-default)',
          borderRadius: '8px', boxShadow: 'var(--shadow-panel)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)', flexShrink: 0
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Guide Dashboard
          </span>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '16px' }}>✕</span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Lista guide */}
          <div style={{
            width: '200px', flexShrink: 0, borderRight: '1px solid var(--border-subtle)',
            overflowY: 'auto', padding: '8px 0'
          }}>
            {guides.map(g => (
              <div
                key={g.id}
                onClick={() => setSelectedId(g.id)}
                style={{
                  padding: '8px 16px', fontSize: '12px', cursor: 'pointer',
                  color: g.id === selectedId ? 'var(--accent)' : 'var(--text-secondary)',
                  background: g.id === selectedId ? 'var(--accent-a04)' : 'transparent',
                  borderLeft: g.id === selectedId ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'all 0.15s', fontWeight: g.id === selectedId ? '600' : '400'
                }}
                onMouseEnter={e => { if (g.id !== selectedId) e.currentTarget.style.background = 'var(--bg-hover-subtle)'; }}
                onMouseLeave={e => { if (g.id !== selectedId) e.currentTarget.style.background = 'transparent'; }}
              >
                {g.title}
              </div>
            ))}
          </div>

          {/* Contenuto */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              ref={contentRef}
              className="viewer-content"
              style={{
                flex: 1, overflowY: 'auto', padding: '16px 24px',
                fontSize: '13px', lineHeight: '1.7', color: 'var(--text-primary)'
              }}
              dangerouslySetInnerHTML={{ __html: selected ? renderMarkdown(selected.content) : '' }}
            />
            {/* Footer: copia markdown */}
            {selected && (
              <div style={{
                padding: '8px 18px', borderTop: '1px solid var(--border-subtle)',
                display: 'flex', justifyContent: 'flex-end', flexShrink: 0
              }}>
                <button
                  onClick={() => copyMarkdown(selected)}
                  style={{
                    background: 'none',
                    border: `1px solid ${copiedId === selected.id ? 'var(--color-success)' : 'var(--border-default)'}`,
                    borderRadius: '4px', padding: '5px 14px',
                    color: copiedId === selected.id ? 'var(--color-success)' : 'var(--text-secondary)',
                    fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
                  }}
                >
                  {copiedId === selected.id ? '✓ Copiato' : '📋 Copia markdown (per prompt AI)'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
