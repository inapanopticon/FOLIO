// Durable local import ledger. Image bytes live in IndexedDB; compact task records,
// AI results, queue, captures and decision journal commit together in locus.v1.
window.LocusImports = (() => {
  const S = window.LocusStore, I = window.LocusImages;
  const uid = p => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,10)}`;
  let running = null;
  const scans = new Set();
  const snapshot = () => S.load();
  const ledger = d => d.imports || {batches:[],tasks:[],decisions:[]};
  const change = fn => S.update(d=>{ const next={...d,imports:ledger(d)};return fn(next) || next; });
  const updateTask = (id,patch) => change(d=>({...d,imports:{...d.imports,tasks:d.imports.tasks.map(t=>t.id===id ? {...t,...patch,updatedAt:Date.now()} : t)}}));
  const updateBatch = (id,patch) => change(d=>({...d,imports:{...d.imports,batches:d.imports.batches.map(b=>b.id===id ? {...b,...patch,updatedAt:Date.now()} : b)}}));
  const fingerprint = async file => {
    if(!crypto.subtle) throw Error('Secure connection required to check duplicates.');
    const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
    return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  };
  function createBatch(target) {
    const batch={id:uid('batch'),targetId:target?.id || null,targetName:target?.name || null,createdAt:Date.now(),selected:0,processed:0,duplicates:0,rejected:0,failures:[],paused:false};
    change(d=>({...d,imports:{...d.imports,batches:[batch,...d.imports.batches]}}));
    return batch.id;
  }
  async function addFiles(batchId,files,onProgress=()=>{}) {
    const list=Array.from(files);
    const batch=ledger(snapshot()).batches.find(b=>b.id===batchId);
    if(!batch) throw Error('Import batch was not found.');
    if(scans.has(batchId))throw Error('This batch is still saving. Please wait.');
    updateBatch(batchId,{selected:(batch.processed ?? batch.selected)+list.length,receiving:true});
    scans.add(batchId);
    let processed=0;
    try {
      for(const file of list) {
        try {
          if(!file.type.startsWith('image/')) throw Error('This file is not a supported image.');
          const hash=await fingerprint(file);
          let existing=ledger(snapshot()).tasks.find(t=>t.fingerprint===hash && t.state!=='removed');
          if(existing?.state==='save-error'){updateTask(existing.id,{state:'removed'});existing=null;}
          if(existing) {
            const b=ledger(snapshot()).batches.find(b=>b.id===batchId);
            updateBatch(batchId,{duplicates:b.duplicates+1,lastDuplicateBatch:existing.batchId});
            continue;
          }
          const task={id:uid('shot'),batchId,fingerprint:hash,name:file.name,size:file.size,lastModified:file.lastModified,state:'saving',createdAt:Date.now()};
          task.imageId=task.id;
          // Record intent first. Recovery checks whether the bytes were committed.
          change(d=>({...d,imports:{...d.imports,tasks:[...d.imports.tasks,task]}}));
          try {
            const dataUrl=await I.resize(file);
            await I.put(task.imageId,dataUrl,true);
            updateTask(task.id,{state:'screen',screened:false,error:null});
          } catch(e) {
            // Leave a recoverable intent if metadata cannot be written. Never mark it saved.
            updateTask(task.id,{state:'save-error',error:'Image could not be saved. Select this file again to retry.'});
            throw e;
          }
        } catch(e) {
          const b=ledger(snapshot()).batches.find(b=>b.id===batchId);
          updateBatch(batchId,{rejected:b.rejected+1,failures:[...b.failures,{name:file.name,message:e?.message || 'Could not read or save image.'}]});
        } finally {
          processed++;
          const current=ledger(snapshot()).batches.find(b=>b.id===batchId);
          updateBatch(batchId,{processed:(current.processed || 0)+1});
          onProgress({processed,total:list.length});
        }
      }
    } finally { scans.delete(batchId);updateBatch(batchId,{receiving:false}); }
  }
  async function recover() {
    const d=snapshot(), tasks=ledger(d).tasks;
    const patches=new Map();
    for(const t of tasks) {
      if(t.state==='working' && (!running || running.batchId!==t.batchId)) patches.set(t.id,{state:'ready',screened:true,error:null});
      if(t.state==='ready' && !t.screened) patches.set(t.id,t.result ? {screened:true} : {state:'screen',screened:false});
      if(['error','done','queued','kept','discarded'].includes(t.state) && !t.screened) patches.set(t.id,{screened:true});
      if((t.state==='saving' || t.state==='save-error') && !scans.has(t.batchId)) {
        const image=await I.get(t.imageId);
        patches.set(t.id,image ? {state:t.screened ? 'ready' : 'screen',error:null} : {state:'save-error',error:'Image was not saved. Select this file again.'});
      }
    }
    if(patches.size || ledger(d).batches.some(b=>b.receiving)) change(current=>({...current,imports:{...current.imports,tasks:current.imports.tasks.map(t=>patches.has(t.id) ? {...t,...patches.get(t.id)} : t),batches:current.imports.batches.map(b=>b.receiving && !scans.has(b.id) ? {...b,receiving:false} : b)}}));
  }
  function screen(id,keep) {
    change(d=>{
      const task=d.imports.tasks.find(t=>t.id===id);
      if(!task || task.state!=='screen')return d;
      return {...d,imports:{...d.imports,screenHintSeen:true,tasks:d.imports.tasks.map(t=>t.id===id ? {...t,state:keep ? 'ready' : 'skipped',screened:true,decidedAt:Date.now()} : t),batches:d.imports.batches.map(b=>b.id===task.batchId ? {...b,screenHistory:[...(b.screenHistory || []),id]} : b)}};
    });
  }
  function undoScreen(batchId) {
    change(d=>{
      const batch=d.imports.batches.find(b=>b.id===batchId);if(!batch)return d;
      const history=[...(batch.screenHistory || [])];let task;
      while(history.length){const id=history.pop();task=d.imports.tasks.find(t=>t.id===id && ['ready','skipped'].includes(t.state));if(task)break;}
      return {...d,imports:{...d.imports,tasks:task ? d.imports.tasks.map(t=>t.id===task.id ? {...t,state:'screen',screened:false} : t) : d.imports.tasks,batches:d.imports.batches.map(b=>b.id===batchId ? {...b,screenHistory:history} : b)}};
    });
  }
  function rescreen(id) {
    change(d=>({...d,imports:{...d.imports,tasks:d.imports.tasks.map(t=>t.id===id && t.state==='skipped' ? {...t,state:'screen',screened:false} : t),batches:d.imports.batches.map(b=>({...b,screenHistory:(b.screenHistory || []).filter(x=>x!==id)}))}}));
  }
  function updateItem(id,patch) {
    const allowed=['title','summary','tags','note','aiGuess'];
    const safe=Object.fromEntries(allowed.filter(k=>k in patch).map(k=>[k,patch[k]]));
    change(d=>({...d,queue:d.queue.map(item=>item.id===id ? {...item,...safe} : item)}));
  }
  async function run(batchId) {
    if(ledger(snapshot()).tasks.some(t=>t.batchId===batchId && ['screen','saving'].includes(t.state))) throw Error('Review your photos before organizing them.');
    if(ledger(snapshot()).tasks.some(t=>t.batchId===batchId && t.state==='ready' && !t.screened)) throw Error('Review your photos before organizing them.');
    if(running) throw Error('Another batch is still finishing. Please wait.');
    if(!window.LocusAI.isReady()) throw Error('Add your Qianwen API key in Settings first.');
    const control={batchId,paused:false};running=control;
    const work=async()=>{
      updateBatch(batchId,{paused:false});
      const ids=ledger(snapshot()).tasks.filter(t=>t.batchId===batchId && ['ready','error'].includes(t.state)).map(t=>t.id);
      let next=0;
      const settled = await Promise.allSettled(Array.from({length:Math.min(3,ids.length)},()=> (async()=>{
        while(!control.paused && next<ids.length) {
          const id=ids[next++];
          const task=ledger(snapshot()).tasks.find(t=>t.id===id);
          if(!task || !['ready','error'].includes(task.state)) continue;
          updateTask(id,{state:'working',error:null});
          const controller=new AbortController();
          const timer=setTimeout(()=>controller.abort(),60000);
          try {
            const dataUrl=await I.get(task.imageId);
            if(!dataUrl){const missing=Error('Saved image is missing. Select this file again.');missing.code='IMAGE_MISSING';throw missing;}
            const result=await window.LocusAI.analyzeScreenshot(dataUrl,snapshot().collections,{signal:controller.signal});
            // A successful result must be committed before it counts as done.
            updateTask(id,{state:'done',result,error:null});
          } catch(e) { updateTask(id,{state:e?.code==='IMAGE_MISSING' ? 'save-error' : 'error',error:e?.message || 'Could not read this image.'}); }
          finally { clearTimeout(timer); }
        }
      })().catch(e=>{control.paused=true;throw e;})));
      const failed=settled.find(r=>r.status==='rejected');
      if(failed)throw failed.reason;
    };
    try {
      if(navigator.locks) await navigator.locks.request('locus-ai-import',{ifAvailable:true},async lock=>{if(!lock) throw Error('Recognition is running in another tab.');await work();});
      else await work();
    } finally { running=null;updateBatch(batchId,{lastRunAt:Date.now()}); }
  }
  function pause(batchId) {
    if(running?.batchId===batchId) running.paused=true;
    updateBatch(batchId,{paused:true});
  }
  function review(batchId) {
    let count=0;
    change(d=>{
      const batch=d.imports.batches.find(b=>b.id===batchId);
      if(!batch) throw Error('Import batch was not found.');
      const done=d.imports.tasks.filter(t=>t.batchId===batchId && t.state==='done');
      const ids=new Set(done.map(t=>t.id));count=done.length;
      const items=done.map(t=>{const r=t.result;return {id:t.id,taskId:t.id,batchId,imageId:t.imageId,glyph:r.emoji,source:r.source || 'Screenshot',title:r.title,summary:r.summary,text:r.text || r.summary,tags:r.tags,aiGuess:(d.collections.find(c=>c.id===batch.targetId)?.name || batch.targetName || r.collection),aiIsNew:batch.targetId ? false : r.isNew,aiConfidence:batch.targetId ? 100 : r.confidence,addedAt:Date.now()};});
      return {...d,queue:[...d.queue,...items.filter(item=>!d.queue.some(q=>q.id===item.id))],imports:{...d.imports,tasks:d.imports.tasks.map(t=>ids.has(t.id) ? {...t,state:'queued'} : t)}};
    });return count;
  }
  async function remove(id) {
    const task=ledger(snapshot()).tasks.find(t=>t.id===id);
    if(!task || ['working','queued','kept'].includes(task.state)) throw Error('This image is being used and cannot be removed here.');
    updateTask(id,{state:'removed',result:null});
    await I.remove(task.imageId);
  }
  // Delete one import from history. Screenshots already saved to a drawer stay there (their record is
  // kept without a batch so the duplicate check still knows them); everything else from this import,
  // including photos waiting to be confirmed, is removed with its image.
  async function removeBatch(batchId) {
    if(running?.batchId===batchId) throw Error('This import is still organizing. Pause it first.');
    const d0=snapshot(), tasks=ledger(d0).tasks.filter(t=>t.batchId===batchId);
    const drop=new Set(tasks.filter(t=>t.state!=='kept').map(t=>t.id));
    const mine=new Set(tasks.map(t=>t.id));
    change(d=>({...d,
      queue:d.queue.filter(q=>!drop.has(q.taskId || q.id)),
      imports:{...d.imports,
        batches:d.imports.batches.filter(b=>b.id!==batchId).map(b=>b.lastDuplicateBatch===batchId ? {...b,lastDuplicateBatch:null} : b),
        tasks:d.imports.tasks.filter(t=>!drop.has(t.id)).map(t=>mine.has(t.id) ? {...t,batchId:null} : t),
        decisions:d.imports.decisions.filter(x=>!mine.has(x.item?.taskId))}}));
    for(const t of tasks) if(drop.has(t.id) && t.imageId) { try { await I.remove(t.imageId); } catch(e) {} }
  }
  // Housekeeping, run once when the app opens:
  // 1. Photos you skipped (in review or on the results page) keep their image for CLEAN_DAYS so you can
  //    change your mind; after that the image is deleted and the photo can be imported again later.
  // 2. Any stored image that nothing points to any more (left behind by a crash or an old bug) is deleted.
  const CLEAN_DAYS = 7;
  async function cleanup() {
    const cutoff = Date.now() - CLEAN_DAYS * 864e5;
    const old = ledger(snapshot()).tasks.filter(t => ['skipped','discarded'].includes(t.state)
      && (t.decidedAt || t.updatedAt || t.createdAt || 0) < cutoff && !(running && running.batchId === t.batchId));
    if (old.length) {
      const ids = new Set(old.map(t => t.id));
      change(d => ({...d, imports: {...d.imports,
        tasks: d.imports.tasks.map(t => ids.has(t.id) ? {...t, state: 'removed', result: null, cleared: true} : t),
        decisions: d.imports.decisions.filter(x => !ids.has(x.item?.taskId))}}));
      for (const t of old) await I.remove(t.imageId);
    }
    const keys = await I.keys();
    if (!keys) return { cleared: old.length, orphans: 0 };
    const d = snapshot(), L = ledger(d), used = new Set();
    d.captures.forEach(c => { if (c.imageId) used.add(c.imageId); (c.imageIds || []).forEach(i => used.add(i)); });
    L.tasks.forEach(t => { if (t.state !== 'removed' && t.imageId) used.add(t.imageId); });
    d.queue.forEach(q => { if (q.imageId) used.add(q.imageId); });
    L.decisions.forEach(x => { if (x.item?.imageId) used.add(x.item.imageId); });
    let orphans = 0;
    for (const k of keys) if (!used.has(k) && !I.isFresh(k)) { await I.remove(k); orphans++; }
    return { cleared: old.length, orphans };
  }
  function makeCollection(name,cols) {
    const base=name.toLowerCase().replace(/[^a-z0-9一-鿿]+/g,'-').replace(/^-|-$/g,'') || 'drawer';
    let id=base,n=2;while(cols.some(c=>c.id===id))id=`${base}-${n++}`;
    return {id,name,color:window.LocusTheme.nextColor(cols),tags:[],glyph:'◌',vibe:''};
  }
  function decide(decisions) {
    let kept=0,discarded=0;
    change(d=>{
      let cols=[...d.collections],caps=[...d.captures],queue=[...d.queue],tasks=[...d.imports.tasks],journal=[...d.imports.decisions];
      for(const decision of decisions) {
        const item=queue.find(q=>q.id===decision.item.id);
        if(!item)continue; // Repeated callbacks are harmless.
        let capture=null,createdCollection=null;
        if(decision.action!=='discard') {
          let col=cols.find(c=>c.name===decision.collection);
          if(!col){col=makeCollection(decision.collection || 'Unsorted',cols);cols.push(col);createdCollection=col.id;}
          capture={id:`cap_${item.id}`,collection:col.id,title:window.LocusTheme.shortTitle(item.title || item.text || 'Untitled capture'),glyph:item.glyph,tags:item.tags || [],source:item.source,summary:item.summary || item.text || '',imageId:item.imageId,date:new Date().toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric'}),addedAt:Date.now(),note:item.note || '',importTaskId:item.taskId};
          caps=[capture,...caps.filter(c=>c.id!==capture.id)];
          cols=cols.map(c=>c.id===col.id ? {...c,tags:[...new Set([...(c.tags || []),...(item.tags || [])])]} : c);kept++;
        } else discarded++;
        journal.push({id:uid('decision'),item,action:decision.action,collection:decision.collection,captureId:capture?.id,createdCollection,at:Date.now()});
        queue=queue.filter(q=>q.id!==item.id);
        tasks=tasks.map(t=>t.id===item.taskId ? {...t,state:capture ? 'kept' : 'discarded',captureId:capture?.id,decidedAt:Date.now()} : t);
      }
      return {...d,collections:cols,captures:caps,queue,imports:{...d.imports,tasks,decisions:journal}};
    });return {kept,discarded};
  }
  function undo(batchId) {
    change(d=>{
      const journal=[...d.imports.decisions];
      let index=journal.length-1;
      while(index>=0 && batchId && journal[index].item.batchId!==batchId)index--;
      if(index<0)return d;
      const [last]=journal.splice(index,1);
      const caps=d.captures.filter(c=>c.id!==last.captureId);
      const cols=d.collections.filter(c=>!(c.id===last.createdCollection && !caps.some(x=>x.collection===c.id)));
      return {...d,collections:cols,captures:caps,queue:[last.item,...d.queue.filter(q=>q.id!==last.item.id)],imports:{...d.imports,decisions:journal,tasks:d.imports.tasks.map(t=>t.id===last.item.taskId ? {...t,state:'queued',captureId:null} : t)}};
    });
  }
  function restore(id) {
    change(d=>{
      const task=d.imports.tasks.find(t=>t.id===id);
      if(!task || task.state!=='discarded')return d;
      const last=d.imports.decisions.findLast ? d.imports.decisions.findLast(x=>x.item.taskId===id) : [...d.imports.decisions].reverse().find(x=>x.item.taskId===id);
      if(!last)return d;
      return {...d,queue:[...d.queue,last.item],imports:{...d.imports,tasks:d.imports.tasks.map(t=>t.id===id ? {...t,state:'queued'} : t),decisions:d.imports.decisions.filter(x=>x.item.taskId!==id)}};
    });
  }
  return {snapshot,createBatch,addFiles,recover,run,pause,review,remove,removeBatch,cleanup,screen,undoScreen,rescreen,updateItem,decide,undo,restore,fingerprint,isRunning:id=>!!running && running.batchId===id,isBusy:()=>!!running};
})();
