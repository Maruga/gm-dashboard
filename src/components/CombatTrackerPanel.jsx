import React, { useState, useEffect, useRef, useMemo } from 'react';

// ── Mock Data ──
const mockPCs = [
  { id: 'pc1', name: 'Kael il Guerriero', hp: 32, hpMax: 45, initiative: 18, effects: [],
    sheet: 'Classe: Guerriero Lv.5\nHP: 32/45\nCA: 16\nTHAC0: 16\nAtt: Spada lunga 1d8+2\nTS: Morte 11, Bacch. 12\nNote: Resist. veleno' },
  { id: 'pc2', name: 'Lyra Maga', hp: 18, hpMax: 22, initiative: 13, effects: [{ name: 'Avvelenato', rounds: 2 }],
    sheet: 'Classe: Maga Lv.4\nHP: 18/22\nCA: 12\nTHAC0: 19\nAtt: Bastone 1d4\nInc: Dardo incantato, Scudo, Sonno' },
  { id: 'pc3', name: 'Dorin Chierico', hp: 8, hpMax: 28, initiative: 10,
    effects: [{ name: 'Stordito', rounds: 1 }, { name: 'Prono', rounds: 0 }, { name: 'Cieco', rounds: 3 }],
    sheet: 'Classe: Chierico Lv.4\nHP: 8/28\nCA: 14\nTHAC0: 18\nAtt: Mazza 1d6+1\nInc: Cura ferite leggere, Benedizione' },
  { id: 'pc4', name: 'Finn Ladro', hp: 0, hpMax: 20, initiative: 5, effects: [],
    sheet: 'Classe: Ladro Lv.3\nHP: 0/20\nCA: 13\nTHAC0: 19\nAtt: Pugnale 1d4+2\nAbilità: Scassinare, Nascondersi, Backstab x2' }
];

const mockMonsters = [
  { id: 'mon1', name: 'Necromante', hp: 45, hpMax: 45, initiative: 15, effects: [],
    sheet: 'Tipo: Umano\nHP: 45/45\nCA: 11\nTHAC0: 17\nAtt: Bastone 1d4 / Raggio necrotico 2d6\nInc: Animare morti, Tocco gelido, Scudo\nNote: Concentrazione su animazione scheletri' },
  { id: 'mon2', name: 'Scheletro 1', hp: 8, hpMax: 12, initiative: 13,
    effects: [{ name: 'Stordito', rounds: 1 }],
    sheet: 'Tipo: Non-morto\nHP: 8/12\nCA: 13\nTHAC0: 19\nAtt: Artiglio 1d6\nImmun: Veleno, Sonno\nVuln: Contundente\nNote: Rianima in 1d4r se necromante vivo' },
  { id: 'mon3', name: 'Scheletro 2', hp: 12, hpMax: 12, initiative: 13, effects: [],
    sheet: 'Tipo: Non-morto\nHP: 12/12\nCA: 13\nTHAC0: 19\nAtt: Artiglio 1d6\nImmun: Veleno, Sonno\nVuln: Contundente' },
  { id: 'mon4', name: 'Scheletro 3', hp: 12, hpMax: 12, initiative: 8, effects: [],
    sheet: 'Tipo: Non-morto\nHP: 12/12\nCA: 13\nTHAC0: 19\nAtt: Artiglio 1d6\nImmun: Veleno, Sonno\nVuln: Contundente' },
  { id: 'mon5', name: 'Scheletro 4', hp: 0, hpMax: 12, initiative: 8, effects: [],
    sheet: 'Tipo: Non-morto\nHP: 0/12\nCA: 13\nTHAC0: 19\nAtt: Artiglio 1d6\nImmun: Veleno, Sonno\nVuln: Contundente\nNote: Distrutto' }
];

const mockEnvironment = {
  name: 'Cripta sotterranea',
  effects: [{ name: 'Buio', rounds: 0 }, { name: 'Acqua', rounds: 0 }, { name: 'Veleno nell\'aria', rounds: 2 }]
};

