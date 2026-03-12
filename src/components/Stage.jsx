import React, { useRef } from 'react';
import Viewer from './Viewer';
import DocToc from './DocToc';

const SLOT_TABS = [
  { id: 'A', label: 'Slot A' },
  { id: 'B', label: 'Slot B' },
  { id: 'C', label: 'Slot C' }
];

const ALL_TABS = [
  ...SLOT_TABS,
  { id: 'Cal', label: '📅 Cal' }
];

export default function Stage({
  slotFiles, activeTab, selectedIndices, onTabChange,
  onImageClick, onVideoClick,
  calFile,
  scrollMapRef, onScrollChanged,
  tocPinned, onTocPinnedChange
}) {
  const viewerRef = useRef(null);

  const isCalTab = activeTab === 'Cal';
  const files = isCalTab ? [] : (slotFiles[activeTab] || []);
  const selectedIndex = isCalTab ? 0 : (selectedIndices[activeTab] || 0);
  const activeFile = isCalTab ? calFile : (files[selectedIndex] || null);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header + Tab bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #2a2520',
        flexShrink: 0,
        background: '#1e1b16'
      }}>
        <span style={{
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: '#c9a96e',
          flexShrink: 0
        }}>
          Stage
        </span>
        <div style={{ width: '1px', height: '16px', background: '#2a2520', flexShrink: 0 }} />
        {ALL_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const hasContent = tab.id === 'Cal'
            ? !!calFile
            : (slotFiles[tab.id] || []).length > 0;
          return (
            <div
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                cursor: 'pointer',
                color: isActive ? '#c9a96e' : hasContent ? '#8a7a60' : '#4a4035',
                borderBottom: isActive ? '2px solid #c9a96e' : '2px solid transparent',
                background: isActive ? '#252018' : 'transparent',
                transition: 'all 0.2s',
                letterSpacing: '0.5px'
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#b89a5e'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = hasContent ? '#8a7a60' : '#4a4035'; }}
            >
              {tab.label}
            </div>
          );
        })}
        <div style={{ flex: 1 }} />
        <div style={{ paddingRight: '8px' }}>
          <DocToc containerRef={viewerRef} pinned={tocPinned} onPinnedChange={onTocPinnedChange} />
        </div>
      </div>

      {/* Document content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeFile ? (
          <Viewer
            ref={viewerRef}
            currentFile={activeFile}
            scrollKeyPrefix={activeTab}
            onImageClick={onImageClick}
            onVideoClick={onVideoClick}
            scrollMapRef={scrollMapRef}
            onScrollChanged={onScrollChanged}
          />
        ) : (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#4a4035', fontSize: '13px', fontStyle: 'italic'
          }}>
            {isCalTab ? 'Apri un documento dal Calendario' : `Nessun documento in ${SLOT_TABS.find(t => t.id === activeTab)?.label || activeTab}`}
          </div>
        )}
      </div>
    </div>
  );
}
