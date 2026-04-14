// Casting server: Express + WebSocket in LAN per inviare contenuti a display secondari
// Fase 1: un solo canale "default", solo testo. UI/integrazioni arriveranno dopo.
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const express = require('express');
const { WebSocketServer } = require('ws');

let app = null;
let httpServer = null;
let wss = null;
let currentPort = null;
let projectPath = null;
let config = { port: 1804 };

// Canali: Map<channelId, { name, clients: Set<ws>, lastContent }>
const channels = new Map();

function ensureChannel(id, name = null) {
  if (!channels.has(id)) {
    channels.set(id, {
      id,
      name: name || id,
      clients: new Set(),
      lastContent: null,
      defaultContent: null   // Passepartout: mostrato quando lastContent è null (clear)
    });
  }
  return channels.get(id);
}

function getLanAddresses() {
  const out = [];
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

function isRunning() {
  return !!httpServer;
}

function getStatus() {
  return {
    running: isRunning(),
    port: currentPort,
    addresses: getLanAddresses(),
    channels: Array.from(channels.values()).map(c => ({
      id: c.id,
      name: c.name,
      clientsCount: c.clients.size,
      lastContent: c.lastContent
    }))
  };
}

function broadcastToChannel(channelId, message) {
  const ch = channels.get(channelId);
  if (!ch) return 0;
  const payload = JSON.stringify(message);
  let sent = 0;
  for (const ws of ch.clients) {
    if (ws.readyState === 1) {
      ws.send(payload);
      sent++;
    }
  }
  return sent;
}

function send(channelId, content) {
  const ch = ensureChannel(channelId);
  ch.lastContent = content;
  return broadcastToChannel(channelId, { type: 'show', payload: content });
}

function clear(channelId) {
  const ch = channels.get(channelId);
  if (!ch) return 0;
  ch.lastContent = null;
  // Se c'è un passepartout, mostralo; altrimenti clear vero e proprio
  if (ch.defaultContent) {
    return broadcastToChannel(channelId, { type: 'show', payload: ch.defaultContent });
  }
  return broadcastToChannel(channelId, { type: 'clear' });
}

function setDefaultContent(channelId, content) {
  const ch = ensureChannel(channelId);
  ch.defaultContent = content || null;
  // Se in questo momento il canale è in "clear" (nessun contenuto attivo), aggiorna live
  if (!ch.lastContent) {
    if (content) broadcastToChannel(channelId, { type: 'show', payload: content });
    else broadcastToChannel(channelId, { type: 'clear' });
  }
}

function setupRoutes() {
  // Pagina display: GET /display/:channelId
  app.get('/display/:channelId', (req, res) => {
    const htmlPath = path.join(__dirname, 'displayPage.html');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    fs.createReadStream(htmlPath).pipe(res);
  });

  // Asset client statici (CSS/JS della pagina display)
  app.get('/_cast/client.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    fs.createReadStream(path.join(__dirname, 'displayClient.js')).pipe(res);
  });
  app.get('/_cast/client.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    fs.createReadStream(path.join(__dirname, 'displayStyles.css')).pipe(res);
  });

  // File del progetto (sandboxati) — /files/<relative>
  // Middleware-based per compatibilità Express 5 (niente route wildcard legacy)
  app.use('/files', (req, res) => {
    if (!projectPath) return res.status(404).send('No project');
    const rel = decodeURIComponent(req.path || '').replace(/^[/\\]+/, '');
    if (!rel) return res.status(404).send('Not found');
    const abs = path.resolve(projectPath, rel);
    const normProj = path.resolve(projectPath);
    if (abs !== normProj && !abs.startsWith(normProj + path.sep)) {
      return res.status(403).send('Forbidden');
    }
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      return res.status(404).send('Not found');
    }
    res.sendFile(abs);
  });

  // Redirect radice al canale default per comodità
  app.get('/', (req, res) => res.redirect('/display/default'));
}

function setupWebSocket() {
  wss = new WebSocketServer({ server: httpServer, path: undefined });

  wss.on('connection', (ws, req) => {
    // URL format: /ws/:channelId
    const url = req.url || '';
    const match = url.match(/^\/ws\/([^/?#]+)/);
    if (!match) {
      ws.close(1008, 'Invalid path');
      return;
    }
    const channelId = decodeURIComponent(match[1]);
    const ch = ensureChannel(channelId);
    ch.clients.add(ws);

    // Invia stato iniziale: lastContent se presente, altrimenti defaultContent (passepartout)
    const initialContent = ch.lastContent || ch.defaultContent || null;
    ws.send(JSON.stringify({ type: 'state', payload: { content: initialContent } }));

    if (onClientConnect) onClientConnect(channelId);

    ws.on('close', () => {
      ch.clients.delete(ws);
      if (onClientDisconnect) onClientDisconnect(channelId);
    });
    ws.on('error', () => {});
  });
}

let onClientConnect = null;
let onClientDisconnect = null;

function setEventHooks({ onConnect, onDisconnect }) {
  onClientConnect = onConnect || null;
  onClientDisconnect = onDisconnect || null;
}

async function start(opts = {}) {
  if (isRunning()) return { error: 'Già in esecuzione', port: currentPort };
  config.port = Number.isFinite(opts.port) ? opts.port : 1804;
  projectPath = opts.projectPath || null;

  // Canale default sempre presente
  ensureChannel('default', 'Schermo 1');

  app = express();
  app.disable('x-powered-by');
  setupRoutes();

  return new Promise((resolve) => {
    httpServer = http.createServer(app);
    httpServer.on('error', (err) => {
      resolve({ error: err.code === 'EADDRINUSE' ? `Porta ${config.port} già in uso` : err.message });
      httpServer = null;
    });
    httpServer.listen(config.port, '0.0.0.0', () => {
      currentPort = httpServer.address().port;
      setupWebSocket();
      resolve({ port: currentPort, addresses: getLanAddresses() });
    });
  });
}

async function stop() {
  if (!isRunning()) return { error: 'Non in esecuzione' };
  // Chiudi tutti i WS
  if (wss) {
    for (const ws of wss.clients) {
      try { ws.close(1001, 'Server stopping'); } catch (_) {}
    }
    wss.close();
    wss = null;
  }
  await new Promise((resolve) => httpServer.close(() => resolve()));
  httpServer = null;
  app = null;
  currentPort = null;
  channels.clear();
  return { success: true };
}

module.exports = {
  start,
  stop,
  isRunning,
  getStatus,
  send,
  clear,
  setDefaultContent,
  ensureChannel,
  setEventHooks,
  getLanAddresses
};
