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

// Cast display extension: [cast|contenuto] or [cast|contenuto|caption] or [cast::contenuto] or [cast::contenuto::caption]
// Tipi auto-rilevati: immagine (.jpg/.png/.gif/...), blank/nero, testo (default)
const castExtension = {
  name: 'cast',
  level: 'inline',
  start(src) {
    return src.indexOf('[cast');
  },
  tokenizer(src) {
    // [cast|content] or [cast|content|caption]
    const pipeMatch = src.match(/^\[cast\|([^|\]]+?)(?:\|([^\]]+))?\]/);
    if (pipeMatch) {
      return { type: 'cast', raw: pipeMatch[0], content: pipeMatch[1].trim(), caption: pipeMatch[2]?.trim() || null };
    }
    // [cast::content] or [cast::content::caption]
    const colonMatch = src.match(/^\[cast::([^\]]+?)(?:::([^\]]+))?\]/);
    if (colonMatch) {
      return { type: 'cast', raw: colonMatch[0], content: colonMatch[1].trim(), caption: colonMatch[2]?.trim() || null };
    }
  },
  renderer(token) {
    const content = token.content;
    const caption = token.caption;
    const lower = content.toLowerCase();

    const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(lower);
    const isBlank = lower === 'blank' || lower === 'nero';

    const escaped = content.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const captionEscaped = caption ? caption.replace(/"/g, '&quot;').replace(/</g, '&lt;') : '';

    let mode, icon, typeLabel, bodyHtml;

    if (isBlank) {
      mode = 'blank';
      icon = '\u{1F311}'; // 🌑
      typeLabel = 'Schermo nero';
      bodyHtml = `<span class="cast-type">${typeLabel}</span>`;
    } else if (isImage) {
      mode = 'image';
      icon = '\u{1F5BC}'; // 🖼
      typeLabel = 'Immagine → Display';
      const fileName = content.split('/').pop();
      bodyHtml = `<span class="cast-type">${typeLabel}</span>`
        + `<span class="cast-name">\u{1F4C1} ${fileName}</span>`
        + (caption ? `<span class="cast-caption">${captionEscaped}</span>` : '');
    } else {
      mode = 'text';
      icon = '\u{1F4AC}'; // 💬
      typeLabel = 'Testo → Display';
      bodyHtml = `<span class="cast-type">${typeLabel}</span>`
        + `<span class="cast-preview">${escaped}</span>`;
    }

    // Bottoni azione
    let actionsHtml = '';
    if (isImage) {
      actionsHtml = `<button class="cast-preview-btn" data-cast-content="${escaped}" title="Anteprima immagine">\u{1F50D}</button>`
        + `<button class="cast-send-btn" data-cast-content="${escaped}" data-cast-mode="${mode}" data-cast-caption="${captionEscaped}" title="Invia al display">\u{1F4E4} Invia</button>`;
    } else {
      actionsHtml = `<button class="cast-send-btn" data-cast-content="${escaped}" data-cast-mode="${mode}" title="Invia al display">\u{1F4E4} Invia</button>`;
    }

    return `<span class="cast-widget">`
      + `<span class="cast-info">`
      + `<span class="cast-icon">${icon}</span>`
      + `<span class="cast-body">${bodyHtml}</span>`
      + `</span>`
      + `<span class="cast-actions">${actionsHtml}</span>`
      + `</span>`;
  }
};

// AI poke extension: [ai|destinatario|contesto] or [ai::destinatario::contesto]
// Il "contesto" è un'indicazione al GM per l'AI — l'AI genererà il messaggio coerente
// con i documenti attivi del PG, il _prompt e lo storico conversazioni, poi lo invia via Telegram
const aiExtension = {
  name: 'ai',
  level: 'inline',
  start(src) {
    return src.indexOf('[ai');
  },
  tokenizer(src) {
    const pipeMatch = src.match(/^\[ai\|([^|\]]+)\|([^\]]+)\]/);
    if (pipeMatch) {
      return { type: 'ai', raw: pipeMatch[0], target: pipeMatch[1].trim(), context: pipeMatch[2].trim() };
    }
    const colonMatch = src.match(/^\[ai::([^\]]+?)::([^\]]+)\]/);
    if (colonMatch) {
      return { type: 'ai', raw: colonMatch[0], target: colonMatch[1].trim(), context: colonMatch[2].trim() };
    }
  },
  renderer(token) {
    const target = token.target;
    const context = token.context;

    // Target display (riusa logica di [tlg])
    let targetLabel = target;
    const tl = target.toLowerCase();
    if (tl === 'all' || tl === '*' || tl === 'tutti') targetLabel = 'Tutti';
    else if (/^(casuale|random)(:.+)?$/i.test(tl)) {
      const param = tl.split(':')[1] || '1';
      targetLabel = `Casuale (${param === 'meta' || param === 'metà' || param === 'half' ? 'metà' : param === 'tutti-1' || param === 'all-1' ? 'tutti-1' : param})`;
    }

    const escapedCtx = context.replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const targetEscaped = target.replace(/"/g, '&quot;');

    return `<button class="ai-send-btn" data-ai-target="${targetEscaped}" data-ai-context="${escapedCtx}" title="Guida AI a scrivere al giocatore">`
      + `<span class="ai-icon">\u{1F916}</span>`
      + `<span class="ai-body">`
      + `<span class="ai-type">AI &rarr; ${targetLabel}</span>`
      + `<span class="ai-preview">${escapedCtx}</span>`
      + `</span>`
      + `</button>`;
  }
};

marked.use({ extensions: [tlgExtension, castExtension, aiExtension] });

marked.setOptions({
  breaks: true,
  gfm: true
});

// Allow tlg + cast + ai elements through DOMPurify
DOMPurify.addHook('uponSanitizeElement', (node) => {
  if (node.tagName === 'BUTTON' && (
    node.classList?.contains('tlg-send-btn') ||
    node.classList?.contains('cast-send-btn') ||
    node.classList?.contains('cast-preview-btn') ||
    node.classList?.contains('ai-send-btn')
  )) return node;
  if (node.tagName === 'SPAN' && node.className && /^(cast|ai)-/.test(node.className)) return node;
});

const purifyConfig = {
  ADD_TAGS: ['button', 'span'],
  ADD_ATTR: [
    'data-tlg-target', 'data-tlg-content',
    'data-cast-content', 'data-cast-mode', 'data-cast-caption',
    'data-ai-target', 'data-ai-context',
    'class', 'title'
  ]
};

export function renderMarkdown(content) {
  return DOMPurify.sanitize(marked.parse(content), purifyConfig);
}
