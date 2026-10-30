/* D-017 author smoke tests. Optional Playwright dependency; no live models/keys. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const repo = path.resolve(__dirname, '..');
const pause = ms => new Promise(r=>setTimeout(r,ms));
async function freePort() {
  const s=http.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));
  const port=s.address().port;await new Promise(r=>s.close(r));return port;
}
(async()=>{
  const port=await freePort(), base=`http://127.0.0.1:${port}`;
  const server=spawn(process.execPath,['server.mjs'],{cwd:repo,windowsHide:true,env:{...process.env,PORT:String(port),MODEL_API_KEY:'',HOSTED_SYNTHETIC_AUTHORIZED:'0',OLLAMA_BASE_URL:'http://127.0.0.1:9'},stdio:'pipe'});
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
    assert.equal(await page.locator('#extract-btn').isDisabled(),true,'held locus never enables extraction');
    await page.locator('input[name=locus][value=local]').check();
    assert.equal(await page.locator('#extract-btn').isEnabled(),true);
    await page.locator('#extract-btn').click();
    await page.waitForFunction(()=>ensUI.snapshot().claims.length===3);
    assert.equal(localAttempts,1,'one intentional stub-producing stand-in response');
    let state=await page.evaluate(()=>ensUI.snapshot());
    assert.ok(state.claims.every(c=>c.extractor.includes('LOCAL STUB')),'stub honestly labelled');
    assert.equal(state.sessionId,original.sessionId);
    await page.locator('[data-review-step="3"]').click();
    const first=state.claims[0];
    await page.locator(`[data-claim-card="${first.id}"] [data-signoff]`).click();
    await page.waitForFunction(id=>ensUI.snapshot().claims.find(c=>c.id===id).status==='signed',first.id);
    const admitted=await page.evaluate(()=>ensUI.snapshot());
    await page.locator(`[data-claim-card="${first.id}"] [data-ens-record-link]`).click();
    await page.locator('#ens-view-console').waitFor({state:'visible'});
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
    assert.equal(localAttempts,1,'manual path does not extract');
    assert.equal((await page.evaluate(()=>ensUI.snapshot())).claims.at(-1).extractor,'teacher (manual, model off)');
    await page.locator('#view-console').click();
    await page.locator('#verify-trail-btn').click();
    await page.waitForFunction(()=>ensUI.snapshot().trailVerified!==null);
    assert.equal((await page.evaluate(()=>ensUI.snapshot())).trailVerified,true);
    for(const width of [1360,1024,390,320]){
      await page.setViewportSize({width,height:1100});
      for(const target of ['idea','slice','next','vision','debrief-panel','gate-panel','manual-panel','twin-panel','trail-panel','console']){
        await page.evaluate(t=>ensUI.navigate(t),target);
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
    console.log('PASS: PNG/MJS served correctly; no startup model call; HELD; labelled stub path; manual model-off; sign-off/contest; same session/claims/trail across views; bidirectional record links; real hash recomputation; desktop/mobile overflow; no script errors or external requests.');
  } finally {if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
