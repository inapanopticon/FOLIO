// Folio — the Import page: start (choose photos, continue, history) and one batch's page.
// Manual review is in import-review.jsx, the final confirm step in import-confirm.jsx.

// Where you are in an import: 1. Choose, 2. Review, 3. Organize, 4. Confirm, as a row of cells
// under the header. Finished steps are filled (ink with cream text, or the drawer's text colour with its
// background colour on drawer pages) and keep a faint divider between them; the current step is bold and
// its underline replaces the bottom hairline; later steps are faint. Each cell draws its own bottom edge,
// so lines never stack.
const IMPORT_STEPS = ['Choose', 'Review', 'Organize', 'Confirm'];
function ImportSteps({ step, line = HAIR, allDone = false, fill = 'var(--ink)', onFill = 'var(--cream)' }) {
  const lineColor = line.replace(/^\s*1px\s+solid\s+/, '');
  const fillLine = `1px solid color-mix(in srgb, ${onFill} 30%, transparent)`;
  return (
    <div role="list" aria-label="Import steps" style={{ display: 'flex', flexShrink: 0 }}>
      {IMPORT_STEPS.map((label, i) => {
        const n = i + 1, done = allDone || n < step, now = !allDone && n === step;
        const nextDone = allDone || n + 1 < step;
        return (
          <div key={label} role="listitem" aria-current={now ? 'step' : undefined} style={{
            flex: '1 1 0', minWidth: 0, padding: '11px 0 11px 14px',
            borderRight: i === 3 ? 'none' : done ? (nextDone ? fillLine : 'none') : line,
            background: done ? fill : 'transparent', color: done ? onFill : 'inherit',
            boxShadow: now ? 'inset 0 -2px 0 currentColor' : done ? 'none' : `inset 0 -1px 0 ${lineColor}`,
            fontSize: TY.caption, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            fontWeight: now ? 700 : 400, opacity: done || now ? 1 : 0.4,
          }}>
            {n}. {label}
          </div>
        );
      })}
    </div>
  );
}

const IMPORT_UNFINISHED = window.LocusImports.UNFINISHED_STATES;
const IMPORT_STATUS = {
  saving: 'Saving…', screen: 'To review', skipped: 'Skipped', ready: 'Kept for AI', working: 'Reading…',
  done: 'Ready to review', error: 'Recognition failed', 'save-error': 'Not saved', queued: 'To review',
  kept: 'Kept', discarded: 'Discarded',
};
const importBtn = { background: 'transparent', border: 'none', borderRadius: 0, color: 'inherit', cursor: 'pointer', fontSize: TY.label, fontWeight: 400 };
const importRow = { padding: '14px 18px', borderBottom: HAIR, fontSize: TY.caption, lineHeight: 1.6 };
const importBandTitle = { ...importRow, background: 'var(--band)', color: 'var(--ink)', letterSpacing: '0.12em' };
const importFooterBtn = { ...importBtn, width: '100%', minHeight: 56 };
const nextArrow = <Arrow dir="right" style={{ marginLeft: 8 }}/>;

const importDate = ts => new Date(ts)
  .toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  .replace(',', ' ·');
const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
// a batch summed up in plain words, only the parts that are not zero
function summarizeBatch(list) {
  const n = states => list.filter(t => states.includes(t.state)).length;
  const parts = [
    [n(['saving', 'save-error']), 'not saved'],
    [n(['screen']), 'to review'],
    [n(['ready', 'working', 'error']), 'waiting for AI'],
    [n(['done', 'queued']), 'to confirm'],
    [n(['kept']), 'kept'],
    [n(['skipped']), 'skipped'],
    [n(['discarded']), 'discarded'],
  ].filter(([k]) => k > 0);
  return parts.length ? parts.map(([k, w]) => `${k} ${w}`).join(' · ') : 'Empty';
}
const liveTasksOf = (data, batchId) => data.imports.tasks.filter(t => t.batchId === batchId && t.state !== 'removed');
const dropZone = (setDragOver, addFiles) => ({
  onDragOver: e => { e.preventDefault(); setDragOver(true); },
  onDragLeave: () => setDragOver(false),
  onDrop: e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); },
});

