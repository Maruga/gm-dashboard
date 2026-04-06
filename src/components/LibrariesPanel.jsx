import React, { useState, useRef, useEffect } from 'react';

const TABS = [
  { id: 'bestiary', label: 'Bestiario' },
  { id: 'conditions', label: 'Condizioni' },
  { id: 'systems', label: 'Sistemi di gioco' }
];

const GENERICO_ID = 'sys-generico';

const DEFAULT_CONDITIONS = [
  { id: 'cond_01', name: 'Stordito', description: 'Non può effettuare azioni. Perde il proprio turno. Attacchi contro hanno vantaggio.', defaultDuration: 1, gameSystem: GENERICO_ID },
  { id: 'cond_02', name: 'Avvelenato', description: 'Svantaggio ai tiri per colpire e alle prove di caratteristica.', defaultDuration: 3, gameSystem: GENERICO_ID },
  { id: 'cond_03', name: 'Accecato', description: 'Non può vedere. Fallisce prove che richiedono la vista. Attacchi contro hanno vantaggio, i suoi svantaggio.', defaultDuration: 2, gameSystem: GENERICO_ID },
  { id: 'cond_04', name: 'Spaventato', description: 'Non può muoversi verso la fonte della paura. Svantaggio a prove e tiri per colpire.', defaultDuration: 3, gameSystem: GENERICO_ID },
  { id: 'cond_05', name: 'Paralizzato', description: 'Incapacitato, non può muoversi né parlare. Fallisce TS su Forza e Destrezza. Attacchi in mischia sono critici.', defaultDuration: 1, gameSystem: GENERICO_ID },
  { id: 'cond_06', name: 'Prono', description: 'A terra. Può solo strisciare. Svantaggio ai tiri per colpire. In mischia vantaggio contro, a distanza svantaggio.', defaultDuration: 0, gameSystem: GENERICO_ID },
  { id: 'cond_07', name: 'Afferrato', description: 'Velocità ridotta a 0. Termina se chi afferra è incapacitato.', defaultDuration: 0, gameSystem: GENERICO_ID },
  { id: 'cond_08', name: 'Invisibile', description: 'Impossibile da vedere. Vantaggio ai tiri per colpire, attacchi contro hanno svantaggio.', defaultDuration: 3, gameSystem: GENERICO_ID },
  { id: 'cond_09', name: 'Incosciente', description: 'Incapacitato, cade prono. Fallisce TS su Forza e Destrezza. Attacchi in mischia sono critici.', defaultDuration: 0, gameSystem: GENERICO_ID },
  { id: 'cond_10', name: 'Affascinato', description: 'Non può attaccare chi lo ha affascinato. Vantaggio alle interazioni sociali.', defaultDuration: 3, gameSystem: GENERICO_ID },
  { id: 'cond_11', name: 'Assordato', description: 'Non può sentire. Fallisce prove che richiedono l\'udito.', defaultDuration: 2, gameSystem: GENERICO_ID },
  { id: 'cond_12', name: 'Trattenuto', description: 'Velocità 0. Attacchi contro hanno vantaggio, i suoi svantaggio. Svantaggio ai TS su Destrezza.', defaultDuration: 0, gameSystem: GENERICO_ID },
  { id: 'cond_13', name: 'Rallentato', description: 'Velocità di movimento dimezzata.', defaultDuration: 3, gameSystem: GENERICO_ID },
  { id: 'cond_14', name: 'Confuso', description: 'Agisce in modo casuale. Può attaccare alleati o non fare nulla.', defaultDuration: 2, gameSystem: GENERICO_ID },
  { id: 'cond_15', name: 'Esausto', description: 'Penalità cumulative. Svantaggio alle prove di caratteristica.', defaultDuration: 0, gameSystem: GENERICO_ID },
  { id: 'cond_16', name: 'Pietrificato', description: 'Trasformato in sostanza solida. Peso x10. Incapacitato. Resistenza a tutti i danni.', defaultDuration: 0, gameSystem: GENERICO_ID }
];

const DEFAULT_LIBRARIES = {
  gameSystems: [{ id: GENERICO_ID, name: 'Generico' }],
  bestiary: [],
  conditions: DEFAULT_CONDITIONS
};

