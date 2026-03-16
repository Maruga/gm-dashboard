import React from 'react';
import { Minus, Plus, Search, Maximize2, Minimize2 } from 'lucide-react';

const iconStyle = {
  color: 'var(--text-tertiary)',
  cursor: 'pointer',
  transition: 'color 0.15s'
};

const disabledStyle = {
  color: 'var(--text-disabled)',
  cursor: 'default',
  opacity: 0.5
};

export default function PanelToolbar({
  fontSize, onFontSizeChange,
  isFullscreen, onToggleFullscreen,
  searchOpen, onSearchToggle,
  isHtmlIframe
}) {
  const handleDecrease = () => onFontSizeChange(prev => Math.max(10, prev - 1));
  const handleIncrease = () => onFontSizeChange(prev => Math.min(24, prev + 1));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginRight: '4px' }}>
      <Minus
        size={13}
        style={fontSize <= 10 ? disabledStyle : iconStyle}
        onClick={fontSize > 10 ? handleDecrease : undefined}
        onMouseEnter={e => { if (fontSize > 10) e.currentTarget.style.color = 'var(--accent)'; }}
        onMouseLeave={e => { if (fontSize > 10) e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        title="Riduci carattere"
      />
      <span style={{
        fontSize: '10px', color: 'var(--text-tertiary)',
        minWidth: '16px', textAlign: 'center', userSelect: 'none'
      }}>
        {fontSize}
      </span>
      <Plus
        size={13}
        style={fontSize >= 24 ? disabledStyle : iconStyle}
        onClick={fontSize < 24 ? handleIncrease : undefined}
        onMouseEnter={e => { if (fontSize < 24) e.currentTarget.style.color = 'var(--accent)'; }}
        onMouseLeave={e => { if (fontSize < 24) e.currentTarget.style.color = 'var(--text-tertiary)'; }}
        title="Ingrandisci carattere"
      />
      <span style={{
        width: '1px', height: '14px', background: 'var(--border-subtle)',
        margin: '0 3px', flexShrink: 0
      }} />
      <Search
        size={13}
        style={isHtmlIframe ? disabledStyle : {
          ...iconStyle,
          color: searchOpen ? 'var(--accent)' : 'var(--text-tertiary)'
        }}
        onClick={isHtmlIframe ? undefined : onSearchToggle}
        onMouseEnter={e => { if (!isHtmlIframe) e.currentTarget.style.color = 'var(--accent)'; }}
        onMouseLeave={e => { if (!isHtmlIframe) e.currentTarget.style.color = searchOpen ? 'var(--accent)' : 'var(--text-tertiary)'; }}
        title={isHtmlIframe ? 'Ricerca non disponibile per file HTML' : 'Cerca nel pannello'}
      />
      {isFullscreen ? (
        <Minimize2
          size={13}
          style={iconStyle}
          onClick={onToggleFullscreen}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          title="Esci da fullscreen"
        />
      ) : (
        <Maximize2
          size={13}
          style={iconStyle}
          onClick={onToggleFullscreen}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
          title="Espandi fullscreen"
        />
      )}
    </div>
  );
}
