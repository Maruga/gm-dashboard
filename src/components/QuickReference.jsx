import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { renderMarkdown } from '../utils/markdownRenderer';
import { applyKeywordHighlightsToHtml, prepareHtmlForSrcdoc } from '../utils/htmlHelpers';

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
      result += `<mark data-ref-hl="${count}" style="background:var(--accent-a35);color:inherit;padding:0 1px;border-radius:2px">${part.substring(pos, pos + query.length)}</mark>`;
      count++;
      lastPos = pos + query.length;
    }
    result += part.substring(lastPos);
    return result;
  });
  return { html: processed.join(''), count };
}

export default function QuickReference({ manuals, projectPath, scrollPositions, onScrollPositionsChange, selectedManualId, onSelectedChange, onClose, highlightKeywords }) {
  const [renderedHtml, setRenderedHtml] = useState('');
  const [isHtmlFile, setIsHtmlFile] = useState(false);
  const [headings, setHeadings] = useState([]);
  const [activeHeading, setActiveHeading] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const contentRef = useRef(null);
  const iframeRef = useRef(null);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const scrollSaveRef = useRef(null);
  const headingsRef = useRef([]);
  headingsRef.current = headings;

  const selected = manuals.find(m => m.id === selectedManualId) || manuals[0] || null;

  // Load file content when selected manual changes
  useEffect(() => {
    if (!selected) { setRenderedHtml(''); return; }
    const fullPath = projectPath + '/' + selected.file;
    // Save scroll before switching
    if (scrollSaveRef.current) {
      const oldId = scrollSaveRef.current;
      try {
        const scrollY = iframeRef.current?.contentWindow?.scrollY;
        if (scrollY != null) {
          onScrollPositionsChange(prev => ({ ...prev, [oldId]: scrollY }));
        } else if (contentRef.current) {
          onScrollPositionsChange(prev => ({ ...prev, [oldId]: contentRef.current.scrollTop }));
        }
      } catch (_) {
        if (contentRef.current) {
          onScrollPositionsChange(prev => ({ ...prev, [oldId]: contentRef.current.scrollTop }));
        }
      }
    }
    scrollSaveRef.current = selected.id;

    const ext = selected.file.split('.').pop().toLowerCase();
    if (ext === 'html' || ext === 'htm') {
      // HTML files: read content for srcdoc (CSS isolation + highlights + TOC)
      setIsHtmlFile(true);
      setRenderedHtml('');
      setHeadings([]);
      const normalizedPath = fullPath.replace(/\//g, '\\');
      window.electronAPI.readFile(normalizedPath).then(rawHtml => {
        if (!rawHtml) {
          setRenderedHtml('<div style="padding:20px;color:var(--color-danger);font-style:italic">File non trovato</div>');
          setIsHtmlFile(false);
          return;
        }
        let processed = prepareHtmlForSrcdoc(rawHtml, normalizedPath);

        // Add data attributes to headings for TOC navigation and extract heading texts
        let headingIdx = 0;
        const extractedHeadings = [];
        processed = processed.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, content) => {
          const text = content.replace(/<[^>]+>/g, '').trim();
          const idx = headingIdx++;
          if (text) extractedHeadings.push({ id: idx, level: parseInt(level), text });
          return `<h${level}${attrs} data-qr-heading="${idx}">${content}</h${level}>`;
        });

        // Normalize heading levels for TOC (show only top 2 levels)
        if (extractedHeadings.length > 0) {
          const levels = [...new Set(extractedHeadings.map(h => h.level))].sort();
          const primary = levels[0];
          const secondary = levels[1] || null;
          setHeadings(extractedHeadings
            .filter(h => h.level === primary || h.level === secondary)
            .map(h => ({ ...h, level: h.level === primary ? 1 : 2 }))
          );
        } else {
          setHeadings([]);
        }

        setRenderedHtml(processed);
      });
    } else {
      setIsHtmlFile(false);
      window.electronAPI.readFile(fullPath.replace(/\//g, '\\')).then(text => {
        if (!text) {
          setRenderedHtml('<div style="padding:20px;color:var(--color-danger);font-style:italic">File non trovato</div>');
          return;
        }
        if (ext === 'md') {
          setRenderedHtml(renderMarkdown(text));
        } else {
          setRenderedHtml(`<pre style="white-space:pre-wrap;font-family:'Courier New',monospace;color:var(--text-primary)">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`);
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
    }
    setSearchQuery('');
    setDebouncedQuery('');
  }, [selected?.id, projectPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract headings from rendered content (non-HTML; HTML headings extracted in file loader)
  useEffect(() => {
    if (isHtmlFile) return;
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
  }, [renderedHtml, isHtmlFile]);

  // Track active heading on scroll (non-HTML only; iframe tracking in handleIframeLoad)
  useEffect(() => {
    if (headings.length === 0 || isHtmlFile) return;

    const container = contentRef.current;
    if (!container) return;
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
  }, [headings, isHtmlFile]);

  // Save scroll on scroll
  const handleContentScroll = useCallback(() => {
    if (selected && contentRef.current) {
      onScrollPositionsChange(prev => ({ ...prev, [selected.id]: contentRef.current.scrollTop }));
    }
  }, [selected, onScrollPositionsChange]);

  // iframe load handler for HTML files (srcdoc: same-origin, always accessible)
  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !selected) return;
    try {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) return;

      // Check for search highlight to scroll to
      const searchMark = iframeDoc.querySelector('mark[data-ref-hl="0"]');
      if (searchMark) {
        setTimeout(() => {
          searchMark.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 100);
      } else {
        // Restore scroll position
        const targetScroll = scrollPositions[selected.id] || 0;
        setTimeout(() => {
          iframe.contentWindow.scrollTo(0, targetScroll);
        }, 50);
      }

      // Attach scroll listener for saving position + active heading tracking
      iframe.contentWindow.addEventListener('scroll', () => {
        if (selected) {
          onScrollPositionsChange(prev => ({ ...prev, [selected.id]: iframe.contentWindow.scrollY }));
        }
        // Track active heading for TOC sidebar
        const currentHeadings = headingsRef.current;
        if (currentHeadings.length > 0) {
          let active = -1;
          for (let i = 0; i < currentHeadings.length; i++) {
            const el = iframeDoc.querySelector(`[data-qr-heading="${currentHeadings[i].id}"]`);
            if (el && el.getBoundingClientRect().top <= 40) active = i;
            else if (el) break;
          }
          setActiveHeading(active);
        }
      }, { passive: true });
    } catch (e) { console.warn('QR iframe load:', e.message); }
  }, [selected, scrollPositions, onScrollPositionsChange]);

  // Debounce search
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(val.trim()), 400);
  }, []);

  // Keyword highlighting (HTML string pipeline)
  const kwEnabled = highlightKeywords?.enabled && highlightKeywords?.words?.length > 0;
  const kwWords = highlightKeywords?.words;
  const kwVersion = kwEnabled ? kwWords.map(w => w.text + w.color).join('|') : '';

  const kwHtml = useMemo(() => {
    if (!kwEnabled || !renderedHtml) return renderedHtml;
    return applyKeywordHighlightsToHtml(renderedHtml, kwWords);
  }, [renderedHtml, kwEnabled, kwVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply search highlights (on top of keyword highlights)
  const { displayHtml, matchCount } = useMemo(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) return { displayHtml: kwHtml, matchCount: 0 };
    const result = highlightSearch(kwHtml, debouncedQuery);
    return { displayHtml: result.html, matchCount: result.count };
  }, [kwHtml, debouncedQuery]);

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
      if (!scrollSaveRef.current) return;
      // Try iframe first, then container
      try {
        const scrollY = iframeRef.current?.contentWindow?.scrollY;
        if (scrollY != null) {
          onScrollPositionsChange(prev => ({ ...prev, [scrollSaveRef.current]: scrollY }));
          return;
        }
      } catch (_) { /* cross-origin: atteso */ }
      if (contentRef.current) {
        onScrollPositionsChange(prev => ({ ...prev, [scrollSaveRef.current]: contentRef.current.scrollTop }));
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--overlay-medium)',
        zIndex: 3500,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '85vw', height: '85vh',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: 'var(--bg-elevated)'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)', letterSpacing: '1px' }}>
            Manuali di Riferimento
          </span>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '16px' }}>✕</span>
        </div>

        {/* 3-column layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Column 1: Manual list */}
          <div style={{
            width: '140px', flexShrink: 0, borderRight: '1px solid var(--border-subtle)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto'
          }}>
            <div style={{
              padding: '8px 10px', fontSize: '10px', fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--accent)',
              borderBottom: '1px solid var(--border-subtle)', flexShrink: 0
            }}>Manuali</div>
            {manuals.length === 0 ? (
              <div style={{ padding: '12px 10px', fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
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
                      background: isSel ? 'var(--accent-a10)' : 'transparent',
                      borderLeft: isSel ? '3px solid var(--accent)' : '3px solid transparent',
                      color: isSel ? 'var(--accent)' : 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: isSel ? '600' : '400',
                      transition: 'all 0.15s',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-hover-subtle)'; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = isSel ? 'var(--accent-a10)' : 'transparent'; }}
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
            width: '220px', flexShrink: 0, borderRight: '1px solid var(--border-subtle)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            {/* TOC */}
            <div style={{
              padding: '8px 10px', fontSize: '10px', fontWeight: '600',
              textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--accent)',
              borderBottom: '1px solid var(--border-subtle)', flexShrink: 0
            }}>Indice</div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
              {headings.length === 0 ? (
                <div style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                  {selected ? 'Nessun heading' : 'Seleziona un manuale'}
                </div>
              ) : (
                headings.map((h, i) => (
                  <div
                    key={h.id}
                    onClick={() => {
                      if (h.element) {
                        h.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      } else if (isHtmlFile && iframeRef.current?.contentDocument) {
                        const el = iframeRef.current.contentDocument.querySelector(`[data-qr-heading="${h.id}"]`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    style={{
                      padding: '3px 10px',
                      paddingLeft: h.level === 2 ? '22px' : '10px',
                      fontSize: h.level === 1 ? '12px' : '11px',
                      fontWeight: h.level === 1 ? '600' : '400',
                      color: i === activeHeading ? 'var(--accent)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      lineHeight: '1.6',
                      borderLeft: i === activeHeading ? '2px solid var(--accent)' : '2px solid transparent',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { if (i !== activeHeading) e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { if (i !== activeHeading) e.currentTarget.style.color = 'var(--text-primary)'; }}
                  >
                    {h.text}
                  </div>
                ))
              )}
            </div>

            {/* Search */}
            <div style={{
              borderTop: '1px solid var(--border-subtle)', padding: '8px 10px', flexShrink: 0
            }}>
              <div style={{ position: 'relative' }}>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Cerca nel manuale..."
                  style={{
                    width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                    borderRadius: '4px', padding: '6px 26px 6px 8px', color: 'var(--text-primary)',
                    fontSize: '11px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
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
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                  {matchCount > 0
                    ? <><span style={{ color: 'var(--accent)', fontWeight: '600' }}>{matchCount}</span> risultat{matchCount === 1 ? 'o' : 'i'}</>
                    : 'Nessun risultato'
                  }
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Content */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {selected ? (
              isHtmlFile ? (
                <iframe
                  ref={iframeRef}
                  srcdoc={displayHtml}
                  onLoad={handleIframeLoad}
                  style={{ flex: 1, width: '100%', border: 'none' }}
                  sandbox="allow-same-origin"
                />
              ) : (
                <div
                  ref={contentRef}
                  onScroll={handleContentScroll}
                  className="viewer-content"
                  style={{
                    flex: 1, overflowY: 'auto',
                    padding: '24px 32px',
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    fontSize: '15px', lineHeight: '1.7', color: 'var(--text-primary)'
                  }}
                  dangerouslySetInnerHTML={{ __html: displayHtml }}
                />
              )
            ) : (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-disabled)', fontSize: '13px', fontStyle: 'italic'
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
