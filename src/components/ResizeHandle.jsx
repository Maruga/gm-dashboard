import React, { useCallback, useEffect, useRef } from 'react';

export default function ResizeHandle({ direction = 'vertical', onResize, style = {} }) {
  const dragging = useRef(false);
  const startPos = useRef(0);
  const rafRef = useRef(null);
  const accumulatedDelta = useRef(0);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    startPos.current = direction === 'vertical' ? e.clientX : e.clientY;
    document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragging.current) return;
      const currentPos = direction === 'vertical' ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      startPos.current = currentPos;
      accumulatedDelta.current += delta;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const d = accumulatedDelta.current;
          accumulatedDelta.current = 0;
          onResize(d);
        });
      }
    };

    const handleMouseUp = () => {
      dragging.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        // Flush any remaining delta
        if (accumulatedDelta.current !== 0) {
          onResize(accumulatedDelta.current);
          accumulatedDelta.current = 0;
        }
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [direction, onResize]);

  const isVertical = direction === 'vertical';
  const baseStyle = {
    position: 'relative',
    flexShrink: 0,
    [isVertical ? 'width' : 'height']: '6px',
    cursor: isVertical ? 'col-resize' : 'row-resize',
    background: 'transparent',
    zIndex: 10,
    ...style
  };

  const lineStyle = {
    position: 'absolute',
    [isVertical ? 'top' : 'left']: '0',
    [isVertical ? 'bottom' : 'right']: '0',
    [isVertical ? 'left' : 'top']: '2px',
    [isVertical ? 'width' : 'height']: '1px',
    background: 'var(--border-default)',
    transition: 'background 0.2s'
  };

  return (
    <div
      style={baseStyle}
      onMouseDown={handleMouseDown}
      onMouseEnter={e => {
        const line = e.currentTarget.querySelector('.resize-line');
        if (line) line.style.background = 'var(--accent)';
      }}
      onMouseLeave={e => {
        const line = e.currentTarget.querySelector('.resize-line');
        if (line) line.style.background = 'var(--border-default)';
      }}
    >
      <div className="resize-line" style={lineStyle} />
    </div>
  );
}
