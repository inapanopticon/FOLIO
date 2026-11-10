// Folio — Settings: the AI service, preferences, export

function SettingsScreen({ onClose, onToast, onExport, onShowIntro }) {
  const AI = window.LocusAI;
  const [s, setS] = useState(() => AI.load());
  const [status, setStatus] = useState(null); // backup and restore problems: {kind:'err', msg}
  const [testResult, setTestResult] = useState(null); // {kind:'ok'|'err'|'busy', msg}
  const [show, setShow] = useState(false);
  const pick = (patch) => { setS((p) => ({ ...p, ...patch })); setStatus(null); setTestResult(null); };
  const set = (k, v) => pick({ [k]: v });
  const canTest = AI.isConfigured(s) && testResult?.kind !== 'busy';

  const Backup = window.LocusBackup;
  const [working, setWorking] = useState(null); // 'backup' | 'restore' while one is running
  const [confirm, setConfirm] = useState(null);
  const [persisted, setPersisted] = useState(null);
  const restoreRef = useRef();
  useEffect(() => { window.LocusStore.isDataKept().then(setPersisted); }, []);
  const run = async (kind, fn) => {
    if (working) return;
    setWorking(kind); setStatus(null);
    try { await fn(); }
    catch (e) { setStatus({ kind: 'err', msg: e.message || 'Something went wrong. Nothing was changed.' }); }
    finally { setWorking(null); }
  };
  const backup = () => run('backup', async () => {
    const r = await Backup.create();
    onToast(`Backup saved · ${plural(r.captures, 'capture')} · ${plural(r.images, 'image')}`);
  });
  const restore = parsed => run('restore', async () => {
    await Backup.restore(parsed);
    onToast('Backup restored');
    setTimeout(() => window.location.reload(), 900); // start clean from the restored data
  });
  const chooseBackup = file => run('restore', async () => {
    const parsed = await Backup.read(file);
    const when = parsed.createdAt ? THEME.formatDate(parsed.createdAt) : 'an earlier date';
    setConfirm({
      okLabel: 'Replace everything', danger: true,
      message: `Backup from ${when}: ${plural(parsed.drawers, 'drawer')}, ${plural(parsed.captures, 'capture')}, ${plural(parsed.images, 'image')}. Everything now in Folio will be replaced. This can't be undone.`,
      onOk: () => restore(parsed),
    });
  });

  const saveAndClose = () => { AI.save(s); onToast('Settings saved'); onClose(); };
  const closeWithoutSaving = () => {
    const saved = AI.load();
    if (!Object.keys({ ...saved, ...s }).some(k => (s[k] || '') !== (saved[k] || ''))) { onClose(); return; }
    setConfirm({ message: "Your changes to Settings won't be saved.", okLabel: 'Discard changes', danger: true, onOk: () => onClose() });
  };
  const test = async () => {
    setTestResult({ kind: 'busy', msg: 'Testing…' });
    try { await AI.test(s); AI.save(s); setTestResult({ kind: 'ok', msg: `Connected · ${s.customModel.trim()}` }); }
    catch (e) { setTestResult({ kind: 'err', msg: e.message }); }
  };

  const line = HAIR;
  const label = { display: 'block', fontSize: TY.caption, letterSpacing: '0.12em', color: 'var(--ink-2)', lineHeight: 1.5 };
  const heading = { padding: '14px 18px', borderBottom: line, background: 'var(--band)' };
  const headingLabel = { ...label, color: 'var(--ink)' };
  const section = { padding: '18px', borderBottom: line };
  const button = { background: 'transparent', border: 'none', borderRadius: 0, color: 'inherit', cursor: 'pointer', fontSize: TY.caption, fontWeight: 400 };
  const dataRow = (onClick, title, note) => (
    <button disabled={!!working} onClick={onClick} style={{ ...button, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '18px', textAlign: 'left', width: '100%', borderBottom: line }}>
      <span><span style={{ display: 'block', fontSize: TY.body, lineHeight: 1.5 }}>{title}</span><span style={{ display: 'block', fontSize: TY.caption, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 6 }}>{note}</span></span><Arrow dir="right"/>
    </button>
  );
  const fieldLabel = { ...label, padding: '14px 18px 0' };
  const keyLink = (href, title) => <a href={href} target="_blank" rel="noreferrer" style={{ display: 'block', width: 'fit-content', color: 'inherit', textUnderlineOffset: 3 }}>{title}</a>;
  const field = { width: '100%', minWidth: 0, background: 'transparent', border: 'none', borderRadius: 0, outline: 'none', color: 'var(--ink)', fontSize: TY.body, lineHeight: 1.5, padding: '14px 18px' };

  return (
    <div className="page settings-screen">
      <div className="content">
        <StatusBar/>
        <div style={headerBar(line)}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: TY.caption, letterSpacing: '0.12em' }}>SETTINGS</div>
          <button aria-label="Close" onClick={closeWithoutSaving} style={{ ...button, width: 56, borderLeft: line, display: 'grid', placeItems: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
          <div style={heading}><div style={headingLabel}>AI MODEL</div></div>
          <label htmlFor="settings-address" style={fieldLabel}>API ADDRESS</label>
          <input id="settings-address" value={s.customBaseUrl} onChange={e=>set('customBaseUrl',e.target.value)} placeholder="https://api.example.com/v1" autoComplete="off" spellCheck={false} style={{ ...field, borderBottom: line }}/>
          <label htmlFor="settings-key" style={fieldLabel}>API KEY</label>
          <div style={{ display: 'flex', borderBottom: line }}>
            <input id="settings-key" type={show ? 'text' : 'password'} value={s.customKey} onChange={e=>set('customKey',e.target.value)} placeholder="Your API key" autoComplete="off" spellCheck={false} style={{ ...field, flex: 1 }}/>
            <button onClick={()=>setShow(v=>!v)} aria-pressed={show} style={{ ...button, width: 72, flexShrink: 0, borderLeft: line }}>{show ? 'Hide' : 'Show'}</button>
          </div>
          <label htmlFor="settings-model" style={fieldLabel}>MODEL NAME</label>
          <input id="settings-model" value={s.customModel} onChange={e=>set('customModel',e.target.value)} placeholder="The exact model name" autoComplete="off" spellCheck={false} style={{ ...field, borderBottom: line }}/>
          <div style={{ ...section, fontSize: TY.caption, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            The model must be able to read images. Some services refuse calls from web pages, and those won't work here. Your key stays in this browser and is sent only to the address above.
            {AI.isTokenPlanKey(s.customKey) && <div style={{ marginTop: 12 }}>This looks like a Qianwen Token Plan key (sk-sp-…). That plan doesn't accept calls from web pages, so please use a pay-as-you-go key.</div>}
            <div style={{ marginTop: 12 }}>
              {keyLink('https://aistudio.google.com/apikey', 'Get a Gemini key')}
              {keyLink('https://platform.qianwenai.com/home/api-keys', 'Get a Qianwen key')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 56, borderBottom: line }}>
            <button onClick={test} disabled={!canTest} style={{ ...button, flexShrink: 0, padding: '0 18px', fontSize: TY.body, borderRight: testResult ? line : 'none', opacity: canTest ? 1 : 0.4 }}>Test connection</button>
            <div role="status" aria-live="polite" style={{ flex: 1, minWidth: 0, alignSelf: 'center', padding: '10px 18px', fontSize: TY.caption, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{testResult?.msg}</div>
          </div>
          <div style={heading}><label htmlFor="settings-preferences" style={headingLabel}>ORGANIZATION PREFERENCES</label></div>
          <textarea id="settings-preferences" value={s.preferences || ''} onChange={e=>set('preferences',e.target.value)} rows={4} placeholder="How should AI organize your photos?" style={{...field,display:'block',resize:'vertical',borderBottom:line}}/>
          {s.preferences && <button onClick={()=>set('preferences','')} style={{...button,padding:'14px 18px',borderBottom:line,width:'100%',textAlign:'left'}}>Reset preferences</button>}
          <div style={heading}><div style={headingLabel}>YOUR DATA</div></div>
          {dataRow(onExport, 'Export as Markdown', 'Every drawer, title, summary, tag and note, as text. No images.')}
          {dataRow(backup, working === 'backup' ? 'Preparing backup…' : 'Back up everything', 'One zip with everything and all images, to restore later. Your API key is not included.')}
          {dataRow(() => restoreRef.current?.click(), working === 'restore' ? 'Restoring…' : 'Restore from backup', 'Replaces everything in Folio with a backup file.')}
          <input ref={restoreRef} type="file" accept=".zip,application/zip" hidden onChange={e => { const f = e.target.files[0]; e.target.value = ''; if (f) chooseBackup(f); }}/>
          {persisted !== null && <div style={{ ...section, fontSize: TY.caption, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            {persisted ? 'This browser has agreed to keep your data.' : 'This browser may clear saved data when space runs low. Add Folio to your Home Screen and keep a backup.'}
          </div>}
          <div style={heading}><div style={headingLabel}>HELP</div></div>
          {dataRow(onShowIntro, 'Show intro again', 'A quick look at how Folio works.')}
          {status && <div role="status" aria-live="polite" style={{ ...section, fontSize: TY.caption, lineHeight: 1.6, overflowWrap: 'anywhere' }}>{status.msg}</div>}
          <div style={{ height: 24 }}/>
        </div>
        <div style={{ display: 'flex', flexShrink: 0, borderTop: line, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <button onClick={saveAndClose} style={{ ...button, flex: 1, minHeight: 56, padding: '16px' }}>Save</button>
        </div>
      </div>
      {confirm && <Dialog key="restore" dialog={confirm} onClose={() => setConfirm(null)}/>}
      <style>{`.settings-screen input::placeholder, .settings-screen textarea::placeholder { color: var(--ink-2); opacity: 0.65; }`}</style>
    </div>
  );
}
