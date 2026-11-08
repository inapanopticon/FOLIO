// Locus — live features: real screenshots, Qianwen settings, real import

const { useState: useLState, useEffect: useLEffect, useRef: useLRef } = React;
// type scale shared by every screen: TY.title 28 · TY.body 17 · TY.label 15 · TY.caption 13
const TY = window.LocusTheme.TYPE;
// The one arrow used everywhere in the app (the back button's long arrow). dir='right' mirrors it.
// Inline in text it sits on the baseline; in a header cell it is 20px.
function Arrow({ dir = 'left', size = 16, style }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, verticalAlign: size < 20 ? '-0.18em' : 'middle', transform: dir === 'right' ? 'scaleX(-1)' : undefined, ...style }}>
      <line x1="20" y1="12" x2="4" y2="12"/><polyline points="10 6 4 12 10 18"/>
    </svg>
  );
}

// Where you are in an import: 1. Choose, 2. Review, 3. Organize, 4. Confirm, as a row of cells
// under the header. Finished steps are filled (ink with cream text, or the drawer's text colour with its
// background colour on drawer pages) and keep a faint divider between them; the current step is bold and
// its underline replaces the bottom hairline; later steps are faint. Each cell draws its own bottom edge,
// so lines never stack.
const IMPORT_STEPS = ['Choose', 'Review', 'Organize', 'Confirm'];
function ImportSteps({ step, line = '1px solid var(--line)', allDone = false, fill = 'var(--ink)', onFill = 'var(--cream)' }) {
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

// Tags you can remove, always 4 per row whatever their length. Empty cells fill the last row so the
// hairlines stay a clean grid; long tags end in an ellipsis (full name on hover / long-press title).
function TagGrid({ tags, onRemove, line }) {
  if (!tags.length) return null;
  const pad = (4 - tags.length % 4) % 4;
  const cell = i => ({ minWidth: 0, borderTop: line, borderRight: i % 4 === 3 ? 'none' : line });
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
      {tags.map((t, i) => <div key={t} title={t} style={{ ...cell(i), display: 'flex', alignItems: 'center', paddingLeft: i % 4 === 0 ? 18 : 12 }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: TY.caption, fontWeight: 600, lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t}</span>
        <button onClick={() => onRemove(t)} aria-label={`Remove tag ${t}`} style={{ width: 36, height: 44, flexShrink: 0, padding: 0, border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit' }}>×</button>
      </div>)}
      {Array.from({ length: pad }, (_, j) => <div key={`empty-${j}`} aria-hidden="true" style={cell(tags.length + j)}/>)}
    </div>
  );
}

// Long-press (phones) or right-click (computers) on a row. The tap that ends a long-press is swallowed.
function useLongPress(onLong, ms = 500) {
  const timer = useLRef(null), start = useLRef(null), fired = useLRef(false);
  const clear = () => { clearTimeout(timer.current); timer.current = null; };
  return {
    onPointerDown: e => { fired.current = false; start.current = { x: e.clientX, y: e.clientY }; clear();
      timer.current = setTimeout(() => { fired.current = true; onLong(); }, ms); },
    onPointerMove: e => { if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) clear(); },
    onPointerUp: clear, onPointerLeave: clear, onPointerCancel: clear,
    onContextMenu: e => { e.preventDefault(); clear(); fired.current = true; onLong(); },
    onClickCapture: e => { if (fired.current) { e.stopPropagation(); e.preventDefault(); fired.current = false; } },
    style: { WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' },
  };
}
function LongPressRow({ onLong, children, style, ...rest }) {
  const lp = useLongPress(onLong);
  return <button {...rest} {...lp} style={{ ...style, ...lp.style }}>{children}</button>;
}

// Opens the system photo picker from any button (must run inside the tap), then hands over the files.
function usePhotoPicker(onFiles) {
  const ref = useLRef(null);
  const input = <input ref={ref} type="file" accept="image/*" multiple hidden
    onChange={e => { const files = Array.from(e.target.files); e.target.value = ''; if (files.length) onFiles(files); }}/>;
  return [() => ref.current?.click(), input];
}
// Remembers how far a page was scrolled (keyed by page + id), so going back lands where you left
// and the crossfade between drawer and capture pages never shows a jump.
const scrollMemory = {};
function useRememberedScroll(key) {
  const ref = useLRef(null);
  useLEffect(() => {
    const el = ref.current; if (!el) return;
    el.scrollTop = scrollMemory[key] || 0;
    const save = () => { scrollMemory[key] = el.scrollTop; };
    el.addEventListener('scroll', save, { passive: true });
    return () => el.removeEventListener('scroll', save);
  }, [key]);
  return ref;
}

// -------- Shot: shows the stored screenshot, or the glyph when there is none --------
function useStoredImage(imageId) {
  const [src, setSrc] = useLState(null);
  useLEffect(() => {
    let alive = true;
    setSrc(null);
    if (imageId) window.LocusImages.get(imageId).then((v) => { if (alive) setSrc(v); });
    return () => { alive = false; };
  }, [imageId]);
  return src;
}

// fit='natural' shows the whole image at full width and its own height (for long screenshots)
function Shot({ imageId, glyph, fontSize = 18, style = {}, fit = 'cover' }) {
  const src = useStoredImage(imageId);
  return (
    <div style={{
      overflow: 'hidden', position: 'relative',
      background: 'var(--paper)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, color: 'var(--ink-3)',
      ...style,
    }}>
      {src
        ? (fit === 'natural'
          ? <img src={src} alt="" draggable={false} loading="lazy" decoding="async" style={{ width: '100%', height: 'auto', display: 'block' }}/>
          : <img src={src} alt="" draggable={false} loading="lazy" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: fit, objectPosition: 'top', display: 'block' }}/>)
        : glyph}
    </div>
  );
}

