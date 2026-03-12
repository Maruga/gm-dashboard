import React, { useState, useEffect, useCallback } from 'react';

export default function ProjectSelector({ onProjectOpen, onOpenAdventures }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.electronAPI.getRecentProjects().then(p => {
      setProjects(p || []);
      setLoading(false);
    });
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
      {/* Window controls in top-right */}
      <div style={{
        position: 'fixed',
        top: '12px',
        right: '16px',
        display: 'flex',
        gap: '4px',
        WebkitAppRegion: 'no-drag'
      }}>
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
