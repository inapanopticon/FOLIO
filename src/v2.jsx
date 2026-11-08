// Locus — redesigned screens: home, drawer, write, drawer menu, dialog

const { useState: useVState, useEffect: useVEffect, useRef: useVRef } = React;
const THEME = window.LocusTheme;
const { TopBar: VTopBar, BackBtn: VBackBtn, Field: VField } = window.LocusScreens2;

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="6.5"/><line x1="16" y1="16" x2="21" y2="21"/></svg>
);
const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.2" fill="var(--cream)"/><circle cx="15" cy="17" r="2.2" fill="var(--cream)"/></svg>
);

// =============== HOME ===============
// Hairline-grid layout: a slim header row, then one full-width colour band per drawer
// (name in the same hue, like a printed label), then a column of small text links.
const { DrawerBadge, DRAWER_ICONS, ICON_KEYS, iconFor } = window.LocusIcons;
const T_BIG = TY.title, T_TEXT = TY.label;  // legacy names → type scale
const HAIR = '1px solid var(--line)';
const ROW_H = 84;                         // drawer list row height = thumbnail square size
const hairOn = (fg) => `1px solid color-mix(in srgb, ${fg} 28%, transparent)`;

function HeaderCell({ onClick, label, children }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      width: 56, flexShrink: 0, background: 'none', border: 'none', borderLeft: HAIR, cursor: 'pointer', color: 'var(--ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
    }}>
      <span style={{ width: 20, height: 20, display: 'flex' }}>{children}</span>
    </button>
  );
}

// =============== LAUNCH ===============
// Cream screen; "Folio" is typed letter by letter with an uneven, hand-typed rhythm, holds a beat,
// then shrinks and glides into the home header's "Folio", which it replaces. About one second.
const LAUNCH_LETTERS = [0, 0.1, 0.2, 0.33, 0.42];  // when each letter lands (s): F … o l … i o
const LAUNCH_GLIDE_AT = 620, LAUNCH_GLIDE_MS = 340;

