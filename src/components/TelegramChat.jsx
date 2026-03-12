import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SendHorizontal, Loader2, Trash2 } from 'lucide-react';

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch { return '--:--'; }
}

export default function TelegramChat({ players, chatMessages, onSendReply, onMarkRead, onSelectedChange, onClearChat, onClose }) {
  const [selectedChatId, setSelectedChatId] = useState(null);
  const messagesEndRef = useRef(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  const panelRef = useRef(null);
  const [panelRight, setPanelRight] = useState(120);
  const [confirmClear, setConfirmClear] = useState(false);
  const confirmTimer = useRef(null);

  // Position panel centered under the chat button
  useEffect(() => {
    const btn = document.querySelector('[data-chat-toggle]');
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const btnCenter = rect.left + rect.width / 2;
      const panelWidth = 500;
      let right = window.innerWidth - btnCenter - panelWidth / 2;
      right = Math.max(4, Math.min(right, window.innerWidth - panelWidth - 4));
      setPanelRight(right);
    }
  }, []);

  const connectedPlayers = useMemo(() =>
    (players || []).filter(p => p.telegramChatId),
  [players]);

  const unreadCounts = useMemo(() => {
    const counts = {};
    for (const [chatId, msgs] of Object.entries(chatMessages || {})) {
      counts[chatId] = (msgs || []).filter(m => m.from === 'player' && !m.read).length;
    }
    return counts;
  }, [chatMessages]);

  const sortedPlayers = useMemo(() => {
    return [...connectedPlayers].sort((a, b) => {
      const ua = unreadCounts[a.telegramChatId] || 0;
      const ub = unreadCounts[b.telegramChatId] || 0;
      if (ub !== ua) return ub - ua;
      return (a.characterName || '').localeCompare(b.characterName || '');
    });
  }, [connectedPlayers, unreadCounts]);

  useEffect(() => {
    if (!selectedChatId && sortedPlayers.length > 0) {
      setSelectedChatId(sortedPlayers[0].telegramChatId);
    }
  }, [sortedPlayers, selectedChatId]);

  useEffect(() => {
    if (onSelectedChange) onSelectedChange(selectedChatId);
  }, [selectedChatId, onSelectedChange]);

  useEffect(() => {
    if (selectedChatId && unreadCounts[selectedChatId] > 0) {
      onMarkRead(selectedChatId);
    }
  }, [selectedChatId, unreadCounts, onMarkRead]);

  const currentMessages = chatMessages?.[selectedChatId] || [];
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages.length, selectedChatId]);

  useEffect(() => {
    if (selectedChatId && currentMessages.length > 0) {
      const lastMsg = currentMessages[currentMessages.length - 1];
      if (lastMsg.from === 'player' && !lastMsg.read) {
        onMarkRead(selectedChatId);
      }
    }
  }, [currentMessages.length, selectedChatId, onMarkRead]);

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
  }, [handleSend]);

  return (
    <div ref={panelRef} style={{
      position: 'fixed',
      top: '41px',
      right: `${panelRight}px`,
      width: '500px',
      height: '70vh',
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-default)',
      borderRadius: '0 0 8px 8px',
      boxShadow: 'var(--shadow-panel)',
      zIndex: 2500,
      display: 'flex',
      overflow: 'hidden'
    }}>
      {/* Left: Player list */}
      <div style={{
        width: '160px', flexShrink: 0,
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '8px 10px', fontSize: '10px', fontWeight: '600',
          textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--accent)',
          borderBottom: '1px solid var(--border-subtle)', flexShrink: 0
        }}>
          Giocatori
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {sortedPlayers.length === 0 ? (
            <div style={{ padding: '12px 10px', fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
              Nessun giocatore connesso
            </div>
          ) : (
            sortedPlayers.map(pg => {
              const isSelected = pg.telegramChatId === selectedChatId;
              const unread = unreadCounts[pg.telegramChatId] || 0;
              return (
                <div
                  key={pg.id}
                  onClick={() => { setSelectedChatId(pg.telegramChatId); setReplyText(''); setConfirmClear(false); }}
                  style={{
                    padding: '8px 10px',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--bg-hover-strong)' : 'transparent',
                    borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover-subtle)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = isSelected ? 'var(--bg-hover-strong)' : 'transparent'; }}
                >
                  <span style={{ fontSize: '7px' }}>🟢</span>
                  <span style={{
                    fontSize: '12px', fontWeight: isSelected ? '600' : '400',
                    color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {pg.characterName || 'Senza nome'}
                  </span>
                  {unread > 0 && (
                    <span style={{
                      background: 'var(--color-danger)', color: '#fff', fontSize: '9px', fontWeight: '700',
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
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--bg-elevated)'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)' }}>
              {selectedPlayer ? `CHAT — ${selectedPlayer.characterName || 'Senza nome'}` : 'CHAT'}
            </div>
            {selectedPlayer?.playerName && (
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                {selectedPlayer.playerName}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {selectedChatId && currentMessages.length > 0 && (
              confirmClear ? (
                <span
                  onClick={() => {
                    onClearChat(selectedChatId);
                    setConfirmClear(false);
                    clearTimeout(confirmTimer.current);
                  }}
                  style={{
                    fontSize: '10px', color: 'var(--color-danger)', cursor: 'pointer',
                    transition: 'opacity 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Sicuro?
                </span>
              ) : (
                <Trash2
                  size={14}
                  style={{ cursor: 'pointer', color: 'var(--text-tertiary)', transition: 'color 0.15s' }}
                  onClick={() => {
                    setConfirmClear(true);
                    clearTimeout(confirmTimer.current);
                    confirmTimer.current = setTimeout(() => setConfirmClear(false), 3000);
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--color-danger)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                  title="Elimina cronologia chat"
                />
              )
            )}
            <span className="close-btn" onClick={onClose} style={{ fontSize: '14px' }}>✕</span>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {!selectedPlayer ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '12px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
              Seleziona un giocatore
            </div>
          ) : currentMessages.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '12px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
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
                    background: isGm ? 'var(--chat-gm-bg)' : 'var(--bg-main)',
                    border: isGm ? '1px solid var(--chat-gm-border)' : '1px solid var(--border-subtle)'
                  }}>
                    <div style={{
                      fontSize: '10px', marginBottom: '2px',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>[{formatTime(msg.timestamp)}]</span>
                      <span style={{ fontWeight: '600', color: isGm ? 'var(--text-primary)' : 'var(--accent)' }}>
                        {isGm ? 'GM' : msg.characterName || 'Giocatore'}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.5',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                    }}>
                      {msg.text}
                    </div>
                  </div>
                  {!isGm && (
                    <span
                      title="AI — Coming soon"
                      style={{
                        fontSize: '11px', color: 'var(--border-default)', cursor: 'not-allowed',
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
            borderTop: '1px solid var(--border-subtle)',
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
                flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                borderRadius: '6px', padding: '8px 10px', color: 'var(--text-primary)',
                fontSize: '12px', outline: 'none', fontFamily: 'inherit',
                resize: 'none', lineHeight: '1.4', boxSizing: 'border-box'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            />
            <button
              onClick={handleSend}
              disabled={!replyText.trim() || sending}
              style={{
                background: 'none', border: '1px solid var(--border-default)', borderRadius: '6px',
                padding: '0 12px', color: replyText.trim() && !sending ? 'var(--accent)' : 'var(--text-disabled)',
                cursor: replyText.trim() && !sending ? 'pointer' : 'not-allowed',
                flexShrink: 0, transition: 'all 0.15s', alignSelf: 'stretch',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
              onMouseEnter={e => { if (replyText.trim() && !sending) e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              title="Invia (Enter)"
            >
              {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <SendHorizontal size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
