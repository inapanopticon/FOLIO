// Folio — Write: a capture typed by hand

let noteImageCount = 0;
const newId = (p) => `${p}_${Date.now().toString(36)}_${(noteImageCount++).toString(36)}`;

// =============== WRITE (a capture typed by hand) ===============
function WriteScreen({ collections, defaultCollectionId, onCancel, onSave }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [images, setImages] = useState([]);
  const [readingImages, setReadingImages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const addImages = async files => {
    setError(''); setReadingImages(true);
    try {
      for (const file of Array.from(files).filter(f=>f.type.startsWith('image/'))) {
        const dataUrl = await window.LocusImages.resize(file);
        setImages(all=>[...all,{ id:newId('note-image'), name:file.name, dataUrl }]);
      }
    } catch(e) { setError('This image could not be opened. Try another image.'); }
    finally { setReadingImages(false); }
  };
  const pendingTags = () => [...new Set([...tags, newTag.trim()].filter(Boolean))];
  const addTag = () => { setTags(pendingTags()); setNewTag(''); };
  const titleCount = THEME.titleLength(title);
  const titleTooLong = titleCount > THEME.TITLE_MAX;
  const [collId, setCollId] = useState(defaultCollectionId || collections[0]?.id);
  const existingTags = collections.find(c=>c.id===collId)?.tags || [];
  // Typed tags join the same grid and look and act like the drawer's own: tap to select, tap again to remove.
  const gridTags = [...existingTags, ...tags.filter(t=>!existingTags.includes(t))];
  const tagRows = Array.from({length:Math.ceil(gridTags.length/4)},(_,i)=>gridTags.slice(i*4,i*4+4));
  const ref = useRef();
  const titleRef = useRef();
  useEffect(() => {
    const timer = setTimeout(() => ref.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const el = titleRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [title]);
  const can = text.trim().length > 0 && !!collId && !titleTooLong && !readingImages && !saving;
  const save = async () => {
    if (!can) return;
    setError(''); setSaving(true);
    try { await onSave({ title:title.trim(), text:text.trim(), collection:collId, tags:pendingTags(), images }); }
    catch(e) { setError(e.message || 'Could not save. Please try again.'); setSaving(false); }
  };
  const col = THEME.colorOf(collections.find(c => c.id === collId), collections);
  const label = { display: 'block', fontSize: TY.caption, letterSpacing: '0.12em', marginBottom: 12, color: 'var(--ink-2)' };
  const headingRow = { ...label, margin: 0, padding: '14px 18px', background: 'var(--band)', color: 'var(--ink)' };
  const input = { width: '100%', minWidth: 0, background: 'transparent', border: 'none', borderRadius: 0, padding: 0, color: 'inherit', fontFamily: 'var(--sans)', fontSize: TY.body, lineHeight: 1.6, resize: 'none' };
  const nav = { width: 80, background: 'transparent', border: 'none', borderRadius: 0, color: 'inherit', fontSize: TY.caption, fontWeight: 400, cursor: 'pointer' };

  return (
    <div className="page write-screen">
      <div className="content">
        <StatusBar/>
        <div style={headerBar(HAIR)}>
          <button onClick={onCancel} style={{ ...nav, borderRight: HAIR }}>Cancel</button>
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', fontSize: TY.caption, letterSpacing: '0.12em' }}>WRITE</div>
          <button disabled={!can} onClick={save}
            style={{ ...nav, borderLeft: HAIR, background: col.bg, color: col.fg, cursor: can ? 'pointer' : 'default' }}><span style={{ opacity: can ? 1 : 0.4 }}>{saving ? 'Saving…' : 'Save'}</span></button>
        </div>
        <div className="scroll-y" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '22px 18px 20px', borderBottom: HAIR, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <label htmlFor="write-title" style={{ ...label, marginBottom: 0 }}>TITLE</label>
              <span id="write-title-count" style={{ fontSize: TY.caption, color: 'var(--ink-2)', lineHeight: 1.5 }}>{titleCount}/{THEME.TITLE_MAX}</span>
            </div>
            <textarea id="write-title" aria-invalid={titleTooLong} aria-describedby="write-title-count" ref={titleRef} rows={1} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Add a title…"
              style={{ ...input, display: 'block', fontSize: TY.title, lineHeight: 1.3, letterSpacing: '-0.015em', overflow: 'hidden' }}/>
            {titleTooLong && <div role="status" style={{ fontSize: TY.caption, lineHeight: 1.5, marginTop: 8 }}>Keep the title within {THEME.TITLE_MAX} characters.</div>}
          </div>
          <div style={{ flex: 1, flexShrink: 0, minHeight: 240, padding: '18px', display: 'flex', flexDirection: 'column' }}>
            <label htmlFor="write-text" style={label}>NOTE</label>
            <textarea id="write-text" ref={ref} value={text} onChange={e=>setText(e.target.value)} placeholder="Something worth keeping…"
              style={{ ...input, flex: 1, minHeight: 180 }}/>
          </div>
          <div style={{ flexShrink: 0, borderTop: HAIR }}>
            <div style={headingRow}>IMAGES</div>
            {images.length>0 && <div style={{ display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',borderTop:HAIR }}>
              {images.map(image=><div key={image.id} style={{ position:'relative',borderRight:HAIR }}>
                <img src={image.dataUrl} alt={image.name} style={{ width:'100%',aspectRatio:'3 / 4',objectFit:'cover',objectPosition:'top',display:'block' }}/>
                <button aria-label={`Remove image ${image.name}`} onClick={()=>setImages(all=>all.filter(x=>x.id!==image.id))} style={{ position:'absolute',top:0,right:0,width:44,height:44,border:'none',borderLeft:HAIR,borderBottom:HAIR,background:'var(--cream)',fontSize:TY.body,cursor:'pointer' }}>×</button>
              </div>)}
            </div>}
            <button disabled={readingImages || saving} onClick={()=>fileRef.current?.click()} style={{ ...nav,width:'100%',minHeight:56,padding:'16px 18px',borderTop:HAIR,display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:TY.body }}><span>{readingImages ? 'Adding images…' : 'Add images'}</span><span>+</span></button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e=>{const files=Array.from(e.target.files);e.target.value='';addImages(files);}}/>
          </div>
          <div style={{ flexShrink: 0, borderTop: HAIR }}>
            <label htmlFor="write-tag" style={headingRow}>TAGS</label>
            {tagRows.map((row,i)=><div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', borderTop: HAIR }}>
              {row.map(t=><button key={t} aria-pressed={tags.includes(t)} onClick={()=>setTags(all=>all.includes(t) ? all.filter(x=>x!==t) : [...all,t])}
                style={{ ...nav, width: '100%', minHeight: 52, padding: '14px 8px', fontSize: TY.label, lineHeight: 1.5, overflowWrap: 'anywhere', borderRight: HAIR, background: tags.includes(t) ? col.bg : 'transparent', color: tags.includes(t) ? col.fg : 'inherit' }}>{t}</button>)}
              {Array.from({length:4-row.length},(_,j)=><div key={`empty-${j}`} aria-hidden="true" style={{ borderRight: HAIR }}/>) }
            </div>)}
            <div style={{ display: 'flex', borderTop: HAIR }}>
              <input id="write-tag" value={newTag} onChange={e=>setNewTag(e.target.value)} onBlur={addTag} placeholder="Add a tag…" onKeyDown={e=>{if(isSubmitEnter(e)){e.preventDefault();addTag();}}} style={{ ...input, flex: 1, minWidth: 0, padding: '14px 18px', outline: 'none' }}/>
              <button aria-label="Add tag" onClick={addTag} style={{ ...nav, width: 56, minHeight: 54, flexShrink: 0, borderLeft: HAIR, fontSize: TY.body }}>+</button>
            </div>
          </div>
          {error && <div role="status" style={{ padding:'14px 18px',borderTop:HAIR,fontSize:TY.caption,lineHeight:1.5 }}>{error}</div>}
        </div>
        <div style={{ flexShrink: 0, borderTop: HAIR, background: col.bg, color: col.fg, padding: '16px 18px calc(env(safe-area-inset-bottom, 0px) + 18px)' }}>
          <label htmlFor="write-drawer" style={{ ...label, color: 'inherit', opacity: 0.8, marginBottom: 6 }}>PUT IN</label>
          <select id="write-drawer" value={collId || ''} onChange={e=>setCollId(e.target.value)} style={{ ...input, display: 'block', minHeight: 44, cursor: 'pointer' }}>
            {!collections.length && <option value="">No drawers yet</option>}
            {collections.map(c=><option key={c.id} value={c.id} style={{ background: 'var(--cream)', color: 'var(--ink)' }}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <style>{`.write-screen input::placeholder { font-size: ${TY.caption}px; color: var(--ink-2); opacity: 0.65; }
        .write-screen textarea::placeholder { color: var(--ink-2); opacity: 0.65; }
        .write-screen textarea, .write-screen select { outline: none; }`}</style>
    </div>
  );
}
