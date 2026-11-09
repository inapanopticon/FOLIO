// Folio — bottom sheets: drawer menu and the Dialog that replaces the browser's prompt/confirm

// Every sheet floats above the bottom edge like an iPhone action sheet: rounded cards, centred actions, Cancel on its own.
const SHEET_LINE = '1px solid var(--line)';
const floatCard = { background: 'var(--cream)', borderRadius: 13, overflow: 'hidden' };
const floatHeading = { fontSize: TY.body, fontWeight: 400, lineHeight: 1.3, color: 'var(--ink)', textAlign: 'center', overflowWrap: 'anywhere' };
const floatAction = { display: 'block', width: '100%', minHeight: 57, padding: '16px 18px', border: 'none', borderRadius: 0, background: 'transparent', fontSize: TY.body, fontWeight: 400, lineHeight: 1.3, textAlign: 'center', cursor: 'pointer', color: 'var(--ink)' };
function FloatingSheet({ onClose, zIndex, role, label, children }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex, background: 'rgba(29,28,26,0.35)', display: 'flex', alignItems: 'flex-end',
      padding: '0 12px calc(env(safe-area-inset-bottom, 0px) + 12px)', animation: 'pgUpIn 0.2s ease both' }}>
      <div role={role} aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {children}
        <div style={floatCard}><button onClick={onClose} style={floatAction}>Cancel</button></div>
      </div>
    </div>
  );
}

// The drawer colours as dots, each at full strength. A ring marks the current one; pale dots get a hairline so they stay visible.
function ColorDots({ value, onPick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', padding: '8px 10px 12px' }}>
      {THEME.PALETTE.map((p, i) => (
        <button key={p.name} onClick={() => onPick(i)} aria-label={p.name} aria-pressed={value === i}
          style={{ height: 44, padding: 0, border: 'none', borderRadius: 0, background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: p.bg,
            boxShadow: value === i ? '0 0 0 2px var(--cream), 0 0 0 3.5px var(--ink)' : 'inset 0 0 0 1px var(--line)' }}/>
        </button>
      ))}
    </div>
  );
}

// =============== DRAWER MENU (Edit from swipe, long-press or right-click) ===============
function DrawerMenu({ collection, collections, onClose, onRename, onRecolor, onDelete }) {
  const current = THEME.PALETTE.indexOf(THEME.colorOf(collection, collections));
  return (
    <FloatingSheet onClose={onClose} zIndex={250} role="dialog" label={collection.name}>
      <div style={floatCard}>
        <div style={{ ...floatHeading, padding: '16px 18px 0' }}>{collection.name}</div>
        <ColorDots value={current} onPick={onRecolor}/>
        <button onClick={onRename} style={{ ...floatAction, borderTop: SHEET_LINE }}>Rename</button>
        <button onClick={onDelete} style={{ ...floatAction, borderTop: SHEET_LINE, color: 'var(--discard)' }}>Delete drawer</button>
      </div>
    </FloatingSheet>
  );
}

// =============== CONFIRM SHEET (anything that deletes or throws work away) ===============
// What will happen, the red action, then Cancel on its own.
function ConfirmSheet({ dialog, onClose, onConfirm }) {
  return (
    <FloatingSheet onClose={onClose} zIndex={500} role="alertdialog" label={dialog.okLabel}>
      <div style={floatCard}>
        <div style={{ padding: '16px 18px', borderBottom: SHEET_LINE, fontSize: TY.caption, lineHeight: 1.5, color: 'var(--ink-2)', textAlign: 'center', overflowWrap: 'anywhere' }}>{dialog.message}</div>
        <button onClick={onConfirm} style={{ ...floatAction, color: 'var(--discard)' }}>{dialog.okLabel}</button>
      </div>
    </FloatingSheet>
  );
}

// =============== DIALOG (replaces the browser's prompt/confirm) ===============
// dialog = { title, message?, input?: defaultValue, placeholder?, color?: defaultIndex, okLabel, danger?, onOk(value, colorIndex) }
// danger dialogs need only message and okLabel: they show as a ConfirmSheet.
function Dialog({ dialog, onClose }) {
  const [value, setValue] = useState(dialog.input ?? '');
  const [color, setColor] = useState(dialog.color);
  const ref = useRef();
  useEffect(() => { if (dialog.input !== undefined) setTimeout(() => ref.current?.focus(), 120); }, []);
  const hasInput = dialog.input !== undefined;
  const can = !hasInput || value.trim().length > 0;
  const ok = () => { if (!can) return; onClose(); dialog.onOk(hasInput ? value.trim() : true, color); };
  if (dialog.danger) return <ConfirmSheet dialog={dialog} onClose={onClose} onConfirm={ok}/>;

  return (
    <FloatingSheet onClose={onClose} zIndex={500} role="dialog" label={dialog.title}>
      <div style={floatCard}>
        <div style={{ ...floatHeading, padding: hasInput ? '16px 18px 12px' : '16px 18px' }}>{dialog.title}</div>
        {/* a tinted, rounded, left-aligned box, so it reads as something to type in and the title above does not */}
        {hasInput && <div style={{ padding: '0 12px 14px' }}>
          <input ref={ref} value={value} onChange={(e) => setValue(e.target.value)} placeholder={dialog.placeholder || ''}
            onKeyDown={(e) => { if (isSubmitEnter(e)) ok(); }}
            style={{ display: 'block', width: '100%', minHeight: 46, padding: '12px 14px', border: 'none', borderRadius: 9, outline: 'none',
              background: 'var(--band)', fontFamily: 'var(--sans)', fontSize: TY.body, lineHeight: 1.3, textAlign: 'left', color: 'var(--ink)' }}/>
        </div>}
        {dialog.color !== undefined && <div style={{ borderTop: SHEET_LINE }}><ColorDots value={color} onPick={setColor}/></div>}
        <button onClick={ok} disabled={!can} style={{ ...floatAction, borderTop: SHEET_LINE, opacity: can ? 1 : 0.35, cursor: can ? 'pointer' : 'default' }}>{dialog.okLabel || 'OK'}</button>
      </div>
    </FloatingSheet>
  );
}
