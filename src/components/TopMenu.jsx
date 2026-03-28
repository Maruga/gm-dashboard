import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Bell, Calendar,
  Timer, Play, Pause, RotateCcw,
  Users, StickyNote, CheckSquare, Highlighter, Network, MessageCircle, MessageCircleWarning, FileText,
  BookOpen, Monitor, Eye, Search, UserCircle,
  Info, Settings, Globe, FolderOpen, FolderRoot,
  Minus, Square, X, LayoutGrid
} from 'lucide-react';

const ICON_SIZE = 16;

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
const DEFAULT_TIME = 180;
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
  } catch (e) { console.warn('Dice audio failed:', e.message); }
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

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative', WebkitAppRegion: 'no-drag' }} ref={dropdownRef}>
      <span
        onClick={() => setDropdownOpen(v => !v)}
        className={expired ? 'timer-expired' : ''}
        style={{
          fontSize: '12px', fontWeight: '700', fontFamily: 'monospace',
          color: timerColor, cursor: 'pointer', padding: '4px 6px',
          borderRadius: '4px', transition: 'color 0.3s', userSelect: 'none'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover-subtle)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        title="Aggiungi tempo"
      >
        {formatTime(seconds)}
      </span>

      <IconBtn Icon={Play} tooltip="Via" onClick={handleStart} active={running} size={14} />
      <IconBtn Icon={Pause} tooltip="Pausa" onClick={handlePause} size={14} />
      <IconBtn Icon={RotateCcw} tooltip="Reset" onClick={handleReset} size={14} />

      {dropdownOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: '4px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '6px',
          padding: '8px', zIndex: 1100, boxShadow: '0 8px 24px var(--shadow-dropdown)',
          width: '220px'
        }}>
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

// ─── Shared components ───

const Separator = () => (
  <div style={{ width: '1px', background: 'var(--border-default)', height: '18px', flexShrink: 0, margin: '0 8px' }} />
);

function IconBtn({ Icon, tooltip, onClick, active, disabled, size, children, colorOverride }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={tooltip}
      style={{
        background: 'none',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: colorOverride || (disabled ? 'var(--text-disabled)' : active ? 'var(--accent)' : 'var(--text-primary)'),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
        flexShrink: 0,
        position: 'relative',
        WebkitAppRegion: 'no-drag'
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--bg-hover-subtle)'; }}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <Icon size={size || ICON_SIZE} />
      {children}
    </button>
  );
}

function WindowButton({ Icon, onClick, isClose }) {
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '3px',
        transition: 'all 0.2s',
        WebkitAppRegion: 'no-drag'
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
      <Icon size={14} />
    </button>
  );
}

// ─── Relations dropdown ───

