// Folio — the welcome pages shown once, right after the first launch. Replayable from Settings.
// Each page takes one drawer colour, so swiping feels like pulling out one drawer after another.

// The app's real pages as small outlines: the true layout at phone width, scaled down inside a frame,
// drawn only in the page's own text colour so nothing competes with the coloured background.
const INTRO_FRAME_SCALE = 0.58, INTRO_FRAME_WIDTH = 375 * INTRO_FRAME_SCALE;
function IntroFrame({ tone, children }) {
  const palette = THEME.PALETTE.find(x => x.name === tone);
  const line = THEME.hairline(palette.fg);
  return (
    <div style={{ alignSelf: 'center', width: INTRO_FRAME_WIDTH + 2, height: 'calc(100% - 28px)', maxHeight: 350, overflow: 'hidden', border: line, borderRadius: 18 }}>
      <div style={{ width: 375, height: `calc(100% / ${INTRO_FRAME_SCALE})`, display: 'flex', flexDirection: 'column', transform: `scale(${INTRO_FRAME_SCALE})`, transformOrigin: '0 0', lineHeight: 1.5 }}>
        <div style={{ height: 22, flexShrink: 0 }}/>
        {children(line, palette)}
      </div>
    </div>
  );
}

function IntroDrawers() {
  const rows = [['Recipes', 12], ['Interviews', 8], ['Places to go', 23], ['Shopping', 6], ['Reading', 3]];
  const icon = { width: 56, display: 'grid', placeItems: 'center' };
  return <IntroFrame tone="mustard">{line => <>
    <div style={headerBar(line)}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: TY.caption, letterSpacing: '0.12em' }}>FOLIO</div>
      <div style={{ ...icon, borderLeft: line }}><span style={{ width: 20, height: 20, display: 'flex' }}><IconSearch/></span></div>
    </div>
    <div style={{ padding: '14px 18px', fontSize: TY.caption, borderBottom: line }}>5 drawers · 52 kept</div>
    {rows.map(([name, count]) => (
      <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '15px 18px 14px', borderBottom: line, flexShrink: 0 }}>
        <span style={{ fontSize: TY.title, lineHeight: 1.3, letterSpacing: '-0.015em' }}>{name}</span>
        <span style={{ fontSize: TY.caption, opacity: 0.75 }}>{count}</span>
      </div>
    ))}
  </>}</IntroFrame>;
}

function IntroClip() {
  const cell = { flex: 1, minHeight: 60, display: 'grid', placeItems: 'center', fontSize: TY.label };
  const stub = width => ({ height: 9, width, marginBottom: 14, background: 'currentColor', opacity: 0.3 });
  return <IntroFrame tone="vermilion">{(line, palette) => <>
    <div style={headerBar(line)}>
      <div style={{ width: 56, display: 'grid', placeItems: 'center', borderRight: line }}><Arrow size={20}/></div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: TY.caption, letterSpacing: '0.12em' }}>REVIEW PHOTOS · 2/6</div>
    </div>
    <ImportSteps step={2} line={line} fill={palette.fg} onFill={palette.bg}/>
    <div style={{ flex: 1, minHeight: 0, position: 'relative', padding: '64px 24px 0', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: line, fontSize: TY.caption, lineHeight: 1.4 }}><ClipIcon size={14}/>2 of 2</div>
      {['82%', '100%', '94%', '64%', '100%', '88%', '46%'].map((w, i) => <div key={i} style={stub(w)}/>)}
    </div>
    <div style={{ display: 'flex', borderTop: line, flexShrink: 0 }}>
      <div style={{ ...cell, borderRight: line }}>Skip</div>
      <div style={{ ...cell, display: 'flex', alignItems: 'center', justifyContent: 'center', background: palette.fg, color: palette.bg }}><ClipIcon size={16} style={{ marginRight: 7 }}/>Clip</div>
      <div style={{ ...cell, borderLeft: line }}>Keep for AI</div>
    </div>
  </>}</IntroFrame>;
}

function IntroSummary() {
  const label = { opacity: 0.65 };
  return <IntroFrame tone="cobalt">{(line, palette) => {
    const dot = { width: 7, height: 7, borderRadius: '50%', background: palette.fg, flexShrink: 0, marginTop: 8 };
    return <>
        <div style={headerBar(line)}>
          <div style={{ width: 56, display: 'grid', placeItems: 'center', borderRight: line }}><Arrow size={20}/></div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: TY.caption, letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>FOOD &amp; RECIPES · 1/2</div>
          <div style={{ display: 'grid', placeItems: 'center', padding: '0 18px', borderLeft: line, fontSize: TY.caption }}>Edit</div>
        </div>
        <div style={{ padding: '24px 18px 20px', fontSize: TY.title, lineHeight: 1.2, letterSpacing: '-0.015em', borderBottom: line }}>Rich chicken ramen at home</div>
        <div style={{ padding: 18, borderBottom: line }}>
          <div style={{ display: 'flex', gap: 12, fontSize: TY.body, lineHeight: 1.55 }}>
            <span style={dot}/><span>Simmering wings hard for two hours gives a creamy broth without pork bones.</span>
          </div>
          <div style={{ marginTop: 10, marginLeft: 19, fontSize: TY.label, lineHeight: 1.6 }}>
            <div><span style={label}>Dish</span>&nbsp; Chicken paitan ramen</div>
            <div style={{ marginTop: 2 }}><span style={label}>Total time</span>&nbsp; 2 hours 30 minutes</div>
          </div>
        </div>
        <div style={{ padding: '14px 18px', borderBottom: line, fontSize: TY.label, lineHeight: 1.6 }}>
          <div style={{ display: 'flex', gap: 10 }}>{['recipe', 'japan', 'dinner'].map(t => <span key={t} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>{t}</span>)}</div>
          <div style={{ marginTop: 6, opacity: 0.8 }}>Xiaohongshu · Feb 18, 2026</div>
        </div>
        <div style={{ padding: '14px 18px', fontSize: TY.body }}>My note</div>
    </>;
  }}</IntroFrame>;
}

