import React, { useState, useCallback, useMemo } from 'react';

export default function AiSendModal({ target, context, players, aiEnabled, botRunning, onAiPoke, onClose }) {
  // Parse random target (stesso pattern di TelegramSendModal)
  const parseRandomTarget = (t, connected) => {
    const m = t.match(/^(casuale|random)(?::(.+))?$/i);
    if (!m) return null;
    const param = (m[2] || '1').toLowerCase();
    const total = connected.length;
    if (!total) return 0;
    if (param === 'metà' || param === 'meta' || param === 'half') return Math.max(1, Math.ceil(total / 2));
    if (param === 'tutti-1' || param === 'all-1') return Math.max(1, total - 1);
    const n = parseInt(param, 10);
    return isNaN(n) ? 1 : Math.min(n, total);
  };

  const pickRandom = (connected, count) => {
    const shuffled = [...connected].sort(() => Math.random() - 0.5);
    const s = {};
    shuffled.slice(0, count).forEach(p => { s[p.id] = true; });
    return s;
  };

  const [selected, setSelected] = useState(() => {
    const s = {};
    const targetLower = (target || '').toLowerCase();
    const isAll = targetLower === 'all' || targetLower === '*' || targetLower === 'tutti';
    const connected = (players || []).filter(p => p.telegramChatId);

    const randomCount = parseRandomTarget(targetLower, connected);
    if (randomCount !== null) return pickRandom(connected, randomCount);

    if (isAll) {
      connected.forEach(p => { s[p.id] = true; });
      return s;
    }

    const targetNames = (target || '').split(',').map(n => n.trim().toLowerCase());
    connected.forEach(p => {
      const charLower = (p.characterName || '').toLowerCase();
      const playerLower = (p.playerName || '').toLowerCase();
      if (targetNames.some(t => charLower.includes(t) || playerLower.includes(t))) {
        s[p.id] = true;
      }
    });
    return s;
  });

  const [guidance, setGuidance] = useState(context || '');
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
  const selectRandom = () => {
    const connected = (players || []).filter(p => p.telegramChatId);
    const selectedCount = connected.filter(p => selected[p.id]).length;
    if (selectedCount >= connected.length) {
      setSelected(pickRandom(connected, 1));
      return;
    }
    const unselected = connected.filter(p => !selected[p.id]);
    if (unselected.length === 0) return;
    const pick = unselected[Math.floor(Math.random() * unselected.length)];
    setSelected(prev => ({ ...prev, [pick.id]: true }));
  };

  const connectedPlayers = useMemo(() => (players || []).filter(p => p.telegramChatId), [players]);
  const recipients = connectedPlayers.filter(p => selected[p.id]);
  const canSend = botRunning && aiEnabled && recipients.length > 0 && !sending;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    for (const pg of recipients) {
      setResults(prev => [...prev, { name: pg.characterName || pg.playerName, status: 'pending' }]);
      try {
        const res = await onAiPoke(pg.telegramChatId, guidance.trim());
        const ok = res !== false;
        setResults(prev => prev.map((r, i) => i === prev.length - 1 ? { ...r, status: ok ? 'ok' : 'error' } : r));
      } catch (err) {
        setResults(prev => prev.map((r, i) => i === prev.length - 1 ? { ...r, status: 'error', error: err.message } : r));
      }
    }
    setSending(false);
    setDone(true);
  }, [canSend, recipients, guidance, onAiPoke]);

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
        width: '460px', maxHeight: '85vh', overflowY: 'auto',
        border: '1px solid var(--border-default)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {'\u{1F916}'} Guida AI &rarr; Telegram
          </div>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '18px', cursor: 'pointer' }}>&#10005;</span>
        </div>

        <div style={{
          padding: '8px 12px', borderRadius: '6px', marginBottom: '14px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: '1.5'
        }}>
          L'AI genererà un messaggio proattivo coerente con i documenti attivi del PG,
          il file <code>_prompt</code> (se presente) e lo storico della conversazione.
          Il testo sotto è solo un'<strong>indicazione</strong> al modello.
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>
            Indicazione per l'AI
          </label>
          <textarea
            style={{ ...inputStyle, minHeight: '70px' }}
            value={guidance}
            onChange={e => setGuidance(e.target.value)}
            placeholder="Es. Insinua un odore di zolfo, accenna a un ricordo d'infanzia..."
          />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Destinatari</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span onClick={selectAll} style={{ fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }}>Tutti</span>
              <span onClick={selectNone} style={{ fontSize: '11px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>Nessuno</span>
              <span onClick={selectRandom} style={{ fontSize: '11px', color: 'var(--color-warning)', cursor: 'pointer' }}>Casuale</span>
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
              {sending ? 'Invio...' : `Genera e invia a ${recipients.length} giocator${recipients.length === 1 ? 'e' : 'i'}`}
            </button>
          )}
        </div>

        {!botRunning && (
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--color-warning)', textAlign: 'center' }}>
            Bot Telegram non attivo
          </div>
        )}
        {botRunning && !aiEnabled && (
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--color-warning)', textAlign: 'center' }}>
            AI Telegram non configurata (Settings &rarr; AI)
          </div>
        )}
      </div>
    </div>
  );
}
