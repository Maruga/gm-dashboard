import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { renderMarkdown } from '../utils/markdownRenderer';
import ResizeHandle from './ResizeHandle';

// ─── Dice Panel ───
const DICE = [4, 6, 8, 10, 12, 20, 100];

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

const DIE_COLORS = {
  4: 'var(--dice-d4)', 6: 'var(--dice-d6)', 8: 'var(--dice-d8)', 10: 'var(--dice-d10)',
  12: 'var(--dice-d12)', 20: 'var(--dice-d20)', 100: 'var(--dice-d100)'
};

function dieValueColor(value, sides) {
  if (value === 1) return 'var(--color-danger-bright)';
  if (value === sides) return 'var(--color-success-bright)';
  return 'var(--text-bright)';
}

function DicePanel({ onCastDie, onCastDiceTotal, onCastClearScene, castScene = [] }) {
  const [rolls, setRolls] = useState([]);
  const lastRollTime = useRef(0);
  const groupId = useRef(0);

  const handleRoll = useCallback((sides) => {
    const now = Date.now();
    if (now - lastRollTime.current > 3000) {
      groupId.current++;
    }
    lastRollTime.current = now;
    const value = rollDie(sides);
    setRolls(prev => [{ id: crypto.randomUUID(), sides, value, group: groupId.current }, ...prev]);
  }, []);

  const clearRolls = useCallback(() => setRolls([]), []);

  // Il rollId è già nella scena di cast? (serve per mostrare un ✓)
  const isInScene = (roll) => castScene.some(d => d.rollId === roll.id);

  // Totale del gruppo corrente dello storico locale
  const groupTotals = {};
  for (const r of rolls) {
    groupTotals[r.group] = (groupTotals[r.group] || 0) + r.value;
  }

  return (
    <div style={{
      width: '150px', flexShrink: 0, borderLeft: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '6px 8px', fontSize: '10px', fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--accent)',
        borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: '6px',
        height: '26px', boxSizing: 'border-box'
      }}>
        <span>Dadi</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {castScene.length > 0 && onCastClearScene && (
            <span
              onClick={onCastClearScene}
              title={`Pulisci scena dadi sul display (${castScene.length})`}
              style={{
                fontSize: '10px', color: 'var(--color-warning)', cursor: 'pointer',
                padding: '0 4px', border: '1px solid var(--color-warning)', borderRadius: '3px'
              }}
            >📡✕{castScene.length}</span>
          )}
          {rolls.length > 0 && (
            <span className="close-btn" onClick={clearRolls} style={{ fontSize: '12px' }} title="Svuota storico">✕</span>
          )}
        </div>
      </div>

      {/* Body: buttons + results side by side */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Dice buttons column */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '3px',
          padding: '5px', flexShrink: 0
        }}>
          {DICE.map(d => (
            <button
              key={d}
              onClick={() => handleRoll(d)}
              style={{
                background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                padding: '3px 0', width: '40px', color: DIE_COLORS[d], fontSize: '11px',
                cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', fontWeight: '600'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = DIE_COLORS[d]; e.currentTarget.style.background = 'var(--accent-a08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'none'; }}
            >
              d{d}
            </button>
          ))}
        </div>

        {/* Results column */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px 4px 0' }}>
          {rolls.map((roll, i) => {
            const prevGroup = i > 0 ? rolls[i - 1].group : roll.group;
            const showSep = i > 0 && roll.group !== prevGroup;
            const inScene = isInScene(roll);
            // Mostra bottone "totale" solo sulla prima riga di un gruppo con >= 2 dadi
            const isGroupStart = i === 0 || rolls[i - 1].group !== roll.group;
            const rollsInGroup = rolls.filter(r => r.group === roll.group);
            const showTotal = isGroupStart && onCastDiceTotal && rollsInGroup.length >= 2;
            return (
              <div key={roll.id}>
                {showSep && (
                  <div style={{ borderTop: '1px dashed var(--text-disabled)', margin: '4px 0' }} />
                )}
                <div
                  onClick={onCastDie ? () => onCastDie({ id: roll.id, sides: roll.sides, value: roll.value }) : undefined}
                  title={onCastDie ? (inScene ? 'Già sul display — clicca per rimandarlo' : 'Invia al display') : undefined}
                  style={{
                    padding: '2px 6px', marginBottom: '1px', borderRadius: '3px',
                    background: inScene ? 'var(--accent-a08)' : 'var(--bg-glow-subtle)',
                    border: inScene ? '1px solid var(--accent)' : '1px solid transparent',
                    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px',
                    cursor: onCastDie ? 'pointer' : 'default',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={onCastDie ? e => { if (!inScene) e.currentTarget.style.background = 'var(--bg-hover-subtle)'; } : undefined}
                  onMouseLeave={onCastDie ? e => { e.currentTarget.style.background = inScene ? 'var(--accent-a08)' : 'var(--bg-glow-subtle)'; } : undefined}
                >
                  <span style={{ fontSize: '10px', color: DIE_COLORS[roll.sides], fontWeight: '600' }}>
                    {inScene ? '📡 ' : ''}d{roll.sides}
                  </span>
                  <span style={{
                    fontSize: '16px', fontWeight: '800',
                    color: dieValueColor(roll.value, roll.sides),
                    lineHeight: '1.2'
                  }}>
                    {roll.value}
                  </span>
                </div>
                {showTotal && (
                  <div
                    onClick={() => onCastDiceTotal(groupTotals[roll.group])}
                    title="Mostra totale del gruppo sul display"
                    style={{
                      padding: '1px 6px', marginBottom: '2px', borderRadius: '3px',
                      fontSize: '9px', color: 'var(--text-tertiary)', cursor: 'pointer',
                      textAlign: 'right'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  >
                    📡 Totale: {groupTotals[roll.group]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Search Panel (main Console content) ───
function Console({ projectFolder, onOpenFile, onSearchNavigate, externalQuery, telegramLog = [], onClearLog, aiConfig, aiChatHistory = [], onAiChatHistoryChange, firebaseUser, onTelegramText, onTelegramFile, onSaveImage, botRunning, players = [], onAiConfigChange, aiTestConversations = {}, onAiTestConversationsChange, onClearAiTelegramHistory, onCastDie, onCastDiceTotal, onCastClearScene, castDiceScene = [] }) {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const logEndRef = useRef(null);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiQuota, setAiQuota] = useState(null);
  const [imageMode, setImageMode] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState({});
  const aiEndRef = useRef(null);
  const aiInputRef = useRef(null);
  const [ragStatus, setRagStatus] = useState('unknown'); // unknown | not_indexed | indexing | ready
  const [ragProgress, setRagProgress] = useState(null);
  const ragDismissTimer = useRef(null);

  // Check RAG status on mount and when tab changes to AI
  useEffect(() => {
    if (activeTab !== 'ai') return;
    window.electronAPI?.ragGetStatus?.().then(s => {
      if (s.indexing) setRagStatus('indexing');
      else if (s.hasIndex) setRagStatus('ready');
      else setRagStatus('not_indexed');
    }).catch(() => setRagStatus('not_indexed'));
  }, [activeTab]);

  // RAG progress listener
  useEffect(() => {
    const unsub = window.electronAPI?.onRagProgress?.((data) => {
      setRagProgress(data);
      if (data.phase === 'indexing') setRagStatus('indexing');
      if (data.phase === 'done') {
        setRagStatus('ready');
        if (ragDismissTimer.current) clearTimeout(ragDismissTimer.current);
        ragDismissTimer.current = setTimeout(() => setRagProgress(null), 4000);
      }
    });
    return () => { unsub?.(); if (ragDismissTimer.current) clearTimeout(ragDismissTimer.current); };
  }, []);

  const handleIndexNow = async () => {
    setRagStatus('indexing');
    setRagProgress({ phase: 'indexing', message: 'Avvio indicizzazione...', progress: 0 });
    const ragSaved = aiConfig?.rag || {};
    const ragOpts = { ...ragSaved, chunkOverlap: Math.round((ragSaved.chunkSize || 500) * (ragSaved.overlapPercent || 10) / 100) };
    try {
      await window.electronAPI?.ragOpen?.(projectFolder, ragOpts);
      await window.electronAPI?.ragIndexAll?.();
    } catch (err) {
      console.warn('Index failed:', err);
      setRagStatus('not_indexed');
      setRagProgress(null);
    }
  };

  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`search-history:${projectFolder}`);
      if (saved) setSearchHistory(JSON.parse(saved));
    } catch (e) { console.warn('Search history load failed:', e.message); }
  }, [projectFolder]);

  const saveToHistory = useCallback((query) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      const next = [query, ...filtered].slice(0, 30);
      try { localStorage.setItem(`search-history:${projectFolder}`, JSON.stringify(next)); } catch (e) { console.warn('Search history save failed:', e.message); }
      return next;
    });
  }, [projectFolder]);

  const doSearch = useCallback(async (query) => {
    const q = query.trim();
    if (!q || !projectFolder) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const data = await window.electronAPI.searchFiles(projectFolder, q);
      setSearchResults(data);
    } catch (err) {
      console.error('Search error:', err);
    }
    setSearching(false);
  }, [projectFolder]);

  // Debounced search on typing
  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);
    setShowSuggestions(val.length > 0 && searchHistory.some(q => q.toLowerCase().includes(val.toLowerCase())));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        doSearch(val);
        setShowSuggestions(false);
      }, 400);
    } else if (val.trim().length === 0) {
      setSearchResults(null);
    }
  }, [doSearch, searchHistory]);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = searchQuery.trim();
    if (q) saveToHistory(q);
    doSearch(searchQuery);
    setShowSuggestions(false);
  }, [searchQuery, doSearch, saveToHistory]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(null);
    setShowSuggestions(false);
    if (onSearchNavigate) onSearchNavigate(null);
    if (inputRef.current) inputRef.current.focus();
  }, [onSearchNavigate]);

  // External query from context menu
  useEffect(() => {
    if (externalQuery?.text) {
      setSearchQuery(externalQuery.text);
      setShowSuggestions(false);
      saveToHistory(externalQuery.text);
      doSearch(externalQuery.text);
    }
  }, [externalQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileClick = useCallback((result) => {
    onOpenFile({ path: result.path, name: result.name, extension: '.' + result.name.split('.').pop() });
  }, [onOpenFile]);

  const handleMatchClick = useCallback((result, match) => {
    if (onSearchNavigate) {
      onSearchNavigate({
        path: result.path,
        name: result.name,
        extension: '.' + result.name.split('.').pop(),
        query: searchQuery.trim(),
        offset: match.offset,
        line: match.line
      });
    }
  }, [onSearchNavigate, searchQuery]);

  // Highlight search term in snippet
  const renderSnippet = useCallback((text, query) => {
    if (!query) return text;
    const parts = [];
    const lower = text.toLowerCase();
    const qLower = query.toLowerCase();
    let lastIdx = 0;
    let pos = 0;
    while ((pos = lower.indexOf(qLower, lastIdx)) !== -1) {
      if (pos > lastIdx) parts.push(<span key={lastIdx}>{text.substring(lastIdx, pos)}</span>);
      parts.push(<span key={`h${pos}`} style={{ color: 'var(--accent)', fontWeight: '600' }}>{text.substring(pos, pos + query.length)}</span>);
      lastIdx = pos + query.length;
    }
    if (lastIdx < text.length) parts.push(<span key={lastIdx}>{text.substring(lastIdx)}</span>);
    return parts;
  }, []);

  const fileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'md') return '📄';
    if (ext === 'html' || ext === 'htm') return '🌐';
    if (ext === 'txt') return '📝';
    return '📄';
  };

  // Auto-scroll log to bottom when new entries arrive
  useEffect(() => {
    if (activeTab === 'log' && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [telegramLog, activeTab]);

  // Auto-scroll AI chat
  useEffect(() => {
    if (activeTab === 'ai' && aiEndRef.current) {
      aiEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiChatHistory, aiLoading, imageLoading, activeTab]);

  // Fetch quota on first AI tab open
  useEffect(() => {
    if (activeTab === 'ai' && !aiQuota && !aiConfig?.apiKey && firebaseUser) {
      window.electronAPI.aiGetQuota().then(q => { if (q && !q.error) setAiQuota(q); });
    }
  }, [activeTab, aiQuota, aiConfig?.apiKey, firebaseUser]);

  const canGenerateImage = !!(
    (aiConfig?.provider === 'openai' && aiConfig?.apiKey) ||
    aiConfig?.openaiImageKey ||
    firebaseUser
  );

  const handleAiSend = useCallback(async () => {
    const text = aiInput.trim();
    if (!text || aiLoading || imageLoading) return;

    if (imageMode) {
      // Modalità generazione immagine
      const userMsg = { role: 'user', content: `🖼️ ${text}`, timestamp: new Date().toISOString(), isImageRequest: true };
      const newHistory = [...aiChatHistory, userMsg];
      onAiChatHistoryChange(newHistory);
      setAiInput('');
      setImageLoading(true);
      try {
        const result = await window.electronAPI.aiGenerateImage(text, projectFolder);
        if (result.quota) setAiQuota(result.quota);
        if (result.error) {
          onAiChatHistoryChange([...newHistory, { role: 'assistant', content: `❌ ${result.error}`, timestamp: new Date().toISOString(), isError: true }]);
        } else {
          onAiChatHistoryChange([...newHistory, {
            role: 'assistant',
            content: '',
            imagePath: result.relativePath,
            imageFullPath: result.filePath,
            timestamp: new Date().toISOString()
          }]);
        }
      } catch (err) {
        onAiChatHistoryChange([...newHistory, { role: 'assistant', content: `❌ ${err.message}`, timestamp: new Date().toISOString(), isError: true }]);
      }
      setImageLoading(false);
      setImageMode(false);
      aiInputRef.current?.focus();
      return;
    }

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newHistory = [...aiChatHistory, userMsg];
    onAiChatHistoryChange(newHistory);
    setAiInput('');
    setAiLoading(true);
    try {
      // Send last 10 messages for context
      const contextMessages = newHistory.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const result = await window.electronAPI.aiChat(contextMessages, projectFolder);
      if (result.quota) setAiQuota(result.quota);
      const aiMsg = {
        role: 'assistant',
        content: result.error ? `❌ ${result.error}` : result.response,
        timestamp: new Date().toISOString(),
        isError: !!result.error,
        tokensUsed: result.tokensUsed || 0
      };
      onAiChatHistoryChange([...newHistory, aiMsg]);
    } catch (err) {
      onAiChatHistoryChange([...newHistory, { role: 'assistant', content: `❌ ${err.message}`, timestamp: new Date().toISOString(), isError: true }]);
    }
    setAiLoading(false);
    aiInputRef.current?.focus();
  }, [aiInput, aiLoading, imageLoading, imageMode, aiChatHistory, onAiChatHistoryChange, projectFolder]);

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* Left: Search + Log */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Tab Header */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0
        }}>
          {[
            { key: 'search', label: 'Ricerca', icon: '🔍' },
            { key: 'ai', label: 'AI', icon: '🤖' },
            { key: 'test', label: 'Prova PG', icon: '🎭' },
            { key: 'log', label: `Log Telegram${telegramLog.length > 0 ? ` (${telegramLog.length})` : ''}`, icon: '📨' }
          ].map(tab => (
            <div
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '6px 12px', fontSize: '10px', fontWeight: '600',
                textTransform: 'uppercase', letterSpacing: '1.2px', cursor: 'pointer',
                color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-tertiary)',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--text-secondary-light)'; }}
              onMouseLeave={e => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--text-tertiary)'; }}
            >
              {tab.icon} {tab.label}
            </div>
          ))}
        </div>

        {/* Search tab content */}
        {activeTab === 'search' && (
          <>
            {/* Search input */}
            <form onSubmit={handleSubmit} style={{ padding: '6px 12px', flexShrink: 0 }}>
              <div style={{ position: 'relative' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleChange}
                  placeholder="Cerca nei documenti..."
                  autoComplete="off"
                  style={{
                    width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                    borderRadius: '4px', padding: '6px 28px 6px 10px', color: 'var(--text-primary)',
                    fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; if (searchHistory.length > 0 && !searchQuery) setShowSuggestions(true); }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; setTimeout(() => setShowSuggestions(false), 150); }}
                />
                {searchQuery && (
                  <span className="close-btn" onClick={clearSearch}
                    style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px' }}
                  >✕</span>
                )}
                {/* Autocomplete suggestions */}
                {showSuggestions && searchHistory.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderTop: 'none',
                    borderRadius: '0 0 4px 4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto'
                  }}>
                    {searchHistory
                      .filter(q => !searchQuery || q.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 8)
                      .map((q, i) => (
                        <div key={i}
                          onMouseDown={(e) => { e.preventDefault(); setSearchQuery(q); setShowSuggestions(false); saveToHistory(q); doSearch(q); }}
                          style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--text-secondary-light)', cursor: 'pointer', transition: 'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--border-default)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >{q}</div>
                      ))}
                  </div>
                )}
              </div>
            </form>

            {/* Results */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 8px' }}>
              {searching && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '11px', padding: '6px 0' }}>Ricerca in corso...</div>
              )}

              {searchResults && !searching && (
                searchResults.totalMatches > 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '4px 0 6px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{searchResults.totalMatches}</span> risultat{searchResults.totalMatches === 1 ? 'o' : 'i'} in{' '}
                    <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{searchResults.totalFiles}</span> file
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic', padding: '8px 0' }}>
                    Nessun risultato per: "{searchQuery.trim()}"
                  </div>
                )
              )}

              {searchResults?.results?.map((result, i) => (
                <div key={i} style={{ marginBottom: '2px', paddingBottom: '2px' }}>
                  <div
                    onClick={() => handleFileClick(result)}
                    style={{
                      padding: '5px 6px', cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '6px',
                      borderRadius: '3px', transition: 'background 0.1s',
                      background: 'var(--bg-main)', marginBottom: '2px', borderLeft: '2px solid var(--accent)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-main)'}
                  >
                    <span style={{ fontSize: '11px', flexShrink: 0 }}>{fileIcon(result.name)}</span>
                    <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '600', flexShrink: 0 }}>{result.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {result.relativePath}
                    </span>
                  </div>
                  {result.matches.map((m, j) => (
                    <div key={j}
                      onClick={() => handleMatchClick(result, m)}
                      style={{
                        padding: '2px 4px 2px 18px', cursor: 'pointer',
                        fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5',
                        borderRadius: '2px', transition: 'background 0.1s', wordBreak: 'break-word'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {renderSnippet(m.text, searchQuery.trim())}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Telegram Log tab content */}
        {activeTab === 'log' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Log header with clear button */}
            {telegramLog.length > 0 && (
              <div style={{
                padding: '4px 12px', flexShrink: 0,
                display: 'flex', justifyContent: 'flex-end'
              }}>
                <button
                  onClick={onClearLog}
                  style={{
                    background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                    padding: '2px 8px', color: 'var(--text-secondary)', fontSize: '10px', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  🗑️ Svuota log
                </button>
              </div>
            )}

            {/* Log entries */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 8px' }}>
              {telegramLog.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic', padding: '12px 0', textAlign: 'center' }}>
                  Nessun invio registrato
                </div>
              ) : (
                telegramLog.map((entry, i) => (
                  <div key={i} style={{
                    padding: '4px 8px', marginBottom: '2px', borderRadius: '3px',
                    background: 'var(--bg-glow-faint)',
                    borderLeft: `2px solid ${entry.success ? 'var(--color-success-alt)' : 'var(--color-danger)'}`,
                    fontSize: '11px', lineHeight: '1.5'
                  }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                      <span>{entry.icon || (entry.success ? '✅' : '❌')}</span>
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '10px', flexShrink: 0 }}>
                        {entry.date}
                      </span>
                      <span style={{ color: 'var(--text-primary)' }}>
                        {entry.description}
                      </span>
                    </div>
                    {entry.recipient && (
                      <div style={{ paddingLeft: '22px', color: 'var(--text-secondary)', fontSize: '10px' }}>
                        → {entry.recipient}
                      </div>
                    )}
                    {entry.error && (
                      <div style={{ paddingLeft: '22px', color: 'var(--color-danger)', fontSize: '10px' }}>
                        {entry.error}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        )}

        {/* AI tab content */}
        {activeTab === 'ai' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* RAG status banner */}
            {ragStatus === 'not_indexed' && (
              <div style={{
                padding: '6px 12px', fontSize: '11px', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
                color: 'var(--color-warning)',
                borderBottom: '0.5px solid var(--border-subtle)'
              }}>
                <span>⚠</span>
                <span style={{ flex: 1 }}>Documenti non indicizzati — ricerca basata su parole chiave</span>
                <span onClick={handleIndexNow} style={{
                  padding: '3px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600',
                  background: 'var(--color-warning)', color: 'var(--bg-main)', fontSize: '11px'
                }}>Indicizza ora</span>
              </div>
            )}
            {ragStatus === 'indexing' && ragProgress && (
              <div style={{
                padding: '6px 12px', fontSize: '11px', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'color-mix(in srgb, var(--color-info) 10%, transparent)',
                color: 'var(--color-info)',
                borderBottom: '0.5px solid var(--border-subtle)'
              }}>
                <span>⟳</span>
                <span style={{ flex: 1 }}>{ragProgress.message}</span>
                {ragProgress.progress != null && (
                  <div style={{ width: '60px', height: '3px', borderRadius: '2px', background: 'var(--border-subtle)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '2px', background: 'currentColor', width: `${ragProgress.progress}%`, transition: 'width 0.3s' }} />
                  </div>
                )}
              </div>
            )}
            {ragStatus === 'ready' && ragProgress?.phase === 'done' && (
              <div style={{
                padding: '4px 12px', fontSize: '11px', flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'color-mix(in srgb, var(--color-success) 10%, transparent)',
                color: 'var(--color-success)',
                borderBottom: '0.5px solid var(--border-subtle)'
              }}>
                <span>✓</span>
                <span style={{ flex: 1 }}>{ragProgress.message}</span>
              </div>
            )}
            {(!aiConfig?.provider && !aiConfig?.apiKey && !firebaseUser) ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                Configura l'AI nelle Impostazioni → Assistente AI<br />
                <span style={{ fontSize: '10px' }}>Oppure effettua il login (icona utente in alto) per usare la quota gratuita (~250 domande incluse)</span>
              </div>
            ) : (!aiConfig?.apiKey && !firebaseUser) ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-primary)' }}>
                  Per usare l'AI serve un accesso
                </div>
                <div style={{ lineHeight: '1.6' }}>
                  Inserisci una API key nelle Impostazioni → Assistente AI<br />
                  oppure effettua il login (icona utente in alto a destra)<br />
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>per la quota gratuita (~250 domande incluse)</span>
                </div>
              </div>
            ) : (
              <>
                {/* Header with clear */}
                {aiChatHistory.length > 0 && (
                  <div style={{ padding: '4px 12px', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => onAiChatHistoryChange([])}
                      style={{
                        background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                        padding: '2px 8px', color: 'var(--text-secondary)', fontSize: '10px', cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      🗑️ Svuota
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 12px 8px' }}>
                  {aiChatHistory.length === 0 && !aiLoading && (
                    <div style={{ padding: '12px 0', textAlign: 'center', fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                      Fai una domanda sull'avventura...
                    </div>
                  )}
                  {aiChatHistory.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
                    return (
                      <div key={i} style={{
                        marginBottom: '6px',
                        display: 'flex',
                        justifyContent: isUser ? 'flex-end' : 'flex-start'
                      }}>
                        <div style={{
                          maxWidth: '85%',
                          padding: '6px 10px',
                          borderRadius: isUser ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                          background: isUser ? 'var(--chat-gm-bg)' : 'var(--bg-main)',
                          border: isUser ? '1px solid var(--chat-gm-border)' : '1px solid var(--border-subtle)'
                        }}>
                          <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginBottom: '2px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span>{time}</span>
                            <span style={{ fontWeight: '600' }}>{isUser ? 'Tu' : '🤖 AI'}</span>
                            {!isUser && msg.tokensUsed > 0 && (
                              <span style={{ marginLeft: 'auto', color: 'var(--text-disabled)', fontSize: '9px' }}>
                                {msg.tokensUsed.toLocaleString()} token
                              </span>
                            )}
                          </div>
                          {msg.imagePath ? (
                            <div>
                              <img
                                src={`app://local/-/${msg.imageFullPath?.replace(/\\/g, '/')}`}
                                alt="Immagine generata"
                                style={{ maxWidth: '300px', maxHeight: '300px', borderRadius: '4px', cursor: 'pointer', display: 'block' }}
                                onClick={() => onOpenFile(msg.imagePath)}
                              />
                              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                <button onClick={() => onOpenFile(msg.imagePath)}
                                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '10px', cursor: 'pointer', padding: '0', textDecoration: 'underline' }}>
                                  Apri file
                                </button>
                                <button
                                  onClick={() => onTelegramFile({ name: msg.imagePath.split('/').pop(), extension: '.png', path: msg.imageFullPath })}
                                  disabled={!botRunning}
                                  style={{ background: 'none', border: 'none', color: botRunning ? 'var(--accent)' : 'var(--text-disabled)', fontSize: '10px', cursor: botRunning ? 'pointer' : 'default', padding: '0' }}>
                                  ✉ Telegram
                                </button>
                                <button
                                  onClick={async () => {
                                    const r = await onSaveImage(msg.imageFullPath);
                                    if (r?.success) setSaveStatus(p => ({ ...p, [i]: 'ok' }));
                                    else if (r?.error) setSaveStatus(p => ({ ...p, [i]: 'err' }));
                                    if (r) setTimeout(() => setSaveStatus(p => { const n = {...p}; delete n[i]; return n; }), 3000);
                                  }}
                                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '10px', cursor: 'pointer', padding: '0' }}>
                                  {saveStatus[i] === 'ok' ? '✓ Salvato' : saveStatus[i] === 'err' ? '✗ Errore' : '💾 Salva in...'}
                                </button>
                              </div>
                            </div>
                          ) : isUser || msg.isError ? (
                            <div style={{
                              fontSize: '12px',
                              color: msg.isError ? 'var(--color-danger)' : 'var(--text-primary)',
                              lineHeight: '1.5',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word'
                            }}>
                              {msg.content}
                            </div>
                          ) : (
                            <>
                              <div
                                className="ai-response-md"
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--text-primary)',
                                  lineHeight: '1.6',
                                  wordBreak: 'break-word'
                                }}
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                              />
                              <div style={{ display: 'flex', gap: '6px', marginTop: '4px', paddingTop: '3px', borderTop: '1px solid var(--border-subtle)' }}>
                                <button
                                  onClick={() => onTelegramText(msg.content)}
                                  disabled={!botRunning}
                                  style={{ background: 'none', border: 'none', color: botRunning ? 'var(--accent)' : 'var(--text-disabled)', fontSize: '10px', cursor: botRunning ? 'pointer' : 'default', padding: '0' }}>
                                  ✉ Invia via Telegram
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {aiLoading && (
                    <div style={{ padding: '6px 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      🤖 Sto pensando...
                    </div>
                  )}
                  {imageLoading && (
                    <div style={{ padding: '6px 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      🖼️ Genero l'immagine...
                    </div>
                  )}
                  <div ref={aiEndRef} />
                </div>

                {/* Input */}
                <form
                  onSubmit={e => { e.preventDefault(); handleAiSend(); }}
                  style={{ padding: '6px 12px', flexShrink: 0, display: 'flex', gap: '6px' }}
                >
                  <button
                    type="button"
                    onClick={() => setImageMode(v => !v)}
                    disabled={!canGenerateImage}
                    title={canGenerateImage ? (imageMode ? 'Torna alla chat' : 'Genera immagine') : 'Serve una chiave OpenAI o il login per generare immagini'}
                    style={{
                      background: imageMode ? 'var(--accent)' : 'none',
                      border: '1px solid var(--border-default)',
                      borderRadius: '4px', padding: '0 8px', flexShrink: 0,
                      color: !canGenerateImage ? 'var(--text-disabled)' : imageMode ? 'var(--bg-main)' : 'var(--text-secondary)',
                      cursor: canGenerateImage ? 'pointer' : 'not-allowed',
                      fontSize: '13px', transition: 'all 0.15s', lineHeight: 1
                    }}
                  >🖼️</button>
                  <input
                    ref={aiInputRef}
                    type="text"
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    placeholder={imageMode ? "Descrivi l'immagine da generare..." : "Chiedi qualcosa sull'avventura..."}
                    disabled={aiLoading || imageLoading}
                    style={{
                      flex: 1, background: 'var(--bg-input)',
                      border: imageMode ? '1px solid var(--accent)' : '1px solid var(--border-default)',
                      borderRadius: '4px', padding: '6px 10px', color: 'var(--text-primary)',
                      fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                    }}
                    onFocus={e => { if (!imageMode) e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onBlur={e => { if (!imageMode) e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                  />
                  <button
                    type="submit"
                    disabled={!aiInput.trim() || aiLoading || imageLoading}
                    style={{
                      background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                      padding: '0 12px', color: aiInput.trim() && !aiLoading && !imageLoading ? 'var(--accent)' : 'var(--text-disabled)',
                      cursor: aiInput.trim() && !aiLoading && !imageLoading ? 'pointer' : 'not-allowed',
                      fontSize: '12px', transition: 'all 0.15s', flexShrink: 0
                    }}
                    onMouseEnter={e => { if (aiInput.trim() && !aiLoading && !imageLoading) e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  >
                    {imageMode ? 'Genera' : 'Invia'}
                  </button>
                </form>
                {/* Token usage info — sempre visibile */}
                {(() => {
                  const sessionTokens = aiChatHistory.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
                  return (sessionTokens > 0 || (aiQuota && !aiConfig?.apiKey)) ? (
                    <div style={{
                      padding: '2px 12px 4px', fontSize: '10px', color: 'var(--text-tertiary)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px'
                    }}>
                      {sessionTokens > 0 && (
                        <span>Utilizzati in sessione: {sessionTokens.toLocaleString()} token</span>
                      )}
                      {aiQuota && !aiConfig?.apiKey && (
                        <span style={{ marginLeft: 'auto' }}>
                          Disponibili: {aiQuota.remaining?.toLocaleString()} / {aiQuota.tokenAllowance?.toLocaleString()}
                          {aiQuota.remaining <= 0 && <span style={{ color: 'var(--color-danger)', fontWeight: '600', marginLeft: '6px' }}>Esaurita</span>}
                          {aiQuota.remaining > 0 && aiQuota.remaining < aiQuota.tokenAllowance * 0.2 && (
                            <span style={{ color: 'var(--color-warning, #e8a33e)', marginLeft: '6px' }}>In esaurimento</span>
                          )}
                        </span>
                      )}
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </div>
        )}

        {/* Test PG tab content */}
        {activeTab === 'test' && (
          <AiTestPanel
            projectFolder={projectFolder}
            aiConfig={aiConfig}
            players={players}
            firebaseUser={firebaseUser}
            aiTestConversations={aiTestConversations}
            onAiTestConversationsChange={onAiTestConversationsChange}
            onClearAiTelegramHistory={onClearAiTelegramHistory}
          />
        )}
      </div>

      {/* Right: Dice */}
      <DicePanel
        onCastDie={onCastDie}
        onCastDiceTotal={onCastDiceTotal}
        onCastClearScene={onCastClearScene}
        castScene={castDiceScene}
      />
    </div>
  );
}

// ─── AI Test Panel ───
// Chat di prova per il GM: simula conversazioni AI per singolo PG con gli stessi documenti
// che userebbe Telegram, e permette di editare i file direttamente.
function AiTestPanel({ projectFolder, aiConfig, players, firebaseUser, aiTestConversations, onAiTestConversationsChange, onClearAiTelegramHistory }) {
  const [selectedPgId, setSelectedPgId] = useState(players[0]?.id || '');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmClearTest, setConfirmClearTest] = useState(false);
  const [confirmClearTelegram, setConfirmClearTelegram] = useState(false);
  const confirmClearTestTimer = useRef(null);
  const confirmClearTelegramTimer = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Editor state: { [relativeFile]: { content, original, open, loading, saveStatus } }
  const [editors, setEditors] = useState({});
  // Dirty guard on PG change
  const [pendingPgChange, setPendingPgChange] = useState(null);
  // Resizable split chat/docs (persisted)
  const [docPanelWidth, setDocPanelWidth] = useState(() => {
    const saved = parseInt(localStorage.getItem('aiTestDocPanelWidth') || '', 10);
    return Number.isFinite(saved) ? saved : 360;
  });
  useEffect(() => {
    localStorage.setItem('aiTestDocPanelWidth', String(docPanelWidth));
  }, [docPanelWidth]);
  const splitContainerRef = useRef(null);
  const clampWidth = useCallback((next, total) => {
    const minChat = 280;
    const minDocs = 220;
    const maxDocs = Math.max(minDocs, total - minChat);
    return Math.max(minDocs, Math.min(maxDocs, next));
  }, []);
  const handleSplitResize = useCallback((delta) => {
    const container = splitContainerRef.current;
    if (!container) return;
    const total = container.getBoundingClientRect().width;
    setDocPanelWidth(prev => clampWidth(prev - delta, total));
  }, [clampWidth]);
  // Auto-clamp quando il container cambia dimensione (es. resize finestra)
  useEffect(() => {
    const container = splitContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const total = container.getBoundingClientRect().width;
      if (total > 0) setDocPanelWidth(prev => clampWidth(prev, total));
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [clampWidth]);

  const player = players.find(p => p.id === selectedPgId) || null;

  const commonDocs = (aiConfig?.commonDocs || []);
  const personalDocs = (player?.aiDocuments || []);
  const history = aiTestConversations[selectedPgId] || [];

  // Considera dirty anche gli editor chiusi: il loro content è ancora in memoria ma verrà
  // scartato al cambio PG se non salvato (escludo loading per evitare confronti undefined).
  const hasUnsaved = Object.values(editors).some(e => e && !e.loading && e.content !== e.original);

  // Update default selection when players change (empty state or removed PG)
  useEffect(() => {
    if (players.length === 0) return;
    if (!selectedPgId || !players.find(p => p.id === selectedPgId)) {
      setSelectedPgId(players[0].id);
    }
  }, [players, selectedPgId]);

  // Auto-scroll chat
  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [history.length, loading]);

  // Keep only common-doc editors when changing PG (common files don't belong to a specific PG)
  const pruneEditorsForPg = () => {
    const commonFiles = new Set(commonDocs.map(d => d.file));
    setEditors(prev => {
      const kept = {};
      for (const [k, v] of Object.entries(prev)) if (commonFiles.has(k)) kept[k] = v;
      return kept;
    });
  };

  const handlePgChange = (newId) => {
    if (newId === selectedPgId) return;
    if (hasUnsaved) {
      setPendingPgChange(newId);
      return;
    }
    setSelectedPgId(newId);
    pruneEditorsForPg();
  };

  const confirmPgChange = () => {
    setSelectedPgId(pendingPgChange);
    pruneEditorsForPg();
    setPendingPgChange(null);
  };

  const toggleEditor = async (doc) => {
    const key = doc.file;
    const current = editors[key];
    if (current?.open) {
      // Just close the pane — keep content/original in memory so reopening restores the work
      setEditors(prev => ({ ...prev, [key]: { ...prev[key], open: false } }));
      return;
    }
    // Reopen: reuse in-memory content if already loaded, otherwise load from disk
    if (current && current.original !== undefined) {
      setEditors(prev => ({ ...prev, [key]: { ...prev[key], open: true, loading: false } }));
      return;
    }
    setEditors(prev => ({ ...prev, [key]: { ...(prev[key] || {}), open: true, loading: true } }));
    const content = await window.electronAPI.readFile(projectFolder + '/' + doc.file);
    setEditors(prev => ({
      ...prev,
      [key]: { open: true, loading: false, content: content || '', original: content || '', saveStatus: null }
    }));
  };

  const handleEditorChange = (key, value) => {
    setEditors(prev => ({ ...prev, [key]: { ...prev[key], content: value, saveStatus: null } }));
  };

  const handleSave = async (key) => {
    const ed = editors[key];
    if (!ed || ed.content === ed.original) return;
    setEditors(prev => ({ ...prev, [key]: { ...prev[key], saveStatus: 'saving' } }));
    const result = await window.electronAPI.writeFile(projectFolder, key, ed.content);
    if (result?.success) {
      setEditors(prev => ({ ...prev, [key]: { ...prev[key], original: ed.content, saveStatus: 'ok' } }));
      setTimeout(() => {
        setEditors(prev => prev[key] ? { ...prev, [key]: { ...prev[key], saveStatus: null } } : prev);
      }, 2000);
    } else {
      setEditors(prev => ({ ...prev, [key]: { ...prev[key], saveStatus: 'err' } }));
    }
  };

  const handleRevert = (key) => {
    setEditors(prev => ({ ...prev, [key]: { ...prev[key], content: prev[key].original, saveStatus: null } }));
  };

  const handleSend = async () => {
    const question = input.trim();
    if (!question || !player || loading) return;

    const allActiveDocs = [...commonDocs, ...personalDocs].filter(d => d.active);
    if (allActiveDocs.length === 0) {
      onAiTestConversationsChange(prev => ({
        ...prev,
        [selectedPgId]: [...(prev[selectedPgId] || []),
          { role: 'user', content: question, timestamp: new Date().toISOString() },
          { role: 'assistant', content: 'Nessun documento attivo per questo personaggio.', timestamp: new Date().toISOString(), isError: true }
        ]
      }));
      setInput('');
      return;
    }

    // Escludi messaggi speciali (_msg_*) dal contesto AI
    const allowedFiles = allActiveDocs.filter(d => !d.name?.toLowerCase().startsWith('_msg_')).map(d => d.file);
    const promptDoc = allActiveDocs.find(d => d.name?.toLowerCase().startsWith('_prompt'));
    const chatOpts = { allowedFiles };

    if (promptDoc) {
      const promptContent = await window.electronAPI.readFile(projectFolder + '/' + promptDoc.file);
      if (promptContent) {
        chatOpts.allowedFiles = allowedFiles.filter(f => f !== promptDoc.file);
        const charName = player.characterName || '';
        const playerIdentity = charName ? `\n\n# STAI COMUNICANDO CON\n${charName}. Rivolgiti direttamente a questo operatore usando "tu". Usa le informazioni che hai su di lui nei documenti attivi.` : '';
        chatOpts.systemPromptOverride = promptContent + playerIdentity;
        chatOpts.maxTokens = 2048;
      }
    }

    const prevHistory = (aiTestConversations[selectedPgId] || []).slice(-30);
    const aiMessages = [
      ...prevHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: question }
    ];

    setLoading(true);
    onAiTestConversationsChange(prev => ({
      ...prev,
      [selectedPgId]: [...(prev[selectedPgId] || []), { role: 'user', content: question, timestamp: new Date().toISOString() }]
    }));
    setInput('');
    // Keep focus on the input so the user can keep typing while the AI is thinking
    setTimeout(() => inputRef.current?.focus(), 0);

    try {
      const result = await window.electronAPI.aiChat(aiMessages, projectFolder, chatOpts);
      if (result?.response) {
        onAiTestConversationsChange(prev => ({
          ...prev,
          [selectedPgId]: [...(prev[selectedPgId] || []), { role: 'assistant', content: result.response, timestamp: new Date().toISOString(), tokensUsed: result.tokensUsed || 0 }]
        }));
      } else {
        onAiTestConversationsChange(prev => ({
          ...prev,
          [selectedPgId]: [...(prev[selectedPgId] || []), { role: 'assistant', content: result?.error || 'Errore risposta AI', timestamp: new Date().toISOString(), isError: true }]
        }));
      }
    } catch (err) {
      onAiTestConversationsChange(prev => ({
        ...prev,
        [selectedPgId]: [...(prev[selectedPgId] || []), { role: 'assistant', content: `Errore: ${err.message}`, timestamp: new Date().toISOString(), isError: true }]
      }));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClearTest = () => {
    if (confirmClearTest) {
      onAiTestConversationsChange(prev => ({ ...prev, [selectedPgId]: [] }));
      setConfirmClearTest(false);
      clearTimeout(confirmClearTestTimer.current);
    } else {
      setConfirmClearTest(true);
      clearTimeout(confirmClearTestTimer.current);
      confirmClearTestTimer.current = setTimeout(() => setConfirmClearTest(false), 3000);
    }
  };

  const handleClearTelegram = () => {
    if (confirmClearTelegram) {
      onClearAiTelegramHistory?.(selectedPgId);
      setConfirmClearTelegram(false);
      clearTimeout(confirmClearTelegramTimer.current);
    } else {
      setConfirmClearTelegram(true);
      clearTimeout(confirmClearTelegramTimer.current);
      confirmClearTelegramTimer.current = setTimeout(() => setConfirmClearTelegram(false), 3000);
    }
  };

  useEffect(() => () => {
    clearTimeout(confirmClearTestTimer.current);
    clearTimeout(confirmClearTelegramTimer.current);
  }, []);

  // Empty state: no AI configured
  if (!aiConfig?.apiKey && !firebaseUser) {
    return (
      <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
        Configura l'AI nelle Impostazioni → Assistente AI<br />
        <span style={{ fontSize: '10px' }}>Oppure effettua il login per usare la quota gratuita</span>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
        Nessun personaggio configurato.<br />
        <span style={{ fontSize: '10px' }}>Aggiungi personaggi dalle Impostazioni → Personaggi</span>
      </div>
    );
  }

  return (
    <div ref={splitContainerRef} style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
      {/* LEFT: chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Toolbar PG + clear */}
        <div style={{
          padding: '6px 12px', flexShrink: 0, display: 'flex', gap: '6px', alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '600' }}>PG:</span>
          <select
            value={selectedPgId}
            onChange={e => handlePgChange(e.target.value)}
            style={{
              background: 'var(--bg-input)', border: '1px solid var(--border-default)',
              borderRadius: '4px', padding: '4px 8px', color: 'var(--text-primary)',
              fontSize: '12px', outline: 'none', cursor: 'pointer', minWidth: '140px'
            }}
          >
            {players.map(p => (
              <option key={p.id} value={p.id}>
                {p.characterName || 'Senza nome'}{p.playerName ? ` (${p.playerName})` : ''}
              </option>
            ))}
          </select>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleClearTest}
            style={{
              background: 'none',
              border: `1px solid ${confirmClearTest ? 'var(--color-danger)' : 'var(--border-default)'}`,
              borderRadius: '3px', padding: '3px 10px',
              color: confirmClearTest ? 'var(--color-danger)' : 'var(--text-secondary)',
              fontSize: '10px', cursor: 'pointer', transition: 'all 0.15s'
            }}
            title="Svuota la conversazione di prova per questo PG"
          >
            {confirmClearTest ? 'Sicuro?' : '🗑️ Pulisci prova'}
          </button>
          <button
            onClick={handleClearTelegram}
            style={{
              background: 'none',
              border: `1px solid ${confirmClearTelegram ? 'var(--color-danger)' : 'var(--border-default)'}`,
              borderRadius: '3px', padding: '3px 10px',
              color: confirmClearTelegram ? 'var(--color-danger)' : 'var(--text-secondary)',
              fontSize: '10px', cursor: 'pointer', transition: 'all 0.15s'
            }}
            title="Svuota lo storico AI reale di Telegram per questo PG"
          >
            {confirmClearTelegram ? 'Sicuro?' : '🗑️ Pulisci storico Telegram'}
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {history.length === 0 && !loading && (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
              Scrivi una domanda per testare l'AI con i documenti di {player?.characterName || 'questo PG'}...
            </div>
          )}
          {history.map((msg, i) => {
            const isUser = msg.role === 'user';
            const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <div key={i} style={{
                marginBottom: '6px',
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth: '85%', padding: '6px 10px',
                  borderRadius: isUser ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                  background: isUser ? 'var(--chat-gm-bg)' : 'var(--bg-main)',
                  border: msg.isError
                    ? '1px solid var(--color-danger)'
                    : isUser ? '1px solid var(--chat-gm-border)' : '1px solid var(--border-subtle)'
                }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginBottom: '2px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span>{time}</span>
                    <span style={{ fontWeight: '600' }}>{isUser ? 'GM (prova)' : '🤖 AI'}</span>
                    {!isUser && msg.tokensUsed > 0 && (
                      <span style={{ marginLeft: 'auto', color: 'var(--text-disabled)', fontSize: '9px' }}>
                        {msg.tokensUsed.toLocaleString()} token
                      </span>
                    )}
                  </div>
                  {isUser || msg.isError ? (
                    <div style={{
                      fontSize: '12px',
                      color: msg.isError ? 'var(--color-danger)' : 'var(--text-primary)',
                      lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                    }}>{msg.content}</div>
                  ) : (
                    <div
                      className="ai-response-md"
                      style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.6', wordBreak: 'break-word' }}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ padding: '6px 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
              🤖 Sto pensando...
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          style={{ padding: '6px 12px', flexShrink: 0, display: 'flex', gap: '6px', borderTop: '1px solid var(--border-subtle)' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Domanda a ${player?.characterName || 'PG'}...`}
            style={{
              flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-default)',
              borderRadius: '4px', padding: '6px 10px', color: 'var(--text-primary)',
              fontSize: '12px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            style={{
              background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
              padding: '0 12px', color: input.trim() && !loading ? 'var(--accent)' : 'var(--text-disabled)',
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              fontSize: '12px', transition: 'all 0.15s', flexShrink: 0
            }}
          >Invia</button>
        </form>
      </div>

      {/* Divisore trascinabile tra chat e documenti */}
      <ResizeHandle direction="vertical" onResize={handleSplitResize} />

      {/* RIGHT: document editor */}
      <div style={{
        width: `${docPanelWidth}px`, flexShrink: 0, display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '6px 12px', borderBottom: '1px solid var(--border-subtle)',
          fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '600',
          textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0
        }}>
          Documenti AI
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>
          {commonDocs.length === 0 && personalDocs.length === 0 && (
            <div style={{ padding: '16px 0', textAlign: 'center', fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
              Nessun documento configurato.<br />
              <span style={{ fontSize: '10px' }}>Aggiungi documenti dalle Impostazioni → Assistente AI</span>
            </div>
          )}
          {commonDocs.length > 0 && (
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', padding: '4px 4px 2px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              📄 Comuni
            </div>
          )}
          {commonDocs.map(doc => (
            <DocEditorRow
              key={'c-' + doc.id}
              doc={doc}
              editor={editors[doc.file]}
              onToggle={() => toggleEditor(doc)}
              onChange={v => handleEditorChange(doc.file, v)}
              onSave={() => handleSave(doc.file)}
              onRevert={() => handleRevert(doc.file)}
            />
          ))}
          {personalDocs.length > 0 && (
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', padding: '8px 4px 2px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              🎭 Personali — {player?.characterName || ''}
            </div>
          )}
          {personalDocs.map(doc => (
            <DocEditorRow
              key={'p-' + doc.id}
              doc={doc}
              editor={editors[doc.file]}
              onToggle={() => toggleEditor(doc)}
              onChange={v => handleEditorChange(doc.file, v)}
              onSave={() => handleSave(doc.file)}
              onRevert={() => handleRevert(doc.file)}
            />
          ))}
        </div>
      </div>

      {/* Confirm PG change with unsaved edits */}
      {pendingPgChange && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--overlay-medium)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}
          onClick={() => setPendingPgChange(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-panel)', border: '1px solid var(--border-default)',
              borderRadius: '6px', padding: '18px 22px', maxWidth: '380px',
              boxShadow: 'var(--shadow-panel)'
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '14px' }}>
              Ci sono modifiche non salvate ai documenti. Cambiando PG andranno perse.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPendingPgChange(null)}
                style={{
                  background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                  padding: '5px 12px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer'
                }}
              >Annulla</button>
              <button
                onClick={confirmPgChange}
                style={{
                  background: 'none', border: '1px solid var(--color-danger)', borderRadius: '4px',
                  padding: '5px 12px', color: 'var(--color-danger)', fontSize: '12px', cursor: 'pointer'
                }}
              >Scarta modifiche</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single doc row + inline editor ───
function DocEditorRow({ doc, editor, onToggle, onChange, onSave, onRevert }) {
  const isOpen = editor?.open;
  const isDirty = editor && editor.content !== editor.original;
  const saveStatus = editor?.saveStatus;
  const canEdit = /\.(md|txt|html?|json)$/i.test(doc.file);

  return (
    <div style={{
      marginBottom: '4px', border: '1px solid var(--border-subtle)', borderRadius: '4px',
      background: 'var(--bg-elevated)', overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px',
        cursor: canEdit ? 'pointer' : 'default'
      }}
        onClick={canEdit ? onToggle : undefined}
      >
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
          {isOpen ? '▼' : '▶'}
        </span>
        <span style={{
          fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: doc.active ? 'var(--text-primary)' : 'var(--text-disabled)'
        }} title={doc.file}>
          {doc.name}{!doc.active && ' (inattivo)'}
        </span>
        {isDirty && (
          <span style={{ fontSize: '10px', color: 'var(--color-warning)', flexShrink: 0 }} title="Modifiche non salvate">●</span>
        )}
      </div>
      {isOpen && (
        <div style={{ padding: '4px 8px 8px' }}>
          {editor?.loading ? (
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Caricamento...</div>
          ) : (
            <>
              <textarea
                value={editor.content}
                onChange={e => onChange(e.target.value)}
                style={{
                  width: '100%', minHeight: '200px', maxHeight: '400px', resize: 'vertical',
                  background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                  borderRadius: '3px', padding: '6px 8px', color: 'var(--text-primary)',
                  fontSize: '11px', fontFamily: 'Consolas, Monaco, monospace', outline: 'none',
                  boxSizing: 'border-box', lineHeight: '1.5'
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                spellCheck={false}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                <button
                  onClick={onSave}
                  disabled={!isDirty || saveStatus === 'saving'}
                  style={{
                    background: 'none',
                    border: `1px solid ${isDirty ? 'var(--accent)' : 'var(--border-default)'}`,
                    borderRadius: '3px', padding: '3px 10px',
                    color: isDirty ? 'var(--accent)' : 'var(--text-disabled)',
                    fontSize: '11px', cursor: isDirty ? 'pointer' : 'not-allowed', transition: 'all 0.15s'
                  }}
                >
                  {saveStatus === 'saving' ? 'Salvataggio...' : saveStatus === 'ok' ? '✓ Salvato' : saveStatus === 'err' ? '✗ Errore' : '💾 Salva'}
                </button>
                {isDirty && (
                  <button
                    onClick={onRevert}
                    style={{
                      background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                      padding: '3px 10px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer'
                    }}
                  >Annulla</button>
                )}
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }} title={doc.file}>
                  {doc.file}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(Console);
