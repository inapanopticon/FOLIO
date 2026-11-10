// Folio — full backup and restore: one zip with all saved data and every image.
// The API key lives apart from this data and is never included.

window.LocusBackup = (() => {
  const S = window.LocusStore, Images = window.LocusImages;
  const MANIFEST = 'folio-backup.json';
  const NOT_A_BACKUP = 'This file is not a Folio backup.';
  const DAMAGED = 'This backup file is damaged, so nothing was changed.';

  const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  // Minimal zip writer (stored, no compression: the images are already JPEG). UTF-8 names.
  function makeZip(files) {
    const enc = new TextEncoder(), parts = [], central = [];
    let offset = 0;
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    for (const f of files) {
      const name = enc.encode(f.name), data = f.bytes, crc = crc32(data);
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
      local.setUint16(8, 0, true); local.setUint16(10, time, true); local.setUint16(12, date, true);
      local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
      parts.push(local.buffer, name, data);
      const cen = new DataView(new ArrayBuffer(46));
      cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true); cen.setUint16(12, time, true); cen.setUint16(14, date, true);
      cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true);
      cen.setUint16(28, name.length, true); cen.setUint32(42, offset, true);
      central.push(cen.buffer, name);
      offset += 30 + name.length + data.length;
    }
    const size = central.reduce((n, p) => n + (p.byteLength ?? p.length), 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, size, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
  }
  const dataUrlBytes = (url) => {
    const [head, b64] = url.split(',');
    const bin = atob(b64), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return { bytes: out, ext: /png/.test(head) ? 'png' : /webp/.test(head) ? 'webp' : /gif/.test(head) ? 'gif' : 'jpg' };
  };

  // Reads the zips makeZip writes (stored, no compression). Every file's checksum is verified.
  function readZip(buffer) {
    const view = new DataView(buffer), bytes = new Uint8Array(buffer), dec = new TextDecoder();
    let end = -1;
    for (let i = buffer.byteLength - 22; i >= 0 && i >= buffer.byteLength - 22 - 65535; i--) {
      if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
    }
    if (end < 0) throw new Error(NOT_A_BACKUP);
    const entries = new Map();
    let p = view.getUint32(end + 16, true);
    for (let n = view.getUint16(end + 10, true); n > 0; n--) {
      if (view.getUint32(p, true) !== 0x02014b50 || view.getUint16(p + 10, true) !== 0) throw new Error(NOT_A_BACKUP);
      const crc = view.getUint32(p + 16, true), size = view.getUint32(p + 24, true);
      const nameLength = view.getUint16(p + 28, true), extra = view.getUint16(p + 30, true), comment = view.getUint16(p + 32, true);
      const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLength));
      const local = view.getUint32(p + 42, true);
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = bytes.subarray(start, start + size);
      if (data.length !== size || crc32(data) !== crc) throw new Error(DAMAGED);
      entries.set(name, data);
      p += 46 + nameLength + extra + comment;
    }
    return entries;
  }

  const toDataUrl = (bytes, type) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read an image in this backup.'));
    reader.readAsDataURL(new Blob([bytes], { type }));
  });
  const typeOf = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

  async function create() {
    const data = S.load();
    const ids = await Images.keys();
    if (!ids) throw new Error('Images could not be read, so no backup was made.');
    const files = [], images = [];
    for (const id of ids) {
      const url = await Images.get(id);
      if (!url || !url.startsWith('data:')) throw new Error('An image could not be read, so no backup was made.');
      const { bytes, ext } = dataUrlBytes(url);
      const path = `images/${images.length + 1}.${ext}`;
      files.push({ name: path, bytes });
      images.push({ id, path, type: typeOf[ext] });
    }
    const { customBaseUrl, customModel, preferences } = window.LocusAI.load(); // never the keys
    const settings = { customBaseUrl, customModel, preferences };
    const manifest = { app: 'folio-backup', version: 1, createdAt: new Date().toISOString(), data, images, settings };
    files.unshift({ name: MANIFEST, bytes: new TextEncoder().encode(JSON.stringify(manifest)) });
    const day = window.LocusTheme.formatDate().replace(/[ ,]+/g, '-');
    S.saveFile(makeZip(files), `folio-backup-${day}.zip`);
    return { captures: data.captures.length, images: images.length };
  }

  // Checks the whole file without changing anything. Returns what restore() needs, plus counts to show.
  async function read(file) {
    let entries;
    try { entries = readZip(await file.arrayBuffer()); }
    catch (e) { throw new Error(e.message === DAMAGED ? DAMAGED : NOT_A_BACKUP); }
    let manifest;
    try { manifest = JSON.parse(new TextDecoder().decode(entries.get(MANIFEST))); }
    catch (e) { throw new Error(NOT_A_BACKUP); }
    const { app, version, data, images } = manifest;
    if (app !== 'folio-backup' || !Array.isArray(data?.captures) || !Array.isArray(data?.collections) || !Array.isArray(images)) throw new Error(NOT_A_BACKUP);
    if (version !== 1) throw new Error('This backup was made by a newer version of Folio.');
    if (images.some(x => !entries.has(x.path))) throw new Error(DAMAGED);
    return { manifest, entries, createdAt: manifest.createdAt, drawers: data.collections.length, captures: data.captures.length, images: images.length };
  }

  // Images first, then the data, and only then the old images go: if anything fails, what you had still works.
  async function restore({ manifest, entries }) {
    if (window.LocusImports.isBusy()) throw new Error('An import is still organizing. Pause it first.');
    for (const x of manifest.images) await Images.put(x.id, await toDataUrl(entries.get(x.path), x.type), true);
    S.save(manifest.data);
    if (manifest.settings) window.LocusAI.save({ ...window.LocusAI.load(), ...manifest.settings }); // keys already here stay
    const keep = new Set(manifest.images.map(x => x.id));
    for (const id of (await Images.keys()) || []) if (!keep.has(id)) await Images.remove(id);
  }

  return { create, read, restore };
})();
