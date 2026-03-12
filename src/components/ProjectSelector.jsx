import React, { useState, useEffect, useCallback } from 'react';

export default function ProjectSelector({ onProjectOpen }) {
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
      background: '#1a1714',
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
            color: '#c9a96e',
            letterSpacing: '6px',
            fontFamily: "'Georgia', serif",
            marginBottom: '8px'
          }}>
            限界
          </div>
          <div style={{
            fontSize: '14px',
            color: '#8a7a60',
            letterSpacing: '4px',
            textTransform: 'uppercase'
          }}>
            GM Dashboard
          </div>
        </div>

        {/* Open folder button */}
        <button
          onClick={handleOpenFolder}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: 'transparent',
            border: '1px solid #c9a96e',
            borderRadius: '8px',
            color: '#c9a96e',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            letterSpacing: '1px',
            transition: 'all 0.2s',
            marginBottom: '32px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#c9a96e15';
            e.currentTarget.style.borderColor = '#ddb978';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#c9a96e';
          }}
        >
          <span style={{ fontSize: '18px' }}>📂</span>
          Apri cartella...
        </button>

        {/* Recent projects */}
        {projects.length > 0 && (
          <>
            <div style={{
              fontSize: '11px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: '#6a5a40',
              marginBottom: '12px'
            }}>
              Progetti recenti
            </div>

            <div style={{
              maxHeight: '340px',
              overflowY: 'auto',
              borderRadius: '8px',
              border: '1px solid #2a2520'
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
                    borderBottom: i < projects.length - 1 ? '1px solid #2a2520' : 'none',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#252018'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#d4c5a9',
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
                      color: '#6a5a40',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      gap: '12px'
                    }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {project.path}
                      </span>
                      <span style={{ flexShrink: 0, color: '#4a4035' }}>
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
            color: '#4a4035',
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
        color: '#6a5a40',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '3px',
        transition: 'all 0.2s'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = isClose ? '#5a2020' : '#3a3530';
        e.currentTarget.style.color = isClose ? '#ff6b6b' : '#d4c5a9';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.color = '#6a5a40';
      }}
    >
      {icon}
    </button>
  );
}
