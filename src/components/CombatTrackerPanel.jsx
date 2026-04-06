import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { rollDice, formatDiceResult, containsDiceFormula, extractDiceFormula } from '../utils/diceEngine';

// Default conditions fallback (shown when librariesData not yet initialized)
const DEFAULT_CONDITIONS_FALLBACK = [
  { id: 'cond_01', name: 'Stordito', description: 'Non può effettuare azioni.', defaultDuration: 1 },
  { id: 'cond_02', name: 'Avvelenato', description: 'Svantaggio ai tiri per colpire.', defaultDuration: 3 },
  { id: 'cond_03', name: 'Accecato', description: 'Non può vedere.', defaultDuration: 2 },
  { id: 'cond_04', name: 'Spaventato', description: 'Non può muoversi verso la fonte della paura.', defaultDuration: 3 },
  { id: 'cond_05', name: 'Paralizzato', description: 'Incapacitato, non può muoversi.', defaultDuration: 1 },
  { id: 'cond_06', name: 'Prono', description: 'A terra.', defaultDuration: 0 },
  { id: 'cond_07', name: 'Afferrato', description: 'Velocità ridotta a 0.', defaultDuration: 0 },
  { id: 'cond_08', name: 'Invisibile', description: 'Impossibile da vedere.', defaultDuration: 3 },
  { id: 'cond_09', name: 'Incosciente', description: 'Incapacitato, cade prono.', defaultDuration: 0 }
];

// ── Helpers ──
function hpColor(hp, hpMax) {
  const pct = hpMax > 0 ? hp / hpMax : 0;
  if (pct > 0.5) return 'var(--color-success)';
  if (pct > 0.25) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

// ── Sub-components ──

function TopBar({ encounterName, round, turn, initMin, initMax, descending, onRoundChange, onTurnChange, onInitRangeChange, onToggleDescending, onRollMonsters, onReset, onBack, onComplete, onClose }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const confirmResetTimer = useRef(null);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const confirmCompleteTimer = useRef(null);
  const stepperStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
    borderRadius: '4px', padding: '2px 6px', fontSize: '12px'
  };
  const stepBtn = {
    background: 'none', border: 'none', color: 'var(--text-tertiary)',
    fontSize: '15px', cursor: 'pointer', padding: '2px 4px', lineHeight: 1,
    userSelect: 'none'
  };
  const labelStyle = { fontSize: '11px', color: 'var(--text-tertiary)', marginRight: '4px' };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '6px 12px', borderBottom: '1px solid var(--border-default)',
      background: 'var(--bg-panel)', flexShrink: 0,
      WebkitAppRegion: 'drag'
    }}>
      {/* Back */}
      <span onClick={onBack} style={{
        fontSize: '14px', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px', userSelect: 'none',
        WebkitAppRegion: 'no-drag'
      }}>←</span>

      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginRight: '8px' }}>
        {encounterName || 'Combat Tracker'}
      </span>

      {/* Controls — no-drag zone */}
      <div style={{ display: 'contents', WebkitAppRegion: 'no-drag' }}>

      {/* Round + Turno */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0',
        border: '1px solid var(--border-default)', borderRadius: '4px', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}>
          <span style={labelStyle}>Round</span>
          <span style={stepBtn} onClick={() => onRoundChange?.(-1)}>−</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', minWidth: '16px', textAlign: 'center' }}>{round}</span>
          <span style={stepBtn} onClick={() => onRoundChange?.(1)}>+</span>
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}>
          <span style={labelStyle}>Turno</span>
          <span style={stepBtn} onClick={() => onTurnChange?.(-1)}>−</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-warning)', minWidth: '16px', textAlign: 'center' }}>{turn}</span>
          <span style={stepBtn} onClick={() => onTurnChange?.(1)}>+</span>
        </div>
      </div>

      {/* Init Range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={labelStyle}>Init</span>
        <div style={stepperStyle}>
          <span style={stepBtn} onClick={() => onInitRangeChange?.('min', -1)}>−</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '500', minWidth: '16px', textAlign: 'center' }}>{initMin}</span>
          <span style={stepBtn} onClick={() => onInitRangeChange?.('min', 1)}>+</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-disabled)' }}>a</span>
        <div style={stepperStyle}>
          <span style={stepBtn} onClick={() => onInitRangeChange?.('max', -1)}>−</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '500', minWidth: '16px', textAlign: 'center' }}>{initMax}</span>
          <span style={stepBtn} onClick={() => onInitRangeChange?.('max', 1)}>+</span>
        </div>
      </div>

      {/* Disc/Asc + Roll mostri */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0',
        border: '1px solid var(--color-info)', borderRadius: '4px', overflow: 'hidden'
      }}>
        <div onClick={onToggleDescending} style={{
          fontSize: '11px', padding: '3px 8px',
          background: 'var(--color-info-bg)', color: 'var(--color-info)',
          cursor: 'pointer', fontWeight: '500'
        }}>
          {descending ? 'Disc.' : 'Asc.'}
        </div>
        <div style={{ width: '1px', height: '18px', background: 'var(--color-info)' }} />
        <div onClick={onRollMonsters} style={{
          fontSize: '11px', padding: '3px 8px',
          background: 'transparent', color: 'var(--color-info)',
          cursor: 'pointer', fontWeight: '500'
        }}>
          Roll mostri
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Completato */}
      <button type="button" onClick={() => {
        if (!confirmComplete) {
          setConfirmComplete(true);
          if (confirmCompleteTimer.current) clearTimeout(confirmCompleteTimer.current);
          confirmCompleteTimer.current = setTimeout(() => setConfirmComplete(false), 3000);
        } else {
          setConfirmComplete(false);
          if (confirmCompleteTimer.current) clearTimeout(confirmCompleteTimer.current);
          onComplete?.();
        }
      }} style={{
        background: confirmComplete ? 'var(--color-success-bg)' : 'none',
        border: '1px solid var(--color-success)',
        borderRadius: '4px', padding: '5px 12px', fontSize: '11px',
        color: 'var(--color-success)', cursor: 'pointer', fontWeight: confirmComplete ? '600' : '500'
      }}>{confirmComplete ? 'Sicuro?' : 'Completato'}</button>

      <button type="button" onClick={() => {
        if (!confirmReset) {
          setConfirmReset(true);
          if (confirmResetTimer.current) clearTimeout(confirmResetTimer.current);
          confirmResetTimer.current = setTimeout(() => setConfirmReset(false), 3000);
        } else {
          setConfirmReset(false);
          if (confirmResetTimer.current) clearTimeout(confirmResetTimer.current);
          onReset?.();
        }
      }} style={{
        background: confirmReset ? 'var(--color-danger-bg)' : 'none',
        border: '1px solid var(--color-danger)',
        borderRadius: '4px', padding: '3px 10px', fontSize: '11px',
        color: 'var(--color-danger)', cursor: 'pointer', fontWeight: confirmReset ? '600' : '500'
      }}>{confirmReset ? 'Sicuro?' : 'Reset'}</button>

      {/* Close */}
      <button onClick={onClose} style={{
        background: 'none', border: 'none', color: 'var(--text-tertiary)',
        fontSize: '16px', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px',
        transition: 'color 0.15s'
      }}>✕</button>

      </div>{/* end no-drag controls */}
    </div>
  );
}