function ImportHeader({ label, onBack }) {
  return (
    <div style={headerBar(HAIR)}>
      <button aria-label="Back" onClick={onBack} style={{ ...importBtn, width: 56, borderRight: HAIR, display: 'grid', placeItems: 'center' }}><Arrow size={20}/></button>
      <div style={{ padding: '17px 18px', fontSize: TY.caption, letterSpacing: '0.12em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
    </div>
  );
}

function PhotoFileInput({ inputRef, onFiles }) {
  return <input ref={inputRef} type="file" accept="image/*" multiple hidden
    onChange={e => { const files = Array.from(e.target.files); e.target.value = ''; onFiles(files); }}/>;
}

// One row in CONTINUE or HISTORY. History rows are a little quieter.
function BatchRow({ batch, tasks, quiet, onOpen, onLong }) {
  const soft = quiet ? 'var(--ink-3)' : 'var(--ink-2)';
  return (
    <LongPressRow onLong={onLong} onClick={onOpen} style={{ ...importBtn, ...importRow, width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span>
        <span style={{ display: 'block', fontSize: TY.label, color: 'var(--ink)' }}>{importDate(batch.createdAt)} · {batch.targetName || 'Inbox'}</span>
        <span style={{ color: soft }}>{summarizeBatch(tasks)}</span>
      </span>
      <Arrow dir="right" style={quiet ? { color: soft } : undefined}/>
    </LongPressRow>
  );
}

// ===== START: what you came here to do =====
function ImportStart({ data, target, close, busy, adding, progress, error, dragOver, setDragOver, addFiles, fileRef, direct, setBatchId, act, askDelete, confirm, setConfirm }) {
  const P = window.LocusImports;
  const { batches, tasks: allTasks, decisions } = data.imports;
  const unfinished = batches.filter(b => (!target || b.targetId === target.id)
    && allTasks.some(t => t.batchId === b.id && IMPORT_UNFINISHED.includes(t.state)));
  const history = batches.filter(b => !unfinished.includes(b));
  const open = b => { direct.current = false; setBatchId(b.id); };
  const row = (b, quiet) => <BatchRow key={b.id} batch={b} tasks={liveTasksOf(data, b.id)} quiet={quiet} onOpen={() => open(b)} onLong={() => askDelete(b)}/>;

  return (
    <div className="page"><div className="content">
      <StatusBar/>
      <ImportHeader label="IMPORT" onBack={close}/>
      <ImportSteps step={1}/>
      <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
        <div {...dropZone(setDragOver, addFiles)} style={{ borderBottom: HAIR, background: dragOver ? 'var(--paper)' : 'transparent' }}>
          <button disabled={busy} onClick={() => { direct.current = false; fileRef.current?.click(); }}
            style={{ ...importBtn, width: '100%', minHeight: 150, padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
            <span>
              <span style={{ display: 'block', fontSize: TY.title, lineHeight: 1.3 }}>{adding ? `Saving ${progress?.processed || 0}/${progress?.total || '…'}` : 'Choose photos'}</span>
              <span style={{ display: 'block', fontSize: TY.caption, lineHeight: 1.6, marginTop: 6, color: 'var(--ink-2)' }}>{target ? `Into ${target.name}` : 'Into your inbox'} · Review before AI.</span>
            </span>
            <span style={{ fontSize: TY.title }}>+</span>
          </button>
          <PhotoFileInput inputRef={fileRef} onFiles={addFiles}/>
        </div>
        {error && <div role="alert" style={importRow}>{error}</div>}

        {unfinished.length > 0 && <>
          <div style={importBandTitle}>CONTINUE</div>
          {unfinished.map(b => row(b, false))}
        </>}

        {batches.length > 0 && <>
          {history.length > 0 && <div style={importBandTitle}>HISTORY · {history.length}</div>}
          {history.map(b => row(b, true))}
          {decisions.length > 0 && <button onClick={() => act(() => P.undo())} style={{ ...importBtn, ...importRow, width: '100%', textAlign: 'left', color: 'var(--ink-2)' }}>Undo last sorting decision</button>}
        </>}
      </div>
      {confirm && <Dialog key="delete-import" dialog={confirm} onClose={() => setConfirm(null)}/>}
    </div></div>
  );
}

// One photo's cell on a batch's page.
function BatchPhoto({ task: t, busy, act }) {
  const P = window.LocusImports;
  const underlined = { ...importBtn, padding: '0 8px 8px', fontSize: TY.caption, textDecoration: 'underline' };
  return (
    <div style={{ minWidth: 0, position: 'relative', borderRight: HAIR, borderBottom: HAIR }}>
      <Shot imageId={t.imageId} glyph="" style={{ width: '100%', aspectRatio: '1', opacity: ['skipped', 'discarded'].includes(t.state) ? 0.45 : 1 }}/>
      {!busy && ['screen', 'ready', 'done', 'error', 'save-error'].includes(t.state) && (
        <button aria-label={`Remove ${t.name}`} onClick={() => act(() => P.remove(t.id))} style={{ ...importBtn, position: 'absolute', top: 0, right: 0, width: 44, height: 44, background: 'var(--cream)', borderLeft: HAIR, borderBottom: HAIR }}>×</button>
      )}
      <div style={{ padding: 8, fontSize: TY.caption, lineHeight: 1.5, overflowWrap: 'anywhere', color: 'var(--ink-2)' }}>
        {IMPORT_STATUS[t.state]}
        {t.result && <div style={{ color: 'var(--ink)' }}>{t.result.title}</div>}
        {t.error && <div>{t.error}</div>}
      </div>
      {t.state === 'skipped' && <button onClick={() => act(() => P.rescreen(t.id))} style={underlined}>Review again</button>}
      {t.state === 'discarded' && <button onClick={() => act(() => P.restore(t.id))} style={underlined}>Restore to sorting</button>}
    </div>
  );
}

// The line of status text under a batch's date.
function BatchSummary({ batch, batchId, tasks, adding, progress, busy, organized, aiTotal, working, setBatchId }) {
  const interrupted = batch.selected - (batch.processed || 0);
  const allDuplicates = tasks.length === 0 && batch.duplicates > 0;
  const headline = adding
    ? `Saving ${progress?.processed || 0}/${progress?.total || '…'}`
    : allDuplicates
      ? `${batch.duplicates === 1 ? 'This photo was' : `All ${batch.duplicates} photos were`} imported before, so nothing new was added.`
      : `${plural(tasks.length, 'photo')} · ${summarizeBatch(tasks)}`;
  return (
    <div style={{ padding: '22px 18px 18px', borderBottom: HAIR }}>
      <div style={{ fontSize: TY.title, lineHeight: 1.3 }}>{importDate(batch.createdAt)}</div>
      <div aria-live="polite" style={{ fontSize: TY.caption, lineHeight: 1.6, marginTop: 6, color: 'var(--ink-2)' }}>
        {headline}
        {aiTotal > 0 && organized < aiTotal && <div>{organized} of {aiTotal} organized</div>}
        {batch.duplicates > 0 && tasks.length > 0 && <div>{batch.duplicates} already imported, skipped</div>}
        {batch.rejected > 0 && <div>{batch.rejected} not added</div>}
        {!busy && interrupted > 0 && <div>{interrupted} files were interrupted before saving finished. Choose them again; saved ones are skipped.</div>}
        {batch.paused && <div>{working ? 'Finishing current photos…' : 'Paused · progress saved'}</div>}
      </div>
      {batch.lastDuplicateBatch && batch.lastDuplicateBatch !== batchId && (
        <button onClick={() => setBatchId(batch.lastDuplicateBatch)} style={{ ...importBtn, fontSize: TY.caption, textDecoration: 'underline', padding: '8px 0 0' }}>View previous import</button>
      )}
    </div>
  );
}

// ===== ONE BATCH: its photos, where each one is, and the next step =====
function ImportBatch(props) {
  const { batch, batchId, batchTarget, tasks, adding, busy, running, error, screenCount, todo, errorCount, readyCount, done, queued, palette,
    visibleCount, setVisibleCount, setDragOver, addFiles, fileRef, act, direct, setReviewing, onOpenSettings, startOrganizing, finish, backToStart } = props;
  const P = window.LocusImports;
  const aiReady = window.LocusAI.isReady();
  const finished = tasks.length > 0 && tasks.every(t => ['kept', 'discarded', 'skipped'].includes(t.state));
  const step = adding || !tasks.length ? 1 : screenCount ? 2 : (running || todo) ? 3 : 4;
  const results = done + queued;

  return (
    <div className="page"><div className="content">
      <StatusBar/>
      <ImportHeader label={`IMPORT · ${(batchTarget?.name || 'Inbox').toUpperCase()}`} onBack={() => { if (running) P.pause(batchId); backToStart(); }}/>
      <ImportSteps step={step} allDone={finished}/>
      <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
        <BatchSummary {...props}/>
        {todo > 0 && !screenCount && !aiReady && (
          <button onClick={onOpenSettings} style={{ ...importBtn, ...importRow, width: '100%', textAlign: 'left' }}>Connect AI in Settings{nextArrow}</button>
        )}
        {error && <div role="alert" style={importRow}>{error}</div>}
        {batch?.failures?.length > 0 && (
          <details style={importRow}>
            <summary>Files not added · {batch.failures.length}</summary>
            {batch.failures.map((f, i) => <div key={i} style={{ marginTop: 8, overflowWrap: 'anywhere' }}>{f.name}: {f.message}</div>)}
          </details>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          {tasks.slice(0, visibleCount).map(t => <BatchPhoto key={t.id} task={t} busy={busy} act={act}/>)}
        </div>
        {tasks.length > visibleCount && (
          <button onClick={() => setVisibleCount(n => n + 60)} style={{ ...importBtn, ...importRow, width: '100%' }}>Show more · {tasks.length - visibleCount} remaining</button>
        )}
        {!finished && (
          <div {...dropZone(setDragOver, addFiles)}>
            <button disabled={busy} onClick={() => fileRef.current?.click()} style={{ ...importBtn, ...importRow, width: '100%', textAlign: 'left', color: 'var(--ink-2)' }}>+ Add more photos to this import</button>
            <PhotoFileInput inputRef={fileRef} onFiles={addFiles}/>
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, borderTop: HAIR, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {screenCount > 0 && <button disabled={busy} onClick={() => setReviewing(true)} style={importFooterBtn}>Review {plural(screenCount, 'photo')}{nextArrow}</button>}
        {!screenCount && !running && readyCount > 0 && <button disabled={busy} onClick={() => setReviewing(true)} style={{ ...importFooterBtn, borderBottom: HAIR }}>Review choices{nextArrow}</button>}
        {running && <button onClick={() => act(() => P.pause(batchId))} disabled={batch?.paused} style={importFooterBtn}>{batch?.paused ? 'Finishing current photos…' : 'Pause'}</button>}
        {!running && !screenCount && todo > 0 && (
          <button disabled={busy || !aiReady} onClick={startOrganizing} style={{ ...importFooterBtn, opacity: aiReady ? 1 : 0.4 }}>
            {errorCount ? 'Retry / continue' : `Organize ${plural(readyCount, 'photo')}`}{nextArrow}
          </button>
        )}
        {results > 0 && (
          <button disabled={busy} onClick={finish} style={{ ...importFooterBtn, borderTop: screenCount || todo || running ? HAIR : 'none', background: palette?.bg || 'var(--paper)', color: palette?.fg || 'inherit' }}>
            Review {plural(results, 'result')}{nextArrow}
          </button>
        )}
        {finished && <button onClick={backToStart} style={{ ...importFooterBtn, color: 'var(--ink-2)' }}>{direct.current ? 'Done' : 'Done · back to Import'}</button>}
      </div>
    </div></div>
  );
}

// target: when opened from inside a drawer, everything imported is filed there
// initialFiles: photos already picked from Home or a drawer. The screen saves them (with the
// duplicate check), then moves forward by itself: saved → manual review → (you tap Organize) → results.
const consumedPicks = new WeakSet(); // picked-file lists that have already been imported
function ImportScreen({ collections, target, resume, initialFiles, onClose, onDone, onOpenSettings }) {
  const P = window.LocusImports, S = window.LocusStore;
  // opened straight into one batch (a drawer's +, Home's continue row): back closes Import instead of
  // showing the Import page. Anything started from the Import page goes back to it.
  const direct = useRef(!!initialFiles?.length || !!resume);
  const [data, setData] = useState(() => S.load());
  const [batchId, setBatchId] = useState(() => {
    if (!resume) return null;
    const d = S.load();
    const open = b => (!target || b.targetId === target.id) && d.imports.tasks.some(t => t.batchId === b.id && IMPORT_UNFINISHED.includes(t.state));
    return d.imports.batches.find(open)?.id || null;
  });
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [progress, setProgress] = useState(null);
  const [visibleCount, setVisibleCount] = useState(60);
  const [dragOver, setDragOver] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confirm, setConfirm] = useState(null); // delete-import sheet
  const fileRef = useRef();
  const batchRef = useRef(batchId); batchRef.current = batchId;
  const flow = useRef({ auto: !!initialFiles?.length, reviewed: false, finished: false }); // auto-advance for a batch started from the picker

  useEffect(() => {
    const unsubscribe = S.subscribe(() => setData(S.load()));
    P.recover().catch(e => setError(e.message));
    return () => {
      unsubscribe();
      const id = batchRef.current;
      if (id && P.isRunning(id)) { try { P.pause(id); } catch (e) {} }
    };
  }, []);

  const batch = data.imports.batches.find(b => b.id === batchId);
  const tasks = liveTasksOf(data, batchId);
  const count = state => tasks.filter(t => t.state === state).length;
  const batchTarget = batch
    ? (collections.find(c => c.id === batch.targetId) || (batch.targetName ? { name: batch.targetName, id: batch.targetId } : null))
    : target;
  const screenCount = count('screen');
  const organized = tasks.filter(t => !!t.result).length;
  const aiTotal = tasks.filter(t => t.screened && !['skipped', 'saving', 'save-error'].includes(t.state)).length;
  const working = count('working'), readyCount = count('ready'), errorCount = count('error');
  const todo = readyCount + errorCount, done = count('done'), queued = count('queued');
  const running = P.isRunning(batchId);
  const busy = adding || !!batch?.receiving || running;
  const palette = batchTarget ? THEME.colorOf(batchTarget, collections) : null;

  const act = async fn => {
    setError('');
    try { await fn(); setData(S.load()); }
    catch (e) { setError(e.message || 'Could not save. Please try again.'); }
  };
  const addFiles = async files => {
    if (busy) return;
    setAdding(true); setError('');
    try {
      let id = batchId;
      if (!batch || (tasks.length > 0 && tasks.every(t => ['kept', 'discarded'].includes(t.state)))) {
        id = P.createBatch(batch ? batchTarget : target);
        setBatchId(id); batchRef.current = id;
        flow.current = { auto: true, reviewed: false, finished: false };
      }
      await P.addFiles(id, Array.from(files), setProgress);
      setData(S.load());
    } catch (e) { setError(e.message); }
    finally { setAdding(false); setProgress(null); }
  };
  useEffect(() => {
    const paste = e => { if (!busy && e.clipboardData?.files?.length) addFiles(Array.from(e.clipboardData.files)); };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, [batchId, busy]);
  const close = () => act(async () => { if (running) P.pause(batchId); onClose(); });
  const finish = () => act(() => { if (done) P.review(batchId); onDone(batchId); });
  const startOrganizing = () => { setReviewing(false); act(() => P.run(batchId)); };

  // hand the picked photos over exactly once, even if this page gets drawn again (e.g. during a transition)
  useEffect(() => {
    if (!initialFiles?.length || consumedPicks.has(initialFiles)) return;
    consumedPicks.add(initialFiles); addFiles(initialFiles);
  }, []);
  useEffect(() => { // saved → straight into manual review
    const f = flow.current;
    if (f.auto && !f.reviewed && batch && !adding && !batch.receiving && screenCount > 0) { f.reviewed = true; setReviewing(true); }
  }, [adding, batch?.receiving, screenCount]);
  useEffect(() => { // AI finished cleanly → straight into the results
    const f = flow.current;
    if (f.auto && f.reviewed && !f.finished && batch && !running && !adding && screenCount === 0 && todo === 0 && working === 0 && (done + queued) > 0) {
      f.finished = true; finish();
    }
  }, [running, screenCount, todo, working, done, queued]);

  if (reviewing && batch) {
    return <PhotoReviewScreen tasks={tasks} palette={palette}
      onBack={() => setReviewing(false)} onChange={() => setData(S.load())} onOrganize={startOrganizing} onSettings={onOpenSettings} canOrganize={window.LocusAI.isReady()}/>;
  }

  const askDelete = b => {
    const saved = liveTasksOf(data, b.id).filter(t => t.state === 'kept').length;
    setConfirm({
      title: 'Delete this import?', okLabel: 'Delete', danger: true,
      message: `${importDate(b.createdAt)} · ${b.targetName || 'Inbox'}. `
        + (saved ? `${plural(saved, 'screenshot')} already in drawers will stay. ` : '')
        + 'Photos not yet saved to a drawer will be removed. This can\'t be undone.',
      onOk: () => act(() => P.removeBatch(b.id)),
    });
  };
  const backToStart = () => {
    if (direct.current) { onClose(); return; }
    setBatchId(null); setError(''); setVisibleCount(60);
  };

  const shared = { busy, adding, progress, error, setDragOver, addFiles, fileRef, direct, setBatchId, act };
  if (!batch) return <ImportStart {...shared} data={data} target={target} close={close} dragOver={dragOver} askDelete={askDelete} confirm={confirm} setConfirm={setConfirm}/>;
  return <ImportBatch {...shared} batch={batch} batchId={batchId} batchTarget={batchTarget} tasks={tasks} running={running} organized={organized} aiTotal={aiTotal} working={working}
    screenCount={screenCount} todo={todo} errorCount={errorCount} readyCount={readyCount} done={done} queued={queued} palette={palette} visibleCount={visibleCount} setVisibleCount={setVisibleCount}
    setReviewing={setReviewing} onOpenSettings={onOpenSettings} startOrganizing={startOrganizing} finish={finish} backToStart={backToStart}/>;
}
