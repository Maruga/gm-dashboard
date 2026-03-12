import React, { useRef, useMemo } from 'react';
import { Eye } from 'lucide-react';
import Viewer from './Viewer';
import RelationsView from './RelationsView';
import DocToc from './DocToc';
import { renderMarkdown } from '../utils/markdownRenderer';

const SLOT_TABS = [
  { id: 'A', label: 'Slot A' },
  { id: 'B', label: 'Slot B' },
  { id: 'C', label: 'Slot C' }
];

const ALL_TABS = [
  ...SLOT_TABS,
  { id: 'Cal', label: '📅 Cal' },
  { id: 'Vista', label: 'Vista' }
];

export default function Stage({
  slotFiles, activeTab, selectedIndices, onTabChange,
  onImageClick, onVideoClick,
  calFile,
  vistaContent, relationsBase, relationsSession,
  scrollMapRef, onScrollChanged,
  tocPinned, onTocPinnedChange,
  onOpenSnippetSource,
  highlightKeywords,
  onClearAll
}) {
  const viewerRef = useRef(null);

  const isCalTab = activeTab === 'Cal';
  const isVistaTab = activeTab === 'Vista';
  const items = (isCalTab || isVistaTab) ? [] : (slotFiles[activeTab] || []);
  const selectedIndex = (isCalTab || isVistaTab) ? 0 : (selectedIndices[activeTab] || 0);
  const activeItem = isCalTab ? calFile : isVistaTab ? null : (items[selectedIndex] || null);
  const isSnippet = activeItem?.type === 'snippet';
  const hasStageContent = !!calFile || !!activeItem || !!vistaContent;

  const snippetHtml = useMemo(() => {
    if (!isSnippet) return '';
    return renderMarkdown(activeItem.text);
  }, [isSnippet, activeItem?.text]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '0 12px',
        height: '26px',
        boxSizing: 'border-box',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: 'var(--accent)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        background: 'var(--bg-panel)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <span>Stage</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {hasStageContent && onClearAll && (
            <span className="close-btn" onClick={onClearAll} style={{ fontSize: '12px' }} title="Svuota stage">✕</span>
          )}
          {!isSnippet && !isVistaTab && (
            <DocToc key={activeItem?.path || activeItem?.id || 'empty'} containerRef={viewerRef} pinned={tocPinned} onPinnedChange={onTocPinnedChange} />
          )}
        </div>
      </div>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
        background: 'var(--bg-panel)',
        overflowX: 'auto'
      }}>
        {ALL_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const hasContent = tab.id === 'Cal'
            ? !!calFile
            : tab.id === 'Vista'
            ? !!vistaContent
            : (slotFiles[tab.id] || []).length > 0;
          return (
            <div
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '4px 12px',
                fontSize: '11px',
                cursor: 'pointer',
                color: isActive ? 'var(--accent)' : hasContent ? 'var(--text-secondary)' : 'var(--text-disabled)',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                transition: 'all 0.2s',
                flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--accent-dim)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = hasContent ? 'var(--text-secondary)' : 'var(--text-disabled)'; }}
            >
              {tab.id === 'Vista' && <Eye size={12} />}
              {tab.label}
            </div>
          );
        })}
      </div>

      {/* Document / Snippet / Vista content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {isVistaTab ? (
          vistaContent ? (
            <RelationsView
              pngName={vistaContent.pngName}
              relationsBase={relationsBase}
              relationsSession={relationsSession}
            />
          ) : (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-disabled)', fontSize: '13px', fontStyle: 'italic'
            }}>
              Nessun contenuto in Vista
            </div>
          )
        ) : isSnippet ? (
          <SnippetView
            snippet={activeItem}
            html={snippetHtml}
            onOpenSource={onOpenSnippetSource}
          />
        ) : activeItem ? (
          <Viewer
            ref={viewerRef}
            currentFile={activeItem}
            scrollKeyPrefix={activeTab}
            highlightKeywords={highlightKeywords}
            onImageClick={onImageClick}
            onVideoClick={onVideoClick}
            scrollMapRef={scrollMapRef}
            onScrollChanged={onScrollChanged}
          />
        ) : (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-disabled)', fontSize: '13px', fontStyle: 'italic'
          }}>
            {isCalTab ? 'Apri un documento dal Calendario' : `Nessun documento in ${SLOT_TABS.find(t => t.id === activeTab)?.label || activeTab}`}
          </div>
        )}
      </div>
    </div>
  );
}

function SnippetView({ snippet, html, onOpenSource }) {
  const sourceName = snippet.source || (snippet.sourcePath ? snippet.sourcePath.split('/').pop().split('\\').pop() : null);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Snippet header */}
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
        background: 'var(--bg-elevated)'
      }}>
        <span style={{ fontSize: '13px', flexShrink: 0 }}>✂️</span>
        <span style={{
          fontSize: '12px', fontWeight: '600', color: 'var(--accent)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1
        }}>
          {snippet.title}
        </span>
        {sourceName && (
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
            da: {sourceName}
          </span>
        )}
        {snippet.sourcePath && onOpenSource && (
          <span
            onClick={() => onOpenSource(snippet)}
            style={{
              fontSize: '11px', color: 'var(--accent)', cursor: 'pointer',
              flexShrink: 0, transition: 'color 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--accent)'}
            title="Apri il documento completo nel Viewer"
          >
            📄 Apri documento
          </span>
        )}
      </div>

      {/* Snippet content */}
      <div
        className="viewer-content"
        data-source-name={sourceName || ''}
        data-source-path={snippet.sourcePath || ''}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          color: 'var(--text-primary)',
          fontSize: '13px',
          lineHeight: '1.7'
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
