import React, { useState, useEffect, useRef } from 'react';

const TECHNOLOGIES = [
  { name: 'Electron', version: '40', desc: 'Framework desktop' },
  { name: 'React', version: '19', desc: 'UI library' },
  { name: 'Vite', version: '7', desc: 'Build tool' },
  { name: 'electron-store', version: '', desc: 'Persistenza dati' },
  { name: 'Howler.js', version: '', desc: 'Audio player' },
  { name: 'Marked', version: '', desc: 'Markdown renderer' },
  { name: 'Lucide React', version: '', desc: 'Icone' },
  { name: 'node-telegram-bot-api', version: '', desc: 'Integrazione Telegram' },
  { name: 'electron-builder', version: '', desc: 'Packaging & installer' },
  { name: 'electron-updater', version: '', desc: 'Aggiornamenti automatici' }
];

// Update check states
const UPDATE_IDLE = 'idle';
const UPDATE_CHECKING = 'checking';
const UPDATE_AVAILABLE = 'available';
const UPDATE_DOWNLOADED = 'downloaded';
const UPDATE_UP_TO_DATE = 'up-to-date';
const UPDATE_ERROR = 'error';

export default function InfoPanel({ onClose, onOpenSettings }) {
  const [version, setVersion] = useState('...');
  const [updateState, setUpdateState] = useState(UPDATE_IDLE);
  const [updateVersion, setUpdateVersion] = useState(null);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateError, setUpdateError] = useState(null);
  const [diagCopied, setDiagCopied] = useState(false);
  const panelRef = useRef(null);

  // Load version
  useEffect(() => {
    window.electronAPI?.getAppVersion?.().then(v => {
      if (v) setVersion(v);
    });
  }, []);

  // Listen for update events
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleAvailable = (data) => {
      setUpdateState(UPDATE_AVAILABLE);
      setUpdateVersion(data.version);
    };
    const handleDownloaded = (data) => {
      setUpdateState(UPDATE_DOWNLOADED);
      setUpdateVersion(data.version);
    };

    const handleProgress = (data) => {
      setUpdateProgress(data.percent);
    };
    const handleError = (data) => {
      setUpdateState(UPDATE_ERROR);
      setUpdateError(data.message);
    };

    window.electronAPI.onUpdateAvailable?.(handleAvailable);
    window.electronAPI.onUpdateProgress?.(handleProgress);
    window.electronAPI.onUpdateDownloaded?.(handleDownloaded);
    window.electronAPI.onUpdateError?.(handleError);
  }, []);

  const handleCheckUpdate = () => {
    if (!window.electronAPI?.checkForUpdates) return;
    setUpdateState(UPDATE_CHECKING);
    setUpdateError(null);
    window.electronAPI.checkForUpdates();

    // If no response in 10s, assume up-to-date
    setTimeout(() => {
      setUpdateState(prev => prev === UPDATE_CHECKING ? UPDATE_UP_TO_DATE : prev);
    }, 10000);
  };

  const handleInstall = () => {
    window.electronAPI?.installUpdate?.();
  };

  const sectionTitle = {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: 'var(--accent)',
    marginBottom: '12px',
    marginTop: '24px'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--overlay-dark)',
      zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={panelRef} style={{
        width: '480px', maxHeight: '80vh', background: 'var(--bg-panel)',
        border: '1px solid var(--border-default)', borderRadius: '8px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 16px 48px var(--shadow-dropdown)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <div style={{
              fontSize: '18px', fontWeight: '600', color: 'var(--accent)',
              fontFamily: "'Georgia', serif", letterSpacing: '2px'
            }}>
              限界 GM DASHBOARD
            </div>
            <div style={{
              fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px'
            }}>
              Versione {version}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-tertiary)',
            fontSize: '18px', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px',
            transition: 'color 0.2s'
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          >✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>

          {/* Description */}
          <p style={{
            fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6',
            marginTop: '16px', marginBottom: '0'
          }}>
            Strumento per Game Master — gestione documenti, personaggi, calendario,
            note, checklist, manuali di riferimento e comunicazione con i giocatori via Telegram.
          </p>

          {/* Credits */}
          <div style={sectionTitle}>Crediti</div>
          <div style={{
            background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
            borderRadius: '6px', padding: '12px 16px'
          }}>
            {[
              { role: 'Ideazione e design', name: 'Genkai' },
              { role: 'Sviluppo', name: 'Genkai + Claude AI' },
              { role: 'Temi e grafica', name: 'Genkai' }
            ].map((c, i, arr) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '4px 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{c.role}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>{c.name}</span>
              </div>
            ))}
          </div>

          {/* Technologies */}
          <div style={sectionTitle}>Tecnologie</div>
          <div style={{
            background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
            borderRadius: '6px', padding: '8px 16px'
          }}>
            {TECHNOLOGIES.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '4px 0',
                borderBottom: i < TECHNOLOGIES.length - 1 ? '1px solid var(--border-subtle)' : 'none'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: '600', minWidth: '140px' }}>
                  {t.name}{t.version ? ` ${t.version}` : ''}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{t.desc}</span>
              </div>
            ))}
          </div>

          {/* Updates */}
          <div style={sectionTitle}>Aggiornamenti</div>
          <div style={{
            background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
            borderRadius: '6px', padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
          }}>
            <div style={{ flex: 1 }}>
              {updateState === UPDATE_IDLE && (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Versione corrente: <strong style={{ color: 'var(--text-primary)' }}>v{version}</strong>
                </span>
              )}
              {updateState === UPDATE_CHECKING && (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Controllo aggiornamenti in corso...
                </span>
              )}
              {updateState === UPDATE_AVAILABLE && (
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--color-warning)' }}>
                    Versione <strong>v{updateVersion}</strong> — download in corso… {updateProgress}%
                  </span>
                  <div style={{
                    marginTop: '6px', height: '4px', borderRadius: '2px',
                    background: 'var(--border-subtle)', overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%', borderRadius: '2px',
                      background: 'var(--accent)',
                      width: `${updateProgress}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              )}
              {updateState === UPDATE_DOWNLOADED && (
                <span style={{ fontSize: '12px', color: 'var(--color-success)' }}>
                  Versione <strong>v{updateVersion}</strong> pronta per l'installazione.
                </span>
              )}
              {updateState === UPDATE_UP_TO_DATE && (
                <span style={{ fontSize: '12px', color: 'var(--color-success)' }}>
                  Sei aggiornato all'ultima versione.
                </span>
              )}
              {updateState === UPDATE_ERROR && (
                <span style={{ fontSize: '12px', color: 'var(--color-danger)' }}>
                  Errore: {updateError || 'impossibile verificare aggiornamenti'}
                </span>
              )}
            </div>

            {updateState === UPDATE_DOWNLOADED ? (
              <button onClick={handleInstall} style={{
                background: 'none', border: '1px solid var(--color-success)',
                borderRadius: '4px', padding: '6px 14px',
                color: 'var(--color-success)', fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-success)'; e.currentTarget.style.color = 'var(--bg-main)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-success)'; }}
              >
                Riavvia e aggiorna
              </button>
            ) : (
              <button
                onClick={handleCheckUpdate}
                disabled={updateState === UPDATE_CHECKING}
                style={{
                  background: 'none', border: '1px solid var(--border-default)',
                  borderRadius: '4px', padding: '6px 14px',
                  color: updateState === UPDATE_CHECKING ? 'var(--text-disabled)' : 'var(--accent)',
                  fontSize: '12px', fontWeight: '600',
                  cursor: updateState === UPDATE_CHECKING ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}
                onMouseEnter={e => { if (updateState !== UPDATE_CHECKING) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-elevated)'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.background = 'none'; }}
              >
                {updateState === UPDATE_CHECKING ? '⏳ Controllo...' : 'Controlla aggiornamenti'}
              </button>
            )}
          </div>

          {/* Diagnostics */}
          <div style={sectionTitle}>Diagnostica</div>
          <div style={{
            background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
            borderRadius: '6px', padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
          }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Copia le informazioni di sistema per il supporto
            </span>
            <button
              onClick={async () => {
                try {
                  const diag = await window.electronAPI.getDiagnostics();
                  const lines = [
                    `GENKAI GM Dashboard — Diagnostica`,
                    `──────────────────────────────`,
                    `Versione: ${diag.appVersion}`,
                    `Electron: ${diag.electron}`,
                    `Chrome: ${diag.chrome}`,
                    `Node: ${diag.node}`,
                    `OS: ${diag.platform} ${diag.osVersion} (${diag.arch})`,
                    `Locale: ${diag.locale}`,
                    `Schermo: ${diag.screen}`,
                    `Percorso app: ${diag.installPath}`,
                    `Dati utente: ${diag.userData}`,
                    `Dev mode: ${diag.isDev}`
                  ];
                  if (diag.log?.length > 0) {
                    lines.push(`──────────────────────────────`);
                    lines.push(`Log (ultimi ${diag.log.length} eventi):`);
                    diag.log.forEach(e => lines.push(`  [${e.time}] ${e.type}: ${e.msg}`));
                  }
                  lines.push(`──────────────────────────────`);
                  lines.push(`Data: ${new Date().toISOString()}`);
                  const text = lines.join('\n');
                  await navigator.clipboard.writeText(text);
                  setDiagCopied(true);
                  setTimeout(() => setDiagCopied(false), 2000);
                } catch (err) {
                  console.error('Diagnostics copy failed:', err);
                }
              }}
              style={{
                background: 'none',
                border: `1px solid ${diagCopied ? 'var(--color-success)' : 'var(--border-default)'}`,
                borderRadius: '4px', padding: '6px 14px',
                color: diagCopied ? 'var(--color-success)' : 'var(--accent)',
                fontSize: '12px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
              onMouseEnter={e => { if (!diagCopied) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-elevated)'; } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = diagCopied ? 'var(--color-success)' : 'var(--border-default)'; e.currentTarget.style.background = 'none'; }}
            >
              {diagCopied ? 'Copiato!' : 'Copia diagnostica'}
            </button>
          </div>

          {/* Open settings link */}
          {onOpenSettings && (
            <div
              onClick={() => { onClose(); onOpenSettings(); }}
              style={{
                marginTop: '20px', textAlign: 'center',
                fontSize: '12px', color: 'var(--text-tertiary)',
                cursor: 'pointer', transition: 'color 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
            >
              ⚙️ Apri Impostazioni
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
