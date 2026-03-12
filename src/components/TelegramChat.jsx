import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch { return '--:--'; }
}

export default function TelegramChat({ players, chatMessages, onSendReply, onMarkRead, onSelectedChange, onClose }) {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const messagesEndRef = useRef(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  const panelRef = useRef(null);
  const [panelRight, setPanelRight] = useState(120);

  // Position panel centered under the chat button
  useEffect(() => {
    const btn = document.querySelector('[data-chat-toggle]');
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const btnCenter = rect.left + rect.width / 2;
      const panelWidth = 500;
      let right = window.innerWidth - btnCenter - panelWidth / 2;
      // Clamp so panel doesn't go off-screen
      right = Math.max(4, Math.min(right, window.innerWidth - panelWidth - 4));
      setPanelRight(right);
    }
  }, []);

  // Connected players only
  const connectedPlayers = useMemo(() =>
    (players || []).filter(p => p.telegramChatId),
  [players]);

  // Unread counts per chatId
  const unreadCounts = useMemo(() => {
    const counts = {};
    for (const [chatId, msgs] of Object.entries(chatMessages || {})) {
      counts[chatId] = (msgs || []).filter(m => m.from === 'player' && !m.read).length;
    }
    return counts;
  }, [chatMessages]);

  const totalUnread = useMemo(() =>
    Object.values(unreadCounts).reduce((s, n) => s + n, 0),
  [unreadCounts]);

  // Sort: unread first, then by name
  const sortedPlayers = useMemo(() => {
    return [...connectedPlayers].sort((a, b) => {
      const ua = unreadCounts[a.telegramChatId] || 0;
      const ub = unreadCounts[b.telegramChatId] || 0;
      if (ub !== ua) return ub - ua;
      return (a.characterName || '').localeCompare(b.characterName || '');
    });
  }, [connectedPlayers, unreadCounts]);

  // Auto-select first player if none selected
  useEffect(() => {
    if (!selectedChatId && sortedPlayers.length > 0) {
      setSelectedChatId(sortedPlayers[0].telegramChatId);
    }
  }, [sortedPlayers, selectedChatId]);

  // Notify parent of selected chat changes
  useEffect(() => {
    if (onSelectedChange) onSelectedChange(selectedChatId);
  }, [selectedChatId, onSelectedChange]);

  // Mark as read when selecting a chat
  useEffect(() => {
    if (selectedChatId && unreadCounts[selectedChatId] > 0) {
      onMarkRead(selectedChatId);
    }
  }, [selectedChatId, unreadCounts, onMarkRead]);

  // Auto-scroll to bottom
  const currentMessages = chatMessages?.[selectedChatId] || [];
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages.length, selectedChatId]);

  // Mark new messages as read if chat is already open
  useEffect(() => {
    if (selectedChatId && currentMessages.length > 0) {
      const lastMsg = currentMessages[currentMessages.length - 1];
      if (lastMsg.from === 'player' && !lastMsg.read) {
        onMarkRead(selectedChatId);
      }
    }
  }, [currentMessages.length, selectedChatId, onMarkRead]);

  // Close on click outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest('[data-chat-toggle]')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const selectedPlayer = connectedPlayers.find(p => p.telegramChatId === selectedChatId);

  const handleSend = useCallback(async () => {
    const text = replyText.trim();
    if (!text || !selectedChatId || sending) return;
    setSending(true);
    await onSendReply(selectedChatId, text);
    setReplyText('');
    setSending(false);
    textareaRef.current?.focus();
  }, [replyText, selectedChatId, sending, onSendReply]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Ctrl+Enter → newline (default textarea behavior)
  }, [handleSend]);

  return (
    <div ref={panelRef} style={{
      position: 'fixed',
      top: '41px',
      right: `${panelRight}px`,
      width: '500px',
      height: '70vh',
      background: '#1e1b16',
      border: '1px solid #3a3530',
      borderRadius: '0 0 8px 8px',
      boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
      zIndex: 2500,
      display: 'flex',
      overflow: 'hidden'
    }}>
      {/* Left: Player list */}
      <div style={{
        width: '160px', flexShrink: 0,
        borderRight: '1px solid #2a2520',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '8px 10px', fontSize: '10px', fontWeight: '600',
          textTransform: 'uppercase', letterSpacing: '1.2px', color: '#c9a96e',
          borderBottom: '1px solid #2a2520', flexShrink: 0
        }}>
          Giocatori
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sortedPlayers.length === 0 ? (
            <div style={{ padding: '12px 10px', fontSize: '11px', color: '#4a4035', fontStyle: 'italic' }}>
              Nessun giocatore connesso
            </div>
          ) : (
            sortedPlayers.map(pg => {
              const isSelected = pg.telegramChatId === selectedChatId;
              const unread = unreadCounts[pg.telegramChatId] || 0;
              return (
                <div
                  key={pg.id}
                  onClick={() => { setSelectedChatId(pg.telegramChatId); setReplyText(''); }}
                  style={{
                    padding: '8px 10px',
                    cursor: 'pointer',
                    background: isSelected ? '#2a2520' : 'transparent',
                    borderLeft: isSelected ? '2px solid #c9a96e' : '2px solid transparent',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#222018'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? '#2a2520' : 'transparent'; }}
                >
                  <span style={{ fontSize: '7px' }}>🟢</span>
                  <span style={{
                    fontSize: '12px', fontWeight: isSelected ? '600' : '400',
                    color: isSelected ? '#c9a96e' : '#d4c5a9',
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {pg.characterName || 'Senza nome'}
                  </span>
                  {unread > 0 && (
                    <span style={{
                      background: '#c96e6e', color: '#fff', fontSize: '9px', fontWeight: '700',
                      borderRadius: '8px', padding: '1px 5px', flexShrink: 0, lineHeight: '1.3'
                    }}>
                      {unread}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Conversation */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '8px 12px',
          borderBottom: '1px solid #2a2520',
          flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#252018'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#c9a96e' }}>
              {selectedPlayer ? `CHAT — ${selectedPlayer.characterName || 'Senza nome'}` : 'CHAT'}
            </div>
            {selectedPlayer?.playerName && (
              <div style={{ fontSize: '10px', color: '#6a5a40' }}>
                {selectedPlayer.playerName}
              </div>
            )}
          </div>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '14px' }}>✕</span>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {!selectedPlayer ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '12px', color: '#4a4035', fontStyle: 'italic' }}>
              Seleziona un giocatore
            </div>
          ) : currentMessages.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '12px', color: '#4a4035', fontStyle: 'italic' }}>
              Nessun messaggio
            </div>
          ) : (
            currentMessages.map((msg) => {
              const isGm = msg.from === 'gm';
              return (
                <div key={msg.id} style={{
                  marginBottom: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isGm ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    maxWidth: '80%',
                    padding: '6px 10px',
                    borderRadius: isGm ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                    background: isGm ? '#2a2a1e' : '#1a1714',
                    border: `1px solid ${isGm ? '#3a3a2a' : '#2a2520'}`
                  }}>
                    <div style={{
                      fontSize: '10px', marginBottom: '2px',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                      <span style={{ color: '#6a5a40' }}>[{formatTime(msg.timestamp)}]</span>
                      <span style={{ fontWeight: '600', color: isGm ? '#d4c5a9' : '#c9a96e' }}>
                        {isGm ? 'GM' : msg.characterName || 'Giocatore'}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '12px', color: '#d4c5a9', lineHeight: '1.5',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                    }}>
                      {msg.text}
                    </div>
                  </div>
                  {/* AI placeholder button — on player messages only */}
                  {!isGm && (
                    <span
                      title="AI — Coming soon"
                      style={{
                        fontSize: '11px', color: '#3a3530', cursor: 'not-allowed',
                        marginTop: '1px', padding: '0 4px',
                        opacity: 0, transition: 'opacity 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                    >
                      🤖
                    </span>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply input */}
        {selectedPlayer && (
          <div style={{
            padding: '8px 12px',
            borderTop: '1px solid #2a2520',
            display: 'flex', gap: '6px', alignItems: 'flex-end',
            flexShrink: 0
          }}>
            <textarea
              ref={textareaRef}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi risposta..."
              rows={2}
              style={{
                flex: 1, background: '#141210', border: '1px solid #3a3530',
                borderRadius: '6px', padding: '8px 10px', color: '#d4c5a9',
                fontSize: '12px', outline: 'none', fontFamily: 'inherit',
                resize: 'none', lineHeight: '1.4', boxSizing: 'border-box'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#c9a96e'}
              onBlur={e => e.currentTarget.style.borderColor = '#3a3530'}
            />
            <button
              onClick={handleSend}
              disabled={!replyText.trim() || sending}
              style={{
                background: 'none', border: '1px solid #3a3530', borderRadius: '6px',
                padding: '8px 10px', color: replyText.trim() && !sending ? '#c9a96e' : '#4a4035',
                fontSize: '14px', cursor: replyText.trim() && !sending ? 'pointer' : 'not-allowed',
                flexShrink: 0, transition: 'all 0.15s', lineHeight: '1'
              }}
              onMouseEnter={e => { if (replyText.trim() && !sending) e.currentTarget.style.borderColor = '#c9a96e'; }}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#3a3530'}
              title="Invia (Enter)"
            >
              {sending ? '...' : '\u{1F4E4}'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
