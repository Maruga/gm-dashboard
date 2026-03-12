import React, { useState, useEffect, useCallback, useRef } from 'react';

const LANG_LABELS = { it: '🇮🇹', en: '🇬🇧', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪' };

// ── Overlay principale ──
export default function AdventuresPanel({ onClose, onProjectOpen, projectPath, projectSettings }) {
  const [tab, setTab] = useState('download');

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'var(--overlay-dark)',
        zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '85vw', height: '85vh',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header + tabs */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: 'var(--bg-elevated)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)', letterSpacing: '1px' }}>
              Avventure
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <TabBtn label="📥 Scarica" active={tab === 'download'} onClick={() => setTab('download')} />
              <TabBtn label="📤 Le mie pubblicazioni" active={tab === 'publish'} onClick={() => setTab('publish')} />
            </div>
          </div>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '16px' }}>✕</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {tab === 'download' && (
            <DownloadTab onProjectOpen={onProjectOpen} onClose={onClose} />
          )}
          {tab === 'publish' && (
            <PublishTab projectPath={projectPath} projectSettings={projectSettings} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab button ──
function TabBtn({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--accent-a15)' : 'none',
        border: '1px solid',
        borderColor: active ? 'var(--accent)' : 'transparent',
        borderRadius: '4px',
        padding: '5px 14px',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        fontSize: '12px', fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.15s'
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--accent)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
    >
      {label}
    </button>
  );
}

