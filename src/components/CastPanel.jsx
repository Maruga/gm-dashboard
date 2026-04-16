import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Ordina gli IP LAN mettendo in cima quelli più probabilmente usati dal Wi-Fi casa,
// in fondo quelli di interfacce virtuali (VirtualBox, Docker, VPN aziendali).
// Gli IP che finiscono in .1 sono quasi sempre gateway di interfacce virtuali
// (la scheda Wi-Fi di un client non ha mai IP .1), quindi vengono penalizzati.
function ipPriority(ip) {
  const isGatewayLike = /\.1$/.test(ip);
  if (/^192\.168\.56\./.test(ip)) return 40;                        // VirtualBox host-only
  if (/^192\.168\.(2[0-9]{2})\./.test(ip)) return 35;               // Hyper-V/Docker 192.168.2xx
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return 30;         // Docker/VPN range privato
  if (/^10\./.test(ip)) return 25;                                  // VPN aziendali tipiche
  if (/^192\.168\./.test(ip)) {
    if (isGatewayLike) return 20;                                   // 192.168.x.1 = quasi sempre gateway virtuale
    if (/^192\.168\.(0|1|2|10)\./.test(ip)) return -5;              // Subnet casalinghe comuni
    return 0;                                                       // Altra subnet 192.168 (ma non gateway)
  }
  return 15; // IP LAN meno comune
}

