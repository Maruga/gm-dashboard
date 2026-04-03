import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Telegram send command extension: [tlg|destinatari|contenuto] or [tlg::destinatari::contenuto]
const tlgExtension = {
  name: 'tlg',
  level: 'inline',
  start(src) {
    return src.indexOf('[tlg');
  },
  tokenizer(src) {
    // [tlg|target|content] — pipe separator
    const pipeMatch = src.match(/^\[tlg\|([^|\]]+)\|([^\]]+)\]/);
    if (pipeMatch) {
      return { type: 'tlg', raw: pipeMatch[0], target: pipeMatch[1].trim(), content: pipeMatch[2].trim() };
    }
    // [tlg::target::content] — double colon separator
    const colonMatch = src.match(/^\[tlg::([^\]]+?)::([^\]]+)\]/);
    if (colonMatch) {
      return { type: 'tlg', raw: colonMatch[0], target: colonMatch[1].trim(), content: colonMatch[2].trim() };
    }
  },
  renderer(token) {
    const target = token.target;
    const content = token.content;

    // Detect content type
    const lower = content.toLowerCase();
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(lower);
    const isAudio = /\.(mp3|wav|ogg|m4a)$/i.test(lower);
    const isFile = isImage || isAudio || /\.(pdf|doc|docx|txt|md)$/i.test(lower);

    let icon = '\u{1F4AC}'; // speech bubble
    let typeLabel = 'Messaggio';
    if (isImage) { icon = '\u{1F5BC}'; typeLabel = 'Foto'; }
    else if (isAudio) { icon = '\u{1F3B5}'; typeLabel = 'Audio'; }
    else if (isFile) { icon = '\u{1F4CE}'; typeLabel = 'File'; }

    // Target display
    let targetLabel = target;
    const tl = target.toLowerCase();
    if (tl === 'all' || tl === '*' || tl === 'tutti') targetLabel = 'Tutti';
    else if (/^(casuale|random)(:.+)?$/i.test(tl)) {
      const param = tl.split(':')[1] || '1';
      targetLabel = `Casuale (${param === 'meta' || param === 'metà' || param === 'half' ? 'metà' : param === 'tutti-1' || param === 'all-1' ? 'tutti-1' : param})`;
    }

    const escaped = content.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const targetEscaped = target.replace(/"/g, '&quot;');

    return `<button class="tlg-send-btn" data-tlg-target="${targetEscaped}" data-tlg-content="${escaped}" title="Invia via Telegram">`
      + `<span class="tlg-icon">${icon}</span>`
      + `<span class="tlg-body">`
      + `<span class="tlg-type">${typeLabel} → ${targetLabel}</span>`
      + `<span class="tlg-preview">${escaped}</span>`
      + `</span>`
      + `</button>`;
  }
};

marked.use({ extensions: [tlgExtension] });

marked.setOptions({
  breaks: true,
  gfm: true
});

// Allow tlg buttons through DOMPurify
DOMPurify.addHook('uponSanitizeElement', (node) => {
  if (node.tagName === 'BUTTON' && node.classList?.contains('tlg-send-btn')) {
    return node;
  }
});

const purifyConfig = {
  ADD_TAGS: ['button'],
  ADD_ATTR: ['data-tlg-target', 'data-tlg-content', 'class', 'title']
};

export function renderMarkdown(content) {
  return DOMPurify.sanitize(marked.parse(content), purifyConfig);
}
