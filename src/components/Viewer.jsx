import React, { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { renderMarkdown } from '../utils/markdownRenderer';
import { getFileType, FILE_TYPES, parseUrlFile } from '../utils/fileTypes';
import { ExternalLink } from 'lucide-react';
import { useScrollMemory } from '../hooks/useScrollMemory';
import { applyKeywordHighlightsToHtml, prepareHtmlForSrcdoc } from '../utils/htmlHelpers';
import PdfViewer from './PdfViewer';

/**
 * Apply search highlights to HTML string (with target offset tracking).
 */
function highlightHtml(html, query, targetOffset) {
  if (!query || !html) return { html, targetIdx: -1 };
  const qLower = query.toLowerCase();
  const parts = html.split(/(<[^>]+>)/);
  let textOffset = 0;
  let matchIdx = 0;
  let bestIdx = -1;
  let bestDist = Infinity;

  const processed = parts.map(part => {
    if (part.startsWith('<')) return part;
    const lower = part.toLowerCase();
    let result = '';
    let lastPos = 0;
    let pos = 0;
    while ((pos = lower.indexOf(qLower, lastPos)) !== -1) {
      const globalOffset = textOffset + pos;
      const dist = Math.abs(globalOffset - (targetOffset ?? 0));
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = matchIdx;
      }
      result += part.substring(lastPos, pos);
      result += `<mark data-search-hl="true" data-search-idx="${matchIdx}" style="background:var(--accent-a30);color:inherit;padding:0 1px;border-radius:2px">${part.substring(pos, pos + query.length)}</mark>`;
      matchIdx++;
      lastPos = pos + query.length;
    }
    result += part.substring(lastPos);
    textOffset += part.length;
    return result;
  });

  let finalHtml = processed.join('');
  if (bestIdx >= 0) {
    finalHtml = finalHtml.replace(
      `data-search-idx="${bestIdx}" style="background:var(--accent-a30)`,
      `data-search-idx="${bestIdx}" style="background:var(--accent-a55)`
    );
  }
  return { html: finalHtml, targetIdx: bestIdx };
}

