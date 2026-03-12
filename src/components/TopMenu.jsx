import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const MONTHS_IT = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];

const MONTHS_IT_CAP = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function formatDateIT(isoDate) {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} ${MONTHS_IT[(m || 1) - 1]} ${y}`;
}

function toISO(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function DatePickerDropdown({ gameDate, onSetGameDate, calendarEvents, onClose }) {
  const { year: curY, month: curM } = parseISO(gameDate);
  const [viewYear, setViewYear] = useState(curY);
  const [viewMonth, setViewMonth] = useState(curM);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const grid = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;
    const cells = [];
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
    onSetGameDate(iso);
    onClose();
  };

  const events = calendarEvents || {};

  return (
    <div ref={ref} style={{
      position: 'absolute',
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '6px',
      width: '280px',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: '6px',
      zIndex: 1200,
      boxShadow: '0 8px 24px var(--shadow-dropdown)',
      padding: '12px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span onClick={prevMonth} style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px', padding: '2px 6px' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>◀</span>
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: "'Georgia', serif" }}>
          {MONTHS_IT_CAP[viewMonth]} {viewYear}
        </span>
        <span onClick={nextMonth} style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px', padding: '2px 6px' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>▶</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', marginBottom: '4px' }}>
        {DAYS_IT.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: '9px', color: 'var(--text-tertiary)',
            fontWeight: '600', textTransform: 'uppercase', padding: '2px 0'
          }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px' }}>
        {grid.map((day, i) => {
          if (day === null) return <div key={`pad-${i}`} />;
          const iso = toISO(viewYear, viewMonth, day);
          const isGameDay = iso === gameDate;
          const hasEvt = (events[iso] || []).length > 0;

          return (
            <div
              key={day}
              onClick={() => handleDayClick(day)}
              style={{
                textAlign: 'center',
                padding: '4px 0',
                cursor: 'pointer',
                borderRadius: '3px',
                fontSize: '12px',
                color: isGameDay ? 'var(--bg-main)' : 'var(--text-primary)',
                background: isGameDay ? 'var(--accent)' : 'transparent',
                fontWeight: isGameDay ? '700' : '400',
                transition: 'all 0.1s',
                position: 'relative'
              }}
              onMouseEnter={e => { if (!isGameDay) e.currentTarget.style.background = 'var(--border-default)'; }}
              onMouseLeave={e => { if (!isGameDay) e.currentTarget.style.background = 'transparent'; }}
            >
              {day}
              {hasEvt && (
                <div style={{
                  position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)',
                  width: '4px', height: '4px', borderRadius: '50%',
                  background: isGameDay ? 'var(--bg-main)' : 'var(--accent)'
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Timer ───
const DEFAULT_TIME = 180; // 3 minutes
const SET_TIMES = [60, 120, 180, 240, 300, 600, 900, 1800];
const ADD_TIMES = [60, 120, 180, 300, 600];

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 300, 600].forEach(delay => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      const t = ctx.currentTime + delay / 1000;
      osc.start(t);
      osc.stop(t + 0.1);
    });
  } catch {}
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function TimerWidget() {
  const [seconds, setSeconds] = useState(DEFAULT_TIME);
  const [running, setRunning] = useState(false);
  const [expired, setExpired] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const intervalRef = useRef(null);
  const dropdownRef = useRef(null);

  // Countdown
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          setRunning(false);
          setExpired(true);
          playBeep();
          setTimeout(() => setExpired(false), 5000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const setTime = useCallback((secs) => {
    setSeconds(secs);
    setRunning(false);
    setExpired(false);
  }, []);

  const addTime = useCallback((secs) => {
    setSeconds(prev => prev + secs);
  }, []);

  const handleStart = useCallback(() => {
    if (seconds <= 0) return;
    setExpired(false);
    setRunning(true);
    setDropdownOpen(false);
  }, [seconds]);

  const handlePause = useCallback(() => setRunning(false), []);

  const handleReset = useCallback(() => {
    setRunning(false);
    setExpired(false);
    setSeconds(DEFAULT_TIME);
  }, []);

  const timerColor = expired ? 'var(--color-danger-bright)' : running && seconds <= 30 ? 'var(--color-warning)' : running ? 'var(--text-bright)' : 'var(--text-secondary)';

  const ctrlBtn = (label, active, onClick, title) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: active ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: '12px',
        padding: '2px 4px', borderRadius: '3px', lineHeight: '1',
        transition: 'color 0.15s', flexShrink: 0
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-tertiary)'; }}
    >{label}</button>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', position: 'relative' }} ref={dropdownRef}>
      {/* Timer display */}
      <span
        onClick={() => setDropdownOpen(v => !v)}
        className={expired ? 'timer-expired' : ''}
        style={{
          fontSize: '12px', fontWeight: '700', fontFamily: 'monospace',
          color: timerColor, cursor: 'pointer', padding: '3px 6px',
          borderRadius: '3px', transition: 'color 0.3s', userSelect: 'none',
          border: '1px solid transparent'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
        title="Aggiungi tempo"
      >
        ⏱ {formatTime(seconds)}
      </span>

      {/* Control buttons */}
      {ctrlBtn('▶', running, handleStart, 'Via')}
      {ctrlBtn('⏸', !running && seconds < DEFAULT_TIME && seconds > 0, handlePause, 'Pausa')}
      {ctrlBtn('↺', false, handleReset, 'Reset')}

      {/* Dropdown */}
      {dropdownOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '6px',
          padding: '8px', zIndex: 1100, boxShadow: '0 8px 24px var(--shadow-dropdown)',
          width: '220px'
        }}>
          {/* SET section */}
          <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: '600' }}>
            Imposta
          </div>
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {SET_TIMES.map(t => (
              <button
                key={t}
                onClick={() => setTime(t)}
                style={{
                  background: seconds === t && !running ? 'var(--accent-a15)' : 'none',
                  border: '1px solid', borderColor: seconds === t && !running ? 'var(--accent)' : 'var(--border-default)',
                  borderRadius: '3px', padding: '3px 8px', color: 'var(--accent)', fontSize: '11px',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', fontWeight: '600'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-a12)'; }}
                onMouseLeave={e => {
                  const isActive = seconds === t && !running;
                  e.currentTarget.style.borderColor = isActive ? 'var(--accent)' : 'var(--border-default)';
                  e.currentTarget.style.background = isActive ? 'var(--accent-a15)' : 'none';
                }}
              >
                {t >= 60 ? `${t / 60}m` : `${t}s`}
              </button>
            ))}
          </div>

          {/* ADD section */}
          <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: '600' }}>
            Aggiungi
          </div>
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            {ADD_TIMES.map(t => (
              <button
                key={t}
                onClick={() => addTime(t)}
                style={{
                  background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
                  padding: '3px 8px', color: 'var(--text-secondary)', fontSize: '11px',
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                +{t >= 60 ? `${t / 60}m` : `${t}s`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const Separator = () => (
  <div style={{ width: '1px', background: 'var(--border-default)', height: '18px', flexShrink: 0, margin: '0 4px' }} />
);

export default function TopMenu({
  onChangeProject, onOpenInfo, onOpenSettings, onOpenCalendar, onOpenNotes, onOpenChecklist,
  gameDate, onPrevDay, onNextDay, onSetGameDate, hasEvents,
  players, onOpenCharacterSheet, calendarEvents, botRunning,
  chatMessages, chatOpen, chatFlash, onToggleChat,
  onOpenReference, referenceOpen,
  highlightEnabled, onToggleHighlight
}) {
  const connectedPlayers = (players || []).filter(p => p.telegramChatId).length;

  // Compute total unread
  const totalUnread = useMemo(() => {
    let count = 0;
    for (const msgs of Object.values(chatMessages || {})) {
      count += (msgs || []).filter(m => m.from === 'player' && !m.read).length;
    }
    return count;
  }, [chatMessages]);
  const [pgOpen, setPgOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const pgRef = useRef(null);

  useEffect(() => {
    if (!pgOpen) return;
    const handler = (e) => {
      if (pgRef.current && !pgRef.current.contains(e.target)) setPgOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pgOpen]);

  return (
    <div
      style={{
        height: '40px',
        background: 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-panel) 100%)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        flexShrink: 0,
        WebkitAppRegion: 'drag',
        gap: '0'
      }}
    >
      {/* Title */}
      <span style={{
        fontSize: '15px',
        fontWeight: '600',
        color: 'var(--accent)',
        letterSpacing: '2px',
        fontFamily: "'Georgia', serif",
        flexShrink: 0,
        marginRight: '8px'
      }}>
        限界 GM DASHBOARD
      </span>

      <div style={{ display: 'flex', alignItems: 'center', flex: 1, WebkitAppRegion: 'no-drag', gap: '0' }}>
        <Separator />

        {/* Date nav: ◀ */}
        {gameDate && <DateNavButton label="◀" onClick={onPrevDay} />}

        {/* Date text + picker dropdown */}
        {gameDate && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span
              onClick={() => setDatePickerOpen(v => !v)}
              style={{
                fontSize: '12px', color: datePickerOpen ? 'var(--accent)' : 'var(--text-primary)',
                letterSpacing: '0.5px', minWidth: '130px', textAlign: 'center',
                fontFamily: "'Georgia', serif",
                cursor: 'pointer',
                borderRadius: '3px',
                padding: '2px 4px',
                transition: 'color 0.2s',
                display: 'inline-block'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => { if (!datePickerOpen) e.currentTarget.style.color = 'var(--text-primary)'; }}
            >
              {formatDateIT(gameDate)}
            </span>
            {datePickerOpen && (
              <DatePickerDropdown
                gameDate={gameDate}
                onSetGameDate={onSetGameDate}
                calendarEvents={calendarEvents}
                onClose={() => setDatePickerOpen(false)}
              />
            )}
          </div>
        )}

        {/* Date nav: ▶ */}
        {gameDate && <DateNavButton label="▶" onClick={onNextDay} />}

        {/* Bell for events */}
        {gameDate && hasEvents && (
          <span key={gameDate} style={{ fontSize: '13px', pointerEvents: 'none', flexShrink: 0 }} className="bell-pulse">🔔</span>
        )}

        {/* Calendar button */}
        <BarButton icon="📅" tooltip="Calendario" onClick={onOpenCalendar} />

        {/* Timer */}
        <TimerWidget />

        <Separator />

        {/* PG Menu */}
        <div ref={pgRef} style={{ position: 'relative' }}>
          <BarButton icon="👥" label="PG" onClick={() => setPgOpen(v => !v)} active={pgOpen} hasDropdown />

          {pgOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              width: '300px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              zIndex: 1100,
              boxShadow: '0 8px 24px var(--shadow-dropdown)',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {(!players || players.length === 0) ? (
                <div style={{ padding: '16px', color: 'var(--text-tertiary)', fontSize: '12px', textAlign: 'center' }}>
                  Nessun PG — vai in ⚙️ Impostazioni
                </div>
              ) : (
                players.map(pg => (
                  <div
                    key={pg.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px', fontWeight: '600', color: 'var(--accent)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        {botRunning && <span style={{ fontSize: '6px' }}>{pg.telegramChatId ? '🟢' : '⚪'}</span>}
                        {pg.characterName || 'Senza nome'}
                      </div>
                      {pg.playerName && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          giocato da {pg.playerName}
                        </div>
                      )}
                      {pg.note && (
                        <div style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '2px' }}>
                          {pg.note}
                        </div>
                      )}
                    </div>
                    {pg.characterSheet && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenCharacterSheet) onOpenCharacterSheet(pg);
                          setPgOpen(false);
                        }}
                        title="Apri scheda"
                        style={{
                          cursor: 'pointer',
                          fontSize: '16px',
                          flexShrink: 0,
                          marginTop: '2px',
                          opacity: 0.7,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                      >
                        📄
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <span data-notes-toggle>
          <BarButton icon="📝" label="Note" onClick={onOpenNotes} />
        </span>

        {/* Checklist */}
        <span data-checklist-toggle>
          <BarButton icon="☐" label="Checklist" onClick={onOpenChecklist} />
        </span>

        {/* Highlight keywords toggle */}
        <BarButton icon="🔆" tooltip={highlightEnabled ? 'Evidenziazione parole (ON)' : 'Evidenziazione parole (OFF)'} onClick={onToggleHighlight} active={highlightEnabled} />

        {/* Reference manuals */}
        <BarButton icon="📖" tooltip="Manuali di riferimento" onClick={onOpenReference} active={referenceOpen} />

        <Separator />

        {/* Settings (icon only) */}
        <BarButton icon="⚙️" tooltip="Impostazioni" onClick={onOpenSettings} />
        {botRunning && (
          <span title={connectedPlayers > 0 ? `${connectedPlayers} giocatori connessi` : 'Bot attivo, nessun giocatore'} style={{ fontSize: '8px', marginLeft: '-4px', marginRight: '2px' }}>
            {connectedPlayers > 0 ? '🟢' : '🟡'}
          </span>
        )}

        {/* Chat button */}
        <span data-chat-toggle style={{ position: 'relative', display: 'inline-flex' }}>
          <BarButton
            icon="💬"
            tooltip="Chat Telegram"
            onClick={onToggleChat}
            active={chatOpen}
          />
          {totalUnread > 0 && (
            <span style={{
              position: 'absolute', top: '0', right: '0',
              background: 'var(--color-danger)', color: '#fff', fontSize: '9px', fontWeight: '700',
              borderRadius: '8px', padding: '0 4px', lineHeight: '14px', minWidth: '14px',
              textAlign: 'center', pointerEvents: 'none',
              animation: chatFlash ? 'chatFlash 1s ease' : 'none'
            }}>
              {totalUnread}
            </span>
          )}
          {chatFlash && totalUnread === 0 && (
            <span style={{
              position: 'absolute', inset: 0,
              borderRadius: '4px',
              animation: 'chatFlash 1s ease',
              pointerEvents: 'none'
            }} />
          )}
        </span>

        {/* Info */}
        <BarButton icon="ℹ️" tooltip="Informazioni" onClick={onOpenInfo} />

        {/* Change project (icon only) */}
        <BarButton icon="📂" tooltip="Cambia progetto" onClick={onChangeProject} />
      </div>

      {/* Window controls */}
      <div style={{ display: 'flex', WebkitAppRegion: 'no-drag', marginLeft: '8px' }}>
        <Separator />
        <WindowButton icon="─" onClick={() => window.electronAPI?.windowMinimize()} />
        <WindowButton icon="□" onClick={() => window.electronAPI?.windowMaximize()} />
        <WindowButton icon="✕" onClick={() => window.electronAPI?.windowClose()} isClose />
      </div>
    </div>
  );
}

function DateNavButton({ label, onClick }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        fontSize: '11px',
        padding: '4px 6px',
        borderRadius: '3px',
        userSelect: 'none',
        transition: 'color 0.2s',
        position: 'relative',
        zIndex: 2,
        lineHeight: '1',
        flexShrink: 0
      }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
    >
      {label}
    </button>
  );
}

function BarButton({ icon, label, onClick, disabled, tooltip, active, hasDropdown }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={tooltip || undefined}
      style={{
        background: 'none',
        border: '1px solid transparent',
        borderRadius: '4px',
        padding: '4px 8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--text-disabled)' : active ? 'var(--accent)' : 'var(--text-primary)',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s',
        flexShrink: 0
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = 'var(--border-default)'; }}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
    >
      <span style={{ fontSize: '13px', lineHeight: '1' }}>{icon}</span>
      {label && <span style={{ fontSize: '11px' }}>{label}</span>}
      {hasDropdown && <span style={{ fontSize: '8px', color: 'var(--text-tertiary)' }}>▼</span>}
    </button>
  );
}

function WindowButton({ icon, onClick, isClose }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        width: '32px',
        height: '28px',
        cursor: 'pointer',
        color: 'var(--text-secondary)',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '3px',
        transition: 'all 0.2s'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = isClose ? 'var(--color-danger-bg)' : 'var(--border-default)';
        e.currentTarget.style.color = isClose ? 'var(--color-danger-bright)' : 'var(--text-primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      {icon}
    </button>
  );
}
