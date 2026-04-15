import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getFileIcon, getFileType, FILE_TYPES } from '../utils/fileTypes';

const DEFAULT_HIDDEN = '.json, .yml, .yaml, .git, .gitignore, .DS_Store, .thumbs.db, .ini, .cfg, .log, .bak, .tmp, .swp, .lock';

function buildHiddenSet(str) {
  return new Set(
    (str || DEFAULT_HIDDEN).split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  );
}

function shouldHide(entry, hiddenSet) {
  const name = entry.name;
  // Always hide dot-directories
  if (entry.isDirectory && name.startsWith('.')) return true;
  // Hide files starting with _ (file di sistema), eccetto i file funzionali dell'AI
  // (_msg_* = messaggi speciali inviabili via Telegram, _prompt* = system prompt personalizzato)
  if (!entry.isDirectory && name.startsWith('_')) {
    const lower = name.toLowerCase();
    if (!lower.startsWith('_msg_') && !lower.startsWith('_prompt')) return true;
  }
  // Check full filename match (e.g. .gitignore, .DS_Store, thumbs.db)
  if (hiddenSet.has(name.toLowerCase())) return true;
  // Check extension match
  if (entry.extension && hiddenSet.has(entry.extension.toLowerCase())) return true;
  return false;
}

function TreeNode({ entry, depth, onFileClick, onContextMenu, expandedDirs, toggleDir, activeFilePath, hiddenSet, refreshKey, dropTarget, onDragTarget, onImportDrop }) {
  const isExpanded = expandedDirs[entry.path];
  const [children, setChildren] = useState(null);
  const isActive = !entry.isDirectory && entry.path === activeFilePath;

  useEffect(() => {
    if (entry.isDirectory && isExpanded) {
      window.electronAPI.readDirectory(entry.path).then(setChildren);
    }
  }, [isExpanded, entry.path, entry.isDirectory, refreshKey]);

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

  const dropDest = entry.isDirectory ? entry.path : entry.path.replace(/[\\/][^\\/]+$/, '');
  const isDropTarget = dropTarget === entry.path || (!entry.isDirectory && dropTarget === dropDest);

  const icon = getFileIcon(entry);
  const activeBg = 'var(--accent-a15)';
  const normalBg = isActive ? activeBg : 'transparent';

  return (
    <div>
      <div
        onClick={handleClick}
        onContextMenu={handleContext}
        onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; }}
        onDragEnter={e => { e.stopPropagation(); onDragTarget(dropDest); }}
        onDragLeave={e => { e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget)) onDragTarget(null); }}
        onDrop={e => { e.stopPropagation(); e.preventDefault(); onImportDrop(e.dataTransfer, dropDest); onDragTarget(null); }}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '3px 8px',
          paddingLeft: `${12 + depth * 16}px`,
          cursor: 'pointer',
          fontSize: '13px',
          color: isActive ? 'var(--accent)' : 'var(--text-primary)',
          background: isDropTarget ? 'var(--accent-a15)' : normalBg,
          outline: isDropTarget ? '1px dashed var(--accent)' : 'none',
          borderRadius: '3px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        onMouseEnter={e => { if (!isActive && !isDropTarget) e.currentTarget.style.background = 'var(--bg-hover-strong)'; }}
        onMouseLeave={e => { if (!isDropTarget) e.currentTarget.style.background = normalBg; }}
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
          {children.filter(child => !shouldHide(child, hiddenSet)).map(child => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
              activeFilePath={activeFilePath}
              hiddenSet={hiddenSet}
              refreshKey={refreshKey}
              dropTarget={dropTarget}
              onDragTarget={onDragTarget}
              onImportDrop={onImportDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Explorer({
  projectFolder, activeFilePath, onFileOpen, onSlotAssign, onMediaAdd, onImageClick,
  expandedDirs: externalExpanded, onExpandedDirsChange,
  onTelegramFile, onCastFile, onCastTextFile,
  hiddenExtensions,
  refreshKey
}) {
  const [entries, setEntries] = useState([]);
  const [internalExpanded, setInternalExpanded] = useState({});
  const expandedDirs = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const setExpandedDirs = onExpandedDirsChange || setInternalExpanded;
  const [contextMenu, setContextMenu] = useState(null);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [dropTarget, setDropTarget] = useState(null);
  const dragCounterRef = useRef(0);
  const hiddenSet = useMemo(() => buildHiddenSet(hiddenExtensions), [hiddenExtensions]);
  const combinedRefreshKey = (refreshKey || 0) + localRefresh;

  useEffect(() => {
    if (projectFolder) {
      window.electronAPI.readDirectory(projectFolder).then(setEntries);
    }
  }, [projectFolder, combinedRefreshKey]);

  const toggleDir = useCallback((path) => {
    setExpandedDirs(prev => ({ ...prev, [path]: !prev[path] }));
  }, []);

  const handleFileClick = useCallback((entry) => {
    const type = getFileType(entry.extension);
    if (type === FILE_TYPES.IMAGE) {
      onImageClick(entry.path);
    } else if (type === FILE_TYPES.AUDIO || type === FILE_TYPES.VIDEO) {
      onMediaAdd(entry);
    } else {
      onFileOpen(entry);
    }
  }, [onFileOpen, onMediaAdd, onImageClick]);

  const handleContextMenu = useCallback((e, entry) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      entry
    });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleImportDrop = useCallback(async (dataTransfer, destFolder) => {
    const files = dataTransfer.files;
    if (!files?.length || !projectFolder) return;
    const paths = Array.from(files).map(f => window.electronAPI.getPathForFile(f)).filter(Boolean);
    if (paths.length === 0) return;
    const result = await window.electronAPI.importItems(paths, destFolder);
    if (result.imported > 0) setLocalRefresh(k => k + 1);
    if (result.errors?.length > 0) console.warn('Import errors:', result.errors);
  }, [projectFolder]);

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
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Explorer</span>
        <span
          className="close-btn"
          onClick={() => setLocalRefresh(k => k + 1)}
          title="Aggiorna"
          style={{ fontSize: '12px', cursor: 'pointer' }}
        >↻</span>
      </div>
      <div
        style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 0',
          outline: dropTarget === 'root' ? '2px dashed var(--accent)' : 'none',
          outlineOffset: '-2px',
          background: dropTarget === 'root' ? 'var(--accent-a08)' : 'transparent'
        }}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onDragEnter={e => { e.preventDefault(); dragCounterRef.current++; if (!dropTarget) setDropTarget('root'); }}
        onDragLeave={() => { dragCounterRef.current--; if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setDropTarget(null); } }}
        onDrop={e => { e.preventDefault(); dragCounterRef.current = 0; handleImportDrop(e.dataTransfer, projectFolder); setDropTarget(null); }}
      >
        {entries.filter(entry => !shouldHide(entry, hiddenSet)).map(entry => (
          <TreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            onFileClick={handleFileClick}
            onContextMenu={handleContextMenu}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
            activeFilePath={activeFilePath}
            hiddenSet={hiddenSet}
            refreshKey={combinedRefreshKey}
            dropTarget={dropTarget}
            onDragTarget={setDropTarget}
            onImportDrop={handleImportDrop}
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
          {!isDir && ctxType === FILE_TYPES.IMAGE && onCastFile && (
            <MenuItem label="📡 Invia al display" onClick={() => onCastFile(contextMenu.entry)} />
          )}
          {!isDir && ctxType === FILE_TYPES.DOCUMENT && onCastTextFile && (
            // Solo file testo semplice: .md/.txt. HTML non renderizzabile come testo plain.
            ['.md', '.txt'].includes((contextMenu.entry.extension || '').toLowerCase()) && (
              <MenuItem label="📡 Invia testo al display" onClick={() => onCastTextFile(contextMenu.entry)} />
            )
          )}
        </div>
      )}
    </div>
  );
}

export default React.memo(Explorer);
