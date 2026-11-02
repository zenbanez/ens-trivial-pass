/* D-017 author smoke tests. Optional Playwright dependency; no live models/keys. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const repo = path.resolve(__dirname, '..');
const pause = ms => new Promise(r=>setTimeout(r,ms));
async function freePort() {
  const s=http.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));
  const port=s.address().port;await new Promise(r=>s.close(r));return port;
}
(async()=>{
  const port=await freePort(), base=`http://127.0.0.1:${port}`;
  const server=spawn(process.execPath,['server.mjs'],{cwd:repo,windowsHide:true,env:{...process.env,PORT:String(port),OLLAMA_BASE_URL:'http://127.0.0.1:9'},stdio:'pipe'});
  let browser;
  const errors=[], external=[]; let localAttempts=0;
  try {
    let ready=false;
    for(let n=0;n<70;n++){try{const r=await fetch(base);if(r.ok){ready=true;break;}}catch{}await pause(100);}
    assert.ok(ready,'isolated server started');
    const image=await fetch(base+'/assets/ens-paper-world.png');
    assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/^image\/png/);
    const module=await fetch(base+'/manual-sighting.mjs');assert.match(module.headers.get('content-type'),/javascript/);
    browser=await chromium.launch({channel:process.env.ENS_BROWSER_CHANNEL || 'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:1360,height:1050}});
    page.on('pageerror',e=>errors.push(e.message));
    let navPhase=false; const navRequests=[];
    page.on('request',r=>{if(navPhase)navRequests.push(r.url());});
    await page.route('**/*',route=>{
      const url=route.request().url();
      if(!url.startsWith(base+'/')){external.push(url);return route.abort();}
      if(url.endsWith('/api/local-extract')){localAttempts++;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'D017 test stand-in: local model intentionally unavailable; exercise labelled stub'})});}
      if(url.endsWith('/api/judge'))return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'D017 test stand-in: no model calls permitted'})});
      return route.continue();
    });
    await page.goto(base);
    await page.waitForFunction(()=>window.ensUI && window.ensManual && ensUI.snapshot().crumbs.length>0);
    assert.equal(await page.locator('#ens-view-intro').isVisible(),true);
    const original=await page.evaluate(()=>ensUI.snapshot());
    const closingAssets=['ens-next-step.png','ens-vision-empowered-teachers.png','ens-vision-involved-parents.png','ens-vision-guided-learners.png','ens-vision-learning-institutions.png'];
    for(const asset of closingAssets){
      const response=await fetch(base+'/assets/'+asset);
      assert.equal(response.status,200,asset+' served');
      assert.match(response.headers.get('content-type'),/^image\/png/);
    }
    for(const target of ['next','vision']){
      await page.evaluate(t=>ensUI.navigate(t),target);
      await page.locator('[data-story="'+target+'"] img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
      assert.equal(await page.locator('[data-story="'+target+'"] img').evaluateAll(images=>images.every(i=>i.naturalWidth>0&&i.alt.length>20)),true,'closing art loaded with descriptions');
    }
    assert.deepEqual(await page.locator('.ens-vision-feature h2').allTextContents(),['Empowered Teachers','Involved Parents','Guided Learners','Learning Institutions']);
    assert.equal(await page.locator('.ens-vision-feature').count(),4);
    const road=page.locator('.ens-vision-road');
    assert.equal(await road.getAttribute('aria-hidden'),'true','road is decorative');
    assert.equal(await road.getAttribute('focusable'),'false','road cannot take focus');
    assert.equal(await road.evaluate(e=>getComputedStyle(e).pointerEvents),'none','road cannot intercept interaction');
    assert.equal(await road.locator('script,foreignObject,a,[href]').count(),0,'inline road has no executable or external content');
    const imageHashes={
      'empowered-teachers':'c7a85bba8f8e4da68ba82bdf8e38eb8bea108b4b1d23e48804ece06fa91634f5',
      'involved-parents':'0300ec4b94c57a1c5c05b09839a5ac907d26adf20b7c5c57650b57870e83d259',
      'guided-learners':'901fc7f8d581b203b5c20c7bd47a51c01e8e2aba3ddd5e91388d5f87551c7a2f',
      'learning-institutions':'0772dfed3ae9486b0bc3c04113f7b054bdeca9894d5f17194833586be9173d4a'
    };
    for(const [name,expected] of Object.entries(imageHashes))assert.equal(createHash('sha256').update(fs.readFileSync(path.join(repo,'public/assets/ens-vision-'+name+'.png'))).digest('hex'),expected,'approved image unchanged: '+name);
    assert.deepEqual(await page.evaluate(()=>ensUI.snapshot()),original,'artwork navigation leaves runtime unchanged');
    assert.equal(localAttempts,0,'closing art never starts extraction');
    await page.evaluate(()=>ensUI.navigate('idea'));
    // Peer-reported round-trip: a button must not leave a stale target hash.
    await page.evaluate(()=>{location.hash='twin-panel';});
    await page.locator('#twin-panel').waitFor({state:'visible'});
    for(let round=0;round<2;round++){
      await page.locator('#view-console').click();
      await page.locator('#ens-view-console').waitFor({state:'visible'});
      assert.equal(await page.evaluate(()=>location.hash),'#console');
      await page.getByRole('link',{name:'← Return to teacher review',exact:true}).click();
      await page.locator('#twin-panel').waitFor({state:'visible'});
      assert.equal(await page.evaluate(()=>location.hash),'#twin-panel');
    }
    assert.deepEqual(await page.evaluate(()=>ensUI.snapshot()),original,'route round-trip never mutates session');
    for(const [index,id] of ['debrief-panel','gate-panel','manual-panel','twin-panel','trail-panel'].entries()){
      assert.match(await page.locator(`#${id} h2`).innerText(),new RegExp(`^${index+1} · `),'panel numbering matches walkthrough');
    }
    await page.evaluate(()=>ensUI.navigate('idea'));
    if(process.env.ENS_EXPECT_CONSOLE)assert.equal(await page.evaluate(()=>Boolean(window.ENSConsole && window.ENSLiveness)),true,'expected actual D018 modules, not missing-file fallback');
    assert.equal(original.claims.length,0);
    assert.equal(localAttempts,0,'opening does not invoke extraction');
    await page.evaluate(()=>{location.hash='%E0%A4%A';});
    await page.waitForTimeout(30);
    assert.equal((await page.evaluate(()=>ensUI.snapshot())).sessionId,original.sessionId,'malformed fragment preserves session');
    assert.equal(await page.locator('.ens-hero>img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
    await page.getByRole('link',{name:'See one small part'}).click();
    await page.locator('[data-story="slice"]').waitFor({state:'visible'});
    await page.getByRole('link',{name:'Follow this observation'}).click();
    await page.locator('#debrief-panel').waitFor({state:'visible'});
    await page.locator('[data-review-step="1"]').click();
    await page.locator('input[name=locus][value=hosted]').check();
    assert.equal(await page.locator('#extract-btn').isDisabled(),true,'held locus never enables extraction');
    await page.locator('input[name=locus][value=local]').check();
    assert.equal(await page.locator('#extract-btn').isEnabled(),true);
    await page.locator('#extract-btn').click();
    await page.waitForFunction(()=>ensUI.snapshot().claims.length===3);
    assert.equal(localAttempts,1,'one intentional stub-producing stand-in response');
    let state=await page.evaluate(()=>ensUI.snapshot());
    assert.ok(state.claims.every(c=>c.extractor.includes('LOCAL STUB')),'stub honestly labelled');
    if(process.env.ENS_EXPECT_CONSOLE){
      assert.match(await page.locator('#ens-source-status').innerText(),/LOCAL STUB · not a model/);
      assert.match(await page.locator('[data-ens-liveness-source]').first().innerText(),/LOCAL STUB · not a model/);
    }
    assert.equal(state.sessionId,original.sessionId);
    await page.locator('[data-review-step="3"]').click();
    const first=state.claims[0];
    await page.locator(`[data-claim-card="${first.id}"] [data-signoff]`).click();
    await page.waitForFunction(id=>ensUI.snapshot().claims.find(c=>c.id===id).status==='signed',first.id);
    const admitted=await page.evaluate(()=>ensUI.snapshot());
    await page.locator(`[data-claim-card="${first.id}"] [data-ens-record-link]`).click();
    await page.locator('#ens-view-console').waitFor({state:'visible'});
    if(process.env.ENS_EXPECT_CONSOLE){
      await page.locator('#cv-band').waitFor({state:'visible'});
      assert.match(await page.locator('#cv-band').innerText(),/LOCAL STUB · not a model/);
      assert.doesNotMatch(await page.locator('#cv-band').innerText(),/LIVE · local/);
    }
    assert.equal(await page.locator('#trail').count(),1,'one actual trail node');
    assert.equal(await page.locator('#ens-console-trail #trail-panel').isVisible(),true);
    assert.equal(await page.locator(`[data-crumb-id="${first.crumb}"]`).isVisible(),true);
    const unchanged=await page.evaluate(()=>ensUI.snapshot());
    assert.deepEqual(unchanged.claims,admitted.claims);assert.deepEqual(unchanged.crumbs,admitted.crumbs);
    assert.equal(unchanged.sessionId,original.sessionId,'same session in console');
    await page.locator(`[data-crumb-id="${first.crumb}"] [data-ens-record-link]`).click();
    await page.locator('#twin-panel').waitFor({state:'visible'});
    assert.equal(await page.locator(`[data-claim-card="${first.id}"]`).isVisible(),true);
    await page.locator(`[data-claim-card="${first.id}"] [data-contest]`).click();
    await page.waitForFunction(id=>ensUI.snapshot().claims.find(c=>c.id===id).contested,first.id);
    await page.locator('[data-review-step="2"]').click();
    await page.locator('#manual-observation').fill('Ben (SYNTHETIC) asked a thoughtful question about equal paper strips.');
    await page.locator('#manual-learner').selectOption('Ben (SYNTHETIC)');
    await page.locator('#manual-btn').click();
    await page.waitForFunction(()=>ensUI.snapshot().claims.length===4);
    if(process.env.ENS_EXPECT_CONSOLE)assert.match(await page.locator('#ens-source-status').innerText(),/MANUAL ENTRY/);
    assert.equal(localAttempts,1,'manual path does not extract');
    assert.equal((await page.evaluate(()=>ensUI.snapshot())).claims.at(-1).extractor,'teacher (manual, model off)');
    await page.locator('#view-console').click();
    await page.locator('#verify-trail-btn').click();
    await page.waitForFunction(()=>ensUI.snapshot().trailVerified!==null);
    assert.equal((await page.evaluate(()=>ensUI.snapshot())).trailVerified,true);
    // D-025: Navigation — the teacher's own next step, model off, same trail.
    navPhase=true;
    await page.getByRole('link',{name:'Decide the next step →',exact:true}).click();
    await page.locator('#ens-view-navigation').waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>location.hash),'#navigation');
    assert.equal(await page.locator('#nav-limiter').isVisible(),true,'limiter in frame');
    assert.match(await page.locator('#nav-limiter').innerText(),/The teacher’s decision, not a model recommendation\. No model runs on this page\./);
    assert.equal(await page.locator('[data-nav-card]').count(),1,'one card per signed claim only');
    assert.match(await page.locator(`[data-nav-card="${first.id}"]`).innerText(),/CONTESTED/);
    assert.match(await page.locator('#nav-pending').innerText(),/3 proposed claims are not signed yet/);
    let before=await page.evaluate(()=>ensUI.snapshot());
    await page.locator(`[data-nav-record="${first.id}"]`).click();
    assert.match(await page.locator(`[data-nav-note="${first.id}"]`).innerText(),/Not recorded: the next step is empty/);
    assert.equal((await page.evaluate(()=>ensUI.snapshot())).crumbs.length,before.crumbs.length,'a rejected step writes no crumb');
    const stepText='Tomorrow I will ask Amara to explain the strips to a partner first.';
    await page.locator(`[data-nav-text="${first.id}"]`).fill(stepText);
    await page.locator(`[data-nav-record="${first.id}"]`).click();
    await page.waitForFunction(n=>ensUI.snapshot().crumbs.length===n+1,before.crumbs.length);
    let after=await page.evaluate(()=>ensUI.snapshot());
    const step1=after.crumbs.at(-1);
    assert.equal(step1.action,'ens.navigation.next_step');
    assert.deepEqual({...step1.context,next_step_hash:undefined},{note:step1.context.note,claim:first.id,author:'teacher',model_off:true,next_step:stepText,next_step_hash:undefined,contested_at_decision:true,supersedes:null});
    assert.equal(step1.context.next_step_hash,'sha256:'+createHash('sha256').update(stepText).digest('hex'));
    // Freshness (scope §4a, Sol's R1): the earlier check must not cover the new record.
    assert.equal(after.trailVerified,null,'recording resets verification to unchecked');
    assert.equal(await page.locator('#verify-trail-result').textContent(),`The trail changed after the last check. That check covered ${before.crumbs.length} crumbs; the trail now has ${after.crumbs.length}. Verify again.`);
    assert.equal(await page.locator(`[data-nav-card="${first.id}"] .nav-step`).isVisible(),true);
    await page.locator('#view-console').click();
    assert.match(await page.locator('#checklist').innerText(),/OPEN\s+Trail recomputes/);
    assert.match(await page.locator('#checklist').innerText(),/Next steps recorded[\s\S]*1\/1 signed/);
    await page.locator('#verify-trail-btn').click();
    await page.waitForFunction(()=>ensUI.snapshot().trailVerified===true);
    assert.match(await page.locator('#verify-trail-result').textContent(),new RegExp(`${after.crumbs.length}/${after.crumbs.length} crumb hashes recompute`),'fresh check covers the new count');
    // Revision appends a crumb naming the one it supersedes; the first stays.
    await page.evaluate(()=>ensUI.navigate('navigation'));
    await page.locator(`[data-nav-revise="${first.id}"]`).click();
    await page.locator(`[data-nav-text="${first.id}"]`).fill(stepText+' Then I will check her strips with her.');
    await page.locator(`[data-nav-record="${first.id}"]`).click();
    await page.waitForFunction(n=>ensUI.snapshot().crumbs.length===n+1,after.crumbs.length);
    const revised=await page.evaluate(()=>ensUI.snapshot());
    assert.equal(revised.crumbs.at(-1).context.supersedes,step1.warrant_id);
    assert.ok(revised.crumbs.some(c=>c.warrant_id===step1.warrant_id),'earlier step preserved');
    assert.equal(revised.trailVerified,null,'revision also resets verification');
    assert.match(await page.locator('#verify-trail-result').textContent(),new RegExp(`covered ${after.crumbs.length} crumbs; the trail now has ${revised.crumbs.length}[.]`));
    await page.locator('#view-console').click();
    await page.locator('#verify-trail-btn').click();
    await page.waitForFunction(()=>ensUI.snapshot().trailVerified===true);
    // Tamper: changing the recorded words in the crumb itself fails recomputation.
    await page.evaluate(id=>{crumbs.find(c=>c.warrant_id===id).context.next_step+='!';},step1.warrant_id);
    await page.locator('#verify-trail-btn').click();
    await page.waitForFunction(()=>ensUI.snapshot().trailVerified===false);
    await page.evaluate(([id,t])=>{crumbs.find(c=>c.warrant_id===id).context.next_step=t;},[step1.warrant_id,stepText]);
    await page.locator('#verify-trail-btn').click();
    await page.waitForFunction(()=>ensUI.snapshot().trailVerified===true);
    navPhase=false;
    assert.deepEqual(navRequests,[],'no request leaves the page while Navigation is used');
    assert.equal((await page.evaluate(()=>ensUI.snapshot())).sessionId,original.sessionId,'same session through Navigation');
    await page.evaluate(()=>ensUI.navigate('navigation'));
    await page.getByRole('link',{name:'Where does this go next? →',exact:true}).click();
    await page.locator('[data-story="next"]').waitFor({state:'visible'});
    for(const width of [1360,1024,390,320]){
      await page.setViewportSize({width,height:1100});
      for(const target of ['idea','slice','next','vision','debrief-panel','gate-panel','manual-panel','twin-panel','trail-panel','console','navigation']){
        await page.evaluate(t=>ensUI.navigate(t),target);
        if(target==='vision'){
          const ordered=await page.locator('.ens-vision-feature').evaluateAll((rows,wide)=>rows.every((row,index)=>{
            const copy=row.querySelector('.ens-vision-copy').getBoundingClientRect();
            const image=row.querySelector('figure').getBoundingClientRect();
            return wide?(index%2?image.right<=copy.left+2:copy.right<=image.left+2):copy.bottom<=image.top+2;
          }),width>740);
          assert.equal(ordered,true,'Vision alternates desktop image sides and keeps copy before image on mobile '+width);
        }
        if(process.env.ENS_UI_SCREENSHOT_DIR && ((width===1360&&(target==='next'||target==='vision'))||(width===390&&target==='vision'))){
          fs.mkdirSync(process.env.ENS_UI_SCREENSHOT_DIR,{recursive:true});
          await page.locator('[data-story="'+target+'"] img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
          await page.screenshot({path:path.join(process.env.ENS_UI_SCREENSHOT_DIR,(target==='vision'?'ens-vision-journey':'ens-closing-next')+'-'+width+'.png'),fullPage:true});
        }
        const over=await page.evaluate(()=>({root:document.documentElement.scrollWidth>innerWidth+2,leaves:[...document.querySelectorAll('h1,h2,h3,p,pre,button,textarea,select')].filter(e=>e.getClientRects().length&&e.scrollWidth>e.clientWidth+3).map(e=>e.id||e.tagName)}));
        if(over.root) console.log('Overflow detail',await page.evaluate(()=>[...document.body.querySelectorAll('*')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+2).map(e=>({id:e.id,tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width})).slice(0,20)));
        assert.deepEqual(over,{root:false,leaves:[]},`overflow ${width}/${target}`);
      }
    }
    await page.setViewportSize({width:1360,height:1000});
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    await page.evaluate(()=>ensUI.navigate('idea'));
    await page.waitForFunction(()=>window.scrollY===0);
    if(process.env.ENS_UI_SCREENSHOT_DIR){fs.mkdirSync(process.env.ENS_UI_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.ENS_UI_SCREENSHOT_DIR,'ens-d017-opening.png'),fullPage:true});}
    assert.deepEqual(errors,[],'no page script errors');assert.deepEqual(external,[],'no external network');
    console.log('PASS: PNG/MJS served correctly; no startup model call; HELD; labelled stub path; manual model-off; sign-off/contest; same session/claims/trail across views; bidirectional record links; real hash recomputation; Navigation next step (model off, no requests, freshness reset, revision appends, tamper fails); desktop/mobile overflow; no script errors or external requests.');
  } finally {if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
