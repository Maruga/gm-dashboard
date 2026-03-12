const https = require('https');
const Store = require('electron-store').default;

const globalStore = new Store({
  name: 'global-settings',
  defaults: { githubToken: '' }
});

// ── Token management (base64 encoded) ──

function saveToken(token) {
  const encoded = Buffer.from(token).toString('base64');
  globalStore.set('githubToken', encoded);
}

function getToken() {
  const encoded = globalStore.get('githubToken');
  if (!encoded) return '';
  return Buffer.from(encoded, 'base64').toString('utf-8');
}

function clearToken() {
  globalStore.set('githubToken', '');
}

// ── HTTPS helper ──

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      // Follow redirects (up to 5)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const url = new URL(res.headers.location);
        const redirectOpts = {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: options.method || 'GET',
          headers: { ...options.headers }
        };
        // Remove auth header on cross-origin redirect
        if (url.hostname !== options.hostname) {
          delete redirectOpts.headers['Authorization'];
        }
        return resolve(httpsRequest(redirectOpts, body));
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({ statusCode: res.statusCode, headers: res.headers, body: buffer });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function githubHeaders(token) {
  return {
    'Authorization': `token ${token}`,
    'User-Agent': 'GM-Dashboard',
    'Accept': 'application/vnd.github.v3+json'
  };
}

// ── API methods ──

async function verifyToken(token) {
  try {
    const res = await httpsRequest({
      hostname: 'api.github.com',
      path: '/user',
      method: 'GET',
      headers: githubHeaders(token)
    });
    if (res.statusCode === 200) {
      const data = JSON.parse(res.body.toString());
      return { valid: true, username: data.login };
    }
    return { valid: false, error: `HTTP ${res.statusCode}` };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

async function fetchCatalog() {
  try {
    const res = await httpsRequest({
      hostname: 'raw.githubusercontent.com',
      path: '/Maruga/gm-dashboard/main/adventures.json',
      method: 'GET',
      headers: { 'User-Agent': 'GM-Dashboard' }
    });
    if (res.statusCode === 200) {
      return JSON.parse(res.body.toString());
    }
    if (res.statusCode === 404) {
      return { version: 1, adventures: [] };
    }
    return { error: `HTTP ${res.statusCode}` };
  } catch (err) {
    return { error: err.message };
  }
}

async function getCatalogWithSha(token) {
  try {
    const res = await httpsRequest({
      hostname: 'api.github.com',
      path: '/repos/Maruga/gm-dashboard/contents/adventures.json',
      method: 'GET',
      headers: githubHeaders(token)
    });
    if (res.statusCode === 200) {
      const data = JSON.parse(res.body.toString());
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return { catalog: JSON.parse(content), sha: data.sha };
    }
    if (res.statusCode === 404) {
      return { catalog: { version: 1, adventures: [] }, sha: null };
    }
    return { error: `HTTP ${res.statusCode}` };
  } catch (err) {
    return { error: err.message };
  }
}

async function updateCatalog(catalog, sha, token, message) {
  const content = Buffer.from(JSON.stringify(catalog, null, 2)).toString('base64');
  const body = JSON.stringify({
    message: message || 'Update adventures catalog',
    content,
    ...(sha ? { sha } : {})
  });
  const res = await httpsRequest({
    hostname: 'api.github.com',
    path: '/repos/Maruga/gm-dashboard/contents/adventures.json',
    method: 'PUT',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, body);
  if (res.statusCode === 200 || res.statusCode === 201) {
    return { success: true };
  }
  return { error: `HTTP ${res.statusCode}: ${res.body.toString().substring(0, 200)}` };
}

async function createRelease(tag, name, description, token) {
  const body = JSON.stringify({
    tag_name: tag,
    name,
    body: description,
    draft: false,
    prerelease: false
  });
  const res = await httpsRequest({
    hostname: 'api.github.com',
    path: '/repos/Maruga/gm-dashboard/releases',
    method: 'POST',
    headers: { ...githubHeaders(token), 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, body);
  if (res.statusCode === 201) {
    return JSON.parse(res.body.toString());
  }
  throw new Error(`Failed to create release: HTTP ${res.statusCode} - ${res.body.toString().substring(0, 200)}`);
}

function uploadReleaseAsset(releaseId, fileName, buffer, token, onProgress) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'uploads.github.com',
      path: `/repos/Maruga/gm-dashboard/releases/${releaseId}/assets?name=${encodeURIComponent(fileName)}`,
      method: 'POST',
      headers: {
        ...githubHeaders(token),
        'Content-Type': 'application/zip',
        'Content-Length': buffer.length
      }
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        if (res.statusCode === 201) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Upload failed: HTTP ${res.statusCode} - ${body.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);

    // Write in chunks for progress
    const chunkSize = 64 * 1024;
    let sent = 0;
    let lastProgressTime = 0;

    function writeNextChunk() {
      while (sent < buffer.length) {
        const end = Math.min(sent + chunkSize, buffer.length);
        const slice = buffer.slice(sent, end);
        sent = end;

        const now = Date.now();
        if (onProgress && now - lastProgressTime > 100) {
          onProgress(sent, buffer.length);
          lastProgressTime = now;
        }

        if (!req.write(slice)) {
          req.once('drain', writeNextChunk);
          return;
        }
      }
      if (onProgress) onProgress(buffer.length, buffer.length);
      req.end();
    }

    writeNextChunk();
  });
}

function downloadFile(url, onProgress) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: { 'User-Agent': 'GM-Dashboard' }
    };

    const makeRequest = (opts, redirectCount) => {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));

      const req = https.request(opts, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const next = new URL(res.headers.location);
          return makeRequest({
            hostname: next.hostname,
            path: next.pathname + next.search,
            method: 'GET',
            headers: { 'User-Agent': 'GM-Dashboard' }
          }, redirectCount + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        }

        const total = parseInt(res.headers['content-length'] || '0', 10);
        const chunks = [];
        let downloaded = 0;
        let lastProgressTime = 0;

        res.on('data', (chunk) => {
          chunks.push(chunk);
          downloaded += chunk.length;
          const now = Date.now();
          if (onProgress && now - lastProgressTime > 100) {
            onProgress(downloaded, total);
            lastProgressTime = now;
          }
        });
        res.on('end', () => {
          if (onProgress) onProgress(downloaded, total);
          resolve(Buffer.concat(chunks));
        });
        res.on('error', reject);
      });
      req.on('error', reject);
      req.end();
    };

    makeRequest(options, 0);
  });
}

module.exports = {
  saveToken,
  getToken,
  clearToken,
  verifyToken,
  fetchCatalog,
  getCatalogWithSha,
  updateCatalog,
  createRelease,
  uploadReleaseAsset,
  downloadFile
};