function RelationsDropdown({ relationsBase, onClose, onOpenOverlay, onOpenViewer, onOpenStage }) {
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const pngList = useMemo(() => {
    return Object.keys(relationsBase).sort((a, b) => a.localeCompare(b, 'it'));
  }, [relationsBase]);

  const filtered = useMemo(() => {
    if (!search.trim()) return pngList;
    const q = search.toLowerCase();
    return pngList.filter(n => n.toLowerCase().includes(q));
  }, [pngList, search]);

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', left: 0, marginTop: '4px',
      width: '320px', background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)', borderRadius: '6px',
      zIndex: 1100, boxShadow: '0 8px 24px var(--shadow-dropdown)',
      display: 'flex', flexDirection: 'column', maxHeight: '420px'
    }}>
      {/* Gestione relazioni link */}
      <div
        onClick={() => { onClose(); onOpenOverlay(); }}
        style={{
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px',
          cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)',
          color: 'var(--accent)', fontSize: '12px', fontWeight: '600', flexShrink: 0
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <Settings size={14} />
        Gestione relazioni
      </div>

      {/* Search */}
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0
      }}>
        <Search size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Cerca PNG..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          style={{
            flex: 1, background: 'none', border: 'none',
            fontSize: '12px', color: 'var(--text-primary)',
            outline: 'none', fontFamily: 'inherit'
          }}
        />
      </div>

      {/* PNG list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{
            padding: '16px', textAlign: 'center', fontSize: '12px',
            color: 'var(--text-disabled)', fontStyle: 'italic'
          }}>
            Nessun risultato
          </div>
        ) : (
          filtered.map(name => (
            <div
              key={name}
              style={{
                padding: '7px 14px', display: 'flex', alignItems: 'center',
                borderBottom: '1px solid var(--border-subtle)', gap: '8px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                flex: 1, fontSize: '12px', color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {name}
              </span>
              <span
                onClick={() => { onClose(); onOpenViewer(name); }}
                style={{ cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 4px', borderRadius: '3px', fontSize: '10px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                title="Apri nel Viewer"
              >
                <BookOpen size={12} />
                Viewer
              </span>
              <span
                onClick={() => { onClose(); onOpenStage(name); }}
                style={{ cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 4px', borderRadius: '3px', fontSize: '10px' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                title="Apri nello Stage"
              >
                <Monitor size={12} />
                Stage
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Auth Dropdown ───

function AuthDropdown({ firebaseUser, onFirebaseUserChange, onClose }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Auto-reset "Sicuro?" after 3 seconds
  useEffect(() => {
    if (!confirmLogout) return;
    const t = setTimeout(() => setConfirmLogout(false), 3000);
    return () => clearTimeout(t);
  }, [confirmLogout]);

  const inputStyle = {
    width: '100%', padding: '6px 10px',
    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
    borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    if (mode === 'forgot') {
      if (!email) { setError('Inserisci la tua email'); return; }
      setLoading(true);
      const result = await window.electronAPI.firebaseResetPassword(email);
      setLoading(false);
      if (result.error) setError(result.error);
      else setSuccess('Email inviata! Controlla la posta.');
      return;
    }
    if (mode === 'register') {
      if (!email || !password || !displayName) { setError('Compila tutti i campi'); return; }
      if (password !== confirmPassword) { setError('Le password non corrispondono'); return; }
      if (password.length < 6) { setError('Almeno 6 caratteri'); return; }
    } else {
      if (!email || !password) { setError('Compila email e password'); return; }
    }
    setLoading(true);
    let result;
    if (mode === 'register') {
      result = await window.electronAPI.firebaseRegister(email, password, displayName);
    } else {
      result = await window.electronAPI.firebaseLogin(email, password);
    }
    setLoading(false);
    if (result.error) setError(result.error);
    else { onFirebaseUserChange(result); onClose(); }
  };

  const handleLogout = async () => {
    if (!confirmLogout) { setConfirmLogout(true); return; }
    await window.electronAPI.firebaseLogout();
    onFirebaseUserChange(null);
    setConfirmLogout(false);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  // Logged-in view
  if (firebaseUser) {
    return (
      <div ref={ref} style={{
        position: 'absolute', top: '100%', right: 0, marginTop: '4px',
        width: '240px', background: 'var(--bg-elevated)',
        border: '1px solid var(--border-default)', borderRadius: '6px',
        zIndex: 1200, boxShadow: '0 8px 24px var(--shadow-dropdown)',
        padding: '12px'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {firebaseUser.displayName || firebaseUser.email}
        </div>
        {firebaseUser.displayName && (
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {firebaseUser.email}
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '6px', background: 'none',
            border: '1px solid', borderColor: confirmLogout ? 'var(--color-danger)' : 'var(--border-default)',
            borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
            color: confirmLogout ? 'var(--color-danger)' : 'var(--text-secondary)',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => { if (!confirmLogout) e.currentTarget.style.borderColor = 'var(--color-danger)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
          onMouseLeave={e => { if (!confirmLogout) { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
        >
          {confirmLogout ? 'Sicuro?' : 'Esci'}
        </button>
      </div>
    );
  }

  // Logged-out view (login / register / forgot)
  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', right: 0, marginTop: '4px',
      width: '280px', background: 'var(--bg-elevated)',
      border: '1px solid var(--border-default)', borderRadius: '6px',
      zIndex: 1200, boxShadow: '0 8px 24px var(--shadow-dropdown)',
      padding: '14px'
    }}>
      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '10px' }}>
        {mode === 'login' ? 'Accedi' : mode === 'register' ? 'Registrati' : 'Recupera password'}
      </div>

      {mode === 'register' && (
        <div style={{ marginBottom: '8px' }}>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nome autore" style={inputStyle} onKeyDown={handleKeyDown} />
        </div>
      )}
      <div style={{ marginBottom: '8px' }}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={inputStyle} onKeyDown={handleKeyDown} autoFocus />
      </div>
      {mode !== 'forgot' && (
        <div style={{ marginBottom: '8px' }}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" style={inputStyle} onKeyDown={handleKeyDown} />
        </div>
      )}
      {mode === 'register' && (
        <div style={{ marginBottom: '8px' }}>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Conferma password" style={inputStyle} onKeyDown={handleKeyDown} />
        </div>
      )}

      {error && <div style={{ fontSize: '11px', color: 'var(--color-danger)', marginBottom: '8px' }}>{error}</div>}
      {success && <div style={{ fontSize: '11px', color: 'var(--color-success)', marginBottom: '8px' }}>{success}</div>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: '100%', padding: '7px', background: 'none',
          border: '1px solid var(--accent)', borderRadius: '4px',
          color: loading ? 'var(--text-disabled)' : 'var(--accent)',
          fontSize: '12px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s', marginBottom: '10px'
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--accent-a10)'; }}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        {loading ? 'Attendere...' : mode === 'login' ? 'Accedi' : mode === 'register' ? 'Crea account' : 'Invia link'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
        {mode === 'login' && (
          <>
            <span onClick={() => { setMode('register'); setError(null); setSuccess(null); }} style={{ fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }}>
              Non hai un account? Registrati
            </span>
            <span onClick={() => { setMode('forgot'); setError(null); setSuccess(null); }} style={{ fontSize: '11px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
              Password dimenticata?
            </span>
          </>
        )}
        {mode === 'register' && (
          <span onClick={() => { setMode('login'); setError(null); setSuccess(null); }} style={{ fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }}>
            Hai già un account? Accedi
          </span>
        )}
        {mode === 'forgot' && (
          <span onClick={() => { setMode('login'); setError(null); setSuccess(null); }} style={{ fontSize: '11px', color: 'var(--accent)', cursor: 'pointer' }}>
            Torna al login
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───

function TopMenu({
  onChangeProject, onOpenInfo, onOpenSettings, onOpenCalendar, onOpenNotes, onOpenChecklist,
  onOpenAdventures, onOpenProjectFolder, onOpenRelationsOverlay, onOpenAiDocs,
  relationsHasFile, relationsBase,
  onOpenRelationsViewer, onOpenRelationsStage,
  gameDate, onPrevDay, onNextDay, onSetGameDate, hasEvents,
  players, onOpenCharacterSheet, calendarEvents, botRunning,
  chatMessages, chatOpen, chatFlash, gmPrivateAlert, onClearGmPrivateAlert, onToggleChat,
  onOpenReference, referenceOpen,
  highlightEnabled, onToggleHighlight,
  firebaseUser, onFirebaseUserChange,
  panelVisibility, layoutPresets, onApplyPreset, onResetLayout
}) {
  const connectedPlayers = (players || []).filter(p => p.telegramChatId).length;

  const totalUnread = useMemo(() => {
    let count = 0;
    for (const msgs of Object.values(chatMessages || {})) {
      count += (msgs || []).filter(m => m.from === 'player' && !m.read).length;
    }
    return count;
  }, [chatMessages]);

  const [pgOpen, setPgOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [relDropdownOpen, setRelDropdownOpen] = useState(false);
  const [authDropdownOpen, setAuthDropdownOpen] = useState(false);
  const [layoutOpen, setLayoutOpen] = useState(false);
  const pgRef = useRef(null);
  const relRef = useRef(null);
  const authRef = useRef(null);
  const layoutRef = useRef(null);

  useEffect(() => {
    if (!pgOpen) return;
    const handler = (e) => {
      if (pgRef.current && !pgRef.current.contains(e.target)) setPgOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pgOpen]);

  useEffect(() => {
    if (!layoutOpen) return;
    const handler = (e) => {
      if (layoutRef.current && !layoutRef.current.contains(e.target)) setLayoutOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [layoutOpen]);

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
      {/* ── Gruppo 1: TITOLO ── */}
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

      <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '0' }}>

        {/* ── Gruppo 2: TEMPO ── */}
        <Separator />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {gameDate && (
            <IconBtn Icon={ChevronLeft} tooltip="Giorno precedente" onClick={onPrevDay} size={14} />
          )}

          {gameDate && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <span
                onClick={() => setDatePickerOpen(v => !v)}
                style={{
                  fontSize: '12px', color: datePickerOpen ? 'var(--accent)' : 'var(--text-primary)',
                  letterSpacing: '0.5px', minWidth: '130px', textAlign: 'center',
                  fontFamily: "'Georgia', serif",
                  cursor: 'pointer',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  transition: 'all 0.15s',
                  display: 'inline-block',
                  WebkitAppRegion: 'no-drag'
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-hover-subtle)'; }}
                onMouseLeave={e => { if (!datePickerOpen) { e.currentTarget.style.color = 'var(--text-primary)'; } e.currentTarget.style.background = 'transparent'; }}
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

          {gameDate && (
            <IconBtn Icon={ChevronRight} tooltip="Giorno successivo" onClick={onNextDay} size={14} />
          )}

          {gameDate && hasEvents && (
            <span key={gameDate} style={{ display: 'flex', alignItems: 'center', pointerEvents: 'none', flexShrink: 0, color: 'var(--accent)' }} className="bell-pulse">
              <Bell size={14} />
            </span>
          )}

          <IconBtn Icon={Calendar} tooltip="Calendario" onClick={onOpenCalendar} />
        </div>

        {/* ── Gruppo 3: TIMER ── */}
        <Separator />
        <TimerWidget />

        {/* ── Gruppo 4: SESSIONE ── */}
        <Separator />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* PG Menu */}
          <div ref={pgRef} style={{ position: 'relative' }}>
            <IconBtn Icon={Users} tooltip="Personaggi giocanti" onClick={() => setPgOpen(v => !v)} active={pgOpen} />

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
                    Nessun PG — vai in Impostazioni
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

          {/* AI Docs */}
          <IconBtn Icon={FileText} tooltip="Documenti AI" onClick={onOpenAiDocs} />

          {/* Notes */}
          <span data-notes-toggle>
            <IconBtn Icon={StickyNote} tooltip="Note" onClick={onOpenNotes} />
          </span>

          {/* Checklist */}
          <span data-checklist-toggle>
            <IconBtn Icon={CheckSquare} tooltip="Checklist" onClick={onOpenChecklist} />
          </span>

          {/* Highlight keywords toggle */}
          <IconBtn Icon={Highlighter} tooltip={highlightEnabled ? 'Evidenziazione parole (ON)' : 'Evidenziazione parole (OFF)'} onClick={onToggleHighlight} active={highlightEnabled} />

          {/* Relations */}
          <div ref={relRef} style={{ position: 'relative' }}>
            <IconBtn
              Icon={Network}
              tooltip="Relazioni PNG"
              onClick={() => {
                if (relationsHasFile) setRelDropdownOpen(v => !v);
                else onOpenRelationsOverlay();
              }}
              active={relDropdownOpen}
            />
            {relDropdownOpen && (
              <RelationsDropdown
                relationsBase={relationsBase}
                onClose={() => setRelDropdownOpen(false)}
                onOpenOverlay={onOpenRelationsOverlay}
                onOpenViewer={onOpenRelationsViewer}
                onOpenStage={onOpenRelationsStage}
              />
            )}
          </div>

          {/* Chat with unread badge + bot status dot */}
          <span data-chat-toggle style={{
            position: 'relative', display: 'inline-flex', WebkitAppRegion: 'no-drag',
            ...(gmPrivateAlert ? { animation: 'gmPrivatePulse 1.5s ease-in-out infinite' } : {})
          }}>
            <IconBtn
              Icon={gmPrivateAlert ? MessageCircleWarning : MessageCircle}
              tooltip={gmPrivateAlert ? 'Messaggio privato da un giocatore!' : 'Chat Telegram'}
              onClick={() => { onToggleChat(); if (gmPrivateAlert) onClearGmPrivateAlert(); }}
              active={gmPrivateAlert ? false : chatOpen}
              colorOverride={gmPrivateAlert ? 'var(--color-warning)' : undefined}
            />
            {/* Unread badge */}
            {totalUnread > 0 && (
              <span style={{
                position: 'absolute', top: '0', right: '0',
                background: 'var(--color-danger)', color: '#fff', fontSize: '8px', fontWeight: '700',
                borderRadius: '7px', padding: '0 3px', lineHeight: '14px', minWidth: '14px', height: '14px',
                textAlign: 'center', pointerEvents: 'none',
                animation: chatFlash ? 'chatFlash 1s ease' : 'none'
              }}>
                {totalUnread}
              </span>
            )}
            {/* Bot status dot */}
            {botRunning && totalUnread === 0 && (
              <span style={{
                position: 'absolute', bottom: '2px', right: '2px',
                width: '6px', height: '6px', borderRadius: '50%',
                background: connectedPlayers > 0 ? 'var(--color-success)' : 'var(--color-warning)',
                pointerEvents: 'none'
              }}
                title={connectedPlayers > 0 ? `${connectedPlayers} giocatori connessi` : 'Bot attivo, nessun giocatore'}
              />
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
        </div>

        {/* ── Gruppo 5: RIFERIMENTO ── */}
        <Separator />
        <IconBtn Icon={BookOpen} tooltip="Manuali di riferimento" onClick={onOpenReference} active={referenceOpen} />

        {/* ── Gruppo: LAYOUT ── */}
        <Separator />
        <div ref={layoutRef} style={{ position: 'relative' }}>
          <IconBtn Icon={LayoutGrid} tooltip="Layout pannelli" onClick={() => setLayoutOpen(v => !v)} active={layoutOpen} />
          {layoutOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '4px',
              minWidth: '180px', background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)', borderRadius: '6px',
              zIndex: 1100, boxShadow: '0 8px 24px var(--shadow-dropdown)',
              padding: '4px 0'
            }}>
              <div
                onClick={() => { onResetLayout(); setLayoutOpen(false); }}
                style={{
                  padding: '7px 14px', cursor: 'pointer', fontSize: '12px',
                  color: Object.values(panelVisibility).every(v => v) ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: Object.values(panelVisibility).every(v => v) ? '600' : '400',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                ▣ Principale
              </div>
              {layoutPresets.length > 0 && <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />}
              {layoutPresets.map(preset => (
                <div
                  key={preset.name}
                  onClick={() => { onApplyPreset(preset); setLayoutOpen(false); }}
                  style={{
                    padding: '7px 14px', cursor: 'pointer', fontSize: '12px',
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--border-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {preset.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Gruppo 6: SISTEMA ── */}
        <Separator />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* User auth icon */}
          <div ref={authRef} style={{ position: 'relative' }}>
            <IconBtn
              Icon={UserCircle}
              tooltip={firebaseUser ? (firebaseUser.displayName || firebaseUser.email) : 'Accedi'}
              onClick={() => setAuthDropdownOpen(v => !v)}
              active={!!firebaseUser || authDropdownOpen}
            />
            {authDropdownOpen && (
              <AuthDropdown
                firebaseUser={firebaseUser}
                onFirebaseUserChange={onFirebaseUserChange}
                onClose={() => setAuthDropdownOpen(false)}
              />
            )}
          </div>
          <IconBtn Icon={Info} tooltip="Informazioni" onClick={onOpenInfo} />
          <IconBtn Icon={Settings} tooltip="Impostazioni" onClick={onOpenSettings} />
          <IconBtn Icon={Globe} tooltip="Avventure online" onClick={onOpenAdventures} />
          <IconBtn Icon={FolderRoot} tooltip="Apri cartella avventura" onClick={onOpenProjectFolder} />
          <IconBtn Icon={FolderOpen} tooltip="Cambia progetto" onClick={onChangeProject} />
        </div>
      </div>

      {/* ── Gruppo 7: FINESTRA ── */}
      <div style={{ display: 'flex', marginLeft: '8px' }}>
        <Separator />
        <WindowButton Icon={Minus} onClick={() => window.electronAPI?.windowMinimize()} />
        <WindowButton Icon={Square} onClick={() => window.electronAPI?.windowMaximize()} />
        <WindowButton Icon={X} onClick={() => window.electronAPI?.windowClose()} isClose />
      </div>
    </div>
  );
}

export default React.memo(TopMenu);
