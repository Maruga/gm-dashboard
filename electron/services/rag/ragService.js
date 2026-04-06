const embeddingService = require('./embeddingService');
const chunkService = require('./chunkService');
const vectorStore = require('./vectorStore');
const fs = require('fs');
const path = require('path');

class RagService {
  constructor() {
    this.projectPath = null;
    this.indexing = false;
    this.initialized = false;
    this.fileExtensions = ['.md', '.html', '.htm', '.txt'];
    this.topK = 7;
    this.contextExpand = 1; // 0=no expansion, 1=±1 chunk, 2=±2 chunks
  }

  // ── Lifecycle ──

  async open(projectPath, options = {}, onProgress = null) {
    this.projectPath = projectPath;

    if (options.chunkSize || options.chunkOverlap) chunkService.setOptions(options);
    if (options.topK) this.topK = options.topK;
    if (options.contextExpand !== undefined) this.contextExpand = options.contextExpand;
    if (options.fileExtensions) this.fileExtensions = options.fileExtensions;

    // Init embedding model (first run downloads ~46MB)
    if (!embeddingService.isReady()) {
      if (onProgress) onProgress({ phase: 'model', message: 'Caricamento modello ricerca AI...', progress: 0 });
      await embeddingService.initialize((p) => {
        if (onProgress && p.status === 'progress') {
          onProgress({ phase: 'model', message: `Scaricamento modello: ${Math.round(p.progress || 0)}%`, progress: p.progress });
        }
      });
    }

    vectorStore.open(projectPath);
    this.initialized = true;

    // Incremental indexing in background
    this.indexIncremental(onProgress).catch(err => {
      console.error('RAG indexIncremental error:', err);
    });
  }

  async close() {
    vectorStore.close();
    this.initialized = false;
    this.projectPath = null;
  }

  // ── Indexing ──

  async indexAll(onProgress = null) {
    if (this.indexing) return;
    this.indexing = true;
    try {
      vectorStore.clear();
      const files = this._scanFiles();
      for (let i = 0; i < files.length; i++) {
        if (onProgress) {
          onProgress({
            phase: 'indexing',
            message: `Indicizzazione: ${path.basename(files[i])}`,
            current: i + 1, total: files.length,
            progress: Math.round(((i + 1) / files.length) * 100)
          });
        }
        await this._indexFile(files[i]);
        // Yield to main process event loop — prevents UI freeze
        await new Promise(r => setTimeout(r, 10));
      }
      if (onProgress) {
        const stats = this.getStats();
        onProgress({ phase: 'done', message: `Completato: ${stats.totalFiles} file, ${stats.totalChunks} blocchi`, progress: 100 });
      }
    } finally {
      this.indexing = false;
    }
  }

  async indexIncremental(onProgress = null) {
    if (this.indexing) return;
    this.indexing = true;
    try {
      const currentFiles = this._scanFiles();
      const indexed = vectorStore.getIndexedFiles();
      const indexedMap = new Map(indexed.map(f => [f.file_path, f.last_modified]));
      const currentSet = new Set();
      const toUpdate = [];

      for (const fp of currentFiles) {
        currentSet.add(fp);
        try {
          const mtime = fs.statSync(fp).mtimeMs;
          if (!indexedMap.has(fp) || indexedMap.get(fp) < mtime) {
            toUpdate.push(fp);
          }
        } catch (e) { /* file inaccessible */ }
      }

      // Remove deleted files from index
      for (const [fp] of indexedMap) {
        if (!currentSet.has(fp)) vectorStore.deleteFileChunks(fp);
      }

      if (toUpdate.length === 0) {
        if (onProgress) onProgress({ phase: 'done', message: 'Indice aggiornato.', progress: 100 });
        return;
      }

      for (let i = 0; i < toUpdate.length; i++) {
        if (onProgress) {
          onProgress({
            phase: 'indexing',
            message: `Aggiornamento: ${path.basename(toUpdate[i])}`,
            current: i + 1, total: toUpdate.length,
            progress: Math.round(((i + 1) / toUpdate.length) * 100)
          });
        }
        await this._indexFile(toUpdate[i]);
        await new Promise(r => setTimeout(r, 10));
      }

      if (onProgress) {
        onProgress({ phase: 'done', message: `Aggiornati ${toUpdate.length} file.`, progress: 100 });
      }
    } finally {
      this.indexing = false;
    }
  }

