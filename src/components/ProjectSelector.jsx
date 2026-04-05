import React, { useState, useEffect, useCallback } from 'react';

export default function ProjectSelector({ onProjectOpen, onOpenAdventures }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState('');
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);

  useEffect(() => {
    window.electronAPI.getRecentProjects().then(p => {
      setProjects(p || []);
      setLoading(false);
    });
    window.electronAPI.getAppVersion().then(v => setVersion(v));
  }, []);

  const handleOpenFolder = useCallback(async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
      const name = folderPath.split('/').pop();
      onProjectOpen(folderPath, name);
    }
  }, [onProjectOpen]);

  const handleImportZip = useCallback(async () => {
    const result = await window.electronAPI.adventureImportFromFile();
    if (result && !result.error && result.path) {
      onProjectOpen(result.path, result.name);
    }
  }, [onProjectOpen]);

  const handleRemove = useCallback(async (e, projectPath) => {
    e.stopPropagation();
    const updated = await window.electronAPI.removeRecentProject(projectPath);
    setProjects(updated);
  }, []);

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      WebkitAppRegion: 'drag'
    }}>
      {/* Top-right: settings + window controls */}
      <div style={{
        position: 'fixed',
        top: '12px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        WebkitAppRegion: 'no-drag'
      }}>
        <button
          onClick={() => setShowGlobalSettings(true)}
          title="Impostazioni globali"
          style={{
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '4px 10px',
            color: 'var(--text-tertiary)',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'all 0.2s',
            marginRight: '8px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--accent)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <span style={{ fontSize: '14px' }}>&#9881;</span>
          Impostazioni
        </button>
        <WinBtn icon="─" onClick={() => window.electronAPI?.windowMinimize()} />
        <WinBtn icon="□" onClick={() => window.electronAPI?.windowMaximize()} />
        <WinBtn icon="✕" onClick={() => window.electronAPI?.windowClose()} isClose />
      </div>

      <div style={{ WebkitAppRegion: 'no-drag', maxWidth: '560px', width: '100%', padding: '0 24px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{
            fontSize: '36px',
            fontWeight: '600',
            color: 'var(--accent)',
            letterSpacing: '6px',
            fontFamily: "'Georgia', serif",
            marginBottom: '8px'
          }}>
            限界
          </div>
          <div style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            letterSpacing: '4px',
            textTransform: 'uppercase'
          }}>
            GM Dashboard
          </div>
          {version && <div style={{
            fontSize: '11px',
            color: 'var(--text-disabled)',
            marginTop: '6px'
          }}>
            v{version}
          </div>}
        </div>

        {/* Action buttons row */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '32px' }}>
          <SelectorBtn icon="📂" label="Apri cartella..." onClick={handleOpenFolder} primary />
          <SelectorBtn icon="📦" label="Importa da file" onClick={handleImportZip} />
          <SelectorBtn icon="🌐" label="Avventure online" onClick={onOpenAdventures} />
        </div>

        {/* Recent projects */}
        {projects.length > 0 && (
          <>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--text-tertiary)',
              marginBottom: '12px'
            }}>
              Progetti recenti
            </div>

            <div style={{
              maxHeight: '340px',
              overflowY: 'auto',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)'
            }}>
              {projects.map((project, i) => (
                <div
                  key={project.path}
                  onClick={() => onProjectOpen(project.path, project.name)}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: i < projects.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                      fontWeight: '500',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {project.name}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      gap: '12px'
                    }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {project.path}
                      </span>
                      <span style={{ flexShrink: 0, color: 'var(--text-disabled)' }}>
                        {formatDate(project.lastOpened)}
                      </span>
                    </div>
                  </div>

                  <span
                    className="close-btn"
                    onClick={(e) => handleRemove(e, project.path)}
                    style={{ marginLeft: '12px', fontSize: '16px' }}
                    title="Rimuovi dalla lista"
                  >
                    ✕
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && projects.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-disabled)',
            fontSize: '13px',
            fontStyle: 'italic',
            padding: '20px'
          }}>
            Nessun progetto recente
          </div>
        )}
      </div>

      {showGlobalSettings && (
        <GlobalSettingsModal onClose={() => setShowGlobalSettings(false)} />
      )}
    </div>
  );
}

