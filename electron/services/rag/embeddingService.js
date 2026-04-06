const path = require('path');

const DEFAULT_MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const DIMENSIONS = 384;

class EmbeddingService {
  constructor() {
    this.pipeline = null;
    this.modelId = DEFAULT_MODEL;
    this.dimensions = DIMENSIONS;
    this.loading = false;
    this.ready = false;
  }

  async initialize(onProgress = null) {
    if (this.ready || this.loading) return;
    this.loading = true;
    try {
      const { pipeline, env } = await import('@huggingface/transformers');
      const { app } = require('electron');
      env.cacheDir = path.join(app.getPath('userData'), 'models');
      env.allowRemoteModels = true;
      env.allowLocalModels = true;

      this.pipeline = await pipeline('feature-extraction', this.modelId, {
        quantized: true,
        progress_callback: onProgress || undefined
      });
      this.ready = true;
    } catch (err) {
      console.error('EmbeddingService init error:', err);
      throw err;
    } finally {
      this.loading = false;
    }
  }

  async embed(text) {
    if (!this.ready) await this.initialize();
    const result = await this.pipeline(text, { pooling: 'mean', normalize: true });
    return Array.from(result.data);
  }

  async embedBatch(texts, batchSize = 32) {
    if (!this.ready) await this.initialize();
    const all = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const results = await this.pipeline(batch, { pooling: 'mean', normalize: true });
      for (let j = 0; j < batch.length; j++) {
        const start = j * this.dimensions;
        all.push(Array.from(results.data.slice(start, start + this.dimensions)));
      }
    }
    return all;
  }

  async dispose() {
    this.pipeline = null;
    this.ready = false;
    this.loading = false;
  }

  isReady() { return this.ready; }
  isLoading() { return this.loading; }
  getDimensions() { return this.dimensions; }
}

module.exports = new EmbeddingService();
