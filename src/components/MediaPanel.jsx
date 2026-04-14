import React, { useState, useRef, useCallback, useEffect } from 'react';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function formatTime(secs) {
  if (!secs || !isFinite(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Audio Track ───
function AudioTrack({ item, onRemove, onUpdate, globalMute, stopTrigger, onContextMenu }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentSeek, setCurrentSeek] = useState(0);
  const howlRef = useRef(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);
  const prevStopRef = useRef(stopTrigger);

  const volume = item.volume ?? 0.7;
  const loop = item.loop !== false;
  const rate = item.rate || 1;

  // Create Howl on mount
  useEffect(() => {
    mountedRef.current = true;
    let howl = null;
    import('howler').then(({ Howl }) => {
      if (!mountedRef.current) return;
      howl = new Howl({
        src: [item.url],
        volume: volume,
        loop: loop,
        rate: rate,
        onload: () => {
          if (!mountedRef.current) return;
          setDuration(howl.duration());
          if (item.autoPlay) {
            howl.play();
            setPlaying(true);
          }
        },
        onend: () => {
          if (!loop && mountedRef.current) {
            setPlaying(false);
            setCurrentSeek(0);
            clearInterval(intervalRef.current);
          }
        }
      });
      howlRef.current = howl;
    });
    return () => {
      mountedRef.current = false;
      clearInterval(intervalRef.current);
      if (howl) {
        try { howl.unload(); } catch (_) { /* già scaricato */ }
      }
      howlRef.current = null;
    };
  }, [item.url]);

  // Update volume / mute
  useEffect(() => {
    if (howlRef.current) howlRef.current.volume(globalMute ? 0 : volume);
  }, [volume, globalMute]);

  // Update loop
  useEffect(() => {
    if (howlRef.current) howlRef.current.loop(loop);
  }, [loop]);

  // Update rate
  useEffect(() => {
    if (howlRef.current) howlRef.current.rate(rate);
  }, [rate]);

  // Stop all trigger
  useEffect(() => {
    if (stopTrigger !== prevStopRef.current) {
      prevStopRef.current = stopTrigger;
      if (howlRef.current) {
        howlRef.current.stop();
        setPlaying(false);
        setCurrentSeek(0);
        clearInterval(intervalRef.current);
      }
    }
  }, [stopTrigger]);

  // Progress interval
  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        if (mountedRef.current && howlRef.current && howlRef.current.playing()) {
          setCurrentSeek(howlRef.current.seek());
        }
      }, 500);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing]);

  const togglePlay = useCallback(() => {
    if (!howlRef.current || howlRef.current.state() === 'unloaded') return;
    if (howlRef.current.playing()) {
      howlRef.current.pause();
      setPlaying(false);
    } else {
      howlRef.current.play();
      setPlaying(true);
    }
  }, []);

  const skipBack = useCallback(() => {
    if (!howlRef.current || howlRef.current.state() === 'unloaded') return;
    const pos = Math.max(0, (howlRef.current.seek() || 0) - 10);
    howlRef.current.seek(pos);
    setCurrentSeek(pos);
  }, []);

  const skipForward = useCallback(() => {
    if (!howlRef.current || howlRef.current.state() === 'unloaded') return;
    const dur = howlRef.current.duration();
    const pos = Math.min(dur, (howlRef.current.seek() || 0) + 10);
    howlRef.current.seek(pos);
    setCurrentSeek(pos);
  }, []);

  const toggleLoop = useCallback(() => {
    onUpdate(item.id, { loop: !loop });
  }, [item.id, loop, onUpdate]);

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(rate);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    onUpdate(item.id, { rate: next });
  }, [item.id, rate, onUpdate]);

  const handleVolumeChange = useCallback((e) => {
    const v = parseFloat(e.target.value);
    onUpdate(item.id, { volume: v });
  }, [item.id, onUpdate]);

  const handleSeekClick = useCallback((e) => {
    if (!howlRef.current || howlRef.current.state() === 'unloaded' || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const pos = pct * duration;
    howlRef.current.seek(pos);
    setCurrentSeek(pos);
  }, [duration]);

  const progress = duration > 0 ? (currentSeek / duration) * 100 : 0;

  const Btn = ({ label, onClick, title, active, highlight }) => (
    <button onClick={onClick} title={title} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: highlight ? 'var(--accent)' : active ? 'var(--text-bright)' : 'var(--text-tertiary)',
      fontSize: '14px', padding: '2px 5px', borderRadius: '2px',
      transition: 'color 0.15s', lineHeight: '1', flexShrink: 0
    }}
    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
    onMouseLeave={e => e.currentTarget.style.color = highlight ? 'var(--accent)' : active ? 'var(--text-bright)' : 'var(--text-tertiary)'}
    >{label}</button>
  );

  return (
    <div onContextMenu={onContextMenu} style={{
      padding: '6px 10px', borderBottom: '1px solid var(--bg-panel)',
      background: playing ? 'var(--accent-a04)' : 'transparent'
    }}>
      {/* Row 1: name + remove */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', flexShrink: 0 }}>🎵</span>
        <span style={{
          flex: 1, fontSize: '11px', color: 'var(--text-primary)', fontWeight: '600',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{item.name}</span>
        <span className="close-btn" onClick={onRemove} title="Rimuovi" style={{ fontSize: '12px' }}>✕</span>
      </div>

      {/* Row 2: controls + volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '3px' }}>
        <Btn label="⏮" onClick={skipBack} title="-10s" />
        <Btn label={playing ? '⏸' : '▶'} onClick={togglePlay} title={playing ? 'Pausa' : 'Play'} active={playing} />
        <Btn label="⏭" onClick={skipForward} title="+10s" />
        <Btn label={loop ? '🔁' : '1️⃣'} onClick={toggleLoop} title={loop ? 'Loop attivo' : 'Singolo'} highlight={loop} />
        <Btn label={`${rate}x`} onClick={cycleSpeed} title="Velocità" highlight={rate !== 1} />
        <div style={{ flex: 1 }} />
        <input type="range" min="0" max="1" step="0.01" value={volume}
          onChange={handleVolumeChange}
          style={{ width: '70px', accentColor: 'var(--accent)', cursor: 'pointer' }}
        />
      </div>

      {/* Row 3: progress bar + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div onClick={handleSeekClick} style={{
          flex: 1, height: '4px', background: 'var(--border-subtle)', borderRadius: '2px',
          cursor: 'pointer', position: 'relative'
        }}>
          <div style={{
            width: `${progress}%`, height: '100%',
            background: playing ? 'var(--accent)' : 'var(--text-tertiary)', borderRadius: '2px',
            transition: 'width 0.4s linear'
          }} />
        </div>
        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', flexShrink: 0, fontFamily: 'monospace' }}>
          {formatTime(currentSeek)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}

// ─── Image Item ───
function ImageItem({ item, onRemove, onImageClick, onContextMenu }) {
  return (
    <div onContextMenu={onContextMenu} style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 10px', borderBottom: '1px solid var(--bg-panel)'
    }}>
      <span style={{ fontSize: '11px', flexShrink: 0 }}>🖼️</span>
      <img
        src={item.url}
        onClick={() => onImageClick(item.url)}
        style={{
          maxHeight: '60px', maxWidth: '80px', objectFit: 'contain',
          borderRadius: '3px', cursor: 'pointer', flexShrink: 0,
          border: '1px solid var(--border-subtle)'
        }}
      />
      <span
        onClick={() => onImageClick(item.url)}
        style={{
          flex: 1, fontSize: '11px', color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          cursor: 'pointer'
        }}
      >{item.name}</span>
      <span className="close-btn" onClick={onRemove} title="Rimuovi" style={{ fontSize: '12px' }}>✕</span>
    </div>
  );
}

// ─── Video Item ───
function VideoItem({ item, onRemove, onVideoClick, onContextMenu }) {
  return (
    <div onContextMenu={onContextMenu} style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 10px', borderBottom: '1px solid var(--bg-panel)'
    }}>
      <span style={{ fontSize: '11px', flexShrink: 0 }}>🎬</span>
      <span style={{
        flex: 1, fontSize: '11px', color: 'var(--text-primary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
      }}>{item.name}</span>
      <button onClick={() => onVideoClick(item.url)} title="Riproduci" style={{
        background: 'none', border: '1px solid var(--border-default)', borderRadius: '3px',
        padding: '2px 8px', color: 'var(--accent)', fontSize: '10px', cursor: 'pointer',
        transition: 'all 0.15s', flexShrink: 0
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-hover-strong)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'none'; }}
      >▶ Play</button>
      <span className="close-btn" onClick={onRemove} title="Rimuovi" style={{ fontSize: '12px' }}>✕</span>
    </div>
  );
}

// ─── Main Panel ───
function MediaPanel({
  items, filter, onFilterChange,
  onRemoveItem, onUpdateItem, onClearAll,
  onImageClick, onVideoClick, onTelegramFile, onCastFile
}) {
  const [globalMute, setGlobalMute] = useState(false);
  const [stopTrigger, setStopTrigger] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const confirmTimer = useRef(null);

  const handleItemContextMenu = useCallback((e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  }, []);

  // Close context menu on click anywhere
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  const audioCnt = items.filter(i => i.type === 'audio').length;
  const imageCnt = items.filter(i => i.type === 'image').length;
  const videoCnt = items.filter(i => i.type === 'video').length;

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  const handleClearAll = useCallback(() => {
    if (confirmClear) {
      onClearAll();
      setConfirmClear(false);
      clearTimeout(confirmTimer.current);
    } else {
      setConfirmClear(true);
      confirmTimer.current = setTimeout(() => setConfirmClear(false), 3000);
    }
  }, [confirmClear, onClearAll]);

  const filterBtn = (type, label, count) => {
    const active = filter === type;
    return (
      <button key={type} onClick={() => onFilterChange(type)} style={{
        background: active ? 'var(--accent-a15)' : 'none',
        border: 'none', borderRadius: '3px', padding: '2px 6px',
        color: active ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: '10px',
        cursor: 'pointer', transition: 'all 0.15s', fontWeight: active ? '600' : '400'
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = active ? 'var(--accent)' : 'var(--text-tertiary)'; }}
      >
        {label}{count > 0 ? ` (${count})` : ''}
      </button>
    );
  };

  const headerBtn = (label, onClick, title, highlight) => (
    <button onClick={onClick} title={title} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: highlight ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: '11px', padding: '1px 4px',
      transition: 'color 0.15s'
    }}
    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
    onMouseLeave={e => e.currentTarget.style.color = highlight ? 'var(--accent)' : 'var(--text-tertiary)'}
    >{label}</button>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header Row 1: Title + global controls */}
      <div style={{
        padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)', flexShrink: 0
      }}>
        <span style={{
          fontSize: '11px', fontWeight: '600', textTransform: 'uppercase',
          letterSpacing: '1.5px', color: 'var(--accent)'
        }}>Media</span>
        {items.length > 0 && (
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            {headerBtn(globalMute ? '🔇' : '🔊', () => setGlobalMute(v => !v), globalMute ? 'Riattiva audio' : 'Muta tutto', globalMute)}
            {headerBtn('⏹', () => setStopTrigger(v => v + 1), 'Stop tutto')}
            {headerBtn(confirmClear ? 'Sicuro?' : '🗑️', handleClearAll, 'Svuota tutto')}
          </div>
        )}
      </div>

      {/* Header Row 2: Filters */}
      {items.length > 0 && (
        <div style={{
          padding: '3px 10px', display: 'flex', gap: '2px', alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)', flexShrink: 0
        }}>
          {filterBtn('all', 'Tutti', items.length)}
          {filterBtn('audio', '🎵', audioCnt)}
          {filterBtn('image', '🖼️', imageCnt)}
          {filterBtn('video', '🎬', videoCnt)}
        </div>
      )}

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-disabled)', fontSize: '11px' }}>
            {items.length === 0
              ? 'Clicca un file media nell\'Explorer per aggiungerlo qui'
              : 'Nessun elemento per questo filtro'}
          </div>
        )}
        {/* Audio tracks: always mounted to keep Howl alive, hidden when filtered out */}
        {items.filter(i => i.type === 'audio').map(item => (
          <div key={item.id} style={{ display: (filter === 'all' || filter === 'audio') ? 'block' : 'none' }}>
            <AudioTrack item={item}
              onRemove={() => onRemoveItem(item.id)}
              onUpdate={onUpdateItem}
              globalMute={globalMute} stopTrigger={stopTrigger}
              onContextMenu={(e) => handleItemContextMenu(e, item)} />
          </div>
        ))}
        {/* Images and videos: normal filter */}
        {filtered.filter(i => i.type !== 'audio').map(item => {
          if (item.type === 'image') {
            return <ImageItem key={item.id} item={item}
              onRemove={() => onRemoveItem(item.id)}
              onImageClick={onImageClick}
              onContextMenu={(e) => handleItemContextMenu(e, item)} />;
          }
          if (item.type === 'video') {
            return <VideoItem key={item.id} item={item}
              onRemove={() => onRemoveItem(item.id)}
              onVideoClick={onVideoClick}
              onContextMenu={(e) => handleItemContextMenu(e, item)} />;
          }
          return null;
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (onTelegramFile || onCastFile) && (
        <div style={{
          position: 'fixed', left: contextMenu.x, top: contextMenu.y,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '6px',
          zIndex: 2000, boxShadow: 'var(--shadow-dropdown)',
          padding: '4px 0', minWidth: '180px'
        }}>
          {onTelegramFile && (
            <div
              onClick={() => {
                const ext = '.' + contextMenu.item.name.split('.').pop().toLowerCase();
                onTelegramFile({ name: contextMenu.item.name, extension: ext, path: contextMenu.item.path });
                setContextMenu(null);
              }}
              style={{
                padding: '6px 14px', fontSize: '12px', color: 'var(--text-primary)',
                cursor: 'pointer', transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border-default)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ✉️ Invia via Telegram
            </div>
          )}
          {onCastFile && contextMenu.item?.type === 'image' && (
            <div
              onClick={() => {
                onCastFile(contextMenu.item.path);
                setContextMenu(null);
              }}
              style={{
                padding: '6px 14px', fontSize: '12px', color: 'var(--text-primary)',
                cursor: 'pointer', transition: 'background 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border-default)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              📡 Invia al display
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(MediaPanel);
