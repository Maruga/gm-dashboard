const EventEmitter = require('events');
let TelegramBotLib = null;

class GmDashBot extends EventEmitter {
  constructor() {
    super();
    this.bot = null;
    this.sessionCode = null;
    this.players = [];
    this.running = false;
    this.botInfo = null;
    this.pendingNames = new Map();
  }

  async start(token, sessionCode, players) {
    console.log('[BOT] start() chiamato, running:', this.running, 'bot:', !!this.bot);
    if (this.running) {
      console.log('[BOT] Era già running, fermo prima...');
      await this.stop();
    }
    if (!TelegramBotLib) TelegramBotLib = require('node-telegram-bot-api');

    this.sessionCode = sessionCode;
    this.players = JSON.parse(JSON.stringify(players));

    try {
      console.log('[BOT] Creo istanza (polling: false)...');
      this.bot = new TelegramBotLib(token, { polling: false });

      this.bot.on('polling_error', (err) => {
        console.error('[BOT] polling_error:', err.message);
      });

      console.log('[BOT] Chiamo getMe()...');
      this.botInfo = await this.bot.getMe();
      console.log('[BOT] getMe() ok:', this.botInfo.username);

      console.log('[BOT] Registro comandi...');
      this._registerCommands();

      console.log('[BOT] Avvio polling...');
      await this.bot.startPolling();

      this.running = true;
      console.log('[BOT] Avviato con successo');
      return { success: true, botInfo: { username: this.botInfo.username, firstName: this.botInfo.first_name } };
    } catch (err) {
      console.error('[BOT] Errore start:', err.message);
      if (this.bot) {
        try { await this.bot.stopPolling(); } catch (e) { console.warn('[bot-stop-polling]', e.message); }
      }
      this.bot = null;
      return { error: err.message };
    }
  }

  async stop() {
    console.log('[BOT] stop() chiamato, running:', this.running, 'bot:', !!this.bot);
    if (this.bot) {
      try { await this.bot.stopPolling(); } catch (e) { console.error('[BOT] stopPolling error:', e.message); }
      this.bot = null;
    }
    this.running = false;
    this.botInfo = null;
    console.log('[BOT] Fermato');
  }

  updateSession(sessionCode, players) {
    this.sessionCode = sessionCode;
    this.players = JSON.parse(JSON.stringify(players));
  }

