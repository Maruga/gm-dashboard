import React, { useCallback, useEffect, useRef } from 'react';

export default function ResizeHandle({ direction = 'vertical', onResize, style = {} }) {
  const dragging = useRef(false);
  const pointerId = useRef(null);
  const startPos = useRef(0);
  const rafRef = useRef(null);
  const accumulatedDelta = useRef(0);
  const handleRef = useRef(null);

  const endDrag = useCallback(() => {
    dragging.current = false;
    if (handleRef.current && pointerId.current != null) {
      try { handleRef.current.releasePointerCapture(pointerId.current); } catch (_) {}
    }
    pointerId.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (accumulatedDelta.current !== 0) {
        onResize(accumulatedDelta.current);
        accumulatedDelta.current = 0;
      }
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    // Reset colore linea (su touch onMouseLeave non scatta)
    const line = handleRef.current?.querySelector('.resize-line');
    if (line) line.style.background = 'var(--border-default)';
  }, [onResize]);

  const handlePointerDown = useCallback((e) => {
    // Ignora pointer aggiuntivi (multi-touch): solo il primo dito/mouse guida il drag
    if (dragging.current) return;
    e.preventDefault();
    dragging.current = true;
    pointerId.current = e.pointerId;
    startPos.current = direction === 'vertical' ? e.clientX : e.clientY;
    document.body.style.cursor = direction === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  }, [direction]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current) return;
    // Ignora move di pointer diversi da quello che ha iniziato il drag
    if (pointerId.current != null && e.pointerId !== pointerId.current) return;
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
  }, [direction, onResize]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const isVertical = direction === 'vertical';
  const baseStyle = {
    position: 'relative',
    flexShrink: 0,
    [isVertical ? 'width' : 'height']: '6px',
    cursor: isVertical ? 'col-resize' : 'row-resize',
    background: 'transparent',
    zIndex: 10,
    touchAction: 'none',
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
      ref={handleRef}
      style={baseStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
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