const Viewer = forwardRef(function Viewer({
  currentFile, scrollKeyPrefix, searchHighlight, highlightKeywords, onImageClick, onVideoClick,
  scrollMapRef, onScrollChanged, fontSize, searchOpen, onSearchClose, onPdfOutlineReady
}, ref) {
  const [renderedHtml, setRenderedHtml] = useState('');
  const [isHtmlFile, setIsHtmlFile] = useState(false);
  const [isPdfFile, setIsPdfFile] = useState(false);
  const [isUrlFile, setIsUrlFile] = useState(false);
  const [urlTarget, setUrlTarget] = useState('');
  const [urlError, setUrlError] = useState(false);
  const [urlLoaded, setUrlLoaded] = useState(false);
  const urlTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const isHtmlRef = useRef(false);
  const pdfViewerRef = useRef(null);
  const currentKeyRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const iframeReadyRef = useRef(false);
  const searchHighlightRef = useRef(searchHighlight);
  searchHighlightRef.current = searchHighlight;
  const { saveScroll, getScroll } = useScrollMemory(scrollMapRef, onScrollChanged);

  useImperativeHandle(ref, () => {
    if (isPdfFile) return pdfViewerRef.current;
    if (isHtmlFile || isUrlFile) return null;
    return containerRef.current;
  });

  const makeKey = useCallback((filePath) => {
    return scrollKeyPrefix ? `${scrollKeyPrefix}:${filePath}` : filePath;
  }, [scrollKeyPrefix]);

  const saveCurrentScroll = useCallback(() => {
    if (!currentKeyRef.current) return;
    if (isHtmlRef.current) {
      try {
        const scrollY = iframeRef.current?.contentWindow?.scrollY;
        if (scrollY != null) saveScroll(currentKeyRef.current, scrollY);
      } catch (_) { /* cross-origin: atteso */ }
    } else if (containerRef.current) {
      saveScroll(currentKeyRef.current, containerRef.current.scrollTop);
    }
  }, [saveScroll]);

  const fileIdentity = currentFile ? makeKey(currentFile.path) : null;

  useEffect(() => {
    iframeReadyRef.current = false;
    if (!currentFile) {
      setRenderedHtml('');
      setIsUrlFile(false);
      setUrlTarget('');
      setUrlError(false);
      currentKeyRef.current = null;
      return;
    }

    saveCurrentScroll();

    const scrollKey = makeKey(currentFile.path);
    const type = getFileType(currentFile.extension);

    if (type === FILE_TYPES.IMAGE) {
      onImageClick(currentFile.path);
      return;
    }
    if (type === FILE_TYPES.VIDEO) {
      onVideoClick(currentFile.path);
      return;
    }

    if (type === FILE_TYPES.WEBLINK) {
      setIsHtmlFile(false);
      isHtmlRef.current = false;
      setRenderedHtml('');
      setIsUrlFile(true);
      setUrlError(false);
      setUrlLoaded(false);
      if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current);
      currentKeyRef.current = scrollKey;
      window.electronAPI.readFile(currentFile.path).then(text => {
        const url = parseUrlFile(text);
        setUrlTarget(url || '');
        if (!url) { setUrlError(true); return; }
        // Timeout: se dopo 3s non ha caricato, probabilmente bloccato
        urlTimeoutRef.current = setTimeout(() => {
          setUrlLoaded(prev => {
            if (!prev) setUrlError(true);
            return prev;
          });
        }, 3000);
      });
      return;
    }

    // Reset URL state for non-URL files
    setIsUrlFile(false);
    setUrlTarget('');
    setUrlError(false);

    if (type === FILE_TYPES.PDF) {
      setIsHtmlFile(false);
      isHtmlRef.current = false;
      setIsPdfFile(true);
      setRenderedHtml('');
      currentKeyRef.current = scrollKey;
      return;
    }
    setIsPdfFile(false);

    if (type === FILE_TYPES.DOCUMENT) {
      const ext = currentFile.extension;
      if (ext === '.html' || ext === '.htm') {
        // HTML files: read content for srcdoc (CSS isolation + highlights)
        setIsHtmlFile(true);
        isHtmlRef.current = true;
        setRenderedHtml('');
        currentKeyRef.current = scrollKey;
        window.electronAPI.readFile(currentFile.path).then(rawHtml => {
          if (!rawHtml) return;
          setRenderedHtml(prepareHtmlForSrcdoc(rawHtml, currentFile.path));
        });
      } else {
        setIsHtmlFile(false);
        isHtmlRef.current = false;
        window.electronAPI.readFile(currentFile.path).then(text => {
          if (!text) return;
          currentKeyRef.current = scrollKey;

          if (ext === '.md') {
            setRenderedHtml(renderMarkdown(text));
          } else {
            setRenderedHtml(`<pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; color: var(--text-primary);">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`);
          }

          const targetScroll = getScroll(scrollKey);
          const applyScroll = () => {
            if (containerRef.current) {
              containerRef.current.scrollTop = targetScroll;
            }
          };

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              applyScroll();
              if (containerRef.current) {
                const imgs = containerRef.current.querySelectorAll('img');
                imgs.forEach(img => {
                  if (!img.complete) {
                    img.addEventListener('load', applyScroll, { once: true });
                  }
                });
              }
            });
          });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileIdentity]);

  // Stable keyword version string for memoization
  const kwEnabled = highlightKeywords?.enabled && highlightKeywords?.words?.length > 0;
  const kwWords = highlightKeywords?.words;
  const kwVersion = kwEnabled ? kwWords.map(w => w.text + w.color).join('|') : '';

  // Pipeline: renderedHtml → keyword highlights → search highlights → displayHtml
  const kwHtml = useMemo(() => {
    if (!kwEnabled || !renderedHtml) return renderedHtml;
    return applyKeywordHighlightsToHtml(renderedHtml, kwWords);
  }, [renderedHtml, kwEnabled, kwVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const { displayHtml, targetIdx } = useMemo(() => {
    if (!searchHighlight?.query || !kwHtml) {
      return { displayHtml: kwHtml, targetIdx: -1 };
    }
    const result = highlightHtml(kwHtml, searchHighlight.query, searchHighlight.offset);
    return { displayHtml: result.html, targetIdx: result.targetIdx };
  }, [kwHtml, searchHighlight]);

  // Scroll to target search highlight, then fade out
  useEffect(() => {
    if (targetIdx < 0 || !containerRef.current) return;
    const scrollTimer = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const mark = containerRef.current?.querySelector(`mark[data-search-idx="${targetIdx}"]`);
          if (mark) {
            mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
          const fadeTimer = setTimeout(() => {
            const marks = containerRef.current?.querySelectorAll('mark[data-search-hl]');
            if (marks) {
              marks.forEach(m => {
                m.style.transition = 'background 3s ease-out';
                m.style.background = 'transparent';
              });
            }
          }, 1000);
          fadeTimerRef.current = fadeTimer;
        });
      });
    }, 200);
    return () => clearTimeout(scrollTimer);
  }, [targetIdx, searchHighlight]);

  const handleScroll = useCallback(() => {
    if (currentKeyRef.current && containerRef.current) {
      saveScroll(currentKeyRef.current, containerRef.current.scrollTop);
    }
  }, [saveScroll]);

  // Apply/clear search highlights directly in iframe DOM (avoids full srcdoc reload)
  const applyIframeSearchHighlights = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !iframeReadyRef.current) return false;
    let iframeDoc;
    try { iframeDoc = iframe.contentDocument; } catch (_) { return false; }
    if (!iframeDoc?.body) return false;

    // Remove existing search marks
    const existing = iframeDoc.querySelectorAll('mark[data-search-hl]');
    existing.forEach(mark => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
    });
    if (existing.length > 0) iframeDoc.body.normalize();

    const sh = searchHighlightRef.current;
    if (!sh?.query) return false;

    const qLower = sh.query.toLowerCase();
    const walker = iframeDoc.createTreeWalker(iframeDoc.body, NodeFilter.SHOW_TEXT);
    const matches = [];
    let textOffset = 0;
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent;
      const lower = text.toLowerCase();
      let pos = 0;
      while ((pos = lower.indexOf(qLower, pos)) !== -1) {
        matches.push({ node, pos, globalOffset: textOffset + pos });
        pos += qLower.length;
      }
      textOffset += text.length;
    }

    if (matches.length === 0) return false;

    let bestIdx = 0;
    let bestDist = Infinity;
    matches.forEach((m, i) => {
      const dist = Math.abs(m.globalOffset - (sh.offset ?? 0));
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    });

    // Wrap matches in reverse order to preserve text node positions
    for (let i = matches.length - 1; i >= 0; i--) {
      const { node: textNode, pos } = matches[i];
      const mark = iframeDoc.createElement('mark');
      mark.setAttribute('data-search-hl', 'true');
      mark.setAttribute('data-search-idx', String(i));
      mark.style.cssText = `background:var(--accent-a${i === bestIdx ? '55' : '30'});color:inherit;padding:0 1px;border-radius:2px`;
      const range = iframeDoc.createRange();
      range.setStart(textNode, pos);
      range.setEnd(textNode, pos + sh.query.length);
      range.surroundContents(mark);
    }

    // Scroll to best match, then fade
    const bestMark = iframeDoc.querySelector(`mark[data-search-idx="${bestIdx}"]`);
    if (bestMark) {
      setTimeout(() => {
        bestMark.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(() => {
          iframeDoc.querySelectorAll('mark[data-search-hl]').forEach(m => {
            m.style.transition = 'background 3s ease-out';
            m.style.background = 'transparent';
          });
        }, 1000);
      }, 100);
    }
    return true;
  }, []);

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || !currentKeyRef.current) return;
    iframeReadyRef.current = true;
    try {
      const iframeDoc = iframe.contentDocument;
      if (!iframeDoc) return;
      const hasSearch = applyIframeSearchHighlights();
      if (!hasSearch) {
        const targetScroll = getScroll(currentKeyRef.current);
        setTimeout(() => iframe.contentWindow.scrollTo(0, targetScroll), 50);
      }

      iframe.contentWindow.addEventListener('scroll', () => {
        if (currentKeyRef.current) saveScroll(currentKeyRef.current, iframe.contentWindow.scrollY);
      }, { passive: true });
    } catch (e) { console.warn('Iframe load handler:', e.message); }
  }, [getScroll, saveScroll, applyIframeSearchHighlights]);

  // Apply search highlights in iframe when searchHighlight changes (no srcdoc reload)
  useEffect(() => {
    if (!isHtmlFile) return;
    applyIframeSearchHighlights();
  }, [searchHighlight, isHtmlFile, applyIframeSearchHighlights]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isUrlFile) {
    if (!urlTarget) {
      return (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)', fontSize: '13px', fontStyle: 'italic' }}>
          {urlError ? 'Impossibile leggere URL dal file' : 'Caricamento…'}
        </div>
      );
    }
    const computedScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-size-scale') || '1');
    const effectiveZoom = (fontSize || 15) / 15 * computedScale;
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* URL bar */}
        <div style={{
          padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '6px',
          background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0
        }}>
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {urlTarget}
          </span>
          <ExternalLink
            size={13}
            style={{ color: 'var(--text-tertiary)', cursor: 'pointer', flexShrink: 0, transition: 'color 0.15s' }}
            onClick={() => window.electronAPI.openExternal(urlTarget)}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
            title="Apri nel browser"
          />
        </div>
        {urlError ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-disabled)', padding: '20px' }}>
            <span style={{ fontSize: '13px' }}>Questo sito non permette la visualizzazione in un pannello.</span>
            <span
              style={{ fontSize: '12px', color: 'var(--accent)', cursor: 'pointer' }}
              onClick={() => window.electronAPI.openExternal(urlTarget)}
            >
              Apri nel browser esterno
            </span>
          </div>
        ) : (
          <iframe
            src={urlTarget}
            onLoad={(e) => {
              if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current);
              setUrlLoaded(true);
              // Detect X-Frame-Options block: empty body after load
              try {
                const doc = e.target.contentDocument;
                if (doc && doc.body && doc.body.children.length === 0 && doc.body.innerText === '') {
                  setUrlError(true);
                }
              } catch (_) {
                /* cross-origin: atteso */
              }
            }}
            onError={() => { if (urlTimeoutRef.current) clearTimeout(urlTimeoutRef.current); setUrlError(true); }}
            style={{
              flex: 1, width: '100%', border: 'none',
              zoom: effectiveZoom !== 1 ? effectiveZoom : undefined
            }}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
    );
  }

  if (isPdfFile) {
    return (
      <PdfViewer
        ref={pdfViewerRef}
        filePath={currentFile.path}
        fontSize={fontSize}
        searchHighlight={searchHighlight}
        highlightKeywords={highlightKeywords}
        scrollMapRef={scrollMapRef}
        onScrollChanged={onScrollChanged}
        scrollKeyPrefix={scrollKeyPrefix}
        searchOpen={searchOpen}
        onSearchClose={onSearchClose}
        onOutlineReady={onPdfOutlineReady}
      />
    );
  }

  if (isHtmlFile) {
    const computedScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-size-scale') || '1');
    const effectiveZoom = (fontSize || 15) / 15 * computedScale;
    return (
      <iframe
        ref={iframeRef}
        srcdoc={kwHtml}
        onLoad={handleIframeLoad}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          zoom: effectiveZoom !== 1 ? effectiveZoom : undefined
        }}
        sandbox="allow-same-origin"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="viewer-content"
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '24px 32px',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        fontSize: `calc(${fontSize || 15}px * var(--font-size-scale, 1))`,
        lineHeight: '1.7',
        color: 'var(--text-primary)'
      }}
      dangerouslySetInnerHTML={{ __html: displayHtml }}
    />
  );
});

export default Viewer;