// ── Game Systems Tab ──
function GameSystemsTab({ systems, onAdd, onRename, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const confirmTimer = useRef(null);

  const startEdit = (sys) => {
    setEditingId(sys.id);
    setEditingName(sys.name);
  };

  const commitEdit = () => {
    if (editingId && editingName.trim()) {
      onRename(editingId, editingName.trim());
    } else if (editingId) {
      // Nome vuoto — rimuovi il sistema appena creato
      onDelete?.(editingId);
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    } else {
      setConfirmDeleteId(id);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const handleAdd = () => {
    const newId = 'sys-' + Date.now();
    onAdd(newId, '');
    setEditingId(newId);
    setEditingName('');
  };

  return (
    <div style={{ maxWidth: '400px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
        I sistemi di gioco raggruppano mostri e condizioni. "Generico" è sempre presente.
      </div>

      {/* List */}
      {systems.map(sys => {
        const isGenerico = sys.id === GENERICO_ID;
        const isEditing = editingId === sys.id;
        const isConfirming = confirmDeleteId === sys.id;

        return (
          <div key={sys.id} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 10px', minHeight: '36px',
            borderBottom: '0.5px solid var(--border-subtle)'
          }}>
            {isEditing ? (
              <input
                autoFocus
                value={editingName}
                onChange={e => setEditingName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') commitEdit(); }}
                onBlur={commitEdit}
                placeholder="Nome sistema..."
                style={{
                  flex: 1, padding: '4px 8px', fontSize: '13px', minHeight: '28px',
                  background: 'var(--bg-input)', border: '1px solid var(--accent)',
                  borderRadius: '4px', color: 'var(--text-primary)', outline: 'none'
                }}
              />
            ) : (
              <span
                onClick={() => !isGenerico && startEdit(sys)}
                style={{
                  flex: 1, fontSize: '13px',
                  color: isGenerico ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  fontStyle: isGenerico ? 'italic' : 'normal',
                  cursor: isGenerico ? 'default' : 'pointer'
                }}
              >{sys.name}</span>
            )}

            {!isGenerico && !isEditing && (
              <span
                onClick={() => handleDelete(sys.id)}
                style={{
                  fontSize: '11px', padding: '3px 10px', borderRadius: '3px',
                  color: isConfirming ? 'var(--color-danger)' : 'var(--text-tertiary)',
                  border: `1px solid ${isConfirming ? 'var(--color-danger)' : 'var(--border-subtle)'}`,
                  background: isConfirming ? 'var(--color-danger-bg)' : 'transparent',
                  cursor: 'pointer', fontWeight: isConfirming ? '600' : '400'
                }}
              >{isConfirming ? 'Sicuro?' : 'Cancella'}</span>
            )}
          </div>
        );
      })}

      {/* Add button */}
      <div
        onClick={handleAdd}
        style={{
          padding: '10px', marginTop: '8px', borderRadius: '6px',
          border: '1px dashed var(--accent)', color: 'var(--accent)',
          fontSize: '13px', fontWeight: '500', textAlign: 'center',
          cursor: 'pointer'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-a04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >+ Nuovo sistema</div>
    </div>
  );
}

// ── Bestiary helpers ──

function getGlobalSchema(bestiary, systemId) {
  const attrs = {};
  bestiary.filter(m => m.gameSystem === systemId).forEach(m => {
    m.attributes.filter(a => a.isGlobal).forEach(a => {
      if (!attrs[a.key]) attrs[a.key] = a.defaultValue || '';
    });
  });
  return Object.entries(attrs).map(([key, defaultValue]) => ({ key, description: '', value: defaultValue, isGlobal: true, defaultValue }));
}

function createNewMonster(systemId, bestiary) {
  const globalAttrs = getGlobalSchema(bestiary, systemId);
  return {
    id: 'beast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    name: '',
    gameSystem: systemId,
    attributes: globalAttrs.map(a => ({ ...a, value: a.defaultValue || '' })),
    notes: ''
  };
}

// ── Bestiary Form ──

function BestiaryForm({ monster, gameSystems, bestiary, onSave, onDuplicate, onDelete, onCancel }) {
  const [m, setM] = useState(monster);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimer = useRef(null);
  const saveTimer = useRef(null);
  const [dragIdx, setDragIdx] = useState(null);

  // Cleanup save timer on unmount
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const trimAndSave = (newM) => {
    if (!newM.name.trim()) return;
    onSave?.({
      ...newM,
      name: newM.name.trim(),
      attributes: newM.attributes.map(a => ({
        ...a,
        key: (a.key || '').trim(),
        value: (a.value || '').trim(),
        description: (a.description || '').trim(),
        defaultValue: (a.defaultValue || '').trim()
      }))
    });
  };

  // Auto-save with debounce (for typing)
  const autoSave = (newM) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => trimAndSave(newM), 500);
  };

  const update = (key, val) => {
    setM(prev => {
      const next = { ...prev, [key]: val };
      autoSave(next);
      return next;
    });
  };

  const updateAttr = (idx, key, val) => {
    setM(prev => {
      const next = { ...prev, attributes: prev.attributes.map((a, i) => i === idx ? { ...a, [key]: val } : a) };
      autoSave(next);
      return next;
    });
  };

  const trimAttr = (idx, key) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setM(prev => {
      const next = { ...prev, attributes: prev.attributes.map((a, i) => i === idx ? { ...a, [key]: (a[key] || '').trim() } : a) };
      trimAndSave(next);
      return next;
    });
  };

  const addAttr = () => {
    setM(prev => {
      const next = { ...prev, attributes: [...prev.attributes, { key: '', value: '', description: '', isGlobal: false, defaultValue: '' }] };
      autoSave(next);
      return next;
    });
  };

  const removeAttr = (idx) => {
    setM(prev => {
      const next = { ...prev, attributes: prev.attributes.filter((_, i) => i !== idx) };
      autoSave(next);
      return next;
    });
  };

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setM(prev => {
      const attrs = [...prev.attributes];
      const dragged = attrs.splice(dragIdx, 1)[0];
      attrs.splice(idx, 0, dragged);
      const next = { ...prev, attributes: attrs };
      autoSave(next);
      return next;
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const handleSystemChange = (newSystemId) => {
    const globalAttrs = getGlobalSchema(bestiary, newSystemId);
    const localAttrs = m.attributes.filter(a => !a.isGlobal);
    setM(prev => {
      const next = { ...prev, gameSystem: newSystemId, attributes: [...globalAttrs.map(a => ({ ...a, value: a.defaultValue || '' })), ...localAttrs] };
      autoSave(next);
      return next;
    });
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 3000);
    } else {
      setConfirmDelete(false);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      onDelete?.(m.id);
    }
  };

  const inputStyle = {
    padding: '4px 8px', fontSize: '12px', minHeight: '28px',
    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
    borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
      {/* Nome */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '3px' }}>Nome</label>
        <input
          autoFocus
          value={m.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Nome mostro..."
          style={{ ...inputStyle, width: '100%' }}
        />
      </div>

      {/* Sistema */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '3px' }}>Sistema di gioco</label>
        <select
          value={m.gameSystem}
          onChange={e => handleSystemChange(e.target.value)}
          style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
        >
          {gameSystems.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Attributi */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px' }}>Attributi</label>
        {m.attributes.map((attr, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragEnd={handleDragEnd}
            style={{
              display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '5px',
              padding: '4px', borderRadius: '4px',
              background: dragIdx === i ? 'var(--accent-a04)' : 'transparent',
              border: dragIdx === i ? '1px dashed var(--accent)' : '1px solid transparent'
            }}
          >
            {/* Drag handle */}
            <div style={{
              cursor: 'grab', flexShrink: 0, color: 'var(--text-disabled)',
              fontSize: '14px', padding: '4px 2px', userSelect: 'none', touchAction: 'none'
            }}>⠿</div>
            {/* Nome attributo */}
            <input
              value={attr.key}
              onChange={e => updateAttr(i, 'key', e.target.value)}
              onBlur={() => trimAttr(i, 'key')}
              placeholder="Attributo"
              style={{ ...inputStyle, width: '130px' }}
            />
            {/* Descrizione */}
            <input
              value={attr.description || ''}
              onChange={e => updateAttr(i, 'description', e.target.value)}
              onBlur={() => trimAttr(i, 'description')}
              placeholder="Descrizione"
              style={{ ...inputStyle, width: '140px' }}
            />
            {/* Valore */}
            <input
              value={attr.value}
              onChange={e => updateAttr(i, 'value', e.target.value)}
              onBlur={() => trimAttr(i, 'value')}
              placeholder="Valore"
              style={{ ...inputStyle, flex: 1, color: /(\d+)d(\d+)/.test(attr.value) ? 'var(--color-info)' : 'var(--text-primary)' }}
            />
            {/* Default */}
            <input
              value={attr.defaultValue || ''}
              onChange={e => updateAttr(i, 'defaultValue', e.target.value)}
              onBlur={() => trimAttr(i, 'defaultValue')}
              placeholder="Default"
              title="Valore di default per nuovi mostri"
              style={{ ...inputStyle, width: '100px' }}
            />
            {/* Globale */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px',
              color: attr.isGlobal ? 'var(--accent)' : 'var(--text-tertiary)',
              cursor: 'pointer', flexShrink: 0, padding: '4px 2px'
            }}>
              <input
                type="checkbox"
                checked={attr.isGlobal}
                onChange={e => updateAttr(i, 'isGlobal', e.target.checked)}
                style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
              />
              Globale
            </label>
            {/* Remove */}
            <span onClick={() => removeAttr(i)} style={{
              fontSize: '16px', color: 'var(--text-tertiary)', cursor: 'pointer',
              padding: '4px 6px', flexShrink: 0
            }}>✕</span>
          </div>
        ))}
        <div onClick={addAttr} style={{
          fontSize: '12px', color: 'var(--color-info)', cursor: 'pointer', padding: '8px 0'
        }}>+ Aggiungi attributo</div>
      </div>

      {/* Note */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '3px' }}>Note</label>
        <textarea
          value={m.notes}
          onChange={e => update('notes', e.target.value)}
          placeholder="Note opzionali..."
          rows={3}
          style={{ ...inputStyle, width: '100%', resize: 'vertical' }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', paddingBottom: '16px' }}>
        <span onClick={() => onDuplicate?.(m)} style={{
          fontSize: '12px', padding: '6px 12px', borderRadius: '4px',
          border: '1px solid var(--border-default)', color: 'var(--text-secondary)', cursor: 'pointer'
        }}>Duplica</span>
        <span onClick={handleDelete} style={{
          fontSize: '12px', padding: '6px 12px', borderRadius: '4px',
          border: `1px solid ${confirmDelete ? 'var(--color-danger)' : 'var(--border-default)'}`,
          background: confirmDelete ? 'var(--color-danger-bg)' : 'transparent',
          color: confirmDelete ? 'var(--color-danger)' : 'var(--text-tertiary)',
          cursor: 'pointer', fontWeight: confirmDelete ? '600' : '400'
        }}>{confirmDelete ? 'Sicuro?' : 'Cancella'}</span>
        <div style={{ flex: 1 }} />
        <span onClick={onCancel} style={{
          fontSize: '12px', padding: '6px 12px', color: 'var(--text-tertiary)', cursor: 'pointer'
        }}>Chiudi</span>
      </div>
    </div>
  );
}

// ── Bestiary Tab ──

function BestiaryTab({ bestiary, gameSystems, onSave, onDelete }) {
  const [selectedId, setSelectedId] = useState(null);
  const [filterSystem, setFilterSystem] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [editingMonster, setEditingMonster] = useState(null);

  const filtered = bestiary.filter(m => {
    if (filterSystem !== 'all' && m.gameSystem !== filterSystem) return false;
    if (searchText && !m.name.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const handleSelect = (m) => {
    setSelectedId(m.id);
    setEditingMonster({ ...m, attributes: m.attributes.map(a => ({ ...a })) });
  };

  const handleNew = () => {
    const systemId = filterSystem !== 'all' ? filterSystem : GENERICO_ID;
    const m = createNewMonster(systemId, bestiary);
    setSelectedId(m.id);
    setEditingMonster(m);
  };

  const handleSave = (m) => {
    onSave(m);
    setSelectedId(m.id);
    setEditingMonster(m);
  };

  const handleDuplicate = (m) => {
    // Save original first if it has a name
    if (m.name.trim()) onSave(m);
    const dup = {
      ...m,
      id: 'beast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      name: (m.name || 'Mostro') + ' (copia)',
      attributes: m.attributes.map(a => ({ ...a }))
    };
    onSave(dup);
    setSelectedId(dup.id);
    setEditingMonster(dup);
  };

  const handleDelete = (id) => {
    onDelete(id);
    setSelectedId(null);
    setEditingMonster(null);
  };

  const handleCancel = () => {
    setSelectedId(null);
    setEditingMonster(null);
  };

  const getSystemName = (sysId) => gameSystems.find(s => s.id === sysId)?.name || 'Generico';
  const getHpValue = (m) => m.attributes.find(a => a.key.toLowerCase() === 'hp')?.value || '—';

  const inputStyle = {
    padding: '4px 8px', fontSize: '12px', minHeight: '28px',
    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
    borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{ display: 'flex', height: '100%', gap: '0' }}>
      {/* Left panel — list */}
      <div style={{
        width: '280px', flexShrink: 0, borderRight: '1px solid var(--border-default)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Filters */}
        <div style={{ padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <select
            value={filterSystem}
            onChange={e => setFilterSystem(e.target.value)}
            style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
          >
            <option value="all">Tutti i sistemi</option>
            {gameSystems.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Cerca mostro..."
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>

        {/* Monster list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-disabled)', fontSize: '12px', fontStyle: 'italic' }}>
              {bestiary.length === 0 ? 'Nessun mostro. Crea il primo.' : 'Nessun risultato.'}
            </div>
          )}
          {filtered.map(m => (
            <div
              key={m.id}
              onClick={() => handleSelect(m)}
              style={{
                padding: '6px 10px', minHeight: '36px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '0.5px solid var(--border-subtle)',
                background: selectedId === m.id ? 'var(--accent-a10)' : 'transparent'
              }}
              onMouseEnter={e => { if (selectedId !== m.id) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { if (selectedId !== m.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{getSystemName(m.gameSystem)}</div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: '8px' }}>
                {getHpValue(m)} HP
              </span>
            </div>
          ))}
        </div>

        {/* Add button */}
        <div
          onClick={handleNew}
          style={{
            padding: '10px', margin: '8px',  borderRadius: '6px',
            border: '1px dashed var(--accent)', color: 'var(--accent)',
            fontSize: '12px', fontWeight: '500', textAlign: 'center', cursor: 'pointer'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-a04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >+ Nuovo mostro</div>
      </div>

      {/* Right panel — form */}
      {editingMonster ? (
        <BestiaryForm
          key={editingMonster.id}
          monster={editingMonster}
          gameSystems={gameSystems}
          bestiary={bestiary}
          onSave={handleSave}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onCancel={handleCancel}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-disabled)', fontSize: '13px', fontStyle: 'italic' }}>
            Seleziona un mostro o creane uno nuovo
          </span>
        </div>
      )}
    </div>
  );
}

// ── Conditions Tab ──

function ConditionsTab({ conditions, gameSystems, onSave, onDelete }) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingCond, setEditingCond] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const confirmTimer = useRef(null);
  const saveTimer = useRef(null);

  const autoSave = (c) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (c.name.trim()) onSave?.({ ...c, name: c.name.trim(), description: (c.description || '').trim() });
    }, 500);
  };

  const handleSelect = (c) => {
    if (expandedId === c.id) {
      setExpandedId(null);
      setEditingCond(null);
    } else {
      setExpandedId(c.id);
      setEditingCond({ ...c });
    }
  };

  const updateField = (key, val) => {
    setEditingCond(prev => {
      const next = { ...prev, [key]: val };
      autoSave(next);
      return next;
    });
  };

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      if (expandedId === id) { setExpandedId(null); setEditingCond(null); }
    } else {
      setConfirmDeleteId(id);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const handleAdd = () => {
    const c = {
      id: 'cond-' + Date.now(),
      name: '',
      description: '',
      defaultDuration: 3,
      gameSystem: GENERICO_ID
    };
    onSave(c);
    setExpandedId(c.id);
    setEditingCond(c);
  };

  const getSystemName = (sysId) => gameSystems.find(s => s.id === sysId)?.name || 'Generico';

  const inputStyle = {
    width: '100%', padding: '4px 8px', fontSize: '12px', minHeight: '28px',
    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
    borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box'
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
        Condizioni applicabili ai combattenti. Click su una condizione per modificarla.
      </div>

      {conditions.map(c => {
        const isExpanded = expandedId === c.id;
        const isConfirming = confirmDeleteId === c.id;
        const editing = isExpanded && editingCond?.id === c.id ? editingCond : c;

        return (
          <div key={c.id} style={{
            borderBottom: '0.5px solid var(--border-subtle)',
            background: isExpanded ? 'var(--bg-elevated)' : 'transparent'
          }}>
            {/* Row */}
            <div onClick={() => handleSelect(c)} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', minHeight: '36px', cursor: 'pointer'
            }}>
              <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>{c.name || 'Senza nome'}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>{getSystemName(c.gameSystem)}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0, minWidth: '30px', textAlign: 'right' }}>
                {c.defaultDuration === 0 ? 'perm.' : `${c.defaultDuration} round`}
              </span>
              {!isExpanded && (
                <span onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '3px',
                  color: isConfirming ? 'var(--color-danger)' : 'var(--text-disabled)',
                  border: `1px solid ${isConfirming ? 'var(--color-danger)' : 'transparent'}`,
                  background: isConfirming ? 'var(--color-danger-bg)' : 'transparent',
                  cursor: 'pointer', fontWeight: isConfirming ? '600' : '400'
                }}>{isConfirming ? 'Sicuro?' : '✕'}</span>
              )}
            </div>

            {/* Expanded edit */}
            {isExpanded && editingCond && (
              <div style={{ padding: '4px 10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>Nome</label>
                    <input value={editing.name} onChange={e => updateField('name', e.target.value)}
                      onBlur={() => updateField('name', (editing.name || '').trim())}
                      placeholder="Nome condizione..." style={inputStyle} />
                  </div>
                  <div style={{ width: '140px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>Sistema</label>
                    <select value={editing.gameSystem} onChange={e => updateField('gameSystem', e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}>
                      {gameSystems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div style={{ width: '100px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>Durata</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" min="0" value={editing.defaultDuration}
                        onChange={e => updateField('defaultDuration', Math.max(0, parseInt(e.target.value, 10) || 0))}
                        style={{ ...inputStyle, width: '50px', textAlign: 'center' }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{editing.defaultDuration === 0 ? 'perm.' : 'round'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '2px' }}>Descrizione</label>
                  <textarea value={editing.description || ''} onChange={e => updateField('description', e.target.value)}
                    onBlur={() => updateField('description', (editing.description || '').trim())}
                    placeholder="Descrizione effetto..." rows={2}
                    style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} style={{
                    fontSize: '11px', padding: '4px 10px', borderRadius: '3px',
                    color: isConfirming ? 'var(--color-danger)' : 'var(--text-tertiary)',
                    border: `1px solid ${isConfirming ? 'var(--color-danger)' : 'var(--border-default)'}`,
                    background: isConfirming ? 'var(--color-danger-bg)' : 'transparent',
                    cursor: 'pointer', fontWeight: isConfirming ? '600' : '400'
                  }}>{isConfirming ? 'Sicuro?' : 'Cancella'}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div onClick={handleAdd} style={{
        padding: '10px', marginTop: '8px', borderRadius: '6px',
        border: '1px dashed var(--accent)', color: 'var(--accent)',
        fontSize: '13px', fontWeight: '500', textAlign: 'center', cursor: 'pointer'
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-a04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >+ Nuova condizione</div>
    </div>
  );
}

export default function LibrariesPanel({ librariesData, onLibrariesDataChange, onClose }) {
  const [activeTab, setActiveTab] = useState('bestiary');
  const [data, setData] = useState(() => {
    if (!librariesData) return DEFAULT_LIBRARIES;
    // Migrate: if conditions array is empty, populate with defaults
    if (!librariesData.conditions || librariesData.conditions.length === 0) {
      return { ...librariesData, conditions: DEFAULT_CONDITIONS };
    }
    return librariesData;
  });
  const initialRender = useRef(true);

  // Sync to parent
  useEffect(() => {
    if (initialRender.current) { initialRender.current = false; return; }
    onLibrariesDataChange(data);
  }, [data]);

  const updateData = (updater) => {
    setData(prev => typeof updater === 'function' ? updater(prev) : updater);
  };

  const handleAddSystem = (id, name) => {
    updateData(prev => ({ ...prev, gameSystems: [...prev.gameSystems, { id, name }] }));
  };

  const handleRenameSystem = (id, newName) => {
    updateData(prev => ({
      ...prev,
      gameSystems: prev.gameSystems.map(s => s.id === id ? { ...s, name: newName } : s)
    }));
  };

  const handleSaveMonster = (monster) => {
    updateData(prev => {
      const exists = prev.bestiary.some(m => m.id === monster.id);
      return {
        ...prev,
        bestiary: exists
          ? prev.bestiary.map(m => m.id === monster.id ? monster : m)
          : [...prev.bestiary, monster]
      };
    });
  };

  const handleDeleteMonster = (id) => {
    updateData(prev => ({ ...prev, bestiary: prev.bestiary.filter(m => m.id !== id) }));
  };

  const handleSaveCondition = (condition) => {
    updateData(prev => {
      const exists = prev.conditions.some(c => c.id === condition.id);
      return {
        ...prev,
        conditions: exists
          ? prev.conditions.map(c => c.id === condition.id ? condition : c)
          : [...prev.conditions, condition]
      };
    });
  };

  const handleDeleteCondition = (id) => {
    updateData(prev => ({ ...prev, conditions: prev.conditions.filter(c => c.id !== id) }));
  };

  const handleDeleteSystem = (id) => {
    if (id === GENERICO_ID) return;
    updateData(prev => ({
      ...prev,
      gameSystems: prev.gameSystems.filter(s => s.id !== id),
      bestiary: prev.bestiary.map(m => m.gameSystem === id ? { ...m, gameSystem: GENERICO_ID } : m),
      conditions: prev.conditions.map(c => c.gameSystem === id ? { ...c, gameSystem: GENERICO_ID } : c)
    }));
  };

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
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          WebkitAppRegion: 'no-drag'
        }}
      >
        {/* Header — drag region for window move */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px',
          padding: '8px 16px', borderBottom: '1px solid var(--border-default)',
          background: 'var(--bg-panel)', flexShrink: 0,
          WebkitAppRegion: 'drag'
        }}>
          <span onClick={onClose} style={{
            fontSize: '14px', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px 4px',
            userSelect: 'none', WebkitAppRegion: 'no-drag'
          }}>←</span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginRight: '8px' }}>
            Librerie
          </span>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '2px', WebkitAppRegion: 'no-drag' }}>
            {TABS.map(tab => (
              <div
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '5px 14px', fontSize: '12px', fontWeight: '500',
                  borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s',
                  background: activeTab === tab.id ? 'var(--accent-a10)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                  border: activeTab === tab.id ? '1px solid var(--accent)' : '1px solid transparent'
                }}
              >{tab.label}</div>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-tertiary)',
            fontSize: '16px', cursor: 'pointer', padding: '2px 6px',
            WebkitAppRegion: 'no-drag'
          }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '16px' }}>
          {activeTab === 'bestiary' && (
            <BestiaryTab
              bestiary={data.bestiary}
              gameSystems={data.gameSystems}
              onSave={handleSaveMonster}
              onDelete={handleDeleteMonster}
            />
          )}
          {activeTab === 'conditions' && (
            <ConditionsTab
              conditions={data.conditions}
              gameSystems={data.gameSystems}
              onSave={handleSaveCondition}
              onDelete={handleDeleteCondition}
            />
          )}
          {activeTab === 'systems' && (
            <GameSystemsTab
              systems={data.gameSystems}
              onAdd={handleAddSystem}
              onRename={handleRenameSystem}
              onDelete={handleDeleteSystem}
            />
          )}
        </div>
      </div>
    </div>
  );
}