  _registerCommands() {
    this.bot.onText(/\/start/, (msg) => {
      this.bot.sendMessage(msg.chat.id,
        '🎴 *GENKAI GM Dashboard*\n\n' +
        'Benvenuto! Per unirti a una sessione di gioco, usa il comando:\n' +
        '`/join CODICE`\n' +
        '`/join CODICE NomeTuo`\n\n' +
        'Il codice te lo comunica il Game Master.',
        { parse_mode: 'Markdown' }
      );
    });

    this.bot.onText(/\/join\s+(\S+)(?:\s+(.+))?/, (msg, match) => {
      const code = match[1];
      const playerName = match[2] ? match[2].trim() : '';
      const chatId = msg.chat.id;

      if (code !== this.sessionCode) {
        this.bot.sendMessage(chatId, '❌ Codice non valido. Controlla il codice con il tuo Game Master.');
        return;
      }

      const existing = this.players.find(p => p.telegramChatId === String(chatId));
      if (existing) {
        this.bot.sendMessage(chatId, `Sei già registrato come *${existing.characterName}*.`, { parse_mode: 'Markdown' });
        return;
      }

      const available = this.players.filter(p => !p.telegramChatId);
      if (available.length === 0) {
        this.bot.sendMessage(chatId, '⚠️ Tutti i personaggi sono già stati assegnati.');
        return;
      }

      // Salva il nome del giocatore per il callback_query
      if (playerName) {
        this.pendingNames.set(String(chatId), playerName);
      }

      const keyboard = available.map(p => ([{
        text: p.characterName || 'Senza nome',
        callback_data: `join_${p.id}`
      }]));

      this.bot.sendMessage(chatId, '🎭 Scegli il tuo personaggio:', {
        reply_markup: { inline_keyboard: keyboard }
      });
    });

    this.bot.on('callback_query', (query) => {
      if (!query.data || !query.data.startsWith('join_')) return;
      const playerId = query.data.substring(5);
      const chatId = query.message.chat.id;

      const player = this.players.find(p => p.id === playerId);
      if (!player) {
        this.bot.answerCallbackQuery(query.id, { text: 'Personaggio non trovato.' });
        return;
      }
      if (player.telegramChatId) {
        this.bot.answerCallbackQuery(query.id, { text: 'Questo personaggio è già assegnato.' });
        return;
      }
      const existingPlayer = this.players.find(p => p.telegramChatId === String(chatId));
      if (existingPlayer) {
        this.bot.answerCallbackQuery(query.id, { text: `Sei già registrato come ${existingPlayer.characterName}.` });
        return;
      }

      player.telegramChatId = String(chatId);
      const pendingName = this.pendingNames.get(String(chatId)) || '';
      this.pendingNames.delete(String(chatId));

      this.bot.answerCallbackQuery(query.id);
      const confirmMsg = pendingName
        ? `✅ *${pendingName}*, sei registrato come *${player.characterName || 'Senza nome'}*! Riceverai gli handout durante la sessione.`
        : `✅ Sei registrato come *${player.characterName || 'Senza nome'}*! Riceverai gli handout durante la sessione.`;
      this.bot.sendMessage(chatId, confirmMsg, { parse_mode: 'Markdown' });
      this.bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: chatId,
        message_id: query.message.message_id
      }).catch(() => {});

      this.emit('player-joined', {
        chatId: String(chatId),
        playerId: player.id,
        characterName: player.characterName,
        playerName: pendingName
      });
    });

    this.bot.onText(/\/leave/, (msg) => {
      const chatId = String(msg.chat.id);
      const player = this.players.find(p => p.telegramChatId === chatId);
      if (!player) {
        this.bot.sendMessage(msg.chat.id, 'Non sei registrato in nessuna sessione.');
        return;
      }
      const characterName = player.characterName;
      player.telegramChatId = '';
      this.bot.sendMessage(msg.chat.id, '👋 Ti sei disconnesso dalla sessione.');
      this.emit('player-left', { chatId, playerId: player.id, characterName });
    });

    this.bot.onText(/\/id/, (msg) => {
      this.bot.sendMessage(msg.chat.id, `Il tuo Chat ID è: \`${msg.chat.id}\``, { parse_mode: 'Markdown' });
    });

    // /ai e /ia — sinonimi per domande AI (rimpiazza /ask)
    this.bot.onText(/\/(ai|ia)\s+(.+)/s, (msg, match) => {
      const chatId = String(msg.chat.id);
      const player = this.players.find(p => p.telegramChatId === chatId);
      if (!player) return;
      this.emit('message-received', {
        chatId,
        playerId: player.id,
        characterName: player.characterName || 'Senza nome',
        playerName: player.playerName || '',
        text: `/ai ${match[2]}`,
        timestamp: new Date(msg.date * 1000).toISOString()
      });
    });

    // Listen for ALL text messages from registered players (not commands)
    this.bot.on('message', (msg) => {
      if (!msg.text || msg.text.startsWith('/')) return;
      const chatId = String(msg.chat.id);
      const player = this.players.find(p => p.telegramChatId === chatId);
      if (!player) return; // not a registered player, ignore
      this.emit('message-received', {
        chatId,
        playerId: player.id,
        characterName: player.characterName || 'Senza nome',
        playerName: player.playerName || '',
        text: msg.text,
        timestamp: new Date(msg.date * 1000).toISOString()
      });
    });
  }

  async sendMessage(chatId, text) {
    if (!this.bot) return { error: 'Bot non avviato' };
    try {
      await this.bot.sendMessage(chatId, text);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  async sendPhoto(chatId, photoPathOrBuffer, caption) {
    if (!this.bot) return { error: 'Bot non avviato' };
    try {
      const opts = caption ? { caption } : {};
      await this.bot.sendPhoto(chatId, photoPathOrBuffer, opts);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }

  async sendDocument(chatId, filePath, caption) {
    if (!this.bot) return { error: 'Bot non avviato' };
    try {
      const opts = caption ? { caption } : {};
      await this.bot.sendDocument(chatId, filePath, opts);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }
}

async function verifyToken(token) {
  if (!TelegramBotLib) TelegramBotLib = require('node-telegram-bot-api');
  try {
    const testBot = new TelegramBotLib(token, { polling: false });
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000));
    const info = await Promise.race([testBot.getMe(), timeout]);
    return { success: true, botInfo: { username: info.username, firstName: info.first_name } };
  } catch (err) {
    return { error: err.message === 'timeout' ? 'Timeout — controlla la connessione' : 'Token non valido, ricontrolla' };
  }
}

async function htmlToImage(BrowserWindow, htmlFilePath) {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: { offscreen: true }
  });

  const fileUrl = `file:///${htmlFilePath.replace(/\\/g, '/')}`;
  await win.loadURL(fileUrl);
  await new Promise(r => setTimeout(r, 1500));

  // Get full page height
  const height = await win.webContents.executeJavaScript('document.body.scrollHeight');
  win.setSize(800, Math.min(height + 50, 16000));
  await new Promise(r => setTimeout(r, 500));

  const image = await win.webContents.capturePage();
  const pngBuffer = image.toPNG();
  win.destroy();
  return pngBuffer;
}

module.exports = { GmDashBot, verifyToken, htmlToImage };
