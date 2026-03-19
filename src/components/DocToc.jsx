import React, { useEffect, useState, useRef, useCallback } from 'react';

export default function DocToc({ containerRef, pinned: externalPinned, onPinnedChange, contentKey, pdfOutline }) {
  const [headings, setHeadings] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [internalPinned, setInternalPinned] = useState(false);
  const closeTimer = useRef(null);
  const tocRef = useRef(null);
  const wrapperRef = useRef(null);

  const pinned = externalPinned !== undefined ? externalPinned : internalPinned;
  const setPinned = (val) => {
    if (onPinnedChange) onPinnedChange(typeof val === 'function' ? val(pinned) : val);
    else setInternalPinned(val);
  };

  // Keep open state in sync with pinned
  useEffect(() => {
    if (pinned) setOpen(true);
  }, [pinned]);

  // Extract headings from container via MutationObserver, or use PDF outline
  useEffect(() => {
    // PDF outline mode
    if (pdfOutline && pdfOutline.length > 0) {
      const minLevel = Math.min(...pdfOutline.map(h => h.level));
      const items = pdfOutline.map((h, i) => ({
        id: i,
        level: h.level === minLevel ? 1 : 2,
        text: h.title,
        page: h.page,
        element: null
      }));
      setHeadings(items);
      return;
    }

    // If pdfOutline is explicitly provided but empty, show nothing
    if (pdfOutline !== undefined && pdfOutline !== null) {
      setHeadings([]);
      return;
    }

    // DOM heading mode
    const container = containerRef?.current;
    if (!container) { setHeadings([]); return; }

    const extract = () => {
      const els = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (els.length === 0) { setHeadings([]); return; }

      const levels = [...new Set(Array.from(els).map(el => parseInt(el.tagName[1])))].sort();
      const primaryLevel = levels[0];
      const secondaryLevel = levels[1] || null;

      const items = Array.from(els)
        .filter(el => {
          const lvl = parseInt(el.tagName[1]);
          return lvl === primaryLevel || lvl === secondaryLevel;
        })
        .map((el, i) => ({
          id: i,
          level: parseInt(el.tagName[1]) === primaryLevel ? 1 : 2,
          text: el.textContent,
          element: el
        }));
      setHeadings(items);
    };

    extract();
    const observer = new MutationObserver(extract);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [containerRef, contentKey, pdfOutline]);

  // Track active heading via scroll position
  useEffect(() => {
    const container = containerRef?.current;
    if (!container || headings.length === 0) return;

    const isPdfMode = headings[0]?.page != null;

    const onScroll = () => {
      if (isPdfMode) {
        // PDF mode: find which page is most visible, then match to closest heading
        const wrappers = container.querySelectorAll('[data-page-num]');
        const containerMid = container.scrollTop + container.clientHeight / 2;
        let currentPage = 1;
        let closestDist = Infinity;
        wrappers.forEach(el => {
          const mid = el.offsetTop + el.offsetHeight / 2;
          const dist = Math.abs(mid - containerMid);
          if (dist < closestDist) {
            closestDist = dist;
            currentPage = parseInt(el.dataset.pageNum, 10) || 1;
          }
        });
        let active = -1;
        for (let i = 0; i < headings.length; i++) {
          if (headings[i].page <= currentPage) active = i;
          else break;
        }
        setActiveIndex(active);
      } else {
        // DOM heading mode
        const containerTop = container.getBoundingClientRect().top;
        let active = -1;
        for (let i = 0; i < headings.length; i++) {
          if (!headings[i].element) continue;
          const rect = headings[i].element.getBoundingClientRect();
          if (rect.top - containerTop <= 40) {
            active = i;
          } else {
            break;
          }
        }
        setActiveIndex(active);
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, [containerRef, headings]);

  // Esc to close pinned
  useEffect(() => {
    if (!pinned) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { setPinned(false); setOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinned]);

  // Global mousedown to close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && wrapperRef.current.contains(e.target)) return;
      setOpen(false);
      if (pinned) setPinned(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, pinned]);

  const handleMouseEnter = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (pinned) return;
    closeTimer.current = setTimeout(() => setOpen(false), 300);
  }, [pinned]);

  const handleButtonClick = useCallback(() => {
    if (pinned) {
      setPinned(false);
      setOpen(false);
    } else {
      setPinned(true);
      setOpen(true);
    }
  }, [pinned]);

  const handleHeadingClick = useCallback((heading) => {
    if (heading.page && containerRef?.current) {
      // PDF mode: scroll to page element
      const pageEl = containerRef.current.querySelector(`[data-page-num="${heading.page}"]`);
      if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (heading.element) {
      heading.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [containerRef]);

  const hasHeadings = headings.length > 0;

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        onClick={handleButtonClick}
        style={{
          cursor: hasHeadings ? 'pointer' : 'default',
          fontSize: '11px',
          color: pinned ? 'var(--accent)' : hasHeadings ? 'var(--text-secondary)' : 'var(--text-disabled)',
          padding: '2px 6px',
          borderRadius: '3px',
          transition: 'color 0.2s',
          userSelect: 'none'
        }}
        onMouseEnter={e => { if (hasHeadings && !pinned) e.currentTarget.style.color = 'var(--accent)'; }}
        onMouseLeave={e => { if (!pinned) e.currentTarget.style.color = hasHeadings ? 'var(--text-secondary)' : 'var(--text-disabled)'; }}
      >
        ☰ Indice
      </span>

      {open && hasHeadings && (
        <div
          ref={tocRef}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            width: '250px',
            maxHeight: '60vh',
            overflowY: 'auto',
            background: 'var(--bg-frosted)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            zIndex: 900,
            boxShadow: 'var(--shadow-dropdown)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div style={{ padding: '6px 0' }}>
            {headings.map((h, i) => (
              <div
                key={h.id}
                onClick={() => handleHeadingClick(h)}
                style={{
                  padding: '4px 12px',
                  paddingLeft: h.level === 2 ? '24px' : '12px',
                  fontSize: h.level === 1 ? '12px' : '11px',
                  fontWeight: h.level === 1 ? '600' : '400',
                  color: i === activeIndex ? 'var(--accent)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  lineHeight: '1.6',
                  borderLeft: i === activeIndex ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (i !== activeIndex) e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { if (i !== activeIndex) e.currentTarget.style.color = 'var(--text-primary)'; }}
              >
                {h.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