const mockLog = [
  { round: 3, turn: 3, text: 'Lyra lancia Dardo incantato su Scheletro 1 — 7 danni — Scheletro 1: 8/12 HP' },
  { round: 3, turn: 2, text: 'Necromante lancia Raggio Necrotico su Dorin — 6 danni — Dorin: 8/28 HP' },
  { round: 3, turn: 1, text: 'Kael attacca Scheletro 1 — Taglio — 4 danni — Scheletro 1: 12/12→8/12 HP' },
  { round: 2, turn: 5, text: 'Scheletro 3 attacca Finn — 12 danni — Finn: 0/20 HP — KO' },
  { round: 2, turn: 4, text: 'Dorin usa Cura su sé stesso — +8 HP — Dorin: 14/28 HP' },
  { round: 2, turn: 3, text: 'Lyra applica Avvelenato a Scheletro 1 — 3 round' }
];

// ── Initial State ──
const INITIAL_STATE = {
  pcs: mockPCs,
  monsters: mockMonsters,
  environment: mockEnvironment,
  log: mockLog,
  round: 3,
  turn: 3,
  currentInit: 13,
  selectedId: 'pc2',
  targetIds: ['mon2'],
  actedInits: [18, 15],
  initMin: 0,
  initMax: 20,
  descending: true
};

const CONDITIONS = ['Stordito', 'Avvelenato', 'Accecato', 'Spaventato', 'Paralizzato', 'Prono', 'Afferrato', 'Invisibile', 'Incosciente'];

// ── Helpers ──
function hpColor(hp, hpMax) {
  const pct = hpMax > 0 ? hp / hpMax : 0;
  if (pct > 0.5) return 'var(--color-success)';
  if (pct > 0.25) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function getInitBands() {
  const all = [...mockPCs, ...mockMonsters];
  const initSet = new Set(all.map(c => c.initiative));
  return [...initSet].sort((a, b) => b - a); // discendente
}

// ── Sub-components ──

function TopBar({ round, turn, onClose }) {
  const stepperStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
    borderRadius: '4px', padding: '2px 6px', fontSize: '12px'
  };
  const stepBtn = {
    background: 'none', border: 'none', color: 'var(--text-tertiary)',
    fontSize: '13px', cursor: 'pointer', padding: '0 2px', lineHeight: 1
  };
  const labelStyle = { fontSize: '11px', color: 'var(--text-tertiary)', marginRight: '4px' };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '6px 12px', borderBottom: '1px solid var(--border-default)',
      background: 'var(--bg-panel)', flexShrink: 0
    }}>
      <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)', marginRight: '8px' }}>
        Combat Tracker
      </span>

      {/* Round + Turno */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0',
        border: '1px solid var(--border-default)', borderRadius: '4px', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}>
          <span style={labelStyle}>Round</span>
          <span style={stepBtn}>−</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', minWidth: '16px', textAlign: 'center' }}>{round}</span>
          <span style={stepBtn}>+</span>
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px' }}>
          <span style={labelStyle}>Turno</span>
          <span style={stepBtn}>−</span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-warning)', minWidth: '16px', textAlign: 'center' }}>{turn}</span>
          <span style={stepBtn}>+</span>
        </div>
      </div>

      {/* Init Range */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={labelStyle}>Init</span>
        <div style={stepperStyle}>
          <span style={stepBtn}>−</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>0</span>
          <span style={stepBtn}>+</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-disabled)' }}>a</span>
        <div style={stepperStyle}>
          <span style={stepBtn}>−</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>20</span>
          <span style={stepBtn}>+</span>
        </div>
      </div>

      {/* Disc/Asc */}
      <div style={{
        fontSize: '11px', padding: '3px 8px', borderRadius: '4px',
        background: 'var(--color-info-bg)', color: 'var(--color-info)',
        border: '1px solid var(--color-info)', cursor: 'pointer', fontWeight: '500'
      }}>
        Disc.
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Azioni */}
      <button style={{
        background: 'none', border: '1px solid var(--color-info)',
        borderRadius: '4px', padding: '3px 10px', fontSize: '11px',
        color: 'var(--color-info)', cursor: 'pointer', fontWeight: '500'
      }}>Roll mostri</button>

      <button style={{
        background: 'none', border: '1px solid var(--color-danger)',
        borderRadius: '4px', padding: '3px 10px', fontSize: '11px',
        color: 'var(--color-danger)', cursor: 'pointer', fontWeight: '500'
      }}>Reset</button>

      {/* Close */}
      <button onClick={onClose} style={{
        background: 'none', border: 'none', color: 'var(--text-tertiary)',
        fontSize: '16px', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px',
        transition: 'color 0.15s'
      }}>✕</button>
    </div>
  );
}

