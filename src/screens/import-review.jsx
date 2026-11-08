// Folio — step 2 of an import: go through the photos, keep or skip each, and clip together the ones from one post.
// Swiping only moves between photos. A choice is never final: go back to a photo and press something else.

const isKeptPhoto = t => ['ready', 'error'].includes(t.state);
// Kept photos in order, grouped into posts: a clipped photo joins the photo kept before it.
function clipGroups(kept) {
  const groups = [];
  kept.forEach(t => { if (t.clipped && groups.length) groups[groups.length - 1].push(t); else groups.push([t]); });
  return groups;
}

const SWIPE_PX = 60;

function PhotoReviewScreen({ tasks, palette, onBack, onChange, onOrganize, onSettings, canOrganize }) {
  const P = window.LocusImports;
  const photos = tasks.filter(t => t.state === 'screen' || t.state === 'skipped' || isKeptPhoto(t));
  // starts at the first undecided photo; pos === photos.length is the overview
  const [pos, setPos] = useState(() => { const i = photos.findIndex(t => t.state === 'screen'); return i < 0 ? photos.length : i; });
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(0);
  const start = useRef(null);
  const scroll = useRef(null);
  const current = photos[pos];
  const kept = photos.filter(isKeptPhoto);
  const skipped = photos.filter(t => t.state === 'skipped');
  const undecided = photos.filter(t => t.state === 'screen');
  const groups = clipGroups(kept);

  const line = HAIR;
  const button = { border: 'none', borderRadius: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', fontSize: TY.caption, fontWeight: 400 };
  const act = fn => { try { fn(); setError(''); onChange(); } catch (e) { setError(e.message); } };
  const moveBy = n => setPos(p => Math.max(0, Math.min(photos.length, p + n)));

  useEffect(() => { if (scroll.current) scroll.current.scrollTop = 0; }, [current?.id]);
  useEffect(() => { // computers can't swipe: the arrow keys do the same
    const key = e => {
      if (e.target.closest && e.target.closest('input,textarea')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveBy(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); moveBy(1); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [photos.length]);

  const down = e => { start.current = { x: e.clientX, y: e.clientY }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} };
  const move = e => {
    if (!start.current) return;
    const x = e.clientX - start.current.x, y = e.clientY - start.current.y;
    if (Math.abs(x) > Math.abs(y)) setDrag(x);
  };
  const up = e => {
    if (!start.current) return;
    const x = e.clientX - start.current.x, y = e.clientY - start.current.y;
    start.current = null; setDrag(0);
    if (Math.abs(x) > SWIPE_PX && Math.abs(x) > Math.abs(y)) moveBy(x < 0 ? 1 : -1);
  };

  const canClip = !!current && photos.slice(0, pos).some(isKeptPhoto);
  const isClipped = !!current && isKeptPhoto(current) && canClip && !!current.clipped;
  const group = current && groups.find(g => g.includes(current));
  const chosen = { background: palette?.bg || 'var(--ink)', color: palette?.fg || 'var(--cream)' };
  const choiceCell = (selected, last) => ({ ...button, flex: 1, minHeight: 60, borderRight: last ? 'none' : line, fontSize: TY.label, ...(selected ? chosen : null) });
  const choose = keep => { act(() => P.choose(current.id, keep)); moveBy(1); };
  const clip = () => {
    if (isClipped) { act(() => P.setClipped(current.id, false)); return; } // pressing again lets go; the photo stays kept
    act(() => P.setClipped(current.id, true));
    moveBy(1);
  };

  return <div className="page"><div className="content">
    <StatusBar/>
    <div style={headerBar(line)}>
      <button aria-label="Back to import" onClick={onBack} style={{ ...button, width: 56, borderRight: line, display: 'grid', placeItems: 'center' }}><Arrow size={20}/></button>
      <div style={{ padding: '17px 18px', fontSize: TY.caption, letterSpacing: '0.12em' }}>REVIEW PHOTOS{current ? ` · ${pos + 1}/${photos.length}` : ''}</div>
    </div>
    <ImportSteps step={current ? 2 : 3} line={line}/>
    {error && <div role="alert" style={{ padding: 18, fontSize: TY.caption, lineHeight: 1.5, borderBottom: line }}>{error}</div>}

    {current ? <>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
        {group && group.length > 1 && (
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--ink)', color: 'var(--cream)', fontSize: TY.caption, lineHeight: 1.4, pointerEvents: 'none' }}>
            <ClipIcon size={14}/>{group.indexOf(current) + 1} of {group.length}
          </div>
        )}
        <div ref={scroll} className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
          <div aria-label="Photo to review" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { start.current = null; setDrag(0); }}
            style={{ touchAction: 'pan-y', transform: `translateX(${drag * 0.2}px)`, transition: drag ? 'none' : 'transform .15s' }}>
            <Shot imageId={current.imageId} fit="natural" style={{ width: '100%' }}/>
          </div>
        </div>
      </div>
      <div key="choices" style={{ display: 'flex', flexShrink: 0, borderTop: line, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <button aria-pressed={current.state === 'skipped'} onClick={() => choose(false)} style={choiceCell(current.state === 'skipped')}>Skip</button>
        <button aria-pressed={isClipped} disabled={!canClip} onClick={clip} title="Clip to the photo before" style={{ ...choiceCell(isClipped), opacity: canClip ? 1 : 0.35, cursor: canClip ? 'pointer' : 'default' }}>
          <ClipIcon size={16} style={{ marginRight: 7, verticalAlign: '-0.18em' }}/>Clip
        </button>
        <button aria-pressed={isKeptPhoto(current) && !isClipped} onClick={() => choose(true)} style={choiceCell(isKeptPhoto(current) && !isClipped, true)}>Keep for AI</button>
      </div>
    </> : <>
      <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ padding: '28px 18px', borderBottom: line }}>
          <div style={{ fontSize: TY.title, lineHeight: 1.3 }}>{plural(groups.length, 'post')} · {plural(kept.length, 'photo')}</div>
          <div style={{ fontSize: TY.caption, lineHeight: 1.6, marginTop: 12, color: 'var(--ink-2)' }}>
            {skipped.length > 0 && <div>{skipped.length} skipped</div>}
            <div>Tap a clip to separate photos. Tap between two posts to clip them.</div>
          </div>
        </div>
        {undecided.length > 0 && (
          <button onClick={() => setPos(photos.indexOf(undecided[0]))} style={{ ...button, padding: 18, width: '100%', textAlign: 'left', borderBottom: line, fontSize: TY.label }}>
            {plural(undecided.length, 'photo')} not decided yet<Arrow dir="right" style={{ marginLeft: 8 }}/>
          </button>
        )}
        {groups.map((g, i) => <React.Fragment key={g[0].id}>
          {i > 0 && (
            <button aria-label={`Clip post ${i + 1} to the post above`} onClick={() => act(() => P.setClipped(g[0].id, true))}
              style={{ ...button, display: 'grid', placeItems: 'center', width: '100%', height: 30, borderBottom: line, color: 'var(--ink-3)' }}>
              <ClipIcon size={14}/>
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: line }}>
            <div style={{ width: 44, flexShrink: 0, paddingTop: 12, textAlign: 'center', fontSize: TY.caption, color: 'var(--ink-2)' }}>{i + 1}</div>
            <div className="scroll-y" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
              {g.map((t, j) => <React.Fragment key={t.id}>
                {j > 0 && (
                  <button aria-label="Separate these photos" onClick={() => act(() => P.setClipped(t.id, false))}
                    style={{ ...button, flexShrink: 0, width: 36, height: 84, display: 'grid', placeItems: 'center' }}>
                    <ClipIcon size={16}/>
                  </button>
                )}
                <button aria-label={`Go back to photo ${photos.indexOf(t) + 1}`} onClick={() => setPos(photos.indexOf(t))} style={{ ...button, flexShrink: 0, width: 84, height: 84, padding: 0, borderLeft: j === 0 ? line : 'none' }}>
                  <Shot imageId={t.imageId} style={{ width: 84, height: 84 }}/>
                </button>
              </React.Fragment>)}
            </div>
          </div>
        </React.Fragment>)}
        {!canOrganize && kept.length > 0 && <button onClick={onSettings} style={{ ...button, padding: 18, width: '100%', textAlign: 'left', borderBottom: line }}>Connect AI in Settings<Arrow dir="right" style={{ marginLeft: 8 }}/></button>}
      </div>
      <div key="overview" style={{ display: 'flex', borderTop: line, flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {photos.length > 0 && <button onClick={() => moveBy(-1)} style={{ ...button, width: 96, minHeight: 56, borderRight: line }}><Arrow style={{ marginRight: 8 }}/>Photos</button>}
        {kept.length > 0
          ? <button disabled={!canOrganize || undecided.length > 0} onClick={onOrganize} style={{ ...button, flex: 1, minHeight: 56, background: palette?.bg || 'var(--paper)', color: palette?.fg || 'inherit', opacity: canOrganize && !undecided.length ? 1 : 0.4 }}>Organize {plural(groups.length, 'post')}<Arrow dir="right" style={{ marginLeft: 8 }}/></button>
          : <button onClick={onBack} style={{ ...button, flex: 1, minHeight: 56 }}>Back to import</button>}
      </div>
    </>}
  </div></div>;
}
