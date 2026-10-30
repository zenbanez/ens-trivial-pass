/* D-017 shell: navigation and read-only presentation of app.js's one live session.
   No generated demo outcomes, persistence, model calls or admission mutations. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const panelIds = ['debrief-panel','gate-panel','manual-panel','twin-panel','trail-panel'];
  const chapters = new Set(['idea','slice','next','vision']);
  const help = [
    'Begin with the teacher’s own words. This editable sample is entirely synthetic.',
    'Choose the processing locus before automated extraction. HELD means extraction cannot run.',
    'An optional human-authored path: record an observation without calling a model. Skip it to inspect automated claims.',
    'Inspect proposed claims and their evidence. Only teacher sign-off admits a claim; contesting preserves it.',
    'Read the actual session crumbs. Hash recomputation checks recorded crumb metadata, not educational correctness or complete payload integrity.'
  ];
  let view = 'intro', chapter = 'idea', step = 0;
  const trail = byId('trail-panel');
  const clone = value => JSON.parse(JSON.stringify(value));
  function snapshot() {
    return clone({sessionId:SESSION_ID, runNo:RUN_SEQ, claims:CLAIMS, sightings:SIGHTINGS,
      crumbs, turns:TURNS, coverage:COVERAGE_REPORT, trailVerified:TRAIL_VERIFIED,
      locus:document.querySelector('input[name=locus]:checked')?.value || 'hosted'});
  }
  function updateSummary() {
    const state = snapshot();
    const signed = state.claims.filter(c=>c.status==='signed').length;
    const proposed = state.claims.filter(c=>c.status==='proposed').length;
    byId('ens-session-label').textContent = `Session ${state.sessionId}`;
    byId('ens-run-live').textContent = `Same live page session · ${state.claims.length} claim(s) · ${state.crumbs.length} crumb(s). Model execution is identified per output, not implied by this label.`;
    byId('ens-live-summary').textContent = `${proposed} proposed · ${signed} teacher-signed · ${state.claims.filter(c=>c.contested).length} contested · ${state.crumbs.length} session crumbs. Navigation does not run a model or reset these records.`;
    const liveness=window.ENSLiveness;
    const lastSource=liveness?.forSession(state.turns);
    byId('ens-source-status').innerHTML=lastSource?`Latest evidence: ${liveness.pill(lastSource)}`:'';
    const text = byId('debrief').value.trim();
    byId('ens-source-preview').textContent = text.match(/[^.!?]+[.!?]+/)?.[0] || text || 'The current debrief is empty.';
    addRecordLinks(state);
  }
  function addRecordLinks(state) {
    document.querySelectorAll('[data-claim-card]').forEach(card=>{
      const claim = state.claims.find(c=>c.id===card.dataset.claimCard);
      if(!claim?.crumb) return;
      const liveness=window.ENSLiveness;
      if(liveness){
        const labels=liveness.forClaim(claim);
        const key=labels.source.text+'|'+(labels.judge?.text||'');
        let row=card.querySelector('.ens-claim-liveness');
        if(!row){row=document.createElement('div');row.className='ens-claim-liveness';card.prepend(row);}
        if(row.dataset.labelKey!==key){
          row.innerHTML=`<span>Evidence:</span><span data-ens-liveness-source>${liveness.pill(labels.source)}</span>${labels.judge?`<span>Advisory judge:</span>${liveness.pill(labels.judge)}`:''}`;
          row.dataset.labelKey=key;
        }
      }
      if(card.querySelector('[data-ens-record-link]')) return;
      const b=document.createElement('button'); b.type='button'; b.className='ens-record-link';
      b.dataset.ensRecordLink='console'; b.dataset.claimId=claim.id; b.dataset.warrantId=claim.crumb;
      b.textContent='Inspect this claim’s record in Agent Console →'; card.append(b);
    });
    document.querySelectorAll('#trail [data-crumb-id]').forEach(row=>{
      if(row.querySelector('[data-ens-record-link]')) return;
      const record=state.crumbs.find(c=>c.warrant_id===row.dataset.crumbId);
      const claim=state.claims.find(c=>c.id===record?.context?.claim || c.crumb===record?.warrant_id);
      if(!claim) return;
      const b=document.createElement('button'); b.type='button'; b.className='ens-record-link';
      b.dataset.ensRecordLink='review'; b.dataset.claimId=claim.id; b.dataset.warrantId=record.warrant_id;
      b.textContent='See this claim in teacher review →'; row.append(b);
    });
  }
  function selectRecord(detail) {
    document.querySelectorAll('.ens-record-selected').forEach(el=>el.classList.remove('ens-record-selected'));
    const record=detail.warrantId && document.querySelector(`[data-crumb-id="${CSS.escape(detail.warrantId)}"]`);
    const card=detail.claimId && document.querySelector(`[data-claim-card="${CSS.escape(detail.claimId)}"]`);
    const selected=view==='console'?record:card;
    if(selected) {selected.classList.add('ens-record-selected'); selected.scrollIntoView({block:'center',behavior:'auto'});}
    document.dispatchEvent(new CustomEvent('ens:selection',{detail:{view,...detail}}));
  }
  function renderNavigation() {
    ['intro','review','console'].forEach(name=>{byId(`ens-view-${name}`).hidden=name!==view;});
    document.body.dataset.ensView=view;
    byId('console-panel').hidden=view!=='console';
    const trailHost=byId(view==='console'?'ens-console-trail':'ens-review-trail');
    if(trail.parentElement!==trailHost) trailHost.append(trail); // MOVE the original node, never clone state/IDs.
    document.querySelectorAll('[data-story]').forEach(el=>{el.hidden=el.dataset.story!==chapter;});
    document.querySelectorAll('[data-review-panel]').forEach(el=>{el.hidden=Number(el.dataset.reviewPanel)!==step;});
    document.querySelectorAll('[data-review-step]').forEach(b=>{
      if(Number(b.dataset.reviewStep)===step)b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-view-link]').forEach(el=>{
      if(el.dataset.viewLink===view)el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-route-link]').forEach(el=>{
      const current=view==='intro'?chapter:view;
      if(el.dataset.routeLink===current)el.setAttribute('aria-current','step'); else el.removeAttribute('aria-current');
    });
    byId('ens-step-help').textContent=help[step];
    byId('ens-review-progress').textContent=`Step ${step+1} of ${panelIds.length}`;
    byId('ens-review-back').disabled=step===0;
    byId('ens-review-next').textContent=step===4?'Open Agent Console →':'Next →';
    updateSummary();
  }
  function navigate(target, detail={}) {
    const previous=`${view}/${chapter}/${step}`;
    if(target==='console')view='console';
    else if(target==='review'){view='review'; if(Number.isInteger(detail.step))step=Math.max(0,Math.min(4,detail.step)); if(detail.claimId)step=3;}
    else if(chapters.has(target)){view='intro';chapter=target;}
    else if(panelIds.includes(target)){view='review';step=panelIds.indexOf(target);}
    else return false;
    renderNavigation();
    if(view==='console' && typeof renderConsole==='function')renderConsole();
    if((detail.warrantId || detail.claimId) && !window.ENSConsole)requestAnimationFrame(()=>selectRecord(detail));
    if(!detail.warrantId && !detail.claimId && previous!==`${view}/${chapter}/${step}`)requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'auto'}));
    return true;
  }
  function fromHash(){
    let target='idea';
    try { target=decodeURIComponent(location.hash.slice(1)) || 'idea'; } catch { /* malformed fragments do not break the live session */ }
    navigate(target);
  }
  document.addEventListener('ens:navigate',event=>{
    const detail=event.detail || {}; navigate(detail.view || 'review',detail);
  });
  document.addEventListener('click',event=>{
    const b=event.target.closest('button'); if(!b)return;
    if(b.id==='view-console' && !window.ENSConsole)navigate('console');
    if(b.id==='view-teacher' && !window.ENSConsole)navigate('review');
    if(b.dataset.reviewStep!==undefined)navigate('review',{step:Number(b.dataset.reviewStep)});
    if(b.id==='ens-review-back')navigate('review',{step:step-1});
    if(b.id==='ens-review-next')step===4?navigate('console'):navigate('review',{step:step+1});
    if(b.dataset.ensRecordLink)document.dispatchEvent(new CustomEvent('ens:navigate',{detail:{view:b.dataset.ensRecordLink,claimId:b.dataset.claimId,warrantId:b.dataset.warrantId}}));
  });
  window.addEventListener('hashchange',fromHash);
  byId('debrief').addEventListener('input',updateSummary);
  document.addEventListener('ens:turn',updateSummary);
  const observer=new MutationObserver(updateSummary);
  [byId('twin'),byId('trail'),byId('turns')].forEach(el=>observer.observe(el,{childList:true,subtree:true}));
  // Read-only snapshots are copied from the live session, never restored or fed back as app state.
  window.ensUI=Object.freeze({navigate,snapshot,getView:()=>view});
  fromHash();
  document.dispatchEvent(new CustomEvent('ens:ui-ready',{detail:{view,sessionId:SESSION_ID}}));
})();
