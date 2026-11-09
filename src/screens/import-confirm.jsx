// Folio — step 4 of an import: reuse the normal detail and edit screens; save only on confirmation.

// What the detail screen needs to show one item still waiting in the queue.
function captureFromQueueItem(item, drawerId) {
  return {
    id: `review_${item.id}`,
    title: item.title || [item.source, item.user].filter(Boolean).join(' · ') || 'Untitled',
    summary: item.summary ?? item.text ?? '',
    details: item.details || [],
    tags: item.tags || [],
    note: item.note || '',
    imageId: item.imageId,
    imageIds: item.imageIds,
    glyph: item.glyph,
    collection: drawerId,
    source: item.source,
    date: THEME.formatDate(item.addedAt || Date.now()),
  };
}

function ConfirmScreen({ queue, collections, onComplete, onBack, onToast, onDecision, onUndo, canUndo }) {
  const current = queue[0];
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const total = useRef(queue.length); total.current = Math.max(total.current, queue.length);
  const actions = useRef([]); // keep or discard for each decision, so the last message can say what happened
  const P = window.LocusImports;
  if (!current) return null;

  const suggestedDrawer = name => ({ id: `suggested:${name}`, name, color: THEME.nextColor(collections) });
  const existing = collections.find(c => c.name.toLowerCase() === String(current.aiGuess || '').toLowerCase());
  const proposed = existing || { ...suggestedDrawer(current.aiGuess), name: current.aiGuess || 'Unsorted', tags: current.tags || [] };
  // A new drawer the AI suggested stays in the list after switching away, so it can be picked again.
  const keepSuggested = current.suggestedDrawer && !collections.some(c => c.name === current.suggestedDrawer);
  const available = existing
    ? (keepSuggested ? [...collections, { ...suggestedDrawer(current.suggestedDrawer), tags: [] }] : collections)
    : [...collections, proposed];
  const nameOf = id => available.find(c => c.id === id)?.name || current.aiGuess;
  // Remembers the drawer the AI suggested, so it stays on the list after switching away.
  const drawerPatch = id => ({ aiGuess: nameOf(id), suggestedDrawer: current.suggestedDrawer || (existing ? undefined : current.aiGuess) });

  const cap = captureFromQueueItem(current, proposed.id);
  const act = fn => { try { fn(); setError(''); } catch (e) { setError(e.message); } };
  const decide = (action, before = () => {}) => act(() => {
    before();
    onDecision({ item: current, action, collection: current.aiGuess });
    actions.current.push(action);
    if (queue.length === 1) onComplete(actions.current.includes('keep'));
  });

  if (editing) {
    return <EditScreen key={current.id} capture={cap} collection={proposed} collections={available}
      onCancel={() => setEditing(false)}
      onSave={updated => {
        P.updateItem(current.id, { title: updated.title, summary: updated.summary, details: updated.details, tags: updated.tags, ...drawerPatch(updated.collection) });
        setEditing(false);
      }}/>;
  }

  const color = THEME.colorOf(proposed, available);
  const hair = THEME.hairline(color.fg);
  const cell = { border: 'none', background: 'transparent', color: 'inherit', fontSize: TY.caption, cursor: 'pointer' };
  const footer = ({ saveNote }) => (
    <div style={{ display: 'flex', width: '100%', minHeight: 56 }}>
      <button onClick={() => decide('discard', saveNote)} style={{ ...cell, flex: 1, borderRight: hair }}>Skip</button>
      <button disabled={!canUndo} onClick={() => act(() => { onUndo(); actions.current.pop(); })} style={{ ...cell, flex: 1, borderRight: hair, opacity: canUndo ? 1 : 0.35 }}>Undo</button>
      <button onClick={() => decide('keep', saveNote)} style={{ ...cell, flex: 1 }}>Save to drawer<Arrow dir="right" style={{ marginLeft: 8 }}/></button>
    </div>
  );

  return (
    <DetailScreen
      key={current.id}
      steps={<ImportSteps step={4} line={hair} fill={color.fg} onFill={color.bg}/>}
      capture={cap} collection={proposed} collections={available} captures={[cap]}
      onBack={onBack}
      onEdit={() => setEditing(true)}
      onOpenTag={() => setEditing(true)}
      onMove={(id, note) => P.updateItem(current.id, { note, ...drawerPatch(id) })}
      onUpdate={updated => P.updateItem(current.id, { note: updated.note })}
      onToast={onToast}
      reviewInfo={{ index: total.current - queue.length + 1, total: total.current }}
      footer={footer}
      error={error}
    />
  );
}