// ── Tab SCARICA (catalogo) ──
function DownloadTab({ onProjectOpen, onClose }) {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null); // adventure id
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    window.electronAPI.adventureFetchCatalog().then(res => {
      if (res.error) setError(res.error);
      else setCatalog(res);
    });
  }, []);

  useEffect(() => {
    const handler = (data) => setProgress(data);
    window.electronAPI.onAdventureProgress?.(handler);
    return () => window.electronAPI.removeAdventureListeners?.();
  }, []);

  const handleDownload = async (adventure) => {
    setDownloading(adventure.id);
    setProgress(null);
    const result = await window.electronAPI.adventureDownload(adventure.downloadUrl, adventure.name);
    setDownloading(null);
    setProgress(null);
    if (result && !result.error && !result.canceled && result.path) {
      // Add to recent projects
      await window.electronAPI.addRecentProject({
        path: result.path,
        name: result.name,
        lastOpened: new Date().toISOString()
      });
      onProjectOpen(result.path, result.name);
      onClose();
    }
  };

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Impossibile caricare il catalogo. Verifica la connessione.
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-disabled)', marginTop: '8px' }}>{error}</div>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
        Caricamento catalogo...
      </div>
    );
  }

  const adventures = catalog.adventures || [];

  if (adventures.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-disabled)', fontSize: '13px', fontStyle: 'italic' }}>
        Nessuna avventura disponibile nel catalogo.
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px'
      }}>
        {adventures.map(a => (
          <div key={a.id} style={{
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '16px 18px',
            background: 'var(--bg-main)',
            display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
            {/* Title row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                {a.name}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-disabled)', flexShrink: 0, marginLeft: '8px' }}>
                v{a.version}
              </span>
            </div>

            {/* System + author */}
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {a.system && <span style={{ color: 'var(--accent)' }}>{a.system}</span>}
              {a.system && a.author && ' · '}
              {a.author}
            </div>

            {/* Description */}
            {a.description && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {a.description}
              </div>
            )}

            {/* Meta row */}
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {a.players && <span>👥 {a.players}</span>}
              {a.duration && <span>⏱ {a.duration}</span>}
              {a.size && <span>📦 {a.size}</span>}
              {a.language && <span>{LANG_LABELS[a.language] || a.language}</span>}
            </div>

            {/* Tags */}
            {a.tags && a.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {a.tags.map(t => (
                  <span key={t} style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                    background: 'var(--accent-a10)', color: 'var(--accent)', fontWeight: '500'
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Download button */}
            <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
              {downloading === a.id ? (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {progress?.phase === 'download' && `Scaricamento... ${progress.percent || 0}%`}
                  {progress?.phase === 'extracting' && 'Estrazione...'}
                  {!progress && 'Preparazione...'}
                </div>
              ) : (
                <button
                  onClick={() => handleDownload(a)}
                  disabled={!!downloading}
                  style={{
                    background: 'none', border: '1px solid var(--accent)', borderRadius: '4px',
                    padding: '6px 14px', color: downloading ? 'var(--text-disabled)' : 'var(--accent)',
                    fontSize: '12px', fontWeight: '600', cursor: downloading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { if (!downloading) { e.currentTarget.style.background = 'var(--accent-a10)'; } }}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  📥 Scarica e apri
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab LE MIE PUBBLICAZIONI ──
function PublishTab({ projectPath, projectSettings }) {
  const [ghToken, setGhToken] = useState('');
  const [ghUser, setGhUser] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [publishResult, setPublishResult] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [unpublishing, setUnpublishing] = useState(null);

  // Load token + verify + fetch catalog
  useEffect(() => {
    (async () => {
      const token = await window.electronAPI.githubGetToken?.();
      if (!token) return;
      setGhToken(token);
      const verify = await window.electronAPI.githubVerifyToken(token);
      if (verify.valid) {
        setGhUser(verify.username);
        const cat = await window.electronAPI.adventureFetchCatalog();
        if (!cat.error) setCatalog(cat);
      }
    })();
  }, []);

  useEffect(() => {
    const handler = (data) => setProgress(data);
    window.electronAPI.onAdventureProgress?.(handler);
    return () => window.electronAPI.removeAdventureListeners?.();
  }, []);

  const myAdventures = catalog?.adventures?.filter(a => a.authorGithub === ghUser) || [];

  const handleUnpublish = async (adventure) => {
    if (!window.confirm(`Rimuovere "${adventure.name}" dal catalogo?`)) return;
    setUnpublishing(adventure.id);
    const result = await window.electronAPI.adventureUnpublish(adventure.id);
    setUnpublishing(null);
    if (result.success) {
      setCatalog(prev => ({
        ...prev,
        adventures: prev.adventures.filter(a => a.id !== adventure.id)
      }));
    }
  };

  if (!ghToken) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Per pubblicare avventure serve un account GitHub.
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Configura il token in ⚙️ Impostazioni → sezione GitHub.
        </div>
      </div>
    );
  }

  if (!ghUser) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
        Verifica token in corso...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', overflowY: 'auto', height: '100%' }}>
      {/* Publish new button */}
      {projectPath && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setWizardOpen(true)}
            disabled={publishing}
            style={{
              background: 'none', border: '1px solid var(--accent)', borderRadius: '6px',
              padding: '10px 20px', color: 'var(--accent)', fontSize: '13px', fontWeight: '600',
              cursor: publishing ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={e => { if (!publishing) e.currentTarget.style.background = 'var(--accent-a10)'; }}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            📤 Pubblica nuova avventura
          </button>
        </div>
      )}

      {!projectPath && (
        <div style={{
          padding: '12px 16px', background: 'var(--bg-main)', border: '1px solid var(--border-subtle)',
          borderRadius: '6px', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px'
        }}>
          Apri un progetto per poter pubblicare un'avventura.
        </div>
      )}

      {/* My published adventures */}
      <div style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--accent)', marginBottom: '12px' }}>
        Le mie avventure pubblicate ({myAdventures.length})
      </div>

      {myAdventures.length === 0 && (
        <div style={{ color: 'var(--text-disabled)', fontSize: '12px', fontStyle: 'italic' }}>
          Nessuna avventura pubblicata.
        </div>
      )}

      {myAdventures.map(a => (
        <div key={a.id} style={{
          border: '1px solid var(--border-default)', borderRadius: '6px',
          padding: '12px 16px', marginBottom: '10px', background: 'var(--bg-main)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{a.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              v{a.version} · {a.size} · {a.publishedAt}
            </div>
          </div>
          <button
            onClick={() => handleUnpublish(a)}
            disabled={unpublishing === a.id}
            style={{
              background: 'none', border: '1px solid var(--color-danger-bg)', borderRadius: '4px',
              padding: '4px 12px', color: 'var(--color-danger)', fontSize: '11px',
              cursor: unpublishing === a.id ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-danger-bg)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            {unpublishing === a.id ? '...' : '🗑️ Rimuovi'}
          </button>
        </div>
      ))}

      {/* Publish wizard */}
      {wizardOpen && (
        <PublishWizard
          projectPath={projectPath}
          projectSettings={projectSettings}
          onClose={() => { setWizardOpen(false); setPublishResult(null); }}
          onPublished={() => {
            // Refresh catalog
            window.electronAPI.adventureFetchCatalog().then(cat => {
              if (!cat.error) setCatalog(cat);
            });
          }}
        />
      )}
    </div>
  );
}

// ── Publish Wizard ──
function PublishWizard({ projectPath, projectSettings, onClose, onPublished }) {
  const [step, setStep] = useState(1);
  const [meta, setMeta] = useState({
    name: projectSettings?.projectName || '',
    system: projectSettings?.system || '',
    author: projectSettings?.author || '',
    version: projectSettings?.adventureVersion || '1.0',
    description: projectSettings?.description || '',
    players: projectSettings?.players || '',
    duration: projectSettings?.duration || '',
    language: projectSettings?.language || 'it',
    tags: projectSettings?.tags || ''
  });
  const [exportResult, setExportResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [publishError, setPublishError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const handler = (data) => setProgress(data);
    window.electronAPI.onAdventureProgress?.(handler);
    return () => window.electronAPI.removeAdventureListeners?.();
  }, []);

  const handleExport = async () => {
    const metadata = {
      ...meta,
      tags: typeof meta.tags === 'string' ? meta.tags.split(',').map(t => t.trim()).filter(Boolean) : meta.tags
    };
    const result = await window.electronAPI.adventureExport(projectPath, metadata, true);
    if (result.error) {
      setPublishError(result.error);
      return;
    }
    setExportResult(result);
    setStep(3);
  };

  const handlePublish = async () => {
    setPublishError(null);
    setProgress(null);
    const result = await window.electronAPI.adventurePublish(exportResult.zipPath, exportResult.metadata);
    if (result.error) {
      setPublishError(result.error);
      return;
    }
    setDone(true);
    onPublished();
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
    borderRadius: '4px', color: 'var(--text-primary)', fontSize: '13px',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
  };

  const labelStyle = { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'var(--overlay-medium)',
        zIndex: 3500, display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: '520px', maxHeight: '80vh', background: 'var(--bg-panel)',
        border: '1px solid var(--border-default)', borderRadius: '8px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border-default)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: 'var(--bg-elevated)'
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)' }}>
            Pubblica avventura — Step {step}/3
          </span>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '16px' }}>✕</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* Step 1: Metadata */}
          {step === 1 && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Nome avventura *</label>
                <input value={meta.name} onChange={e => setMeta(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Sistema</label>
                <input value={meta.system} onChange={e => setMeta(p => ({ ...p, system: e.target.value }))} style={inputStyle} placeholder="es. GENKAI 限界 v1.2" />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Autore *</label>
                <input value={meta.author} onChange={e => setMeta(p => ({ ...p, author: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Versione *</label>
                  <input value={meta.version} onChange={e => setMeta(p => ({ ...p, version: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Giocatori</label>
                  <input value={meta.players} onChange={e => setMeta(p => ({ ...p, players: e.target.value }))} style={inputStyle} placeholder="3-5" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Durata</label>
                  <input value={meta.duration} onChange={e => setMeta(p => ({ ...p, duration: e.target.value }))} style={inputStyle} placeholder="60-90 min" />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Descrizione *</label>
                <textarea value={meta.description} onChange={e => setMeta(p => ({ ...p, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Lingua</label>
                  <select value={meta.language} onChange={e => setMeta(p => ({ ...p, language: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' }}>
                    <option value="it">Italiano</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>Tag (virgola)</label>
                  <input value={meta.tags} onChange={e => setMeta(p => ({ ...p, tags: e.target.value }))} style={inputStyle} placeholder="investigativo, giappone" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  onClick={() => { if (meta.name && meta.author && meta.version && meta.description) setStep(2); }}
                  disabled={!meta.name || !meta.author || !meta.version || !meta.description}
                  style={{
                    background: 'none', border: '1px solid var(--accent)', borderRadius: '4px',
                    padding: '8px 20px', color: (!meta.name || !meta.author || !meta.version || !meta.description) ? 'var(--text-disabled)' : 'var(--accent)',
                    fontSize: '13px', fontWeight: '600',
                    cursor: (!meta.name || !meta.author || !meta.version || !meta.description) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Avanti →
                </button>
              </div>
            </>
          )}

          {/* Step 2: Create package */}
          {step === 2 && (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                {!exportResult && !publishError && (
                  <>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      Creazione pacchetto in corso...
                    </div>
                    {/* Auto-start export */}
                    <AutoExport onExport={handleExport} />
                  </>
                )}
                {exportResult && (
                  <>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📦</div>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Pacchetto pronto: <strong>{exportResult.sizeMB} MB</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                      <button
                        onClick={() => setStep(3)}
                        style={{
                          background: 'none', border: '1px solid var(--accent)', borderRadius: '4px',
                          padding: '8px 20px', color: 'var(--accent)', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                        }}
                      >
                        Pubblica →
                      </button>
                    </div>
                  </>
                )}
                {publishError && (
                  <div style={{ fontSize: '12px', color: 'var(--color-danger)' }}>❌ {publishError}</div>
                )}
              </div>
            </>
          )}

          {/* Step 3: Upload */}
          {step === 3 && (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                {done ? (
                  <>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                    <div style={{ fontSize: '14px', color: 'var(--color-success)' }}>
                      Avventura pubblicata! Ora è disponibile nel catalogo.
                    </div>
                    <div style={{ marginTop: '20px' }}>
                      <button onClick={onClose} style={{
                        background: 'none', border: '1px solid var(--accent)', borderRadius: '4px',
                        padding: '8px 20px', color: 'var(--accent)', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                      }}>
                        Chiudi
                      </button>
                    </div>
                  </>
                ) : publishError ? (
                  <div style={{ fontSize: '12px', color: 'var(--color-danger)' }}>❌ {publishError}</div>
                ) : (
                  <>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      {progress?.phase === 'creating-release' && 'Creazione release...'}
                      {progress?.phase === 'uploading' && `Upload... ${progress.percent || 0}%`}
                      {progress?.phase === 'updating-catalog' && 'Aggiornamento catalogo...'}
                      {!progress && 'Pubblicazione in corso...'}
                    </div>
                    {progress?.phase === 'uploading' && (
                      <div style={{
                        height: '4px', borderRadius: '2px', background: 'var(--border-default)',
                        overflow: 'hidden', maxWidth: '300px', margin: '0 auto'
                      }}>
                        <div style={{
                          height: '100%', width: `${progress.percent || 0}%`,
                          background: 'var(--accent)', transition: 'width 0.2s'
                        }} />
                      </div>
                    )}
                    <AutoPublish onPublish={handlePublish} />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to auto-trigger export on mount
function AutoExport({ onExport }) {
  const called = useRef(false);
  useEffect(() => {
    if (!called.current) { called.current = true; onExport(); }
  }, [onExport]);
  return null;
}

// Helper to auto-trigger publish on mount
function AutoPublish({ onPublish }) {
  const called = useRef(false);
  useEffect(() => {
    if (!called.current) { called.current = true; onPublish(); }
  }, [onPublish]);
  return null;
}
