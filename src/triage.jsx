// Folio — manual photo review before AI, normal detail review after AI.
const {useState:useTState,useRef:useTRef,useEffect:useTEffect}=React;

// Before AI: review full images and persist each keep/skip choice.
function PhotoReviewScreen({ batchId, tasks, batch, palette, hintSeen, onBack, onChange, onOrganize, onSettings, canOrganize }) {
  const P=window.LocusImports;
  const pending=tasks.filter(t=>t.state==='screen');
  const selected=tasks.filter(t=>['ready','error'].includes(t.state));
  const skipped=tasks.filter(t=>t.state==='skipped');
  const current=pending[0];
  const [error,setError]=useTState('');
  const [drag,setDrag]=useTState(0);
  const start=useTRef(null);
  const scroll=useTRef(null);
  useTEffect(()=>{if(scroll.current)scroll.current.scrollTop=0;},[current?.id]);
  const line='1px solid var(--line)';
  const button={border:'none',borderRadius:0,background:'transparent',color:'inherit',cursor:'pointer',fontSize:TY.caption,fontWeight:400};
  const act=fn=>{try{fn();setError('');onChange();}catch(e){setError(e.message);}};
  const choose=keep=>{if(current)act(()=>P.screen(current.id,keep));};
  const down=e=>{start.current={x:e.clientX,y:e.clientY};try{e.currentTarget.setPointerCapture(e.pointerId);}catch(err){}};
  const move=e=>{if(!start.current)return;const x=e.clientX-start.current.x,y=e.clientY-start.current.y;if(Math.abs(x)>Math.abs(y))setDrag(x);};
  const up=e=>{if(!start.current)return;const x=e.clientX-start.current.x,y=e.clientY-start.current.y;start.current=null;setDrag(0);if(Math.abs(x)>90&&Math.abs(x)>Math.abs(y))choose(x>0);};
  const completed=tasks.filter(t=>t.screened && !['saving','save-error','removed'].includes(t.state)).length;
  const undoable=(batch.screenHistory || []).some(id=>tasks.some(t=>t.id===id && ['ready','skipped'].includes(t.state)));
  // computers can't swipe: arrow keys do the same, Backspace or Z undoes
  useTEffect(()=>{
    const key=e=>{
      if(e.target.closest && e.target.closest('input,textarea'))return;
      if(e.key==='ArrowLeft' && current){e.preventDefault();choose(false);}
      else if(e.key==='ArrowRight' && current){e.preventDefault();choose(true);}
      else if((e.key==='Backspace' || e.key==='z' || e.key==='Z') && undoable){e.preventDefault();act(()=>P.undoScreen(batchId));}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[current?.id,undoable]);
  const keepHint=Math.max(0,Math.min(1,drag/90)), skipHint=Math.max(0,Math.min(1,-drag/90));
  return <div className="page"><div className="content">
    <StatusBar/>
    <div style={{display:'flex',height:52,flexShrink:0,borderTop:line,borderBottom:line}}>
      <button aria-label="Back to import" onClick={onBack} style={{...button,width:56,borderRight:line,display:'grid',placeItems:'center'}}><Arrow size={20}/></button>
      <div style={{padding:'17px 18px',fontSize:TY.caption,letterSpacing:'0.12em'}}>REVIEW PHOTOS{current ? ` · ${completed+1}/${completed+pending.length}` : ''}</div>
    </div>
    <ImportSteps step={current ? 2 : 3} line={line}/>
    {error && <div role="alert" style={{padding:18,fontSize:TY.caption,lineHeight:1.5,borderBottom:line}}>{error}</div>}
    {current ? <>
      <div ref={scroll} className="scroll-y" style={{flex:1,minHeight:0}}>
        <div aria-label="Photo to review" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{start.current=null;setDrag(0);}} style={{touchAction:'pan-y',transform:`translateX(${drag*0.2}px)`,transition:drag ? 'none' : 'transform .15s'}}>
          <Shot imageId={current.imageId} fit="natural" style={{width:'100%'}}/>
          <div aria-hidden="true" style={{position:'sticky',bottom:0,display:'flex',justifyContent:'space-between',padding:'0 14px 14px',pointerEvents:'none',marginTop:-46}}>
            <span style={{padding:'6px 12px',borderRadius:99,background:'var(--ink)',color:'var(--cream)',fontSize:TY.caption,opacity:skipHint}}>Skip</span>
            <span style={{padding:'6px 12px',borderRadius:99,background:'var(--ink)',color:'var(--cream)',fontSize:TY.caption,opacity:keepHint}}>Keep for AI</span>
          </div>
        </div>
      </div>
      <div style={{display:'flex',flexShrink:0,borderTop:line,paddingBottom:'env(safe-area-inset-bottom, 0px)'}}>
        <button onClick={()=>choose(false)} title="Skip (left arrow key)" style={{...button,flex:2,minHeight:60,borderRight:line,fontSize:TY.label}}><Arrow style={{marginRight:8}}/>Skip</button>
        <button disabled={!undoable} onClick={()=>act(()=>P.undoScreen(batchId))} title="Undo (Backspace)" style={{...button,flex:1,minHeight:60,borderRight:line,color:'var(--ink-2)',opacity:undoable ? 1 : 0.35}}>Undo</button>
        <button onClick={()=>choose(true)} title="Keep for AI (right arrow key)" style={{...button,flex:2,minHeight:60,fontSize:TY.label,background:palette?.bg || 'var(--ink)',color:palette?.fg || 'var(--cream)'}}>Keep for AI<Arrow dir="right" style={{marginLeft:8}}/></button>
      </div>
    </> : <>
      <div className="scroll-y" style={{flex:1,minHeight:0}}>
        <div style={{padding:'28px 18px',borderBottom:line}}><div style={{fontSize:TY.title,lineHeight:1.3}}>{selected.length} {selected.length===1 ? 'photo' : 'photos'} kept for AI</div>{skipped.length>0 && <div style={{fontSize:TY.caption,lineHeight:1.6,marginTop:12}}>{skipped.length} skipped</div>}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))'}}>{selected.slice(0,60).map(t=><Shot key={t.id} imageId={t.imageId} style={{width:'100%',aspectRatio:'1',borderRight:line,borderBottom:line}}/>)}</div>
        {!canOrganize && selected.length>0 && <button onClick={onSettings} style={{...button,padding:18,width:'100%',textAlign:'left',borderBottom:line}}>Connect Qianwen in Settings<Arrow dir="right" style={{marginLeft:8}}/></button>}
      </div>
      <div style={{display:'flex',borderTop:line,flexShrink:0,paddingBottom:'env(safe-area-inset-bottom, 0px)'}}>
        <button disabled={!undoable} onClick={()=>act(()=>P.undoScreen(batchId))} style={{...button,width:80,minHeight:56,borderRight:line,opacity:undoable ? 1 : 0.35}}>Undo</button>
        {selected.length>0 ? <button disabled={!canOrganize} onClick={onOrganize} style={{...button,flex:1,minHeight:56,background:palette?.bg || 'var(--paper)',color:palette?.fg || 'inherit',opacity:canOrganize ? 1 : 0.4}}>Organize {selected.length} {selected.length===1 ? 'photo' : 'photos'}<Arrow dir="right" style={{marginLeft:8}}/></button> : <button onClick={onBack} style={{...button,flex:1,minHeight:56}}>Back to import</button>}
      </div>
    </>}
  </div></div>;
}

