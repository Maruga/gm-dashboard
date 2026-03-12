import React, { useState, useCallback } from 'react';

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  background: '#252018',
  border: '1px solid #3a3530',
  borderRadius: '4px',
  color: '#d4c5a9',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  resize: 'vertical'
};

function mdToPlainText(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '• ')
    .replace(/^>\s+/gm, '  ')
    .replace(/---+/g, '—————')
    .trim();
}

export function TelegramFileModal({ fileName, fileExtension, filePath, players, botRunning, gameDate, onLog, onClose }) {
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(() => {
    const s = {};
    (players || []).forEach(p => { if (p.telegramChatId) s[p.id] = true; });
    return s;
  });
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);

  const toggle = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));

  const getFormatNote = () => {
    const ext = (fileExtension || '').toLowerCase();
    if (['.html', '.htm'].includes(ext)) return "Verrà convertito in immagine";
    if (ext === '.md') return "Inviato come testo";
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) return "Inviato come foto";
    return "Inviato come file";
  };

  const recipients = (players || []).filter(p => selected[p.id] && p.telegramChatId);
  const canSend = botRunning && recipients.length > 0 && !sending;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    const ext = (fileExtension || '').toLowerCase();
    const sendResults = [];

    for (const pg of recipients) {
      setResults(prev => [...prev, { name: pg.playerName || pg.characterName, status: 'pending' }]);
      try {
        if (message.trim()) {
          await window.electronAPI.telegramSendMessage(pg.telegramChatId, message.trim());
        }
        let result;
        if (ext === '.md') {
          const content = await window.electronAPI.readFile(filePath);
          result = await window.electronAPI.telegramSendMessage(pg.telegramChatId, mdToPlainText(content || ''));
        } else if (['.html', '.htm'].includes(ext)) {
          result = await window.electronAPI.telegramSendHtmlAsPhoto(pg.telegramChatId, filePath, fileName);
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
          result = await window.electronAPI.telegramSendPhoto(pg.telegramChatId, filePath, fileName);
        } else {
          result = await window.electronAPI.telegramSendDocument(pg.telegramChatId, filePath, fileName);
        }
        sendResults.push({ name: pg.playerName || pg.characterName, ok: result.success, error: result.error });
        setResults(prev => prev.map((r, i) => i === prev.length - 1 ? { ...r, status: result.success ? 'ok' : 'error', error: result.error } : r));
      } catch (err) {
        sendResults.push({ name: pg.playerName || pg.characterName, ok: false, error: err.message });
        setResults(prev => prev.map((r, i) => i === prev.length - 1 ? { ...r, status: 'error', error: err.message } : r));
      }
    }
    if (onLog) {
      const ok = sendResults.filter(r => r.ok).map(r => r.name);
      const fail = sendResults.filter(r => !r.ok);
      if (ok.length > 0) onLog({ gameDate, realTimestamp: new Date().toISOString(), description: fileName, recipients: ok, status: 'success' });
      fail.forEach(r => onLog({ gameDate, realTimestamp: new Date().toISOString(), description: `Errore invio "${fileName}" a ${r.name}`, recipients: [r.name], status: 'error', error: r.error }));
    }
    setSending(false);
  }, [canSend, recipients, message, filePath, fileExtension, fileName, gameDate, onLog]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '420px', background: '#1e1b16', border: '1px solid #3a3530', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #3a3530', background: '#252018', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#c9a96e' }}>✉️ Invia via Telegram</span>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '14px' }}>✕</span>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '14px', color: '#d4c5a9', marginBottom: '4px', fontWeight: '600' }}>{fileName}</div>
          <div style={{ fontSize: '11px', color: '#6a5a40', marginBottom: '16px' }}>{getFormatNote()}</div>

          <label style={{ fontSize: '12px', color: '#8a7a60', display: 'block', marginBottom: '4px' }}>Messaggio accompagnatorio</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Opzionale..." rows={3} style={{ ...inputStyle, marginBottom: '16px' }} />

          <label style={{ fontSize: '12px', color: '#8a7a60', display: 'block', marginBottom: '8px' }}>Destinatari</label>
          {(!players || players.length === 0) ? (
            <div style={{ fontSize: '12px', color: '#4a4035', fontStyle: 'italic', marginBottom: '12px' }}>Nessun PG configurato</div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              {players.map(pg => (
                <label key={pg.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '13px', color: pg.telegramChatId ? '#d4c5a9' : '#4a4035', cursor: pg.telegramChatId ? 'pointer' : 'not-allowed' }}>
                  <input type="checkbox" checked={selected[pg.id] || false} onChange={() => toggle(pg.id)} disabled={!pg.telegramChatId} />
                  <span style={{ color: pg.telegramChatId ? '#c9a96e' : '#4a4035' }}>{pg.characterName || 'Senza nome'}</span>
                  {pg.playerName && <span style={{ color: '#6a5a40', fontSize: '11px' }}>({pg.playerName})</span>}
                  {!pg.telegramChatId && <span style={{ fontSize: '10px', color: '#4a4035' }}>— non connesso</span>}
                </label>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div style={{ marginBottom: '12px', fontSize: '12px' }}>
              {results.map((r, i) => (
                <div key={i} style={{ padding: '2px 0', color: r.status === 'ok' ? '#6a9a6a' : r.status === 'error' ? '#c96e6e' : '#8a7a60' }}>
                  Invio a {r.name}... {r.status === 'ok' ? '✅' : r.status === 'error' ? `❌ ${r.error || ''}` : '⏳'}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid #3a3530', borderRadius: '4px', padding: '6px 16px', color: '#8a7a60', fontSize: '12px', cursor: 'pointer' }}>
              {results.length > 0 ? 'Chiudi' : 'Annulla'}
            </button>
            {results.length === 0 && (
              <button onClick={handleSend} disabled={!canSend} style={{
                background: canSend ? '#252018' : '#1a1714', border: `1px solid ${canSend ? '#c9a96e' : '#3a3530'}`, borderRadius: '4px',
                padding: '6px 16px', color: canSend ? '#c9a96e' : '#4a4035', fontSize: '12px', cursor: canSend ? 'pointer' : 'not-allowed'
              }}>
                {sending ? 'Invio...' : 'Invia'}
              </button>
            )}
          </div>
          {!botRunning && <div style={{ fontSize: '11px', color: '#c96e6e', marginTop: '8px', textAlign: 'center' }}>Bot Telegram non avviato — vai in Impostazioni</div>}
        </div>
      </div>
    </div>
  );
}

export function TelegramTextModal({ selectedText, players, botRunning, gameDate, onLog, onClose }) {
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(() => {
    const s = {};
    (players || []).forEach(p => { if (p.telegramChatId) s[p.id] = true; });
    return s;
  });
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState([]);

  const toggle = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  const recipients = (players || []).filter(p => selected[p.id] && p.telegramChatId);
  const canSend = botRunning && recipients.length > 0 && !sending;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    const sendResults = [];
    for (const pg of recipients) {
      setResults(prev => [...prev, { name: pg.playerName || pg.characterName, status: 'pending' }]);
      try {
        if (message.trim()) await window.electronAPI.telegramSendMessage(pg.telegramChatId, message.trim());
        const result = await window.electronAPI.telegramSendMessage(pg.telegramChatId, selectedText);
        sendResults.push({ name: pg.playerName || pg.characterName, ok: result.success, error: result.error });
        setResults(prev => prev.map((r, i) => i === prev.length - 1 ? { ...r, status: result.success ? 'ok' : 'error', error: result.error } : r));
      } catch (err) {
        sendResults.push({ name: pg.playerName || pg.characterName, ok: false, error: err.message });
        setResults(prev => prev.map((r, i) => i === prev.length - 1 ? { ...r, status: 'error', error: err.message } : r));
      }
    }
    if (onLog) {
      const ok = sendResults.filter(r => r.ok).map(r => r.name);
      const fail = sendResults.filter(r => !r.ok);
      if (ok.length > 0) onLog({ gameDate, realTimestamp: new Date().toISOString(), description: 'Messaggio testo', recipients: ok, status: 'success' });
      fail.forEach(r => onLog({ gameDate, realTimestamp: new Date().toISOString(), description: `Errore invio a ${r.name}`, recipients: [r.name], status: 'error', error: r.error }));
    }
    setSending(false);
  }, [canSend, recipients, message, selectedText, gameDate, onLog]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '420px', background: '#1e1b16', border: '1px solid #3a3530', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #3a3530', background: '#252018', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#c9a96e' }}>✉️ Invia selezione via Telegram</span>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '14px' }}>✕</span>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <label style={{ fontSize: '12px', color: '#8a7a60', display: 'block', marginBottom: '4px' }}>Testo selezionato</label>
          <div style={{ background: '#141210', border: '1px solid #2a2520', borderRadius: '4px', padding: '10px 12px', fontSize: '12px', color: '#d4c5a9', maxHeight: '200px', overflowY: 'auto', lineHeight: '1.6', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
            {selectedText}
          </div>

          <label style={{ fontSize: '12px', color: '#8a7a60', display: 'block', marginBottom: '4px' }}>Messaggio aggiuntivo</label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Opzionale..." rows={2} style={{ ...inputStyle, marginBottom: '16px' }} />

          <label style={{ fontSize: '12px', color: '#8a7a60', display: 'block', marginBottom: '8px' }}>Destinatari</label>
          {(!players || players.length === 0) ? (
            <div style={{ fontSize: '12px', color: '#4a4035', fontStyle: 'italic', marginBottom: '12px' }}>Nessun PG configurato</div>
          ) : (
            <div style={{ marginBottom: '16px' }}>
              {players.map(pg => (
                <label key={pg.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '13px', color: pg.telegramChatId ? '#d4c5a9' : '#4a4035', cursor: pg.telegramChatId ? 'pointer' : 'not-allowed' }}>
                  <input type="checkbox" checked={selected[pg.id] || false} onChange={() => toggle(pg.id)} disabled={!pg.telegramChatId} />
                  <span style={{ color: pg.telegramChatId ? '#c9a96e' : '#4a4035' }}>{pg.characterName || 'Senza nome'}</span>
                  {pg.playerName && <span style={{ color: '#6a5a40', fontSize: '11px' }}>({pg.playerName})</span>}
                  {!pg.telegramChatId && <span style={{ fontSize: '10px', color: '#4a4035' }}>— non connesso</span>}
                </label>
              ))}
            </div>
          )}

          {results.length > 0 && (
            <div style={{ marginBottom: '12px', fontSize: '12px' }}>
              {results.map((r, i) => (
                <div key={i} style={{ padding: '2px 0', color: r.status === 'ok' ? '#6a9a6a' : r.status === 'error' ? '#c96e6e' : '#8a7a60' }}>
                  Invio a {r.name}... {r.status === 'ok' ? '✅' : r.status === 'error' ? `❌ ${r.error || ''}` : '⏳'}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid #3a3530', borderRadius: '4px', padding: '6px 16px', color: '#8a7a60', fontSize: '12px', cursor: 'pointer' }}>
              {results.length > 0 ? 'Chiudi' : 'Annulla'}
            </button>
            {results.length === 0 && (
              <button onClick={handleSend} disabled={!canSend} style={{
                background: canSend ? '#252018' : '#1a1714', border: `1px solid ${canSend ? '#c9a96e' : '#3a3530'}`, borderRadius: '4px',
                padding: '6px 16px', color: canSend ? '#c9a96e' : '#4a4035', fontSize: '12px', cursor: canSend ? 'pointer' : 'not-allowed'
              }}>
                {sending ? 'Invio...' : 'Invia'}
              </button>
            )}
          </div>
          {!botRunning && <div style={{ fontSize: '11px', color: '#c96e6e', marginTop: '8px', textAlign: 'center' }}>Bot Telegram non avviato — vai in Impostazioni</div>}
        </div>
      </div>
    </div>
  );
}
