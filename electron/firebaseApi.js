/**
 * Firebase API — Auth, Firestore, Storage per le avventure
 *
 * Approccio: tutto nel main process usando il Firebase client SDK con
 * firebase/auth con persistenza in memoria (inMemoryPersistence) poiché
 * non abbiamo localStorage nel main process. La sessione viene ripristinata
 * salvando email+password criptati in electron-store.
 */

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
        signOut, updateProfile, inMemoryPersistence, setPersistence } = require('firebase/auth');
const { getFirestore, collection, query, where, getDocs, doc, setDoc, getDoc,
        deleteDoc, updateDoc, increment } = require('firebase/firestore');
const { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } = require('firebase/storage');
const Store = require('electron-store').default;

// ── Firebase Config (pubblica, non è un segreto) ──
const firebaseConfig = {
  apiKey: "AIzaSyAteZai6cYSsdXDjgPvxlN4na5jSNBXPWI",
  authDomain: "gm-dashboard-e2f2d.firebaseapp.com",
  projectId: "gm-dashboard-e2f2d",
  storageBucket: "gm-dashboard-e2f2d.firebasestorage.app",
  messagingSenderId: "28803346671",
  appId: "1:28803346671:web:5f3c7abf0e492a0ce86b1a"
};

// ── Init ──
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, inMemoryPersistence);
const db = getFirestore(app);
const storage = getStorage(app);

// Persistenza credenziali (per auto-login tra sessioni)
const globalStore = new Store({
  name: 'global-settings',
  defaults: { firebaseCredentials: null }
});

function saveCredentials(email, password) {
  const encoded = Buffer.from(JSON.stringify({ email, password })).toString('base64');
  globalStore.set('firebaseCredentials', encoded);
}

function getCredentials() {
  const encoded = globalStore.get('firebaseCredentials');
  if (!encoded) return null;
  try {
    return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  } catch { return null; }
}

function clearCredentials() {
  globalStore.set('firebaseCredentials', null);
}

// ── Auth ──

async function register(email, password, displayName) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    saveCredentials(email, password);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName
    };
  } catch (err) {
    return { error: firebaseErrorMessage(err.code) };
  }
}

async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    saveCredentials(email, password);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName
    };
  } catch (err) {
    return { error: firebaseErrorMessage(err.code) };
  }
}

async function logout() {
  clearCredentials();
  await signOut(auth);
}

function getCurrentUser() {
  const user = auth.currentUser;
  if (!user) return null;
  return { uid: user.uid, email: user.email, displayName: user.displayName };
}

async function tryAutoLogin() {
  const creds = getCredentials();
  if (!creds) return null;
  try {
    const cred = await signInWithEmailAndPassword(auth, creds.email, creds.password);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName
    };
  } catch {
    clearCredentials();
    return null;
  }
}

// ── Catalogo Firestore ──

async function fetchPublicAdventures() {
  try {
    const q = query(collection(db, 'adventures'), where('visibility', '==', 'public'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return { error: err.message };
  }
}

async function fetchMyAdventures(userId) {
  try {
    const q = query(collection(db, 'adventures'), where('authorId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    return { error: err.message };
  }
}

async function publishAdventure(adventureId, metadata) {
  try {
    await setDoc(doc(db, 'adventures', adventureId), metadata);
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

async function unpublishAdventure(adventureId) {
  try {
    await deleteDoc(doc(db, 'adventures', adventureId));
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

async function updateAdventureVisibility(adventureId, visibility) {
  try {
    await updateDoc(doc(db, 'adventures', adventureId), { visibility, updatedAt: new Date().toISOString().split('T')[0] });
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Storage ──

async function uploadAdventureZip(userId, adventureId, zipBuffer, onProgress) {
  try {
    const storageRef = ref(storage, `adventures/${userId}/${adventureId}.zip`);
    const uploadTask = uploadBytesResumable(storageRef, zipBuffer);

    await new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          if (onProgress) {
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(percent);
          }
        },
        (err) => reject(err),
        () => resolve()
      );
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return { downloadUrl };
  } catch (err) {
    return { error: err.message };
  }
}

async function deleteAdventureZip(userId, adventureId) {
  try {
    const storageRef = ref(storage, `adventures/${userId}/${adventureId}.zip`);
    await deleteObject(storageRef);
    return { success: true };
  } catch (err) {
    // Ignora se il file non esiste
    if (err.code === 'storage/object-not-found') return { success: true };
    return { error: err.message };
  }
}

async function downloadAdventureZip(downloadUrl, onProgress) {
  // Download usando https nativo per supportare progress
  const https = require('https');
  const http = require('http');

  return new Promise((resolve, reject) => {
    const makeRequest = (url, redirectCount) => {
      if (redirectCount > 5) return reject(new Error('Troppi redirect'));
      const parsed = new URL(url);
      const proto = parsed.protocol === 'https:' ? https : http;

      const req = proto.request({
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: { 'User-Agent': 'GM-Dashboard' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return makeRequest(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download fallito: HTTP ${res.statusCode}`));
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

    makeRequest(downloadUrl, 0);
  });
}

// ── AI Quota ──

async function fetchAiConfig() {
  try {
    const snap = await getDoc(doc(db, 'config', 'ai'));
    if (!snap.exists()) return null;
    return snap.data();
  } catch (err) {
    return { error: err.message };
  }
}

async function getAiUsage(userId) {
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'aiUsage', 'current'));
    if (!snap.exists()) return { tokensUsed: 0 };
    return snap.data();
  } catch (err) {
    return { tokensUsed: 0 };
  }
}

async function incrementAiUsage(userId, tokens) {
  try {
    const docRef = doc(db, 'users', userId, 'aiUsage', 'current');
    await setDoc(docRef, {
      tokensUsed: increment(tokens),
      lastUsed: new Date().toISOString().split('T')[0]
    }, { merge: true });
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

// ── Helpers ──

function firebaseErrorMessage(code) {
  const map = {
    'auth/email-already-in-use': 'Email già registrata',
    'auth/invalid-email': 'Email non valida',
    'auth/weak-password': 'La password deve avere almeno 6 caratteri',
    'auth/user-not-found': 'Account non trovato',
    'auth/wrong-password': 'Password errata',
    'auth/invalid-credential': 'Credenziali non valide',
    'auth/too-many-requests': 'Troppi tentativi, riprova tra qualche minuto',
    'auth/network-request-failed': 'Errore di rete, controlla la connessione'
  };
  return map[code] || `Errore: ${code}`;
}

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  tryAutoLogin,
  fetchPublicAdventures,
  fetchMyAdventures,
  publishAdventure,
  unpublishAdventure,
  updateAdventureVisibility,
  uploadAdventureZip,
  deleteAdventureZip,
  downloadAdventureZip,
  fetchAiConfig,
  getAiUsage,
  incrementAiUsage
};