// After AI: reuse the normal detail and edit screens; save only on confirmation.
function TriageScreen({ queue, collections, onComplete, onBack, onToast, onAskName, onDecision, onUndo, canUndo }) {
  const current=queue[0];
  const [editing,setEditing]=useTState(false);
  const [error,setError]=useTState('');
  const total=useTRef(queue.length);total.current=Math.max(total.current,queue.length);
  const P=window.LocusImports;
  if(!current)return null;
  const existing=collections.find(c=>c.name===current.aiGuess);
  const proposed=existing || {id:`suggested:${current.aiGuess}`,name:current.aiGuess || 'Unsorted',color:window.LocusTheme.nextColor(collections),tags:current.tags || []};
  const available=existing ? collections : [...collections,proposed];
  const cap={id:`review_${current.id}`,title:current.title || [current.source,current.user].filter(Boolean).join(' · ') || 'Untitled',summary:current.summary || current.text || '',tags:current.tags || [],note:current.note || '',imageId:current.imageId,glyph:current.glyph,collection:proposed.id,source:current.source,date:new Date(current.addedAt || Date.now()).toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'})};
  const act=fn=>{try{fn();setError('');}catch(e){setError(e.message);}};
  const decide=(action,before=()=>{})=>act(()=>{before();onDecision({item:current,action,collection:current.aiGuess});if(queue.length===1)onComplete();});
  if(editing)return <EditScreen key={current.id} capture={cap} collection={proposed} collections={available} onCancel={()=>setEditing(false)} onSave={updated=>{P.updateItem(current.id,{title:updated.title,summary:updated.summary,tags:updated.tags,aiGuess:available.find(c=>c.id===updated.collection)?.name || current.aiGuess});setEditing(false);}}/>;
  const color=window.LocusTheme.colorOf(proposed,available);
  const hair=`1px solid color-mix(in srgb, ${color.fg} 28%, transparent)`;
  const footer=({saveNote})=><div style={{display:'flex',width:'100%',minHeight:56}}>
    <button onClick={()=>decide('discard',saveNote)} style={{flex:1,border:'none',borderRight:hair,background:'transparent',color:'inherit',fontSize:TY.caption,cursor:'pointer'}}>Skip</button>
    <button disabled={!canUndo} onClick={()=>act(onUndo)} style={{flex:1,border:'none',borderRight:hair,background:'transparent',color:'inherit',fontSize:TY.caption,cursor:'pointer',opacity:canUndo ? 1 : 0.35}}>Undo</button>
    <button onClick={()=>decide('keep',saveNote)} style={{flex:1.5,border:'none',background:'transparent',color:'inherit',fontSize:TY.caption,cursor:'pointer'}}>Save to drawer<Arrow dir="right" style={{marginLeft:8}}/></button>
  </div>;
  return <DetailScreen key={current.id} steps={(()=>{const c=window.LocusTheme.colorOf(proposed, available);return <ImportSteps step={4} line={`1px solid color-mix(in srgb, ${c.fg} 28%, transparent)`} fill={c.fg} onFill={c.bg}/>;})()} capture={cap} collection={proposed} collections={available} captures={[cap]} onBack={onBack} onEdit={()=>setEditing(true)} onOpenTag={()=>setEditing(true)} onUpdate={updated=>P.updateItem(current.id,{note:updated.note})} onToast={onToast} reviewInfo={{index:total.current-queue.length+1,total:total.current}} footer={footer} error={error}/>;
}

window.LocusTriage = {TriageScreen, PhotoReviewScreen};
