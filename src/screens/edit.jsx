// Folio — edit a capture

function EditScreen({ capture, collection, collections, onCancel, onSave, onDelete }) {
  const [title, setTitle] = useState(capture.title);
  const [summary, setSummary] = useState(capture.kind === 'note' ? (capture.text || capture.summary) : capture.summary);
  const [details, setDetails] = useState(capture.details || []);
  const [tags, setTags] = useState(capture.tags || []);
  const [collId, setCollId] = useState(capture.collection);
  const [newTag, setNewTag] = useState('');
  const isNote = capture.kind === 'note';

  const titleCount = THEME.titleLength(title);
  const titleTooLong = titleCount > THEME.TITLE_MAX;
  const titleEmpty = !title.trim();
  const titleBlocked = titleEmpty || (titleTooLong && title !== capture.title);
  const save = () => !titleBlocked && onSave({
    ...capture, title, tags: [...new Set([...tags, newTag.trim()].filter(Boolean))], collection: collId,
    ...(isNote ? { text: summary, summary } : {
      summary,
      details: details.map(d => ({ label: String(d.label || '').trim(), value: String(d.value || '').trim() })).filter(d => d.label && d.value),
    }),
  });

  const selected = collections.find(c => c.id === collId) || collection;
  const col = THEME.colorOf(selected, collections);
  const line = THEME.hairline(col.fg);
  useStatusBarTint(col.bg);
  const titleRef = useRef(null);
  const summaryRef = useRef(null);
  const detailRefs = useRef([]);
  useEffect(() => {
    [titleRef.current, summaryRef.current, ...detailRefs.current].forEach(el => {
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    });
  }, [title, summary, details]);
  const labelStyle = { display: 'block', fontSize: TY.caption, letterSpacing: '0.12em', marginBottom: 12, color: col.fg, opacity: 0.8 };
  const sectionStyle = { padding: '18px', borderBottom: line };
  const fieldStyle = { display: 'block', width: '100%', border: 'none', borderRadius: 0, background: 'transparent', color: 'inherit', padding: 0, fontSize: TY.body, lineHeight: 1.55, resize: 'none' };
  const buttonStyle = { background: 'none', border: 'none', borderRadius: 0, color: 'inherit', fontSize: TY.caption, cursor: 'pointer' };
  const addTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) setTags(all => [...all, t]);
    setNewTag('');
  };
  const updateDetail = (index, patch) => setDetails(all => all.map((detail, i) => i === index ? { ...detail, ...patch } : detail));
  const removeDetail = index => setDetails(all => all.filter((_, i) => i !== index));

  return (
    <div className="page edit-screen" style={{ background: col.bg, color: col.fg }}>
      <div className="content">
        <StatusBar/>
        <div style={headerBar(line)}>
          <button onClick={onCancel} style={{ ...buttonStyle, width: 80, borderRight: line }}>Cancel</button>
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', fontSize: TY.caption, letterSpacing: '0.12em' }}>EDIT</div>
          <button disabled={titleBlocked} onClick={save} style={{ ...buttonStyle, width: 80, borderLeft: line, background: col.bg, color: col.fg }}><span style={{ opacity: titleBlocked ? 0.4 : 1 }}>Save</span></button>
        </div>
        <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
          <div style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <label htmlFor="edit-title" style={{ ...labelStyle, marginBottom: 0 }}>TITLE</label>
              <span id="edit-title-count" style={{ fontSize: TY.caption, lineHeight: 1.5, opacity: 0.8 }}>{titleCount}/{THEME.TITLE_MAX}</span>
            </div>
            <textarea ref={titleRef} id="edit-title" aria-invalid={titleBlocked} aria-describedby="edit-title-count" rows={1} value={title} onChange={e=>setTitle(e.target.value)} style={{ ...fieldStyle, fontSize: TY.title, lineHeight: 1.3, letterSpacing: '-0.015em', overflow: 'hidden' }}/>
            {titleEmpty && <div role="status" style={{ fontSize: TY.caption, lineHeight: 1.5, marginTop: 8 }}>Add a title to save.</div>}
            {titleTooLong && <div role="status" style={{ fontSize: TY.caption, lineHeight: 1.5, marginTop: 8 }}>{titleBlocked ? `Keep the title within ${THEME.TITLE_MAX} characters.` : 'Existing title kept. Shorten it when you edit the title.'}</div>}
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
          {!isNote && <div style={{ paddingTop: 18, borderBottom: line }}>
            <div style={{ ...labelStyle, marginLeft: 18 }}>KEY DETAILS</div>
            {details.map((detail, i) => <div key={i} style={{ display: 'flex', alignItems: 'stretch', borderTop: line }}>
              <input aria-label={`Detail ${i + 1} label`} value={detail.label} onChange={e=>updateDetail(i, { label: e.target.value })}
                style={{ ...fieldStyle, width: '34%', flexShrink: 0, padding: '14px 12px 14px 18px', borderRight: line, fontSize: TY.label }}/>
              <textarea ref={el=>{ detailRefs.current[i] = el; }} aria-label={`Detail ${i + 1} value`} rows={1} value={detail.value}
                onChange={e=>updateDetail(i, { value: e.target.value })} style={{ ...fieldStyle, flex: 1, minWidth: 0, padding: '14px 10px 14px 14px', fontSize: TY.label, overflow: 'hidden' }}/>
              <button aria-label={`Remove detail ${i + 1}`} onClick={()=>removeDetail(i)} style={{ ...buttonStyle, width: 44, flexShrink: 0, borderLeft: line, fontSize: TY.body }}>×</button>
            </div>)}
            {details.length < 8 && <button onClick={()=>setDetails(all=>[...all, { label: '', value: '' }])}
              style={{ ...buttonStyle, display: 'block', width: '100%', minHeight: 52, padding: '14px 18px', borderTop: line, textAlign: 'left', fontSize: TY.label }}>+ Add detail</button>}
          </div>}
          <div style={{ paddingTop: 18, borderBottom: line }}>
            <label htmlFor="edit-new-tag" style={{ ...labelStyle, marginLeft: 18 }}>TAGS</label>
            <TagGrid tags={tags} line={line} onRemove={t=>setTags(all=>all.filter(x=>x!==t))}/>
            <div style={{ display: 'flex', alignItems: 'stretch', borderTop: line }}>
              <input id="edit-new-tag" placeholder="Add a tag…" value={newTag} onChange={e=>setNewTag(e.target.value)} onBlur={addTag}
                onKeyDown={e=>{ if(isSubmitEnter(e)){e.preventDefault();addTag();} }} style={{ ...fieldStyle, flex: 1, minWidth: 0, padding: '14px 18px' }}/>
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
