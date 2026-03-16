import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

export default function PanelSearch({ containerRef, onClose }) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);       // [{ text, node, offset }]
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const marksRef = useRef([]);

  // Autofocus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const clearHighlights = useCallback(() => {
    for (const mark of marksRef.current) {
      if (mark.parentNode) {
        mark.replaceWith(mark.textContent);
        mark.parentNode?.normalize();
      }
    }
    // Second pass: normalize all parents to merge text nodes
    const container = containerRef.current;
    if (container) {
      const leftoverMarks = container.querySelectorAll('mark[data-panel-search]');
      leftoverMarks.forEach(m => {
        m.replaceWith(m.textContent);
        m.parentNode?.normalize();
      });
    }
    marksRef.current = [];
  }, [containerRef]);

  const doSearch = useCallback((searchQuery) => {
    clearHighlights();
    if (!searchQuery || !containerRef.current) {
      setMatches([]);
      setCurrentIdx(-1);
      setShowResults(false);
      return;
    }

    const container = containerRef.current;
    const qLower = searchQuery.toLowerCase();
    const foundMatches = [];
    const newMarks = [];

    // TreeWalker to find text nodes
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        // Skip nodes inside keyword/search highlights
        const parent = node.parentElement;
        if (parent?.closest('[data-kw-hl]') || parent?.closest('[data-search-hl]')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    let n;
    while ((n = walker.nextNode())) textNodes.push(n);

    for (const textNode of textNodes) {
      const text = textNode.textContent;
      const lower = text.toLowerCase();
      let pos = 0;
      const rangesInNode = [];

      while ((pos = lower.indexOf(qLower, pos)) !== -1) {
        // Extract context
        const ctxStart = Math.max(0, pos - 30);
        const ctxEnd = Math.min(text.length, pos + searchQuery.length + 30);
        const before = (ctxStart > 0 ? '…' : '') + text.substring(ctxStart, pos);
        const match = text.substring(pos, pos + searchQuery.length);
        const after = text.substring(pos + searchQuery.length, ctxEnd) + (ctxEnd < text.length ? '…' : '');

        rangesInNode.push({ start: pos, end: pos + searchQuery.length });
        foundMatches.push({ text: before + match + after, matchText: match, beforeLen: before.length });
        pos += searchQuery.length;
      }

      // Wrap matches in <mark> — process backwards to keep offsets valid
      if (rangesInNode.length > 0) {
        for (let i = rangesInNode.length - 1; i >= 0; i--) {
          const { start, end } = rangesInNode[i];
          const range = document.createRange();
          range.setStart(textNode, start);
          range.setEnd(textNode, end);
          const mark = document.createElement('mark');
          mark.setAttribute('data-panel-search', 'true');
          mark.dataset.matchIdx = String(newMarks.length + i);
          range.surroundContents(mark);
          newMarks.push(mark);
        }
      }
    }

    // Reverse newMarks to match foundMatches order (we built them backwards per node)
    // Actually, we need to re-index by DOM order
    const allDomMarks = Array.from(container.querySelectorAll('mark[data-panel-search]'));
    allDomMarks.forEach((m, i) => m.dataset.matchIdx = String(i));

    marksRef.current = allDomMarks;
    setMatches(foundMatches);
    setShowResults(foundMatches.length > 0);

    if (foundMatches.length > 0) {
      setCurrentIdx(0);
      highlightCurrent(allDomMarks, 0);
    } else {
      setCurrentIdx(-1);
    }
  }, [containerRef, clearHighlights]);

  const highlightCurrent = useCallback((marks, idx) => {
    marks.forEach((m, i) => {
      m.classList.toggle('current', i === idx);
    });
    if (marks[idx]) {
      marks[idx].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, []);

  const goToMatch = useCallback((idx) => {
    if (matches.length === 0) return;
    const newIdx = ((idx % matches.length) + matches.length) % matches.length;
    setCurrentIdx(newIdx);
    highlightCurrent(marksRef.current, newIdx);
  }, [matches.length, highlightCurrent]);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 150);
  }, [doSearch]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      clearHighlights();
      onClose();
      return;
    }
    if (e.key === 'Enter' || e.key === 'F3') {
      e.preventDefault();
      if (e.shiftKey) {
        goToMatch(currentIdx - 1);
      } else {
        goToMatch(currentIdx + 1);
      }
    }
  }, [currentIdx, goToMatch, clearHighlights, onClose]);

  const handleResultClick = useCallback((idx) => {
    setCurrentIdx(idx);
    highlightCurrent(marksRef.current, idx);
    setShowResults(false);
  }, [highlightCurrent]);

  const handleClose = useCallback(() => {
    clearHighlights();
    onClose();
  }, [clearHighlights, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearHighlights();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [clearHighlights]);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div className="panel-search-bar">
        <input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Cerca nel pannello…"
          onFocus={() => { if (matches.length > 0) setShowResults(true); }}
        />
        {matches.length > 0 && (
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {currentIdx + 1}/{matches.length}
          </span>
        )}
        <ChevronUp
          size={14}
          style={{ color: 'var(--text-tertiary)', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => goToMatch(currentIdx - 1)}
          title="Match precedente"
        />
        <ChevronDown
          size={14}
          style={{ color: 'var(--text-tertiary)', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => goToMatch(currentIdx + 1)}
          title="Match successivo"
        />
        <X
          size={14}
          style={{ color: 'var(--text-tertiary)', cursor: 'pointer', flexShrink: 0 }}
          onClick={handleClose}
          title="Chiudi ricerca"
        />
      </div>
      {showResults && matches.length > 0 && (
        <div className="panel-search-results">
          {matches.map((m, i) => (
            <div
              key={i}
              className={`result-item${i === currentIdx ? ' active' : ''}`}
              onClick={() => handleResultClick(i)}
            >
              <HighlightedContext text={m.text} matchText={m.matchText} beforeLen={m.beforeLen} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HighlightedContext({ text, matchText, beforeLen }) {
  const before = text.substring(0, beforeLen);
  const match = text.substring(beforeLen, beforeLen + matchText.length);
  const after = text.substring(beforeLen + matchText.length);
  return (
    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
      {before}
      <strong style={{ color: 'var(--accent)', fontWeight: 700 }}>{match}</strong>
      {after}
    </span>
  );
}
