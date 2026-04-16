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
    // Cache-buster leggero per evitare che un 404 precedente resti cached nel browser
    const sep = c.url.includes('?') ? '&' : '?';
    img.src = c.url + sep + 't=' + Date.now();
    img.alt = '';
    img.onerror = () => {
      // Se la prima richiesta fallisce (es. race con salvataggio, cache stale), riprova una volta
      if (!img.dataset.retried) {
        img.dataset.retried = '1';
        setTimeout(() => {
          img.src = c.url + sep + 't=' + Date.now() + '&r=1';
        }, 300);
      } else {
        showStatus('Immagine non trovata: ' + c.url, 5000);
      }
    };
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

  // Regole critico/fallimento configurabili dal GM (per ogni tipo di dado).
  // critOn/failOn: 'none' = disattivato, 'max' = il massimo scatena, 'min' = l'1 scatena.
  // Default: d20 con crit=max e fail=min (D&D classico). Il renderer invia la config reale subito.
  let diceRules = {
    20: { critOn: 'max', failOn: 'min', critLabel: 'Critico!', failLabel: 'Fallimento' }
  };
  function resolveValue(trigger, sides) {
    if (trigger === 'max') return sides;
    if (trigger === 'min') return 1;
    return null;
  }
  function classifyDie(d) {
    const rule = diceRules?.[d.sides];
    if (!rule) return null;
    // Supporta vecchio formato (critEnabled/failEnabled) per retrocompatibilità
    const critOn = rule.critOn !== undefined ? rule.critOn : (rule.critEnabled ? 'max' : 'none');
    const failOn = rule.failOn !== undefined ? rule.failOn : (rule.failEnabled ? 'min' : 'none');
    const critValue = resolveValue(critOn, d.sides);
    const failValue = resolveValue(failOn, d.sides);
    if (critValue !== null && d.value === critValue) return { kind: 'critical', label: rule.critLabel || 'Critico!' };
    if (failValue !== null && d.value === failValue) return { kind: 'failure', label: rule.failLabel || 'Fallimento' };
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
            if (classification?.kind === 'critical') cellEl.classList.add('is-critical');
            if (classification?.kind === 'failure') cellEl.classList.add('is-failure');
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
      if (classification?.kind === 'critical') cell.classList.add('is-critical');
      if (classification?.kind === 'failure') cell.classList.add('is-failure');
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
      banner.textContent = classification.label;
      // Nascondi banner durante il rolling per non spoilerare
      if (animate) banner.style.display = 'none';
      cell.appendChild(banner);
    }

    if (animate) {
      setTimeout(() => animateRoll(val, d.sides, d.value, classification, cell), 150);
    }

    return cell;
  }

  // Stato corrente scena dadi per diffing incrementale + count per trigger audio
  let currentDiceKeys = new Set();
  let currentDiceCount = 0;

  // Riproduce un suono di dado scelto random dal catalog della categoria giusta.
  // Attivo SOLO se soundsConfig.enabled e source === 'display'.
  function playDiceSound(newDiceCount) {
    if (!soundsConfig?.enabled) return;
    if (soundsConfig.source !== 'display') return;
    if (!audioUnlocked) return; // iOS/mobile: serve interazione utente prima
    const cat = soundsConfig.catalog || {};
    const key = newDiceCount === 1 ? 'single' : newDiceCount <= 3 ? 'few' : 'many';
    const list = cat[key] || [];
    if (list.length === 0) return;
    const file = list[Math.floor(Math.random() * list.length)];
    try {
      const url = '/files/_assets/sounds/' + encodeURIComponent(file);
      const audio = new Audio(url);
      audio.volume = Math.min(1, Math.max(0, soundsConfig.volume ?? 0.7));
      audio.play().catch(() => {});
    } catch (_) {}
  }

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
    const newCount = (c.dice || []).length;
    const addedDice = newCount - currentDiceCount;
    currentDiceKeys = newKeys;
    currentDiceCount = newCount;
    root.appendChild(scene);
    if (addedDice > 0) playDiceSound(addedDice);
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
      currentDiceCount = 0;
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

  // Suoni dadi: config ricevuta dal server. source='pc' → il display NON suona (suona il GM).
  // source='display' + enabled → il display suona, scegliendo random dal catalog ricevuto.
  let soundsConfig = { enabled: false, volume: 0.7, source: 'pc', catalog: {} };
  // Mobile (iOS/Safari/Chrome) richiede interazione utente prima di permettere audio.play().
  // Al primo tap sul documento sblocchiamo un AudioContext dummy — da lì in poi il play funziona.
  let audioUnlocked = false;
  function unlockAudio() {
    if (audioUnlocked) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }
      audioUnlocked = true;
    } catch (_) { audioUnlocked = true; }
  }
  // Sblocca al primo tap o click
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });

  function applyConfigPayload(cfg) {
    if (!cfg) return;
    if (cfg.transition === 'cut') setFadeMs(0);
    else if (typeof cfg.fadeMs === 'number') setFadeMs(cfg.fadeMs);
    if (cfg.diceRules && typeof cfg.diceRules === 'object') {
      const next = { ...diceRules };
      for (const sides of Object.keys(cfg.diceRules)) {
        const incoming = cfg.diceRules[sides] || {};
        const merged = { ...(diceRules[sides] || {}), ...incoming };
        if (merged.critOn === undefined && merged.critEnabled !== undefined) {
          merged.critOn = merged.critEnabled ? 'max' : 'none';
        }
        if (merged.failOn === undefined && merged.failEnabled !== undefined) {
          merged.failOn = merged.failEnabled ? 'min' : 'none';
        }
        next[sides] = merged;
      }
      diceRules = next;
    }
    if (cfg.sounds && typeof cfg.sounds === 'object') {
      soundsConfig = { ...soundsConfig, ...cfg.sounds };
    }
  }

  function handleMessage(msg) {
    if (msg.type === 'state') {
      // Stato iniziale — non fade
      applyConfigPayload(msg.payload?.config);
      const saveFade = fadeMs; setFadeMs(0);
      doRender(msg.payload?.content || null);
      setFadeMs(saveFade);
      hideStatus();
    } else if (msg.type === 'show') {
      applyContent(msg.payload);
    } else if (msg.type === 'clear') {
      applyContent(null);
    } else if (msg.type === 'config') {
      applyConfigPayload(msg.payload);
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
