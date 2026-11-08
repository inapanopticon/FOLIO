// Folio — the stack of open pages, the slide between them, and the drawer card growing to full screen.

const EXPAND_MS = 420;

// colorOfDrawer(id): the drawer's colour, or null if it no longer exists.
function useRouter(colorOfDrawer) {
  // no separate splash: the app opens straight onto home, which unfolds itself
  const [stack, setStack] = useState([{ name: 'home', anim: 'none' }]);
  const [animKey, setAnimKey] = useState(0);
  const [transitioning, setTransitioning] = useState(null); // outgoing page, for its exit animation
  const [expand, setExpand] = useState(null); // { color, from, full } — the card growing to full screen
  const appRef = useRef();
  const cur = stack[stack.length - 1];

  const withLastAnim = (pages, anim) => pages.map((p, i, a) => (i === a.length - 1 ? { ...p, anim } : p));
  const go = (nextStack, out) => {
    // 'swap' = same frame on both pages: show the new page at once, no old copy underneath
    setTransitioning(out === 'swap' ? null : { ...cur, _out: out });
    setStack(nextStack);
    setAnimKey(k => k + 1);
    setTimeout(() => setTransitioning(null), 320);
  };
  const push = (page, anim = 'fwd') => go([...stack, { ...page, anim }], anim);
  const pop = (anim = 'back') => { if (stack.length > 1) go(withLastAnim(stack.slice(0, -1), anim), anim); };
  const popTo = (depth, anim = 'back') => go(withLastAnim(stack.slice(0, depth), anim), anim);
  const replace = (page, anim = 'fwd') => go([...stack.slice(0, -1), { ...page, anim }], anim);
  const reset = (page, anim = 'back') => go([{ ...page, anim }], anim);
  // remember something on the current page (its tag filter, search text) without moving
  const updateTop = patch => setStack(s => s.map((p, i) => (i === s.length - 1 ? { ...p, ...patch } : p)));

  // Card → full screen: a block in the drawer's colour grows from the card's spot, then the drawer page takes over.
  const toAppRect = r => {
    const a = appRef.current.getBoundingClientRect();
    return { top: r.top - a.top, left: r.left - a.left, width: r.width, height: r.height };
  };
  const nextFrame = fn => requestAnimationFrame(() => requestAnimationFrame(fn));
  const openDrawer = (id, rect) => {
    const color = colorOfDrawer(id);
    if (!color) return; // deleted a moment ago, e.g. in another tab
    if (!rect || !appRef.current) return push({ name: 'drawer', collId: id });
    const from = toAppRect(rect);
    setExpand({ color, from, full: false });
    nextFrame(() => setExpand(e => e && { ...e, full: true }));
    setTimeout(() => {
      setTransitioning(null);
      setStack(s => [...s, { name: 'drawer', collId: id, anim: 'none', from }]);
      setAnimKey(k => k + 1);
      setExpand(null);
    }, EXPAND_MS);
  };
  const closeDrawer = () => {
    const color = colorOfDrawer(cur.collId);
    if (!cur.from || !color) return pop();
    setExpand({ color, from: cur.from, full: true });
    setTransitioning(null);
    setStack(s => withLastAnim(s.slice(0, -1), 'none'));
    setAnimKey(k => k + 1);
    nextFrame(() => setExpand(e => e && { ...e, full: false }));
    setTimeout(() => setExpand(null), EXPAND_MS);
  };

  return { stack, cur, animKey, transitioning, expand, appRef, push, pop, popTo, replace, reset, updateTop, openDrawer, closeDrawer };
}
