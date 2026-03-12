// ─── Theme Engine ───
// Applies theme CSS custom properties to document.documentElement
// Persists selection in localStorage (global, not per-project)

import { THEMES, DEFAULT_THEME } from './themeDefinitions';

const STORAGE_KEY = 'gm-dashboard-theme';
const FONT_SCALE_KEY = 'gm-dashboard-font-scale';

/**
 * Apply a theme by setting all its CSS custom properties on :root
 */
export function applyTheme(themeId) {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;

  for (const [prop, value] of Object.entries(theme)) {
    root.style.setProperty(prop, value);
  }
}

/**
 * Apply font scale independently (allows slider without full theme reload)
 */
export function applyFontScale(scale) {
  document.documentElement.style.setProperty('--font-size-scale', String(scale));
}

/**
 * Get stored theme ID from localStorage
 */
export function getStoredThemeId() {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Save theme ID to localStorage
 */
export function saveThemeId(themeId) {
  try {
    localStorage.setItem(STORAGE_KEY, themeId);
  } catch {
    // ignore storage errors
  }
}

/**
 * Get stored font scale from localStorage
 */
export function getStoredFontScale() {
  try {
    const val = localStorage.getItem(FONT_SCALE_KEY);
    return val ? parseFloat(val) : 1;
  } catch {
    return 1;
  }
}

/**
 * Save font scale to localStorage
 */
export function saveFontScale(scale) {
  try {
    localStorage.setItem(FONT_SCALE_KEY, String(scale));
  } catch {
    // ignore storage errors
  }
}

/**
 * Initialize theme on app startup — call once in App useEffect
 */
export function initTheme() {
  const themeId = getStoredThemeId();
  applyTheme(themeId);

  const fontScale = getStoredFontScale();
  if (fontScale !== 1) {
    applyFontScale(fontScale);
  }

  return { themeId, fontScale };
}
