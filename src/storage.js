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

  function makeCollection(name, existing) {
    const slug = name.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '') || 'drawer';
    let id = slug, n = 2;
    while (existing.some(c => c.id === id)) id = `${slug}-${n++}`;
    return { id, name, color: window.LocusTheme.nextColor(existing), glyph: '◌', vibe: '', tags: [] };
  }

  // Browsers that saved older samples get the new wording once. Only samples nobody has edited change, and a
  // sample keeps the drawer it was moved to and its note. Deleted samples stay deleted; the person's own captures are not touched.
  function refreshSamples(data) {
    const demo = window.LOCUS_DATA;
    if (data.sampleVersion === demo.sampleVersion) return data;
    const wording = ({ title, summary, text, tags, details, kind, glyph, source }) => ({ title, summary, text, tags, details, kind, glyph, source });
    const samples = new Map(demo.captures.map(c => [c.id, wording(c)]));
    const queued = new Map(demo.triageQueue.map(q => [q.id, wording(q)]));
    demo.triageQueue.forEach(q => samples.set(`cap_${q.id}`, wording({ ...q, summary: q.text })));
    const captures = data.captures.map(c => samples.has(c.id) && !c.updatedAt ? { ...c, ...samples.get(c.id) } : c);
    const queue = (data.queue || []).map(q => queued.has(q.id) && !q.updatedAt ? { ...q, ...queued.get(q.id) } : q);
    // Sample drawers rebuild their tag row, so the old sample tags do not linger.
    const sampleDrawers = new Set(demo.collections.map(c => c.id));
    const collections = data.collections.map(c => {
      if (!sampleDrawers.has(c.id)) return c;
      const used = captures.filter(x => x.collection === c.id).reverse().flatMap(x => x.tags || []);
      return window.LocusAI.addDrawerTags({ ...c, tags: [] }, [...used, ...(c.userTags || [])], c.userTags || []);
    });
    return { ...data, captures, queue, collections, sampleVersion: demo.sampleVersion };
  }

  // Order of a drawer's list. The choice is remembered on this device and also drives Previous / Next.
  const SORTS = [
    { id: 'newest', label: 'Newest' },
    { id: 'oldest', label: 'Oldest' },
    { id: 'edited', label: 'Edited' },
    { id: 'title', label: 'A–Z' },
  ];
  const SORT_KEY = 'locus.sort';
  function getSort() {
    try { const s = localStorage.getItem(SORT_KEY); return SORTS.some(x => x.id === s) ? s : 'newest'; }
    catch (e) { return 'newest'; }
  }
  function setSort(id) { try { localStorage.setItem(SORT_KEY, id); } catch (e) {} }
  const addedTime = c => c.addedAt || Date.parse(c.date) || 0;
  function sortCaptures(list, sort = getSort()) {
    const by = {
      newest: (a, b) => addedTime(b) - addedTime(a),
      oldest: (a, b) => addedTime(a) - addedTime(b),
      edited: (a, b) => (b.updatedAt || addedTime(b)) - (a.updatedAt || addedTime(a)),
      title: (a, b) => String(a.title).localeCompare(String(b.title), 'zh-Hans-CN', { numeric: true }),
    }[sort] || (() => 0);
    return [...list].sort(by);
  }

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
  function toMarkdown({ collections, captures }) {
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
        (c.details || []).forEach((d) => { const v = String(d.value).split('\n').filter(Boolean); lines.push(v.length > 1 ? `- **${d.label}:**\n${v.map((x) => `  - ${x}`).join('\n')}` : `- **${d.label}:** ${v[0] || ''}`); });
        if (c.details?.length) lines.push('');
        if (c.note) lines.push(`> **My note:** ${c.note.replace(/\n/g, '\n> ')}`, '');
        if (c.tags && c.tags.length) lines.push(c.tags.map(tag).join(' '), '');
      });
    });
    const orphans = captures.filter((c) => !collections.some((col) => col.id === c.collection));
    if (orphans.length) {
      lines.push('## Unsorted', '');
      orphans.forEach((c) => { lines.push(`### ${c.title}`, '', c.summary || '', ''); });
    }
    return lines.join('\n');
  }

  function saveFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Text only: for reading or moving into another notes app. Back up everything (backup.js) is what keeps the images.
  function exportMarkdown(data) {
    const n = new Date(), day = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    saveFile(new Blob([toMarkdown(data)], { type: 'text/markdown;charset=utf-8' }), `folio-${day}.md`);
    return { captures: data.captures.length };
  }

  // Ask the browser not to clear saved data by itself. It may say no, so a backup is still the real safety net.
  async function askToKeepData() {
    try { return !!(await navigator.storage?.persist?.()); } catch (e) { return false; }
  }
  async function isDataKept() {
    try { return !!(await navigator.storage?.persisted?.()); } catch (e) { return false; }
  }

  return { load, save, update, subscribe, clear, toMarkdown, exportMarkdown, saveFile, askToKeepData, isDataKept, refreshSamples, makeCollection, SORTS, getSort, setSort, sortCaptures };
})();