const INTRO_PAGES = [
  { tone: 'mustard', Art: IntroDrawers, title: 'Sort your screenshots into drawers', body: 'Import screenshots from your photos. Folio groups them by topic, so they\'re easy to find later.' },
  { tone: 'vermilion', Art: IntroClip, title: 'First, choose what to keep', body: 'Skip the photos you don\'t need. If several photos come from one post, clip them together.' },
  { tone: 'cobalt', Art: IntroSummary, title: 'Then AI organizes them', body: 'It adds a title, a summary and key details, then suggests a drawer. Nothing is saved until you confirm.' },
  { tone: 'navy', Art: null, title: 'Connect AI to get started', body: 'You\'ll need your own Qianwen API key. Photos are sent to the AI only when you tap Organize. Your drawers stay in this browser.' },
];
const INTRO_SWIPE_PX = 60;

// afterLaunch: the opening wordmark is still gliding into place, so the header word waits for it.
// onDone(connect): connect is true when the person chose to set up AI now.
function IntroScreen({ afterLaunch, onDone }) {
  const [page, setPage] = useState(0);
  const [drag, setDrag] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const start = useRef(null);
  const count = INTRO_PAGES.length, last = page === count - 1;
  const palette = THEME.PALETTE.find(p => p.name === INTRO_PAGES[page].tone);
  const line = THEME.hairline(palette.fg);
  useStatusBarTint(palette.bg);

  const moveBy = n => setPage(p => Math.max(0, Math.min(count - 1, p + n)));
  useEffect(() => { // computers can't swipe: the arrow keys do the same
    const key = e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); moveBy(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); moveBy(-1); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const close = connect => { if (leaving) return; setLeaving(true); setTimeout(() => onDone(connect), 220); };
  const down = e => { start.current = { x: e.clientX, y: e.clientY }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} };
  const move = e => {
    if (!start.current) return;
    const x = e.clientX - start.current.x, y = e.clientY - start.current.y;
    if (Math.abs(x) <= Math.abs(y)) return;
    const pastEdge = (page === 0 && x > 0) || (last && x < 0);
    setDrag(pastEdge ? x * 0.25 : x); // the first and last pages resist being pulled further
  };
  const up = e => {
    if (!start.current) return;
    const x = e.clientX - start.current.x, y = e.clientY - start.current.y;
    start.current = null; setDrag(0);
    if (Math.abs(x) > INTRO_SWIPE_PX && Math.abs(x) > Math.abs(y)) moveBy(x < 0 ? 1 : -1);
  };

  const button = { background: 'none', border: 'none', borderRadius: 0, color: 'inherit', cursor: 'pointer', fontSize: TY.label, fontWeight: 400, padding: 0 };
  const wordAt = afterLaunch ? (LAUNCH_GLIDE_AT + LAUNCH_GLIDE_MS) / 1000 : 0;

  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome to Folio" style={{ position: 'absolute', inset: 0, zIndex: 550, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', // swiping must not select the text
      background: palette.bg, color: palette.fg, opacity: leaving ? 0 : 1, transition: 'background .3s ease, color .3s ease, opacity .22s ease' }}>
      <StatusBar/>
      <div style={headerBar(line)}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: TY.caption, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          <span style={{ lineHeight: 1, animation: afterLaunch ? `introFade 1ms linear ${wordAt}s both` : 'none' }}>Folio</span>
        </div>
        {!last && <button onClick={() => close(false)} style={{ ...button, width: 72, borderLeft: line, fontSize: TY.caption }}>Skip</button>}
      </div>
      <div aria-hidden="true" style={{ display: 'flex', gap: 4, padding: '12px 18px 0', flexShrink: 0 }}>
        {INTRO_PAGES.map((p, i) => <span key={p.tone} style={{ flex: 1, height: 2, background: 'currentColor', opacity: i <= page ? 1 : 0.28, transition: 'opacity .3s ease' }}/>)}
      </div>

      <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { start.current = null; setDrag(0); }}
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', touchAction: 'pan-y' }}>
        <div style={{ display: 'flex', height: '100%', transform: `translateX(calc(${-page * 100}% + ${drag}px))`, transition: drag ? 'none' : 'transform .32s cubic-bezier(0.2,0.7,0.2,1)' }}>
          {INTRO_PAGES.map(({ tone, Art, title, body }, i) => (
            <div key={tone} aria-hidden={i !== page} style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>{Art && <Art/>}</div>
              <div style={{ padding: '0 18px 24px', flexShrink: 0 }}>
                <div style={{ fontSize: TY.title, lineHeight: 1.2, letterSpacing: '-0.015em' }}>{title}</div>
                <div style={{ fontSize: TY.body, lineHeight: 1.5, marginTop: 10 }}>{body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexShrink: 0, borderTop: line, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {last
          ? <>
            <button onClick={() => close(false)} style={{ ...button, flex: 1, minHeight: 56, borderRight: line }}>Look around first</button>
            <button onClick={() => close(true)} style={{ ...button, flex: 1, minHeight: 56 }}>Connect AI<Arrow dir="right" style={{ marginLeft: 8 }}/></button>
          </>
          : <button onClick={() => moveBy(1)} style={{ ...button, flex: 1, minHeight: 56 }}>Next<Arrow dir="right" style={{ marginLeft: 8 }}/></button>}
      </div>
    </div>
  );
}
