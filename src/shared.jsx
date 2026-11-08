// Folio — small pieces every screen shares. Loaded first, because the screens rely on these names.

const { useState, useEffect, useRef, useMemo } = React;
const THEME = window.LocusTheme;
// type scale shared by every screen: TY.title 28 · TY.body 17 · TY.label 15 · TY.caption 13
const TY = THEME.TYPE;
const HAIR = '1px solid var(--line)';

// Enter that means "submit", not "confirm this word" in a Chinese input method. Safari reports the
// confirming Enter with keyCode 229 and isComposing already false, so both have to be checked.
const isSubmitEnter = e => e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229;

// The grid row at the top of every page.
const headerBar = line => ({ display: 'flex', alignItems: 'stretch', height: 52, flexShrink: 0, borderTop: line, borderBottom: line });

// Tints the phone's status bar to match the page while it is open. Pages overlap during a transition and
// close in any order, so the colours are kept as a list: the newest page wins, and with none open it is the default.
const statusBarMeta = document.querySelector('meta[name="theme-color"]');
const statusBarDefault = statusBarMeta?.getAttribute('content');
const statusBarTints = [];
const paintStatusBar = () => statusBarMeta?.setAttribute('content', statusBarTints[statusBarTints.length - 1]?.color || statusBarDefault);

function useStatusBarTint(color) {
  useEffect(() => {
    if (!color) return;
    const tint = { color };
    statusBarTints.push(tint);
    paintStatusBar();
    return () => {
      statusBarTints.splice(statusBarTints.indexOf(tint), 1);
      paintStatusBar();
    };
  }, [color]);
}

// The paperclip: photos from one post are clipped together.
function ClipIcon({ size = 16, style }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
    </svg>
  );
}

// A small arrow plus the phone's own picker, invisible and laid over the whole cell, so tapping
// anywhere on the cell opens it. The parent must be position: relative. 17px stops iPhones zooming in.
function Picker({ label, value, options, onChange }) {
  const known = options.some(o => o.value === value); // if not, start blank so every real option counts as a change
  return <>
    <svg aria-hidden="true" width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M1 1l4 4 4-4"/></svg>
    <select aria-label={label} value={known ? value : ''} onChange={e => onChange(e.target.value)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, fontSize: TY.body, cursor: 'pointer' }}>
      {!known && <option value="" hidden/>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </>;
}

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="6.5"/><line x1="16" y1="16" x2="21" y2="21"/></svg>
);

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
  const timer = useRef(null), start = useRef(null), fired = useRef(false);
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
function LongPressRow({ as: Tag = 'button', onLong, children, style, ...rest }) {
  const lp = useLongPress(onLong);
  return <Tag {...rest} {...lp} style={{ ...style, ...lp.style }}>{children}</Tag>;
}

// Opens the system photo picker from any button (must run inside the tap), then hands over the files.
function usePhotoPicker(onFiles) {
  const ref = useRef(null);
  const input = <input ref={ref} type="file" accept="image/*" multiple hidden
    onChange={e => { const files = Array.from(e.target.files); e.target.value = ''; if (files.length) onFiles(files); }}/>;
  return [() => ref.current?.click(), input];
}
// Remembers how far a page was scrolled (keyed by page + id), so going back lands where you left
// and the crossfade between drawer and capture pages never shows a jump.
const scrollMemory = {};
function useRememberedScroll(key) {
  const ref = useRef(null);
  useEffect(() => {
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
  const [src, setSrc] = useState(null);
  useEffect(() => {
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

// Space for the phone's own status bar / notch (the real one shows through).
function StatusBar() {
  return <div className="status-bar"/>;
}

function Toast({ message, action, onAction, onDone }) {
  // A toast with a button needs time to be tapped. onDone is left out on purpose: it changes on every redraw and would restart the clock.
  useEffect(()=>{ const t = setTimeout(onDone, action ? 3200 : 1500); return ()=>clearTimeout(t); },[message, action]);
  if (!message) return null;
  return (
    <div className="toast-host">
      <div className="toast">
        <span>{message}</span>
        {action && <button onClick={onAction}>{action}</button>}
      </div>
    </div>
  );
}
