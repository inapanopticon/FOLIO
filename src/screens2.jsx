// Locus — Detail, Edit, Search

const { useState: useState2, useEffect: useEffect2, useRef: useRef2, useMemo: useMemo2 } = React;
const THEME2 = window.LocusTheme;

function TopBar({ left, right, title }) {
  return (
    <div style={{ padding:'6px 14px 4px', display:'flex', alignItems:'center', justifyContent:'space-between', minHeight:44 }}>
      <div style={{ flex:1, display:'flex' }}>{left}</div>
      {title && <div className="t-eyebrow" style={{ flex:2, textAlign:'center' }}>{title}</div>}
      <div style={{ flex:1, display:'flex', justifyContent:'flex-end' }}>{right}</div>
    </div>
  );
}

const BackBtn = ({ onClick, label='Back' }) => (
  <button className="btn-text" onClick={onClick} style={{ fontWeight:400 }}><Arrow style={{marginRight:8}}/>{label}</button>
);

// =============== DETAIL ===============
// Same hairline grid as the drawer page, in the drawer's colour. Three type sizes: title 28, body 17, supporting text 13.
// Previous / next walk through the drawer in the same order as its list.
const D_BIG = TY.title, D_TEXT = TY.caption;

function DetailScreen({ capture, collection, collections, captures, onBack, onEdit, onOpenRelated, onOpenTag, onUpdate, onToast, softEnter, reviewInfo, footer, error, steps }) {
  const soft = softEnter ? 'soft-in' : undefined;
  const cap = capture;
  const col = THEME2.colorOf(collection, collections);
  const line = `1px solid color-mix(in srgb, ${col.fg} 28%, transparent)`;
  const [note, setNote] = useState2(cap.note || '');
  const [noteError,setNoteError]=useState2('');
  const [zoom, setZoom] = useState2(false);
  useEffect2(() => { setNote(cap.note || ''); }, [cap.id]);
  const scrollRef = useRememberedScroll(`capture:${cap.id}`);

  // tint the phone's status bar to match
  useEffect2(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute('content');
    meta?.setAttribute('content', col.bg);
    return () => { if (meta && prev) meta.setAttribute('content', prev); };
  }, [col.bg]);

  const saveNote = () => {
    if ((cap.note || '') === note) return;
    onUpdate({ ...cap, note });
    setNoteError('');
    onToast(note.trim() ? 'Note saved' : 'Note removed');
  };

  const withSavedNote = fn => () => { try {saveNote();fn();}catch(e){setNoteError(e.message);} };

  const siblings = captures
    .filter(c => c.collection === cap.collection)
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  const pos = siblings.findIndex(c => c.id === cap.id);
  const prev = pos > 0 ? siblings[pos - 1] : null;
  const next = pos >= 0 && pos < siblings.length - 1 ? siblings[pos + 1] : null;
  const isNote = !cap.imageId && cap.kind === 'note';
  const imageIds = [...new Set([...(cap.imageIds || []),cap.imageId].filter(Boolean))];
  const meta = [cap.source, cap.date].filter(Boolean).join(' · ');

  const cellBtn = { background: 'none', border: 'none', cursor: 'pointer', color: col.fg, fontSize: D_TEXT, padding: 0 };
  const navBtn = (enabled) => ({ ...cellBtn, flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px',
    opacity: enabled ? 1 : 0.35, cursor: enabled ? 'pointer' : 'default' });

  return (
    <div className="page" style={{ background: col.bg, color: col.fg }}>
      <div className="content">
        <StatusBar/>
        <div style={{ display: 'flex', alignItems: 'stretch', height: 52, borderTop: line, borderBottom: line, flexShrink: 0 }}>
          <button onClick={withSavedNote(onBack)} aria-label="Back" style={{ ...cellBtn, width: 56, borderRight: line, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Arrow size={20}/>
          </button>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: D_TEXT,
            letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.4 }}>
            <span className={soft}>{collection.name}{reviewInfo ? ` · ${reviewInfo.index}/${reviewInfo.total}` : pos >= 0 ? ` · ${pos + 1}/${siblings.length}` : ''}</span>
          </div>
          <button onClick={withSavedNote(onEdit)} style={{ ...cellBtn, borderLeft: line, padding: '0 18px' }}>Edit</button>
        </div>
        {steps}

        {(error || noteError) && <div role="alert" style={{padding:'12px 18px',borderBottom:line,fontSize:TY.caption,lineHeight:1.5}}>{error || noteError}</div>}
        <div className={soft ? 'scroll-y soft-in' : 'scroll-y'} ref={scrollRef} style={{ flex: 1 }}>
          <div style={{ padding: '24px 18px 20px', fontSize: D_BIG, lineHeight: 1.2, letterSpacing: '-0.015em', borderBottom: line }}>{cap.title}</div>

          {isNote && (
            <div style={{ padding: '18px', borderBottom: line, fontSize: TY.body, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{cap.text || cap.summary}</div>
          )}
          {!isNote && cap.summary && (
            <div style={{ padding: '18px', borderBottom: line, display: 'flex', gap: 12, fontSize: TY.body, lineHeight: 1.55 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: col.fg, flexShrink: 0, marginTop: 8 }}/>
              <span>{cap.summary}</span>
            </div>
          )}

          {(meta || cap.tags?.length > 0) && (
            <div style={{ padding: '14px 18px', borderBottom: line, fontSize: TY.body, lineHeight: 1.6, opacity: 0.8 }}>
              {cap.tags?.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 10 }}>
                {cap.tags.map((tag) => <button key={tag} onClick={withSavedNote(() => onOpenTag(tag))} style={{ background: 'none', border: 'none', padding: '4px 0', color: 'inherit', fontSize: TY.label, fontWeight: 400, lineHeight: 1.6, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>{tag}</button>)}
              </div>}
              {meta && <div style={{ fontSize: TY.label, marginTop: cap.tags?.length ? 6 : 0 }}>{meta}</div>}
            </div>
          )}

          <div style={{ padding: '14px 18px 18px', borderBottom: line }}>
            <div style={{ fontSize: TY.body, marginBottom: 6 }}>My note</div>
            <textarea value={note} onChange={(e)=>setNote(e.target.value)} onBlur={()=>{try{saveNote();}catch(e){setNoteError(e.message);}}}
              placeholder="Add a note…"
              rows={Math.max(2, note.split('\n').length)}
              className="note-in"
              style={{ width: '100%', resize: 'none', border: 'none', background: 'transparent', outline: 'none', padding: 0,
                fontFamily: 'var(--sans)', fontSize: TY.body, lineHeight: 1.6, color: col.fg }}/>
          </div>
          {/* the screenshot goes last: they are usually long, and the summary should be seen first */}
          {imageIds.map(id=><div key={id} style={{ padding:14 }}>
            <button aria-label="View image" onClick={()=>setZoom(id)} style={{ display:'block',width:'100%',padding:0,border:'none',background:'transparent',cursor:'zoom-in' }}>
              <Shot imageId={id} glyph={cap.glyph} fit="natural" style={{ background:'var(--cream)' }}/>
            </button>
          </div>)}
          {!isNote && !imageIds.length && <div style={{ padding:14 }}><Shot glyph={cap.glyph} fontSize={44} style={{ minHeight:200,borderRadius:4,background:'var(--cream)' }}/></div>}
          <div style={{ height: 12 }}/>
        </div>

        <div className="safe-bottom" style={{ display: 'flex', alignItems: 'stretch', borderTop: line, paddingBottom: 'env(safe-area-inset-bottom, 0px)', flexShrink: 0 }}>
          {footer ? (typeof footer==='function' ? footer({saveNote}) : footer) : <>
          <button disabled={!prev} onClick={withSavedNote(() => prev && onOpenRelated(prev.id, 'back'))} style={{ ...navBtn(!!prev), height: 56 }}><Arrow style={{marginRight:8}}/>Previous</button>
          <button disabled={!next} onClick={withSavedNote(() => next && onOpenRelated(next.id))} style={{ ...navBtn(!!next), height: 56, borderLeft: line, justifyContent: 'flex-end' }}>Next<Arrow dir="right" style={{marginLeft:8}}/></button>
          </>}
        </div>
      </div>
      <style>{`.note-in::placeholder { font-size: ${TY.caption}px; color: ${col.fg}; opacity: 0.8; }`}</style>
      {zoom && (
        <div onClick={()=>setZoom(false)} style={{ position:'absolute', inset:0, zIndex:400, background:'rgba(29,28,26,0.94)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:12, animation:'pgUpIn 0.2s ease both' }}>
          <Shot imageId={zoom} glyph={cap.glyph} fit="contain" style={{ width:'100%', height:'100%', background:'transparent' }}/>
        </div>
      )}
    </div>
  );
}

// =============== EDIT ===============
function EditScreen({ capture, collection, collections, onCancel, onSave, onDelete }) {
  const [title, setTitle] = useState2(capture.title);
  const [summary, setSummary] = useState2(capture.kind === 'note' ? (capture.text || capture.summary) : capture.summary);
  const [tags, setTags] = useState2(capture.tags || []);
  const [collId, setCollId] = useState2(capture.collection);
  const [newTag, setNewTag] = useState2('');
  const isNote = capture.kind === 'note';

  const titleCount = THEME2.titleLength(title);
  const titleTooLong = titleCount > THEME2.TITLE_MAX;
  const titleBlocked = titleTooLong && title !== capture.title;
  const save = () => !titleBlocked && onSave({
    ...capture, title, tags: [...new Set([...tags, newTag.trim()].filter(Boolean))], collection: collId,
    ...(isNote ? { text: summary, summary } : { summary }),
  });

  const selected = collections.find(c => c.id === collId) || collection;
  const col = THEME2.colorOf(selected, collections);
  const line = `1px solid color-mix(in srgb, ${col.fg} 28%, transparent)`;
  useEffect2(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute('content');
    meta?.setAttribute('content', col.bg);
    return () => { if (meta && previous) meta.setAttribute('content', previous); };
  }, [col.bg]);
  const titleRef = useRef2(null);
  const summaryRef = useRef2(null);
  useEffect2(() => {
    [titleRef.current, summaryRef.current].forEach(el => {
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    });
  }, [title, summary]);
  const labelStyle = { display: 'block', fontSize: TY.caption, letterSpacing: '0.12em', marginBottom: 12, color: col.fg, opacity: 0.8 };
  const sectionStyle = { padding: '18px', borderBottom: line };
  const fieldStyle = { display: 'block', width: '100%', border: 'none', borderRadius: 0, background: 'transparent', color: 'inherit', padding: 0, fontSize: TY.body, lineHeight: 1.55, resize: 'none' };
  const buttonStyle = { background: 'none', border: 'none', borderRadius: 0, color: 'inherit', fontSize: TY.caption, cursor: 'pointer' };
  const addTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) setTags(all => [...all, t]);
    setNewTag('');
  };

  return (
    <div className="page edit-screen" style={{ background: col.bg, color: col.fg }}>
      <div className="content">
        <StatusBar/>
        <div style={{ display: 'flex', height: 52, flexShrink: 0, borderTop: line, borderBottom: line }}>
          <button onClick={onCancel} style={{ ...buttonStyle, width: 80, borderRight: line }}>Cancel</button>
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', fontSize: TY.caption, letterSpacing: '0.12em' }}>EDIT</div>
          <button disabled={titleBlocked} onClick={save} style={{ ...buttonStyle, width: 80, borderLeft: line, background: col.bg, color: col.fg }}><span style={{ opacity: titleBlocked ? 0.4 : 1 }}>Save</span></button>
        </div>
        <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
          <div style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <label htmlFor="edit-title" style={{ ...labelStyle, marginBottom: 0 }}>TITLE</label>
              <span id="edit-title-count" style={{ fontSize: TY.caption, lineHeight: 1.5, opacity: 0.8 }}>{titleCount}/{THEME2.TITLE_MAX}</span>
            </div>
            <textarea ref={titleRef} id="edit-title" aria-invalid={titleBlocked} aria-describedby="edit-title-count" rows={1} value={title} onChange={e=>setTitle(e.target.value)} style={{ ...fieldStyle, fontSize: TY.title, lineHeight: 1.3, letterSpacing: '-0.015em', overflow: 'hidden' }}/>
            {titleTooLong && <div role="status" style={{ fontSize: TY.caption, lineHeight: 1.5, marginTop: 8 }}>{titleBlocked ? `Keep the title within ${THEME2.TITLE_MAX} characters.` : 'Existing title kept. Shorten it when you edit the title.'}</div>}
          </div>
          <div style={{ ...sectionStyle, background: col.bg, color: col.fg }}>
            <label htmlFor="edit-drawer" style={{ ...labelStyle, color: 'inherit' }}>DRAWER</label>
            <select id="edit-drawer" value={collId} onChange={e=>setCollId(e.target.value)} style={{ ...fieldStyle, minHeight: 44, cursor: 'pointer' }}>
              {collections.map(c=><option key={c.id} value={c.id} style={{ background: 'var(--cream)', color: 'var(--ink)' }}>{c.name}</option>)}
            </select>
          </div>
          <div style={sectionStyle}>
            <label htmlFor="edit-summary" style={labelStyle}>{isNote ? 'TEXT' : 'SUMMARY'}</label>
            <textarea ref={summaryRef} id="edit-summary" rows={3} value={summary} onChange={e=>setSummary(e.target.value)} style={fieldStyle}/>
          </div>
          <div style={{ paddingTop: 18, borderBottom: line }}>
            <label htmlFor="edit-new-tag" style={{ ...labelStyle, marginLeft: 18 }}>TAGS</label>
            <TagGrid tags={tags} line={line} onRemove={t=>setTags(all=>all.filter(x=>x!==t))}/>
            <div style={{ display: 'flex', alignItems: 'stretch', borderTop: line }}>
              <input id="edit-new-tag" placeholder="Add a tag…" value={newTag} onChange={e=>setNewTag(e.target.value)} onBlur={addTag}
                onKeyDown={e=>{ if(e.key==='Enter'){e.preventDefault();addTag();} }} style={{ ...fieldStyle, flex: 1, minWidth: 0, padding: '14px 18px' }}/>
              <button onClick={addTag} aria-label="Add tag" style={{ ...buttonStyle, width: 56, minHeight: 54, borderLeft: line, fontSize: TY.body }}>+</button>
            </div>
          </div>
          {(capture.source || capture.date) && <div style={sectionStyle}>
            <div style={labelStyle}>SAVED</div>
            <div style={{ fontSize: TY.caption, lineHeight: 1.6 }}>{[capture.source,capture.date].filter(Boolean).join(' · ')}</div>
          </div>}
          <div style={{ height: 24 }}/>
        </div>
        {onDelete && <div style={{ flexShrink: 0, borderTop: line, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <button onClick={onDelete} style={{ ...buttonStyle, display: 'block', textAlign: 'center', width: '100%', minHeight: 56, padding: '18px' }}>DELETE CAPTURE</button>
        </div>}
      </div>
      <style>{`.edit-screen input::placeholder { font-size: ${TY.caption}px; color: ${col.fg}; opacity: 0.8; }`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div className="t-eyebrow" style={{ marginBottom:8 }}>{label}</div>
      {children}
    </div>
  );
}

// =============== SEARCH ===============
function SearchScreen({ collections, captures, onCancel, onOpenCapture, initialQuery = '', initialTag = null, scopeId = null, onSearchChange }) {
  const scope = collections.find(c=>c.id===scopeId);
  const [q, setQ] = useState2(initialQuery);
  const [tag, setTag] = useState2(scopeId ? initialTag : null);
  const inputRef = useRef2();
  const change = (patch) => {
    const next = { query: q, tag, ...patch };
    setQ(next.query); setTag(next.tag);
    onSearchChange?.(next);
  };
  useEffect2(()=>{ inputRef.current?.focus(); },[]);
  const palette = scope ? THEME2.colorOf(scope,collections) : null;
  const bg = palette ? palette.bg : 'var(--cream)';
  const fg = palette ? palette.fg : 'var(--ink)';
  const line = palette ? `1px solid color-mix(in srgb, ${fg} 28%, transparent)` : '1px solid var(--line)';
  useEffect2(()=>{
    if (!palette) return;
    const meta = document.querySelector('meta[name="theme-color"]');
    const previous = meta?.getAttribute('content');
    meta?.setAttribute('content',palette.bg);
    return ()=>{ if(meta && previous) meta.setAttribute('content',previous); };
  },[bg]);

  const scoped = useMemo2(()=>scopeId ? captures.filter(c=>c.collection===scopeId) : captures,[captures,scopeId]);
  const results = useMemo2(()=>{
    if (!q.trim() && !scopeId) return null;
    const lq = q.trim().toLowerCase();
    const has = value => (value || '').toLowerCase().includes(lq);
    const hits = scoped.filter(c=>(!tag || (c.tags||[]).includes(tag)) && (!lq || has(c.title) || (c.tags||[]).some(has) || has(c.summary) || has(c.text) || has(c.note)));
    const grouped = {};
    hits.forEach(c=>{ (grouped[c.collection] = grouped[c.collection] || []).push(c); });
    return { hits, grouped };
  },[q,tag,scoped,scopeId]);
  const tagCounts = {};
  if(scopeId) scoped.forEach(c=>(c.tags||[]).forEach(t=>{tagCounts[t]=(tagCounts[t]||0)+1;}));
  const suggestions = scope && Array.isArray(scope.tags) ? [...scope.tags] : Object.keys(tagCounts);
  if(tag && !suggestions.includes(tag)) suggestions.push(tag);
  const hl = str => {
    if (!q.trim() || !str) return str;
    const re = new RegExp(`(${q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'ig');
    return String(str).split(re).map((part,i)=>i%2 ? <span key={i} className="hl">{part}</span> : part);
  };
  const button = { background: 'transparent', border: 'none', borderRadius: 0, color: 'inherit', cursor: 'pointer', fontWeight: 400 };
  const heading = { padding: '14px 18px', borderBottom: line, fontSize: TY.caption, letterSpacing: '0.12em', lineHeight: 1.5 };

  return (
    <div className="page search-screen" style={{ background: bg, color: fg }}>
      <div className="content">
        <StatusBar/>
        <div style={{ display: 'flex', height: 52, flexShrink: 0, borderTop: line, borderBottom: line }}>
          <button aria-label="Back" onClick={onCancel} style={{ ...button, width: 56, flexShrink: 0, borderRight: line, display: 'grid', placeItems: 'center' }}>
            <Arrow size={20}/>
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: TY.caption, letterSpacing: '0.12em' }}>SEARCH</div>
        </div>
        {scope && <div style={{ padding: '22px 18px', borderBottom: line, fontSize: TY.title, lineHeight: 1.3, letterSpacing: '-0.015em' }}>{scope.name}</div>}
        <div style={{ display: 'flex', minHeight: 64, borderBottom: line, flexShrink: 0 }}>
          <input ref={inputRef} aria-label={scope ? 'Search this drawer' : 'Search your archive'} value={q} onChange={e=>change({query:e.target.value})} placeholder={scope ? 'Search this drawer' : 'Search your archive'}
            style={{ flex: 1, minWidth: 0, width: '100%', padding: '18px', border: 'none', borderRadius: 0, outline: 'none', background: 'transparent', color: 'inherit', fontSize: TY.body, lineHeight: 1.5 }}/>
          {q && <button aria-label="Clear search" onClick={()=>{change({query:''});inputRef.current?.focus();}} style={{ ...button, width: 56, flexShrink: 0, borderLeft: line, fontSize: TY.body }}>×</button>}
        </div>
        <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
          {scope && suggestions.length > 0 && <>
            <div style={{ ...heading, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>TAGS</span>{tag && <button onClick={()=>change({tag:null})} style={{ ...button, fontSize: TY.caption }}>Clear tag</button>}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
              {suggestions.map(t=><button key={t} aria-pressed={tag===t} onClick={()=>change({tag:tag===t ? null : t})} style={{ ...button, minHeight: 56, padding: '16px 10px', borderRight: line, borderBottom: line, textAlign: 'center', fontSize: TY.label, lineHeight: 1.5, overflowWrap: 'anywhere', background: tag===t ? fg : 'transparent', color: tag===t ? bg : 'inherit' }}>{t}</button>)}
              {Array.from({length:(4-suggestions.length%4)%4},(_,i)=><div key={`empty-${i}`} aria-hidden="true" style={{ borderRight: line, borderBottom: line }}/>) }
            </div>
          </>}
          {results && <div aria-live="polite" style={heading}>{results.hits.length} RESULT{results.hits.length===1 ? '' : 'S'}</div>}
          {results && results.hits.length===0 && <div style={{ padding: '24px 18px', borderBottom: line }}>
            <div style={{ fontSize: TY.body, lineHeight: 1.5 }}>No matches.</div>
            <div style={{ fontSize: TY.caption, opacity: 0.8, lineHeight: 1.6, marginTop: 8 }}>{tag ? 'Try another word, or clear the tag.' : 'Try another word.'}</div>
          </div>}
          {results && Object.entries(results.grouped).map(([cid,hits])=>{
            const coll = collections.find(c=>c.id===cid);
            return <div key={cid}>
              {!scope && <div style={{ ...heading, display: 'flex', justifyContent: 'space-between', gap: 12 }}><span>{(coll?.name || 'Unsorted').toUpperCase()}</span><span>{hits.length}</span></div>}
              {hits.map((c,i)=><button key={c.id} onClick={()=>onOpenCapture(c.id)} style={{ ...button, textAlign: 'left', display: 'flex', alignItems: 'stretch', width: '100%', borderBottom: line, minHeight: 84 }}>
                <span style={{ width: 44, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: TY.caption, opacity: 0.8 }}>{i+1}</span>
                <span style={{ flex: 1, minWidth: 0, padding: '16px 12px 16px 6px' }}>
                  <span style={{ display: 'block', fontSize: TY.body, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{hl(c.title)}</span>
                  <span style={{ display: 'block', fontSize: TY.label, lineHeight: 1.5, marginTop: 6, opacity: 0.8, overflowWrap: 'anywhere' }}>{(c.tags||[]).slice(0,3).map((t,j)=><React.Fragment key={j}>{j>0 ? ' · ' : ''}{hl(t)}</React.Fragment>)}</span>
                </span>
                <Shot imageId={c.imageId} glyph={c.glyph} fontSize={TY.body} style={{ width: 64, height: 64, flexShrink: 0, borderLeft: line, background: 'transparent' }}/>
              </button>)}
            </div>;
          })}
          <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}/>
        </div>
      </div>
      <style>{`.search-screen input::placeholder { color: inherit; opacity: 0.65; }
        .search-screen .hl { background: transparent; padding: 0; border-radius: 0; text-decoration: underline; text-underline-offset: 3px; }`}</style>
    </div>
  );
}

window.LocusScreens2 = { DetailScreen, EditScreen, SearchScreen, TopBar, BackBtn, Field };