function LaunchWordmark({ onDone }) {
  const wordRef = useVRef(null);
  const [glide, setGlide] = useVState(null); // transform that puts the big word on the header word
  const [fade, setFade] = useVState(false);

  useVEffect(() => {
    const t1 = setTimeout(() => {
      const target = document.querySelector('[data-wordmark]');
      const word = wordRef.current;
      if (!target || !word) { onDone(); return; }
      const a = word.getBoundingClientRect(), b = target.getBoundingClientRect();
      const k = b.height / a.height;
      setGlide(`translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${k})`);
    }, LAUNCH_GLIDE_AT);
    const t2 = setTimeout(() => setFade(true), LAUNCH_GLIDE_AT + LAUNCH_GLIDE_MS);
    const t3 = setTimeout(onDone, LAUNCH_GLIDE_AT + LAUNCH_GLIDE_MS + 140);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div onClick={onDone} style={{ position: 'absolute', inset: 0, zIndex: 600, pointerEvents: fade ? 'none' : 'auto',
      background: glide ? 'transparent' : 'var(--cream)', transition: `background ${LAUNCH_GLIDE_MS}ms ease` }}>
      <div ref={wordRef} style={{
        position: 'absolute', left: 24, top: '42%', transformOrigin: '0 0',
        fontSize: 64, fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap',
        transform: glide || 'none', opacity: fade ? 0 : 1,
        transition: `transform ${LAUNCH_GLIDE_MS}ms cubic-bezier(0.65, 0, 0.25, 1), opacity 120ms linear`,
      }}>
        {'Folio'.split('').map((ch, i) => (
          <span key={i} className="type-in" style={{ animationDelay: `${LAUNCH_LETTERS[i]}s` }}>{ch}</span>
        ))}
      </div>
    </div>
  );
}

// Swipe a row left to reveal Edit / Delete (the usual phone pattern). Vertical moves still scroll the page.
const ACTION_W = 84;
const OPEN_X = -ACTION_W * 2;

function SwipeRow({ open, onOpenChange, onTap, onLongPress, onEdit, onDelete, rowStyle, className, delay, children }) {
  const [dx, setDx] = useVState(0);
  const [dragging, setDragging] = useVState(false);
  const st = useVRef(null);
  const rowRef = useVRef(null);
  const base = open ? OPEN_X : 0;
  const x = dragging ? Math.max(OPEN_X - 24, Math.min(0, base + dx)) : base;

  const clear = () => { if (st.current) clearTimeout(st.current.timer); };
  const onPointerDown = (e) => {
    st.current = { x: e.clientX, y: e.clientY, mode: null, long: false,
      timer: setTimeout(() => { if (st.current && !st.current.mode) { st.current.long = true; onLongPress(); } }, 480) };
  };
  const onPointerMove = (e) => {
    const s = st.current; if (!s) return;
    const ddx = e.clientX - s.x, ddy = e.clientY - s.y;
    if (!s.mode) {
      if (Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy)) { s.mode = 'h'; clear(); setDragging(true); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ } }
      else if (Math.abs(ddy) > 8) { s.mode = 'v'; clear(); }
    }
    if (s.mode === 'h') setDx(ddx);
  };
  const onPointerUp = () => {
    const s = st.current; st.current = null; clear();
    if (!s) return;
    if (s.mode === 'h') {
      onOpenChange(base + dx < OPEN_X / 2);
      setDx(0); setDragging(false);
    } else if (!s.mode && !s.long) {
      const r = rowRef.current.getBoundingClientRect();
      onTap({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
  };
  const onPointerCancel = () => { clear(); st.current = null; setDx(0); setDragging(false); };

  const actionBtn = (bg, fg) => ({ width: ACTION_W, border: 'none', background: bg, color: fg, fontSize: TY.label, cursor: 'pointer' });

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden', animationDelay: delay }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, display: 'flex' }} aria-hidden={!open}>
        <button style={actionBtn('var(--ink)', 'var(--cream)')} onClick={onEdit} tabIndex={open ? 0 : -1}>Edit</button>
        <button style={actionBtn('var(--discard)', '#fde3d6')} onClick={onDelete} tabIndex={open ? 0 : -1}>Delete</button>
      </div>
      <div ref={rowRef}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
        onContextMenu={(e) => { e.preventDefault(); clear(); st.current = null; onLongPress(); }}
        style={{ ...rowStyle, position: 'relative', touchAction: 'pan-y', transform: `translateX(${x}px)`,
          transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        {children}
      </div>
    </div>
  );
}

// Cold start = home building itself: header fades in, then the colour bands unfold top to bottom.
// Plays once per app launch, not every time you come back to home.
let homeIntroPlayed = false;

function HomeScreen({ collections, captures, queueCount, importCount = 0, onOpenCollection, onImport, onImportFiles, onResumeImport, onWrite, onSort, onSearch, onSettings, onNewDrawer, onDrawerMenu, onDrawerDelete }) {
  const [intro] = useVState(() => !homeIntroPlayed);
  useVEffect(() => { homeIntroPlayed = true; }, []);
  const [openId, setOpenId] = useVState(null); // the row currently swiped open

  const link = { display: 'block', background: 'none', border: 'none', padding: '5px 0', cursor: 'pointer',
    fontSize: T_TEXT, textAlign: 'left', color: 'inherit' };

  return (
    <div className="page">
      <div className="content">
        <StatusBar/>
        <div style={{ display: 'flex', alignItems: 'stretch', height: 52, borderTop: HAIR, borderBottom: HAIR, borderColor: 'var(--line)', flexShrink: 0 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: TY.caption, letterSpacing: '0.12em', textTransform: 'uppercase' }}><span data-wordmark style={{ lineHeight: 1, opacity: intro ? 0 : 1, animation: intro ? 'introFade 1ms linear 0.96s both' : 'none' }}>Folio</span></div>
          <HeaderCell onClick={onSearch} label="Search"><IconSearch/></HeaderCell>
          <HeaderCell onClick={onSettings} label="Settings"><IconSettings/></HeaderCell>
        </div>

        <div className="scroll-y" style={{ flex: 1, animation: intro ? 'introFade 0.34s ease 0.62s both' : 'none' }} onScroll={() => openId && setOpenId(null)}>
          <div style={{ padding: '14px 18px', fontSize: TY.caption, color: 'var(--ink-2)', borderBottom: HAIR }}>
            {collections.length} drawers · {captures.length} kept
          </div>

          {importCount > 0 && <button onClick={onResumeImport || onImport} style={{ background:'transparent',border:'none',borderBottom:HAIR,padding:'14px 18px',width:'100%',textAlign:'left',fontSize:TY.label,cursor:'pointer' }}>{importCount} images to continue<Arrow dir="right" style={{marginLeft:8}}/></button>}
          {queueCount > 0 && (
            <button onClick={onSort} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '18px', border: 'none', borderBottom: HAIR, background: 'var(--ink)', color: 'var(--cream)', cursor: 'pointer', fontSize: T_TEXT }}>
              <span>{queueCount} screenshot{queueCount === 1 ? '' : 's'} to sort</span><span>Start<Arrow dir="right" style={{marginLeft:8}}/></span>
            </button>
          )}

          {collections.map((c, i) => {
            const col = THEME.colorOf(c, collections);
            return (
              <SwipeRow key={c.id}
                className="" delay="0s"
                open={openId === c.id}
                onOpenChange={(o) => setOpenId(o ? c.id : null)}
                onTap={(rect) => { if (openId) { setOpenId(null); return; } onOpenCollection(c.id, rect); }}
                onLongPress={() => { setOpenId(null); onDrawerMenu(c); }}
                onEdit={() => { setOpenId(null); onDrawerMenu(c); }}
                onDelete={() => { setOpenId(null); onDrawerDelete(c); }}
                rowStyle={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
                  padding: '15px 18px 14px', background: col.bg, color: col.fg, borderBottom: '1px solid rgba(34,34,32,0.08)',
                  cursor: 'pointer', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
                }}>
                <span style={{ fontSize: T_BIG, lineHeight: 1.3, letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                <span style={{ fontSize: TY.caption, opacity: 0.75, flexShrink: 0 }}>{c.count}</span>
              </SwipeRow>
            );
          })}

          <div style={{ padding: '18px 18px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
            <button style={link} onClick={onImport}>Import</button>
            <button style={link} onClick={onWrite}>Write</button>
            <button style={{ ...link, color: 'var(--ink-3)' }} onClick={onNewDrawer}>+ New drawer</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============== DRAWER MENU (Edit from swipe, long-press or right-click) ===============
// Colour swatches as a grid of square cells (8 per row), no gaps. The chosen colour stays at full
// strength and every other one fades (user's pick), so the choice is obvious at a glance.
function ColorPicker({ value, onPick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))' }}>
      {THEME.PALETTE.map((p, i) => (
        <button key={p.name} onClick={() => onPick(i)} aria-label={p.name} aria-pressed={value === i} style={{
          aspectRatio: '1', borderRadius: 0, background: p.bg, cursor: 'pointer', padding: 0, border: 'none',
          opacity: value == null || value < 0 || value === i ? 1 : 0.28, transition: 'opacity .15s',
          // a thin ink frame too: pale colours (sage, mist) would otherwise blend into the faded ones
          boxShadow: value === i ? 'inset 0 0 0 2px var(--ink)' : 'none',
        }}/>
      ))}
    </div>
  );
}

// Bottom sheets share the hairline grid: square corners, full-width rows split by hairlines,
// small uppercase section labels, and a footer of equal cells.
const SHEET_LINE = '1px solid var(--line)';
const sheetLabel = { padding: '14px 18px', fontSize: TY.caption, letterSpacing: '0.12em', color: 'var(--ink-2)', borderTop: SHEET_LINE, borderBottom: SHEET_LINE };
const sheetRow = { display: 'block', width: '100%', textAlign: 'left', padding: '18px', fontSize: TY.body, lineHeight: 1.4,
  background: 'none', border: 'none', borderTop: SHEET_LINE, borderRadius: 0, color: 'var(--ink)', cursor: 'pointer' };
function Sheet({ onClose, zIndex, children }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex, background: 'rgba(29,28,26,0.35)',
      display: 'flex', alignItems: 'flex-end', animation: 'pgUpIn 0.2s ease both' }}>
      <div onClick={(e) => e.stopPropagation()} className="safe-bottom" style={{ width: '100%', background: 'var(--cream)',
        borderTop: SHEET_LINE, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function DrawerMenu({ collection, collections, onClose, onRename, onRecolor, onDelete }) {
  const col = THEME.colorOf(collection, collections);
  const current = THEME.PALETTE.indexOf(col);
  return (
    <Sheet onClose={onClose} zIndex={250}>
      <div style={{ background: col.bg, color: col.fg, padding: '22px 18px 20px', fontSize: TY.title, lineHeight: 1.25, letterSpacing: '-0.015em' }}>
        {collection.name}
      </div>
      <div style={{ ...sheetLabel, borderTop: 'none' }}>COLOUR</div>
      <ColorPicker value={current} onPick={onRecolor}/>
      <button onClick={onRename} style={sheetRow}>Rename</button>
      <button onClick={onDelete} style={{ ...sheetRow, color: 'var(--discard)' }}>Delete drawer</button>
      <button onClick={onClose} style={{ ...sheetRow, color: 'var(--ink-2)' }}>Cancel</button>
    </Sheet>
  );
}

// =============== DRAWER (the row pulled out to fill the screen) ===============
// Whole page in the drawer's colour; a hairline header row, the title, then a numbered list
// whose right-hand cell holds the screenshot thumbnail.
// animateIn: only when it has just grown out of its home row, not when coming back from a capture
function DrawerScreen({ collection, collections, captures, onBack, onOpen, onImport, onSearch, animateIn, softEnter, initialTag = null, onTagChange }) {
  const [pickPhotos, picker] = usePhotoPicker((files) => onImport(collection.id, files));
  const soft = softEnter ? 'soft-in' : undefined;
  const col = THEME.colorOf(collection, collections);
  const line = hairOn(col.fg);
  const mine = captures
    .filter((c) => c.collection === collection.id)
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  const counts = {};
  mine.forEach((c) => (c.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
  const topTags = Array.isArray(collection.tags) ? [...collection.tags] : Object.keys(counts);
  const [tag, setTagState] = useVState(initialTag);
  const setTag = (value) => { setTagState(value); onTagChange?.(value); };
  if (tag && !topTags.includes(tag)) topTags.push(tag);
  const shown = tag ? mine.filter((c) => (c.tags || []).includes(tag)) : mine;
  const index = collections.findIndex((c) => c.id === collection.id) + 1;
  const scrollRef = useRememberedScroll(`drawer:${collection.id}`);

  // tint the phone's status bar to match while this drawer is open
  useVEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = meta?.getAttribute('content');
    meta?.setAttribute('content', col.bg);
    return () => { if (meta && prev) meta.setAttribute('content', prev); };
  }, [col.bg]);

  const tagBtn = (on) => ({
    background: 'none', border: 'none', cursor: 'pointer', color: col.fg, padding: '14px 0', whiteSpace: 'nowrap',
    fontSize: T_TEXT, opacity: on ? 1 : 0.6, textDecoration: on ? 'underline' : 'none', textUnderlineOffset: 4,
  });

  return (
    <div className="page" style={{ background: col.bg, color: col.fg }}>
      <div className={animateIn ? 'content drawer-in' : 'content'}>
        <StatusBar/>
        <div style={{ display: 'flex', alignItems: 'stretch', height: 52, borderTop: line, borderBottom: line, flexShrink: 0 }}>
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
            <span style={{ fontSize: T_BIG, lineHeight: 1.2, letterSpacing: '-0.015em' }}>{collection.name}</span>
            <span style={{ fontSize: TY.caption, opacity: 0.75, flexShrink: 0 }}>{mine.length}</span>
          </div>

          {topTags.length > 0 && (
            <div className="scroll-y" style={{ display: 'flex', gap: 18, padding: '0 18px', overflowX: 'auto', borderBottom: line }}>
              <button aria-pressed={!tag} style={tagBtn(!tag)} onClick={() => setTag(null)}>All</button>
              {topTags.map((t) => <button key={t} aria-pressed={tag === t} style={tagBtn(tag === t)} onClick={() => setTag(t)}>{t}</button>)}
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
            <div key={c.id} onClick={() => onOpen(c.id)} style={{ display: 'flex', alignItems: 'stretch', borderBottom: line, cursor: 'pointer', height: ROW_H }}>
              <div style={{ width: 44, padding: '16px 0 0 18px', fontSize: TY.caption, opacity: 0.75, flexShrink: 0 }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0, padding: '16px 12px 0 6px', fontSize: TY.body, lineHeight: 1.35 }}>
                <div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.title}</div>
              </div>
              <div style={{ width: ROW_H - 1, flexShrink: 0, borderLeft: line, display: 'flex' }}>{/* -1: the row's bottom hairline takes one pixel of its height */}
                {c.kind === 'note' && !c.imageId ? (
                  <div style={{ width: '100%', height: '100%', background: 'var(--cream)', color: 'var(--ink-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: T_TEXT }}>✎</div>
                ) : (
                  <Shot imageId={c.imageId} glyph={c.glyph} fontSize={18} style={{ width: '100%', height: '100%', background: 'var(--cream)' }}/>
                )}
              </div>
            </div>
          ))}
          <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}/>
        </div>
      </div>
    </div>
  );
}

// =============== WRITE (a capture typed by hand) ===============
function WriteScreen({ collections, captures = [], defaultCollectionId, onCancel, onSave }) {
  const [title, setTitle] = useVState('');
  const [text, setText] = useVState('');
  const [tags, setTags] = useVState([]);
  const [newTag, setNewTag] = useVState('');
  const [images, setImages] = useVState([]);
  const [readingImages, setReadingImages] = useVState(false);
  const [saving, setSaving] = useVState(false);
  const [error, setError] = useVState('');
  const fileRef = useVRef();
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
  const [collId, setCollId] = useVState(defaultCollectionId || collections[0]?.id);
  const counts = {};
  captures.filter(c=>c.collection===collId).forEach(c=>(c.tags || []).forEach(t=>{counts[t]=(counts[t] || 0)+1;}));
  const selectedDrawer = collections.find(c=>c.id===collId);
  const existingTags = Array.isArray(selectedDrawer?.tags) ? selectedDrawer.tags : Object.keys(counts);
  const customTags = tags.filter(t=>!existingTags.includes(t));
  const tagRows = Array.from({length:Math.ceil(existingTags.length/4)},(_,i)=>existingTags.slice(i*4,i*4+4));
  const ref = useVRef();
  const titleRef = useVRef();
  useVEffect(() => {
    const timer = setTimeout(() => ref.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, []);
  useVEffect(() => {
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
  const input = { width: '100%', minWidth: 0, background: 'transparent', border: 'none', borderRadius: 0, padding: 0, color: 'inherit', fontFamily: 'var(--sans)', fontSize: TY.body, lineHeight: 1.6, resize: 'none' };
  const nav = { width: 80, background: 'transparent', border: 'none', borderRadius: 0, color: 'inherit', fontSize: TY.caption, fontWeight: 400, cursor: 'pointer' };

  return (
    <div className="page write-screen">
      <div className="content">
        <StatusBar/>
        <div style={{ display: 'flex', height: 52, flexShrink: 0, borderTop: HAIR, borderBottom: HAIR }}>
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
            <div style={{ ...label, margin: 0, padding: '14px 18px' }}>IMAGES</div>
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
            <label htmlFor="write-tag" style={{ ...label, margin: 0, padding: '14px 18px', }}>TAGS</label>
            {tagRows.map((row,i)=><div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', borderTop: HAIR }}>
              {row.map(t=><button key={t} aria-pressed={tags.includes(t)} onClick={()=>setTags(all=>all.includes(t) ? all.filter(x=>x!==t) : [...all,t])} style={{ ...nav, width: '100%', minHeight: 52, padding: '14px 8px', fontSize: TY.label, lineHeight: 1.5, overflowWrap: 'anywhere', borderRight: HAIR, background: tags.includes(t) ? col.bg : 'transparent', color: tags.includes(t) ? col.fg : 'inherit' }}>{t}</button>)}
              {Array.from({length:4-row.length},(_,j)=><div key={`empty-${j}`} aria-hidden="true" style={{ borderRight: HAIR }}/>) }
            </div>)}
            <TagGrid tags={customTags} line={HAIR} onRemove={t=>setTags(all=>all.filter(x=>x!==t))}/>
            <div style={{ display: 'flex', borderTop: HAIR }}>
              <input id="write-tag" value={newTag} onChange={e=>setNewTag(e.target.value)} onBlur={addTag} placeholder="Add a tag…" onKeyDown={e=>{if(e.key==='Enter' && !e.nativeEvent.isComposing){e.preventDefault();addTag();}}} style={{ ...input, flex: 1, minWidth: 0, padding: '14px 18px', outline: 'none' }}/>
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

// =============== DIALOG (replaces the browser's prompt/confirm) ===============
// dialog = { title, message?, input?: defaultValue, placeholder?, color?: defaultIndex, okLabel, danger?, onOk(value, colorIndex) }
function Dialog({ dialog, onClose }) {
  const [value, setValue] = useVState(dialog.input ?? '');
  const [color, setColor] = useVState(dialog.color);
  const ref = useVRef();
  useVEffect(() => { if (dialog.input !== undefined) setTimeout(() => ref.current?.focus(), 120); }, []);
  const hasInput = dialog.input !== undefined;
  const can = !hasInput || value.trim().length > 0;
  const ok = () => { if (!can) return; onClose(); dialog.onOk(hasInput ? value.trim() : true, color); };
  const cell = { flex: 1, minHeight: 56, border: 'none', borderRadius: 0, fontSize: TY.label, cursor: 'pointer', background: 'transparent', color: 'var(--ink)' };

  return (
    <Sheet onClose={onClose} zIndex={500}>
      <div style={{ padding: '22px 18px', fontSize: TY.title, lineHeight: 1.25, letterSpacing: '-0.015em' }}>
        {dialog.title}
        {dialog.message && <div style={{ fontSize: TY.body, lineHeight: 1.5, color: 'var(--ink-2)', marginTop: 10, letterSpacing: 0 }}>{dialog.message}</div>}
      </div>
      {hasInput && (
        <input ref={ref} value={value} onChange={(e) => setValue(e.target.value)} placeholder={dialog.placeholder || ''}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) ok(); }}
          style={{ display: 'block', width: '100%', padding: '18px', border: 'none', borderTop: SHEET_LINE, borderRadius: 0,
            background: 'transparent', fontFamily: 'var(--sans)', fontSize: TY.body, color: 'var(--ink)' }}/>
      )}
      {dialog.color !== undefined && <>
        <div style={sheetLabel}>COLOUR</div>
        <ColorPicker value={color} onPick={setColor}/>
      </>}
      <div style={{ display: 'flex', borderTop: SHEET_LINE }}>
        <button onClick={onClose} style={{ ...cell, borderRight: SHEET_LINE, color: 'var(--ink-2)' }}>Cancel</button>
        <button onClick={ok} disabled={!can} style={{ ...cell, background: dialog.danger ? 'var(--discard)' : 'var(--ink)', color: 'var(--cream)', opacity: can ? 1 : 0.35 }}>{dialog.okLabel || 'OK'}</button>
      </div>
    </Sheet>
  );
}

window.LocusV2 = { LaunchWordmark, HomeScreen, DrawerMenu, DrawerScreen, WriteScreen, Dialog };
