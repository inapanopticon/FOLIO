// Locus — screenshot storage (IndexedDB) + resizing
// Images are too big for localStorage, so they live in IndexedDB keyed by id.

window.LocusImages = (() => {
  const DB = 'locus-images';
  const STORE = 'images';
  let dbPromise = null;
  const cache = new Map(); // id -> dataURL

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
    cache.set(id, dataUrl);
    try { await tx('readwrite', (s) => s.put(dataUrl, id)); } catch (e) { cache.delete(id); if (strict) throw e; console.warn('image save failed', e); }
  }

  async function get(id) {
    if (!id) return null;
    if (cache.has(id)) return cache.get(id);
    try {
      const v = await tx('readonly', (s) => s.get(id));
      if (v) cache.set(id, v);
      return v || null;
    } catch (e) { return null; }
  }

  async function remove(id) {
    if (!id) return;
    cache.delete(id);
    try { await tx('readwrite', (s) => s.delete(id)); } catch (e) {}
  }

  // Shrink a picked file so the longest side is at most `max` px, as JPEG.
  // Keeps text in phone screenshots readable while cutting size ~5-10x.
  function resize(file, max = 1800, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
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

  return { put, get, remove, resize };
})();