function NumPadCol({ hasTarget, undoCount, onModifier, onDigit, onClear, onUndo }) {
  const modStyle = (color) => ({
    fontSize: '11px', color, cursor: hasTarget ? 'pointer' : 'default',
    padding: '1px 0', textAlign: 'center', lineHeight: '1.5',
    opacity: hasTarget ? 1 : 0.4
  });
  const keyStyle = {
    fontSize: '11px', textAlign: 'center', padding: '3px 0',
    borderRadius: '3px', background: 'var(--bg-main)',
    border: '0.5px solid var(--border-subtle)',
    cursor: hasTarget ? 'pointer' : 'default',
    color: hasTarget ? 'var(--text-primary)' : 'var(--text-disabled)',
    lineHeight: '1.6'
  };

  return (
    <div style={{
      width: '50px', background: 'var(--bg-elevated)', borderRight: '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 4px', gap: '2px',
      flexShrink: 0, overflowY: 'auto'
    }}>
      {/* Undo */}
      <div
        onClick={onUndo}
        style={{
          fontSize: '11px', color: undoCount > 0 ? 'var(--color-info)' : 'var(--text-disabled)',
          cursor: undoCount > 0 ? 'pointer' : 'default', marginBottom: '4px'
        }}
      >undo{undoCount > 0 ? ` (${undoCount})` : ''}</div>
      <div style={{ width: '100%', borderTop: '0.5px solid var(--border-subtle)', marginBottom: '4px' }} />

      {/* Negativi */}
      {[-10, -5, -3, -2, -1].map(v => (
        <div key={v} onClick={() => hasTarget && onModifier?.(v)} style={modStyle('var(--color-danger)')}>
          {v === -10 ? <b>{v}</b> : v}
        </div>
      ))}

      {/* Zero */}
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500', padding: '2px 0' }}>0</div>

      {/* Positivi */}
      {[1, 2, 3, 5, 10].map(v => (
        <div key={v} onClick={() => hasTarget && onModifier?.(v)} style={modStyle('var(--color-success)')}>
          {v === 10 ? <b>+{v}</b> : `+${v}`}
        </div>
      ))}

      <div style={{ width: '100%', borderTop: '0.5px solid var(--border-subtle)', margin: '4px 0' }} />

      {/* Tastierino — scrive direttamente negli HP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', width: '100%' }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <div key={n} onClick={() => hasTarget && onDigit?.(n)} style={keyStyle}>{n}</div>
        ))}
        <div onClick={() => hasTarget && onDigit?.(0)} style={keyStyle}>0</div>
        <div onClick={() => hasTarget && onClear?.()} style={{ ...keyStyle, fontSize: '13px', color: 'var(--color-danger)' }}>&#9003;</div>
      </div>
    </div>
  );
}

function CombatantCard({ c, isPC, isActive, isTarget, hasActed, currentInit, hpSelected, onSelect, onTargetToggle, onHpChange, onHpSelect }) {
  const isDead = c.hp <= 0;
  const selected = isActive && !isDead;
  const hpC = hpColor(c.hp, c.hpMax);

  // Determine card style based on priority
  let borderLeft = 'none';
  let bg = 'transparent';
  let opacity = 1;
  let textDeco = 'none';

  if (isDead) {
    opacity = 0.35;
    textDeco = 'line-through';
    bg = 'var(--bg-elevated)';
  } else if (hasActed) {
    opacity = 0.4;
    bg = 'var(--bg-elevated)';
  }

  if (!isDead) {
    // Initiative turn indicator (base layer)
    if (c.initiative === currentInit && !hasActed) {
      borderLeft = '3px solid var(--color-warning)';
      bg = 'var(--color-warning-bg)';
    }
    // Target overrides background only (keeps warning border if on current init)
    if (isTarget) {
      bg = 'var(--color-danger-bg)';
      if (c.initiative !== currentInit || hasActed) {
        borderLeft = '3px solid var(--color-danger)';
      }
    }
    // Selected overrides everything
    if (selected) {
      borderLeft = '3px solid var(--color-success)';
      bg = 'var(--color-success-bg)';
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '6px',
      padding: '4px 6px', borderRadius: '3px',
      border: borderLeft === 'none' ? '0.5px solid var(--border-subtle)' : 'none',
      borderLeft, background: bg, opacity,
      cursor: 'pointer', transition: 'all 0.15s'
    }}>
      {/* Target checkbox */}
      <div
        onClick={(e) => { e.stopPropagation(); onTargetToggle?.(c.id); }}
        style={{
          width: '11px', height: '11px', borderRadius: '2px', flexShrink: 0, marginTop: '2px',
          border: isTarget ? '1.5px solid var(--color-danger)' : '1.5px solid var(--text-tertiary)',
          background: isTarget ? 'var(--color-danger)' : 'transparent'
        }}
      />

      {/* Name + effects */}
      <div style={{ flex: 1, minWidth: 0 }} onClick={() => onSelect?.(c.id)}>
        <div style={{
          fontSize: '12px', fontWeight: '500', textDecoration: textDeco,
          color: isDead ? 'var(--text-secondary)' : 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {c.name}
        </div>
        {c.effects.length > 0 && !isDead && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '2px' }}>
            {c.effects.map((e, i) => (
              <span key={i} style={{
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

      {/* HP — show + on dead for revive, full controls on alive */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, gap: '0'
      }}>
        <div
          onClick={(e) => { e.stopPropagation(); onHpChange?.(c.id, 1); }}
          style={{
            fontSize: '20px', color: 'var(--text-tertiary)', cursor: 'pointer',
            lineHeight: 1, padding: '2px 6px', userSelect: 'none'
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
              lineHeight: 1, padding: '2px 6px', userSelect: 'none'
            }}
          >−</div>
        )}
      </div>

      {/* Skip button */}
      {!isDead && (
        <div style={{
          width: '14px', height: '14px', borderRadius: '50%',
          border: '0.5px solid var(--border-subtle)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '9px', color: 'var(--text-tertiary)', cursor: 'pointer', marginTop: '1px'
        }}>S</div>
      )}
    </div>
  );
}

function EnvironmentCard() {
  const tagColor = (effect) => {
    if (effect.name === 'Buio') return { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' };
    if (effect.name === 'Acqua') return { bg: 'var(--color-info-bg)', color: 'var(--color-info)' };
    return { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' };
  };

  return (
    <div style={{
      padding: '5px 10px', background: 'var(--color-info-bg)',
      border: '0.5px solid var(--color-info)', borderRadius: '4px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '8px', marginBottom: '6px'
    }}>
      <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-info)', whiteSpace: 'nowrap' }}>
        {mockEnvironment.name}
      </span>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
        {mockEnvironment.effects.map((e, i) => {
          const tc = tagColor(e);
          return (
            <span key={i} style={{
              fontSize: '11px', padding: '1px 5px', borderRadius: '3px',
              background: tc.bg, color: tc.color, cursor: 'pointer', whiteSpace: 'nowrap'
            }}>
              {e.name}{e.rounds > 0 ? ` ${e.rounds}r` : ''}
            </span>
          );
        })}
        <span style={{
          fontSize: '11px', padding: '1px 5px', borderRadius: '3px',
          border: '0.5px solid var(--color-info)', color: 'var(--color-info)',
          cursor: 'pointer'
        }}>+</span>
      </div>
    </div>
  );
}

function ConditionsRow() {
  return (
    <div style={{
      borderTop: '0.5px solid var(--border-subtle)',
      padding: '5px 8px', display: 'flex', alignItems: 'center',
      gap: '6px', flexWrap: 'wrap'
    }}>
      <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', marginRight: '2px' }}>
        Condizioni:
      </span>
      {CONDITIONS.map(c => (
        <span key={c} style={{
          fontSize: '11px', padding: '1px 5px', borderRadius: '4px',
          border: '0.5px solid var(--color-warning)', color: 'var(--color-warning)',
          cursor: 'pointer'
        }}>{c}</span>
      ))}
      <span style={{
        fontSize: '11px', padding: '1px 5px', borderRadius: '4px',
        border: '0.5px solid var(--color-info)', color: 'var(--color-info)',
        cursor: 'pointer'
      }}>+ Custom</span>

      <div style={{ flex: 1 }} />

      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Durata:</span>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
        borderRadius: '4px', padding: '1px 5px', fontSize: '11px'
      }}>
        <span style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }}>−</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: '500', minWidth: '14px', textAlign: 'center' }}>3</span>
        <span style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }}>+</span>
      </div>
      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>round</span>
    </div>
  );
}

