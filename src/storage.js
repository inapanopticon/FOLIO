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
  function toMarkdown({ collections, captures }) {
    const today = new Date().toISOString().slice(0, 10);
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
        if (c.note) lines.push(`> **My note:** ${c.note.replace(/\n/g, '\n> ')}`, '');
        if (c.tags && c.tags.length) lines.push(c.tags.map(tag).join(' '), '');
      });
    });
    const orphans = captures.filter((c) => !collections.some((col) => col.id === c.collection));
    if (orphans.length) {
      lines.push('## Unsorted', '');
      orphans.forEach((c) => lines.push(`### ${c.title}`, '', c.summary || '', ''));
    }
    return lines.join('\n');
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

  return { load, save, update, subscribe, clear, toMarkdown, downloadMarkdown };
})();
