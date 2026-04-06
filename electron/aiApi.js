/**
 * AI API — Chiamate a OpenAI e Anthropic via https nativo (zero dipendenze npm)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Chiamata generica ──

function httpsPost(hostname, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        try {
          resolve({ status: res.statusCode, data: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, data: { error: { message: raw.substring(0, 500) } } });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout richiesta AI')); });
    req.write(data);
    req.end();
  });
}

// ── OpenAI ──

async function chatOpenAI(apiKey, model, messages, maxTokens) {
  // GPT-5 richiede max_completion_tokens, non max_tokens
  const isGpt5 = model.startsWith('gpt-5');
  const body = { model, messages };
  if (!isGpt5) {
    body.temperature = 0.7;
    body.max_tokens = maxTokens || 1024;
  } else {
    body.max_completion_tokens = maxTokens || 1024;
  }
  const res = await httpsPost('api.openai.com', '/v1/chat/completions', {
    'Authorization': `Bearer ${apiKey}`
  }, body);
  if (res.status !== 200) {
    const msg = res.data?.error?.message || `Errore OpenAI: HTTP ${res.status}`;
    return { error: msg };
  }
  const content = res.data.choices?.[0]?.message?.content || '';
  const tokensUsed = res.data.usage?.total_tokens || 0;
  return { response: content, tokensUsed };
}

// ── Anthropic ──

// Budget tokens per livello di effort (Extended Thinking)
const THINKING_BUDGET = { low: 2048, medium: 5000, high: 10000 };

async function chatAnthropic(apiKey, model, messages, maxTokens, effort) {
  // Anthropic richiede system message separato
  let system = '';
  const filtered = [];
  for (const m of messages) {
    if (m.role === 'system') {
      system += (system ? '\n\n' : '') + m.content;
    } else {
      filtered.push(m);
    }
  }

  // Extended Thinking: attivo solo con effort esplicito su modelli compatibili
  const useThinking = effort && THINKING_BUDGET[effort] &&
    (model.includes('opus') || model.includes('sonnet'));
  const budgetTokens = useThinking ? THINKING_BUDGET[effort] : 0;

  const body = {
    model,
    messages: filtered,
    // Con thinking attivo, max_tokens deve essere > budget_tokens
    max_tokens: useThinking ? budgetTokens + (maxTokens || 1024) : (maxTokens || 1024)
  };
  if (system) body.system = system;

  if (useThinking) {
    // Extended Thinking richiede temperature 1.0 (o omessa)
    body.thinking = { type: 'enabled', budget_tokens: budgetTokens };
  } else {
    body.temperature = 0.7;
  }

  const res = await httpsPost('api.anthropic.com', '/v1/messages', {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  }, body);

  if (res.status !== 200) {
    const msg = res.data?.error?.message || `Errore Anthropic: HTTP ${res.status}`;
    return { error: msg };
  }
  // Extended Thinking: la risposta contiene blocchi thinking + text, estrarre solo il text
  const textBlock = res.data.content?.find(b => b.type === 'text');
  const content = textBlock?.text || '';
  const tokensUsed = (res.data.usage?.input_tokens || 0) + (res.data.usage?.output_tokens || 0);
  return { response: content, tokensUsed };
}

// ── Dispatcher ──

async function chat(config, messages) {
  const { provider, apiKey, model, maxTokens, effort } = config;
  if (provider === 'anthropic') {
    return chatAnthropic(apiKey, model, messages, maxTokens, effort);
  }
  return chatOpenAI(apiKey, model, messages, maxTokens);
}

// ── Verifica chiave ──

async function verifyKey(provider, apiKey) {
  const testMessages = [{ role: 'user', content: 'Rispondi OK' }];
  const model = provider === 'anthropic' ? 'claude-haiku-4-5-20251001' : 'gpt-5-mini';
  try {
    const result = await chat({ provider, apiKey, model, maxTokens: 8 }, testMessages);
    if (result.error) return { error: result.error };
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Contesto progetto ──

function stripHtmlTags(html) {
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
             .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
             .replace(/<[^>]+>/g, '');
}

const fileCache = new Map(); // path -> { mtimeMs, content }
const dirCache = new Map();  // dirPath -> { timestamp, files }
const DIR_CACHE_TTL = 5000;
const MAX_CACHE_ENTRIES = 50;

function collectProjectFiles(dirPath) {
  const files = [];
  const EXTS = new Set(['.md', '.html', '.htm', '.txt']);

  function walk(dir) {
    try {
      const now = Date.now();
      const cached = dirCache.get(dir);
      let entries;
      if (cached && (now - cached.timestamp) < DIR_CACHE_TTL) {
        entries = cached.entries;
      } else {
        entries = fs.readdirSync(dir, { withFileTypes: true });
        dirCache.set(dir, { timestamp: now, entries });
      }
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (EXTS.has(ext)) {
            files.push({ path: full, name: entry.name, ext });
          }
        }
      }
    } catch (e) { console.warn('[ai-walk-error]', e.message); }
  }
  walk(dirPath);
  return files;
}

function buildContext(projectPath, question, allowedFiles = null, maxChars = 16000) {
  const MAX_CHARS = Math.max(4000, Math.min(maxChars || 16000, 500000));
  let files = collectProjectFiles(projectPath);
  if (files.length === 0) return '';

  // Se allowedFiles è un array, filtra solo i file autorizzati
  if (Array.isArray(allowedFiles)) {
    const allowed = new Set(allowedFiles.map(f => f.replace(/\\/g, '/')));
    files = files.filter(f => {
      const rel = path.relative(projectPath, f.path).replace(/\\/g, '/');
      return allowed.has(rel);
    });
    if (files.length === 0) return '';
  }

  // Keyword scoring — split question into lowercase words (min 2 chars to keep "PG", "AI", etc.)
  const stopWords = new Set(['il', 'lo', 'la', 'le', 'li', 'gli', 'un', 'una', 'di', 'da', 'in', 'su', 'per', 'con', 'del', 'dei', 'dal', 'nel', 'che', 'non', 'mi', 'ti', 'ci', 'si', 'me', 'te', 'se', 'ma', 'ed', 'od', 'ai', 'al']);
  const keywords = (question || '').toLowerCase().split(/\s+/).filter(w => w.length >= 2 && !stopWords.has(w));

  // Read all files, score by keyword matches
  const scored = [];
  for (const f of files) {
    try {
      let content;
      const stat = fs.statSync(f.path);
      const cached = fileCache.get(f.path);
      if (cached && cached.mtimeMs === stat.mtimeMs) {
        content = cached.content;
      } else {
        content = fs.readFileSync(f.path, 'utf-8');
        fileCache.set(f.path, { mtimeMs: stat.mtimeMs, content });
        // LRU eviction
        if (fileCache.size > MAX_CACHE_ENTRIES) {
          const firstKey = fileCache.keys().next().value;
          fileCache.delete(firstKey);
        }
      }
      if (f.ext === '.html' || f.ext === '.htm') {
        content = stripHtmlTags(content);
      }
      const lower = content.toLowerCase();
      let score = 0;
      for (const kw of keywords) {
        let pos = 0;
        while ((pos = lower.indexOf(kw, pos)) !== -1) {
          score++;
          pos += kw.length;
        }
      }
      const relPath = path.relative(projectPath, f.path).replace(/\\/g, '/');
      scored.push({ relPath, content, score });
    } catch (e) { console.warn('[ai-read-score]', e.message); }
  }

  // Sort: most relevant first, then alphabetical
  scored.sort((a, b) => b.score - a.score || a.relPath.localeCompare(b.relPath));

  // Include all allowed files (already filtered by GM), cap total chars
  let totalChars = 0;
  const parts = [];
  for (const f of scored) {
    const available = MAX_CHARS - totalChars;
    if (available <= 100) break;
    const text = f.content.length > available ? f.content.substring(0, available) + '\n[...troncato]' : f.content;
    parts.push(`--- ${f.relPath} ---\n${text}`);
    totalChars += text.length + f.relPath.length + 10;
  }

  return parts.join('\n\n');
}

function buildSystemPrompt(context, projectName) {
  return `Sei l'assistente AI del Game Master per l'avventura "${projectName}".

ISTRUZIONI:
- Leggi ATTENTAMENTE tutto il contenuto fornito prima di rispondere
- Cerca l'informazione in TUTTI i documenti, non fermarti al primo
- Se l'informazione è presente anche in forma indiretta o parziale, riportala
- Rispondi in italiano, in modo conciso e pratico per il Game Master al tavolo
- Se dopo aver letto tutto il contenuto l'informazione davvero non c'è, dillo — ma prima cerca bene
- Cita il documento da cui prendi l'informazione quando possibile

=== CONTENUTO DELL'AVVENTURA ===
${context}`;
}

// ── Generazione immagini (OpenAI gpt-image-1) ──

async function generateImage(apiKey, prompt, options = {}) {
  const body = {
    model: options.model || 'gpt-image-1',
    prompt,
    n: 1,
    size: options.size || '1024x1024',
    output_format: 'png'
  };
  const res = await httpsPost('api.openai.com', '/v1/images/generations', {
    'Authorization': `Bearer ${apiKey}`
  }, body);

  if (res.status !== 200) {
    const msg = res.data?.error?.message || `Errore OpenAI Images: HTTP ${res.status}`;
    return { error: msg };
  }

  const b64 = res.data?.data?.[0]?.b64_json;
  const url = res.data?.data?.[0]?.url;
  if (!b64 && !url) return { error: 'Nessuna immagine nella risposta' };

  return { b64, url };
}

function saveBase64Image(b64, filePath) {
  const buffer = Buffer.from(b64, 'base64');
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = { chat, verifyKey, buildContext, buildSystemPrompt, generateImage, saveBase64Image };
