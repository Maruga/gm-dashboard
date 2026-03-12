import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { renderMarkdown } from '../utils/markdownRenderer';

function highlightSearch(html, query) {
  if (!query || query.length < 2 || !html) return { html, count: 0 };
  const qLower = query.toLowerCase();
  const parts = html.split(/(<[^>]+>)/);
  let count = 0;
  const processed = parts.map(part => {
    if (part.startsWith('<')) return part;
    const lower = part.toLowerCase();
    let result = '';
    let lastPos = 0;
    let pos = 0;
    while ((pos = lower.indexOf(qLower, lastPos)) !== -1) {
      result += part.substring(lastPos, pos);
      result += `<mark data-ref-hl="${count}" style="background:rgba(201,169,110,0.35);color:inherit;padding:0 1px;border-radius:2px">${part.substring(pos, pos + query.length)}</mark>`;
      count++;
      lastPos = pos + query.length;
    }
    result += part.substring(lastPos);
    return result;
  });
  return { html: processed.join(''), count };
}

export default function QuickReference({ manuals, projectPath, scrollPositions, onScrollPositionsChange, selectedManualId, onSelectedChange, onClose }) {
  const [renderedHtml, setRenderedHtml] = useState('');
  const [headings, setHeadings] = useState([]);
  const [activeHeading, setActiveHeading] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const contentRef = useRef(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const scrollSaveRef = useRef(null);

  const selected = manuals.find(m => m.id === selectedManualId) || manuals[0] || null;

  // Load file content when selected manual changes
  useEffect(() => {
    if (!selected) { setRenderedHtml(''); return; }
    const fullPath = projectPath + '/' + selected.file;
    // Save scroll before switching
    if (scrollSaveRef.current && contentRef.current) {
      const oldId = scrollSaveRef.current;
      onScrollPositionsChange(prev => ({ ...prev, [oldId]: contentRef.current.scrollTop }));
    }
    scrollSaveRef.current = selected.id;

    window.electronAPI.readFile(fullPath.replace(/\//g, '\\')).then(text => {
      if (!text) {
        setRenderedHtml('<div style="padding:20px;color:#c96e6e;font-style:italic">File non trovato</div>');
        return;
      }
      const ext = selected.file.split('.').pop().toLowerCase();
      if (ext === 'md') {
        setRenderedHtml(renderMarkdown(text));
      } else if (ext === 'html' || ext === 'htm') {
        setRenderedHtml(text);
      } else {
        setRenderedHtml(`<pre style="white-space:pre-wrap;font-family:'Courier New',monospace;color:#d4c5a9">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`);
      }
      // Restore scroll position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (contentRef.current) {
            contentRef.current.scrollTop = scrollPositions[selected.id] || 0;
          }
        });
      });
    });
    setSearchQuery('');
    setDebouncedQuery('');
  }, [selected?.id, projectPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract headings from rendered content
  useEffect(() => {
    const container = contentRef.current;
    if (!container) { setHeadings([]); return; }
    const extract = () => {
      const els = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (els.length === 0) { setHeadings([]); return; }
      const levels = [...new Set(Array.from(els).map(el => parseInt(el.tagName[1])))].sort();
      const primary = levels[0];
      const secondary = levels[1] || null;
      setHeadings(Array.from(els)
        .filter(el => { const l = parseInt(el.tagName[1]); return l === primary || l === secondary; })
        .map((el, i) => ({ id: i, level: parseInt(el.tagName[1]) === primary ? 1 : 2, text: el.textContent, element: el }))
      );
    };
    extract();
    const obs = new MutationObserver(extract);
    obs.observe(container, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [renderedHtml]);

  // Track active heading on scroll
  useEffect(() => {
    const container = contentRef.current;
    if (!container || headings.length === 0) return;
    const onScroll = () => {
      const top = container.getBoundingClientRect().top;
      let active = -1;
      for (let i = 0; i < headings.length; i++) {
        if (headings[i].element.getBoundingClientRect().top - top <= 40) active = i;
        else break;
      }
      setActiveHeading(active);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, [headings]);

  // Save scroll on scroll
  const handleContentScroll = useCallback(() => {
    if (selected && contentRef.current) {
      onScrollPositionsChange(prev => ({ ...prev, [selected.id]: contentRef.current.scrollTop }));
    }
  }, [selected, onScrollPositionsChange]);

  // Debounce search
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val.trim()), 400);
  }, []);

  // Apply search highlights
  const { displayHtml, matchCount } = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return { displayHtml: renderedHtml, matchCount: 0 };
    const result = highlightSearch(renderedHtml, debouncedQuery);
    return { displayHtml: result.html, matchCount: result.count };
  }, [renderedHtml, debouncedQuery]);

  // Scroll to first match
  useEffect(() => {
    if (matchCount > 0 && contentRef.current) {
      requestAnimationFrame(() => {
        const mark = contentRef.current.querySelector('mark[data-ref-hl="0"]');
        if (mark) mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    }
  }, [matchCount, debouncedQuery]);

  // Esc to close, Ctrl+F to focus search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); e.preventDefault(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Save scroll on close
  useEffect(() => {
    return () => {
      if (scrollSaveRef.current && contentRef.current) {
        onScrollPositionsChange(prev => ({ ...prev, [scrollSaveRef.current]: contentRef.current.scrollTop }));
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 3500,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '85vw', height: '85vh',
          background: '#1e1b16',
          border: '1px solid #3a3530',
          borderRadius: '8px',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid #3a3530',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: '#252018'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#c9a96e', letterSpacing: '1px' }}>
            Manuali di Riferimento
          </span>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '16px' }}>✕</span>
        </div>

        {/* 3-column layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Column 1: Manual list */}
          <div style={{
            width: '140px', flexShrink: 0, borderRight: '1px solid #2a2520',
            display: 'flex', flexDirection: 'column', overflowY: 'auto'
          }}>
            <div style={{
              padding: '8px 10px', fontSize: '10px', fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '1.2px', color: '#c9a96e',
              borderBottom: '1px solid #2a2520', flexShrink: 0
            }}>Manuali</div>
            {manuals.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: '11px', color: '#4a4035', fontStyle: 'italic' }}>
                Nessun manuale — vai in Impostazioni
              </div>
            ) : (
              manuals.map(m => {
                const isSel = m.id === selected?.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectedChange(m.id)}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      background: isSel ? 'rgba(201,169,110,0.1)' : 'transparent',
                      borderLeft: isSel ? '3px solid #c9a96e' : '3px solid transparent',
                      color: isSel ? '#c9a96e' : '#d4c5a9',
                      fontSize: '12px',
                      fontWeight: isSel ? '600' : '400',
                      transition: 'all 0.15s',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#222018'; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isSel ? 'rgba(201,169,110,0.1)' : 'transparent'; }}
                    title={m.name}
                  >
                    {m.name}
                  </div>
                );
              })
            )}
          </div>

          {/* Column 2: TOC + Search */}
          <div style={{
            width: '220px', flexShrink: 0, borderRight: '1px solid #2a2520',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            {/* TOC */}
            <div style={{
              padding: '8px 10px', fontSize: '10px', fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '1.2px', color: '#c9a96e',
              borderBottom: '1px solid #2a2520', flexShrink: 0
            }}>Indice</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
              {headings.length === 0 ? (
                <div style={{ padding: '8px 10px', fontSize: '11px', color: '#4a4035', fontStyle: 'italic' }}>
                  {selected ? 'Nessun heading' : 'Seleziona un manuale'}
                </div>
              ) : (
                headings.map((h, i) => (
                  <div
                    key={h.id}
                    onClick={() => h.element.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    style={{
                      padding: '3px 10px',
                      paddingLeft: h.level === 2 ? '22px' : '10px',
                      fontSize: h.level === 1 ? '12px' : '11px',
                      fontWeight: h.level === 1 ? '600' : '400',
                      color: i === activeHeading ? '#c9a96e' : '#d4c5a9',
                      cursor: 'pointer',
                      lineHeight: '1.6',
                      borderLeft: i === activeHeading ? '2px solid #c9a96e' : '2px solid transparent',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { if (i !== activeHeading) e.currentTarget.style.color = '#c9a96e'; }}
                    onMouseLeave={e => { if (i !== activeHeading) e.currentTarget.style.color = '#d4c5a9'; }}
                  >
                    {h.text}
                  </div>
                ))
              )}
            </div>

            {/* Search */}
            <div style={{
              borderTop: '1px solid #2a2520', padding: '8px 10px', flexShrink: 0
            }}>
              <div style={{ position: 'relative' }}>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Cerca nel manuale..."
                  style={{
                    width: '100%', background: '#141210', border: '1px solid #3a3530',
                    borderRadius: '4px', padding: '6px 26px 6px 8px', color: '#d4c5a9',
                    fontSize: '11px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#c9a96e'}
                  onBlur={e => e.currentTarget.style.borderColor = '#3a3530'}
                />
                {searchQuery && (
                  <span
                    className="close-btn"
                    onClick={() => { setSearchQuery(''); setDebouncedQuery(''); }}
                    style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px' }}
                  >✕</span>
                )}
              </div>
              {debouncedQuery.length >= 2 && (
                <div style={{ fontSize: '10px', color: '#6a5a40', marginTop: '4px' }}>
                  {matchCount > 0
                    ? <><span style={{ color: '#c9a96e', fontWeight: '600' }}>{matchCount}</span> risultat{matchCount === 1 ? 'o' : 'i'}</>
                    : 'Nessun risultato'
                  }
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {selected ? (
              <div
                ref={contentRef}
                onScroll={handleContentScroll}
                className="viewer-content"
                style={{
                  flex: 1, overflowY: 'auto',
                  padding: '24px 32px',
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontSize: '15px', lineHeight: '1.7', color: '#d4c5a9'
                }}
                dangerouslySetInnerHTML={{ __html: displayHtml }}
              />
            ) : (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#4a4035', fontSize: '13px', fontStyle: 'italic'
              }}>
                {manuals.length === 0 ? 'Configura i manuali nelle Impostazioni' : 'Seleziona un manuale'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
