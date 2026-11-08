// Folio — search everything, or one drawer

function SearchScreen({ collections, captures, onCancel, onOpenCapture, initialQuery = '', initialTag = null, scopeId = null, onSearchChange }) {
  const scope = collections.find(c=>c.id===scopeId);
  const [q, setQ] = useState(initialQuery);
  const [tag, setTag] = useState(scopeId ? initialTag : null);
  const inputRef = useRef();
  const change = (patch) => {
    const next = { query: q, tag, ...patch };
    setQ(next.query); setTag(next.tag);
    onSearchChange?.(next);
  };
  useEffect(()=>{ inputRef.current?.focus(); },[]);
  const palette = scope ? THEME.colorOf(scope,collections) : null;
  const bg = palette ? palette.bg : 'var(--cream)';
  const fg = palette ? palette.fg : 'var(--ink)';
  const line = palette ? THEME.hairline(fg) : '1px solid var(--line)';
  useStatusBarTint(palette?.bg);

  const scoped = useMemo(()=>scopeId ? captures.filter(c=>c.collection===scopeId) : captures,[captures,scopeId]);
  const results = useMemo(()=>{
    if (!q.trim() && !scopeId) return null;
    const lq = q.trim().toLowerCase();
    const has = value => (value || '').toLowerCase().includes(lq);
    const hits = scoped.filter(c=>(!tag || (c.tags||[]).includes(tag)) && (!lq || has(c.title) || (c.tags||[]).some(has) || has(c.summary) || has(c.text) || has(c.note) || (c.details||[]).some(d=>has(d.label) || has(d.value))));
    const grouped = {};
    hits.forEach(c=>{ (grouped[c.collection] = grouped[c.collection] || []).push(c); });
    return { hits, grouped };
  },[q,tag,scoped,scopeId]);
  const suggestions = scope ? [...scope.tags] : [];
  if(tag && !suggestions.includes(tag)) suggestions.push(tag);
  const hl = str => {
    if (!q.trim() || !str) return str;
    const re = new RegExp(`(${q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'ig');
    return String(str).split(re).map((part,i)=>i%2 ? <span key={i} className="hl">{part}</span> : part);
  };
  const button = { background: 'transparent', border: 'none', borderRadius: 0, color: 'inherit', cursor: 'pointer', fontWeight: 400 };
  const heading = { padding: '14px 18px', borderBottom: line, fontSize: TY.caption, letterSpacing: '0.12em', lineHeight: 1.5, background: palette ? 'transparent' : 'var(--band)' };

  return (
    <div className="page search-screen" style={{ background: bg, color: fg }}>
      <div className="content">
        <StatusBar/>
        <div style={headerBar(line)}>
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