function GlobalSettingsModal({ onClose }) {
  const [config, setConfig] = useState({
    enabled: false, provider: '', apiKey: '', openaiImageKey: '', model: '', effort: 'medium'
  });
  const [loaded, setLoaded] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showImageKey, setShowImageKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electronAPI.getGlobalAiConfig().then(cfg => {
      setConfig(cfg);
      setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    await window.electronAPI.setGlobalAiConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleVerify = async () => {
    if (!config.apiKey || !config.provider) return;
    setVerifying(true);
    setVerifyResult(null);
    const result = await window.electronAPI.aiVerifyKey(config.provider, config.apiKey);
    setVerifyResult(result?.valid ? 'ok' : 'fail');
    setVerifying(false);
  };

  const models = config.provider === 'anthropic'
    ? [['claude-haiku-4-5-20251001', 'Haiku 4.5'], ['claude-sonnet-4-6', 'Sonnet 4.6'], ['claude-opus-4-6', 'Opus 4.6']]
    : [['gpt-5-mini', 'GPT-5 Mini'], ['gpt-5.2', 'GPT-5.2'], ['gpt-5.4', 'GPT-5.4']];

  const labelStyle = { fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' };
  const inputStyle = {
    width: '100%', padding: '7px 10px', background: 'var(--bg-main)', border: '1px solid var(--border-default)',
    borderRadius: '4px', color: 'var(--text-primary)', fontSize: '13px', boxSizing: 'border-box'
  };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };

  if (!loaded) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        WebkitAppRegion: 'no-drag'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-main)', borderRadius: '12px', padding: '28px',
        width: '440px', maxHeight: '80vh', overflowY: 'auto',
        border: '1px solid var(--border-default)', boxShadow: '0 12px 40px rgba(0,0,0,0.6)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
            Impostazioni Globali AI
          </div>
          <span
            className="close-btn"
            onClick={onClose}
            style={{ fontSize: '18px', cursor: 'pointer' }}
          >&#10005;</span>
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px', lineHeight: '1.5' }}>
          Configura le chiavi AI una volta — verranno usate in tutte le avventure che non hanno una configurazione locale.
          Se disattivato, viene usata la quota gratuita.
        </div>

        {/* Enable toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={e => setConfig({ ...config, enabled: e.target.checked })}
              style={{ accentColor: 'var(--accent)' }}
            />
            Usa le mie chiavi API
          </label>
        </div>

        {config.enabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Provider */}
            <div>
              <label style={labelStyle}>Provider</label>
              <select
                style={selectStyle}
                value={config.provider}
                onChange={e => setConfig({ ...config, provider: e.target.value, model: '' })}
              >
                <option value="">— Seleziona —</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>

            {/* API Key */}
            {config.provider && (
              <div>
                <label style={labelStyle}>API Key ({config.provider === 'anthropic' ? 'Claude' : 'OpenAI'})</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type={showKey ? 'text' : 'password'}
                      style={inputStyle}
                      value={config.apiKey}
                      onChange={e => { setConfig({ ...config, apiKey: e.target.value }); setVerifyResult(null); }}
                      placeholder="sk-..."
                    />
                    <span
                      onClick={() => setShowKey(!showKey)}
                      style={{
                        position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                        cursor: 'pointer', fontSize: '14px', color: 'var(--text-tertiary)', userSelect: 'none'
                      }}
                    >{showKey ? '🙈' : '👁'}</span>
                  </div>
                  <button
                    onClick={handleVerify}
                    disabled={verifying || !config.apiKey}
                    style={{
                      padding: '7px 12px', border: '1px solid var(--border-default)', borderRadius: '4px',
                      background: verifyResult === 'ok' ? 'var(--color-success-bg)' : 'transparent',
                      color: verifyResult === 'ok' ? 'var(--color-success)' : verifyResult === 'fail' ? 'var(--color-danger)' : 'var(--text-secondary)',
                      fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                  >
                    {verifying ? '...' : verifyResult === 'ok' ? 'OK' : verifyResult === 'fail' ? 'Non valida' : 'Verifica'}
                  </button>
                </div>
              </div>
            )}

            {/* Model */}
            {config.provider && (
              <div>
                <label style={labelStyle}>Modello</label>
                <select
                  style={selectStyle}
                  value={config.model}
                  onChange={e => setConfig({ ...config, model: e.target.value })}
                >
                  <option value="">— Default —</option>
                  {models.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Effort (Anthropic only) */}
            {config.provider === 'anthropic' && (
              <div>
                <label style={labelStyle}>Effort (Extended Thinking)</label>
                <select
                  style={selectStyle}
                  value={config.effort}
                  onChange={e => setConfig({ ...config, effort: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            )}

            {/* OpenAI Image Key (if not OpenAI provider) */}
            {config.provider && config.provider !== 'openai' && (
              <div>
                <label style={labelStyle}>API Key OpenAI per immagini (opzionale)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showImageKey ? 'text' : 'password'}
                    style={inputStyle}
                    value={config.openaiImageKey}
                    onChange={e => setConfig({ ...config, openaiImageKey: e.target.value })}
                    placeholder="sk-... (per generazione immagini)"
                  />
                  <span
                    onClick={() => setShowImageKey(!showImageKey)}
                    style={{
                      position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                      cursor: 'pointer', fontSize: '14px', color: 'var(--text-tertiary)', userSelect: 'none'
                    }}
                  >{showImageKey ? '🙈' : '👁'}</span>
                </div>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              style={{
                marginTop: '8px', padding: '10px', border: 'none', borderRadius: '6px',
                background: 'var(--accent)', color: 'var(--bg-main)',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {saved ? 'Salvato!' : 'Salva'}
            </button>
          </div>
        )}

        {!config.enabled && (
          <div style={{
            padding: '16px', background: 'var(--bg-elevated)', borderRadius: '6px',
            fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: '1.5'
          }}>
            Le avventure useranno la quota AI gratuita (richiede login).
            Attiva per usare le tue chiavi API personali su tutte le avventure.
          </div>
        )}
      </div>
    </div>
  );
}

function SelectorBtn({ icon, label, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: primary ? 2 : 1,
        padding: '12px 14px',
        background: 'transparent',
        border: `1px solid ${primary ? 'var(--accent)' : 'var(--border-default)'}`,
        borderRadius: '8px',
        color: primary ? 'var(--accent)' : 'var(--text-secondary)',
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = primary ? 'var(--accent-a10)' : 'var(--bg-elevated)';
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.color = 'var(--accent)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = primary ? 'var(--accent)' : 'var(--border-default)';
        e.currentTarget.style.color = primary ? 'var(--accent)' : 'var(--text-secondary)';
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      {label}
    </button>
  );
}

function WinBtn({ icon, onClick, isClose }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        width: '32px',
        height: '28px',
        cursor: 'pointer',
        color: 'var(--text-tertiary)',
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
        e.currentTarget.style.color = 'var(--text-tertiary)';
      }}
    >
      {icon}
    </button>
  );
}
