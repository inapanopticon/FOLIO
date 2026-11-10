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

function ConfirmScreen({ queue, collections, onComplete, onBack, onToast, onDecision, onUndo, canUndo, onAddDrawer }) {
  // Screenshots no drawer fits come first. Sorted by the AI's original answer, so moving one to a drawer never jumps to another page.
  const current = [...queue].sort((a, b) => (b.aiIsNew ? 1 : 0) - (a.aiIsNew ? 1 : 0))[0];
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const total = useRef(queue.length); total.current = Math.max(total.current, queue.length);
  const actions = useRef([]); // keep or discard for each decision, so the last message can say what happened
  const typedNames = useRef({}); // AI suggestion -> the name the person typed instead when adding that drawer
  const P = window.LocusImports;
  if (!current) return null;

  const findDrawer = name => collections.find(c => c.name.toLowerCase() === String(name || '').toLowerCase());
  // Items from before this change kept their suggestion in aiGuess.
  const suggestion = String(current.aiSuggestion || (findDrawer(current.aiGuess) ? '' : current.aiGuess) || '');
  // Once the suggested drawer exists, every screenshot with the same suggestion goes straight into it.
  const existing = findDrawer(current.aiGuess) || findDrawer(typedNames.current[suggestion.toLowerCase()] || suggestion);
  const noDrawer = { id: 'no-drawer', name: 'No drawer', plain: true, tags: current.tags || [] };
  const proposed = existing || noDrawer;
  // A screenshot moved out of No drawer by hand can go back, to get the suggestion again.
  const movedByHand = current.aiIsNew && findDrawer(current.aiGuess);
  const available = !existing || movedByHand ? [...collections, noDrawer] : collections;
  const nameOf = id => available.find(c => c.id === id && !c.plain)?.name || '';
  const drawerPatch = id => ({ aiGuess: nameOf(id), aiSuggestion: suggestion });

  const cap = captureFromQueueItem(current, proposed.id);
  const act = fn => { try { fn(); setError(''); } catch (e) { setError(e.message); } };
  const decide = (action, before = () => {}, drawerName = existing?.name) => act(() => {
    before();
    onDecision({ item: current, action, collection: drawerName });
    actions.current.push(action);
    if (queue.length === 1) onComplete(actions.current.includes('keep'));
  });

  const addDrawer = saveNote => onAddDrawer(suggestion, name => {
    if (suggestion && name.toLowerCase() !== suggestion.toLowerCase()) typedNames.current[suggestion.toLowerCase()] = name;
    if (!findDrawer(name)) onToast(`Added ${name}`);
    decide('keep', saveNote, name);
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
      <button onClick={() => (existing ? decide('keep', saveNote) : addDrawer(saveNote))} style={{ ...cell, flex: 1 }}>{existing ? 'Save to drawer' : 'Add drawer'}<Arrow dir="right" style={{ marginLeft: 8 }}/></button>
    </div>
  );

  return (
    <DetailScreen
      key={current.id}
      steps={<>
        <ImportSteps step={4} line={hair} fill={color.fg} onFill={color.bg}/>
        {!existing && <div style={{ padding: '12px 18px', borderBottom: hair, fontSize: TY.label, lineHeight: 1.5 }}>
          <div>No drawer fits this one</div>
          <div style={{ opacity: 0.65, overflowWrap: 'anywhere' }}>{suggestion ? `AI suggests a new drawer: ${suggestion}` : 'Pick one above, or add a new drawer'}</div>
        </div>}
      </>}
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
