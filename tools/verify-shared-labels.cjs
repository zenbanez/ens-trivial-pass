// Combined D-017/D-018 contract probes; requires D-018 files to be present.
// Executes only the inspected pure helper in a VM; no DOM, network or model.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'public/liveness.js'),'utf8'),context);
const L=context.window.ENSLiveness;
const validAnswer={answer:'yes',probabilities:{true:0.9,false:0.1},failed:false};
const valid={answers:{support:validAnswer,attribution:validAnswer,needs_support:validAnswer}};
const cases=[
 ['empty session has no model label',()=>assert.equal(L.forSession([]),null)],
 ['stub never upgrades to live',()=>assert.equal(L.forTurn({kind:'EXTRACT',title:'Ollama local model unavailable; LOCAL STUB — not a model'}).text,'LOCAL STUB · not a model')],
 ['manual source remains manual',()=>assert.equal(L.forClaim({source:'manual'}).source.text,'MANUAL ENTRY')],
 ['unknown source is not live',()=>assert.equal(L.forClaim({extractor:'unrecognized'}).source.text,'FIXTURE')],
 ['code proposal is code',()=>assert.equal(L.forTurn({kind:'PROPOSE'}).text,'CODE · not a model')],
 ['unreadable judge did not answer',()=>assert.equal(L.forTurn({kind:'JUDGE',inspector:'not JSON'}).text,'JUDGE DID NOT ANSWER')],
 ['empty judge record did not answer',()=>assert.equal(L.forTurn({kind:'JUDGE',inspector:'{}'}).text,'JUDGE DID NOT ANSWER')],
 ['missing judge answers are not live',()=>assert.equal(L.forClaim({judgment:{}}).judge.text,'JUDGE DID NOT ANSWER')],
 ['partial judge answers are not live',()=>assert.equal(L.forClaim({judgment:{answers:{support:validAnswer}}}).judge.text,'JUDGE DID NOT ANSWER')],
 ['complete usable judge can be labelled live',()=>assert.equal(L.forClaim({judgment:valid}).judge.text,'LIVE · local')],
 ['failed judge is not uncertainty/live',()=>assert.equal(L.forClaim({judgment:{answers:{...valid.answers,support:{failed:true}}}}).judge.text,'JUDGE DID NOT ANSWER')],
 ['tool rail matches code roles',()=>{
   const text=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
   const literal=text.match(/const TOOLS = (\[[\s\S]*?\n\]);/);
   assert.ok(literal,'tools declaration');
   const tools=vm.runInNewContext(literal[1]);
   for(const prefix of ['channel_admit(','claim_propose('])assert.equal(tools.find(t=>t[0].startsWith(prefix))?.[1],'code',prefix);
 }]
];
let failed=0;
for(const [name,run] of cases){try{run();console.log('PASS',name);}catch(error){failed++;console.error('FAIL',name,':',error.message);}}
console.log(`${cases.length-failed}/${cases.length} shared-label contract probes passed`);
if(failed)process.exitCode=1;
