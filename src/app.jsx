// Locus — main app: data, routing, and which screen shows when

const { useState: useAState, useEffect: useAEffect, useRef: useARef } = React;
const EXPAND_MS = 420;

const { Toast } = window.LocusScreens;
const { DetailScreen, EditScreen, SearchScreen } = window.LocusScreens2;
const { TriageScreen } = window.LocusTriage;
const { SettingsScreen, LiveImportScreen } = window.LocusLive;
const { LaunchWordmark, HomeScreen, DrawerMenu, DrawerScreen, WriteScreen, Dialog } = window.LocusV2;

const today = () => new Date().toLocaleDateString('en-US', { month:'short', day:'2-digit', year:'numeric' });

function makeCollection(name, existing) {
  const slug = name.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '') || 'drawer';
  let id = slug, n = 2;
  while (existing.some(c => c.id === id)) id = `${slug}-${n++}`;
  return { id, name, color: window.LocusTheme.nextColor(existing), glyph: '◌', vibe: '', tags: [] };
}

// Older saved data has no colour per drawer: give each one its position in the palette, once.
function withColors(cols) {
  return cols.map((c, i) => Number.isInteger(c.color) ? c : { ...c, color: i % window.LocusTheme.PALETTE.length });
}

function App() {
  const STORE = window.LocusStore;
  const [boot] = useAState(()=>{
    let initial;
    try {initial=STORE.load();}
    catch(e){return {data:{collections:[],captures:[],queue:[],imports:{batches:[],tasks:[],decisions:[]}},error:e.message};}
    const data = { ...initial, collections: withColors(initial.collections).map(c=>({ ...c, tags: Array.isArray(c.tags) ? c.tags : (c.id==='shopping' ? ['skincare','overnight','mask','hydration','sunscreen','mineral'] : [...new Set(initial.captures.filter(x=>x.collection===c.id).flatMap(x=>x.tags || []))]) })) };
    try { STORE.save(data);return {data,error:null}; }
    catch(e) { return {data,error:e.message}; }
  });
  const [data,setData] = useAState(boot.data);
  const [storageError,setStorageError] = useAState(boot.error);
  const { collections, captures, queue } = data;
  useAEffect(()=>{
    const refresh=()=>{try{setData(STORE.load());setStorageError(null);}catch(e){setStorageError(e.message);}};
    const unsubscribe=STORE.subscribe(refresh);
    const failed=e=>setStorageError(e.detail || 'Could not save on this device.');
    window.addEventListener('locus:storage-error',failed);
    return ()=>{unsubscribe();window.removeEventListener('locus:storage-error',failed);};
  },[]);
  const setCollections = value => STORE.update(d=>({...d,collections:typeof value==='function' ? value(d.collections) : value}));

  // real counts from the captures that actually exist
  const collectionsView = collections.map(c => {
    const mine = captures.filter(x => x.collection === c.id);
    return { ...c, count: mine.length, newCount: mine.filter(x => x.addedAt && Date.now() - x.addedAt < 3*86400e3).length };
  });

  // Apply swipe decisions: kept cards become captures (creating drawers as needed),
  // Decisions and undo history are committed with captures and queue in one write.
  const applyDecisions = decisions => window.LocusImports.decide(decisions);

  // stack-based router
  // no separate splash: the app opens straight onto home, which unfolds itself
  const [stack, setStack] = useAState([{ name:'home', anim:'none' }]);
  const [animKey, setAnimKey] = useAState(0);
  const [transitioning, setTransitioning] = useAState(null); // outgoing page, for its exit animation
  const [menuFor, setMenuFor] = useAState(null);
  const [toast, setToast] = useAState(null);
  const [dialog, setDialog] = useAState(null);
  const [launching, setLaunching] = useAState(true); // the typed-wordmark intro, once per app start
  const [expand, setExpand] = useAState(null); // { color, from, full } — the card growing to full screen
  const appRef = useARef();
  const cur = stack[stack.length-1];

  const go = (nextStack, out) => {
    // 'swap' = same frame on both pages: show the new page at once, no old copy underneath
    setTransitioning(out === 'swap' ? null : { ...cur, _out: out });
    setStack(nextStack);
    setAnimKey(k=>k+1);
    setTimeout(()=>setTransitioning(null), 320);
  };
  const push = (page, anim='fwd') => go([...stack, { ...page, anim }], anim);
  const pop = (anim = 'back') => { if (stack.length > 1) go(stack.slice(0,-1).map((p,i,a)=> i===a.length-1 ? { ...p, anim } : p), anim); };
  const replace = (page, anim='fwd') => go([...stack.slice(0,-1), { ...page, anim }], anim);
  const reset = (page, anim='back') => go([{ ...page, anim }], anim);

  // Card → full screen: a block in the drawer's colour grows from the card's spot, then the drawer page takes over.
  const toAppRect = (r) => {
    const a = appRef.current.getBoundingClientRect();
    return { top: r.top - a.top, left: r.left - a.left, width: r.width, height: r.height };
  };
  const nextFrame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
  const openDrawer = (id, rect) => {
    if (!rect || !appRef.current) return push({ name:'drawer', collId:id });
    const coll = collectionsView.find(c => c.id === id);
    const color = window.LocusTheme.colorOf(coll, collectionsView);
    const from = toAppRect(rect);
    setExpand({ color, from, full: false });
    nextFrame(() => setExpand(e => e && { ...e, full: true }));
    setTimeout(() => {
      setTransitioning(null);
      setStack(s => [...s, { name:'drawer', collId:id, anim:'none', from }]);
      setAnimKey(k => k+1);
      setExpand(null);
    }, EXPAND_MS);
  };
  const closeDrawer = () => {
    const page = cur;
    const coll = collectionsView.find(c => c.id === page.collId);
    if (!page.from || !coll) return pop();
    const color = window.LocusTheme.colorOf(coll, collectionsView);
    setExpand({ color, from: page.from, full: true });
    setTransitioning(null);
    setStack(s => s.slice(0, -1).map((p, i, a) => i === a.length - 1 ? { ...p, anim:'none' } : p));
    setAnimKey(k => k+1);
    nextFrame(() => setExpand(e => e && { ...e, full: false }));
    setTimeout(() => setExpand(null), EXPAND_MS);
  };

  const showToast = (message, action, onAction) => setToast({ message, action, onAction, id: Date.now() });
  const findCapture = (id) => captures.find(c=>c.id===id);
  const findCollection = (id) => collectionsView.find(c=>c.id===id);
  const updateCapture = updated => STORE.update(d=>{
    const previous=d.captures.find(c=>c.id===updated.id);
    const addedTags=(updated.tags || []).filter(t=>previous?.collection!==updated.collection || !(previous?.tags || []).includes(t));
    return {...d,collections:d.collections.map(c=>c.id===updated.collection ? {...c,tags:[...new Set([...(c.tags || []),...addedTags])]} : c),captures:d.captures.map(c=>c.id===updated.id ? updated : c)};
  });
  const removeCaptureImages = cap => [...new Set([cap.imageId,...(cap.imageIds || [])].filter(Boolean))].forEach(id=>window.LocusImages.remove(id));
  const deleteCaptures = (ids,drawerId=null) => {
    const removed=STORE.load().captures.filter(c=>ids.has(c.id));
    const tasks=new Set(removed.map(c=>c.importTaskId).filter(Boolean));
    STORE.update(d=>({...d,captures:d.captures.filter(c=>!ids.has(c.id)),collections:drawerId ? d.collections.filter(c=>c.id!==drawerId) : d.collections,imports:{...d.imports,tasks:d.imports.tasks.map(t=>tasks.has(t.id) ? {...t,state:'removed'} : t),decisions:d.imports.decisions.filter(x=>!ids.has(x.captureId))}}));
    // Only release bytes after the metadata change has committed successfully.
    removed.forEach(removeCaptureImages);
  };

  const openSort = () => {
    if (queue.length) push({ name:'triage' }, 'up');
    else showToast('Nothing to sort — import some screenshots');
  };
  const newDrawer = () => setDialog({
    title: 'New drawer', input: '', placeholder: 'Travel, recipes, ideas…', okLabel: 'Add',
    color: window.LocusTheme.nextColor(collections),
    onOk: (name, color) => {
      if (collections.some(c => c.name.toLowerCase() === name.toLowerCase())) { showToast('That drawer already exists'); return; }
      setCollections(cs => [...cs, { ...makeCollection(name, cs), color }]);
      showToast(`Added ${name}`);
    },
  });

  // asks first; deleting a drawer also deletes what is in it
  const deleteDrawer = (coll) => {
    const n = captures.filter(c => c.collection === coll.id).length;
    setDialog({
      title: `Delete ${coll.name}?`,
      message: n ? `The ${n} captures in it will be deleted too. This can't be undone.` : "It's empty, so nothing else is lost.",
      okLabel: 'Delete', danger: true,
      onOk: () => {
        deleteCaptures(new Set(captures.filter(c=>c.collection===coll.id).map(c=>c.id)),coll.id);
        showToast('Drawer deleted');
      },
    });
  };

  const renderScreen = (page, isOutgoing=false) => {
    const animClass = isOutgoing
      ? ({ fwd:'pg-fwd-out', back:'pg-back-out', up:'pg-up-out' }[page._out] ?? 'pg-fwd-out')
      : ({ fwd:'pg-fwd-in', back:'pg-back-in', up:'pg-up-in', swap:'', none:'' }[page.anim] ?? 'pg-fwd-in');

    let inner = null;
    switch (page.name) {
      case 'home': inner = (
        <HomeScreen
          collections={collectionsView}
          captures={captures}
          queueCount={queue.length}
          importCount={(data.imports?.tasks || []).filter(t=>['saving','screen','ready','working','done','error','save-error'].includes(t.state)).length}
          onOpenCollection={openDrawer}
          onImport={()=>push({ name:'import' }, 'up')}
          onImportFiles={(files)=>push({ name:'import', files }, 'up')}
          onResumeImport={()=>push({ name:'import', resume:true }, 'up')}
          onWrite={()=>push({ name:'write' }, 'up')}
          onSort={openSort}
          onSearch={()=>push({ name:'search' }, 'up')}
          onSettings={()=>push({ name:'settings' }, 'up')}
          onNewDrawer={newDrawer}
          onDrawerMenu={(c)=>setMenuFor(c.id)}
          onDrawerDelete={deleteDrawer}
        />); break;
      case 'drawer': {
        const coll = findCollection(page.collId);
        if (!coll) break;
        inner = (
          <DrawerScreen collection={coll} collections={collectionsView} captures={captures}
            onBack={closeDrawer} onOpen={(id)=>push({ name:'detail', captureId:id }, 'swap')}
            animateIn={!isOutgoing && page.anim === 'none'}
            onSearch={()=>push({ name:'search', scopeId:coll.id, tag:page.tag || null }, 'swap')}
            initialTag={page.tag || null}
            onTagChange={(tag)=>setStack(s=>s.map((p,i)=>i===s.length-1 ? { ...p, tag } : p))}
            softEnter={page.anim === 'swap'} onImport={(id, files)=>push({ name:'import', target:id, files }, 'up')}/>
        ); break;
      }
      case 'detail': {
        const cap = findCapture(page.captureId);
        if (!cap) break;
        inner = (
          <DetailScreen
            key={cap.id}
            softEnter={page.anim === 'swap'}
            capture={cap}
            collection={findCollection(cap.collection) || { name:'Unsorted' }}
            collections={collectionsView}
            captures={captures}
            onBack={() => pop(stack[stack.length-2]?.name === 'drawer' ? 'swap' : 'back')}
            onEdit={()=>push({ name:'edit', captureId:cap.id })}
            onOpenTag={(tag)=>push({ name:'drawer', collId:cap.collection, tag }, 'swap')}
            onOpenRelated={(id, dir)=>replace({ name:'detail', captureId:id }, dir === 'back' ? 'back' : 'fwd')}
            onUpdate={updateCapture}
            onToast={showToast}
          />); break;
      }
      case 'edit': {
        const cap = findCapture(page.captureId);
        if (!cap) break;
        inner = (
          <EditScreen
            capture={cap}
            collection={findCollection(cap.collection)}
            collections={collectionsView}
            onCancel={() => pop()}
            onSave={(updated)=>{ updateCapture(updated); showToast('Saved'); pop(); }}
            onDelete={()=>setDialog({
              title: 'Delete this capture?', message: "This can't be undone.", okLabel: 'Delete', danger: true,
              onOk: () => {
                deleteCaptures(new Set([cap.id]));
                showToast('Deleted');
                go(stack.slice(0,-2).map((p,i,a)=> i===a.length-1 ? { ...p, anim:'back' } : p), 'back');
              },
            })}
          />); break;
      }
      case 'search': inner = (
        <SearchScreen
          collections={collectionsView}
          captures={captures}
          onCancel={() => pop(page.scopeId ? 'swap' : 'back')}
          onOpenCapture={(id)=>push({ name:'detail', captureId:id })}
          initialQuery={page.query || ''} initialTag={page.tag || null} scopeId={page.scopeId || null}
          onSearchChange={(filters)=>setStack(s=>s.map((p,i)=>i===s.length-1 ? { ...p, ...filters } : p))}
        />); break;
      case 'write': inner = (
        <WriteScreen
          collections={collectionsView}
          captures={captures}
          onCancel={() => pop()}
          onSave={async ({ title, text, collection, tags, images })=>{
            const imageIds = [];
            try {
              for (const image of images || []) {
                imageIds.push(image.id);
                await window.LocusImages.put(image.id,image.dataUrl,true);
              }
            } catch(e) {
              await Promise.all(imageIds.map(id=>window.LocusImages.remove(id)));
              throw new Error('Images could not be saved. Please try again.');
            }
            const firstLine = text.split('\n')[0];
            try { STORE.update(d=>({...d,collections:d.collections.map(c=>c.id===collection ? {...c,tags:[...new Set([...(c.tags || []),...(tags || [])])]} : c),captures:[{
              id: `note_${Date.now().toString(36)}`, kind:'note', collection,
              title: window.LocusTheme.shortTitle(title || firstLine),
              text, summary: text, tags: tags || [], imageId: imageIds[0], imageIds, glyph: '✎', source: 'Note',
              date: today(), addedAt: Date.now(),
            }, ...d.captures]})); }
            catch(e){await Promise.all(imageIds.map(id=>window.LocusImages.remove(id)));throw e;}
            const name = collections.find(c => c.id === collection)?.name;
            showToast(`Saved to ${name}`);
            pop();
          }}
        />); break;
      case 'import': inner = (
        <LiveImportScreen
          collections={collections}
          target={page.target ? collections.find(c => c.id === page.target) : null}
          resume={!!page.resume}
          initialFiles={isOutgoing ? null : page.files}
          onClose={() => pop()}
          onOpenSettings={()=>push({ name:'settings' }, 'up')}
          onDone={(batchId)=>push({ name:'triage', batchId }, 'fwd')}
        />); break;
      case 'settings': inner = (
        <SettingsScreen onClose={() => pop()} onToast={showToast} onExport={()=>{
          const n = window.LocusStore.downloadMarkdown({ collections, captures });
          showToast(`Exported ${n} captures`);
        }}/>
      ); break;
      case 'triage': inner = queue.length === 0 ? null : (
        <TriageScreen
          queue={page.batchId ? queue.filter(item=>item.batchId===page.batchId) : queue}
          collections={collectionsView}
          onDecision={(decision)=>applyDecisions([decision])}
          onUndo={()=>window.LocusImports.undo(page.batchId)}
          canUndo={(data.imports?.decisions || []).some(d=>!page.batchId || d.item.batchId===page.batchId)}
          onBack={()=>pop()}
          onAcceptAll={(decisions)=>{
            const r = applyDecisions(decisions);
            showToast(`${r.kept} filed by AI`);
            reset({ name:'home' });
          }}
          onComplete={()=>{showToast('Saved');reset({ name:'home' });}}
          onToast={showToast}
          onAskName={(initial, cb)=>setDialog({ title: 'New drawer', input: initial, okLabel: 'File here', onOk: cb })}
        />); break;
      default: inner = null;
    }
    return (
      <div className={`page-host ${animClass}`} key={page._out ? `out-${animKey}` : `in-${animKey}-${page.name}`}>
        {inner}
      </div>
    );
  };

  const menuColl = menuFor && collectionsView.find(c => c.id === menuFor);

  return (
    <div className="app" ref={appRef}>
      {transitioning && renderScreen(transitioning, true)}
      {renderScreen(cur, false)}
      {storageError && <div role="alert" style={{ position:'absolute',left:0,right:0,bottom:0,zIndex:700,padding:18,background:'var(--cream)',borderTop:'1px solid var(--line)',fontSize:TY.caption,lineHeight:1.5 }}>{storageError}<button onClick={()=>{try{STORE.save(STORE.load());}catch(e){setStorageError(e.message);}}} style={{display:'block',marginTop:8,border:'none',background:'transparent',fontSize:TY.caption,textDecoration:'underline',cursor:'pointer'}}>Try again</button></div>}
      {launching && <LaunchWordmark onDone={() => setLaunching(false)}/>}
      {expand && (
        <div className="card-expand" style={{
          background: expand.color.bg,
          ...(expand.full
            ? { top: 0, left: 0, width: '100%', height: '100%', borderRadius: 0 }
            : { top: expand.from.top, left: expand.from.left, width: expand.from.width, height: expand.from.height, borderRadius: 0 }),
        }}/>
      )}
      {toast && <Toast key={toast.id} message={toast.message} action={toast.action} onAction={toast.onAction} onDone={()=>setToast(null)}/>}
      {dialog && <Dialog key={dialog.title} dialog={dialog} onClose={()=>setDialog(null)}/>}
      {menuColl && (
        <DrawerMenu
          collection={menuColl}
          collections={collectionsView}
          onClose={()=>setMenuFor(null)}
          onRecolor={(i)=>setCollections(cs => cs.map(c => c.id===menuColl.id ? { ...c, color:i } : c))}
          onRename={()=>{
            setMenuFor(null);
            setDialog({ title: 'Rename drawer', input: menuColl.name, okLabel: 'Save', onOk: (name) => {
              if (name !== menuColl.name) { setCollections(cs => cs.map(c => c.id===menuColl.id ? { ...c, name } : c)); showToast('Renamed'); }
            }});
          }}
          onDelete={()=>{ setMenuFor(null); deleteDrawer(menuColl); }}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