function DetailSheet({ title, data }) {
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
            {data.sheet.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </>
        ) : (
          <div style={{ color: 'var(--text-disabled)', fontStyle: 'italic' }}>Nessuna selezione</div>
        )}
      </div>
    </div>
  );
}

function CombatLog() {
  const last = mockLog[0];
  return (
    <div style={{
      borderTop: '1px solid var(--border-default)',
      background: 'var(--bg-elevated)', padding: '5px 12px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0, fontSize: '11px'
    }}>
      <div>
        <span style={{ color: 'var(--text-tertiary)' }}>R{last.round} T{last.turn}</span>
        <span style={{ color: 'var(--text-secondary)' }}> — {last.text}</span>
      </div>
      <span style={{ color: 'var(--text-tertiary)', cursor: 'pointer', marginLeft: '12px', flexShrink: 0 }}>espandi</span>
    </div>
  );
}

// ── Main Component ──
export default function CombatTrackerPanel({ combatData, onCombatDataChange, onClose }) {
  const [state, setState] = useState(() => combatData || INITIAL_STATE);
  const initialRender = useRef(true);
  const [numpadTarget, setNumpadTarget] = useState(null); // { id, field: 'hp' }
  const [numpadTyping, setNumpadTyping] = useState(false); // true after first digit typed
  const [undoStack, setUndoStack] = useState([]); // max 5 entries: [{ id, field, value }]

  // Sync state to parent for persistence across close/reopen (skip first render)
  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    onCombatDataChange?.(state);
  }, [state]);

  const allCombatants = useMemo(() => [...state.pcs, ...state.monsters], [state.pcs, state.monsters]);

  const initBands = useMemo(() => {
    const alivePcs = state.pcs.filter(p => p.hp > 0);
    const aliveMons = state.monsters.filter(m => m.hp > 0);
    const alive = [...alivePcs, ...aliveMons];
    const initSet = new Set(alive.map(c => c.initiative));
    const sorted = [...initSet].sort((a, b) => state.descending ? b - a : a - b);
    return sorted;
  }, [state.pcs, state.monsters, state.descending]);

  const deadPcs = useMemo(() => state.pcs.filter(p => p.hp <= 0), [state.pcs]);
  const deadMons = useMemo(() => state.monsters.filter(m => m.hp <= 0), [state.monsters]);
  const hasDead = deadPcs.length > 0 || deadMons.length > 0;

  // ── Handlers ──

  const handleSelect = (id) => {
    setState(prev => ({ ...prev, selectedId: prev.selectedId === id ? null : id }));
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

  const pushUndo = (id, value) => {
    setUndoStack(prev => [{ id, field: 'hp', value }, ...prev].slice(0, 5));
  };

  const handleHpChange = (id, delta) => {
    const c = allCombatants.find(x => x.id === id);
    if (!c) return;
    pushUndo(id, c.hp);
    updateCombatantHp(id, c.hp + delta);
  };

  const handleHpSelect = (id) => {
    if (numpadTarget?.id === id && numpadTarget?.field === 'hp') {
      setNumpadTarget(null);
      setNumpadTyping(false);
    } else {
      setNumpadTarget({ id, field: 'hp' });
      setNumpadTyping(false);
      const c = allCombatants.find(x => x.id === id);
      if (c) pushUndo(id, c.hp);
    }
  };

  const handleNumpadModifier = (delta) => {
    if (!numpadTarget) return;
    const c = allCombatants.find(x => x.id === numpadTarget.id);
    if (!c) return;
    pushUndo(c.id, c.hp);
    updateCombatantHp(c.id, c.hp + delta);
    setNumpadTyping(false);
  };

  const handleNumpadDigit = (digit) => {
    if (!numpadTarget) return;
    const c = allCombatants.find(x => x.id === numpadTarget.id);
    if (!c) return;
    let newStr;
    if (!numpadTyping) {
      // First digit: replace HP entirely
      newStr = String(digit);
      setNumpadTyping(true);
    } else {
      // Subsequent digits: append
      newStr = String(c.hp) + String(digit);
    }
    const newHp = parseInt(newStr, 10) || 0;
    updateCombatantHp(c.id, newHp);
  };

  const handleNumpadClear = () => {
    if (!numpadTarget) return;
    const c = allCombatants.find(x => x.id === numpadTarget.id);
    if (!c) return;
    const currentStr = String(c.hp);
    if (currentStr.length <= 1) {
      updateCombatantHp(c.id, 0);
    } else {
      updateCombatantHp(c.id, parseInt(currentStr.slice(0, -1), 10));
    }
  };

  const handleNumpadUndo = () => {
    if (undoStack.length === 0) return;
    const [last, ...rest] = undoStack;
    updateCombatantHp(last.id, last.value);
    setUndoStack(rest);
  };

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
    currentInit: state.currentInit,
    hpSelected: numpadTarget?.id === c.id && numpadTarget?.field === 'hp',
    onSelect: handleSelect,
    onTargetToggle: handleTargetToggle,
    onHpChange: handleHpChange,
    onHpSelect: handleHpSelect
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
        <TopBar round={state.round} turn={state.turn} onClose={onClose} />

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* NumPad */}
          <NumPadCol
            hasTarget={!!numpadTarget}
            undoCount={undoStack.length}
            onModifier={handleNumpadModifier}
            onDigit={handleNumpadDigit}
            onClear={handleNumpadClear}
            onUndo={handleNumpadUndo}
          />

          {/* Center: Init + PG + Mostri */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Environment Card */}
            <div style={{ padding: '6px 8px 0' }}>
              <EnvironmentCard />
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
                const pcsInBand = state.pcs.filter(p => p.initiative === init && p.hp > 0);
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

              {/* Add monster button */}
              <div style={{ textAlign: 'center', padding: '8px' }}>
                <span style={{
                  fontSize: '11px', padding: '2px 10px', borderRadius: '4px',
                  border: '0.5px solid var(--color-info)', color: 'var(--color-info)',
                  cursor: 'pointer'
                }}>+ Aggiungi mostro</span>
              </div>
            </div>

            {/* Conditions Row */}
            <ConditionsRow />
          </div>

          {/* Detail Sheets (right column) */}
          <div style={{
            width: '220px', flexShrink: 0,
            borderLeft: '1px solid var(--border-default)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <DetailSheet title="Scheda PG" data={sheetPc} />
            <div style={{ borderBottom: '1px solid var(--border-default)' }} />
            <DetailSheet title="Scheda mostro" data={sheetMon} />
          </div>
        </div>

        {/* Combat Log */}
        <CombatLog />
      </div>
    </div>
  );
}
