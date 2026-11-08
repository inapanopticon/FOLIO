// Locus — screenshot storage (IndexedDB) + resizing
// Images are too big for localStorage, so they live in IndexedDB keyed by id.

window.LocusImages = (() => {
  const DB = 'locus-images';
  const STORE = 'images';
  let dbPromise = null;
  // Recently used images, so scrolling back is instant. Capped: long screenshots are several MB each, and a
  // phone closes the page if they pile up. Older ones are simply read from storage again.
  const CACHE_MAX_CHARS = 40e6;
  const cache = new Map(); // id -> dataURL, oldest first
  let cacheChars = 0;
  function forget(id) {
    const v = cache.get(id);
    if (v === undefined) return;
    cacheChars -= v.length;
    cache.delete(id);
  }
  function remember(id, dataUrl) {
    forget(id);
    cache.set(id, dataUrl);
    cacheChars += dataUrl.length;
    for (const k of cache.keys()) {
      if (cacheChars <= CACHE_MAX_CHARS || k === id) break;
      forget(k);
    }
  }
  const fresh = new Set(); // saved during this visit: never treated as leftovers (a note may not be committed yet)

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('Could not open image storage.'));
      });
    }
    return dbPromise;
  }

  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const result = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
      t.onerror = () => reject(t.error || new Error('Image storage failed or was interrupted.'));
      t.onabort = () => reject(t.error || new Error('Image storage was interrupted.'));
    });
  }

  async function put(id, dataUrl, strict = false) {
    remember(id, dataUrl); fresh.add(id);
    try { await tx('readwrite', (s) => s.put(dataUrl, id)); } catch (e) { forget(id); if (strict) throw e; console.warn('image save failed', e); }
  }

  async function get(id) {
    if (!id) return null;
    if (cache.has(id)) { const hit = cache.get(id); remember(id, hit); return hit; }
    try {
      const v = await tx('readonly', (s) => s.get(id));
      if (v) remember(id, v);
      return v || null;
    } catch (e) { return null; }
  }

  async function remove(id) {
    if (!id) return;
    forget(id);
    try { await tx('readwrite', (s) => s.delete(id)); } catch (e) {}
  }

  // Shrink a picked file so the longest side is at most `max` px, as JPEG.
  // Keeps text in phone screenshots readable while cutting size ~5-10x.
  function resize(file, max = 1800, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        // Long screenshots (a whole post or article) would become unreadably narrow if only the long
        // side were limited, so those keep a readable width and may be much taller.
        const long = Math.max(img.width, img.height), short = Math.min(img.width, img.height);
        const scale = long / short > 2.5 ? Math.min(1, 1100 / short, 8000 / long) : Math.min(1, max / long);
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // transparent PNGs → white, not black
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Not a readable image')); };
      img.src = url;
    });
  }

  // Every stored id, or null if storage can't be read (then nothing is cleaned up).
  async function keys() {
    try { return await tx('readonly', (s) => s.getAllKeys()); } catch (e) { return null; }
  }
  return { put, get, remove, resize, keys, isFresh: (id) => fresh.has(id) };
})();
