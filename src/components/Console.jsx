import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { renderMarkdown } from '../utils/markdownRenderer';

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

function DicePanel() {
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
        height: '26px', boxSizing: 'border-box'
      }}>
        <span>Dadi</span>
        {rolls.length > 0 && (
          <span className="close-btn" onClick={clearRolls} style={{ fontSize: '12px' }} title="Svuota">✕</span>
        )}
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
            return (
              <div key={roll.id}>
                {showSep && (
                  <div style={{ borderTop: '1px dashed var(--text-disabled)', margin: '4px 0' }} />
                )}
                <div style={{
                  padding: '2px 6px', marginBottom: '1px', borderRadius: '3px',
                  background: 'var(--bg-glow-subtle)',
                  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '4px'
                }}>
                  <span style={{ fontSize: '10px', color: DIE_COLORS[roll.sides], fontWeight: '600' }}>
                    d{roll.sides}
                  </span>
                  <span style={{
                    fontSize: '16px', fontWeight: '800',
                    color: dieValueColor(roll.value, roll.sides),
                    lineHeight: '1.2'
                  }}>
                    {roll.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Search Panel (main Console content) ───
export default function Console({ projectFolder, onOpenFile, onSearchNavigate, externalQuery, telegramLog = [], onClearLog, aiConfig, aiChatHistory = [], onAiChatHistoryChange }) {
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
  const aiEndRef = useRef(null);
  const aiInputRef = useRef(null);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`search-history:${projectFolder}`);
      if (saved) setSearchHistory(JSON.parse(saved));
    } catch {}
  }, [projectFolder]);

  const saveToHistory = useCallback((query) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== query.toLowerCase());
      const next = [query, ...filtered].slice(0, 30);
      try { localStorage.setItem(`search-history:${projectFolder}`, JSON.stringify(next)); } catch {}
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
  }, [aiChatHistory, aiLoading, activeTab]);

  const handleAiSend = useCallback(async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
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
  }, [aiInput, aiLoading, aiChatHistory, onAiChatHistoryChange, projectFolder]);

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
            {!(aiConfig?.provider || aiConfig?.apiKey) ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                Configura l'AI nelle Impostazioni → Assistente AI<br />
                <span style={{ fontSize: '10px' }}>Oppure effettua il login per usare la quota gratuita</span>
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
                          {isUser || msg.isError ? (
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
                  <div ref={aiEndRef} />
                </div>

                {/* Input */}
                <form
                  onSubmit={e => { e.preventDefault(); handleAiSend(); }}
                  style={{ padding: '6px 12px', flexShrink: 0, display: 'flex', gap: '6px' }}
                >
                  <input
                    ref={aiInputRef}
                    type="text"
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    placeholder="Chiedi qualcosa sull'avventura..."
                    disabled={aiLoading}
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
                    disabled={!aiInput.trim() || aiLoading}
                    style={{
                      background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                      padding: '0 12px', color: aiInput.trim() && !aiLoading ? 'var(--accent)' : 'var(--text-disabled)',
                      cursor: aiInput.trim() && !aiLoading ? 'pointer' : 'not-allowed',
                      fontSize: '12px', transition: 'all 0.15s', flexShrink: 0
                    }}
                    onMouseEnter={e => { if (aiInput.trim() && !aiLoading) e.currentTarget.style.borderColor = 'var(--accent)'; }}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  >
                    Invia
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
                        <span>Sessione: {sessionTokens.toLocaleString()} token</span>
                      )}
                      {aiQuota && !aiConfig?.apiKey && (
                        <span style={{ marginLeft: 'auto' }}>
                          Quota: {aiQuota.remaining?.toLocaleString()} / {aiQuota.tokenAllowance?.toLocaleString()} rimasti
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
      </div>

      {/* Right: Dice */}
      <DicePanel />
    </div>
  );
}
