import React, { useState, useMemo, useCallback } from 'react';
import { wrapGmText } from './TelegramModal';

const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const EVENT_TYPES = [
  { value: 'indizio', label: 'Indizio', color: 'var(--accent)' },
  { value: 'promemoria', label: 'Promemoria', color: 'var(--color-info)' },
  { value: 'evento', label: 'Evento', color: 'var(--color-danger)' }
];

function getEventColor(type) {
  return EVENT_TYPES.find(t => t.value === type)?.color || 'var(--accent)';
}

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

const inputStyle = {
  width: '100%',
  padding: '6px 10px',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-default)',
  borderRadius: '4px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box'
};

export default function CalendarPanel({
  calendarData, onCalendarChange,
  gameDate,
  projectPath, players,
  onOpenCalDoc,
  onClose,
  botRunning, onLog
}) {
  const [sending, setSending] = useState({});
  const currentDate = gameDate || '2000-01-01';
  const { year: curY, month: curM } = parseISO(currentDate);

  const [viewYear, setViewYear] = useState(curY);
  const [viewMonth, setViewMonth] = useState(curM);
  const [selectedDay, setSelectedDay] = useState(currentDate);

  const events = calendarData.events || {};

  // Build calendar grid
  const grid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Monday=0 based start
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const cells = [];
    // Padding before
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(v => v - 1); setViewMonth(11); }
    else setViewMonth(v => v - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(v => v + 1); setViewMonth(0); }
    else setViewMonth(v => v + 1);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const iso = toISO(viewYear, viewMonth, day);
    setSelectedDay(iso);
  };

  // Events for selected day
  const dayEvents = events[selectedDay] || [];
  const { day: selDay } = parseISO(selectedDay);

  const addEvent = () => {
    const newEvent = {
      id: crypto.randomUUID(),
      title: 'Nuovo evento',
      type: 'evento',
      note: '',
      linkedDocument: '',
      telegram: { enabled: false, recipients: [], autoSend: false }
    };
    onCalendarChange(prev => ({
      ...prev,
      events: {
        ...prev.events,
        [selectedDay]: [...(prev.events[selectedDay] || []), newEvent]
      }
    }));
  };

  const updateEvent = (eventId, key, value) => {
    onCalendarChange(prev => ({
      ...prev,
      events: {
        ...prev.events,
        [selectedDay]: (prev.events[selectedDay] || []).map(ev =>
          ev.id === eventId ? { ...ev, [key]: value } : ev
        )
      }
    }));
  };

  const removeEvent = (eventId) => {
    if (!window.confirm('Eliminare questo evento?')) return;
    onCalendarChange(prev => {
      const filtered = (prev.events[selectedDay] || []).filter(ev => ev.id !== eventId);
      const newEvents = { ...prev.events };
      if (filtered.length === 0) delete newEvents[selectedDay];
      else newEvents[selectedDay] = filtered;
      return { ...prev, events: newEvents };
    });
  };

  const selectLinkedDoc = async (eventId) => {
    const result = await window.electronAPI.selectProjectFile(projectPath, [
      { name: 'Tutti i file supportati', extensions: ['md', 'html', 'htm', 'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp3', 'ogg', 'wav', 'flac', 'm4a'] }
    ]);
    if (result) updateEvent(eventId, 'linkedDocument', result);
  };

  const updateTelegram = (eventId, key, value) => {
    onCalendarChange(prev => ({
      ...prev,
      events: {
        ...prev.events,
        [selectedDay]: (prev.events[selectedDay] || []).map(ev =>
          ev.id === eventId ? { ...ev, telegram: { ...ev.telegram, [key]: value } } : ev
        )
      }
    }));
  };

  const toggleTelegramRecipient = (eventId, playerId, currentRecipients) => {
    const next = currentRecipients.includes(playerId)
      ? currentRecipients.filter(id => id !== playerId)
      : [...currentRecipients, playerId];
    updateTelegram(eventId, 'recipients', next);
  };

  const handleSendEvent = useCallback(async (ev) => {
    const recipients = (ev.telegram?.recipients || [])
      .map(pid => players.find(p => p.id === pid))
      .filter(p => p && p.telegramChatId);

    if (recipients.length === 0) return;

    setSending(prev => ({ ...prev, [ev.id]: true }));

    const text = `📅 *${ev.title}*\n${ev.note || ''}`.trim();
    const now = new Date().toLocaleString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const linkedFile = ev.linkedDocument ? `${projectPath}/${ev.linkedDocument}` : null;
    const linkedExt = ev.linkedDocument ? ev.linkedDocument.substring(ev.linkedDocument.lastIndexOf('.')).toLowerCase() : '';
    const isImage = IMAGE_EXTS.includes(linkedExt);
    const isHtml = ['.html', '.htm'].includes(linkedExt);

    for (const p of recipients) {
      try {
        // Invia testo
        await window.electronAPI.telegramSendMessage(p.telegramChatId, wrapGmText(text));
        // Invia allegato se presente
        if (linkedFile) {
          if (isImage) {
            await window.electronAPI.telegramSendPhoto(p.telegramChatId, linkedFile, ev.linkedDocument.split('/').pop());
          } else if (isHtml) {
            await window.electronAPI.telegramSendHtmlAsPhoto(p.telegramChatId, linkedFile, ev.linkedDocument.split('/').pop());
          } else {
            await window.electronAPI.telegramSendDocument(p.telegramChatId, linkedFile, ev.linkedDocument.split('/').pop());
          }
        }
        if (onLog) onLog({
          date: now,
          success: true,
          description: `Evento "${ev.title}" inviato${linkedFile ? ' + allegato' : ''}`,
          recipient: p.characterName || p.playerName
        });
      } catch (err) {
        if (onLog) onLog({
          date: now,
          success: false,
          description: `Evento "${ev.title}" — errore`,
          recipient: p.characterName || p.playerName,
          error: err.message
        });
      }
    }

    // Marca come inviato
    onCalendarChange(prev => {
      const dayKey = Object.keys(prev.events || {}).find(k =>
        (prev.events[k] || []).some(e => e.id === ev.id)
      );
      if (!dayKey) return prev;
      return {
        ...prev,
        events: {
          ...prev.events,
          [dayKey]: prev.events[dayKey].map(e => e.id === ev.id ? { ...e, sent: true } : e)
        }
      };
    });

    setSending(prev => ({ ...prev, [ev.id]: false }));
  }, [players, onLog, onCalendarChange]);

  const { day: gameDayNum, month: gameMonthNum, year: gameYearNum } = parseISO(currentDate);
  const selectedParsed = parseISO(selectedDay);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--overlay-light)',
        zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '520px',
          maxHeight: '80vh',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: 'var(--bg-elevated)'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)', letterSpacing: '1px' }}>
            Calendario
          </span>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '16px' }}>✕</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* Month navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span onClick={prevMonth} style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '14px', padding: '4px 8px' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>◀</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: "'Georgia', serif" }}>
              {MONTHS_IT[viewMonth]} {viewYear}
            </span>
            <span onClick={nextMonth} style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '14px', padding: '4px 8px' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>▶</span>
          </div>

          {/* Day names */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {DAYS_IT.map(d => (
              <div key={d} style={{
                textAlign: 'center', fontSize: '10px', color: 'var(--text-tertiary)',
                fontWeight: '600', textTransform: 'uppercase', padding: '4px 0'
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '16px' }}>
            {grid.map((day, i) => {
              if (day === null) return <div key={`pad-${i}`} />;
              const iso = toISO(viewYear, viewMonth, day);
              const isGameDay = iso === currentDate;
              const isSelected = iso === selectedDay;
              const dayEvts = events[iso] || [];
              const hasEvt = dayEvts.length > 0;
              const dotColor = hasEvt ? getEventColor(dayEvts[0].type) : null;

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  style={{
                    textAlign: 'center',
                    padding: '6px 0 2px',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    fontSize: '13px',
                    color: isGameDay ? 'var(--bg-main)' : isSelected ? 'var(--accent)' : 'var(--text-primary)',
                    background: isGameDay ? 'var(--accent)' : isSelected ? 'var(--border-subtle)' : 'transparent',
                    fontWeight: isGameDay ? '700' : '400',
                    transition: 'all 0.15s',
                    position: 'relative'
                  }}
                  onMouseEnter={e => { if (!isGameDay && !isSelected) e.currentTarget.style.background = 'var(--border-subtle)'; }}
                  onMouseLeave={e => { if (!isGameDay && !isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {day}
                  {hasEvt && (
                    <div style={{
                      width: '5px', height: '5px', borderRadius: '50%',
                      background: isGameDay ? 'var(--bg-main)' : dotColor,
                      margin: '2px auto 0'
                    }} />
                  )}
                  {!hasEvt && <div style={{ height: '7px' }} />}
                </div>
              );
            })}
          </div>

          {/* Events for selected day */}
          <div style={{
            borderTop: '1px solid var(--border-default)', paddingTop: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)' }}>
                {dayEvents.length > 0
                  ? `Eventi del ${selectedParsed.day} ${MONTHS_IT[selectedParsed.month]} ${selectedParsed.year}`
                  : `Nessun evento il ${selectedParsed.day} ${MONTHS_IT[selectedParsed.month]} ${selectedParsed.year}`
                }
              </span>
              <button
                onClick={addEvent}
                style={{
                  background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                  padding: '4px 10px', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'none'; }}
              >
                ➕ Aggiungi evento
              </button>
            </div>

            {dayEvents.map(ev => (
              <div key={ev.id} style={{
                border: '1px solid var(--border-default)', borderRadius: '6px',
                padding: '12px', marginBottom: '10px', background: 'var(--bg-main)'
              }}>
                {/* Title + type row */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: getEventColor(ev.type), flexShrink: 0
                  }} />
                  <input
                    type="text"
                    value={ev.title}
                    onChange={e => updateEvent(ev.id, 'title', e.target.value)}
                    style={{ ...inputStyle, flex: 1, fontWeight: '600' }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                  />
                  <select
                    value={ev.type}
                    onChange={e => updateEvent(ev.id, 'type', e.target.value)}
                    style={{ ...inputStyle, width: '120px', cursor: 'pointer', appearance: 'auto' }}
                  >
                    {EVENT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Note */}
                <textarea
                  value={ev.note}
                  onChange={e => updateEvent(ev.id, 'note', e.target.value)}
                  placeholder="Nota..."
                  rows={2}
                  style={{
                    ...inputStyle, resize: 'vertical', marginBottom: '8px',
                    fontFamily: 'inherit'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                />

                {/* Linked document */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                  {ev.linkedDocument ? (
                    <>
                      <span style={{ fontSize: '12px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        📎 {ev.linkedDocument}
                      </span>
                      <button
                        onClick={() => {
                          if (onOpenCalDoc) onOpenCalDoc(ev.linkedDocument);
                        }}
                        style={{
                          background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                          padding: '2px 8px', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
                      >
                        Apri
                      </button>
                      <span className="close-btn" onClick={() => updateEvent(ev.id, 'linkedDocument', '')}
                        style={{ fontSize: '12px' }}>✕</span>
                    </>
                  ) : (
                    <button
                      onClick={() => selectLinkedDoc(ev.id)}
                      style={{
                        background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                        padding: '4px 10px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      📎 Collega documento
                    </button>
                  )}
                </div>

                {/* Telegram section */}
                <div style={{
                  padding: '8px', background: 'var(--bg-elevated)', borderRadius: '4px',
                  marginBottom: '8px'
                }}>
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px',
                    color: 'var(--accent)', cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={ev.telegram?.enabled || false}
                      onChange={e => updateTelegram(ev.id, 'enabled', e.target.checked)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    ✉️ Invia via Telegram
                  </label>
                  {ev.telegram?.enabled && (
                    <div style={{ marginTop: '6px', paddingLeft: '20px', fontSize: '11px' }}>
                      {/* Recipient checkboxes */}
                      {(players || []).map(pg => {
                        const connected = !!pg.telegramChatId;
                        return (
                          <label key={pg.id} style={{
                            display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px',
                            color: connected ? 'var(--text-primary)' : 'var(--text-disabled)',
                            cursor: connected ? 'pointer' : 'not-allowed'
                          }}>
                            <input
                              type="checkbox"
                              checked={(ev.telegram?.recipients || []).includes(pg.id)}
                              onChange={() => connected && toggleTelegramRecipient(ev.id, pg.id, ev.telegram?.recipients || [])}
                              disabled={!connected}
                              style={{ accentColor: 'var(--accent)' }}
                            />
                            {connected ? '🟢' : '⚪'} {pg.characterName || pg.playerName}
                          </label>
                        );
                      })}

                      {/* Auto/Manual toggle */}
                      <div style={{ marginTop: '6px', display: 'flex', gap: '12px' }}>
                        <label style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px' }}>
                          <input
                            type="radio"
                            name={`send-${ev.id}`}
                            checked={ev.telegram?.autoSend || false}
                            onChange={() => updateTelegram(ev.id, 'autoSend', true)}
                            style={{ accentColor: 'var(--accent)' }}
                          /> Automatico
                        </label>
                        <label style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px' }}>
                          <input
                            type="radio"
                            name={`send-${ev.id}`}
                            checked={!ev.telegram?.autoSend}
                            onChange={() => updateTelegram(ev.id, 'autoSend', false)}
                            style={{ accentColor: 'var(--accent)' }}
                          /> Manuale
                        </label>
                      </div>

                      {/* Stato invio */}
                      {ev.sent && (
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--color-success)' }}>✅ Inviato</span>
                          <button
                            onClick={() => updateEvent(ev.id, 'sent', false)}
                            style={{
                              background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                              padding: '2px 8px', color: 'var(--text-secondary)', fontSize: '10px', cursor: 'pointer'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                          >🔄 Reset invio</button>
                        </div>
                      )}

                      {/* Manual send button */}
                      {!ev.telegram?.autoSend && !ev.sent && (
                        <button
                          onClick={() => handleSendEvent(ev)}
                          disabled={!botRunning || (ev.telegram?.recipients || []).length === 0 || sending[ev.id]}
                          style={{
                            marginTop: '6px', background: 'none',
                            border: `1px solid ${botRunning ? 'var(--accent)' : 'var(--border-default)'}`,
                            borderRadius: '4px', padding: '4px 10px',
                            color: botRunning ? 'var(--accent)' : 'var(--text-disabled)',
                            fontSize: '11px',
                            cursor: botRunning && (ev.telegram?.recipients || []).length > 0 ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { if (botRunning) { e.currentTarget.style.background = 'var(--border-subtle)'; } }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                        >
                          {sending[ev.id] ? '⏳ Invio...' : '✉️ Invia ora'}
                        </button>
                      )}

                      {/* Auto-send info */}
                      {ev.telegram?.autoSend && !ev.sent && (
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                          Verrà inviato automaticamente quando la data di gioco raggiunge questo giorno
                        </div>
                      )}

                      {!botRunning && !ev.sent && (
                        <div style={{ fontSize: '10px', color: 'var(--color-danger)', marginTop: '4px' }}>
                          Bot non attivo
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete */}
                <div style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => removeEvent(ev.id)}
                    style={{
                      background: 'none', border: '1px solid var(--border-danger)', borderRadius: '4px',
                      padding: '3px 10px', color: 'var(--color-danger)', fontSize: '11px', cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-danger)'; e.currentTarget.style.borderColor = 'var(--color-danger)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'var(--border-danger)'; }}
                  >
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
