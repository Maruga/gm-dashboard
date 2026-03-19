/**
 * Apply keyword highlights to HTML string.
 * Splits on HTML tags, only replaces in text parts. Case-insensitive.
 */
export function applyKeywordHighlightsToHtml(html, words) {
  if (!html || !words || words.length === 0) return html;

  // Build sorted words (longest first to avoid partial overlap)
  const sorted = [...words].sort((a, b) => b.text.length - a.text.length);
  const pattern = new RegExp(
    '(' + sorted.map(w => w.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')',
    'gi'
  );
  const colorMap = {};
  for (const w of words) colorMap[w.text.toLowerCase()] = w.color;

  const parts = html.split(/(<[^>]+>)/);
  const processed = parts.map(part => {
    if (part.startsWith('<')) return part; // HTML tag — skip
    return part.replace(pattern, (match) => {
      const color = colorMap[match.toLowerCase()] || 'rgba(201,169,110,0.55)';
      return `<mark data-kw-hl="true" style="background:${color};color:inherit;padding:1px 2px;border-radius:2px">${match}</mark>`;
    });
  });
  return processed.join('');
}

/**
 * Build theme style block for srcdoc iframes.
 * Resolves CSS vars from parent so highlights and scrollbars work inside iframe.
 */
export function buildIframeThemeStyle() {
  const cs = getComputedStyle(document.documentElement);
  const get = (name) => cs.getPropertyValue(name).trim();
  const vars = ['--accent-a30', '--accent-a35', '--accent-a55'].map(v => `${v}:${get(v)}`).join(';');
  const thumb = get('--scrollbar-thumb') || '#3a3530';
  const hover = get('--scrollbar-hover') || '#5a4a3a';
  return `<style data-theme-inject="true">:root{${vars}}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${thumb};border-radius:3px}::-webkit-scrollbar-thumb:hover{background:${hover}}</style>`;
}

/**
 * Prepare raw HTML for srcdoc rendering: inject <base href> and theme styles.
 */
export function prepareHtmlForSrcdoc(rawHtml, filePath) {
  const folder = filePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '/');
  const baseTag = /<base\s/i.test(rawHtml) ? '' : `<base href="app://local/-/${folder}">`;
  const themeStyle = buildIframeThemeStyle();
  const inject = baseTag + themeStyle;

  if (/<head([^>]*)>/i.test(rawHtml)) {
    return rawHtml.replace(/<head([^>]*)>/i, `<head$1>${inject}`);
  }
  if (/<html([^>]*)>/i.test(rawHtml)) {
    return rawHtml.replace(/<html([^>]*)>/i, `<html$1><head>${inject}</head>`);
  }
  return `<head>${inject}</head>${rawHtml}`;
}
