import { useRef, useCallback } from 'react';

export function useScrollMemory(externalMapRef, onChanged) {
  const internalMap = useRef({});
  const mapRef = externalMapRef || internalMap;

  const saveScroll = useCallback((key, value) => {
    if (!key) return;
    mapRef.current[key] = value;
    if (onChanged) onChanged();
  }, [mapRef, onChanged]);

  const getScroll = useCallback((key) => {
    if (!key) return 0;
    return mapRef.current[key] || 0;
  }, [mapRef]);

  return { saveScroll, getScroll };
}
