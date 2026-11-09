// Folio — one saved screenshot or note. Same hairline grid as the drawer page, in the drawer's colour.
// Previous / next walk through the drawer in the same order as its list. Also used for step 4 of an import.

// listTag: the tag the drawer's list is filtered by, so Previous / Next stay inside that list.
function DetailScreen({ capture, collection, collections, captures, listTag, onBack, onEdit, onOpenRelated, onOpenTag, onUpdate, onMove, onToast, softEnter, reviewInfo, footer, error, steps }) {
  const soft = softEnter ? 'soft-in' : undefined;
  const cap = capture;
  const col = THEME.colorOf(collection, collections);
  const line = THEME.hairline(col.fg);
  const [note, setNote] = useState(cap.note || '');
  const [noteError,setNoteError]=useState('');
  const [zoom, setZoom] = useState(false);
  useEffect(() => { setNote(cap.note || ''); }, [cap.id]);
  const scrollRef = useRememberedScroll(`capture:${cap.id}`);

  // tint the phone's status bar to match
  useStatusBarTint(col.bg);

  const saveNote = () => {
    if ((cap.note || '') === note) return;
    onUpdate({ ...cap, note });
    setNoteError('');
    onToast(note.trim() ? 'Note saved' : 'Note removed');
  };

  const withSavedNote = fn => () => { try {saveNote();fn();}catch(e){setNoteError(e.message);} };

  const inDrawer = captures.filter(c => c.collection === cap.collection);
  const withListTag = inDrawer.filter(c => (c.tags || []).includes(listTag));
  const siblings = window.LocusStore.sortCaptures(listTag && withListTag.some(c => c.id === cap.id) ? withListTag : inDrawer);
  const pos = siblings.findIndex(c => c.id === cap.id);
  const prev = pos > 0 ? siblings[pos - 1] : null;
  const next = pos >= 0 && pos < siblings.length - 1 ? siblings[pos + 1] : null;
  const isNote = cap.kind === 'note';
  const imageIds = [...new Set([...(cap.imageIds || []),cap.imageId].filter(Boolean))];
  const meta = [cap.source, cap.date].filter(Boolean).join(' · ');

  const cellBtn = { background: 'none', border: 'none', cursor: 'pointer', color: col.fg, fontSize: TY.caption, padding: 0 };
  const navBtn = (enabled) => ({ ...cellBtn, flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px',
    opacity: enabled ? 1 : 0.35, cursor: enabled ? 'pointer' : 'default' });

  return (
    <div className="page" style={{ background: col.bg, color: col.fg }}>
      <div className="content">
        <StatusBar/>
        <div style={headerBar(line)}>
          <button onClick={withSavedNote(onBack)} aria-label="Back" style={{ ...cellBtn, width: 56, borderRight: line, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Arrow size={20}/>
          </button>
          <div style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', fontSize: TY.caption,
            letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.4 }}>
            <span className={soft} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{collection.name}{reviewInfo ? ` · ${reviewInfo.index}/${reviewInfo.total}` : pos >= 0 ? ` · ${pos + 1}/${siblings.length}` : ''}</span>
            {onMove && <Picker label="Move to drawer" value={collection.id} options={collections.map(c => ({ value: c.id, label: c.name }))}
              onChange={id => { try { onMove(id, note); setNoteError(''); } catch (err) { setNoteError(err.message); } }}/>}
          </div>
          <button onClick={withSavedNote(onEdit)} style={{ ...cellBtn, borderLeft: line, padding: '0 18px' }}>Edit</button>
        </div>
        {steps}

        {(error || noteError) && <div role="alert" style={{padding:'12px 18px',borderBottom:line,fontSize:TY.caption,lineHeight:1.5}}>{error || noteError}</div>}
        <div className={soft ? 'scroll-y soft-in' : 'scroll-y'} ref={scrollRef} style={{ flex: 1 }}>
          <div style={{ padding: '24px 18px 20px', fontSize: TY.title, lineHeight: 1.2, letterSpacing: '-0.015em', borderBottom: line }}>{cap.title}</div>

          {isNote && (
            <div style={{ padding: '18px', borderBottom: line, fontSize: TY.body, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{cap.text || cap.summary}</div>
          )}
          {!isNote && (cap.summary || cap.details?.length > 0) && (
            <div style={{ padding: '18px', borderBottom: line }}>
              {cap.summary && <div style={{ display: 'flex', gap: 12, fontSize: TY.body, lineHeight: 1.55 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: col.fg, flexShrink: 0, marginTop: 8 }}/>
                <span>{cap.summary}</span>
              </div>}
              {/* key facts the AI pulled out, indented under the summary: grey label, medium value; lists become sub-bullets */}
              {cap.details?.length > 0 && <div style={{ marginTop: cap.summary ? 10 : 0, marginLeft: cap.summary ? 19 : 0, fontSize: TY.label, lineHeight: 1.6, overflowWrap: 'anywhere' }}>
                {cap.details.map((d, i) => {
                  const items = String(d.value).split('\n').map(x => x.trim()).filter(Boolean);
                  const gap = i > 0 ? 8 : 0;
                  return items.length > 1 ? (
                    <div key={i} style={{ marginTop: gap }}>
                      <span style={{ opacity: 0.65 }}>{d.label}</span>
                      {items.map((x, j) => <div key={j} style={{ display: 'flex', gap: 9, paddingLeft: 2 }}>
                        <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', flexShrink: 0, marginTop: 10, opacity: 0.65 }}/>
                        <span>{x}</span>
                      </div>)}
                    </div>
                  ) : (
                    // label and value share a row; a value too long for it wraps under its own first word.
                    // Long values stay regular weight, so a paragraph is never all bold.
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: gap ? (items[0]?.length > 20 ? gap : 2) : 0 }}>
                      <span style={{ opacity: 0.65, flexShrink: 0, maxWidth: '40%' }}>{d.label}</span>
                      <span style={{ flex: 1, minWidth: 0, fontWeight: items[0]?.length > 20 ? 400 : 500 }}>{items[0]}</span>
                    </div>
                  );
                })}
              </div>}
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
