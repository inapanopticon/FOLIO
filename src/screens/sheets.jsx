// Folio — bottom sheets: drawer menu and the Dialog that replaces the browser's prompt/confirm

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
const sheetLabel = { padding: '14px 18px', fontSize: TY.caption, letterSpacing: '0.12em', color: 'var(--ink)', background: 'var(--band)', borderTop: SHEET_LINE, borderBottom: SHEET_LINE };
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

// =============== DIALOG (replaces the browser's prompt/confirm) ===============
// dialog = { title, message?, input?: defaultValue, placeholder?, color?: defaultIndex, okLabel, danger?, onOk(value, colorIndex) }
function Dialog({ dialog, onClose }) {
  const [value, setValue] = useState(dialog.input ?? '');
  const [color, setColor] = useState(dialog.color);
  const ref = useRef();
  useEffect(() => { if (dialog.input !== undefined) setTimeout(() => ref.current?.focus(), 120); }, []);
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
          onKeyDown={(e) => { if (isSubmitEnter(e)) ok(); }}
          style={{ display: 'block', width: '100%', padding: '18px', border: 'none', borderTop: SHEET_LINE, borderRadius: 0,
            background: 'transparent', fontFamily: 'var(--sans)', fontSize: TY.body, color: 'var(--ink)' }}/>
      )}
      {dialog.color !== undefined && <>
        <div style={sheetLabel}>COLOUR</div>
        <ColorPicker value={color} onPick={setColor}/>
      </>}
      <div style={{ display: 'flex', borderTop: SHEET_LINE, boxShadow: '0 1px 0 var(--line)' }}>
        <button onClick={onClose} style={{ ...cell, borderRight: SHEET_LINE, color: 'var(--ink-2)' }}>Cancel</button>
        <button onClick={ok} disabled={!can} style={{ ...cell, background: dialog.danger ? 'var(--discard)' : 'var(--ink)', color: 'var(--cream)', opacity: can ? 1 : 0.35 }}>{dialog.okLabel || 'OK'}</button>
      </div>
    </Sheet>
  );
}