function ScreenHeader({ title, sub, onClose }) {
  return (
    <div style={{ padding: '4px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="t-serif" style={{ fontSize: TY.title, fontWeight: 500, letterSpacing: '-0.02em' }}>{title}</div>
        {sub && <div className="t-eyebrow" style={{ marginTop: 6 }}>{sub}</div>}
      </div>
      <button className="btn-icon" onClick={onClose} aria-label="Close" style={{ width: 34, height: 34 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
      </button>
    </div>
  );
}

const inputStyle = {
  width: '100%', height: 42, padding: '0 14px',
  background: 'var(--card)', border: '1px solid var(--card-border)',
  borderRadius: 10, color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: TY.body, outline: 'none',
};

// =============== SETTINGS ===============
function SettingsScreen({ onClose, onToast, onExport }) {
  const AI = window.LocusAI;
  const [s, setS] = useLState(() => AI.load());
  const [status, setStatus] = useLState(null); // {kind:'ok'|'err'|'busy', msg}
  const [show, setShow] = useLState(false);
  const set = (k, v) => { setS((p) => ({ ...p, [k]: v })); setStatus(null); };

  const saveAndClose = () => { AI.save(s); onToast('Settings saved'); onClose(); };
  const test = async () => {
    setStatus({ kind: 'busy', msg: 'Testing…' });
    try { await AI.test(s); AI.save(s); setStatus({ kind: 'ok', msg: `Connected · ${s.model}` }); }
    catch (e) { setStatus({ kind: 'err', msg: e.message }); }
  };

  const line = '1px solid var(--line)';
  const label = { display: 'block', fontSize: TY.caption, letterSpacing: '0.12em', color: 'var(--ink-2)', lineHeight: 1.5 };
  const section = { padding: '18px', borderBottom: line };
  const button = { background: 'transparent', border: 'none', borderRadius: 0, color: 'inherit', cursor: 'pointer', fontSize: TY.caption, fontWeight: 400 };
  const field = { width: '100%', minWidth: 0, background: 'transparent', border: 'none', borderRadius: 0, outline: 'none', color: 'var(--ink)', fontSize: TY.body, lineHeight: 1.5, padding: '14px 18px' };

  return (
    <div className="page settings-screen">
      <div className="content">
        <StatusBar/>
        <div style={{ display: 'flex', height: 52, flexShrink: 0, borderTop: line, borderBottom: line }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: TY.caption, letterSpacing: '0.12em' }}>SETTINGS</div>
          <button aria-label="Close" onClick={onClose} style={{ ...button, width: 56, borderLeft: line, display: 'grid', placeItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
          <div style={{ padding: '24px 18px 20px', borderBottom: line }}>
            <div style={{ fontSize: TY.title, fontWeight: 400, lineHeight: 1.3, letterSpacing: '-0.015em' }}>AI · Qianwen</div>
          </div>
          <div style={{ padding: '14px 18px', borderBottom: line }}><label htmlFor="settings-key" style={label}>QIANWEN API KEY</label></div>
          <div style={{ display: 'flex', borderBottom: line }}>
            <input id="settings-key" type={show ? 'text' : 'password'} value={s.apiKey} onChange={e=>set('apiKey',e.target.value)} placeholder="sk-…" autoComplete="off" spellCheck={false} style={{ ...field, flex: 1 }}/>
            <button onClick={()=>setShow(v=>!v)} aria-pressed={show} style={{ ...button, width: 72, flexShrink: 0, borderLeft: line }}>{show ? 'Hide' : 'Show'}</button>
          </div>
          <div style={{ ...section, fontSize: TY.caption, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            Get one at <a href="https://platform.qianwenai.com/home/api-keys" target="_blank" rel="noreferrer" style={{ color: 'inherit', textUnderlineOffset: 3 }}>platform.qianwenai.com</a>.
            {' '}It stays in this browser only and is sent nowhere except Qianwen.
            {AI.isTokenPlanKey(s.apiKey) && <div style={{ marginTop: 12 }}>This looks like a Token Plan key (sk-sp-…). Qianwen's Token Plan address doesn't accept calls from web pages, so please use a pay-as-you-go key.</div>}
          </div>
          <div style={{ padding: '14px 18px', borderBottom: line }}><div id="settings-model-label" style={label}>MODEL</div></div>
          <div role="radiogroup" aria-labelledby="settings-model-label">
            {AI.MODELS.map(m=><button key={m.id} role="radio" aria-checked={s.model===m.id} onClick={()=>set('model',m.id)} style={{ ...button, width: '100%', minHeight: 72, display: 'flex', alignItems: 'center', textAlign: 'left', gap: 14, padding: '14px 18px', borderBottom: line }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, flexShrink: 0, border: '1px solid var(--ink-2)', borderRadius: '50%', background: s.model===m.id ? 'var(--ink)' : 'transparent' }}/>
              <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontSize: TY.body, lineHeight: 1.5 }}>{m.id}</span><span style={{ display: 'block', fontSize: TY.caption, color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 3 }}>{m.note}</span></span>
            </button>)}
          </div>
          <div style={{ padding:'14px 18px',borderBottom:line }}><label htmlFor="settings-preferences" style={label}>ORGANIZATION PREFERENCES</label></div>
          <textarea id="settings-preferences" value={s.preferences || ''} onChange={e=>set('preferences',e.target.value)} rows={4} placeholder="How should AI organize your photos?" style={{...field,display:'block',resize:'vertical',borderBottom:line}}/>
          {s.preferences && <button onClick={()=>set('preferences','')} style={{...button,padding:'14px 18px',borderBottom:line,width:'100%',textAlign:'left'}}>Reset preferences</button>}
          <div style={{ padding: '14px 18px', borderBottom: line }}><div style={label}>YOUR DATA</div></div>
          <button onClick={onExport} style={{ ...button, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '18px', textAlign: 'left', width: '100%', borderBottom: line }}>
            <span><span style={{ display: 'block', fontSize: TY.body, lineHeight: 1.5 }}>Export as Markdown</span><span style={{ display: 'block', fontSize: TY.caption, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 6 }}>Every drawer, title, summary, tag and note in one file.</span></span><Arrow dir="right"/>
          </button>
          <details style={{ borderBottom: line }}>
            <summary style={{ ...label, padding: '18px', cursor: 'pointer', display: 'list-item', listStylePosition: 'inside' }}>ADVANCED</summary>
            <label htmlFor="settings-base" style={{ ...label, padding: '0 18px 8px' }}>API BASE URL</label>
            <input id="settings-base" value={s.baseUrl} onChange={e=>set('baseUrl',e.target.value)} placeholder={AI.PAYG_BASE} style={field}/>
            <div style={{ padding: '0 18px 18px', fontSize: TY.caption, color: 'var(--ink-2)', lineHeight: 1.6 }}>Leave empty for default.</div>
          </details>
          {status && <div role="status" aria-live="polite" style={{ ...section, fontSize: TY.caption, lineHeight: 1.6, overflowWrap: 'anywhere' }}>{status.msg}</div>}
          <div style={{ height: 24 }}/>
        </div>
        <div style={{ display: 'flex', flexShrink: 0, borderTop: line, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <button onClick={test} disabled={!s.apiKey.trim() || status?.kind==='busy'} style={{ ...button, flex: 1, minHeight: 56, padding: '16px', borderRight: line, opacity: !s.apiKey.trim() || status?.kind==='busy' ? 0.4 : 1 }}>Test connection</button>
          <button onClick={saveAndClose} style={{ ...button, flex: 1, minHeight: 56, padding: '16px' }}>Save</button>
        </div>
      </div>
      <style>{`.settings-screen input::placeholder, .settings-screen textarea::placeholder { color: var(--ink-2); opacity: 0.65; }`}</style>
    </div>
  );
}

// =============== IMPORT (real screenshots) ===============
let _uid = 0;
const newId = (p) => `${p}_${Date.now().toString(36)}_${(_uid++).toString(36)}`;

// target: when opened from inside a drawer, everything imported is filed there
// initialFiles: photos already picked from Home or a drawer. The screen saves them (with the
// duplicate check), then moves forward by itself: saved → manual review → (you tap Organize) → results.
const consumedPicks = new WeakSet(); // picked-file lists that have already been imported
function LiveImportScreen({ collections, target, resume, initialFiles, onClose, onDone, onOpenSettings }) {
  const P=window.LocusImports,S=window.LocusStore;
  // opened straight into one batch (a drawer's +, Home's continue row): back closes Import instead of
  // showing the Import page. Anything started from the Import page goes back to it.
  const direct=useLRef(!!initialFiles?.length || !!resume);
  const [data,setData]=useLState(()=>S.load());
  const [batchId,setBatchId]=useLState(()=>{
    if(!resume)return null;
    const d=S.load();
    return d.imports.batches.find(b=>(!target || b.targetId===target.id) && d.imports.tasks.some(t=>t.batchId===b.id && ['saving','screen','ready','working','done','error','save-error','queued'].includes(t.state)))?.id || null;
  });
  const [error,setError]=useLState('');
  const [adding,setAdding]=useLState(false);
  const [progress,setProgress]=useLState(null);
  const [visibleCount,setVisibleCount]=useLState(60);
  const [dragOver,setDragOver]=useLState(false);
  const [reviewing,setReviewing]=useLState(false);
  const fileRef=useLRef();
  const batchRef=useLRef(batchId);batchRef.current=batchId;
  useLEffect(()=>{
    const unsubscribe=S.subscribe(()=>setData(S.load()));
    P.recover().catch(e=>setError(e.message));
    return ()=>{unsubscribe();const id=batchRef.current;if(id && P.isRunning(id)){try{P.pause(id);}catch(e){}}};
  },[]);
  const batch=data.imports.batches.find(b=>b.id===batchId);
  const tasks=data.imports.tasks.filter(t=>t.batchId===batchId && t.state!=='removed');
  const count=state=>tasks.filter(t=>t.state===state).length;
  const savedCount=tasks.filter(t=>!['saving','save-error'].includes(t.state)).length;
  const batchTarget=batch ? (collections.find(c=>c.id===batch.targetId) || (batch.targetName ? {name:batch.targetName,id:batch.targetId} : null)) : target;
  const screenCount=count('screen');
  const organized=tasks.filter(t=>!!t.result).length;
  const aiTotal=tasks.filter(t=>t.screened && !['skipped','saving','save-error'].includes(t.state)).length;
  const working=count('working'),todo=count('ready')+count('error'),done=count('done'),queued=count('queued');
  const running=P.isRunning(batchId);
  const busy=adding || !!batch?.receiving || running;
  const palette=batchTarget ? window.LocusTheme.colorOf(batchTarget,collections) : null;
  const line='1px solid var(--line)';
  const btn={background:'transparent',border:'none',borderRadius:0,color:'inherit',cursor:'pointer',fontSize:TY.label,fontWeight:400};
  const row={padding:'14px 18px',borderBottom:line,fontSize:TY.caption,lineHeight:1.6};
  const act=async fn=>{setError('');try{await fn();setData(S.load());}catch(e){setError(e.message || 'Could not save. Please try again.');}};
  const addFiles=async files=>{
    if(busy)return;
    setAdding(true);setError('');
    try {
      let id=batchId;
      if(!batch || (tasks.length>0 && tasks.every(t=>['kept','discarded'].includes(t.state)))) {id=P.createBatch(batch ? batchTarget : target);setBatchId(id);batchRef.current=id;flow.current={auto:true,reviewed:false,finished:false};}
      await P.addFiles(id,Array.from(files),setProgress);
      setData(S.load());
    }catch(e){setError(e.message);}finally{setAdding(false);setProgress(null);}
  };
  useLEffect(()=>{
    const paste=e=>{if(!busy && e.clipboardData?.files?.length)addFiles(Array.from(e.clipboardData.files));};
    window.addEventListener('paste',paste);return()=>window.removeEventListener('paste',paste);
  },[batchId,busy]);
  const close=()=>act(async()=>{if(running)P.pause(batchId);onClose();});
  const finish=()=>act(()=>{if(done)P.review(batchId);onDone(batchId);});
  const status={saving:'Saving…',screen:'To review',skipped:'Skipped',ready:'Kept for AI',working:'Reading…',done:'Ready to review',error:'Recognition failed','save-error':'Not saved',queued:'To review',kept:'Kept',discarded:'Discarded'};
  const startOrganizing=()=>{setReviewing(false);act(()=>P.run(batchId));};
  // ---- auto-advance for a batch started from the picker ----
  const flow=useLRef({auto:!!initialFiles?.length, reviewed:false, finished:false});
  // hand the picked photos over exactly once, even if this page gets drawn again (e.g. during a transition)
  useLEffect(()=>{
    if(!initialFiles?.length || consumedPicks.has(initialFiles)) return;
    consumedPicks.add(initialFiles); addFiles(initialFiles);
  },[]);
  useLEffect(()=>{  // saved → straight into manual review
    const f=flow.current;
    if(f.auto && !f.reviewed && batch && !adding && !batch.receiving && screenCount>0){ f.reviewed=true; setReviewing(true); }
  },[adding,batch?.receiving,screenCount]);
  useLEffect(()=>{  // AI finished cleanly → straight into the results
    const f=flow.current;
    if(f.auto && f.reviewed && !f.finished && batch && !running && !adding && screenCount===0 && todo===0 && working===0 && (done+queued)>0){ f.finished=true; finish(); }
  },[running,screenCount,todo,working,done,queued]);
  if(reviewing && batch){
    const PhotoReview=window.LocusTriage.PhotoReviewScreen;
    return <PhotoReview batchId={batchId} batch={batch} tasks={tasks} palette={palette} hintSeen={!!data.imports.screenHintSeen} onBack={()=>setReviewing(false)} onChange={()=>setData(S.load())} onOrganize={startOrganizing} onSettings={onOpenSettings} canOrganize={window.LocusAI.isReady()}/>;
  }
  // ---- two views: the start page (choose photos, continue, history) and one batch's page ----
  const shortDate = ts => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', ' ·');
  const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
  // a batch summed up in plain words, only the parts that are not zero
  const summarize = list => {
    const n = s => list.filter(t => s.includes(t.state)).length;
    const parts = [
      [n(['saving','save-error']), 'not saved'],
      [n(['screen']), 'to review'],
      [n(['ready','working','error']), 'waiting for AI'],
      [n(['done','queued']), 'to confirm'],
      [n(['kept']), 'kept'],
      [n(['skipped']), 'skipped'],
      [n(['discarded']), 'discarded'],
    ].filter(([k]) => k > 0);
    return parts.length ? parts.map(([k, w]) => `${k} ${w}`).join(' · ') : 'Empty';
  };
  const [confirm,setConfirm]=useLState(null);
  const askDelete = b => {
    const list = data.imports.tasks.filter(t => t.batchId === b.id && t.state !== 'removed');
    const saved = list.filter(t => t.state === 'kept').length;
    setConfirm({ title: 'Delete this import?', okLabel: 'Delete', danger: true,
      message: `${shortDate(b.createdAt)} · ${b.targetName || 'Inbox'}. ` + (saved ? `${plural(saved,'screenshot')} already in drawers will stay. ` : '') + 'Photos not yet saved to a drawer will be removed. This can\'t be undone.',
      onOk: () => act(() => P.removeBatch(b.id)) });
  };
  const backToStart = () => { if (direct.current) { onClose(); return; } setBatchId(null); setError(''); setVisibleCount(60); };
  const header = (label, onBack) => (
    <div style={{display:'flex',height:52,flexShrink:0,borderTop:line,borderBottom:line}}>
      <button aria-label="Back" onClick={onBack} style={{...btn,width:56,borderRight:line,display:'grid',placeItems:'center'}}><Arrow size={20}/></button>
      <div style={{padding:'17px 18px',fontSize:TY.caption,letterSpacing:'0.12em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</div>
    </div>
  );
  const unfinished = data.imports.batches.filter(b => (!target || b.targetId === target.id) &&
    data.imports.tasks.some(t => t.batchId === b.id && ['saving','screen','ready','working','done','error','save-error','queued'].includes(t.state)));

  // ===== START: what you came here to do =====
  if (!batch) return (
    <div className="page"><div className="content">
      <StatusBar/>
      {header('IMPORT', close)}
      <ImportSteps step={1}/>
      <div className="scroll-y" style={{flex:1,minHeight:0}}>
        <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(Array.from(e.dataTransfer.files));}} style={{borderBottom:line,background:dragOver ? 'var(--paper)' : 'transparent'}}>
          <button disabled={busy} onClick={()=>{direct.current=false;fileRef.current?.click();}} style={{...btn,width:'100%',minHeight:150,padding:18,display:'flex',alignItems:'center',justifyContent:'space-between',textAlign:'left'}}>
            <span><span style={{display:'block',fontSize:TY.title,lineHeight:1.3}}>{adding ? `Saving ${progress?.processed || 0}/${progress?.total || '…'}` : 'Choose photos'}</span><span style={{display:'block',fontSize:TY.caption,lineHeight:1.6,marginTop:6,color:'var(--ink-2)'}}>{target ? `Into ${target.name}` : 'Into your inbox'} · Review before AI.</span></span><span style={{fontSize:TY.title}}>+</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e=>{const files=Array.from(e.target.files);e.target.value='';addFiles(files);}}/>
        </div>
        {error && <div role="alert" style={row}>{error}</div>}

        {unfinished.length > 0 && <>
          <div style={{...row,background:'color-mix(in srgb, var(--ink) 5%, var(--cream))',color:'var(--ink)',letterSpacing:'0.12em'}}>CONTINUE</div>
          {unfinished.map(b => { const list = data.imports.tasks.filter(t => t.batchId === b.id && t.state !== 'removed'); return (
            <LongPressRow key={b.id} onLong={()=>askDelete(b)} onClick={()=>{direct.current=false;setBatchId(b.id);}} style={{...btn,...row,width:'100%',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
              <span><span style={{display:'block',fontSize:TY.label,color:'var(--ink)'}}>{shortDate(b.createdAt)} · {b.targetName || 'Inbox'}</span><span style={{color:'var(--ink-2)'}}>{summarize(list)}</span></span><Arrow dir="right"/>
            </LongPressRow>); })}
        </>}

        {data.imports.batches.length > 0 && <>
          <div style={{...row,background:'color-mix(in srgb, var(--ink) 5%, var(--cream))',color:'var(--ink)',letterSpacing:'0.12em'}}>HISTORY · {data.imports.batches.length}</div>
          {data.imports.batches.filter(b => !unfinished.includes(b)).map(b => { const list = data.imports.tasks.filter(t => t.batchId === b.id && t.state !== 'removed'); return (
            <LongPressRow key={b.id} onLong={()=>askDelete(b)} onClick={()=>{direct.current=false;setBatchId(b.id);}} style={{...btn,...row,width:'100%',textAlign:'left',display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
              <span><span style={{display:'block',fontSize:TY.label,color:'var(--ink)'}}>{shortDate(b.createdAt)} · {b.targetName || 'Inbox'}</span><span style={{color:'var(--ink-3)'}}>{summarize(list)}</span></span><Arrow dir="right" style={{color:'var(--ink-3)'}}/>
            </LongPressRow>); })}
          {data.imports.decisions.length>0 && <button onClick={()=>act(()=>P.undo())} style={{...btn,...row,width:'100%',textAlign:'left',color:'var(--ink-2)'}}>Undo last sorting decision</button>}
        </>}
      </div>
      {confirm && <Dialog key="delete-import" dialog={confirm} onClose={()=>setConfirm(null)}/>}
    </div></div>
  );

  // ===== ONE BATCH: its photos, where each one is, and the next step =====
  const finished = tasks.length > 0 && tasks.every(t => ['kept','discarded','skipped'].includes(t.state));
  return (
    <div className="page"><div className="content">
      <StatusBar/>
      {header(`IMPORT · ${(batchTarget?.name || 'Inbox').toUpperCase()}`, () => { if (running) P.pause(batchId); backToStart(); })}
      <ImportSteps step={adding || !tasks.length ? 1 : screenCount ? 2 : (running || todo) ? 3 : 4} allDone={finished}/>
      <div className="scroll-y" style={{flex:1,minHeight:0}}>
        <div style={{padding:'22px 18px 18px',borderBottom:line}}>
          <div style={{fontSize:TY.title,lineHeight:1.3}}>{shortDate(batch.createdAt)}</div>
          <div aria-live="polite" style={{fontSize:TY.caption,lineHeight:1.6,marginTop:6,color:'var(--ink-2)'}}>
            {adding ? `Saving ${progress?.processed || 0}/${progress?.total || '…'}`
              : (tasks.length === 0 && batch.duplicates > 0)
                ? `${batch.duplicates === 1 ? 'This photo was' : `All ${batch.duplicates} photos were`} imported before, so nothing new was added.`
                : `${plural(tasks.length, 'photo')} · ${summarize(tasks)}`}
            {aiTotal>0 && organized<aiTotal && <div>{organized} of {aiTotal} organized</div>}
            {batch.duplicates>0 && tasks.length>0 && <div>{batch.duplicates} already imported, skipped</div>}
            {batch.rejected>0 && <div>{batch.rejected} not added</div>}
            {!busy && batch.selected>(batch.processed || 0) && <div>{batch.selected-(batch.processed || 0)} files were interrupted before saving finished. Choose them again; saved ones are skipped.</div>}
            {batch.paused && <div>{working ? 'Finishing current photos…' : 'Paused · progress saved'}</div>}
          </div>
          {batch.lastDuplicateBatch && batch.lastDuplicateBatch!==batchId && <button onClick={()=>setBatchId(batch.lastDuplicateBatch)} style={{...btn,fontSize:TY.caption,textDecoration:'underline',padding:'8px 0 0'}}>View previous import</button>}
        </div>
        {todo>0 && !screenCount && !window.LocusAI.isReady() && <button onClick={onOpenSettings} style={{...btn,...row,width:'100%',textAlign:'left'}}>Connect Qianwen in Settings<Arrow dir="right" style={{marginLeft:8}}/></button>}
        {error && <div role="alert" style={row}>{error}</div>}
        {batch?.failures?.length>0 && <details style={row}><summary>Files not added · {batch.failures.length}</summary>{batch.failures.map((f,i)=><div key={i} style={{marginTop:8,overflowWrap:'anywhere'}}>{f.name}: {f.message}</div>)}</details>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}>
          {tasks.slice(0,visibleCount).map(t=><div key={t.id} style={{minWidth:0,position:'relative',borderRight:line,borderBottom:line}}>
            <Shot imageId={t.imageId} glyph="" style={{width:'100%',aspectRatio:'1',opacity:['skipped','discarded'].includes(t.state) ? 0.45 : 1}}/>
            {!busy && ['screen','ready','done','error','save-error'].includes(t.state) && <button aria-label={`Remove ${t.name}`} onClick={()=>act(()=>P.remove(t.id))} style={{...btn,position:'absolute',top:0,right:0,width:44,height:44,background:'var(--cream)',borderLeft:line,borderBottom:line}}>×</button>}
            <div style={{padding:8,fontSize:TY.caption,lineHeight:1.5,overflowWrap:'anywhere',color:'var(--ink-2)'}}>{status[t.state]}{t.result && <div style={{color:'var(--ink)'}}>{t.result.title}</div>}{t.error && <div>{t.error}</div>}</div>
            {t.state==='skipped' && <button onClick={()=>act(()=>P.rescreen(t.id))} style={{...btn,padding:'0 8px 8px',fontSize:TY.caption,textDecoration:'underline'}}>Review again</button>}
            {t.state==='discarded' && <button onClick={()=>act(()=>P.restore(t.id))} style={{...btn,padding:'0 8px 8px',fontSize:TY.caption,textDecoration:'underline'}}>Restore to sorting</button>}
          </div>)}
        </div>
        {tasks.length>visibleCount && <button onClick={()=>setVisibleCount(n=>n+60)} style={{...btn,...row,width:'100%'}}>Show more · {tasks.length-visibleCount} remaining</button>}
        {!finished && <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);addFiles(Array.from(e.dataTransfer.files));}}>
          <button disabled={busy} onClick={()=>fileRef.current?.click()} style={{...btn,...row,width:'100%',textAlign:'left',color:'var(--ink-2)'}}>+ Add more photos to this import</button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e=>{const files=Array.from(e.target.files);e.target.value='';addFiles(files);}}/>
        </div>}
      </div>
      <div style={{flexShrink:0,borderTop:line,paddingBottom:'env(safe-area-inset-bottom, 0px)'}}>
        {screenCount>0 && <button disabled={busy} onClick={()=>setReviewing(true)} style={{...btn,width:'100%',minHeight:56}}>Review {plural(screenCount,'photo')}<Arrow dir="right" style={{marginLeft:8}}/></button>}
        {running && <button onClick={()=>act(()=>P.pause(batchId))} disabled={batch?.paused} style={{...btn,width:'100%',minHeight:56}}>{batch?.paused ? 'Finishing current photos…' : 'Pause'}</button>}
        {!running && !screenCount && todo>0 && <button disabled={busy || !window.LocusAI.isReady()} onClick={startOrganizing} style={{...btn,width:'100%',minHeight:56,opacity:window.LocusAI.isReady() ? 1 : 0.4}}>{count('error') ? 'Retry / continue' : `Organize ${plural(count('ready'),'photo')}`}<Arrow dir="right" style={{marginLeft:8}}/></button>}
        {(done+queued)>0 && <button disabled={busy} onClick={finish} style={{...btn,width:'100%',minHeight:56,borderTop:screenCount || todo || running ? line : 'none',background:palette?.bg || 'var(--paper)',color:palette?.fg || 'inherit'}}>Review {plural(done+queued,'result')}<Arrow dir="right" style={{marginLeft:8}}/></button>}
        {finished && <button onClick={backToStart} style={{...btn,width:'100%',minHeight:56,color:'var(--ink-2)'}}>{direct.current ? 'Done' : 'Done · back to Import'}</button>}
      </div>
    </div></div>
  );
}

window.LocusLive = { Shot, SettingsScreen, LiveImportScreen };
