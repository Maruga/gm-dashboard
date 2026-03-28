import React, { useState, useCallback, useMemo } from 'react';
import { wrapGmText } from './TelegramModal';

export default function TelegramSendModal({ target, content, players, projectPath, botRunning, onLog, onClose }) {
  // Detect content type
  const isFile = /\.(jpg|jpeg|png|gif|webp|svg|mp3|wav|ogg|m4a|pdf|doc|docx|txt|md|html|htm)$/i.test(content);
  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(content);
  const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(content);
  const isHtml = /\.(html|htm)$/i.test(content);
  const isMd = /\.md$/i.test(content);
  const ext = isFile ? '.' + content.split('.').pop().toLowerCase() : '';
  const fileName = isFile ? content.split('/').pop().split('\\').pop() : '';
  const filePath = isFile ? projectPath + '/' + content : '';

  const typeLabel = isImage ? 'Foto' : isAudio ? 'Audio' : isHtml ? 'HTML → Foto' : isMd ? 'Testo (da .md)' : isFile ? 'File' : 'Messaggio';

  // Pre-select players based on target
  const [selected, setSelected] = useState(() => {
    const s = {};
    const targetLower = target.toLowerCase();
    const isAll = targetLower === 'all' || targetLower === '*' || targetLower === 'tutti';
    const targetNames = isAll ? null : target.split(',').map(n => n.trim().toLowerCase());

    (players || []).forEach(p => {
      if (!p.telegramChatId) return;
      if (isAll) {
        s[p.id] = true;
      } else if (targetNames) {
        const charLower = (p.characterName || '').toLowerCase();
        const playerLower = (p.playerName || '').toLowerCase();
        if (targetNames.some(t => charLower.includes(t) || playerLower.includes(t))) {
          s[p.id] = true;
        }
      }
    });
    return s;
  });

  const [message, setMessage] = useState(isFile ? '' : content);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);

  const toggle = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  const selectAll = () => {
    const s = {};
    (players || []).forEach(p => { if (p.telegramChatId) s[p.id] = true; });
    setSelected(s);
  };
  const selectNone = () => setSelected({});

  const connectedPlayers = useMemo(() => (players || []).filter(p => p.telegramChatId), [players]);
  const recipients = connectedPlayers.filter(p => selected[p.id]);
  const canSend = botRunning && recipients.length > 0 && !sending && (isFile || message.trim());

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    const now = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    for (const pg of recipients) {
      setResults(prev => [...prev, { name: pg.characterName || pg.playerName, status: 'pending' }]);
      try {
        let result;
        if (!isFile) {
          // Text message
          result = await window.electronAPI.telegramSendMessage(pg.telegramChatId, wrapGmText(message.trim()));
        } else if (isMd) {
          const fileContent = await window.electronAPI.readFile(filePath);
          const body = (fileContent || '').replace(/^#{1,6}\s+/gm, '').replace(/[*_~`]/g, '').trim();
          const combined = message.trim() ? `${message.trim()}\n- - - - - - -\n${body}` : body;
          result = await window.electronAPI.telegramSendMessage(pg.telegramChatId, wrapGmText(combined));
        } else {
          if (message.trim()) {
            await window.electronAPI.telegramSendMessage(pg.telegramChatId, wrapGmText(message.trim()));
          }
          if (isHtml) {
            result = await window.electronAPI.telegramSendHtmlAsPhoto(pg.telegramChatId, filePath, fileName);
          } else if (isImage) {
            result = await window.electronAPI.telegramSendPhoto(pg.telegramChatId, filePath, fileName);
          } else if (isAudio) {
            result = await window.electronAPI.telegramSendDocument(pg.telegramChatId, filePath, fileName);
          } else {
            result = await window.electronAPI.telegramSendDocument(pg.telegramChatId, filePath, fileName);
          }
        }

        const ok = result?.success;
        setResults(prev => prev.map((r, i) => i === prev.length - 1 ? { ...r, status: ok ? 'ok' : 'error', error: result?.error } : r));

        if (onLog) {
          onLog({
            date: now, success: ok,
            description: isFile ? `Invio ${typeLabel}: ${fileName}` : `Messaggio da documento`,
            recipient: pg.characterName || pg.playerName,
            error: ok ? undefined : result?.error
          });
        }
      } catch (err) {
        setResults(prev => prev.map((r, i) => i === prev.length - 1 ? { ...r, status: 'error', error: err.message } : r));
      }
    }
    setSending(false);
    setDone(true);
  }, [canSend, recipients, message, isFile, isMd, isHtml, isImage, isAudio, filePath, fileName, typeLabel, onLog]);

  const inputStyle = {
    width: '100%', padding: '8px 12px', background: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)', borderRadius: '6px',
    color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit',
    resize: 'vertical', boxSizing: 'border-box'
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-main)', borderRadius: '12px', padding: '24px',
        width: '420px', maxHeight: '80vh', overflowY: 'auto',
        border: '1px solid var(--border-default)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Invia via Telegram
          </div>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '18px', cursor: 'pointer' }}>&#10005;</span>
        </div>

        {/* Content type badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '4px 10px', borderRadius: '4px', marginBottom: '14px',
          background: 'var(--accent-a10)', border: '1px solid var(--accent)',
          fontSize: '11px', fontWeight: '600', color: 'var(--accent)'
        }}>
          {typeLabel}
          {isFile && <span style={{ fontWeight: '400', color: 'var(--text-secondary)' }}>{content}</span>}
        </div>

        {/* Message */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>
            {isFile ? 'Messaggio aggiuntivo (opzionale)' : 'Messaggio'}
          </label>
          <textarea
            style={{ ...inputStyle, minHeight: '60px' }}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={isFile ? 'Aggiungi un commento...' : 'Testo del messaggio'}
          />
        </div>

        {/* Players */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Destinatari</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span onClick={selectAll} style={{ fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }}>Tutti</span>
              <span onClick={selectNone} style={{ fontSize: '11px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>Nessuno</span>
            </div>
          </div>

          {connectedPlayers.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-disabled)', fontStyle: 'italic', padding: '8px 0' }}>
              Nessun giocatore connesso
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {connectedPlayers.map(p => (
                <label key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 8px',
                  borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                  background: selected[p.id] ? 'var(--accent-a10)' : 'transparent',
                  border: selected[p.id] ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                  transition: 'all 0.15s'
                }}>
                  <input
                    type="checkbox"
                    checked={!!selected[p.id]}
                    onChange={() => toggle(p.id)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>{p.characterName}</span>
                  {p.playerName && <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>({p.playerName})</span>}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {results.map((r, i) => (
              <div key={i} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{r.status === 'ok' ? '\u2705' : r.status === 'error' ? '\u274C' : '\u23F3'}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{r.name}</span>
                {r.error && <span style={{ color: 'var(--color-danger)', fontSize: '10px' }}>{r.error}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', border: '1px solid var(--border-default)', borderRadius: '6px',
              background: 'transparent', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer'
            }}
          >
            {done ? 'Chiudi' : 'Annulla'}
          </button>
          {!done && (
            <button
              onClick={handleSend}
              disabled={!canSend}
              style={{
                padding: '8px 20px', border: 'none', borderRadius: '6px',
                background: canSend ? 'var(--accent)' : 'var(--border-default)',
                color: canSend ? 'var(--bg-main)' : 'var(--text-disabled)',
                fontSize: '13px', fontWeight: '600', cursor: canSend ? 'pointer' : 'not-allowed'
              }}
            >
              {sending ? 'Invio...' : `Invia a ${recipients.length} giocator${recipients.length === 1 ? 'e' : 'i'}`}
            </button>
          )}
        </div>

        {!botRunning && (
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--color-warning)', textAlign: 'center' }}>
            Bot Telegram non attivo
          </div>
        )}
      </div>
    </div>
  );
}
