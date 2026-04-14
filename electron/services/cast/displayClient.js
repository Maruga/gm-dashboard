// Display client — runs in the browser of the secondary device.
// Connects via WebSocket to ws://host/ws/:channelId and renders incoming content.
(function () {
  const pathParts = location.pathname.split('/').filter(Boolean);
  // /display/:channelId
  const channelId = pathParts[1] || 'default';

  const root = document.getElementById('root');
  const statusEl = document.getElementById('status');
  const fsBtn = document.getElementById('fs-btn');

  let ws = null;
  let reconnectTimer = null;
  let reconnectDelay = 500;
  let currentContent = null;
  let fadeMs = 250;
  let cursorTimer = null;

  function showStatus(text, persistMs = 0) {
    statusEl.textContent = text;
    statusEl.classList.remove('hidden');
    if (persistMs > 0) setTimeout(() => statusEl.classList.add('hidden'), persistMs);
  }
  function hideStatus() { statusEl.classList.add('hidden'); }

  function setFadeMs(ms) {
    fadeMs = Number.isFinite(ms) ? ms : 250;
    document.documentElement.style.setProperty('--fade-ms', fadeMs + 'ms');
  }
  setFadeMs(fadeMs);

  function renderBlank() {
    root.innerHTML = '';
  }

  function renderText(c) {
    const div = document.createElement('div');
    div.className = 'content-text' + (c.align === 'left' ? ' align-left' : '');
    // Rendering semplice: \n -> <br>, niente HTML pericoloso
    const safe = (c.content || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    div.innerHTML = safe.replace(/\n/g, '<br>');
    root.appendChild(div);
  }

  function renderImage(c) {
    const wrap = document.createElement('div');
    wrap.className = 'content-image-wrap';
    const img = document.createElement('img');
    img.className = 'content-image' + (c.fit === 'cover' ? ' fit-cover' : '');
    img.src = c.url;
    img.alt = '';
    wrap.appendChild(img);
    if (c.caption) {
      const cap = document.createElement('div');
      cap.className = 'caption';
      cap.textContent = c.caption;
      wrap.appendChild(cap);
    }
    root.appendChild(wrap);
  }

  function renderDice(c) {
    const wrap = document.createElement('div');
    wrap.className = 'content-dice';
    const val = document.createElement('div');
    val.className = 'value';
    val.textContent = String(c.value);
    wrap.appendChild(val);
    const lab = document.createElement('div');
    lab.className = 'label';
    lab.textContent = c.label || ('d' + (c.sides || ''));
    wrap.appendChild(lab);
    root.appendChild(wrap);
  }

  function applyContent(content) {
    // Fade out vecchio contenuto, poi renderizza il nuovo
    const old = root.children;
    if (old.length > 0 && fadeMs > 0) {
      for (const el of Array.from(old)) {
        el.style.transition = 'opacity ' + fadeMs + 'ms ease';
        el.style.opacity = '0';
      }
      setTimeout(() => doRender(content), fadeMs);
    } else {
      doRender(content);
    }
  }

  function doRender(content) {
    renderBlank();
    currentContent = content;
    if (!content || content.type === 'blank') return;
    let el = null;
    if (content.type === 'text') renderText(content);
    else if (content.type === 'image') renderImage(content);
    else if (content.type === 'dice') renderDice(content);

    if (fadeMs > 0) {
      const newEls = Array.from(root.children);
      for (const e of newEls) {
        e.style.opacity = '0';
        requestAnimationFrame(() => {
          e.style.transition = 'opacity ' + fadeMs + 'ms ease';
          e.style.opacity = '1';
        });
      }
    }
  }

  function handleMessage(msg) {
    if (msg.type === 'state') {
      // Stato iniziale — non fade
      const saveFade = fadeMs; setFadeMs(0);
      doRender(msg.payload?.content || null);
      setFadeMs(saveFade);
      hideStatus();
    } else if (msg.type === 'show') {
      applyContent(msg.payload);
    } else if (msg.type === 'clear') {
      applyContent(null);
    } else if (msg.type === 'config') {
      if (typeof msg.payload?.fadeMs === 'number') setFadeMs(msg.payload.fadeMs);
    }
  }

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = proto + '//' + location.host + '/ws/' + encodeURIComponent(channelId);
    showStatus('Connessione...');
    try {
      ws = new WebSocket(url);
    } catch (err) {
      scheduleReconnect();
      return;
    }
    ws.onopen = () => {
      reconnectDelay = 500;
      showStatus('Connesso', 1500);
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        handleMessage(msg);
      } catch (_) {}
    };
    ws.onclose = () => {
      showStatus('Connessione persa, riprovo...');
      scheduleReconnect();
    };
    ws.onerror = () => {
      try { ws.close(); } catch (_) {}
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectDelay = Math.min(reconnectDelay * 2, 8000);
      connect();
    }, reconnectDelay);
  }

  // Fullscreen helper
  fsBtn.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (_) {}
  });
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) fsBtn.classList.add('hidden');
    else fsBtn.classList.remove('hidden');
  });

  // Cursor auto-hide
  function resetCursor() {
    document.body.style.cursor = '';
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(() => { document.body.style.cursor = 'none'; }, 2000);
  }
  document.addEventListener('mousemove', resetCursor);
  resetCursor();

  connect();
})();
