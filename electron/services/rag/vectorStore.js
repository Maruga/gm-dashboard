const path = require('path');
const fs = require('fs');

class VectorStore {
  constructor() {
    this.db = null;
    this.dbPath = null;
  }

  open(projectPath) {
    const Database = require('better-sqlite3');
    this.dbPath = path.join(projectPath, '.gm-rag.db');
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS indexed_files (
        file_path TEXT PRIMARY KEY,
        last_modified REAL NOT NULL,
        chunk_count INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        chunk_text TEXT NOT NULL,
        embedding BLOB NOT NULL,
        start_char INTEGER,
        end_char INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_chunks_file ON chunks(file_path);
    `);
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  upsertFileChunks(filePath, chunks, embeddings) {
    const tx = this.db.transaction(() => {
      this.db.prepare('DELETE FROM chunks WHERE file_path = ?').run(filePath);

      const insert = this.db.prepare(
        'INSERT INTO chunks (file_path, chunk_text, embedding, start_char, end_char) VALUES (?, ?, ?, ?, ?)'
      );

      for (let i = 0; i < chunks.length; i++) {
        const buf = Buffer.from(new Float32Array(embeddings[i]).buffer);
        insert.run(filePath, chunks[i].text, buf, chunks[i].startChar, chunks[i].endChar);
      }

      this.db.prepare(`
        INSERT OR REPLACE INTO indexed_files (file_path, last_modified, chunk_count)
        VALUES (?, ?, ?)
      `).run(filePath, Date.now(), chunks.length);
    });
    tx();
  }

  deleteFileChunks(filePath) {
    this.db.prepare('DELETE FROM chunks WHERE file_path = ?').run(filePath);
    this.db.prepare('DELETE FROM indexed_files WHERE file_path = ?').run(filePath);
  }

  search(queryEmbedding, topK = 5) {
    const rows = this.db.prepare(
      'SELECT id, file_path, chunk_text, embedding, start_char, end_char FROM chunks'
    ).all();

    if (rows.length === 0) return [];

    const scored = rows.map(row => {
      const stored = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4);
      let dot = 0;
      for (let i = 0; i < queryEmbedding.length; i++) {
        dot += queryEmbedding[i] * stored[i];
      }
      return {
        filePath: row.file_path,
        fileName: path.basename(row.file_path),
        text: row.chunk_text,
        similarity: dot,
        startChar: row.start_char,
        endChar: row.end_char
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  getAdjacentChunks(filePath, startChar, endChar, expand = 1) {
    // Get chunks from same file that are adjacent (before/after)
    return this.db.prepare(`
      SELECT file_path, chunk_text, start_char, end_char FROM chunks
      WHERE file_path = ? AND id IN (
        SELECT id FROM chunks WHERE file_path = ? AND (
          (end_char <= ? AND end_char > ? - 1) OR
          (start_char >= ? AND start_char < ? + 1)
        )
      )
      ORDER BY start_char ASC
    `).all(filePath, filePath, startChar, startChar, endChar, endChar).map(r => ({
      filePath: r.file_path,
      fileName: path.basename(r.file_path),
      text: r.chunk_text,
      startChar: r.start_char,
      endChar: r.end_char
    }));
  }

  getChunkNeighbors(filePath, startChar, expand = 1) {
    // Get N chunks before and after the given chunk in the same file
    const allFileChunks = this.db.prepare(
      'SELECT chunk_text, start_char, end_char FROM chunks WHERE file_path = ? ORDER BY start_char ASC'
    ).all(filePath);

    const idx = allFileChunks.findIndex(c => c.start_char === startChar);
    if (idx === -1) return [];

    const from = Math.max(0, idx - expand);
    const to = Math.min(allFileChunks.length, idx + expand + 1);
    return allFileChunks.slice(from, to).map(c => ({
      filePath,
      fileName: path.basename(filePath),
      text: c.chunk_text,
      startChar: c.start_char,
      endChar: c.end_char
    }));
  }

  getIndexedFiles() {
    return this.db.prepare('SELECT file_path, last_modified, chunk_count FROM indexed_files').all();
  }

  clear() {
    this.db.exec('DELETE FROM chunks; DELETE FROM indexed_files;');
  }

  getStats() {
    const files = this.db.prepare('SELECT COUNT(*) as c FROM indexed_files').get();
    const chunks = this.db.prepare('SELECT COUNT(*) as c FROM chunks').get();
    let dbSize = 0;
    try { dbSize = fs.statSync(this.dbPath).size; } catch (e) {}
    return { totalFiles: files.c, totalChunks: chunks.c, dbSizeBytes: dbSize };
  }
}

module.exports = new VectorStore();
