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
  const res = await httpsPost('api.openai.com', '/v1/chat/completions', {
    'Authorization': `Bearer ${apiKey}`
  }, {
    model,
    messages,
    max_tokens: maxTokens || 1024,
    temperature: 0.7
  });
  if (res.status !== 200) {
    const msg = res.data?.error?.message || `Errore OpenAI: HTTP ${res.status}`;
    return { error: msg };
  }
  const content = res.data.choices?.[0]?.message?.content || '';
  const tokensUsed = res.data.usage?.total_tokens || 0;
  return { response: content, tokensUsed };
}

// ── Anthropic ──

async function chatAnthropic(apiKey, model, messages, maxTokens) {
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
  const body = {
    model,
    messages: filtered,
    max_tokens: maxTokens || 1024,
    temperature: 0.7
  };
  if (system) body.system = system;

  const res = await httpsPost('api.anthropic.com', '/v1/messages', {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01'
  }, body);

  if (res.status !== 200) {
    const msg = res.data?.error?.message || `Errore Anthropic: HTTP ${res.status}`;
    return { error: msg };
  }
  const content = res.data.content?.[0]?.text || '';
  const tokensUsed = (res.data.usage?.input_tokens || 0) + (res.data.usage?.output_tokens || 0);
  return { response: content, tokensUsed };
}

// ── Dispatcher ──

async function chat(config, messages) {
  const { provider, apiKey, model, maxTokens } = config;
  if (provider === 'anthropic') {
    return chatAnthropic(apiKey, model, messages, maxTokens);
  }
  return chatOpenAI(apiKey, model, messages, maxTokens);
}

// ── Verifica chiave ──

async function verifyKey(provider, apiKey) {
  const testMessages = [{ role: 'user', content: 'Rispondi OK' }];
  const model = provider === 'anthropic' ? 'claude-haiku-4-5-20251001' : 'gpt-4o-mini';
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

function collectProjectFiles(dirPath) {
  const files = [];
  const EXTS = new Set(['.md', '.html', '.htm', '.txt']);

  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
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
    } catch {}
  }
  walk(dirPath);
  return files;
}

function buildContext(projectPath, question, allowedFiles = null) {
  const MAX_CHARS = 16000;
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

  // Keyword scoring — split question into lowercase words
  const keywords = (question || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);

  // Read all files, score by keyword matches
  const scored = [];
  for (const f of files) {
    try {
      let content = fs.readFileSync(f.path, 'utf-8');
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
    } catch {}
  }

  // Sort: most relevant first, then alphabetical
  scored.sort((a, b) => b.score - a.score || a.relPath.localeCompare(b.relPath));

  // Take top 5 most relevant files, cap total chars
  let totalChars = 0;
  const parts = [];
  for (const f of scored.slice(0, 5)) {
    const available = MAX_CHARS - totalChars;
    if (available <= 100) break;
    const text = f.content.length > available ? f.content.substring(0, available) + '\n[...troncato]' : f.content;
    parts.push(`--- ${f.relPath} ---\n${text}`);
    totalChars += text.length + f.relPath.length + 10;
  }

  return parts.join('\n\n');
}

function buildSystemPrompt(context, projectName) {
  return `Sei l'assistente AI per l'avventura "${projectName}". Rispondi basandoti SOLO sul contenuto fornito qui sotto. Se non trovi l'informazione, dillo chiaramente. Rispondi in italiano, in modo conciso e utile per il Game Master.

=== CONTENUTO DELL'AVVENTURA ===
${context}`;
}

module.exports = { chat, verifyKey, buildContext, buildSystemPrompt };
