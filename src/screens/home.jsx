// Folio — Home, and the wordmark that opens the app

const IconSettings = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="17" x2="20" y2="17"/><circle cx="9" cy="7" r="2.2" fill="var(--cream)"/><circle cx="15" cy="17" r="2.2" fill="var(--cream)"/></svg>
);

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
  const wordRef = useRef(null);
  const [glide, setGlide] = useState(null); // transform that puts the big word on the header word
  const [fade, setFade] = useState(false);

  useEffect(() => {
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
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const st = useRef(null);
  const rowRef = useRef(null);
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
  const [intro] = useState(() => !homeIntroPlayed);
  useEffect(() => { homeIntroPlayed = true; }, []);
  const [openId, setOpenId] = useState(null); // the row currently swiped open

  const link = { display: 'block', background: 'none', border: 'none', padding: '5px 0', cursor: 'pointer',
    fontSize: TY.label, textAlign: 'left', color: 'inherit' };

  return (
    <div className="page">
      <div className="content">
        <StatusBar/>
        <div style={headerBar(HAIR)}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: TY.caption, letterSpacing: '0.12em', textTransform: 'uppercase' }}><span data-wordmark style={{ lineHeight: 1, opacity: intro ? 0 : 1, animation: intro ? 'introFade 1ms linear 0.96s both' : 'none' }}>Folio</span></div>
          <HeaderCell onClick={onSearch} label="Search"><IconSearch/></HeaderCell>
          <HeaderCell onClick={onSettings} label="Settings"><IconSettings/></HeaderCell>
        </div>

        <div className="scroll-y" style={{ flex: 1, animation: intro ? 'introFade 0.34s ease 0.62s both' : 'none' }} onScroll={() => openId && setOpenId(null)}>
          <div style={{ padding: '14px 18px', fontSize: TY.caption, color: 'var(--ink-2)', borderBottom: HAIR }}>
            {collections.length} drawers · {captures.length} kept
          </div>

          {importCount > 0 && <button onClick={onResumeImport || onImport} style={{ background:'transparent',border:'none',borderBottom:HAIR,padding:'14px 18px',width:'100%',textAlign:'left',fontSize:TY.label,cursor:'pointer' }}>{plural(importCount, 'image')} to continue<Arrow dir="right" style={{marginLeft:8}}/></button>}
          {queueCount > 0 && (
            <button onClick={onSort} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '18px', border: 'none', borderBottom: HAIR, background: 'var(--ink)', color: 'var(--cream)', cursor: 'pointer', fontSize: TY.label }}>
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
                <span style={{ fontSize: TY.title, lineHeight: 1.3, letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
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
