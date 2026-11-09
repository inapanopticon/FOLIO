// Folio — main app: which screen shows when, and what each screen's buttons do

function StorageErrorBar({ message, onRetry }) {
  return (
    <div role="alert" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 700, padding: 18, background: 'var(--cream)', borderTop: HAIR, fontSize: TY.caption, lineHeight: 1.5 }}>
      {message}
      <button onClick={onRetry} style={{ display: 'block', marginTop: 8, border: 'none', background: 'transparent', fontSize: TY.caption, textDecoration: 'underline', cursor: 'pointer' }}>Try again</button>
    </div>
  );
}

// If a page fails to draw, say so and offer a way out instead of leaving a blank screen.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="app" role="alert" style={{ padding: '64px 18px', fontSize: TY.body, lineHeight: 1.6 }}>
        Something went wrong on this page. Your saved data has not been changed.
        <button onClick={() => window.location.reload()} style={{ display: 'block', marginTop: 12, padding: 0, border: 'none', background: 'transparent', fontSize: TY.body, textDecoration: 'underline', textUnderlineOffset: 4, cursor: 'pointer' }}>Reload</button>
      </div>
    );
  }
}

function App() {
  const STORE = window.LocusStore, ACT = window.LocusActions, IMP = window.LocusImports;
  const [boot] = useState(ACT.loadInitial);
  const [data, setData] = useState(boot.data);
  const [storageError, setStorageError] = useState(boot.error);
  const { collections, captures, queue } = data;
  useEffect(() => {
    const refresh = () => { try { setData(STORE.load()); setStorageError(null); } catch (e) { setStorageError(e.message); } };
    const unsubscribe = STORE.subscribe(refresh);
    const failed = e => setStorageError(e.detail || 'Could not save on this device.');
    window.addEventListener('locus:storage-error', failed);
    return () => { unsubscribe(); window.removeEventListener('locus:storage-error', failed); };
  }, []);
  useEffect(() => { STORE.askToKeepData(); }, []);
  // once per launch, a moment after opening: clear old skipped photos and leftover images
  useEffect(() => {
    if (boot.error) return;
    const t = setTimeout(() => IMP.cleanup().catch(() => {}), 2000);
    return () => clearTimeout(t);
  }, []);
  const setCollections = value => STORE.update(d => ({ ...d, collections: typeof value === 'function' ? value(d.collections) : value }));

  // real counts from the captures that actually exist
  const collectionsView = collections.map(c => ({ ...c, count: captures.filter(x => x.collection === c.id).length }));
  const findCapture = id => captures.find(c => c.id === id);
  const findCollection = id => collectionsView.find(c => c.id === id);
  const colorOfDrawer = id => { const c = findCollection(id); return c ? THEME.colorOf(c, collectionsView) : null; };

  const router = useRouter(colorOfDrawer);
  const { stack, cur, animKey, transitioning, expand, appRef, push, pop, popTo, replace, reset, updateTop, openDrawer, closeDrawer } = router;

  const [menuFor, setMenuFor] = useState(null);
  const [toast, setToast] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [launching, setLaunching] = useState(true); // the typed-wordmark intro, once per app start
  // The welcome pages: only for someone new, so anyone already using Folio is not interrupted.
  const [intro, setIntro] = useState(() => (!boot.error && !firstTime.seen('intro') && !window.LocusAI.isReady() && !boot.data.imports.batches.length ? { afterLaunch: true } : null));
  const finishIntro = connect => {
    firstTime.mark('intro');
    setIntro(null);
    if (connect && cur.name !== 'settings') push({ name: 'settings' }, 'up');
  };

  const showToast = (message, action, onAction) => setToast({ message, action, onAction, id: Date.now() });

  const openSort = () => {
    if (queue.length) push({ name: 'triage' }, 'up');
    else showToast('Nothing to sort — import some screenshots');
  };
  const newDrawer = () => setDialog({
    title: 'New drawer', input: '', placeholder: 'Travel, recipes, ideas…', okLabel: 'Add',
    color: THEME.nextColor(collections),
    onOk: (name, color) => {
      if (collections.some(c => c.name.toLowerCase() === name.toLowerCase())) { showToast('That drawer already exists'); return; }
      setCollections(cs => [...cs, { ...STORE.makeCollection(name, cs), color }]);
      showToast(`Added ${name}`);
    },
  });
  // asks first; deleting a drawer also deletes what is in it
  const deleteDrawer = coll => {
    const inside = captures.filter(c => c.collection === coll.id);
    setDialog({
      message: inside.length ? `${coll.name} and the ${plural(inside.length, 'capture')} in it will be permanently deleted.` : `${coll.name} is empty and will be deleted.`,
      okLabel: 'Delete drawer', danger: true,
      onOk: () => { ACT.deleteCaptures(new Set(inside.map(c => c.id)), coll.id); showToast('Drawer deleted'); },
    });
  };
  const askDeleteTag = (coll, tag) => {
    const n = captures.filter(c => c.collection === coll.id && (c.tags || []).includes(tag)).length;
    setDialog({
      message: n ? `${tag} will be removed from ${plural(n, 'capture')} in this drawer. The captures stay.` : `${tag} isn't used by any capture.`,
      okLabel: 'Delete tag', danger: true,
      onOk: () => { ACT.removeDrawerTag(coll.id, tag); showToast('Tag deleted'); },
    });
  };
  const askDeleteCapture = (cap, afterDelete) => setDialog({
    message: 'This capture will be permanently deleted.', okLabel: 'Delete capture', danger: true,
    onOk: () => { ACT.deleteCaptures(new Set([cap.id])); showToast('Deleted'); afterDelete?.(); },
  });
  const renameDrawer = coll => setDialog({
    title: 'Rename drawer', input: coll.name, okLabel: 'Save',
    onOk: name => {
      if (name === coll.name) return;
      if (collections.some(c => c.id !== coll.id && c.name.toLowerCase() === name.toLowerCase())) { showToast('That drawer already exists'); return; }
      ACT.renameDrawer(coll.id, name);
      showToast('Renamed');
    },
  });
  const exportData = () => {
    try { showToast(`Exported ${plural(STORE.exportMarkdown({ collections, captures }).captures, 'capture')}`); }
    catch (e) { showToast('Export failed. Please try again.'); }
  };

  const screenFor = (page, isOutgoing) => {
    switch (page.name) {
      case 'home': return (
        <HomeScreen
          collections={collectionsView}
          captures={captures}
          queueCount={queue.length}
          importCount={(data.imports?.tasks || []).filter(t => IMP.OPEN_STATES.includes(t.state)).length}
          needsAI={!window.LocusAI.isReady()}
          showSampleNote={!data.imports?.batches?.length && collections.some(c => window.LOCUS_DATA.collections.some(s => s.id === c.id))}
          onOpenCollection={openDrawer}
          onImport={() => push({ name: 'import' }, 'up')}
          onImportFiles={files => push({ name: 'import', files }, 'up')}
          onResumeImport={() => push({ name: 'import', resume: true }, 'up')}
          onWrite={() => push({ name: 'write' }, 'up')}
          onSort={openSort}
          onSearch={() => push({ name: 'search' }, 'up')}
          onSettings={() => push({ name: 'settings' }, 'up')}
          onNewDrawer={newDrawer}
          onDrawerMenu={c => setMenuFor(c.id)}
          onDrawerDelete={deleteDrawer}
        />
      );
      case 'drawer': {
        const coll = findCollection(page.collId);
        if (!coll) return null;
        return (
          <DrawerScreen
            collection={coll} collections={collectionsView} captures={captures}
            onBack={closeDrawer}
            onOpen={id => push({ name: 'detail', captureId: id }, 'swap')}
            animateIn={!isOutgoing && page.anim === 'none'}
            onSearch={() => push({ name: 'search', scopeId: coll.id, tag: page.tag || null }, 'swap')}
            initialTag={page.tag || null}
            onTagChange={tag => updateTop({ tag })}
            onDeleteTag={tag => askDeleteTag(coll, tag)}
            onDeleteCapture={cap => askDeleteCapture(cap)}
            softEnter={page.anim === 'swap'}
            onImport={(id, files) => push({ name: 'import', target: id, files }, 'up')}
          />
        );
      }
      case 'detail': {
        const cap = findCapture(page.captureId);
        if (!cap) return null;
        return (
          <DetailScreen
            key={cap.id}
            softEnter={page.anim === 'swap'}
            capture={cap}
            collection={findCollection(cap.collection) || { name: 'Unsorted' }}
            collections={collectionsView}
            captures={captures}
            listTag={stack[stack.length - 2]?.name === 'drawer' ? stack[stack.length - 2].tag : null}
            onBack={() => pop(stack[stack.length - 2]?.name === 'drawer' ? 'swap' : 'back')}
            onEdit={() => push({ name: 'edit', captureId: cap.id })}
            onOpenTag={tag => push({ name: 'drawer', collId: cap.collection, tag }, 'swap')}
            onOpenRelated={(id, dir) => replace({ name: 'detail', captureId: id }, dir === 'back' ? 'back' : 'fwd')}
            onUpdate={ACT.updateCapture}
            onMove={(id, note) => { ACT.updateCapture({ ...cap, collection: id, note }); showToast(`Moved to ${findCollection(id)?.name}`); }}
            onToast={showToast}
          />
        );
      }
      case 'edit': {
        const cap = findCapture(page.captureId);
        if (!cap) return null;
        return (
          <EditScreen
            capture={cap}
            collection={findCollection(cap.collection)}
            collections={collectionsView}
            onCancel={() => pop()}
            onSave={updated => { ACT.updateCapture(updated); showToast('Saved'); pop(); }}
            onDelete={() => askDeleteCapture(cap, () => popTo(-2))}
          />
        );
      }
      case 'search': return (
        <SearchScreen
          collections={collectionsView}
          captures={captures}
          onCancel={() => pop(page.scopeId ? 'swap' : 'back')}
          onOpenCapture={id => push({ name: 'detail', captureId: id })}
          initialQuery={page.query || ''} initialTag={page.tag || null} scopeId={page.scopeId || null}
          onSearchChange={updateTop}
        />
      );
      case 'write': return (
        <WriteScreen
          collections={collectionsView}
          onCancel={() => pop()}
          onSave={async note => {
            await ACT.saveNote(note);
            showToast(`Saved to ${collections.find(c => c.id === note.collection)?.name}`);
            pop();
          }}
        />
      );
      case 'import': return (
        <ImportScreen
          collections={collections}
          target={page.target ? collections.find(c => c.id === page.target) : null}
          resume={!!page.resume}
          initialFiles={isOutgoing ? null : page.files}
          onClose={() => pop()}
          onOpenSettings={() => push({ name: 'settings' }, 'up')}
          onDone={batchId => push({ name: 'triage', batchId }, 'fwd')}
        />
      );
      case 'settings': return <SettingsScreen onClose={() => pop()} onToast={showToast} onExport={exportData} onShowIntro={() => setIntro({ afterLaunch: false })}/>;
      case 'triage': return queue.length === 0 ? null : (
        <ConfirmScreen
          queue={page.batchId ? queue.filter(item => item.batchId === page.batchId) : queue}
          collections={collectionsView}
          onDecision={decision => IMP.decide([decision])}
          onUndo={() => IMP.undo(page.batchId)}
          canUndo={(data.imports?.decisions || []).some(d => !page.batchId || d.item.batchId === page.batchId)}
          onBack={() => pop()}
          onComplete={kept => { showToast(kept ? 'Saved' : 'All skipped'); reset({ name: 'home' }); }}
          onToast={showToast}
        />
      );
      default: return null;
    }
  };

  const renderScreen = (page, isOutgoing = false) => {
    const animClass = isOutgoing
      ? ({ fwd: 'pg-fwd-out', back: 'pg-back-out', up: 'pg-up-out' }[page._out] ?? 'pg-fwd-out')
      : ({ fwd: 'pg-fwd-in', back: 'pg-back-in', up: 'pg-up-in', swap: '', none: '' }[page.anim] ?? 'pg-fwd-in');
    return (
      <div className={`page-host ${animClass}`} key={page._out ? `out-${animKey}` : `in-${animKey}-${page.name}`}>
        {screenFor(page, isOutgoing)}
      </div>
    );
  };

  const menuColl = menuFor && findCollection(menuFor);
  const retrySave = () => { try { STORE.save(STORE.load()); } catch (e) { setStorageError(e.message); } };

  return (
    <div className="app" ref={appRef}>
      {transitioning && renderScreen(transitioning, true)}
      {renderScreen(cur, false)}
      {intro && <IntroScreen afterLaunch={intro.afterLaunch} onDone={finishIntro}/>}
      {storageError && <StorageErrorBar message={storageError} onRetry={retrySave}/>}
      {launching && <LaunchWordmark onDone={() => setLaunching(false)}/>}
      {expand && (
        <div className="card-expand" style={{
          background: expand.color.bg,
          ...(expand.full
            ? { top: 0, left: 0, width: '100%', height: '100%', borderRadius: 0 }
            : { top: expand.from.top, left: expand.from.left, width: expand.from.width, height: expand.from.height, borderRadius: 0 }),
        }}/>
      )}
      {toast && <Toast key={toast.id} message={toast.message} action={toast.action} onAction={toast.onAction} onDone={() => setToast(null)}/>}
      {dialog && <Dialog key={dialog.title} dialog={dialog} onClose={() => setDialog(null)}/>}
      {menuColl && (
        <DrawerMenu
          collection={menuColl}
          collections={collectionsView}
          onClose={() => setMenuFor(null)}
          onRecolor={i => setCollections(cs => cs.map(c => (c.id === menuColl.id ? { ...c, color: i } : c)))}
          onRename={() => { setMenuFor(null); renameDrawer(menuColl); }}
          onDelete={() => { setMenuFor(null); deleteDrawer(menuColl); }}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
