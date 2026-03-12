import React, { useEffect, useRef, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { renderMarkdown } from '../utils/markdownRenderer';
import { getFileType, FILE_TYPES } from '../utils/fileTypes';
import { useScrollMemory } from '../hooks/useScrollMemory';

function highlightHtml(html, query, targetOffset) {
  if (!query || !html) return { html, targetIdx: -1 };
  const qLower = query.toLowerCase();
  // Split HTML into tags and text parts
  const parts = html.split(/(<[^>]+>)/);
  let textOffset = 0;
  let matchIdx = 0;
  let bestIdx = -1;
  let bestDist = Infinity;

  const processed = parts.map(part => {
    if (part.startsWith('<')) return part; // HTML tag — skip
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
      result += escapeForMark(part.substring(lastPos, pos));
      result += `<mark data-search-hl="true" data-search-idx="${matchIdx}" style="background:rgba(201,169,110,0.3);color:inherit;padding:0 1px;border-radius:2px">${escapeForMark(part.substring(pos, pos + query.length))}</mark>`;
      matchIdx++;
      lastPos = pos + query.length;
    }
    result += escapeForMark(part.substring(lastPos));
    textOffset += part.length;
    return result;
  });

  let finalHtml = processed.join('');
  // Make target match brighter
  if (bestIdx >= 0) {
    finalHtml = finalHtml.replace(
      `data-search-idx="${bestIdx}" style="background:rgba(201,169,110,0.3)`,
      `data-search-idx="${bestIdx}" style="background:rgba(201,169,110,0.55)`
    );
  }
  return { html: finalHtml, targetIdx: bestIdx };
}

function escapeForMark(text) {
  // Text parts from split are already HTML — don't double-escape
  return text;
}

const Viewer = forwardRef(function Viewer({
  currentFile, scrollKeyPrefix, searchHighlight, onImageClick, onVideoClick,
  scrollMapRef, onScrollChanged
}, ref) {
  const [renderedHtml, setRenderedHtml] = useState('');
  const containerRef = useRef(null);
  const currentKeyRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const { saveScroll, getScroll } = useScrollMemory(scrollMapRef, onScrollChanged);

  useImperativeHandle(ref, () => containerRef.current, []);

  const makeKey = useCallback((filePath) => {
    return scrollKeyPrefix ? `${scrollKeyPrefix}:${filePath}` : filePath;
  }, [scrollKeyPrefix]);

  const saveCurrentScroll = useCallback(() => {
    if (currentKeyRef.current && containerRef.current) {
      saveScroll(currentKeyRef.current, containerRef.current.scrollTop);
    }
  }, [saveScroll]);

  const fileIdentity = currentFile ? makeKey(currentFile.path) : null;

  useEffect(() => {
    if (!currentFile) {
      setRenderedHtml('');
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

    if (type === FILE_TYPES.DOCUMENT) {
      window.electronAPI.readFile(currentFile.path).then(text => {
        if (!text) return;
        currentKeyRef.current = scrollKey;

        if (currentFile.extension === '.md') {
          setRenderedHtml(renderMarkdown(text));
        } else if (currentFile.extension === '.html' || currentFile.extension === '.htm') {
          setRenderedHtml(text);
        } else {
          setRenderedHtml(`<pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; color: #d4c5a9;">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`);
        }

        const targetScroll = getScroll(scrollKey);
        const applyScroll = () => {
          if (containerRef.current) {
            containerRef.current.scrollTop = targetScroll;
          }
        };

        // Double rAF to ensure React has committed the DOM update
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            applyScroll();

            // Re-apply after images load (they shift layout)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileIdentity]);

  // Build display HTML with search highlights baked in
  const { displayHtml, targetIdx } = useMemo(() => {
    if (!searchHighlight?.query || !renderedHtml) {
      return { displayHtml: renderedHtml, targetIdx: -1 };
    }
    const result = highlightHtml(renderedHtml, searchHighlight.query, searchHighlight.offset);
    return { displayHtml: result.html, targetIdx: result.targetIdx };
  }, [renderedHtml, searchHighlight]);

  // Scroll to target highlight, then fade out after 1s hold + 3s transition
  useEffect(() => {
    if (targetIdx < 0 || !containerRef.current) return;
    const scrollTimer = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const mark = containerRef.current?.querySelector(`mark[data-search-idx="${targetIdx}"]`);
          if (mark) {
            mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
          // After 1s hold, fade out all marks over 3s
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
        fontSize: '15px',
        lineHeight: '1.7',
        color: '#d4c5a9'
      }}
      dangerouslySetInnerHTML={{ __html: displayHtml }}
    />
  );
});

export default Viewer;
