// Folio — one drawer: its list of captures

const ROW_H = 84; // list row height = thumbnail square size

// =============== DRAWER (the row pulled out to fill the screen) ===============
// Whole page in the drawer's colour; a hairline header row, the title, then a numbered list
// whose right-hand cell holds the screenshot thumbnail.
// animateIn: only when it has just grown out of its home row, not when coming back from a capture
function DrawerScreen({ collection, collections, captures, onBack, onOpen, onImport, onSearch, animateIn, softEnter, initialTag = null, onTagChange, onDeleteTag, onDeleteCapture }) {
  const [pickPhotos, picker] = usePhotoPicker((files) => onImport(collection.id, files));
  const soft = softEnter ? 'soft-in' : undefined;
  const col = THEME.colorOf(collection, collections);
  const line = THEME.hairline(col.fg);
  const [sort, setSortState] = useState(() => window.LocusStore.getSort());
  const changeSort = (value) => { setSortState(value); window.LocusStore.setSort(value); };
  const mine = window.LocusStore.sortCaptures(captures.filter((c) => c.collection === collection.id), sort);
  const topTags = [...collection.tags];
  const [chosenTag, setTagState] = useState(initialTag);
  const tag = chosenTag && mine.some((c) => (c.tags || []).includes(chosenTag)) ? chosenTag : null; // a deleted tag clears the filter
  const setTag = (value) => { setTagState(value); onTagChange?.(value); };
  if (tag && !topTags.includes(tag)) topTags.push(tag);
  const shown = tag ? mine.filter((c) => (c.tags || []).includes(tag)) : mine;
  const index = collections.findIndex((c) => c.id === collection.id) + 1;
  const scrollRef = useRememberedScroll(`drawer:${collection.id}`);

  // tint the phone's status bar to match while this drawer is open
  useStatusBarTint(col.bg);

  const tagBtn = (on) => ({
    background: 'none', border: 'none', cursor: 'pointer', color: col.fg, padding: '14px 0', whiteSpace: 'nowrap',
    fontSize: TY.label, opacity: on ? 1 : 0.6, textDecoration: on ? 'underline' : 'none', textUnderlineOffset: 4,
  });

  return (
    <div className="page" style={{ background: col.bg, color: col.fg }}>
      <div className={animateIn ? 'content drawer-in' : 'content'}>
        <StatusBar/>
        <div style={headerBar(line)}>
          <button onClick={onBack} aria-label="Back" style={{ width: 56, background: 'none', border: 'none', borderRight: line,
            cursor: 'pointer', color: col.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Arrow size={20}/>
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: TY.caption, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            <span className={soft}>Drawer {String(index).padStart(2, '0')}</span>
          </div>
          <button onClick={onSearch} aria-label={`Search in ${collection.name}`} style={{ width: 56, flexShrink: 0, background: 'none', border: 'none', borderLeft: line, cursor: 'pointer', color: col.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 20, height: 20, display: 'flex' }}><IconSearch/></span>
          </button>
          {picker}<button onClick={pickPhotos} aria-label={`Import screenshots into ${collection.name}`} style={{ width: 56, background: 'none', border: 'none', borderLeft: line,
            cursor: 'pointer', color: col.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <div className={soft ? 'scroll-y soft-in' : 'scroll-y'} ref={scrollRef} style={{ flex: 1 }}>
          <div style={{ padding: '28px 18px 24px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 14, borderBottom: line }}>
            <span style={{ fontSize: TY.title, lineHeight: 1.2, letterSpacing: '-0.015em' }}>{collection.name}</span>
            <span style={{ fontSize: TY.caption, opacity: 0.75, flexShrink: 0 }}>{mine.length}</span>
          </div>

          {(topTags.length > 0 || mine.length > 1) && (
            <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: line }}>
              <div className="scroll-y" style={{ flex: 1, minWidth: 0, display: 'flex', gap: 18, padding: '0 18px', overflowX: 'auto' }}>
                {topTags.length > 0 && <button aria-pressed={!tag} style={tagBtn(!tag)} onClick={() => setTag(null)}>All</button>}
                {topTags.map((t) => <LongPressRow key={t} aria-pressed={tag === t} style={tagBtn(tag === t)} onClick={() => setTag(t)} onLong={() => onDeleteTag(t)}>{t}</LongPressRow>)}
              </div>
              {mine.length > 1 && (
                <div style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px', borderLeft: line, fontSize: TY.label, whiteSpace: 'nowrap' }}>
                  {window.LocusStore.SORTS.find((s) => s.id === sort)?.label}
                  <Picker label="Sort this drawer" value={sort} onChange={changeSort}
                    options={window.LocusStore.SORTS.map((s) => ({ value: s.id, label: s.label }))}/>
                </div>
              )}
            </div>
          )}

          {mine.length === 0 ? (
            <div style={{ padding: '40px 18px', fontSize: TY.body, lineHeight: 1.6 }}>
              Nothing here yet.<br/>
              <button onClick={pickPhotos} style={{ background: 'none', border: 'none', padding: 0, color: col.fg, fontSize: TY.body,
                textDecoration: 'underline', textUnderlineOffset: 4, cursor: 'pointer' }}>Import screenshots</button>
            </div>
          ) : shown.map((c, i) => (
            // every row is exactly ROW_H tall (room for a two-line title), so the thumbnail is always a full square
            <LongPressRow as="div" key={c.id} onClick={() => onOpen(c.id)} onLong={() => onDeleteCapture(c)} style={{ display: 'flex', alignItems: 'stretch', borderBottom: line, cursor: 'pointer', height: ROW_H }}>
              <div style={{ width: 44, padding: '16px 0 0 18px', fontSize: TY.caption, opacity: 0.75, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0, padding: '16px 12px 0 6px', fontSize: TY.body, lineHeight: 1.35 }}>
                <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.title}</div>
              </div>
              <div style={{ width: ROW_H - 1, flexShrink: 0, borderLeft: line, display: 'flex' }}>{/* -1: the row's bottom hairline takes one pixel of its height */}
                {c.kind === 'note' && !c.imageId ? (
                  <div style={{ width: '100%', height: '100%', background: 'var(--cream)', color: 'var(--ink-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: TY.label }}>✎</div>
                ) : (
                  <Shot imageId={c.imageId} glyph={c.glyph} fontSize={18} style={{ width: '100%', height: '100%', background: 'var(--cream)' }}/>
                )}
              </div>
            </LongPressRow>
          ))}
          <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}/>
        </div>
      </div>
    </div>
  );
}
