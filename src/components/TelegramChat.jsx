import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SendHorizontal, Loader2, Trash2 } from 'lucide-react';

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch { return '--:--'; }
}

export default function TelegramChat({ players, chatMessages, onSendReply, onMarkRead, onSelectedChange, onClearChat, onClose, aiEnabled, onAiReply, onAiPoke, aiConfig, botRunning, onSendSpecialMessage, onResetSpecialMessage, onResetAllSpecialMessages }) {
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

    // Intercetta /aipoke — comando GM per AI proattiva
    if (text.startsWith('/aipoke')) {
      const context = text.replace(/^\/aipoke\s*/, '').trim();
      setReplyText('');
      setSending(true);
      await onAiPoke?.(selectedChatId, context);
      setSending(false);
      textareaRef.current?.focus();
      return;
    }

    setSending(true);
    await onSendReply(selectedChatId, text);
    setReplyText('');
    setSending(false);
    textareaRef.current?.focus();
  }, [replyText, selectedChatId, sending, onSendReply, onAiPoke]);

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
                  {pg.aiPaused && (
                    <span title={pg.aiPauseMessage || 'AI in pausa per questo PG'} style={{
                      fontSize: '12px', color: 'var(--color-warning)', flexShrink: 0
                    }}>
                      🔇
                    </span>
                  )}
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
              {selectedPlayer?.aiPaused && (
                <span title={selectedPlayer.aiPauseMessage || 'AI in pausa'} style={{
                  marginLeft: '8px', fontSize: '10px', color: 'var(--color-warning)',
                  padding: '1px 6px', borderRadius: '3px',
                  border: '1px solid var(--color-warning)', fontWeight: '600'
                }}>
                  🔇 AI IN PAUSA
                </span>
              )}
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

        {/* Messaggi speciali (_msg_*) */}
        {selectedPlayer && (
          <SpecialMessagesBar
            player={selectedPlayer}
            aiConfig={aiConfig}
            botRunning={botRunning}
            onSend={onSendSpecialMessage}
            onReset={onResetSpecialMessage}
            onResetAll={onResetAllSpecialMessages}
          />
        )}

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
              const isPrivate = msg.from === 'gm-private';
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
                    background: isPrivate ? 'var(--color-warning-bg, rgba(232,163,62,0.1))' : isGm ? 'var(--chat-gm-bg)' : 'var(--bg-main)',
                    border: isPrivate ? '1px solid var(--color-warning)' : isGm ? '1px solid var(--chat-gm-border)' : '1px solid var(--border-subtle)'
                  }}>
                    <div style={{
                      fontSize: '10px', marginBottom: '2px',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                      <span style={{ color: 'var(--text-tertiary)' }}>[{formatTime(msg.timestamp)}]</span>
                      {isPrivate && <span title="Messaggio privato al GM">&#128274;</span>}
                      <span style={{ fontWeight: '600', color: isPrivate ? 'var(--color-warning)' : isGm ? 'var(--text-primary)' : 'var(--accent)' }}>
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
                  {!isGm && !isPrivate && (
                    <span
                      title={aiEnabled ? 'Rispondi con AI' : 'AI non configurata'}
                      onClick={() => {
                        if (aiEnabled && onAiReply && selectedChatId) {
                          onAiReply(msg, selectedChatId);
                        }
                      }}
                      style={{
                        fontSize: '11px',
                        color: aiEnabled ? 'var(--accent)' : 'var(--border-default)',
                        cursor: aiEnabled ? 'pointer' : 'not-allowed',
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

// ─── Barra messaggi speciali (_msg_*) per il PG selezionato ───
function SpecialMessagesBar({ player, aiConfig, botRunning, onSend, onReset, onResetAll }) {
  const [confirmSend, setConfirmSend] = useState({});   // { [file]: true }
  const [confirmReset, setConfirmReset] = useState({}); // { [file]: true }
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [sending, setSending] = useState({});           // { [file]: true }
  const timers = useRef({});

  useEffect(() => () => {
    Object.values(timers.current).forEach(t => clearTimeout(t));
  }, []);

  // Reset di tutti i "Sicuro?" quando cambio PG (evita che stati precedenti restino attivi)
  useEffect(() => {
    Object.values(timers.current).forEach(t => clearTimeout(t));
    timers.current = {};
    setConfirmSend({});
    setConfirmReset({});
    setConfirmResetAll(false);
    setSending({});
  }, [player?.id]);

  const startConfirm = (kind, key, setter) => {
    setter(prev => ({ ...prev, [key]: true }));
    const tKey = kind + ':' + key;
    clearTimeout(timers.current[tKey]);
    timers.current[tKey] = setTimeout(() => setter(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    }), 3000);
  };

  const clearConfirm = (kind, key, setter) => {
    setter(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    clearTimeout(timers.current[kind + ':' + key]);
  };

  const commonDocs = aiConfig?.commonDocs || [];
  const personalDocs = player?.aiDocuments || [];
  const specialMsgs = [...commonDocs, ...personalDocs]
    .filter(d => d.active && d.name?.toLowerCase().startsWith('_msg_'));

  if (specialMsgs.length === 0) return null;

  const msgLog = player.msgLog || {};
  const anySent = specialMsgs.some(d => msgLog[d.file]?.sendCount > 0);

  const displayName = (name) =>
    (name || '').replace(/^_msg_/i, '').replace(/_/g, ' ').trim();

  const shortTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const handleSendClick = async (file) => {
    if (sending[file]) return;
    if (confirmSend[file]) {
      clearConfirm('send', file, setConfirmSend);
      setSending(prev => ({ ...prev, [file]: true }));
      try {
        await onSend?.(player.id, file);
      } finally {
        setSending(prev => {
          const next = { ...prev };
          delete next[file];
          return next;
        });
      }
    } else {
      startConfirm('send', file, setConfirmSend);
    }
  };

  const handleResetClick = (file) => {
    if (confirmReset[file]) {
      clearConfirm('reset', file, setConfirmReset);
      onReset?.(player.id, file);
    } else {
      startConfirm('reset', file, setConfirmReset);
    }
  };

  const handleResetAllClick = () => {
    if (confirmResetAll) {
      setConfirmResetAll(false);
      clearTimeout(timers.current['resetAll']);
      onResetAll?.(player.id);
    } else {
      setConfirmResetAll(true);
      clearTimeout(timers.current['resetAll']);
      timers.current['resetAll'] = setTimeout(() => setConfirmResetAll(false), 3000);
    }
  };

  return (
    <div style={{
      padding: '6px 10px', borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-main)', flexShrink: 0,
      display: 'flex', gap: '6px', alignItems: 'center', overflowX: 'auto'
    }}>
      <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '600', flexShrink: 0 }}>
        📨
      </span>
      {specialMsgs.map(doc => {
        const entry = msgLog[doc.file];
        const sent = entry?.sendCount > 0;
        const isConfirmSend = !!confirmSend[doc.file];
        const isConfirmReset = !!confirmReset[doc.file];
        const isSending = !!sending[doc.file];
        const canSend = botRunning && !!player.telegramChatId && !isSending;
        return (
          <div key={doc.file} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            border: `1px solid ${sent ? 'var(--accent)' : 'var(--border-default)'}`,
            borderRadius: '14px', padding: '2px 6px 2px 10px',
            background: sent ? 'var(--accent-a04)' : 'transparent',
            flexShrink: 0,
            opacity: isSending ? 0.6 : 1
          }}>
            <button
              onClick={() => handleSendClick(doc.file)}
              disabled={!canSend}
              title={isSending ? 'Invio in corso…' : !canSend ? 'Bot non attivo o PG non connesso' : (sent ? `Inviato ${entry.sendCount} volte — ultimo ${shortTime(entry.lastSentAt)}` : 'Clicca per inviare')}
              style={{
                background: 'none', border: 'none', padding: '2px 2px',
                color: isConfirmSend ? 'var(--color-danger)' : (canSend ? 'var(--text-primary)' : 'var(--text-disabled)'),
                fontSize: '11px', cursor: canSend ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              {sent && <span style={{ color: 'var(--accent)' }}>✓</span>}
              <span>{displayName(doc.name)}</span>
              {isSending && <span style={{ marginLeft: '4px' }}>…</span>}
              {isConfirmSend && !isSending && <span style={{ marginLeft: '4px' }}>Sicuro?</span>}
              {sent && !isConfirmSend && !isSending && (
                <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>
                  ×{entry.sendCount}
                </span>
              )}
            </button>
            {sent && (
              <button
                onClick={() => handleResetClick(doc.file)}
                title="Resetta stato invio"
                style={{
                  background: 'none', border: 'none', padding: '2px 4px',
                  color: isConfirmReset ? 'var(--color-danger)' : 'var(--text-tertiary)',
                  fontSize: '10px', cursor: 'pointer'
                }}
              >
                {isConfirmReset ? 'Sicuro?' : '🗑'}
              </button>
            )}
          </div>
        );
      })}
      {anySent && (
        <button
          onClick={handleResetAllClick}
          title="Resetta stato invio per tutti i messaggi"
          style={{
            background: 'none',
            border: `1px solid ${confirmResetAll ? 'var(--color-danger)' : 'var(--border-default)'}`,
            borderRadius: '3px', padding: '2px 8px',
            color: confirmResetAll ? 'var(--color-danger)' : 'var(--text-secondary)',
            fontSize: '10px', cursor: 'pointer', flexShrink: 0, marginLeft: '4px'
          }}
        >
          {confirmResetAll ? 'Sicuro?' : 'Reset tutti'}
        </button>
      )}
    </div>
  );
}
