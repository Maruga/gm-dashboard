import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

// Polyfill: pdfjs-dist v5 usa getOrInsertComputed (Chrome 134+),
// Electron 40 ha Chromium 132 che non lo supporta
if (!Map.prototype.getOrInsertComputed) {
  Map.prototype.getOrInsertComputed = function(key, callbackFn) {
    if (this.has(key)) return this.get(key);
    const value = callbackFn(key);
    this.set(key, value);
    return value;
  };
}

import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { useScrollMemory } from '../hooks/useScrollMemory';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/* ------------------------------------------------------------------ */
/*  Single PDF page – self-contained canvas render                    */
/* ------------------------------------------------------------------ */
function PdfPage({ pdf, pageNum, scale }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const [renderError, setRenderError] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pdf) return;

    // Cancel any in-progress render on this canvas
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }
    setRenderError(null);

    let cancelled = false;

    (async () => {
      try {
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';

        const renderTask = page.render({
          canvasContext: canvas.getContext('2d'),
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`PDF page ${pageNum} render failed:`, err);
          setRenderError(err?.message || 'Errore rendering');
        }
      }
    })();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdf, pageNum, scale]);

  return (
    <div
      data-page-num={pageNum}
      style={{
        margin: '0 auto 12px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
        background: '#fff',
        lineHeight: 0
      }}
    >
      <canvas ref={canvasRef} />
      {renderError && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'red', fontSize: '11px', padding: '8px',
          textAlign: 'center', background: 'rgba(255,255,255,0.85)'
        }}>
          {renderError}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PDF Viewer – canvas per page, no pdf_viewer.css                   */
