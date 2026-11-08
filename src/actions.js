// Folio — what the app does to saved data, kept apart from the screens that trigger it.

window.LocusActions = (() => {
  const S = window.LocusStore, AI = window.LocusAI, Images = window.LocusImages, Theme = window.LocusTheme;

  // Older saved data has no colour per drawer: give each one its position in the palette, once.
  const withColor = (c, i) => (Number.isInteger(c.color) ? c : { ...c, color: i % Theme.PALETTE.length });
  const withTags = (c, captures) => (Array.isArray(c.tags) ? c : {
    ...c,
    tags: [...new Set(captures.filter(x => x.collection === c.id).flatMap(x => x.tags || []))],
  });

  // Runs once at launch. Returns { data, error }; a read failure leaves what is saved untouched.
  function loadInitial() {
    let initial;
    try { initial = S.refreshSamples(S.load()); }
    catch (e) {
      return { data: { collections: [], captures: [], queue: [], imports: { batches: [], tasks: [], decisions: [] } }, error: e.message };
    }
    const collections = initial.collections.map(withColor).map(c => withTags(c, initial.captures));
    const data = { ...initial, collections };
    try { S.save(data); return { data, error: null }; }
    catch (e) { return { data, error: e.message }; }
  }

  function updateCapture(updated) {
    S.update(d => {
      const previous = d.captures.find(c => c.id === updated.id);
      const moved = previous?.collection !== updated.collection;
      const source = d.collections.find(c => c.id === previous?.collection);
      const before = previous?.tags || [];
      const tags = updated.tags || [];
      const addedTags = tags.filter(t => moved || !before.includes(t));
      // a tag added by hand stays hand-added when its screenshot moves to another drawer
      const ownTags = tags.filter(t => !before.includes(t) || (moved && source?.userTags?.includes(t)));
      const captures = d.captures.map(c => (c.id === updated.id ? { ...updated, updatedAt: Date.now() } : c));
      const collections = d.collections.map(c => {
        const next = c.id === updated.collection ? AI.addDrawerTags(c, addedTags, ownTags) : c;
        return c.id === updated.collection || c.id === previous?.collection ? AI.dropUnusedOwnTags(next, captures) : next;
      });
      return { ...d, collections, captures };
    });
  }

  const imagesOf = cap => [...new Set([cap.imageId, ...(cap.imageIds || [])].filter(Boolean))];

  // drawerId: also remove that drawer, for "delete drawer and what is in it".
  function deleteCaptures(ids, drawerId = null) {
    const removed = S.load().captures.filter(c => ids.has(c.id));
    const tasks = new Set(removed.map(c => c.importTaskId).filter(Boolean));
    const affected = new Set(removed.map(c => c.collection));
    S.update(d => {
      const captures = d.captures.filter(c => !ids.has(c.id));
      const collections = (drawerId ? d.collections.filter(c => c.id !== drawerId) : d.collections)
        .map(c => (affected.has(c.id) ? AI.dropUnusedOwnTags(c, captures) : c));
      return { ...d, captures, collections, imports: {
        ...d.imports,
        tasks: d.imports.tasks.map(t => (tasks.has(t.id) ? { ...t, state: 'removed' } : t)),
        decisions: d.imports.decisions.filter(x => !ids.has(x.captureId)),
      } };
    });
    // Only release bytes after the metadata change has committed successfully.
    removed.forEach(cap => imagesOf(cap).forEach(id => Images.remove(id)));
  }

  // A capture typed on the Write page. If anything fails, images already stored are taken back out.
  async function saveNote({ title, text, collection, tags, images }) {
    const imageIds = [];
    const undoImages = () => Promise.all(imageIds.map(id => Images.remove(id)));
    try {
      for (const image of images || []) {
        imageIds.push(image.id);
        await Images.put(image.id, image.dataUrl, true);
      }
    } catch (e) {
      await undoImages();
      throw new Error('Images could not be saved. Please try again.');
    }
    const note = {
      id: `note_${Date.now().toString(36)}`, kind: 'note', collection,
      title: Theme.shortTitle(title || text.split('\n')[0]),
      text, summary: text, tags: tags || [], imageId: imageIds[0], imageIds, glyph: '✎', source: 'Note',
      date: Theme.formatDate(), addedAt: Date.now(),
    };
    try {
      S.update(d => ({
        ...d,
        collections: d.collections.map(c => (c.id === collection ? AI.addDrawerTags(c, tags || [], tags || []) : c)),
        captures: [note, ...d.captures],
      }));
    } catch (e) {
      await undoImages();
      throw e;
    }
  }

  // Screenshots waiting to be confirmed remember their drawer by name, so a rename has to reach them too.
  function renameDrawer(id, name) {
    S.update(d => {
      const oldName = d.collections.find(c => c.id === id)?.name;
      const renamed = item => (item.aiGuess === oldName ? { ...item, aiGuess: name } : item);
      return {
        ...d,
        collections: d.collections.map(c => (c.id === id ? { ...c, name } : c)),
        queue: d.queue.map(renamed),
        imports: {
          ...d.imports,
          batches: d.imports.batches.map(b => (b.targetId === id ? { ...b, targetName: name } : b)),
          decisions: d.imports.decisions.map(x => ({ ...x, item: renamed(x.item), collection: x.collection === oldName ? name : x.collection })),
        },
      };
    });
  }

  // Deleting a tag takes it off the drawer and off every screenshot in it, so it does not come back on the next edit.
  function removeDrawerTag(id, tag) {
    const without = list => (list || []).filter(t => t !== tag);
    S.update(d => ({
      ...d,
      collections: d.collections.map(c => (c.id === id ? { ...c, tags: without(c.tags), userTags: without(c.userTags) } : c)),
      captures: d.captures.map(c => (c.collection === id && (c.tags || []).includes(tag) ? { ...c, tags: without(c.tags), updatedAt: Date.now() } : c)),
    }));
  }

  return { loadInitial, updateCapture, deleteCaptures, saveNote, renameDrawer, removeDrawerTag };
})();
