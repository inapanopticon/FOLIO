// Durable local import ledger. Image bytes live in IndexedDB; compact task records,
// AI results, queue, captures and decision journal commit together in locus.v1.
window.LocusImports = (() => {
  const S = window.LocusStore, I = window.LocusImages;
  // Tasks Home counts as images to continue. Queued ones have their own "to sort" row there.
  const OPEN_STATES = ['saving','screen','ready','working','done','error','save-error'];
  const UNFINISHED_STATES = [...OPEN_STATES,'queued'];
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
  // Review choices can be changed at any time before AI runs, so these accept a photo in any review state.
  const REVIEWABLE=['screen','ready','skipped','error'];
  function reviewed(d,id,patch) {
    const task=d.imports.tasks.find(t=>t.id===id);
    if(!task || !REVIEWABLE.includes(task.state))return d;
    return {...d,imports:{...d.imports,tasks:d.imports.tasks.map(t=>t.id===id ? {...t,...patch(t),screened:true,decidedAt:Date.now()} : t)}};
  }
  const keptState=t=>(t.state==='error' ? 'error' : 'ready');
  // Kept photos in order, grouped into posts. A clipped photo joins the photo it was clipped to,
  // so keeping a photo in between later does not move it. Older data has no clipTo: it joins the group before.
  function groupPhotos(photos) {
    const groups=[], groupOf=new Map();
    photos.forEach(t=>{
      const target=t.clipped ? (groupOf.get(t.clipTo) || groups[groups.length-1]) : null;
      const group=target || [];
      if(!target) groups.push(group);
      group.push(t);groupOf.set(t.id,group);
    });
    return groups;
  }
  // A photo is leaving its post. If it was the first, the next one takes over and must not clip onto the post before.
  function afterLeaving(tasks,task) {
    const pending=tasks.filter(t=>t.batchId===task.batchId && ['ready','error'].includes(t.state));
    const post=task.state==='done' ? (task.taskIds || [task.id]) : (groupPhotos(pending).find(g=>g.some(t=>t.id===task.id)) || []).map(t=>t.id);
    const wasFirst=post[0]===task.id, heir=wasFirst ? post[1] : null, clipTo=wasFirst ? heir : task.clipTo;
    return tasks.map(t=>t.id===heir ? {...t,clipped:false,clipTo:null} : t.clipTo===task.id ? {...t,clipTo} : t);
  }
  function previousKept(tasks,task) {
    const before=tasks.slice(0,tasks.findIndex(t=>t.id===task.id)).filter(t=>t.batchId===task.batchId && ['ready','error'].includes(t.state));
    return before.length ? before[before.length-1].id : null;
  }
  const itemTaskIds = item => item.taskIds || [item.taskId || item.id];
  const imageIdsOf = item => [...new Set([...(item.imageIds || []),item.imageId].filter(Boolean))];
  function choose(id,keep) {
    change(d=>{
      const task=d.imports.tasks.find(t=>t.id===id);
      const tasks=!keep && REVIEWABLE.includes(task?.state) ? afterLeaving(d.imports.tasks,task) : d.imports.tasks;
      return reviewed({...d,imports:{...d.imports,tasks}},id,t=>({state:keep ? keptState(t) : 'skipped',clipped:false,clipTo:null}));
    });
  }
  // clipped: this photo belongs to the same post as clipTo, the photo kept before it when it was clipped
  function setClipped(id,clipped) { change(d=>reviewed(d,id,t=>({state:keptState(t),clipped,clipTo:clipped ? previousKept(d.imports.tasks,t) : null}))); }
  function rescreen(id) {
    change(d=>({...d,imports:{...d.imports,tasks:d.imports.tasks.map(t=>t.id===id && t.state==='skipped' ? {...t,state:'screen',screened:false} : t)}}));
  }
  function updateItem(id,patch) {
    const allowed=['title','summary','details','tags','note','aiGuess','suggestedDrawer'];
    const safe=Object.fromEntries(allowed.filter(k=>k in patch).map(k=>[k,patch[k]]));
    change(d=>({...d,queue:d.queue.map(item=>item.id===id ? {...item,...safe,updatedAt:Date.now()} : item)}));
  }
  async function run(batchId) {
    if(ledger(snapshot()).tasks.some(t=>t.batchId===batchId && ['screen','saving'].includes(t.state))) throw Error('Review your photos before organizing them.');
    if(ledger(snapshot()).tasks.some(t=>t.batchId===batchId && t.state==='ready' && !t.screened)) throw Error('Review your photos before organizing them.');
    if(running) throw Error('Another batch is still finishing. Please wait.');
    if(!window.LocusAI.isReady()) throw Error('Add your AI key in Settings first.');
    const control={batchId,paused:false};running=control;
    const work=async()=>{
      updateBatch(batchId,{paused:false});
      const groups=groupPhotos(ledger(snapshot()).tasks.filter(t=>t.batchId===batchId && ['ready','error'].includes(t.state)));
      let next=0;
      const settled = await Promise.allSettled(Array.from({length:Math.min(3,groups.length)},()=> (async()=>{
        while(!control.paused && next<groups.length) {
          const group=groups[next++], task=group[0], id=task.id;
          const taskIds=group.map(t=>t.id), imageIds=group.map(t=>t.imageId);
          const updateGroup = patch => change(d=>({...d,imports:{...d.imports,tasks:d.imports.tasks.map(t=>taskIds.includes(t.id) ? {...t,...patch,groupHead:id,taskIds,imageIds,updatedAt:Date.now(),result:t.id===id ? patch.result ?? t.result : null} : t)}}));
          updateGroup({state:'working',error:null});
          const controller=new AbortController();
          const timer=setTimeout(()=>controller.abort(),60000);
          try {
            const dataUrls=await Promise.all(imageIds.map(imageId=>I.get(imageId)));
            const lost=dataUrls.findIndex(url=>!url);
            if(lost>=0) {
              // One photo can simply be chosen again. In a post, removing the lost photo lets the rest carry on.
              const missing=Error(group.length>1 ? `Photo ${lost+1} of this post is missing. Remove it with × and retry.` : 'Saved image is missing. Select this file again.');
              if(group.length===1) missing.code='IMAGE_MISSING';
              throw missing;
            }
            const result=await window.LocusAI.analyzeScreenshot(dataUrls,snapshot().collections,{signal:controller.signal});
            // A successful result must be committed before it counts as done.
            updateGroup({state:'done',result,error:null});
          } catch(e) { updateGroup({state:e?.code==='IMAGE_MISSING' ? 'save-error' : 'error',error:e?.message || 'Could not read this post.'}); }
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
  // A finished AI result, as an item waiting to be confirmed.
  function queueItemFromTask(t,batch,d) {
    const r=t.result;
    return {
      id:t.id, taskId:t.id, taskIds:t.taskIds || [t.id], batchId:t.batchId, imageId:t.imageId, imageIds:imageIdsOf(t),
      glyph:r.emoji, source:r.source || 'Screenshot',
      title:r.title, summary:r.summary, text:r.text || '', tags:r.tags,
      kind:r.kind || null, details:r.details || [],
      aiGuess:d.collections.find(c=>c.id===batch.targetId)?.name || batch.targetName || r.collection,
      aiIsNew:batch.targetId ? false : r.isNew,
      aiConfidence:batch.targetId ? 100 : r.confidence,
      addedAt:Date.now(),
    };
  }
  function review(batchId) {
    let count=0;
    change(d=>{
      const batch=d.imports.batches.find(b=>b.id===batchId);
      if(!batch) throw Error('Import batch was not found.');
      const done=d.imports.tasks.filter(t=>t.batchId===batchId && t.state==='done');
      const ids=new Set(done.map(t=>t.id));
      const items=done.filter(t=>!t.groupHead || t.groupHead===t.id).map(t=>queueItemFromTask(t,batch,d));count=items.length;
      return {...d,queue:[...d.queue,...items.filter(item=>!d.queue.some(q=>q.id===item.id))],imports:{...d.imports,tasks:d.imports.tasks.map(t=>ids.has(t.id) ? {...t,state:'queued'} : t)}};
    });return count;
  }
  async function remove(id) {
    const task=ledger(snapshot()).tasks.find(t=>t.id===id);
    if(!task || ['working','queued','kept'].includes(task.state)) throw Error('This image is being used and cannot be removed here.');
    // Removing one photo must not delete its neighbours. A previous combined result is
    // invalid after removal, so the remaining photos go back through AI together.
    const ids=task.taskIds || [id];
    change(d=>({...d,imports:{...d.imports,tasks:afterLeaving(d.imports.tasks,d.imports.tasks.find(t=>t.id===id)).map(t=>{
      if(t.id===id) return {...t,state:'removed',result:null};
      return ids.includes(t.id) && ['ready','error','done'].includes(t.state)
        ? {...t,state:'ready',screened:true,result:null,error:null,groupHead:null,taskIds:null,imageIds:null} : t;
    })}}));
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
    d.queue.forEach(q => imageIdsOf(q).forEach(id=>used.add(id)));
    L.decisions.forEach(x => { if(x.item) imageIdsOf(x.item).forEach(id=>used.add(id)); });
    let orphans = 0;
    for (const k of keys) if (!used.has(k) && !I.isFresh(k)) { await I.remove(k); orphans++; }
    return { cleared: old.length, orphans };
  }
  // A confirmed queue item, as a saved capture in drawer col.
  function captureFromItem(item,col) {
    return {
      id:`cap_${item.id}`, collection:col.id,
      title:window.LocusTheme.shortTitle(item.title || item.text || 'Untitled capture'),
      glyph:item.glyph, tags:item.tags || [], source:item.source,
      summary:item.summary ?? item.text ?? '', text:item.text || '',
      kind:item.kind || null, details:item.details || [], imageId:item.imageId, imageIds:imageIdsOf(item),
      date:window.LocusTheme.formatDate(), addedAt:Date.now(),
      note:item.note || '', importTaskId:item.taskId, importTaskIds:itemTaskIds(item),
    };
  }
  // What saving one screenshot changed in its drawer's tag list, so Undo can put it back.
  function tagChangeBetween(before,after) {
    const missing=(a=[],b=[])=>a.filter(t=>!b.includes(t));
    return {
      drawerId:before.id,
      added:missing(after.tags,before.tags), removed:missing(before.tags,after.tags),
      ownAdded:missing(after.userTags,before.userTags), ownRemoved:missing(before.userTags,after.userTags),
    };
  }
  function undoTagChange(c,change,captures) {
    const inDrawer=captures.filter(x=>x.collection===c.id);
    const carried=t=>inDrawer.some(x=>(x.tags || []).includes(t));
    const tags=[...change.removed,...(c.tags || []).filter(t=>!change.added.includes(t) || carried(t))];
    const userTags=[...change.ownRemoved,...(c.userTags || []).filter(t=>!change.ownAdded.includes(t))];
    return window.LocusAI.addDrawerTags({...c,tags,userTags},[],[]); // also keeps the drawer within its tag limit
  }
  // The undo history lives in the same limited storage as everything else, so only recent "keep" decisions
  // stay undoable. "Skip" decisions all stay: Restore to sorting needs them, and they clear themselves after CLEAN_DAYS.
  const UNDO_PER_BATCH = 20, UNDO_TOTAL = 200;
  function trimJournal(journal) {
    const perBatch = new Map();
    let total = 0;
    const kept = [];
    for (let i = journal.length - 1; i >= 0; i--) {
      const x = journal[i], batch = x.item?.batchId;
      if (x.action !== 'discard') {
        const n = perBatch.get(batch) || 0;
        if (n >= UNDO_PER_BATCH || total >= UNDO_TOTAL) continue;
        perBatch.set(batch, n + 1);
        total++;
      }
      kept.unshift(x);
    }
    return kept;
  }
  // Once a photo is decided, its full AI result is already saved elsewhere. Keep only what is still read.
  const slimDecided = t => (['kept','discarded'].includes(t.state) && t.result ? {...t,result:{title:t.result.title,tags:t.result.tags}} : t);
  function decide(decisions) {
    let kept=0,discarded=0;
    change(d=>{
      let cols=[...d.collections],caps=[...d.captures],queue=[...d.queue],tasks=[...d.imports.tasks],journal=[...d.imports.decisions];
      for(const decision of decisions) {
        const item=queue.find(q=>q.id===decision.item.id);
        if(!item)continue; // Repeated callbacks are harmless.
        let capture=null,createdCollection=null,tagChange=null;
        if(decision.action!=='discard') {
          const drawerName=decision.collection || 'Unsorted';
          let col=cols.find(c=>c.name.toLowerCase()===drawerName.toLowerCase()); // Travel and travel are one drawer
          if(!col){col=S.makeCollection(drawerName,cols);cols.push(col);createdCollection=col.id;}
          capture=captureFromItem(item,col);
          caps=[capture,...caps.filter(c=>c.id!==capture.id)];
          const aiTags=tasks.find(t=>t.id===item.taskId)?.result?.tags || item.tags || [];
          const ownTags=(item.tags || []).filter(t=>!aiTags.includes(t)); // added by hand during review
          const before=cols.find(c=>c.id===col.id), after=window.LocusAI.addDrawerTags(before,item.tags || [],ownTags);
          tagChange=tagChangeBetween(before,after);
          cols=cols.map(c=>c.id===col.id ? after : c);kept++;
        } else discarded++;
        journal.push({id:uid('decision'),item,action:decision.action,collection:decision.collection,captureId:capture?.id,createdCollection,tagChange,at:Date.now()});
        queue=queue.filter(q=>q.id!==item.id);
        tasks=tasks.map(t=>itemTaskIds(item).includes(t.id) ? {...t,state:capture ? 'kept' : 'discarded',captureId:capture?.id,decidedAt:Date.now()} : t);
      }
      return {...d,collections:cols,captures:caps,queue,imports:{...d.imports,tasks:tasks.map(slimDecided),decisions:trimJournal(journal)}};
    });return {kept,discarded};
  }
  function undo(batchId) {
    change(d=>{
      const journal=[...d.imports.decisions];
      let index=journal.length-1;
      while(index>=0 && batchId && journal[index].item.batchId!==batchId)index--;
      if(index<0)return d;
      const [last]=journal.splice(index,1);
      const saved=d.captures.find(c=>c.id===last.captureId);
      const caps=d.captures.filter(c=>c.id!==last.captureId);
      // changes made after saving come back with it, so undoing never loses a note or a new title
      const item=saved?.updatedAt ? {
        ...last.item, title:saved.title, summary:saved.summary, details:saved.details, tags:saved.tags, note:saved.note,
        aiGuess:d.collections.find(c=>c.id===saved.collection)?.name || last.item.aiGuess,
      } : last.item;
      const cols=d.collections
        .filter(c=>!(c.id===last.createdCollection && !caps.some(x=>x.collection===c.id)))
        .map(c=>c.id===last.tagChange?.drawerId ? window.LocusAI.dropUnusedTags(undoTagChange(c,last.tagChange,caps),caps) : c);
      return {...d,collections:cols,captures:caps,queue:[item,...d.queue.filter(q=>q.id!==last.item.id)],imports:{...d.imports,decisions:journal,tasks:d.imports.tasks.map(t=>itemTaskIds(last.item).includes(t.id) ? {...t,state:'queued',captureId:null} : t)}};
    });
  }
  function restore(id) {
    change(d=>{
      const task=d.imports.tasks.find(t=>t.id===id);
      if(!task || task.state!=='discarded')return d;
      const last=[...d.imports.decisions].reverse().find(x=>itemTaskIds(x.item).includes(id));
      if(!last)return d;
      return {...d,queue:[...d.queue,last.item],imports:{...d.imports,tasks:d.imports.tasks.map(t=>itemTaskIds(last.item).includes(t.id) ? {...t,state:'queued'} : t),decisions:d.imports.decisions.filter(x=>x.id!==last.id)}};
    });
  }
  return {OPEN_STATES,UNFINISHED_STATES,groupPhotos,snapshot,createBatch,addFiles,recover,run,pause,review,remove,removeBatch,cleanup,choose,setClipped,rescreen,updateItem,decide,undo,restore,fingerprint,isRunning:id=>!!running && running.batchId===id,isBusy:()=>!!running};
})();
