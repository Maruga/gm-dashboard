import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

export default function PanelSearch({ containerRef, onClose }) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const activeMarkRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Build a text map: collect all text nodes and their offsets
  const getTextMap = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { fullText: '', nodes: [] };

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let offset = 0;
    let node;
    while ((node = walker.nextNode())) {
      const len = node.textContent.length;
      if (len > 0) {
        nodes.push({ node, start: offset, end: offset + len });
        offset += len;
      }
    }
    return { fullText: nodes.map(n => n.node.textContent).join(''), nodes };
  }, [containerRef]);

  // Remove the single active mark
  const clearActiveMark = useCallback(() => {
    const mark = activeMarkRef.current;
    if (mark?.parentNode) {
      const parent = mark.parentNode;
      mark.replaceWith(mark.textContent);
      parent.normalize();
    }
    activeMarkRef.current = null;
  }, []);

  // Scroll to a specific match by its text offset
  const scrollToMatch = useCallback((match) => {
    clearActiveMark();
    if (!containerRef.current) return;

    const { nodes } = getTextMap();
    const matchStart = match.offset;
    const matchEnd = match.offset + match.length;

    // Find start and end text nodes
    let startNode = null, startOffset = 0;
    let endNode = null, endOffset = 0;

    for (const n of nodes) {
      if (!startNode && n.end > matchStart) {
        startNode = n.node;
        startOffset = matchStart - n.start;
      }
      if (n.end >= matchEnd) {
        endNode = n.node;
        endOffset = matchEnd - n.start;
        break;
      }
    }

    if (!startNode) return;

    try {
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode || startNode, endOffset);

      // Try to wrap in a mark for visual highlight
      const mark = document.createElement('mark');
      mark.setAttribute('data-panel-search', 'true');
      mark.classList.add('current');
      range.surroundContents(mark);
      activeMarkRef.current = mark;
      mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch {
      // Range spans multiple elements — scroll to approximate position
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.collapse(true);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      containerRef.current.scrollTop += rect.top - containerRect.top - containerRef.current.clientHeight / 2;
    }
  }, [containerRef, getTextMap, clearActiveMark]);

  // Search: only text matching, no DOM manipulation
  const doSearch = useCallback((searchQuery) => {
    clearActiveMark();
    if (!searchQuery || !containerRef.current) {
      setMatches([]);
      setCurrentIdx(-1);
      setShowResults(false);
      return;
    }

    const { fullText } = getTextMap();
    const qLower = searchQuery.toLowerCase();
    const textLower = fullText.toLowerCase();
    const foundMatches = [];
    let pos = 0;

    while ((pos = textLower.indexOf(qLower, pos)) !== -1) {
      const ctxStart = Math.max(0, pos - 30);
      const ctxEnd = Math.min(fullText.length, pos + searchQuery.length + 30);
      const before = (ctxStart > 0 ? '…' : '') + fullText.substring(ctxStart, pos);
      const match = fullText.substring(pos, pos + searchQuery.length);
      const after = fullText.substring(pos + searchQuery.length, ctxEnd) + (ctxEnd < fullText.length ? '…' : '');

      foundMatches.push({
        text: before + match + after,
        matchText: match,
        beforeLen: before.length,
        offset: pos,
        length: searchQuery.length
      });
      pos += searchQuery.length;
    }

    setMatches(foundMatches);
    setShowResults(foundMatches.length > 0);

    if (foundMatches.length > 0) {
      setCurrentIdx(0);
      scrollToMatch(foundMatches[0]);
    } else {
      setCurrentIdx(-1);
    }
  }, [containerRef, getTextMap, clearActiveMark, scrollToMatch]);

  const goToMatch = useCallback((idx) => {
    if (matches.length === 0) return;
    const newIdx = ((idx % matches.length) + matches.length) % matches.length;
    setCurrentIdx(newIdx);
    scrollToMatch(matches[newIdx]);
  }, [matches, scrollToMatch]);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 150);
  }, [doSearch]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      clearActiveMark();
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
  }, [currentIdx, goToMatch, clearActiveMark, onClose]);

  const handleResultClick = useCallback((idx) => {
    setCurrentIdx(idx);
    scrollToMatch(matches[idx]);
    setShowResults(false);
  }, [matches, scrollToMatch]);

  const handleClose = useCallback(() => {
    clearActiveMark();
    onClose();
  }, [clearActiveMark, onClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearActiveMark();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [clearActiveMark]);

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
