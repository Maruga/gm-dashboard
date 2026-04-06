class ChunkService {
  constructor() {
    this.chunkSize = 500;
    this.chunkOverlap = 50;
    this.minChunkSize = 50;
  }

  setOptions(opts) {
    if (opts.chunkSize) this.chunkSize = opts.chunkSize;
    if (opts.chunkOverlap !== undefined) this.chunkOverlap = opts.chunkOverlap;
  }

  getOptions() {
    return { chunkSize: this.chunkSize, chunkOverlap: this.chunkOverlap };
  }

  chunkDocument(text) {
    const cleaned = this.cleanText(text);
    if (cleaned.length < this.minChunkSize) return [];
    if (cleaned.length <= this.chunkSize) {
      return [{ text: cleaned, startChar: 0, endChar: cleaned.length }];
    }

    const chunks = [];
    let start = 0;

    while (start < cleaned.length) {
      let end = Math.min(start + this.chunkSize, cleaned.length);

      if (end < cleaned.length) {
        const slice = cleaned.slice(start, end);
        const minBreak = Math.floor(this.chunkSize * 0.3);

        // Priority 1: paragraph break (\n\n)
        let breakPoint = slice.lastIndexOf('\n\n');

        // Priority 2: sentence end (. ! ?)
        if (breakPoint < minBreak) {
          breakPoint = Math.max(
            slice.lastIndexOf('. '),
            slice.lastIndexOf('.\n'),
            slice.lastIndexOf('! '),
            slice.lastIndexOf('? ')
          );
        }

        // Priority 3: last space (never split mid-word)
        if (breakPoint < minBreak) {
          breakPoint = slice.lastIndexOf(' ');
        }

        if (breakPoint >= minBreak) {
          end = start + breakPoint + 1;
        }
      }

      const chunkText = cleaned.slice(start, end).trim();
      if (chunkText.length >= this.minChunkSize) {
        chunks.push({ text: chunkText, startChar: start, endChar: end });
      }

      let nextStart = end - this.chunkOverlap;
      if (nextStart <= start) {
        start = end;
      } else {
        // Don't start mid-word: advance to next space
        if (nextStart < cleaned.length && cleaned[nextStart] !== ' ' && cleaned[nextStart] !== '\n') {
          const nextSpace = cleaned.indexOf(' ', nextStart);
          if (nextSpace !== -1 && nextSpace < nextStart + 20) {
            nextStart = nextSpace + 1;
          }
        }
        start = nextStart;
      }
    }

    return chunks;
  }

  cleanText(text) {
    let c = text || '';
    c = c.replace(/<[^>]+>/g, ' ');
    c = c.replace(/```[\s\S]*?```/g, '');
    c = c.replace(/#{1,6}\s+/g, '');
    c = c.replace(/\*\*([^*]+)\*\*/g, '$1');
    c = c.replace(/\*([^*]+)\*/g, '$1');
    c = c.replace(/`([^`]+)`/g, '$1');
    c = c.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    c = c.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
    c = c.replace(/[ \t]+/g, ' ');
    c = c.replace(/\n{3,}/g, '\n\n');
    return c.trim();
  }
}

module.exports = new ChunkService();