  async updateFile(filePath) {
    if (!this.initialized) return;
    await this._indexFile(filePath);
  }

  removeFile(filePath) {
    if (!this.initialized) return;
    vectorStore.deleteFileChunks(filePath);
  }

  // ── Search ──

  async search(question, topK = null) {
    if (!this.initialized) return [];
    const k = topK || this.topK;
    const queryEmbedding = await embeddingService.embed(question);
    return vectorStore.search(queryEmbedding, k);
  }

  async buildContext(question, topK = null) {
    const results = await this.search(question, topK);
    if (results.length === 0) return '';

    // Expand context: include adjacent chunks for each result
    const allChunks = new Map(); // key: filePath+startChar → deduplicate

    for (const r of results) {
      if (this.contextExpand > 0) {
        const neighbors = vectorStore.getChunkNeighbors(r.filePath, r.startChar, this.contextExpand);
        for (const n of neighbors) {
          const key = `${n.filePath}:${n.startChar}`;
          if (!allChunks.has(key)) allChunks.set(key, n);
        }
      } else {
        const key = `${r.filePath}:${r.startChar}`;
        if (!allChunks.has(key)) allChunks.set(key, r);
      }
    }

    // Group by file, sort by startChar within each file
    const byFile = new Map();
    for (const c of allChunks.values()) {
      if (!byFile.has(c.fileName)) byFile.set(c.fileName, []);
      byFile.get(c.fileName).push(c);
    }

    let ctx = '';
    for (const [name, chunks] of byFile) {
      chunks.sort((a, b) => a.startChar - b.startChar);
      ctx += `--- ${name} ---\n`;
      let lastEnd = -1;
      for (const c of chunks) {
        if (lastEnd > c.startChar && lastEnd < c.endChar) {
          // Overlap: trim the beginning to avoid duplicate text
          const overlapChars = lastEnd - c.startChar;
          ctx += c.text.slice(overlapChars).trimStart() + '\n\n';
        } else {
          ctx += c.text + '\n\n';
        }
        lastEnd = Math.max(lastEnd, c.endChar);
      }
    }
    return ctx;
  }

  // ── Management ──

  async reset(onProgress = null) {
    vectorStore.close();
    for (const ext of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(path.join(this.projectPath, `.gm-rag.db${ext}`)); } catch (e) {}
    }
    vectorStore.open(this.projectPath);
    await this.indexAll(onProgress);
  }

  applyOptions(options) {
    const old = chunkService.getOptions();
    let needsReindex = false;

    if (options.chunkSize && options.chunkSize !== old.chunkSize) needsReindex = true;
    if (options.chunkOverlap !== undefined && options.chunkOverlap !== old.chunkOverlap) needsReindex = true;

    chunkService.setOptions({
      chunkSize: options.chunkSize || old.chunkSize,
      chunkOverlap: options.chunkOverlap !== undefined ? options.chunkOverlap : old.chunkOverlap
    });
    if (options.topK) this.topK = options.topK;
    if (options.contextExpand !== undefined) this.contextExpand = options.contextExpand;
    if (options.fileExtensions) this.fileExtensions = options.fileExtensions;

    return needsReindex;
  }

  getStats() {
    if (!this.initialized) return { totalFiles: 0, totalChunks: 0, dbSizeBytes: 0 };
    return vectorStore.getStats();
  }

  isReady() { return this.initialized && !this.indexing; }
  isIndexing() { return this.indexing; }

  // ── Private ──

  async _indexFile(filePath) {
    let content;
    try { content = fs.readFileSync(filePath, 'utf-8'); } catch (e) { return; }
    const chunks = chunkService.chunkDocument(content);
    if (chunks.length === 0) return;

    const texts = chunks.map(c => c.text);
    const embeddings = await embeddingService.embedBatch(texts);
    vectorStore.upsertFileChunks(filePath, chunks, embeddings);
  }

  _scanFiles() {
    const files = [];
    const scan = (dir) => {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { scan(full); }
        else if (e.isFile() && this.fileExtensions.includes(path.extname(e.name).toLowerCase())) {
          files.push(full);
        }
      }
    };
    scan(this.projectPath);
    return files;
  }
}

module.exports = new RagService();
