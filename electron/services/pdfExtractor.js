const fs = require('fs');
const path = require('path');

/**
 * Clean up PDF-extracted text: fix split syllables, normalize whitespace.
 * PDF text extraction often produces "Chier ico" instead of "Chierico".
 */
function cleanPdfText(text) {
  let c = text;
  // Fix split syllables: single space between lowercase letters → join
  // e.g. "Chier ico" → "Chierico", "Liv ell o" → "Livello"
  c = c.replace(/([a-zàèéìòùáéíóú])[ ]([a-zàèéìòùáéíóú])/gi, (match, a, b) => {
    // Only join if both sides are lowercase (not acronyms like "HP" or "CA")
    if (a === a.toLowerCase() && b === b.toLowerCase()) return a + b;
    return match;
  });
  // Apply twice for chains like "L i v e l l o"
  c = c.replace(/([a-zàèéìòùáéíóú])[ ]([a-zàèéìòùáéíóú])/gi, (match, a, b) => {
    if (a === a.toLowerCase() && b === b.toLowerCase()) return a + b;
    return match;
  });
  // Normalize multiple spaces
  c = c.replace(/[ \t]{2,}/g, ' ');
  // Normalize multiple newlines
  c = c.replace(/\n{3,}/g, '\n\n');
  return c.trim();
}

/**
 * Extract text from a PDF file using unpdf (no worker, no canvas).
 * @param {string} filePath — absolute path to PDF
 * @returns {Promise<string>} — extracted and cleaned text
 */
async function extractPdfText(filePath) {
  try {
    const { getDocumentProxy, extractText } = await import('unpdf');
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await getDocumentProxy(data);
    const { text } = await extractText(doc, { mergePages: true });
    const cleaned = cleanPdfText(text);
    return cleaned;
  } catch (err) {
    console.warn(`[pdf-extract] Failed: ${path.basename(filePath)}: ${err.message}`);
    return '';
  }
}

module.exports = { extractPdfText };
