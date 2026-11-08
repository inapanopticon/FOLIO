// Locus — saving to this browser + Markdown export

window.LocusStore = (() => {
  const KEY = 'locus.v1';

  // Read saved data; fall back to the demo data when nothing is saved yet.
  function load() {
    const demo = window.LOCUS_DATA;
    let raw;
    try { raw=localStorage.getItem(KEY); }
    catch(e) { throw new Error('This browser cannot access local storage. Your existing data has not been changed.'); }
    if(raw) {
      let saved;
      try {saved=JSON.parse(raw);}catch(e){throw new Error('Saved data could not be read. It has not been overwritten.');}
      if(!saved || !Array.isArray(saved.captures))throw new Error('Saved data is incomplete. It has not been overwritten.');
      return {...saved,imports:saved.imports || {batches:[],tasks:[],decisions:[]},collections:saved.collections || demo.collections,captures:saved.captures,queue:saved.queue || []};
    }
    return { collections: demo.collections, captures: demo.captures, queue: demo.triageQueue, imports: { batches: [], tasks: [], decisions: [] } };
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
    } catch(e) {
      window.dispatchEvent(new CustomEvent('locus:storage-error', {detail:'Could not save on this device. Free some space and try again.'}));
      throw new Error('Could not save on this device. Free some space and try again.');
    }
    window.dispatchEvent(new Event('locus:store'));
    return data;
  }
  function update(fn) { return save(fn(load())); }
  function subscribe(fn) {
    const storage = e => { if(e.key === KEY) fn(); };
    window.addEventListener('locus:store',fn);
    window.addEventListener('storage',storage);
    return ()=>{window.removeEventListener('locus:store',fn);window.removeEventListener('storage',storage);};
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  // One Markdown file: a heading per collection, a section per capture.
  // Tags become #tags so the file works well in Obsidian / Bear / Notion import.
  function toMarkdown({ collections, captures }, imagePaths = {}) {
    const n = new Date(), today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    const tag = (t) => '#' + String(t).trim().replace(/\s+/g, '-');
    const lines = [
      '---',
      'title: Folio export',
      `exported: ${today}`,
      `captures: ${captures.length}`,
      `collections: ${collections.length}`,
      '---',
      '',
      '# Folio',
      '',
    ];
    collections.forEach((col) => {
      const items = captures.filter((c) => c.collection === col.id);
      if (!items.length) return;
      lines.push(`## ${col.name}`, '');
      if (col.vibe) lines.push(`> ${col.vibe}`, '');
      items.forEach((c) => {
        lines.push(`### ${c.title}`, '');
        const meta = [c.date && `**Date:** ${c.date}`, c.source && `**Source:** ${c.source}`].filter(Boolean);
        if (meta.length) lines.push(meta.join(' · '), '');
        const body = c.kind === 'note' ? (c.text || c.summary) : c.summary;
        if (body) lines.push(body, '');
        (imagePaths[c.id] || []).forEach((src, i) => lines.push(`![${(c.title || 'Image').replace(/[\[\]]/g, '')}${i ? ' ' + (i + 1) : ''}](${src})`, ''));
        if (c.note) lines.push(`> **My note:** ${c.note.replace(/\n/g, '\n> ')}`, '');
        if (c.tags && c.tags.length) lines.push(c.tags.map(tag).join(' '), '');
      });
    });
    const orphans = captures.filter((c) => !collections.some((col) => col.id === c.collection));
    if (orphans.length) {
      lines.push('## Unsorted', '');
      orphans.forEach((c) => { lines.push(`### ${c.title}`, '', c.summary || '', ''); (imagePaths[c.id] || []).forEach((src) => lines.push(`![](${src})`, '')); });
    }
    return lines.join('\n');
  }

  // ---- export with images: a .zip holding folio.md plus an images/ folder the file links to ----
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
  function saveFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Exports everything. With images: folio-DATE.zip (folio.md + images/). With none: folio-DATE.md.
  async function exportAll(data) {
    const n = new Date(), day = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    const files = [], imagePaths = {};
    for (const c of data.captures) {
      const ids = [...new Set([c.imageId, ...(c.imageIds || [])].filter(Boolean))];
      for (const id of ids) {
        const url = await window.LocusImages.get(id);
        if (!url || !url.startsWith('data:')) continue;
        const { bytes, ext } = dataUrlBytes(url);
        const path = `images/${String(c.id).replace(/[^a-zA-Z0-9_-]/g, '_')}-${(imagePaths[c.id] || []).length + 1}.${ext}`;
        files.push({ name: path, bytes });
        (imagePaths[c.id] = imagePaths[c.id] || []).push(path);
      }
    }
    const md = toMarkdown(data, imagePaths);
    if (!files.length) { saveFile(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `folio-${day}.md`); return { captures: data.captures.length, images: 0 }; }
    files.unshift({ name: 'folio.md', bytes: new TextEncoder().encode(md) });
    saveFile(makeZip(files), `folio-${day}.zip`);
    return { captures: data.captures.length, images: files.length - 1 };
  }

  function downloadMarkdown(data) {
    const md = toMarkdown(data);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `folio-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return data.captures.length;
  }

  return { load, save, update, subscribe, clear, toMarkdown, downloadMarkdown, exportAll };
})();