export default function CastPanel({ projectPath, castConfig, onClose }) {
  const [status, setStatus] = useState({ running: false, port: null, addresses: [], channels: [] });
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [port, setPort] = useState(1804);
  const [error, setError] = useState(null);
  const [qrByUrl, setQrByUrl] = useState({}); // { url: dataUrl }
  const [textInput, setTextInput] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);

  // Ordina gli IP con quelli più probabilmente "Wi-Fi casalingo" in cima
  const sortedAddresses = useMemo(() => {
    const list = [...(status.addresses || [])];
    list.sort((a, b) => ipPriority(a) - ipPriority(b));
    return list;
  }, [status.addresses]);

  // Quando la lista IP cambia, resetta la selezione al primo (il più probabile)
  useEffect(() => {
    if (sortedAddresses.length > 0 && (!selectedAddress || !sortedAddresses.includes(selectedAddress))) {
      setSelectedAddress(sortedAddresses[0]);
    }
  }, [sortedAddresses, selectedAddress]);

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // Fallback pre-HTTPS (Clipboard API può rifiutarsi su http): uso un textarea temporanea
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (__) {}
      document.body.removeChild(ta);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(prev => prev === key ? null : prev), 1500);
  };

  const refreshStatus = useCallback(async () => {
    const s = await window.electronAPI.castStatus();
    setStatus(s);
  }, []);

  useEffect(() => {
    refreshStatus();
    const onConn = () => refreshStatus();
    const off1 = window.electronAPI.onCastClientConnected?.(onConn);
    const off2 = window.electronAPI.onCastClientDisconnected?.(onConn);
    return () => { off1?.(); off2?.(); };
  }, [refreshStatus]);

  useEffect(() => {
    // Genera QR per ogni URL pubblico dei canali
    if (!status.running || !selectedAddress) return;
    const host = selectedAddress;
    (async () => {
      const updates = {};
      for (const ch of status.channels || []) {
        const url = `http://${host}:${status.port}/display/${encodeURIComponent(ch.id)}`;
        if (!qrByUrl[url]) {
          const r = await window.electronAPI.castQr(url);
          if (r?.dataUrl) updates[url] = r.dataUrl;
        }
      }
      if (Object.keys(updates).length) setQrByUrl(prev => ({ ...prev, ...updates }));
    })();
  }, [status.running, selectedAddress, status.port, status.channels]);

  const handleStart = async () => {
    setError(null);
    setStarting(true);
    try {
      const r = await window.electronAPI.castStart({ port, projectPath });
      if (r?.error) setError(r.error);
      else {
        // Sync config corrente sul server (transizione, regole dadi, suoni)
        const transition = castConfig?.transition || 'crossfade';
        const fadeMs = transition === 'cut' ? 0 : (castConfig?.fadeMs ?? 250);
        // Prepara config suoni: se source='display', servono il catalog al client
        let soundsCfg = null;
        if (castConfig?.sounds) {
          const catalog = castConfig.sounds.source === 'display'
            ? (await window.electronAPI.assetsListSounds?.(projectPath))?.sounds || {}
            : {};
          soundsCfg = {
            enabled: castConfig.sounds.enabled !== false,
            volume: castConfig.sounds.volume ?? 0.7,
            source: castConfig.sounds.source || 'pc',
            catalog
          };
        }
        await window.electronAPI.castSetConfig({
          transition, fadeMs,
          diceRules: castConfig?.diceRules || {},
          sounds: soundsCfg
        });
        // Sync passepartout sul canale default
        const pass = castConfig?.passepartoutFile;
        if (pass) {
          const url = `/files/${encodeURI(pass).replace(/#/g, '%23').replace(/\?/g, '%3F')}`;
          await window.electronAPI.castSetDefault('default', {
            type: 'image', url, fit: 'cover'
          });
        }
      }
      await refreshStatus();
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await window.electronAPI.castStop();
      setQrByUrl({});
      await refreshStatus();
    } finally {
      setStopping(false);
    }
  };

  const handleSendText = async (channelId) => {
    const content = textInput.trim();
    if (!content) return;
    await window.electronAPI.castSend(channelId, { type: 'text', content });
    setTextInput('');
    await refreshStatus();
  };

  const handleClear = async (channelId) => {
    await window.electronAPI.castClear(channelId);
    await refreshStatus();
  };

  const chUrl = (channelId) => {
    if (!status.running || !selectedAddress) return null;
    return `http://${selectedAddress}:${status.port}/display/${encodeURIComponent(channelId)}`;
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--overlay-medium)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(920px, 92vw)', maxHeight: '88vh', overflowY: 'auto',
          background: 'var(--bg-panel)', border: '1px solid var(--border-default)',
          borderRadius: '8px', padding: '20px 24px', boxShadow: 'var(--shadow-panel)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--accent)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            📡 Casting al tavolo
          </div>
          <span className="close-btn" onClick={onClose} style={{ fontSize: '16px' }}>✕</span>
        </div>

        {/* Server controls */}
        <div style={{
          border: '1px solid var(--border-subtle)', borderRadius: '6px',
          padding: '12px 16px', marginBottom: '16px', background: 'var(--bg-main)'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', color: status.running ? 'var(--color-success)' : 'var(--text-disabled)',
              fontWeight: '600'
            }}>
              ● {status.running ? 'Server attivo' : 'Server spento'}
            </span>

            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Porta
              <input
                type="number"
                value={port}
                disabled={status.running}
                onChange={e => setPort(parseInt(e.target.value, 10) || 1804)}
                style={{
                  width: '70px', background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)', borderRadius: '3px',
                  padding: '3px 6px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none'
                }}
              />
            </label>

            {!status.running ? (
              <button
                onClick={handleStart} disabled={starting}
                style={{
                  background: 'none', border: '1px solid var(--accent)', borderRadius: '4px',
                  padding: '5px 14px', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer'
                }}
              >{starting ? 'Avvio...' : '▶ Avvia server'}</button>
            ) : (
              <button
                onClick={handleStop} disabled={stopping}
                style={{
                  background: 'none', border: '1px solid var(--color-danger)', borderRadius: '4px',
                  padding: '5px 14px', color: 'var(--color-danger)', fontSize: '12px', cursor: 'pointer'
                }}
              >{stopping ? 'Stop...' : '■ Ferma server'}</button>
            )}

            {status.running && sortedAddresses.length > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <select
                  value={selectedAddress || ''}
                  onChange={e => setSelectedAddress(e.target.value)}
                  title="Seleziona l'IP del tuo Wi-Fi (il primo è di solito quello giusto)"
                  style={{
                    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                    borderRadius: '3px', padding: '2px 6px', color: 'var(--text-primary)',
                    fontSize: '11px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  {sortedAddresses.map((ip, i) => (
                    <option key={ip} value={ip}>
                      {ip}{i === 0 ? ' (consigliato)' : ''}
                    </option>
                  ))}
                </select>
                <span>:{status.port}</span>
                <button
                  onClick={() => copyToClipboard(`http://${selectedAddress}:${status.port}`, 'server')}
                  title="Copia indirizzo"
                  style={{
                    background: 'none',
                    border: '1px solid ' + (copiedKey === 'server' ? 'var(--color-success)' : 'var(--border-default)'),
                    borderRadius: '3px', padding: '2px 8px',
                    color: copiedKey === 'server' ? 'var(--color-success)' : 'var(--text-secondary)',
                    fontSize: '10px', cursor: 'pointer'
                  }}
                >
                  {copiedKey === 'server' ? '✓ Copiato' : '📋 Copia'}
                </button>
              </span>
            )}
          </div>

          {error && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}

          {status.running && (
            <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              Se il dispositivo non si collega, prova a selezionare un altro IP dal menu (alcuni PC hanno IP virtuali di VirtualBox/VPN/Docker).
              Al primo avvio Windows può chiedere permesso per aprire connessioni in LAN — accetta.
            </div>
          )}
        </div>

        {/* Canali */}
        {status.running && (
          <>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600', marginBottom: '8px' }}>
              Canali
            </div>
            {(status.channels || []).map(ch => {
              const url = chUrl(ch.id);
              const qr = url ? qrByUrl[url] : null;
              return (
                <div key={ch.id} style={{
                  border: '1px solid var(--border-subtle)', borderRadius: '6px',
                  padding: '12px 16px', marginBottom: '10px', background: 'var(--bg-elevated)'
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    {qr && (
                      <img src={qr} alt="QR" style={{ width: '120px', height: '120px', background: '#fff', borderRadius: '4px', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {ch.name}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          ID: {ch.id}
                        </span>
                        <span style={{
                          fontSize: '10px', padding: '1px 7px', borderRadius: '10px',
                          background: ch.clientsCount > 0 ? 'var(--accent-a04)' : 'transparent',
                          border: `1px solid ${ch.clientsCount > 0 ? 'var(--accent)' : 'var(--border-default)'}`,
                          color: ch.clientsCount > 0 ? 'var(--accent)' : 'var(--text-tertiary)'
                        }}>
                          {ch.clientsCount} connesso{ch.clientsCount === 1 ? '' : 'i'}
                        </span>
                      </div>
                      {url && (
                        <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-all', flex: 1, minWidth: 0 }}>
                            {url}
                          </span>
                          <button
                            onClick={() => copyToClipboard(url, 'ch:' + ch.id)}
                            title="Copia URL canale"
                            style={{
                              background: 'none',
                              border: '1px solid ' + (copiedKey === 'ch:' + ch.id ? 'var(--color-success)' : 'var(--border-default)'),
                              borderRadius: '3px', padding: '2px 8px',
                              color: copiedKey === 'ch:' + ch.id ? 'var(--color-success)' : 'var(--text-secondary)',
                              fontSize: '10px', cursor: 'pointer', flexShrink: 0
                            }}
                          >
                            {copiedKey === 'ch:' + ch.id ? '✓ Copiato' : '📋 Copia'}
                          </button>
                        </div>
                      )}

                      {/* Invio testo di prova */}
                      <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={textInput}
                          onChange={e => setTextInput(e.target.value)}
                          placeholder="Testo di prova da inviare al display..."
                          style={{
                            flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                            borderRadius: '4px', padding: '5px 8px', color: 'var(--text-primary)',
                            fontSize: '12px', outline: 'none'
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') handleSendText(ch.id); }}
                        />
                        <button
                          onClick={() => handleSendText(ch.id)}
                          disabled={!textInput.trim()}
                          style={{
                            background: 'none', border: '1px solid var(--accent)', borderRadius: '4px',
                            padding: '4px 12px', color: 'var(--accent)', fontSize: '11px',
                            cursor: textInput.trim() ? 'pointer' : 'not-allowed'
                          }}
                        >📤 Invia</button>
                        <button
                          onClick={() => handleClear(ch.id)}
                          style={{
                            background: 'none', border: '1px solid var(--border-default)', borderRadius: '4px',
                            padding: '4px 12px', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer'
                          }}
                        >🌑 Schermo vuoto</button>
                      </div>

                      {ch.lastContent && (
                        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                          Ora mostra: <span style={{ color: 'var(--text-secondary)' }}>
                            {ch.lastContent.type === 'text' ? `testo "${(ch.lastContent.content || '').substring(0, 40)}..."` :
                             ch.lastContent.type === 'image' ? 'immagine' :
                             ch.lastContent.type === 'dice' ? `dado d${ch.lastContent.sides} = ${ch.lastContent.value}` :
                             ch.lastContent.type}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {!status.running && (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '12px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
            Avvia il server per generare i canali e il QR code da scansionare con il dispositivo del tavolo.
          </div>
        )}
      </div>
    </div>
  );
}
