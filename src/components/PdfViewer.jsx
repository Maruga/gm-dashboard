import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFViewer, EventBus, PDFLinkService, PDFFindController }
  from 'pdfjs-dist/web/pdf_viewer.mjs';
import 'pdfjs-dist/web/pdf_viewer.css';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { useScrollMemory } from '../hooks/useScrollMemory';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const PdfViewer = forwardRef(function PdfViewer({
  filePath, fontSize, searchHighlight, highlightKeywords,
  scrollMapRef, onScrollChanged, scrollKeyPrefix,
  searchOpen, onSearchClose
}, ref) {
  const containerRef = useRef(null);
  const viewerWrapRef = useRef(null);
  const viewerRef = useRef(null);
  const eventBusRef = useRef(null);
  const findControllerRef = useRef(null);
  const pdfDocRef = useRef(null);
  const currentPathRef = useRef(null);

  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [matchCurrent, setMatchCurrent] = useState(0);

  const searchInputRef = useRef(null);
  const { saveScroll, getScroll } = useScrollMemory(scrollMapRef, onScrollChanged);

  const makeKey = useCallback((fp) => {
    return scrollKeyPrefix ? `${scrollKeyPrefix}:${fp}` : fp;
  }, [scrollKeyPrefix]);

  // Expose scroll container to parent (for DocToc etc.)
  useImperativeHandle(ref, () => containerRef.current);

  // --- Initialize PDF viewer and load document ---
  useEffect(() => {
    if (!filePath) return;

    setError(null);
    setTotalPages(0);
    setCurrentPage(1);
    setPageInput('1');
    setSearchQuery('');
    setMatchCount(0);
    setMatchCurrent(0);

    // Save scroll of previous file
    if (currentPathRef.current && containerRef.current) {
      saveScroll(makeKey(currentPathRef.current), containerRef.current.scrollTop);
    }
    currentPathRef.current = filePath;

    // Cleanup previous
    if (viewerRef.current) {
      try { viewerRef.current.cleanup(); } catch (_) {}
      viewerRef.current = null;
    }
    if (pdfDocRef.current) {
      try { pdfDocRef.current.destroy(); } catch (_) {}
      pdfDocRef.current = null;
    }

    // Clear the viewer container
    const viewerDiv = viewerWrapRef.current;
    if (viewerDiv) viewerDiv.innerHTML = '';

    const eventBus = new EventBus();
    eventBusRef.current = eventBus;

    const linkService = new PDFLinkService({ eventBus });
    const findController = new PDFFindController({ eventBus, linkService });
    findControllerRef.current = findController;

    const viewer = new PDFViewer({
      container: containerRef.current,
      eventBus,
      linkService,
      findController,
      // TextLayerMode.ENABLE = 1 (not exported in pdfjs-dist 5.x)
      textLayerMode: 1
    });
    viewerRef.current = viewer;
    linkService.setViewer(viewer);

    // Events
    const onPageChanging = (evt) => {
      setCurrentPage(evt.pageNumber);
      setPageInput(String(evt.pageNumber));
    };
    eventBus.on('pagechanging', onPageChanging);

    const onFindState = (evt) => {
      // matchesCount: { current, total }
      if (evt.matchesCount) {
        setMatchCount(evt.matchesCount.total || 0);
        setMatchCurrent((evt.matchesCount.current || 0) + 1);
      }
    };
    eventBus.on('updatefindcontrolstate', onFindState);

    const onTextLayerRendered = (evt) => {
      applyKeywordHighlights(evt.pageNumber);
    };
    eventBus.on('textlayerrendered', onTextLayerRendered);

    // Load PDF
    (async () => {
      try {
        let pdf;
        try {
          const url = await window.electronAPI.getFileUrl(filePath);
          pdf = await pdfjsLib.getDocument(url).promise;
        } catch {
          // Fallback for dev mode (file:// blocked by CORS)
          const data = await window.electronAPI.readFileBinary(filePath);
          if (!data) throw new Error('Impossibile leggere il file');
          pdf = await pdfjsLib.getDocument({ data: new Uint8Array(data) }).promise;
        }

        pdfDocRef.current = pdf;
        viewer.setDocument(pdf);
        linkService.setDocument(pdf);
        setTotalPages(pdf.numPages);

        // Restore scroll after pages render
        const scrollKey = makeKey(filePath);
        const targetScroll = getScroll(scrollKey);
        if (targetScroll > 0) {
          const onPagesLoaded = () => {
            eventBus.off('pagesloaded', onPagesLoaded);
            requestAnimationFrame(() => {
              if (containerRef.current) {
                containerRef.current.scrollTop = targetScroll;
              }
            });
          };
          eventBus.on('pagesloaded', onPagesLoaded);
        }
      } catch (err) {
        const msg = err?.message || '';
        if (msg.includes('password') || msg.includes('Password')) {
          setError('PDF protetto da password');
        } else {
          setError(`Errore apertura PDF: ${msg}`);
        }
      }
    })();

    return () => {
      eventBus.off('pagechanging', onPageChanging);
      eventBus.off('updatefindcontrolstate', onFindState);
      eventBus.off('textlayerrendered', onTextLayerRendered);
      if (viewerRef.current) {
        try { viewerRef.current.cleanup(); } catch (_) {}
        viewerRef.current = null;
      }
      if (pdfDocRef.current) {
        try { pdfDocRef.current.destroy(); } catch (_) {}
        pdfDocRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  // --- Zoom (debounced) ---
  useEffect(() => {
    if (!viewerRef.current) return;
    const timer = setTimeout(() => {
      const computedScale = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--font-size-scale') || '1'
      );
      const scale = (fontSize / 15) * computedScale;
      viewerRef.current.currentScaleValue = scale;
    }, 300);
    return () => clearTimeout(timer);
  }, [fontSize]);

  // --- Search highlight from Console ---
  useEffect(() => {
    if (!findControllerRef.current || !searchHighlight?.query) return;
    findControllerRef.current.executeCommand('find', {
      query: searchHighlight.query,
      highlightAll: true
    });
  }, [searchHighlight]);

  // --- Keyword highlighting ---
  const kwRef = useRef(highlightKeywords);
  kwRef.current = highlightKeywords;

  const applyKeywordHighlights = useCallback((pageNumber) => {
    const kw = kwRef.current;
    if (!kw?.enabled || !kw.words?.length) return;
    const container = containerRef.current;
    if (!container) return;

    const pageEl = container.querySelector(`.page[data-page-number="${pageNumber}"]`);
    if (!pageEl) return;
    const textLayer = pageEl.querySelector('.textLayer');
    if (!textLayer) return;

    const words = kw.words;
    const sorted = [...words].sort((a, b) => b.text.length - a.text.length);
    const pattern = new RegExp(
      '(' + sorted.map(w => w.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
      'gi'
    );
    const colorMap = {};
    for (const w of words) colorMap[w.text.toLowerCase()] = w.color;

    const spans = textLayer.querySelectorAll('span');
    spans.forEach(span => {
      if (span.getAttribute('data-kw-hl')) {
        span.removeAttribute('data-kw-hl');
        span.style.removeProperty('--kw-bg');
      }
      const text = span.textContent;
      if (pattern.test(text)) {
        pattern.lastIndex = 0;
        const match = text.match(pattern);
        if (match) {
          const color = colorMap[match[0].toLowerCase()] || 'rgba(201,169,110,0.55)';
          span.setAttribute('data-kw-hl', 'true');
          span.style.setProperty('--kw-bg', color);
        }
      }
    });
  }, []);

  // Re-apply keywords when highlightKeywords changes
  useEffect(() => {
    if (!containerRef.current || !viewerRef.current) return;
    const pages = containerRef.current.querySelectorAll('.page[data-page-number]');
    pages.forEach(pageEl => {
      const textLayer = pageEl.querySelector('.textLayer');
      if (!textLayer) return;
      // Clear existing
      textLayer.querySelectorAll('span[data-kw-hl]').forEach(span => {
        span.removeAttribute('data-kw-hl');
        span.style.removeProperty('--kw-bg');
      });
      const pageNum = parseInt(pageEl.getAttribute('data-page-number'), 10);
      applyKeywordHighlights(pageNum);
    });
  }, [highlightKeywords, applyKeywordHighlights]);

  // --- Save scroll on scroll ---
  const handleScroll = useCallback(() => {
    if (currentPathRef.current && containerRef.current) {
      saveScroll(makeKey(currentPathRef.current), containerRef.current.scrollTop);
    }
  }, [saveScroll, makeKey]);

  // --- Internal search bar ---
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleFind = useCallback((query, findPrevious = false) => {
    if (!findControllerRef.current || !query) return;
    findControllerRef.current.executeCommand('find', {
      query,
      highlightAll: true,
      findPrevious
    });
  }, []);

  const handleFindAgain = useCallback((findPrevious) => {
    if (!findControllerRef.current || !searchQuery) return;
    findControllerRef.current.executeCommand('findagain', {
      query: searchQuery,
      highlightAll: true,
      findPrevious
    });
  }, [searchQuery]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handleFindAgain(true);
      } else {
        handleFindAgain(false);
      }
    }
    if (e.key === 'Escape') {
      onSearchClose?.();
    }
  }, [handleFindAgain, onSearchClose]);

  // Navigate to page
  const goToPage = useCallback((n) => {
    if (!viewerRef.current || !totalPages) return;
    const page = Math.max(1, Math.min(n, totalPages));
    viewerRef.current.currentPageNumber = page;
    setPageInput(String(page));
  }, [totalPages]);

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Internal search bar */}
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
              handleFind(e.target.value);
            }}
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery && matchCount > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
              {matchCurrent}/{matchCount}
            </span>
          )}
          <ChevronUp
            size={14}
            style={{ cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}
            onClick={() => handleFindAgain(true)}
          />
          <ChevronDown
            size={14}
            style={{ cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}
            onClick={() => handleFindAgain(false)}
          />
          <X
            size={14}
            style={{ cursor: 'pointer', color: 'var(--text-tertiary)', flexShrink: 0 }}
            onClick={onSearchClose}
          />
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
          background: 'var(--bg-main)'
        }}
      >
        <div ref={viewerWrapRef} className="pdfViewer" />
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