/* ------------------------------------------------------------------ */
const PdfViewer = forwardRef(function PdfViewer({
  filePath, fontSize, searchHighlight, highlightKeywords,
  scrollMapRef, onScrollChanged, scrollKeyPrefix,
  searchOpen, onSearchClose, onOutlineReady
}, ref) {
  const containerRef = useRef(null);
  const pdfDocRef = useRef(null);
  const currentPathRef = useRef(null);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);   // triggers child renders
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchIdx, setSearchIdx] = useState(-1);
  const searchInputRef = useRef(null);
  const resultsListRef = useRef(null);
  const pageTextsRef = useRef([]);

  const { saveScroll, getScroll } = useScrollMemory(scrollMapRef, onScrollChanged);

  const makeKey = useCallback((fp) => {
    return scrollKeyPrefix ? `${scrollKeyPrefix}:${fp}` : fp;
  }, [scrollKeyPrefix]);

  useImperativeHandle(ref, () => containerRef.current);

  /* ---------- compute scale ---------- */
  const scale = (() => {
    const computedScale = parseFloat(
      (typeof document !== 'undefined'
        ? getComputedStyle(document.documentElement).getPropertyValue('--font-size-scale')
        : '1') || '1'
    );
    return ((fontSize || 15) / 15) * computedScale * 1.3;
  })();

  /* ---------- Load PDF ---------- */
  useEffect(() => {
    if (!filePath) return;
    let cancelled = false;

    setError(null);
    setLoading(true);
    setPdfDoc(null);
    setTotalPages(0);
    setCurrentPage(1);
    setPageInput('1');
    setSearchQuery('');
    setSearchResults([]);
    setSearchIdx(-1);
    pageTextsRef.current = [];
    if (onOutlineReady) onOutlineReady(null);

    // Save scroll of previous file
    if (currentPathRef.current && containerRef.current) {
      saveScroll(makeKey(currentPathRef.current), containerRef.current.scrollTop);
    }
    currentPathRef.current = filePath;

    // Cleanup previous
    if (pdfDocRef.current) {
      try { pdfDocRef.current.destroy(); } catch (_) {}
      pdfDocRef.current = null;
    }

    (async () => {
      try {
        const data = await window.electronAPI.readFileBinary(filePath);
        if (cancelled) return;
        if (!data) throw new Error('Impossibile leggere il file');

        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
        if (cancelled) { pdf.destroy(); return; }

        pdfDocRef.current = pdf;
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setLoading(false);

        // Estrai outline/segnalibri del PDF
        if (onOutlineReady) {
          try {
            const outline = await pdf.getOutline();
            if (cancelled) return;
            if (outline && outline.length > 0) {
              const items = [];
              const flatten = async (entries, level) => {
                for (const entry of entries) {
                  let pageNum = 1;
                  try {
                    if (entry.dest) {
                      const dest = typeof entry.dest === 'string'
                        ? await pdf.getDestination(entry.dest)
                        : entry.dest;
                      if (dest && dest[0]) {
                        const pageIndex = await pdf.getPageIndex(dest[0]);
                        pageNum = pageIndex + 1;
                      }
                    }
                  } catch (_) {}
                  items.push({ title: entry.title, page: pageNum, level });
                  if (entry.items && entry.items.length > 0) {
                    await flatten(entry.items, level + 1);
                  }
                }
              };
              await flatten(outline, 1);
              if (!cancelled) onOutlineReady(items);
            } else {
              onOutlineReady(null);
            }
          } catch (_) {
            onOutlineReady(null);
          }
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err?.message || '';
        if (msg.includes('password') || msg.includes('Password')) {
          setError('PDF protetto da password');
        } else {
          setError(`Errore apertura PDF: ${msg}`);
        }
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (pdfDocRef.current) {
        try { pdfDocRef.current.destroy(); } catch (_) {}
        pdfDocRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  /* ---------- Restore scroll after pages rendered ---------- */
  useEffect(() => {
    if (totalPages > 0 && containerRef.current) {
      const t = setTimeout(() => {
        const scrollKey = makeKey(currentPathRef.current || filePath);
        const targetScroll = getScroll(scrollKey);
        if (targetScroll > 0 && containerRef.current) {
          containerRef.current.scrollTop = targetScroll;
        }
      }, 200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  /* ---------- Track current page on scroll ---------- */
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !currentPathRef.current) return;

    saveScroll(makeKey(currentPathRef.current), container.scrollTop);

    const wrappers = container.querySelectorAll('[data-page-num]');
    const containerMid = container.scrollTop + container.clientHeight / 2;
    let closest = 1;
    let closestDist = Infinity;
    wrappers.forEach(el => {
      const mid = el.offsetTop + el.offsetHeight / 2;
      const dist = Math.abs(mid - containerMid);
      if (dist < closestDist) {
        closestDist = dist;
        closest = parseInt(el.dataset.pageNum, 10) || 1;
      }
    });
    setCurrentPage(closest);
    setPageInput(String(closest));
  }, [saveScroll, makeKey]);

  /* ---------- Navigate to page ---------- */
  const goToPage = useCallback((n) => {
    if (!containerRef.current || totalPages === 0) return;
    const page = Math.max(1, Math.min(n, totalPages));
    const wrapper = containerRef.current.querySelector(`[data-page-num="${page}"]`);
    if (wrapper) {
      // offsetTop è relativo al container (position:relative sul container)
      containerRef.current.scrollTo({ top: wrapper.offsetTop, behavior: 'instant' });
    }
    setPageInput(String(page));
  }, [totalPages]);

  /* ---------- Scroll to search result (posizione stimata dentro la pagina) ---------- */
  const scrollToResult = useCallback((result) => {
    if (!containerRef.current || totalPages === 0 || !result) return;
    const page = Math.max(1, Math.min(result.page, totalPages));
    const wrapper = containerRef.current.querySelector(`[data-page-num="${page}"]`);
    if (!wrapper) return;

    // Stima posizione verticale: rapporto pos/lunghezzaTesto * altezza pagina
    const pageText = pageTextsRef.current[page - 1] || '';
    const ratio = pageText.length > 0 ? result.pos / pageText.length : 0;
    const offsetWithinPage = ratio * wrapper.offsetHeight;

    // Posiziona il punto stimato a ~60px dal top del container visibile
    const targetTop = wrapper.offsetTop + offsetWithinPage - 60;
    containerRef.current.scrollTo({ top: Math.max(0, targetTop), behavior: 'instant' });
    setPageInput(String(page));
  }, [totalPages]);

  /* ================================================================ */
  /*  SEARCH                                                          */
  /* ================================================================ */
  const getPageTexts = useCallback(async () => {
    if (pageTextsRef.current.length > 0) return pageTextsRef.current;
    const pdf = pdfDocRef.current;
    if (!pdf) return [];
    const texts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const str = content.items.map(item => item.str).join(' ');
        texts.push(str);
      } catch (_) {
        texts.push('');
      }
    }
    pageTextsRef.current = texts;
    return texts;
  }, []);

  const doSearch = useCallback(async (query) => {
    if (!query || !pdfDocRef.current) {
      setSearchResults([]);
      setSearchIdx(-1);
      return;
    }
    const texts = await getPageTexts();
    const qLower = query.toLowerCase();
    const qLen = query.length;
    const results = [];
    texts.forEach((text, idx) => {
      const tLower = text.toLowerCase();
      let pos = 0;
      while ((pos = tLower.indexOf(qLower, pos)) !== -1) {
        const snippetStart = Math.max(0, pos - 35);
        const snippetEnd = Math.min(text.length, pos + qLen + 35);
        const before = (snippetStart > 0 ? '…' : '') + text.substring(snippetStart, pos);
        const match = text.substring(pos, pos + qLen);
        const after = text.substring(pos + qLen, snippetEnd) + (snippetEnd < text.length ? '…' : '');
        results.push({ page: idx + 1, pos, before, match, after });
        pos += qLen;
      }
    });
    setSearchResults(results);
    setSearchIdx(results.length > 0 ? 0 : -1);
    if (results.length > 0) scrollToResult(results[0]);
  }, [getPageTexts, scrollToResult]);

  const navigateSearch = useCallback((direction) => {
    if (searchResults.length === 0) return;
    const next = direction === 'next'
      ? (searchIdx + 1) % searchResults.length
      : (searchIdx - 1 + searchResults.length) % searchResults.length;
    setSearchIdx(next);
    scrollToResult(searchResults[next]);
  }, [searchResults, searchIdx, scrollToResult]);

  useEffect(() => {
    if (!searchHighlight?.query || !pdfDocRef.current) return;
    setSearchQuery(searchHighlight.query);
    doSearch(searchHighlight.query);
  }, [searchHighlight, doSearch]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Auto-scroll nella lista risultati per mantenere visibile il risultato attivo
  useEffect(() => {
    if (searchIdx >= 0 && resultsListRef.current) {
      const activeEl = resultsListRef.current.querySelector(`[data-result-idx="${searchIdx}"]`);
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [searchIdx]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length === 0) doSearch(searchQuery);
      else navigateSearch(e.shiftKey ? 'prev' : 'next');
    }
    if (e.key === 'Escape') onSearchClose?.();
  }, [searchQuery, searchResults, doSearch, navigateSearch, onSearchClose]);

  /* ---------- Render ---------- */
  if (error) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-disabled)', fontSize: '13px', fontStyle: 'italic', padding: '20px',
        textAlign: 'center'
      }}>
        {error}
      </div>
    );
  }

  if (loading || !pdfDoc) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-tertiary)', fontSize: '12px'
      }}>
        {filePath ? 'Caricamento PDF…' : ''}
      </div>
    );
  }

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(<PdfPage key={i} pdf={pdfDoc} pageNum={i} scale={scale} />);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Search bar */}
      {searchOpen && (
        <div className="panel-search-bar">
          <Search size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cerca nel PDF…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              doSearch(e.target.value);
            }}
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery && searchResults.length > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
              {searchIdx + 1}/{searchResults.length}
            </span>
          )}
          <ChevronUp
            size={14}
            style={{ cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}
            onClick={() => navigateSearch('prev')}
          />
          <ChevronDown
            size={14}
            style={{ cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}
            onClick={() => navigateSearch('next')}
          />
          <X
            size={14}
            style={{ cursor: 'pointer', color: 'var(--text-tertiary)', flexShrink: 0 }}
            onClick={onSearchClose}
          />
        </div>
      )}

      {/* Search results list */}
      {searchOpen && searchQuery && searchResults.length > 0 && (
        <div
          ref={resultsListRef}
          style={{
            maxHeight: '180px',
            overflowY: 'auto',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
            flexShrink: 0
          }}
        >
          {searchResults.map((r, i) => (
            <div
              key={i}
              data-result-idx={i}
              onClick={() => { setSearchIdx(i); scrollToResult(r); }}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                gap: '8px',
                alignItems: 'baseline',
                background: i === searchIdx ? 'var(--accent-a15)' : 'transparent',
                borderLeft: i === searchIdx ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => { if (i !== searchIdx) e.currentTarget.style.background = 'var(--accent-a08)'; }}
              onMouseLeave={e => { if (i !== searchIdx) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                color: 'var(--accent)',
                fontSize: '10px',
                flexShrink: 0,
                minWidth: '32px'
              }}>
                p.{r.page}
              </span>
              <span style={{
                color: 'var(--text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {r.before}<strong style={{ color: 'var(--text-primary)' }}>{r.match}</strong>{r.after}
              </span>
            </div>
          ))}
        </div>
      )}
      {searchOpen && searchQuery && searchResults.length === 0 && (
        <div style={{
          padding: '6px 10px',
          fontSize: '11px',
          color: 'var(--text-disabled)',
          fontStyle: 'italic',
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0
        }}>
          Nessun risultato
        </div>
      )}

      {/* PDF scroll container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          background: 'var(--bg-main)',
          padding: '12px 0'
        }}
      >
        {pages}
      </div>

      {/* Page navigation bar */}
      {totalPages > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          padding: '3px 8px', flexShrink: 0,
          background: 'var(--bg-elevated)', borderTop: '1px solid var(--border-subtle)',
          fontSize: '11px', color: 'var(--text-secondary)'
        }}>
          <span>Pag</span>
          <input
            type="text"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const n = parseInt(pageInput, 10);
                if (!isNaN(n)) goToPage(n);
              }
            }}
            onBlur={() => setPageInput(String(currentPage))}
            style={{
              width: '36px', textAlign: 'center', fontSize: '11px',
              background: 'var(--bg-main)', color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)', borderRadius: '3px',
              padding: '1px 4px', outline: 'none'
            }}
          />
          <span>/ {totalPages}</span>
        </div>
      )}
    </div>
  );
});

export default PdfViewer;
