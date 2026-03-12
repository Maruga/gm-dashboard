export const FILE_TYPES = {
  DOCUMENT: 'document',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  UNKNOWN: 'unknown'
};

const extensionMap = {
  '.md': FILE_TYPES.DOCUMENT,
  '.html': FILE_TYPES.DOCUMENT,
  '.htm': FILE_TYPES.DOCUMENT,
  '.txt': FILE_TYPES.DOCUMENT,
  '.png': FILE_TYPES.IMAGE,
  '.jpg': FILE_TYPES.IMAGE,
  '.jpeg': FILE_TYPES.IMAGE,
  '.gif': FILE_TYPES.IMAGE,
  '.webp': FILE_TYPES.IMAGE,
  '.svg': FILE_TYPES.IMAGE,
  '.bmp': FILE_TYPES.IMAGE,
  '.mp3': FILE_TYPES.AUDIO,
  '.wav': FILE_TYPES.AUDIO,
  '.ogg': FILE_TYPES.AUDIO,
  '.flac': FILE_TYPES.AUDIO,
  '.aac': FILE_TYPES.AUDIO,
  '.m4a': FILE_TYPES.AUDIO,
  '.mp4': FILE_TYPES.VIDEO,
  '.webm': FILE_TYPES.VIDEO,
  '.mkv': FILE_TYPES.VIDEO,
  '.avi': FILE_TYPES.VIDEO,
  '.mov': FILE_TYPES.VIDEO
};

export function getFileType(extension) {
  if (!extension) return FILE_TYPES.UNKNOWN;
  return extensionMap[extension.toLowerCase()] || FILE_TYPES.UNKNOWN;
}

export function getFileIcon(entry) {
  if (entry.isDirectory) return '📁';
  const type = getFileType(entry.extension);
  switch (type) {
    case FILE_TYPES.DOCUMENT:
      if (entry.extension === '.html' || entry.extension === '.htm') return '🌐';
      return '📄';
    case FILE_TYPES.IMAGE: return '🖼️';
    case FILE_TYPES.AUDIO: return '🎵';
    case FILE_TYPES.VIDEO: return '🎬';
    default: return '📄';
  }
}
