import React, { useState } from 'react';

const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

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
  boxSizing: 'border-box'
};

const labelStyle = {
  fontSize: '12px',
  color: '#8a7a60',
  marginBottom: '4px',
  display: 'block'
};

const sectionStyle = {
  fontSize: '13px',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '1.5px',
  color: '#c9a96e',
  marginBottom: '16px',
  paddingBottom: '8px',
  borderBottom: '1px solid #3a3530'
};

function parseDate(dateStr) {
  if (!dateStr) return { day: 1, month: 0, year: 2000 };
  const [y, m, d] = dateStr.split('-').map(Number);
  return { day: d || 1, month: (m || 1) - 1, year: y || 2000 };
}

function formatDateISO(day, month, year) {
  const d = String(day).padStart(2, '0');
  const m = String(month + 1).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export default function SettingsPanel({
  projectPath, defaultProjectName,
  settings, onSettingsChange,
  players, onPlayersChange,
  telegram, onTelegramChange,
  botStatus, onStartBot, onStopBot, onDisconnectAllPlayers,
  referenceManuals, onReferenceChange,
  onClose,
  onResetGameDate
}) {
  const [showToken, setShowToken] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const [wizardToken, setWizardToken] = useState('');

  const updateSetting = (key, value) => {
    onSettingsChange(prev => ({ ...prev, [key]: value }));
  };

  const date = parseDate(settings.startDate);

  const updateDate = (field, value) => {
    const d = { ...date, [field]: value };
    updateSetting('startDate', formatDateISO(d.day, d.month, d.year));
  };

  const addPlayer = () => {
    onPlayersChange(prev => [...prev, {
      id: crypto.randomUUID(),
      characterName: '',
      playerName: '',
      note: '',
      characterSheet: '',
      telegramChatId: ''
    }]);
  };

  const updatePlayer = (id, key, value) => {
    onPlayersChange(prev => prev.map(p => p.id === id ? { ...p, [key]: value } : p));
  };

  const removePlayer = (id) => {
    if (!window.confirm('Rimuovere questo personaggio?')) return;
    onPlayersChange(prev => prev.filter(p => p.id !== id));
  };

  const selectSheet = async (playerId) => {
    const result = await window.electronAPI.selectProjectFile(projectPath);
    if (result) updatePlayer(playerId, 'characterSheet', result);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '80%', maxWidth: '800px',
          height: '80vh',
          background: '#1e1b16',
          border: '1px solid #3a3530',
          borderRadius: '8px',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #3a3530',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: '#252018'
        }}>
          <span style={{
            fontSize: '14px', fontWeight: '600',
            color: '#c9a96e', letterSpacing: '1px'
          }}>
            Impostazioni
          </span>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '16px' }}>✕</span>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>

          {/* === PROGETTO === */}
          <div style={sectionStyle}>Progetto</div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Nome progetto</label>
            <input
              type="text"
              value={settings.projectName || ''}
              placeholder={defaultProjectName}
              onChange={e => updateSetting('projectName', e.target.value)}
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = '#c9a96e'}
              onBlur={e => e.currentTarget.style.borderColor = '#3a3530'}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Data iniziale del gioco</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="1" max="31"
                value={date.day}
                onChange={e => updateDate('day', parseInt(e.target.value) || 1)}
                style={{ ...inputStyle, width: '70px', textAlign: 'center' }}
                onFocus={e => e.currentTarget.style.borderColor = '#c9a96e'}
                onBlur={e => e.currentTarget.style.borderColor = '#3a3530'}
              />
              <select
                value={date.month}
                onChange={e => updateDate('month', parseInt(e.target.value))}
                style={{
                  ...inputStyle, width: '150px', cursor: 'pointer',
                  appearance: 'auto'
                }}
              >
                {MONTHS_IT.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
              <input
                type="number"
                value={date.year}
                onChange={e => updateDate('year', parseInt(e.target.value) || 2000)}
                style={{ ...inputStyle, width: '90px', textAlign: 'center' }}
                onFocus={e => e.currentTarget.style.borderColor = '#c9a96e'}
                onBlur={e => e.currentTarget.style.borderColor = '#3a3530'}
              />
              {onResetGameDate && (
                <button
                  onClick={onResetGameDate}
                  title="Riporta la data del gioco alla data iniziale configurata"
                  style={{
                    background: 'none', border: '1px solid #3a3530', borderRadius: '4px',
                    padding: '6px 12px', color: '#8a7a60', fontSize: '12px', cursor: 'pointer',
                    whiteSpace: 'nowrap', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a96e'; e.currentTarget.style.color = '#c9a96e'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a3530'; e.currentTarget.style.color = '#8a7a60'; }}
                >
                  🔄 Reimposta data gioco
                </button>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={labelStyle}>Tipo calendario</label>
            <select disabled style={{ ...inputStyle, width: '200px', cursor: 'not-allowed', opacity: 0.5 }}>
              <option>Gregoriano</option>
            </select>
          </div>

          {/* === PERSONAGGI GIOCANTI === */}
          <div style={sectionStyle}>Personaggi Giocanti (PG)</div>

          <button
            onClick={addPlayer}
            style={{
              background: 'none',
              border: '1px solid #3a3530',
              borderRadius: '4px',
              padding: '6px 16px',
              color: '#c9a96e',
              fontSize: '13px',
              cursor: 'pointer',
              marginBottom: '16px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a96e'; e.currentTarget.style.background = '#252018'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a3530'; e.currentTarget.style.background = 'none'; }}
          >
            ➕ Aggiungi PG
          </button>

          {players.length === 0 && (
            <div style={{ color: '#4a4035', fontSize: '13px', fontStyle: 'italic', marginBottom: '16px' }}>
              Nessun personaggio configurato
            </div>
          )}

          {players.map((pg, idx) => (
            <div key={pg.id} style={{
              border: '1px solid #3a3530',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '12px',
              background: '#1a1714'
            }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Nome personaggio</label>
                  <input
                    type="text"
                    value={pg.characterName}
                    placeholder="es. Ispettore Kimura"
                    onChange={e => updatePlayer(pg.id, 'characterName', e.target.value)}
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = '#c9a96e'}
                    onBlur={e => e.currentTarget.style.borderColor = '#3a3530'}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Nome giocatore</label>
                  <input
                    type="text"
                    value={pg.playerName}
                    placeholder="es. Marco"
                    onChange={e => updatePlayer(pg.id, 'playerName', e.target.value)}
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = '#c9a96e'}
                    onBlur={e => e.currentTarget.style.borderColor = '#3a3530'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Nota</label>
                <input
                  type="text"
                  value={pg.note}
                  placeholder="es. Specialista in interrogatori, ex militare"
                  onChange={e => updatePlayer(pg.id, 'note', e.target.value)}
                  style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = '#c9a96e'}
                  onBlur={e => e.currentTarget.style.borderColor = '#3a3530'}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Scheda personaggio</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      onClick={() => selectSheet(pg.id)}
                      style={{
                        background: '#252018',
                        border: '1px solid #3a3530',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        color: '#d4c5a9',
                        fontSize: '12px',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#c9a96e'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = '#3a3530'}
                    >
                      Sfoglia...
                    </button>
                    <span style={{
                      fontSize: '12px',
                      color: pg.characterSheet ? '#d4c5a9' : '#4a4035',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {pg.characterSheet || 'Nessun file selezionato'}
                    </span>
                    {pg.characterSheet && (
                      <span className="close-btn" onClick={() => updatePlayer(pg.id, 'characterSheet', '')}
                        style={{ fontSize: '12px', flexShrink: 0 }}>✕</span>
                    )}
                  </div>
                </div>
                <div style={{ width: '180px', flexShrink: 0 }}>
                  <label style={labelStyle}>Telegram Chat ID</label>
                  <input
                    type="text"
                    value={pg.telegramChatId}
                    placeholder="ID numerico"
                    onChange={e => updatePlayer(pg.id, 'telegramChatId', e.target.value)}
                    style={inputStyle}
                    onFocus={e => e.currentTarget.style.borderColor = '#c9a96e'}
                    onBlur={e => e.currentTarget.style.borderColor = '#3a3530'}
                  />
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button
                  onClick={() => removePlayer(pg.id)}
                  style={{
                    background: 'none',
                    border: '1px solid #3a2020',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    color: '#c96e6e',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#3a2020'; e.currentTarget.style.borderColor = '#c96e6e'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#3a2020'; }}
                >
                  Rimuovi
                </button>
              </div>
            </div>
          ))}

          {/* === TELEGRAM === */}
          <div style={{ ...sectionStyle, marginTop: '16px' }}>Telegram</div>

          {!telegram.botToken ? (
            /* === WIZARD === */
            <div style={{ background: '#1a1714', border: '1px solid #2a2520', borderRadius: '6px', padding: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#c9a96e', marginBottom: '12px' }}>
                📱 Configurazione Telegram — Prima volta
              </div>
              <div style={{ fontSize: '12px', color: '#8a7a60', lineHeight: '1.8', marginBottom: '16px' }}>
                Per ricevere e inviare messaggi ai giocatori serve un bot Telegram.<br />
                Crearlo richiede 2 minuti:<br /><br />
                1. Apri Telegram e cerca <span style={{ color: '#c9a96e' }}>@BotFather</span><br />
                2. Scrivi <span style={{ color: '#c9a96e' }}>/newbot</span><br />
                3. Scegli un nome per il bot (es. "GENKAI Dashboard")<br />
                4. Scegli un username che finisca con "bot"<br />
                5. BotFather ti darà un token — copialo qui sotto
              </div>
              <input
                type="text"
                value={wizardToken}
                onChange={e => { setWizardToken(e.target.value); setVerifyError(null); }}
                placeholder="Incolla il token qui"
                style={{ ...inputStyle, marginBottom: '12px' }}
                onFocus={e => e.currentTarget.style.borderColor = '#c9a96e'}
                onBlur={e => e.currentTarget.style.borderColor = '#3a3530'}
              />
              {verifyError && <div style={{ fontSize: '12px', color: '#c96e6e', marginBottom: '8px' }}>{verifyError}</div>}
              <button
                disabled={!wizardToken.trim() || verifying}
                onClick={async () => {
                  setVerifying(true); setVerifyError(null);
                  try {
                    const result = await window.electronAPI.telegramVerifyToken(wizardToken.trim());
                    setVerifying(false);
                    if (result.success) {
                      const code = String(Math.floor(100000 + Math.random() * 900000));
                      onTelegramChange(prev => ({ ...prev, botToken: wizardToken.trim(), configured: true, sessionCode: code, botInfo: result.botInfo }));
                      setWizardToken('');
                    } else {
                      setVerifyError(result.error || 'Errore sconosciuto');
                    }
                  } catch (err) {
                    setVerifying(false);
                    setVerifyError(err.message || 'Errore di comunicazione');
                  }
                }}
                style={{
                  background: '#252018', border: '1px solid #3a3530', borderRadius: '4px',
                  padding: '8px 20px', color: wizardToken.trim() ? '#c9a96e' : '#4a4035',
                  fontSize: '13px', cursor: wizardToken.trim() && !verifying ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                {verifying ? 'Verifica in corso...' : '✅ Verifica e salva'}
              </button>
            </div>
          ) : (
            /* === CONFIGURED === */
            <>
              {/* Token row */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Bot Token</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={telegram.botToken}
                    onChange={e => onTelegramChange(prev => ({ ...prev, botToken: e.target.value }))}
                    style={{ ...inputStyle, flex: 1 }}
                    onFocus={e => e.currentTarget.style.borderColor = '#c9a96e'}
                    onBlur={e => e.currentTarget.style.borderColor = '#3a3530'}
                  />
                  <span onClick={() => setShowToken(v => !v)} style={{ cursor: 'pointer', fontSize: '16px', color: '#8a7a60', flexShrink: 0, userSelect: 'none' }} title={showToken ? 'Nascondi' : 'Mostra'}>
                    {showToken ? '🙈' : '👁'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#6a9a6a', flexShrink: 0 }}>✅ Configurato</span>
                </div>
                {telegram.botInfo && (
                  <div style={{ fontSize: '11px', color: '#6a5a40', marginTop: '4px' }}>
                    Bot: @{telegram.botInfo.username} — {telegram.botInfo.firstName}
                  </div>
                )}
              </div>

              {/* Session code */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Codice Sessione</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px', fontWeight: '700', color: '#c9a96e', letterSpacing: '3px', fontFamily: 'monospace' }}>
                    {telegram.sessionCode || '------'}
                  </span>
                  <button
                    onClick={() => {
                      let code;
                      do { code = String(Math.floor(100000 + Math.random() * 900000)); } while (code === telegram.sessionCode);
                      onTelegramChange(prev => ({ ...prev, sessionCode: code }));
                    }}
                    style={{
                      background: 'none', border: '1px solid #3a3530', borderRadius: '4px',
                      padding: '4px 10px', color: '#8a7a60', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a96e'; e.currentTarget.style.color = '#c9a96e'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a3530'; e.currentTarget.style.color = '#8a7a60'; }}
                  >
                    🔄 Genera nuovo
                  </button>
                </div>
              </div>

              {/* Bot status + start/stop */}
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Stato Bot</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: botStatus?.running ? '#6a9a6a' : '#8a7a60' }}>
                    {botStatus?.running
                      ? `🟢 Attiva — ${players.filter(p => p.telegramChatId).length} giocatori connessi`
                      : '🔴 Non attiva'}
                  </span>
                  {botStatus?.running ? (
                    <button onClick={onStopBot} style={{
                      background: 'none', border: '1px solid #3a3530', borderRadius: '4px',
                      padding: '4px 12px', color: '#c96e6e', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#c96e6e'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a3530'; }}
                    >⏹ Ferma bot</button>
                  ) : (
                    <button onClick={onStartBot} disabled={!telegram.sessionCode} style={{
                      background: 'none', border: '1px solid #3a3530', borderRadius: '4px',
                      padding: '4px 12px', color: telegram.sessionCode ? '#6a9a6a' : '#4a4035',
                      fontSize: '11px', cursor: telegram.sessionCode ? 'pointer' : 'not-allowed', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { if (telegram.sessionCode) e.currentTarget.style.borderColor = '#6a9a6a'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a3530'; }}
                    >▶ Avvia bot</button>
                  )}
                </div>
                {botStatus?.error && <div style={{ fontSize: '11px', color: '#c96e6e', marginTop: '4px' }}>{botStatus.error}</div>}
              </div>

              {/* Connected players */}
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Giocatori connessi</label>
                <div style={{ background: '#1a1714', border: '1px solid #2a2520', borderRadius: '4px', padding: '10px 14px' }}>
                  {players.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#4a4035', fontStyle: 'italic' }}>Nessun PG configurato</div>
                  ) : (
                    players.map(pg => (
                      <div key={pg.id} style={{ fontSize: '12px', padding: '3px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '8px' }}>{pg.telegramChatId ? '🟢' : '⚪'}</span>
                        <span style={{ color: '#c9a96e', fontWeight: '600' }}>{pg.characterName || 'Senza nome'}</span>
                        {pg.playerName && <span style={{ color: '#6a5a40' }}>— {pg.playerName}</span>}
                        {pg.telegramChatId && <span style={{ color: '#4a4035', fontSize: '10px' }}>(Chat ID: {pg.telegramChatId})</span>}
                        {!pg.telegramChatId && <span style={{ color: '#4a4035', fontSize: '10px', fontStyle: 'italic' }}>(in attesa)</span>}
                      </div>
                    ))
                  )}
                </div>
                {players.some(p => p.telegramChatId) && (
                  <button onClick={onDisconnectAllPlayers} style={{
                    background: 'none', border: '1px solid #3a2020', borderRadius: '4px',
                    padding: '4px 12px', color: '#c96e6e', fontSize: '11px', cursor: 'pointer',
                    marginTop: '8px', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#3a2020'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  >Disconnetti tutti i giocatori</button>
                )}
              </div>

              {/* Instructions */}
              <div style={{
                padding: '10px 14px', background: '#1a1714', border: '1px solid #2a2520',
                borderRadius: '4px', fontSize: '11px', color: '#6a5a40', lineHeight: '1.5'
              }}>
                Comunica ai giocatori di cercare il bot su Telegram e scrivere:<br />
                <span style={{ color: '#c9a96e', fontFamily: 'monospace' }}>/join {telegram.sessionCode || '------'}</span>
              </div>

              {/* Reset token */}
              <button onClick={() => {
                if (window.confirm('Rimuovere il token e riconfigurare?')) {
                  if (botStatus?.running) onStopBot();
                  onTelegramChange({ botToken: '', configured: false, sessionCode: '', botActive: false, botInfo: null });
                }
              }} style={{
                background: 'none', border: 'none', padding: '8px 0', color: '#4a4035',
                fontSize: '11px', cursor: 'pointer', marginTop: '8px'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#c96e6e'}
              onMouseLeave={e => e.currentTarget.style.color = '#4a4035'}
              >🗑️ Rimuovi token e riconfigura</button>
            </>
          )}

          {/* === MANUALI DI RIFERIMENTO === */}
          <div style={{ ...sectionStyle, marginTop: '16px' }}>Manuali di Riferimento</div>

          <button
            onClick={async () => {
              const result = await window.electronAPI.selectProjectFile(projectPath);
              if (result) {
                const name = result.split('/').pop().replace(/\.[^.]+$/, '');
                onReferenceChange(prev => [...prev, { id: crypto.randomUUID(), name, file: result }]);
              }
            }}
            style={{
              background: 'none', border: '1px solid #3a3530', borderRadius: '4px',
              padding: '6px 16px', color: '#c9a96e', fontSize: '13px',
              cursor: 'pointer', marginBottom: '16px', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9a96e'; e.currentTarget.style.background = '#252018'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#3a3530'; e.currentTarget.style.background = 'none'; }}
          >
            ➕ Aggiungi manuale
          </button>

          {(referenceManuals || []).length === 0 && (
            <div style={{ color: '#4a4035', fontSize: '13px', fontStyle: 'italic', marginBottom: '16px' }}>
              Nessun manuale configurato
            </div>
          )}

          {(referenceManuals || []).map((manual, idx) => (
            <div key={manual.id} style={{
              border: '1px solid #3a3530', borderRadius: '6px',
              padding: '12px 16px', marginBottom: '10px', background: '#1a1714',
              display: 'flex', gap: '10px', alignItems: 'center'
            }}>
              {/* Reorder buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                <button
                  disabled={idx === 0}
                  onClick={() => {
                    onReferenceChange(prev => {
                      const arr = [...prev];
                      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                      return arr;
                    });
                  }}
                  style={{
                    background: 'none', border: 'none', color: idx === 0 ? '#2a2520' : '#8a7a60',
                    cursor: idx === 0 ? 'default' : 'pointer', fontSize: '10px', padding: '0', lineHeight: '1'
                  }}
                >▲</button>
                <button
                  disabled={idx === (referenceManuals || []).length - 1}
                  onClick={() => {
                    onReferenceChange(prev => {
                      const arr = [...prev];
                      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                      return arr;
                    });
                  }}
                  style={{
                    background: 'none', border: 'none',
                    color: idx === (referenceManuals || []).length - 1 ? '#2a2520' : '#8a7a60',
                    cursor: idx === (referenceManuals || []).length - 1 ? 'default' : 'pointer',
                    fontSize: '10px', padding: '0', lineHeight: '1'
                  }}
                >▼</button>
              </div>

              {/* Name */}
              <input
                type="text"
                value={manual.name}
                onChange={e => onReferenceChange(prev => prev.map(m => m.id === manual.id ? { ...m, name: e.target.value } : m))}
                placeholder="Nome manuale"
                style={{ ...inputStyle, flex: 1 }}
                onFocus={e => e.currentTarget.style.borderColor = '#c9a96e'}
                onBlur={e => e.currentTarget.style.borderColor = '#3a3530'}
              />

              {/* File path */}
              <span style={{
                fontSize: '11px', color: '#6a5a40', maxWidth: '200px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0
              }} title={manual.file}>
                {manual.file}
              </span>

              {/* Remove */}
              <button
                onClick={() => {
                  if (window.confirm(`Rimuovere "${manual.name}"?`)) {
                    onReferenceChange(prev => prev.filter(m => m.id !== manual.id));
                  }
                }}
                style={{
                  background: 'none', border: '1px solid #3a2020', borderRadius: '3px',
                  padding: '3px 8px', color: '#c96e6e', fontSize: '11px',
                  cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#3a2020'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                ✕
              </button>
            </div>
          ))}

          <div style={{ height: '24px' }} />
        </div>
      </div>
    </div>
  );
}
