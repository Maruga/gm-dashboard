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
    // Riusa la cell multi-dado per coerenza visiva + animazione rolling
    const scene = document.createElement('div');
    scene.className = 'content-dice-scene';
    scene.appendChild(buildDiceCell({ ...c, rollId: Date.now() }, true));
    root.appendChild(scene);
  }

  // Classifica il risultato: critico/fallimento solo per d20
  function classifyDie(d) {
    if (d.sides === 20 && d.value === 20) return 'critical';
    if (d.sides === 20 && d.value === 1) return 'failure';
    return null;
  }

  // Simula il "rotolamento" mostrando numeri random per ~500ms prima del valore finale.
  // Solo DOPO il rolling applica l'eventuale classificazione (critico/fallimento) per non spoilerare.
  function animateRoll(valueEl, sides, finalValue, classification, cellEl) {
    const duration = 450;
    const changes = 8;
    const stepMs = duration / changes;
    let count = 0;
    const id = setInterval(() => {
      count++;
      if (count >= changes) {
        clearInterval(id);
        valueEl.textContent = String(finalValue);
        if (cellEl) {
          // Fase 1: bounce di assestamento (numero neutro, ancora senza colore critico/fallimento)
          cellEl.classList.add('is-rolling');
          // Fase 2 (dopo il bounce): togli is-rolling e applica lo stato critico/fallimento con banner
          setTimeout(() => {
            cellEl.classList.remove('is-rolling');
            if (classification === 'critical') cellEl.classList.add('is-critical');
            if (classification === 'failure') cellEl.classList.add('is-failure');
            const banner = cellEl.querySelector('.banner');
            if (banner) banner.style.display = '';
          }, 500);
        }
        return;
      }
      const r = 1 + Math.floor(Math.random() * Math.max(2, sides || 6));
      valueEl.textContent = String(r);
    }, stepMs);
    return id;
  }

  function buildDiceCell(d, animate) {
    const cell = document.createElement('div');
    cell.className = 'dice-cell';
    cell.dataset.key = (d.sides || '') + ':' + (d.value || '') + ':' + (d.rollId || '');

    const classification = classifyDie(d);
    // Se il dado NON deve rollare (è un dado già esistente ridisegnato), applica subito lo stato finale.
    // Se invece deve rollare, applica la classe speciale SOLO alla fine del rolling per non spoilerare.
    if (!animate) {
      if (classification === 'critical') cell.classList.add('is-critical');
      if (classification === 'failure') cell.classList.add('is-failure');
    }

    const val = document.createElement('div');
    val.className = 'value';
    val.textContent = animate ? String(1 + Math.floor(Math.random() * Math.max(2, d.sides || 6))) : String(d.value);
    cell.appendChild(val);

    const lab = document.createElement('div');
    lab.className = 'label';
    lab.textContent = d.label || ('d' + (d.sides || ''));
    cell.appendChild(lab);

    if (classification) {
      const banner = document.createElement('div');
      banner.className = 'banner';
      banner.textContent = classification === 'critical' ? 'Critico!' : 'Fallimento';
      // Nascondi banner durante il rolling per non spoilerare
      if (animate) banner.style.display = 'none';
      cell.appendChild(banner);
    }

    if (animate) {
      setTimeout(() => animateRoll(val, d.sides, d.value, classification, cell), 150);
    }

    return cell;
  }

  // Stato corrente scena dadi per diffing incrementale
  let currentDiceKeys = new Set();

  function renderDiceScene(c) {
    const scene = document.createElement('div');
    scene.className = 'content-dice-scene';
    const newKeys = new Set();
    (c.dice || []).forEach((d, i) => {
      const key = (d.sides || '') + ':' + (d.value || '') + ':' + i;
      const isNew = !currentDiceKeys.has(key);
      newKeys.add(key);
      scene.appendChild(buildDiceCell({ ...d, rollId: i }, isNew));
    });
    if (c.total != null) {
      const totalEl = document.createElement('div');
      totalEl.className = 'dice-total';
      totalEl.textContent = 'Totale: ' + c.total;
      scene.appendChild(totalEl);
    }
    currentDiceKeys = newKeys;
    root.appendChild(scene);
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
    // Reset stato diffing se il contenuto non è più una scena dadi
    if (!content || content.type !== 'dice-scene') {
      currentDiceKeys = new Set();
    }
    if (!content || content.type === 'blank') return;
    let el = null;
    if (content.type === 'text') renderText(content);
    else if (content.type === 'image') renderImage(content);
    else if (content.type === 'dice') renderDice(content);
    else if (content.type === 'dice-scene') renderDiceScene(content);

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
      if (msg.payload?.config) {
        if (typeof msg.payload.config.fadeMs === 'number') setFadeMs(msg.payload.config.fadeMs);
        // (transition: 'crossfade'|'cut' — cut = fadeMs 0 effettivo)
      }
      const saveFade = fadeMs; setFadeMs(0);
      doRender(msg.payload?.content || null);
      setFadeMs(saveFade);
      hideStatus();
    } else if (msg.type === 'show') {
      applyContent(msg.payload);
    } else if (msg.type === 'clear') {
      applyContent(null);
    } else if (msg.type === 'config') {
      if (msg.payload?.transition === 'cut') setFadeMs(0);
      else if (typeof msg.payload?.fadeMs === 'number') setFadeMs(msg.payload.fadeMs);
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