function NumPadCol({ hasTarget, undoCount, diceBuffer, lastRoll, diceHistory, onModifier, onDigit, onClear, onUndo, onDiceRoll }) {
  const modStyle = (color) => ({
    fontSize: '11px', color, cursor: hasTarget ? 'pointer' : 'default',
    padding: '1px 0', textAlign: 'center', lineHeight: '1.5',
    opacity: hasTarget ? 1 : 0.4
  });
  const keyStyle = {
    fontSize: '11px', textAlign: 'center', padding: '3px 0',
    borderRadius: '3px', background: 'var(--bg-main)',
    border: '0.5px solid var(--border-subtle)',
    cursor: 'pointer', color: 'var(--text-primary)', lineHeight: '1.6'
  };
  const diceStyle = {
    fontSize: '11px', textAlign: 'center', padding: '4px 0', minHeight: '28px',
    borderRadius: '3px', background: 'var(--bg-main)',
    border: '0.5px solid var(--color-info)',
    cursor: 'pointer', color: 'var(--color-info)', lineHeight: '1.4',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  };
  const [rollFlash, setRollFlash] = useState(false);

  useEffect(() => {
    if (!lastRoll) return;
    setRollFlash(true);
    const t = setTimeout(() => setRollFlash(false), 500);
    return () => clearTimeout(t);
  }, [lastRoll?.timestamp]);

  return (
    <div style={{
      width: '65px', background: 'var(--bg-elevated)', borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 4px', gap: '2px',
      flexShrink: 0, overflowY: 'auto'
    }}>
      {/* Undo */}
      <div onClick={onUndo} style={{
        fontSize: '11px', color: undoCount > 0 ? 'var(--color-info)' : 'var(--text-disabled)',
        cursor: undoCount > 0 ? 'pointer' : 'default', marginBottom: '4px'
      }}>undo{undoCount > 0 ? ` (${undoCount})` : ''}</div>
      <div style={{ width: '100%', borderTop: '0.5px solid var(--border-subtle)', marginBottom: '4px' }} />

      {/* Modificatori */}
      {[-10, -5, -3, -2, -1].map(v => (
        <div key={v} onClick={() => hasTarget && onModifier?.(v)} style={modStyle('var(--color-danger)')}>
          {v === -10 ? <b>{v}</b> : v}
        </div>
      ))}
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500', padding: '2px 0' }}>0</div>
      {[1, 2, 3, 5, 10].map(v => (
        <div key={v} onClick={() => hasTarget && onModifier?.(v)} style={modStyle('var(--color-success)')}>
          {v === 10 ? <b>+{v}</b> : `+${v}`}
        </div>
      ))}

      <div style={{ width: '100%', borderTop: '0.5px solid var(--border-subtle)', margin: '4px 0' }} />

      {/* Tastierino */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', width: '100%' }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <div key={n} onClick={() => onDigit?.(n)} style={keyStyle}>{n}</div>
        ))}
        <div onClick={() => onDigit?.(0)} style={keyStyle}>0</div>
        <div onClick={() => onClear?.()} style={{ ...keyStyle, fontSize: '13px', color: 'var(--color-danger)' }}>&#9003;</div>
      </div>

      <div style={{ width: '100%', borderTop: '0.5px solid var(--border-subtle)', margin: '4px 0' }} />

      {/* Dice buffer indicator */}
      {diceBuffer && (
        <div style={{
          fontSize: '12px', fontWeight: '600', color: 'var(--accent)',
          textAlign: 'center', marginBottom: '2px'
        }}>{diceBuffer}d...</div>
      )}

      {/* Dice buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', width: '100%' }}>
        {[4, 6, 8, 10, 12, 20].map(d => (
          <div key={d} onClick={() => onDiceRoll?.(d)} style={diceStyle}>d{d}</div>
        ))}
        <div onClick={() => onDiceRoll?.(100)} style={{ ...diceStyle, gridColumn: '1 / -1' }}>d100</div>
      </div>

      {/* Dice results — just the total, big and visible */}
      {diceHistory.length > 0 && (
        <div style={{
          width: '100%', marginTop: '4px',
          maxHeight: '100px', overflowY: 'auto'
        }}>
          {diceHistory.map((entry, i) => (
            entry.separator ? (
              <div key={i} style={{ borderTop: '0.5px solid var(--border-subtle)', margin: '3px 0' }} />
            ) : (
              <div key={i} style={{
                padding: '2px 0', textAlign: 'center', borderRadius: '3px',
                background: i === 0 && rollFlash ? 'var(--accent-a10)' : 'transparent',
                transition: i === 0 ? 'all 0.3s ease' : 'none'
              }}>
                <div style={{
                  fontSize: i === 0 ? '18px' : '13px',
                  fontWeight: '700',
                  color: i === 0 ? 'var(--color-info)' : 'var(--text-secondary)'
                }}>{entry.total}</div>
                <div style={{
                  fontSize: '9px', color: 'var(--text-disabled)'
                }}>{entry.formula}</div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

function CombatantCard({ c, isPC, isActive, isTarget, hasActed, isSkipped, currentInit, hpSelected, initSelected, canRemove, isNpc, canToggleEnabled, onSelect, onTargetToggle, onHpChange, onHpSelect, onSkipToggle, onEffectClick, onRemove, onToggleEnabled }) {
  const isDead = c.hp <= 0;
  const isDisabled = c.enabled === false;
  const selected = isActive && !isDead && !isDisabled;
  const hpC = hpColor(c.hp, c.hpMax);
  const dimmed = hasActed || isSkipped;

  // Determine card style based on priority
  let borderLeft = 'none';
  let bg = 'transparent';
  let opacity = 1;
  let textDeco = 'none';

  if (isDead) {
    opacity = 0.35;
    textDeco = 'line-through';
    bg = 'var(--bg-elevated)';
  } else if (dimmed) {
    opacity = 0.4;
    bg = 'var(--bg-elevated)';
  }

  if (!isDead) {
    if (c.initiative === currentInit && !dimmed) {
      borderLeft = '3px solid var(--color-warning)';
      bg = 'var(--color-warning-bg)';
    }
    if (isTarget) {
      bg = 'var(--color-danger-bg)';
      if (c.initiative !== currentInit || dimmed) {
        borderLeft = '3px solid var(--color-danger)';
      }
    }
    if (selected) {
      borderLeft = '3px solid var(--color-success)';
      bg = 'var(--color-success-bg)';
    }
  }

  if (isDisabled) {
    opacity = 0.3;
    bg = 'var(--bg-elevated)';
    borderLeft = 'none';
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', gap: '6px',
      padding: '4px 6px', borderRadius: '3px',
      border: borderLeft === 'none' ? (isNpc ? '1px dashed var(--border-default)' : '0.5px solid var(--border-subtle)') : 'none',
      borderLeft, background: bg, opacity,
      cursor: isDisabled ? 'default' : 'pointer', transition: 'all 0.15s',
      minHeight: '38px'
    }}>
      {/* Toggle enabled (PG only) */}
      {canToggleEnabled && (
        <div
          onClick={(e) => { e.stopPropagation(); onToggleEnabled?.(c.id); }}
          style={{
            alignSelf: 'center', flexShrink: 0, cursor: 'pointer',
            fontSize: '13px', color: isDisabled ? 'var(--text-disabled)' : 'var(--text-tertiary)',
            padding: '2px', userSelect: 'none'
          }}
        >{isDisabled ? '○' : '●'}</div>
      )}

      {/* Target checkbox */}
      {!isDisabled && (
        <div
          onClick={(e) => { e.stopPropagation(); onTargetToggle?.(c.id); }}
        style={{
          width: '11px', borderRadius: '2px', flexShrink: 0, alignSelf: 'center',
          height: '11px',
          border: isTarget ? '1.5px solid var(--color-danger)' : '1.5px solid var(--text-tertiary)',
          background: isTarget ? 'var(--color-danger)' : 'transparent'
        }}
      />
      )}

      {/* Name + effects */}
      <div style={{ flex: 1, minWidth: 0, alignSelf: 'center' }} onClick={() => onSelect?.(c.id)}>
        <div style={{
          fontSize: '12px', fontWeight: '500', textDecoration: textDeco,
          color: isDead ? 'var(--text-secondary)' : initSelected ? 'var(--accent)' : 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {c.name}
        </div>
        {c.effects.length > 0 && !isDead && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '2px' }}>
            {c.effects.map((e, i) => (
              <span key={i} onClick={(ev) => { ev.stopPropagation(); onEffectClick?.(c.id, i); }} style={{
                fontSize: '10px', padding: '0 3px', borderRadius: '3px',
                background: 'var(--color-warning-bg)', color: 'var(--color-warning)',
                cursor: 'pointer', whiteSpace: 'nowrap'
              }}>
                {e.name}{e.rounds > 0 ? ` ${e.rounds}r` : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* HP — stretches full card height */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0
      }}>
        <div
          onClick={(e) => { e.stopPropagation(); onHpChange?.(c.id, 1); }}
          style={{
            fontSize: '20px', color: 'var(--text-tertiary)', cursor: 'pointer',
            lineHeight: 1, padding: '0 6px', userSelect: 'none'
          }}
        >+</div>
        <span
          onClick={(e) => { e.stopPropagation(); onHpSelect?.(c.id); }}
          style={{
            fontSize: '11px', fontWeight: '500', padding: '0 4px', borderRadius: '3px',
            background: hpSelected ? 'var(--accent-a10)' : 'var(--bg-main)',
            border: `0.5px solid ${hpSelected ? 'var(--accent)' : hpC}`,
            color: hpSelected ? 'var(--accent)' : hpC,
            cursor: 'pointer', lineHeight: '1.5', minWidth: '28px', textAlign: 'center'
          }}
        >{c.hp}</span>
        {!isDead && (
          <div
            onClick={(e) => { e.stopPropagation(); onHpChange?.(c.id, -1); }}
            style={{
              fontSize: '20px', color: 'var(--text-tertiary)', cursor: 'pointer',
              lineHeight: 1, padding: '0 6px', userSelect: 'none'
            }}
          >−</div>
        )}
      </div>

      {/* Skip button */}
      {!isDead && (
        <div
          onClick={(e) => { e.stopPropagation(); onSkipToggle?.(c.id); }}
          style={{
            width: '22px', height: '22px', borderRadius: '50%', alignSelf: 'center',
            border: isSkipped ? '1px solid var(--color-warning)' : '0.5px solid var(--border-subtle)',
            background: isSkipped ? 'var(--color-warning-bg)' : 'transparent',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', color: isSkipped ? 'var(--color-warning)' : 'var(--text-tertiary)',
            cursor: 'pointer', fontWeight: isSkipped ? '600' : '400'
          }}
        >S</div>
      )}

      {/* Remove button (only for monsters/NPCs, not real PCs) */}
      {canRemove && (
        <RemoveButton onRemove={() => onRemove?.(c.id)} />
      )}
    </div>
  );
}

function RemoveButton({ onRemove }) {
  const [confirm, setConfirm] = useState(false);
  const timer = useRef(null);
  const handleClick = (e) => {
    e.stopPropagation();
    if (!confirm) {
      setConfirm(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setConfirm(false), 3000);
    } else {
      setConfirm(false);
      if (timer.current) clearTimeout(timer.current);
      onRemove?.();
    }
  };
  return (
    <div onClick={handleClick} style={{
      width: '22px', height: '22px', borderRadius: '50%', alignSelf: 'center',
      border: confirm ? '1px solid var(--color-danger)' : '0.5px solid var(--border-subtle)',
      background: confirm ? 'var(--color-danger-bg)' : 'transparent',
      flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: confirm ? '9px' : '12px',
      color: confirm ? 'var(--color-danger)' : 'var(--text-disabled)',
      cursor: 'pointer', fontWeight: confirm ? '600' : '400'
    }}>{confirm ? '?' : '✕'}</div>
  );
}

function EnvironmentCard({ environment, onEffectClick, onAddEffect }) {
  const [addForm, setAddForm] = useState(null); // null | { name: '', rounds: '0' }

  const tagColor = (effect) => {
    const name = effect.name.toLowerCase();
    if (name.includes('buio') || name.includes('oscur')) return { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' };
    if (name.includes('acqua') || name.includes('pioggia')) return { bg: 'var(--color-info-bg)', color: 'var(--color-info)' };
    return { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' };
  };

  const handleSubmit = () => {
    if (addForm?.name?.trim()) {
      onAddEffect?.(addForm.name.trim(), parseInt(addForm.rounds, 10) || 0);
    }
    setAddForm(null);
  };

  return (
    <div style={{
      padding: '5px 10px', background: 'var(--color-info-bg)',
      border: '0.5px solid var(--color-info)', borderRadius: '4px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '8px', marginBottom: '6px', flexWrap: 'wrap'
    }}>
      <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-info)', whiteSpace: 'nowrap' }}>
        {environment.name}
      </span>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
        {environment.effects.map((e, i) => {
          const tc = tagColor(e);
          return (
            <span key={i} onClick={() => onEffectClick?.(i)} style={{
              fontSize: '11px', padding: '1px 5px', borderRadius: '3px',
              background: tc.bg, color: tc.color, cursor: 'pointer', whiteSpace: 'nowrap'
            }}>
              {e.name}{e.rounds > 0 ? ` ${e.rounds}r` : ''}
            </span>
          );
        })}
        {addForm === null ? (
          <span onClick={() => setAddForm({ name: '', rounds: '0' })} style={{
            fontSize: '11px', padding: '1px 5px', borderRadius: '3px',
            border: '0.5px solid var(--color-info)', color: 'var(--color-info)',
            cursor: 'pointer'
          }}>+</span>
        ) : (
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
            <input
              autoFocus
              value={addForm.name}
              onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') setAddForm(null); }}
              placeholder="Effetto"
              style={{
                width: '80px', padding: '1px 5px', fontSize: '11px', minHeight: '22px',
                background: 'var(--bg-input)', border: '1px solid var(--accent)',
                borderRadius: '3px', color: 'var(--text-primary)', outline: 'none'
              }}
            />
            <input
              value={addForm.rounds}
              onChange={e => setAddForm(prev => ({ ...prev, rounds: e.target.value.replace(/\D/g, '') }))}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') setAddForm(null); }}
              placeholder="r"
              title="Durata in round (0 = permanente)"
              style={{
                width: '28px', padding: '1px 3px', fontSize: '11px', minHeight: '22px',
                background: 'var(--bg-input)', border: '1px solid var(--accent)',
                borderRadius: '3px', color: 'var(--text-primary)', outline: 'none', textAlign: 'center'
              }}
            />
            <span onClick={handleSubmit} style={{
              fontSize: '11px', color: 'var(--color-info)', cursor: 'pointer', fontWeight: '500', padding: '0 3px'
            }}>OK</span>
            <span onClick={() => setAddForm(null)} style={{
              fontSize: '13px', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '0 2px'
            }}>✕</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ConditionTag({ cond, isActive, selectedId, onApply }) {
  const [showDesc, setShowDesc] = useState(false);
  const touchTimer = useRef(null);

  const handleTouchStart = () => {
    touchTimer.current = setTimeout(() => setShowDesc(true), 500);
  };
  const handleTouchEnd = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current);
    if (showDesc) { setShowDesc(false); return; }
    if (selectedId) onApply?.(cond.name);
  };

  return (
    <span
      onClick={() => selectedId && onApply?.(cond.name)}
      onMouseEnter={() => cond.description && setShowDesc(true)}
      onMouseLeave={() => setShowDesc(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        fontSize: '11px', padding: '4px 8px', borderRadius: '4px', position: 'relative',
        border: `0.5px solid ${isActive ? 'var(--color-warning)' : 'var(--border-default)'}`,
        background: isActive ? 'var(--color-warning-bg)' : 'transparent',
        color: isActive ? 'var(--color-warning)' : 'var(--text-tertiary)',
        cursor: selectedId ? 'pointer' : 'default',
        opacity: selectedId ? 1 : 0.5, userSelect: 'none'
      }}
    >
      {cond.name}
      {showDesc && cond.description && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: '6px', padding: '6px 10px', borderRadius: '4px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
          boxShadow: '0 4px 12px var(--shadow-dropdown)',
          fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4',
          whiteSpace: 'normal', width: '200px', zIndex: 10, pointerEvents: 'none'
        }}>{cond.description}</div>
      )}
    </span>
  );
}

function ConditionsRow({ conditions, selectedId, activeEffects, duration, onDurationChange, onApplyCondition }) {
  const [customInput, setCustomInput] = useState(null);

  const handleCustomSubmit = () => {
    if (customInput && customInput.trim()) {
      onApplyCondition?.(customInput.trim());
    }
    setCustomInput(null);
  };

  return (
    <div style={{
      borderTop: '0.5px solid var(--border-subtle)',
      padding: '5px 8px', display: 'flex', alignItems: 'center',
      gap: '6px', flexWrap: 'wrap'
    }}>
      <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', marginRight: '2px' }}>
        Condizioni:
      </span>
      {(conditions || []).map(c => (
        <ConditionTag
          key={c.id}
          cond={c}
          isActive={activeEffects?.some(e => e.name === c.name)}
          selectedId={selectedId}
          onApply={onApplyCondition}
        />
      ))}

      {customInput === null ? (
        <span onClick={() => selectedId && setCustomInput('')} style={{
          fontSize: '11px', padding: '4px 8px', borderRadius: '4px',
          border: '0.5px solid var(--color-info)', color: 'var(--color-info)',
          cursor: selectedId ? 'pointer' : 'default',
          opacity: selectedId ? 1 : 0.5
        }}>+ Custom</span>
      ) : (
        <input
          autoFocus
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCustomSubmit(); if (e.key === 'Escape') setCustomInput(null); }}
          onBlur={handleCustomSubmit}
          placeholder="Nome..."
          style={{
            width: '100px', padding: '4px 8px', fontSize: '11px',
            background: 'var(--bg-input)', border: '1px solid var(--accent)',
            borderRadius: '4px', color: 'var(--text-primary)', outline: 'none'
          }}
        />
      )}

      <div style={{ flex: 1 }} />

      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Durata:</span>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
        borderRadius: '4px', padding: '1px 5px', fontSize: '11px'
      }}>
        <span onClick={() => onDurationChange?.(-1)} style={{ color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px', userSelect: 'none' }}>−</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: '500', minWidth: '14px', textAlign: 'center' }}>{duration}</span>
        <span onClick={() => onDurationChange?.(1)} style={{ color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px', userSelect: 'none' }}>+</span>
      </div>
      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{duration === 0 ? 'perm.' : 'round'}</span>
    </div>
  );
}

function DetailSheet({ title, data, isMonster, onSaveToBestiary, saveToBestiaryId, onSaveToBestiaryStart, saveToBestiarySystem, onSaveToBestiarySystemChange, gameSystems, onDiceRoll }) {
  const hasAttributes = data?.attributes && data.attributes.length > 0;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)',
        textAlign: 'center', padding: '3px', borderBottom: '1px solid var(--border-subtle)'
      }}>{title}</div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
        {data ? (
          <>
            <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '6px' }}>
              {data.name}
            </div>
            {hasAttributes ? (
              data.attributes.map((attr, i) => {
                const formula = extractDiceFormula(attr.value);
                return (
                  <div key={i} style={{ marginBottom: '2px' }}>
                    <span style={{ color: 'var(--text-tertiary)' }}>{attr.key}</span>
                    {attr.description && <span style={{ color: 'var(--text-secondary)' }}> ({attr.description})</span>}
                    <span>: </span>
                    {formula ? (
                      <>
                        {attr.value !== formula && <span style={{ color: 'var(--text-primary)' }}>{attr.value.split(formula)[0]}</span>}
                        <span
                          onClick={() => onDiceRoll?.(formula, attr.key, attr.description)}
                          style={{
                            color: 'var(--color-info)', cursor: 'pointer',
                            textDecoration: 'underline', textDecorationStyle: 'dotted'
                          }}
                        >{formula}</span>
                        {attr.value !== formula && attr.value.split(formula)[1] && (
                          <span style={{ color: 'var(--text-primary)' }}>{attr.value.split(formula)[1]}</span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: 'var(--text-primary)' }}>{attr.value}</span>
                    )}
                  </div>
                );
              })
            ) : data.sheet ? (
              data.sheet.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))
            ) : null}
            {data.notes && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{data.notes}</div>
            )}
            {/* Save to bestiary button */}
            {isMonster && !data.templateId && onSaveToBestiary && (
              <div style={{ marginTop: '10px', borderTop: '0.5px solid var(--border-subtle)', paddingTop: '8px' }}>
                {saveToBestiaryId === data.id ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <select
                      value={saveToBestiarySystem}
                      onChange={e => onSaveToBestiarySystemChange?.(e.target.value)}
                      style={{
                        flex: 1, padding: '3px 6px', fontSize: '11px', minHeight: '26px',
                        background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                        borderRadius: '3px', color: 'var(--text-primary)', outline: 'none'
                      }}
                    >
                      {(gameSystems || []).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <span onClick={() => onSaveToBestiary(data.id)} style={{
                      fontSize: '11px', padding: '3px 8px', borderRadius: '3px',
                      background: 'var(--accent)', color: 'var(--bg-main)', cursor: 'pointer', fontWeight: '500'
                    }}>Salva</span>
                  </div>
                ) : (
                  <span onClick={() => onSaveToBestiaryStart?.(data.id)} style={{
                    fontSize: '11px', color: 'var(--color-info)', cursor: 'pointer'
                  }}>Salva nel bestiario</span>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>Nessuna selezione</div>
        )}
      </div>
    </div>
  );
}

function CombatLog({ log }) {
  const [expanded, setExpanded] = useState(false);

  if (!log || log.length === 0) {
    return (
      <div style={{
        borderTop: '1px solid var(--border-default)',
        background: 'var(--bg-elevated)', padding: '5px 12px',
        flexShrink: 0, fontSize: '11px', color: 'var(--text-disabled)', fontStyle: 'italic'
      }}>Nessun evento registrato</div>
    );
  }

  const last = log[0];

  return (
    <div style={{
      borderTop: '1px solid var(--border-default)',
      background: 'var(--bg-elevated)', flexShrink: 0, fontSize: '11px'
    }}>
      {expanded ? (
        <div style={{ maxHeight: '150px', overflowY: 'auto', padding: '5px 12px' }}>
          {log.map((entry, i) => (
            <div key={i} style={{ padding: '1px 0' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>R{entry.round} T{entry.turn}</span>
              <span style={{ color: 'var(--text-secondary)' }}> — {entry.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '5px 12px' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>R{last.round} T{last.turn}</span>
          <span style={{ color: 'var(--text-secondary)' }}> — {last.text}</span>
        </div>
      )}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          textAlign: 'right', padding: '2px 12px 4px',
          color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '10px'
        }}
      >{expanded ? 'comprimi' : 'espandi'}</div>
    </div>
  );
}

// ── Encounter List ──

function EncounterList({ encounters, onCreateEncounter, onOpenEncounter, onDeleteEncounter, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const confirmDeleteTimer = useRef(null);

  const handleCreate = () => {
    if (!formName.trim()) return;
    onCreateEncounter(formName.trim(), formDesc.trim());
    setFormName('');
    setFormDesc('');
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      onDeleteEncounter(id);
      setConfirmDeleteId(null);
      if (confirmDeleteTimer.current) clearTimeout(confirmDeleteTimer.current);
    } else {
      setConfirmDeleteId(id);
      if (confirmDeleteTimer.current) clearTimeout(confirmDeleteTimer.current);
      confirmDeleteTimer.current = setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const statusLabel = (s) => {
    if (s === 'completed') return { text: 'Completato', color: 'var(--color-success)' };
    if (s === 'in_progress') return { text: 'In corso', color: 'var(--color-warning)' };
    return { text: 'Nuovo', color: 'var(--text-tertiary)' };
  };

  const inputStyle = {
    width: '100%', padding: '6px 10px', fontSize: '13px', minHeight: '32px',
    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
    borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--overlay-dark)',
      zIndex: 3500, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '520px', maxHeight: '80vh', background: 'var(--bg-panel)',
        border: '1px solid var(--border-default)', borderRadius: '8px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Incontri
          </span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-tertiary)',
            fontSize: '16px', cursor: 'pointer', padding: '2px 6px'
          }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* New encounter button / form */}
          {!showForm ? (
            <div
              onClick={() => setShowForm(true)}
              style={{
                padding: '10px', borderRadius: '6px', marginBottom: '16px',
                border: '1px dashed var(--accent)', color: 'var(--accent)',
                fontSize: '13px', fontWeight: '500', textAlign: 'center',
                cursor: 'pointer', transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-a04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >+ Nuovo incontro</div>
          ) : (
            <div style={{
              padding: '14px', borderRadius: '6px', marginBottom: '16px',
              border: '1px solid var(--accent)', background: 'var(--accent-a04)'
            }}>
              <input
                autoFocus
                value={formName}
                onChange={e => setFormName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && formName.trim()) handleCreate(); if (e.key === 'Escape') setShowForm(false); }}
                placeholder="Nome incontro (obbligatorio)"
                style={{ ...inputStyle, marginBottom: '8px' }}
              />
              <textarea
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="Descrizione ambiente (opzionale)"
                rows={2}
                style={{ ...inputStyle, marginBottom: '10px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <span onClick={() => setShowForm(false)} style={{
                  fontSize: '12px', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '6px 12px'
                }}>Annulla</span>
                <span onClick={handleCreate} style={{
                  fontSize: '12px', fontWeight: '600', padding: '6px 16px', borderRadius: '4px',
                  background: 'var(--accent)', color: 'var(--bg-main)', cursor: 'pointer',
                  opacity: formName.trim() ? 1 : 0.5
                }}>Crea</span>
              </div>
            </div>
          )}

          {/* Encounter list */}
          {encounters.length === 0 && !showForm && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-disabled)', fontSize: '13px', fontStyle: 'italic' }}>
              Nessun incontro creato. Clicca "+ Nuovo incontro" per iniziare.
            </div>
          )}

          {encounters.map(enc => {
            const st = statusLabel(enc.status);
            const pcCount = (enc.pcs || []).filter(p => p.hp > 0).length;
            const monCount = (enc.monsters || []).filter(m => m.hp > 0).length;
            return (
              <div key={enc.id} style={{
                padding: '12px 14px', borderRadius: '6px', marginBottom: '8px',
                border: '1px solid var(--border-default)', background: 'var(--bg-main)',
                transition: 'border-color 0.15s'
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{enc.name}</span>
                  <span style={{ fontSize: '11px', color: st.color, fontWeight: '500' }}>
                    {st.text}{enc.status === 'in_progress' ? ` R${enc.round}` : ''}
                  </span>
                </div>
                {enc.description && (
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px', lineHeight: '1.4' }}>
                    {enc.description.length > 80 ? enc.description.slice(0, 80) + '...' : enc.description}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {pcCount} PG, {monCount} Mostri
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span onClick={() => onOpenEncounter(enc.id)} style={{
                      fontSize: '11px', fontWeight: '500', color: 'var(--accent)', cursor: 'pointer',
                      padding: '3px 10px', borderRadius: '3px', border: '1px solid var(--accent)'
                    }}>Apri</span>
                    <span onClick={() => handleDelete(enc.id)} style={{
                      fontSize: '11px', fontWeight: '500', cursor: 'pointer', padding: '3px 10px', borderRadius: '3px',
                      color: confirmDeleteId === enc.id ? 'var(--color-danger)' : 'var(--text-tertiary)',
                      border: `1px solid ${confirmDeleteId === enc.id ? 'var(--color-danger)' : 'var(--border-subtle)'}`,
                      background: confirmDeleteId === enc.id ? 'var(--color-danger-bg)' : 'transparent'
                    }}>{confirmDeleteId === enc.id ? 'Sicuro?' : 'Cancella'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Combat View (was Main Component) ──
function CombatView({ encounter, onEncounterChange, onBack, onComplete, bestiary, gameSystems, conditions, onSaveToBestiary, onClose }) {
  const [state, setState] = useState(encounter);
  const initialRender = useRef(true);
  const [numpadTarget, setNumpadTarget] = useState(null); // { id, field: 'hp'|'init' }
  const [numpadTyping, setNumpadTyping] = useState(false); // true after first digit typed
  const [undoStack, setUndoStack] = useState([]); // max 5 entries: [{ id, field, value }]
  const [addMonsterMode, setAddMonsterMode] = useState(null); // null | 'choose' | 'manual' | 'bestiary'
  const [addMonsterForm, setAddMonsterForm] = useState({ name: '', hp: '', qty: '1' });
  const [bestiarySearch, setBestiarySearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [addNpcForm, setAddNpcForm] = useState(null); // null | { name: '', hp: '' }
  const [saveToBestiaryId, setSaveToBestiaryId] = useState(null); // monster id being saved
  const [saveToBestiarySystem, setSaveToBestiarySystem] = useState('sys-generico');
  const [diceHistory, setDiceHistory] = useState([]);
  const [lastRoll, setLastRoll] = useState(null);
  const [lastDiceTime, setLastDiceTime] = useState(0);
  const [diceBuffer, setDiceBuffer] = useState('');

  // Sync state to parent for persistence
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    onEncounterChange?.(state);
  }, [state]);

  const allCombatants = useMemo(() => [...state.pcs, ...state.monsters], [state.pcs, state.monsters]);

  const initBands = useMemo(() => {
    const alivePcs = state.pcs.filter(p => p.hp > 0 && p.enabled !== false);
    const aliveMons = state.monsters.filter(m => m.hp > 0);
    const alive = [...alivePcs, ...aliveMons];
    const initSet = new Set(alive.map(c => c.initiative));
    const sorted = [...initSet].sort((a, b) => state.descending ? b - a : a - b);
    return sorted;
  }, [state.pcs, state.monsters, state.descending]);

  const deadPcs = useMemo(() => state.pcs.filter(p => p.hp <= 0 && p.enabled !== false), [state.pcs]);
  const deadMons = useMemo(() => state.monsters.filter(m => m.hp <= 0), [state.monsters]);
  const hasDead = deadPcs.length > 0 || deadMons.length > 0;

  // ── Handlers ──

  const handleSelect = (id) => {
    const deselecting = state.selectedId === id;
    setState(prev => ({ ...prev, selectedId: prev.selectedId === id ? null : id }));
    if (deselecting) {
      setNumpadTarget(null);
    } else {
      setNumpadTarget({ id, field: 'init' });
    }
    setNumpadTyping(false);
  };

  const handleTargetToggle = (id) => {
    setState(prev => ({
      ...prev,
      targetIds: prev.targetIds.includes(id)
        ? prev.targetIds.filter(t => t !== id)
        : [...prev.targetIds, id]
    }));
  };

  const updateCombatantHp = (id, newHp) => {
    setState(prev => {
      const updateList = (list) => list.map(c => {
        if (c.id !== id) return c;
        const clamped = Math.max(0, newHp);
        return { ...c, hp: clamped };
      });
      const inPcs = prev.pcs.some(p => p.id === id);
      return {
        ...prev,
        pcs: inPcs ? updateList(prev.pcs) : prev.pcs,
        monsters: inPcs ? prev.monsters : updateList(prev.monsters)
      };
    });
  };

  const pushUndo = (id, field, value) => {
    setUndoStack(prev => [{ id, field, value }, ...prev].slice(0, 5));
  };

  const updateCombatantInit = (id, newInit) => {
    setState(prev => {
      const updateList = (list) => list.map(c => c.id === id ? { ...c, initiative: newInit } : c);
      const inPcs = prev.pcs.some(p => p.id === id);
      return {
        ...prev,
        pcs: inPcs ? updateList(prev.pcs) : prev.pcs,
        monsters: inPcs ? prev.monsters : updateList(prev.monsters)
      };
    });
  };

  const handleHpChange = (id, delta) => {
    const c = allCombatants.find(x => x.id === id);
    if (!c) return;
    pushUndo(id, 'hp', c.hp);
    const newHp = Math.max(0, c.hp + delta);
    updateCombatantHp(id, newHp);
    addLogEntry(`${c.name}: ${c.hp}→${newHp} HP (${delta > 0 ? '+' : ''}${delta})`);
  };

  const handleHpSelect = (id) => {
    if (numpadTarget?.id === id && numpadTarget?.field === 'hp') {
      setNumpadTarget(null);
      setNumpadTyping(false);
    } else {
      setNumpadTarget({ id, field: 'hp' });
      setNumpadTyping(false);
      const c = allCombatants.find(x => x.id === id);
      if (c) pushUndo(id, 'hp', c.hp);
    }
  };

  const handleNumpadModifier = (delta) => {
    if (!numpadTarget) return;
    const c = allCombatants.find(x => x.id === numpadTarget.id);
    if (!c) return;
    if (numpadTarget.field === 'hp') {
      pushUndo(c.id, 'hp', c.hp);
      updateCombatantHp(c.id, c.hp + delta);
    } else if (numpadTarget.field === 'init') {
      pushUndo(c.id, 'init', c.initiative);
      updateCombatantInit(c.id, c.initiative + delta);
    }
    setNumpadTyping(false);
  };

  const handleNumpadDigit = (digit) => {
    if (!numpadTarget) {
      // No target → compose dice buffer
      setDiceBuffer(prev => {
        if (prev.length >= 3) return prev;
        return prev + String(digit);
      });
      return;
    }
    const c = allCombatants.find(x => x.id === numpadTarget.id);
    if (!c) return;
    const currentVal = numpadTarget.field === 'hp' ? c.hp : c.initiative;
    let newStr;
    if (!numpadTyping) {
      pushUndo(c.id, numpadTarget.field, currentVal);
      newStr = String(digit);
      setNumpadTyping(true);
    } else {
      newStr = String(currentVal) + String(digit);
    }
    const newVal = parseInt(newStr, 10) || 0;
    if (numpadTarget.field === 'hp') updateCombatantHp(c.id, newVal);
    else updateCombatantInit(c.id, newVal);
  };

  const handleNumpadClear = () => {
    if (!numpadTarget) {
      setDiceBuffer('');
      return;
    }
    const c = allCombatants.find(x => x.id === numpadTarget.id);
    if (!c) return;
    const currentVal = numpadTarget.field === 'hp' ? c.hp : c.initiative;
    const currentStr = String(currentVal);
    const newVal = currentStr.length <= 1 ? 0 : parseInt(currentStr.slice(0, -1), 10);
    if (numpadTarget.field === 'hp') updateCombatantHp(c.id, newVal);
    else updateCombatantInit(c.id, newVal);
  };

  const handleNumpadUndo = () => {
    if (undoStack.length === 0) return;
    const [last, ...rest] = undoStack;
    if (last.field === 'hp') updateCombatantHp(last.id, last.value);
    else if (last.field === 'init') updateCombatantInit(last.id, last.value);
    setUndoStack(rest);
  };

  // ── Round / Turn / Skip ──

  const handleSkipToggle = (id) => {
    setState(prev => ({
      ...prev,
      skippedIds: (prev.skippedIds || []).includes(id)
        ? prev.skippedIds.filter(s => s !== id)
        : [...(prev.skippedIds || []), id]
    }));
  };

  const handleRoundChange = (delta) => {
    setState(prev => {
      const newRound = Math.max(1, prev.round + delta);
      if (delta > 0) {
        // Decrement effects on all PCs and monsters
        const decrementEffects = (list) => list.map(c => ({
          ...c,
          effects: c.effects.reduce((acc, e) => {
            if (e.rounds === 0) { acc.push(e); return acc; }  // permanente, tieni
            if (e.rounds > 1) { acc.push({ ...e, rounds: e.rounds - 1 }); return acc; }
            return acc;  // rounds === 1 → scaduto, rimuovi
          }, [])
        }));
        const newEnvEffects = prev.environment.effects.reduce((acc, e) => {
          if (e.rounds === 0) { acc.push(e); return acc; }
          if (e.rounds > 1) { acc.push({ ...e, rounds: e.rounds - 1 }); return acc; }
          return acc;
        }, []);
        return {
          ...prev,
          round: newRound,
          turn: 1,
          currentInit: initBands[0] ?? prev.currentInit,
          actedInits: [],
          skippedIds: [],
          pcs: decrementEffects(prev.pcs),
          monsters: decrementEffects(prev.monsters),
          environment: { ...prev.environment, effects: newEnvEffects },
          log: [{ round: newRound, turn: 1, text: `Round ${newRound}` }, ...prev.log].slice(0, 50)
        };
      }
      return { ...prev, round: newRound };
    });
  };

  const handleTurnChange = (delta) => {
    if (delta > 0) {
      const currentIdx = initBands.indexOf(state.currentInit);
      if (currentIdx >= initBands.length - 1) {
        // Last band — auto Round+1
        handleRoundChange(1);
        return;
      }
    }
    setState(prev => {
      const currentIdx = initBands.indexOf(prev.currentInit);
      const newIdx = currentIdx + delta;
      if (newIdx < 0) return prev;
      const newInit = initBands[newIdx];
      let newActed;
      if (delta > 0) {
        newActed = [...prev.actedInits, prev.currentInit];
      } else {
        newActed = prev.actedInits.filter(i => i !== newInit);
      }
      return {
        ...prev,
        turn: Math.max(1, prev.turn + delta),
        currentInit: newInit,
        actedInits: newActed
      };
    });
  };

  // ── Initiative / Monsters ──

  const handleInitRangeChange = (field, delta) => {
    setState(prev => {
      const key = field === 'min' ? 'initMin' : 'initMax';
      return { ...prev, [key]: Math.max(-100, Math.min(100, prev[key] + delta)) };
    });
  };

  const handleToggleDescending = () => {
    setState(prev => ({ ...prev, descending: !prev.descending }));
  };

  const handleRollMonsters = () => {
    setState(prev => {
      const lo = Math.min(prev.initMin, prev.initMax);
      const hi = Math.max(prev.initMin, prev.initMax);
      return {
        ...prev,
        monsters: prev.monsters.map(m =>
          m.hp > 0 ? { ...m, initiative: Math.floor(Math.random() * (hi - lo + 1)) + lo } : m
        ),
        log: [{ round: prev.round, turn: prev.turn, text: `Iniziativa mostri rollata (${lo}-${hi})` }, ...prev.log].slice(0, 50)
      };
    });
  };

  const handleAddMonsterManual = () => {
    if (!addMonsterForm.name?.trim() || !addMonsterForm.hp) return;
    const hp = Math.max(1, parseInt(addMonsterForm.hp, 10) || 1);
    const name = addMonsterForm.name.trim();
    setState(prev => ({
      ...prev,
      monsters: [...prev.monsters, {
        id: 'mon-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        name, hp, hpMax: hp, hpInitial: hp, initiative: 0,
        effects: [], attributes: [], templateId: null, sheet: ''
      }],
      log: [{ round: prev.round, turn: prev.turn, text: `${name} aggiunto (${hp} HP)` }, ...prev.log].slice(0, 50)
    }));
    setAddMonsterMode(null);
    setAddMonsterForm({ name: '', hp: '', qty: '1' });
  };

  const handleAddNpc = () => {
    if (!addNpcForm?.name?.trim() || !addNpcForm?.hp) return;
    const hp = Math.max(1, parseInt(addNpcForm.hp, 10) || 1);
    const name = addNpcForm.name.trim();
    setState(prev => ({
      ...prev,
      pcs: [...prev.pcs, {
        id: 'npc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        name, hp, hpMax: hp, hpInitial: hp, initiative: 0,
        effects: [], attributes: [], templateId: null, sourceId: null,
        type: 'npc', enabled: true, sheet: ''
      }],
      log: [{ round: prev.round, turn: prev.turn, text: `NPC ${name} aggiunto (${hp} HP)` }, ...prev.log].slice(0, 50)
    }));
    setAddNpcForm(null);
  };

  const handleToggleEnabled = (id) => {
    setState(prev => ({
      ...prev,
      pcs: prev.pcs.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p)
    }));
  };

  const handleAddMonsterFromBestiary = () => {
    if (!selectedTemplate) return;
    const t = selectedTemplate;
    const qty = Math.max(1, parseInt(addMonsterForm.qty, 10) || 1);
    const hpAttr = t.attributes.find(a => a.key.toLowerCase() === 'hp');
    const hp = Math.max(1, parseInt(addMonsterForm.hp || hpAttr?.value || '10', 10) || 10);
    const baseName = addMonsterForm.name?.trim() || t.name;
    const newMonsters = [];
    for (let i = 0; i < qty; i++) {
      newMonsters.push({
        id: 'mon-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '-' + i,
        name: qty > 1 ? `${baseName} ${i + 1}` : baseName,
        hp, hpMax: hp, hpInitial: hp, initiative: 0,
        effects: [],
        attributes: t.attributes.map(a => ({ ...a })),
        templateId: t.id,
        sheet: ''
      });
    }
    setState(prev => ({
      ...prev,
      monsters: [...prev.monsters, ...newMonsters],
      log: [{ round: prev.round, turn: prev.turn, text: `${baseName} aggiunto x${qty} (${hp} HP)` }, ...prev.log].slice(0, 50)
    }));
    setAddMonsterMode(null);
    setSelectedTemplate(null);
    setAddMonsterForm({ name: '', hp: '', qty: '1' });
    setBestiarySearch('');
  };

  const handleSaveToBestiary = (monsterId) => {
    const mon = state.monsters.find(m => m.id === monsterId);
    if (!mon || mon.templateId) return;
    const template = {
      id: 'beast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: mon.name,
      gameSystem: saveToBestiarySystem,
      attributes: (mon.attributes || []).length > 0 ? mon.attributes.map(a => ({ ...a })) : [
        { key: 'HP', value: String(mon.hpMax), description: '', isGlobal: true, defaultValue: '' }
      ],
      notes: ''
    };
    onSaveToBestiary?.(template);
    // Mark as template-linked
    setState(prev => ({
      ...prev,
      monsters: prev.monsters.map(m => m.id === monsterId ? { ...m, templateId: template.id } : m)
    }));
    setSaveToBestiaryId(null);
  };

  const handleRemoveCombatant = (id) => {
    setState(prev => ({
      ...prev,
      pcs: prev.pcs.filter(p => p.id !== id),
      monsters: prev.monsters.filter(m => m.id !== id),
      selectedId: prev.selectedId === id ? null : prev.selectedId,
      targetIds: prev.targetIds.filter(t => t !== id),
      skippedIds: (prev.skippedIds || []).filter(s => s !== id)
    }));
    if (numpadTarget?.id === id) {
      setNumpadTarget(null);
      setNumpadTyping(false);
    }
  };

  // ── Conditions ──

  const handleDurationChange = (delta) => {
    setState(prev => ({
      ...prev,
      conditionDuration: Math.max(0, Math.min(99, (prev.conditionDuration ?? 3) + delta))
    }));
  };

  const handleApplyCondition = (name) => {
    setState(prev => {
      if (!prev.selectedId) return prev;
      const target = [...prev.pcs, ...prev.monsters].find(c => c.id === prev.selectedId);
      const hasIt = target?.effects.some(e => e.name === name);
      const updateList = (list) => list.map(c => {
        if (c.id !== prev.selectedId) return c;
        return {
          ...c,
          effects: hasIt
            ? c.effects.filter(e => e.name !== name)
            : [...c.effects, { name, rounds: prev.conditionDuration ?? 3 }]
        };
      });
      const inPcs = prev.pcs.some(p => p.id === prev.selectedId);
      const dur = prev.conditionDuration ?? 3;
      const logText = hasIt
        ? `${name} rimosso da ${target?.name}`
        : `${name} applicato a ${target?.name}${dur > 0 ? ` (${dur}r)` : ' (perm.)'}`;
      return {
        ...prev,
        pcs: inPcs ? updateList(prev.pcs) : prev.pcs,
        monsters: inPcs ? prev.monsters : updateList(prev.monsters),
        log: [{ round: prev.round, turn: prev.turn, text: logText }, ...prev.log].slice(0, 50)
      };
    });
  };

  const handleEffectClick = (combatantId, effectIdx) => {
    setState(prev => {
      const updateList = (list) => list.map(c => {
        if (c.id !== combatantId) return c;
        const effects = [];
        for (let i = 0; i < c.effects.length; i++) {
          if (i !== effectIdx) { effects.push(c.effects[i]); continue; }
          const e = c.effects[i];
          if (e.rounds === 0 || e.rounds === 1) continue; // remove permanent or last round
          effects.push({ ...e, rounds: e.rounds - 1 }); // decrement
        }
        return { ...c, effects };
      });
      const inPcs = prev.pcs.some(p => p.id === combatantId);
      return {
        ...prev,
        pcs: inPcs ? updateList(prev.pcs) : prev.pcs,
        monsters: inPcs ? prev.monsters : updateList(prev.monsters)
      };
    });
  };

  // ── Log, Reset, Environment ──

  const addLogEntry = (text) => {
    setState(prev => ({
      ...prev,
      log: [{ round: prev.round, turn: prev.turn, text }, ...prev.log].slice(0, 50)
    }));
  };

  const handleReset = () => {
    setState(prev => ({
      ...prev,
      round: 1, turn: 1, currentInit: null,
      selectedId: null, targetIds: [], actedInits: [], skippedIds: [],
      log: [],
      status: 'new',
      pcs: prev.pcs.map(p => ({ ...p, hp: p.hpInitial || p.hpMax || 10, effects: [], initiative: 0 })),
      monsters: prev.monsters.map(m => ({ ...m, hp: m.hpInitial || m.hpMax || 10, effects: [], initiative: 0 })),
      environment: { ...prev.environment, effects: [] }
    }));
    setNumpadTarget(null);
    setNumpadTyping(false);
    setUndoStack([]);
    setAddMonsterMode(null);
    setAddMonsterForm({ name: '', hp: '', qty: '1' });
    setSelectedTemplate(null);
    setBestiarySearch('');
    setSaveToBestiaryId(null);
    setSaveToBestiarySystem('sys-generico');
    setAddNpcForm(null);
    setDiceHistory([]);
    setLastRoll(null);
    setDiceBuffer('');
  };

  const handleEnvEffectClick = (effectIdx) => {
    setState(prev => {
      const effects = [];
      for (let i = 0; i < prev.environment.effects.length; i++) {
        if (i !== effectIdx) { effects.push(prev.environment.effects[i]); continue; }
        const e = prev.environment.effects[i];
        if (e.rounds === 0 || e.rounds === 1) continue;
        effects.push({ ...e, rounds: e.rounds - 1 });
      }
      return { ...prev, environment: { ...prev.environment, effects } };
    });
  };

  const handleAddEnvEffect = (name, rounds) => {
    setState(prev => ({
      ...prev,
      environment: {
        ...prev.environment,
        effects: [...prev.environment.effects, { name, rounds }]
      }
    }));
    addLogEntry(`Ambiente: ${name} aggiunto${rounds > 0 ? ` (${rounds}r)` : ''}`);
  };

  // ── Dice ──

  const buildDiceLogText = useCallback((result) => {
    const selected = allCombatants.find(c => c.id === state.selectedId);
    const targets = state.targetIds.map(tid => allCombatants.find(c => c.id === tid)).filter(Boolean);
    let text = '';
    if (selected) text += selected.name + ' ';
    if (result.attrKey) {
      text += result.attrKey;
      if (result.attrDesc) text += ` (${result.attrDesc})`;
      text += ' ';
    }
    if (targets.length > 0) text += '→ ' + targets.map(t => t.name).join(', ') + ': ';
    else if (selected) text += ': ';
    text += formatDiceResult(result);
    return text;
  }, [state.selectedId, state.targetIds, allCombatants]);

  const pushDiceResult = useCallback((result) => {
    const now = Date.now();
    setDiceHistory(prev => {
      const needsSeparator = prev.length > 0 && !prev[0]?.separator && (now - lastDiceTime > 3000);
      const newHistory = needsSeparator
        ? [result, { separator: true }, ...prev]
        : [result, ...prev];
      return newHistory.slice(0, 20);
    });
    setLastRoll(result);
    setLastDiceTime(now);
    addLogEntry(buildDiceLogText(result));
  }, [lastDiceTime, buildDiceLogText]);

  const handleDiceRoll = useCallback((diceType) => {
    const count = (diceBuffer && parseInt(diceBuffer, 10) > 0) ? parseInt(diceBuffer, 10) : 1;
    const formula = `${count}d${diceType}`;
    const result = rollDice(formula);
    if (!result) return;
    pushDiceResult(result);
    setDiceBuffer('');
  }, [diceBuffer, pushDiceResult]);

  const handleDiceRollFormula = useCallback((formula, attrKey, attrDesc) => {
    const result = rollDice(formula);
    if (!result) return;
    result.attrKey = attrKey || null;
    result.attrDesc = attrDesc || null;
    pushDiceResult(result);
  }, [pushDiceResult]);

  // Find data for detail sheets
  const selectedPc = state.pcs.find(p => p.id === state.selectedId) || null;
  const selectedMon = state.monsters.find(m => m.id === state.selectedId) || null;
  const lastTargetMon = state.monsters.find(m => state.targetIds.includes(m.id)) || null;
  const lastTargetPc = state.pcs.find(p => state.targetIds.includes(p.id)) || null;
  const sheetPc = selectedPc || lastTargetPc;
  const sheetMon = selectedMon || lastTargetMon;

  const cardProps = (c, isPC) => ({
    c, isPC,
    isActive: c.id === state.selectedId,
    isTarget: state.targetIds.includes(c.id),
    isSkipped: (state.skippedIds || []).includes(c.id),
    currentInit: state.currentInit,
    hpSelected: numpadTarget?.id === c.id && numpadTarget?.field === 'hp',
    initSelected: numpadTarget?.id === c.id && numpadTarget?.field === 'init',
    canRemove: !c.sourceId,
    isNpc: c.type === 'npc',
    canToggleEnabled: !!c.sourceId,
    onSelect: handleSelect,
    onTargetToggle: handleTargetToggle,
    onHpChange: handleHpChange,
    onHpSelect: handleHpSelect,
    onSkipToggle: handleSkipToggle,
    onEffectClick: handleEffectClick,
    onRemove: handleRemoveCombatant,
    onToggleEnabled: handleToggleEnabled
  });

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'var(--overlay-dark)',
        zIndex: 3500, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100vw', height: '100vh',
          background: 'var(--bg-panel)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}
      >
        {/* Top Bar */}
        <TopBar encounterName={state.name} round={state.round} turn={state.turn} initMin={state.initMin} initMax={state.initMax} descending={state.descending} onRoundChange={handleRoundChange} onTurnChange={handleTurnChange} onInitRangeChange={handleInitRangeChange} onToggleDescending={handleToggleDescending} onRollMonsters={handleRollMonsters} onReset={handleReset} onBack={onBack} onComplete={onComplete} onClose={onClose} />

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* NumPad */}
          <NumPadCol
            hasTarget={!!numpadTarget}
            undoCount={undoStack.length}
            diceBuffer={diceBuffer}
            lastRoll={lastRoll}
            diceHistory={diceHistory}
            onModifier={handleNumpadModifier}
            onDigit={handleNumpadDigit}
            onClear={handleNumpadClear}
            onUndo={handleNumpadUndo}
            onDiceRoll={handleDiceRoll}
          />

          {/* Center: Init + PG + Mostri */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Environment Card */}
            <div style={{ padding: '6px 8px 0' }}>
              <EnvironmentCard environment={state.environment} onEffectClick={handleEnvEffectClick} onAddEffect={handleAddEnvEffect} />
            </div>

            {/* Column Headers */}
            <div style={{ display: 'flex', padding: '0 8px', gap: '0' }}>
              <div style={{ width: '24px', flexShrink: 0, fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textAlign: 'center', padding: '3px 0' }}>In</div>
              <div style={{ flex: 1, fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', padding: '3px 8px' }}>PG</div>
              <div style={{ flex: 1, fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', padding: '3px 8px' }}>Mostri</div>
            </div>

            {/* Initiative Bands (alive only) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
              {initBands.map(init => {
                const pcsInBand = state.pcs.filter(p => p.initiative === init && p.hp > 0 && p.enabled !== false);
                const monsInBand = state.monsters.filter(m => m.initiative === init && m.hp > 0);
                const isCurrentInit = init === state.currentInit;
                const hasActed = state.actedInits.includes(init);

                return (
                  <div key={init} style={{
                    display: 'flex', gap: '0',
                    borderBottom: '0.5px solid var(--border-subtle)',
                    minHeight: '36px'
                  }}>
                    {/* Init number */}
                    <div style={{
                      width: '24px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      position: 'relative', fontSize: '12px',
                      color: isCurrentInit ? 'var(--color-warning)' : 'var(--text-tertiary)',
                      fontWeight: isCurrentInit ? '600' : '400'
                    }}>
                      {isCurrentInit && (
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: '3px', background: 'var(--color-warning)', borderRadius: '0 2px 2px 0'
                        }} />
                      )}
                      {init}
                    </div>

                    {/* PG column */}
                    <div style={{ flex: 1, padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {pcsInBand.map(pc => (
                        <CombatantCard key={pc.id} {...cardProps(pc, true)} hasActed={hasActed} />
                      ))}
                    </div>

                    {/* Monster column */}
                    <div style={{ flex: 1, padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {monsInBand.map(mon => (
                        <CombatantCard key={mon.id} {...cardProps(mon, false)} hasActed={hasActed} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* KO section */}
              {hasDead && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 0 4px', borderBottom: '0.5px solid var(--border-subtle)'
                  }}>
                    <div style={{ width: '24px', flexShrink: 0, textAlign: 'center', fontSize: '10px', fontWeight: '600', color: 'var(--color-danger)' }}>KO</div>
                    <div style={{ flex: 1, height: '0.5px', background: 'var(--color-danger)', opacity: 0.3 }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0', minHeight: '36px' }}>
                    <div style={{ width: '24px', flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {deadPcs.map(pc => (
                        <CombatantCard key={pc.id} {...cardProps(pc, true)} hasActed={false} />
                      ))}
                    </div>
                    <div style={{ flex: 1, padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {deadMons.map(mon => (
                        <CombatantCard key={mon.id} {...cardProps(mon, false)} hasActed={false} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Disabled PCs section */}
              {state.pcs.some(p => p.enabled === false) && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 0 4px', borderBottom: '0.5px solid var(--border-subtle)'
                  }}>
                    <div style={{ width: '24px', flexShrink: 0, textAlign: 'center', fontSize: '10px', fontWeight: '600', color: 'var(--text-disabled)' }}>OFF</div>
                    <div style={{ flex: 1, height: '0.5px', background: 'var(--text-disabled)', opacity: 0.3 }} />
                  </div>
                  <div style={{ display: 'flex', gap: '0', minHeight: '36px' }}>
                    <div style={{ width: '24px', flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {state.pcs.filter(p => p.enabled === false).map(pc => (
                        <CombatantCard key={pc.id} {...cardProps(pc, true)} hasActed={false} />
                      ))}
                    </div>
                    <div style={{ flex: 1 }} />
                  </div>
                </>
              )}

              {/* Add NPC + Add monster */}
              <div style={{ display: 'flex', gap: '8px', padding: '8px', justifyContent: 'center' }}>
                {/* Add NPC */}
                {addNpcForm === null ? (
                  <span onClick={() => setAddNpcForm({ name: '', hp: '' })} style={{
                    fontSize: '11px', padding: '4px 14px', borderRadius: '4px',
                    border: '1px dashed var(--color-info)', color: 'var(--color-info)', cursor: 'pointer'
                  }}>+ NPC</span>
                ) : (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input autoFocus value={addNpcForm.name}
                      onChange={e => setAddNpcForm(prev => ({ ...prev, name: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddNpc(); if (e.key === 'Escape') setAddNpcForm(null); }}
                      placeholder="Nome NPC" style={{
                        width: '100px', padding: '4px 8px', fontSize: '12px', minHeight: '28px',
                        background: 'var(--bg-input)', border: '1px dashed var(--border-default)',
                        borderRadius: '4px', color: 'var(--text-primary)', outline: 'none'
                      }} />
                    <input value={addNpcForm.hp}
                      onChange={e => setAddNpcForm(prev => ({ ...prev, hp: e.target.value.replace(/\D/g, '') }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddNpc(); if (e.key === 'Escape') setAddNpcForm(null); }}
                      placeholder="HP" style={{
                        width: '45px', padding: '4px', fontSize: '12px', minHeight: '28px',
                        background: 'var(--bg-input)', border: '1px dashed var(--border-default)',
                        borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', textAlign: 'center'
                      }} />
                    <span onClick={handleAddNpc} style={{
                      fontSize: '11px', padding: '4px 8px', borderRadius: '4px',
                      background: 'var(--color-info-bg)', border: '1px solid var(--color-info)',
                      color: 'var(--color-info)', cursor: 'pointer', fontWeight: '500'
                    }}>OK</span>
                    <span onClick={() => setAddNpcForm(null)} style={{ fontSize: '14px', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}>✕</span>
                  </div>
                )}
              </div>

              {/* Add monster */}
              <div style={{ padding: '0 8px 8px' }}>
                {addMonsterMode === null && (
                  <div style={{ textAlign: 'center' }}>
                    <span onClick={() => setAddMonsterMode('choose')} style={{
                      fontSize: '11px', padding: '4px 14px', borderRadius: '4px',
                      border: '0.5px solid var(--color-info)', color: 'var(--color-info)', cursor: 'pointer'
                    }}>+ Aggiungi mostro</span>
                  </div>
                )}

                {addMonsterMode === 'choose' && (
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                    <span onClick={() => setAddMonsterMode('bestiary')} style={{
                      fontSize: '12px', padding: '6px 14px', borderRadius: '4px', minHeight: '36px',
                      border: '1px solid var(--accent)', color: 'var(--accent)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center'
                    }}>Da bestiario</span>
                    <span onClick={() => setAddMonsterMode('manual')} style={{
                      fontSize: '12px', padding: '6px 14px', borderRadius: '4px', minHeight: '36px',
                      border: '1px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center'
                    }}>Manuale</span>
                    <span onClick={() => setAddMonsterMode(null)} style={{
                      fontSize: '14px', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px'
                    }}>✕</span>
                  </div>
                )}

                {addMonsterMode === 'manual' && (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', justifyContent: 'center' }}>
                    <input autoFocus value={addMonsterForm.name}
                      onChange={e => setAddMonsterForm(prev => ({ ...prev, name: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddMonsterManual(); if (e.key === 'Escape') setAddMonsterMode(null); }}
                      placeholder="Nome" style={{
                        width: '120px', padding: '4px 8px', fontSize: '12px', minHeight: '28px',
                        background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                        borderRadius: '4px', color: 'var(--text-primary)', outline: 'none'
                      }} />
                    <input value={addMonsterForm.hp}
                      onChange={e => setAddMonsterForm(prev => ({ ...prev, hp: e.target.value.replace(/\D/g, '') }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddMonsterManual(); if (e.key === 'Escape') setAddMonsterMode(null); }}
                      placeholder="HP" style={{
                        width: '50px', padding: '4px 8px', fontSize: '12px', minHeight: '28px',
                        background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                        borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', textAlign: 'center'
                      }} />
                    <span onClick={handleAddMonsterManual} style={{
                      fontSize: '11px', padding: '4px 10px', borderRadius: '4px', minHeight: '28px',
                      background: 'var(--color-info-bg)', border: '1px solid var(--color-info)',
                      color: 'var(--color-info)', cursor: 'pointer', display: 'flex', alignItems: 'center', fontWeight: '500'
                    }}>Aggiungi</span>
                    <span onClick={() => setAddMonsterMode(null)} style={{ fontSize: '14px', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}>✕</span>
                  </div>
                )}

                {addMonsterMode === 'bestiary' && (
                  <div style={{ border: '1px solid var(--border-default)', borderRadius: '6px', overflow: 'hidden', maxWidth: '400px', margin: '0 auto' }}>
                    {!selectedTemplate ? (
                      <>
                        <input value={bestiarySearch}
                          autoFocus
                          onChange={e => setBestiarySearch(e.target.value)}
                          placeholder="Cerca nel bestiario..."
                          style={{
                            width: '100%', padding: '6px 10px', fontSize: '12px', boxSizing: 'border-box',
                            background: 'var(--bg-input)', border: 'none', borderBottom: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)', outline: 'none'
                          }} />
                        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                          {(bestiary || [])
                            .filter(b => !bestiarySearch || b.name.toLowerCase().includes(bestiarySearch.toLowerCase()))
                            .map(b => {
                              const hp = b.attributes.find(a => a.key.toLowerCase() === 'hp')?.value || '—';
                              return (
                                <div key={b.id} onClick={() => {
                                  setSelectedTemplate(b);
                                  const hpVal = b.attributes.find(a => a.key.toLowerCase() === 'hp')?.value || '';
                                  setAddMonsterForm({ name: b.name, hp: hpVal, qty: '1' });
                                }} style={{
                                  padding: '6px 10px', minHeight: '36px', cursor: 'pointer', fontSize: '12px',
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  borderBottom: '0.5px solid var(--border-subtle)'
                                }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <span style={{ color: 'var(--text-primary)' }}>{b.name}</span>
                                  <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{hp} HP</span>
                                </div>
                              );
                            })}
                          {(bestiary || []).length === 0 && (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-disabled)', fontSize: '11px', fontStyle: 'italic' }}>
                              Bestiario vuoto. Aggiungi mostri dalle Librerie.
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '6px', textAlign: 'center' }}>
                          <span onClick={() => setAddMonsterMode(null)} style={{ fontSize: '11px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>Annulla</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--accent)', marginBottom: '2px' }}>{selectedTemplate.name}</div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input value={addMonsterForm.name}
                            onChange={e => setAddMonsterForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Nome"
                            style={{
                              flex: 1, padding: '4px 8px', fontSize: '12px', minHeight: '28px',
                              background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                              borderRadius: '4px', color: 'var(--text-primary)', outline: 'none'
                            }} />
                          <input value={addMonsterForm.hp}
                            onChange={e => setAddMonsterForm(prev => ({ ...prev, hp: e.target.value.replace(/\D/g, '') }))}
                            placeholder="HP"
                            style={{
                              width: '50px', padding: '4px 8px', fontSize: '12px', minHeight: '28px',
                              background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                              borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', textAlign: 'center'
                            }} />
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>x</span>
                          <input value={addMonsterForm.qty}
                            onChange={e => setAddMonsterForm(prev => ({ ...prev, qty: e.target.value.replace(/\D/g, '') }))}
                            style={{
                              width: '36px', padding: '4px', fontSize: '12px', minHeight: '28px',
                              background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                              borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', textAlign: 'center'
                            }} />
                        </div>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <span onClick={() => { setSelectedTemplate(null); setBestiarySearch(''); }} style={{
                            fontSize: '11px', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px 8px'
                          }}>Indietro</span>
                          <span onClick={handleAddMonsterFromBestiary} style={{
                            fontSize: '11px', padding: '4px 12px', borderRadius: '4px',
                            background: 'var(--accent)', color: 'var(--bg-main)', cursor: 'pointer', fontWeight: '500'
                          }}>Aggiungi</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Conditions Row */}
            <ConditionsRow
              conditions={conditions || []}
              selectedId={state.selectedId}
              activeEffects={allCombatants.find(c => c.id === state.selectedId)?.effects || []}
              duration={state.conditionDuration ?? 3}
              onDurationChange={handleDurationChange}
              onApplyCondition={handleApplyCondition}
            />
          </div>

          {/* Detail Sheets (right column) */}
          <div style={{
            width: '220px', flexShrink: 0,
            borderLeft: '1px solid var(--border-default)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <DetailSheet title="Scheda PG" data={sheetPc} onDiceRoll={handleDiceRollFormula} />
            <div style={{ borderBottom: '1px solid var(--border-default)' }} />
            <DetailSheet
              title="Scheda mostro" data={sheetMon} isMonster={true}
              onSaveToBestiary={handleSaveToBestiary}
              saveToBestiaryId={saveToBestiaryId}
              onSaveToBestiaryStart={(id) => setSaveToBestiaryId(id)}
              saveToBestiarySystem={saveToBestiarySystem}
              onSaveToBestiarySystemChange={setSaveToBestiarySystem}
              gameSystems={gameSystems}
              onDiceRoll={handleDiceRollFormula}
            />
          </div>
        </div>

        {/* Combat Log */}
        <CombatLog log={state.log} />
      </div>
    </div>
  );
}

// ── Main Wrapper ──

const EMPTY_COMBAT_DATA = { encounters: [], activeEncounterId: null };

function createNewEncounter(name, description, players) {
  // Create PG combatants from project players
  const pcs = (players || []).filter(p => p.characterName).map(p => ({
    id: 'pc-' + p.id,
    sourceId: p.id,
    type: 'pc',
    name: p.characterName,
    hp: 10,
    hpMax: 10,
    hpInitial: 10,
    initiative: 0,
    effects: [],
    enabled: true,
    attributes: [],
    templateId: null,
    sheet: p.characterName + (p.playerName ? ` (${p.playerName})` : '') + '\nHP: da impostare'
  }));
  return {
    id: 'enc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name,
    description,
    status: 'new',
    pcs,
    monsters: [],
    environment: { name, effects: [] },
    log: [],
    round: 1,
    turn: 1,
    currentInit: null,
    selectedId: null,
    targetIds: [],
    actedInits: [],
    skippedIds: [],
    conditionDuration: 3,
    initMin: 0,
    initMax: 20,
    descending: true
  };
}

export default function CombatTrackerPanel({ combatData, onCombatDataChange, players, projectPath, librariesData, onLibrariesDataChange, onClose }) {
  const [data, setData] = useState(() => combatData || EMPTY_COMBAT_DATA);
  const initialRender = useRef(true);

  // Sync to parent
  useEffect(() => {
    if (initialRender.current) { initialRender.current = false; return; }
    onCombatDataChange?.(data);
  }, [data]);

  const activeEncounter = data.activeEncounterId
    ? data.encounters.find(e => e.id === data.activeEncounterId) || null
    : null;

  const handleCreateEncounter = (name, description) => {
    const enc = createNewEncounter(name, description, players);
    setData(prev => ({
      ...prev,
      encounters: [...prev.encounters, enc],
      activeEncounterId: enc.id
    }));
  };

  const handleOpenEncounter = (id) => {
    setData(prev => ({ ...prev, activeEncounterId: id }));
  };

  const handleDeleteEncounter = (id) => {
    setData(prev => ({
      ...prev,
      encounters: prev.encounters.filter(e => e.id !== id),
      activeEncounterId: prev.activeEncounterId === id ? null : prev.activeEncounterId
    }));
  };

  const handleEncounterChange = (updatedEncounter) => {
    setData(prev => ({
      ...prev,
      encounters: prev.encounters.map(e => e.id === updatedEncounter.id ? updatedEncounter : e)
    }));
  };

  const handleBack = () => {
    setData(prev => ({ ...prev, activeEncounterId: null }));
  };

  const handleComplete = () => {
    setData(prev => ({
      ...prev,
      encounters: prev.encounters.map(e =>
        e.id === prev.activeEncounterId ? { ...e, status: 'completed' } : e
      ),
      activeEncounterId: null
    }));
  };

  if (activeEncounter) {
    return (
      <CombatView
        key={activeEncounter.id}
        encounter={activeEncounter}
        onEncounterChange={handleEncounterChange}
        onBack={handleBack}
        onComplete={handleComplete}
        bestiary={(librariesData || { bestiary: [] }).bestiary}
        gameSystems={(librariesData || { gameSystems: [] }).gameSystems}
        conditions={(librariesData?.conditions?.length > 0) ? librariesData.conditions : DEFAULT_CONDITIONS_FALLBACK}
        onSaveToBestiary={(monster) => {
          const lib = librariesData || { gameSystems: [{ id: 'sys-generico', name: 'Generico' }], bestiary: [], conditions: [] };
          onLibrariesDataChange?.({ ...lib, bestiary: [...lib.bestiary, monster] });
        }}
        onClose={onClose}
      />
    );
  }

  return (
    <EncounterList
      encounters={data.encounters}
      onCreateEncounter={handleCreateEncounter}
      onOpenEncounter={handleOpenEncounter}
      onDeleteEncounter={handleDeleteEncounter}
      onClose={onClose}
    />
  );
}
