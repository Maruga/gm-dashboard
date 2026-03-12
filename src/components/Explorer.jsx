import React, { useState, useEffect, useCallback } from 'react';
import { getFileIcon, getFileType, FILE_TYPES } from '../utils/fileTypes';

function TreeNode({ entry, depth, onFileClick, onContextMenu, expandedDirs, toggleDir, activeFilePath }) {
  const isExpanded = expandedDirs[entry.path];
  const [children, setChildren] = useState(null);
  const isActive = !entry.isDirectory && entry.path === activeFilePath;

  useEffect(() => {
    if (entry.isDirectory && isExpanded && !children) {
      window.electronAPI.readDirectory(entry.path).then(setChildren);
    }
  }, [isExpanded, entry.path, entry.isDirectory, children]);

  const handleClick = () => {
    if (entry.isDirectory) {
      toggleDir(entry.path);
    } else {
      onFileClick(entry);
    }
  };

  const handleContext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, entry);
  };

  const icon = getFileIcon(entry);
  const activeBg = 'var(--accent-a15)';

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={handleContext}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '3px 8px',
          paddingLeft: `${12 + depth * 16}px`,
          cursor: 'pointer',
          fontSize: '13px',
          color: isActive ? 'var(--accent)' : 'var(--text-primary)',
          background: isActive ? activeBg : 'transparent',
          borderRadius: '3px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover-strong)'; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? activeBg : 'transparent'; }}
      >
        {entry.isDirectory && (
          <span style={{ marginRight: '4px', fontSize: '10px', color: 'var(--text-secondary)', width: '10px', flexShrink: 0, textAlign: 'center' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!entry.isDirectory && <span style={{ width: '14px', flexShrink: 0 }} />}
        <span style={{ marginRight: '6px', fontSize: '14px', width: '18px', flexShrink: 0, textAlign: 'center' }}>{icon}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</span>
      </div>
      {entry.isDirectory && isExpanded && children && (
        <div>
          {children.map(child => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              activeFilePath={activeFilePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Explorer({
  projectFolder, activeFilePath, onFileOpen, onSlotAssign, onMediaAdd,
  expandedDirs: externalExpanded, onExpandedDirsChange,
  onTelegramFile
}) {
  const [entries, setEntries] = useState([]);
  const [internalExpanded, setInternalExpanded] = useState({});
  const expandedDirs = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const setExpandedDirs = onExpandedDirsChange || setInternalExpanded;
  const [contextMenu, setContextMenu] = useState(null);

  useEffect(() => {
    if (projectFolder) {
      window.electronAPI.readDirectory(projectFolder).then(setEntries);
    }
  }, [projectFolder]);

  const toggleDir = useCallback((path) => {
    setExpandedDirs(prev => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const handleFileClick = useCallback((entry) => {
    const type = getFileType(entry.extension);
    if (type === FILE_TYPES.AUDIO || type === FILE_TYPES.IMAGE || type === FILE_TYPES.VIDEO) {
      onMediaAdd(entry);
    } else {
      onFileOpen(entry);
    }
  }, [onFileOpen, onMediaAdd]);

  const handleContextMenu = useCallback((e, entry) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      entry
    });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    const handler = () => closeContextMenu();
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [closeContextMenu]);

  const menuItemStyle = {
    padding: '6px 16px',
    cursor: 'pointer',
    fontSize: '13px',
    color: 'var(--text-primary)'
  };

  const MenuItem = ({ label, onClick }) => (
    <div style={menuItemStyle}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--border-default)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      onClick={() => { onClick(); closeContextMenu(); }}>
      {label}
    </div>
  );

  const isDir = contextMenu?.entry?.isDirectory;
  const ctxType = contextMenu?.entry ? getFileType(contextMenu.entry.extension) : null;
  const isMedia = ctxType === FILE_TYPES.AUDIO || ctxType === FILE_TYPES.IMAGE || ctxType === FILE_TYPES.VIDEO;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '8px 12px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: 'var(--accent)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0
      }}>
        Explorer
      </div>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 0' }}>
        {entries.map(entry => (
          <TreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            onFileClick={handleFileClick}
            onContextMenu={handleContextMenu}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
            activeFilePath={activeFilePath}
          />
        ))}
        {entries.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            Nessun progetto aperto
          </div>
        )}
      </div>

      {contextMenu && (
        <div style={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '6px',
          padding: '4px 0',
          zIndex: 1000,
          minWidth: '200px',
          boxShadow: 'var(--shadow-dropdown)'
        }}>
          {!isDir && !isMedia && (
            <MenuItem label="Apri in Viewer" onClick={() => onFileOpen(contextMenu.entry)} />
          )}
          {!isDir && isMedia && (
            <MenuItem label="Aggiungi a Media" onClick={() => onMediaAdd(contextMenu.entry)} />
          )}
          {!isDir && (
            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
          )}
          <MenuItem
            label={isDir ? 'Apri contenuto in Slot A' : 'Apri in Slot A'}
            onClick={() => onSlotAssign('A', contextMenu.entry)}
          />
          <MenuItem
            label={isDir ? 'Apri contenuto in Slot B' : 'Apri in Slot B'}
            onClick={() => onSlotAssign('B', contextMenu.entry)}
          />
          <MenuItem
            label={isDir ? 'Apri contenuto in Slot C' : 'Apri in Slot C'}
            onClick={() => onSlotAssign('C', contextMenu.entry)}
          />
          {!isDir && onTelegramFile && (
            <>
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
              <MenuItem label="✉️ Invia via Telegram" onClick={() => onTelegramFile(contextMenu.entry)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
