import React, { useMemo } from 'react';

function scoreColor(v) {
  if (v <= -2) return 'var(--color-danger-bright)';
  if (v === -1) return 'var(--color-warning)';
  if (v === 0) return 'var(--text-disabled)';
  if (v === 1) return 'var(--color-success)';
  return 'var(--color-success-bright)';
}

const thStyle = {
  padding: '6px 10px', textAlign: 'left', color: 'var(--text-tertiary)',
  fontWeight: '600', fontSize: '0.85em', textTransform: 'uppercase', letterSpacing: '1px'
};
const tdStyle = { padding: '6px 10px', color: 'var(--text-primary)' };

export default function RelationsView({ pngName, relationsBase, relationsSession, fontSize }) {
  const pgNames = useMemo(() => {
    const names = new Set();
    const base = relationsBase[pngName];
    if (base) Object.keys(base).forEach(n => names.add(n));
    const session = relationsSession[pngName];
    if (session) Object.keys(session).forEach(n => names.add(n));
    return [...names].sort((a, b) => a.localeCompare(b, 'it'));
  }, [pngName, relationsBase, relationsSession]);

  const getRelation = (pgName) => {
    const session = relationsSession[pngName]?.[pgName];
    if (session) return session;
    const base = relationsBase[pngName]?.[pgName];
    if (base) return base;
    return { value: 0, note: '' };
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px 20px', color: 'var(--text-primary)', fontSize: `calc(${fontSize || 15}px * var(--font-size-scale, 1))` }}>
      <div style={{
        fontSize: '1em', fontWeight: '600', color: 'var(--accent)',
        marginBottom: '12px', letterSpacing: '0.5px'
      }}>
        {pngName}
      </div>
      {pgNames.length === 0 ? (
        <div style={{ fontSize: '0.8em', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
          Nessuna relazione
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8em' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <th style={thStyle}>PG</th>
              <th style={{ ...thStyle, textAlign: 'center', width: '60px' }}>Valore</th>
              <th style={thStyle}>Nota</th>
            </tr>
          </thead>
          <tbody>
            {pgNames.map(pg => {
              const rel = getRelation(pg);
              const color = scoreColor(rel.value);
              return (
                <tr key={pg} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ ...tdStyle, fontWeight: '500' }}>{pg}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: color, flexShrink: 0
                      }} />
                      <span style={{ fontWeight: '700', color }}>
                        {rel.value > 0 ? '+' : ''}{rel.value}
                      </span>
                    </span>
                  </td>
                  <td style={{
                    ...tdStyle,
                    color: rel.note ? 'var(--text-secondary)' : 'var(--text-disabled)',
                    fontStyle: rel.note ? 'normal' : 'italic', fontSize: '0.9em'
                  }}>
                    {rel.note || '\u2014'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
