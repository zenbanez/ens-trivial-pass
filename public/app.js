// The Trivial Pass, Made Real — client logic.
// Pipeline: debrief -> Nine Gates (Gate 9 decides) -> extraction -> sightings
// -> claims in a minimal Twin -> contest -> warrant trail. Synthetic only.

const LEARNERS = [
  { id: 'L1', name: 'Amara (SYNTHETIC)' },
  { id: 'L2', name: 'Ben (SYNTHETIC)' },
  { id: 'L3', name: 'Cora (SYNTHETIC)' },
];
const SAMPLE = `Amara explained to her group why the water cycle diagram needed arrows both ways, and two classmates copied her reasoning into their notebooks. Ben finished the fraction worksheet quickly but when I asked him to show 3/4 with the paper strips he folded them into eighths instead and looked unsure. Cora asked three times whether her poster was "right" before she would start, then produced the most careful labelled diagram in the class once she began.`;

const GATES_1_8 = [
  ['Gate 1 — Enumerability', 'Pass', 'The channel is named in one sentence a family can read.'],
  ['Gate 2 — Scoping', 'Pass', 'Teacher-initiated, after class, by a visible act.'],
  ['Gate 3 — Observation Purity', 'Pass', "The teacher's observation language; extraction may not smooth it."],
  ['Gate 4 — Exclusion Filtering', 'Pass', 'Teacher-mediated; over-capture is minimal.'],
  ['Gate 5 — Attribution', 'Pass', 'Sightings attach to learners the teacher names.'],
  ['Gate 6 — Retention Shape', 'Pass', 'The recording is the trace; standard retention.'],
  ['Gate 7 — Cost Declaration', 'Pass', 'T3 against the teacher\u2019s declared budget.'],
  ['Gate 8 — Dignity and Abuse Review', 'Pass', 'No surveillance surface exists.'],
];
const GATE9 = {
  hosted: {
    walk: [
      ['1. Declared Locus', 'FAIL', 'No locus is declared; the extractor is an unnamed third-party service.'],
      ['2. Boundary Containment', 'FAIL', 'Per-learner sightings about named children would cross the institutional boundary.'],
      ['3. In-Flight Transit Scope', '—', 'Not reached: the channel already fails at the locus.'],
      ['4. Instrument Identity and Held Weights', 'FAIL', 'A hosted model can change silently, without warrant lineage.'],
      ['5. Capability-Gap Posture', '—', 'The honest outcome here is refusal, recorded as a capability gap.'],
      ['6. Technical Enforcement Evidence', '—', 'No telemetry could cure an undeclared locus.'],
    ],
    disposition: 'HELD — pending a declared and conforming processing locus. Extraction will not run. A channel is not benign because its microphone is.',
    admitted: false,
  },
  local: {
    walk: [
      ['1. Declared Locus', 'Pass', 'This machine, operated by the demo user, named in the registration crumb.'],
      ['2. Boundary Containment', 'Pass', 'Debrief, transcript, and sightings stay on this machine.'],
      ['3. In-Flight Transit Scope', 'Pass', 'No transit: extraction is in-process; every buffer is local.'],
      ['4. Instrument Identity and Held Weights', 'Pass', 'The extractor is pinned and named in every crumb (Meta model id, or LOCAL STUB).'],
      ['5. Capability-Gap Posture', 'Pass', 'If this machine could not run it, the channel would be refused, not provisionally admitted.'],
      ['6. Technical Enforcement Evidence', 'Outstanding', 'Simulated, not produced. This demo supplies specification, not telemetry.'],
    ],
    disposition: 'ADMITTED ON THE SPECIFICATION, with binding conditions — not admitted on evidence. A real channel is admitted only when condition 6 has actually been exercised.',
    admitted: true,
  },
  'hosted-synthetic': {
    walk: [
      ['1. Declared Locus', 'Pass — synthetic only', 'The registration names the Meta Model API endpoint and model, and its operator. Declared, not hidden.'],
      ['2. Boundary Containment', 'Synthetic only', 'No learner content exists in this demo: every learner is a synthetic persona. With real learner content this condition FAILS and the channel is HELD.'],
      ['3. In-Flight Transit Scope', 'Authorized', 'Synthetic debrief text crosses to the declared endpoint, expressly authorized by the operator for this demonstration.'],
      ['4. Instrument Identity and Held Weights', 'Declared', 'The model id is named in every crumb. A hosted model can change under that id; for real data this condition requires held weights and would FAIL here.'],
      ['5. Capability-Gap Posture', 'Not invoked', 'This path exists because the data is synthetic, not because local capability is absent.'],
      ['6. Technical Enforcement Evidence', 'Outstanding', 'No telemetry is produced. Nothing here is evidence a real channel would be safe.'],
    ],
    disposition: 'ADMITTED FOR SYNTHETIC DATA ONLY — an expressly authorized demonstration path. This is NOT Gate 9 compliance: the same channel carrying a real debrief would be HELD at conditions 2 and 4.',
    admitted: true,
  },
};

// --- warrant crumbs (Warrants v0 minimal shape) ---
// content_hash is a real SHA-256 over a canonical payload:
//   JSON.stringify({action, target, context, from, issued_at}) with context
//   keys sorted. Anyone holding the exported trail can recompute it.
const crumbs = [];
let lastCrumb = null;
const randHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const canonical = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
async function crumb(action, target, note, extra = {}) {
  const from = lastCrumb;
  const issued_at = new Date().toISOString();
  const context = { note, ...extra };
  const content_hash = 'sha256:' + (await sha256Hex(canonical({ action, target, context, from, issued_at })));
  const c = {
    version: 'v0',
    warrant_id: 'w_' + randHex(6),
    agent: 'ens-trivial-pass-demo-v1',
    action,
    target,
    content_hash,
    from,
    issued_at,
    context,
  };
  crumbs.push(c);
  lastCrumb = c.warrant_id;
  renderTrail();
  return c;
}
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// --- deterministic LOCAL STUB extraction (not a model) ---
function stubExtract(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const sightings = [];
  for (const raw of sentences) {
    const s = raw.trim();
    for (const l of LEARNERS) {
      const first = l.name.split(' ')[0];
      if (s.startsWith(first) || s.includes(' ' + first + ' ') || s.includes(first + ' ')) {
        sightings.push({ learner: l.name, quote: s, observation: s, extractor: 'LOCAL STUB — not a model' });
        break;
      }
    }
  }
  return sightings;
}

// Quote verification in code, outside the extractor (stub or model alike):
// a sighting counts only if (a) the learner is a known synthetic learner,
// (b) the quote is nonempty, and (c) the quote is verbatim in the debrief.
// Literal matches and whitespace-normalized matches are distinguished:
// the match kind travels with the sighting and is shown in the Twin.
const LEARNER_NAMES = new Set(LEARNERS.map((l) => l.name));
let CLAIM_SEQ = 0;
const RUN_ID = randHex(3);
function verifyQuotes(sightings, text) {
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const sourceNorm = norm(text);
  const ok = [], rejected = [];
  for (const s of sightings || []) {
    const quote = String(s?.quote || '');
    if (!s || !LEARNER_NAMES.has(s.learner) || !norm(quote)) { rejected.push(s); continue; }
    if (text.includes(quote.trim())) ok.push({ ...s, match: 'literal' });
    else if (sourceNorm.includes(norm(quote))) ok.push({ ...s, match: 'normalized' });
    else rejected.push(s);
  }
  return { ok, rejected };
}

function claimFrom(sighting) {
  const q = sighting.quote.toLowerCase();
  let cls = 'Emerging Competence', conf = 0.6, statement = `Interprets: ${sighting.observation}`;
  if (/explain|showed|taught|copied her|helped/.test(q)) { cls = 'Demonstrated Competence'; conf = 0.8; }
  if (/unsure|looked|hesitat|asked three times|before she would|struggl/.test(q)) { cls = 'Emerging Competence'; conf = 0.55; statement = `Uncertainty visible; support may be the route: ${sighting.observation}`; }
  return { class: cls, statement, confidence: conf };
}

// --- state + rendering ---
let SIGHTINGS = [], CLAIMS = [], meta = { metaConfigured: false };
const $ = (id) => document.getElementById(id);

function renderGates() {
  $('gates').innerHTML = GATES_1_8.map(([g, r, n]) =>
    `<div class="gate"><strong>${g}</strong> <span class="pass">${r}</span><br><small>${n}</small></div>`).join('');
  const locus = document.querySelector('input[name=locus]:checked').value;
  const g9 = GATE9[locus];
  $('gate9-walk').innerHTML = '<h3>Gate 9 — Processing Locus, walked</h3>' + g9.walk.map(([c, r, n]) =>
    `<div class="gate"><strong>${c}</strong> <span class="${r === 'FAIL' ? 'fail' : r === 'Pass' ? 'pass' : 'warn'}">${r}</span><br><small>${n}</small></div>`).join('');
  $('disposition').textContent = g9.disposition;
  $('disposition').className = 'disposition ' + (g9.admitted ? 'ok' : 'held');
  $('extract-btn').disabled = !g9.admitted;
  $('extract-btn').textContent = g9.admitted ? 'Run extraction' : 'Extraction refused — channel held';
}

function decayed(claim) {
  const days = Number($('age').value);
  return Math.max(0.05, claim.confidence * Math.exp(-days / 90)).toFixed(2);
}

function claimCard(c, i) {
  return `
    <article class="claim ${c.contested ? 'contested' : ''}">
      <h4>${escapeHtml(c.learner)} — ${escapeHtml(c.class)} <small>[${escapeHtml(c.status)}]</small></h4>
      <p>${escapeHtml(c.statement)}</p>
      <p><small>Confidence at assertion: ${c.confidence} · decayed (read-time, ${$('age').value}d): <strong>${decayed(c)}</strong><br>
      Sighting: “${escapeHtml(c.quote)}” · extractor: ${escapeHtml(c.extractor)} · quote verified in code (${escapeHtml(c.match || 'literal')} match)<br>
      ${c.contested ? '<strong>CONTESTED</strong> — preserved, never deleted (WT-I07). ' : ''}</small></p>
      ${c.status === 'proposed' ? `<button data-signoff="${i}">Teacher sign-off — admit to Twin</button>` : ''}
      <button data-contest="${i}" ${c.contested ? 'disabled' : ''}>Contest this claim</button>
    </article>`;
}

function renderTwin() {
  const proposed = CLAIMS.filter((c) => c.status === 'proposed');
  const signed = CLAIMS.filter((c) => c.status === 'signed');
  $('twin').innerHTML =
    (CLAIMS.length ? '' : '<p><em>No claims yet. Admit the channel (Gate 9, local locus) and run extraction.</em></p>') +
    (proposed.length ? `<h3>Proposed claims — awaiting teacher sign-off (admission is a stewardship act)</h3>` + proposed.map((c) => claimCard(c, CLAIMS.indexOf(c))).join('') : '') +
    (signed.length ? `<h3>The Twin — signed claims only</h3>` + signed.map((c) => claimCard(c, CLAIMS.indexOf(c))).join('') : '');
  document.querySelectorAll('[data-contest]').forEach((b) => b.addEventListener('click', async () => {
    const c = CLAIMS[Number(b.dataset.contest)];
    c.contested = true;
    await crumb('ens.claim.contest', c.id, 'Teacher contests the claim; claim preserved and marked contested', { claim: c.id });
    renderTwin();
  }));
  document.querySelectorAll('[data-signoff]').forEach((b) => b.addEventListener('click', async () => {
    const c = CLAIMS[Number(b.dataset.signoff)];
    c.status = 'signed';
    await crumb('ens.claim.signoff', c.id, 'Teacher sign-off: claim admitted to the Twin by a human, not by the extractor', { claim: c.id });
    renderTwin();
  }));
}

function renderTrail() {
  $('trail').innerHTML = crumbs.map((c) =>
    `<div class="crumb"><code>${escapeHtml(c.warrant_id)}</code> <strong>${escapeHtml(c.action)}</strong> → ${escapeHtml(c.target)}<br><small>from: ${escapeHtml(c.from || 'null (root)')} · ${escapeHtml(c.issued_at)}<br>${escapeHtml(c.context.note || '')}</small></div>`).join('');
}

async function runExtraction() {
  const locus = document.querySelector('input[name=locus]:checked').value;
  const regNote = {
    hosted: 'Channel HELD at Gate 9: undeclared hosted locus; extraction refused',
    local: 'Channel admitted ON SPECIFICATION under Gate 9 declared local locus; condition 6 outstanding; extraction strictly local (no model API call)',
    'hosted-synthetic': 'Channel admitted FOR SYNTHETIC DATA ONLY under expressly authorized hosted path; NOT Gate 9 compliance for real learner data',
  }[locus];
  const reg = await crumb('ens.channel.register', 'channel:post-class-debrief', regNote,
    { locus, gate9: locus === 'hosted' ? 'held' : locus === 'local' ? 'admitted-on-specification' : 'admitted-synthetic-only', synthetic_only: locus === 'hosted-synthetic' });
  if (locus === 'hosted') { renderTwin(); return; }
  const text = $('debrief').value;
  let sightings, extractorLabel;
  if (locus === 'local') {
    // Strictly local: the server and any hosted model are never contacted.
    sightings = stubExtract(text);
    extractorLabel = 'LOCAL STUB — not a model (declared local locus; this machine only)';
  } else {
    // hosted-synthetic: the ONLY path that may call the model API. The server
    // enforces the gate decision; without a configured key it refuses and
    // there is deliberately no silent fallback to the stub in this mode.
    try {
      const res = await fetch('/api/extract', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, learners: LEARNERS.map((l) => l.name), gate: { mode: 'hosted-synthetic', admitted: true, syntheticOnly: true } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `server ${res.status}`);
      sightings = data.sightings;
      extractorLabel = `Meta model via API (${data.locus?.model || meta.model}) at ${data.locus?.endpoint || 'declared endpoint'} — synthetic data sent, expressly authorized`;
    } catch (e) {
      await crumb('ens.evidence.reject', 'debrief:demo', `Hosted-synthetic extraction refused/failed: ${e.message}. No fallback applied in this mode.`, { locus });
      $('extractor-note').textContent = `Hosted-synthetic extraction did not run: ${e.message}. Configure MODEL_API_KEY on the server, or use the declared local locus.`;
      renderTwin();
      return;
    }
  }
  const verified = verifyQuotes(sightings, text);
  if (verified.rejected.length) {
    await crumb('ens.evidence.reject', 'debrief:demo', `${verified.rejected.length} sighting(s) rejected by code: quote empty, learner unknown, or quote not verbatim in the debrief (the extractor proposes, code disposes)`, { rejected: verified.rejected.length });
  }
  await crumb('ens.evidence.extract', 'debrief:demo', locus === 'local'
    ? `Extraction ran at the declared local locus (this machine, stub); ${verified.ok.length} verified sighting(s), ${verified.rejected.length} rejected`
    : `Extraction ran via the expressly authorized hosted-synthetic path; synthetic debrief text was sent to the declared Meta endpoint; ${verified.ok.length} verified sighting(s), ${verified.rejected.length} rejected`,
  { extractor: extractorLabel, locus, parent: reg.warrant_id });
  SIGHTINGS = verified.ok;
  CLAIMS = [];
  for (const s of verified.ok) {
    const cl = claimFrom(s);
    const id = `claim_${RUN_ID}_${++CLAIM_SEQ}`;
    const cc = await crumb('ens.claim.assert', id, `${cl.class} proposed from verified sighting evidence; confidence ${cl.confidence}; awaits teacher sign-off`, { learner: s.learner, match: s.match });
    CLAIMS.push({ id, learner: s.learner, quote: s.quote, match: s.match, extractor: s.extractor || extractorLabel, contested: false, status: 'proposed', ...cl, crumb: cc.warrant_id });
  }
  $('extractor-note').textContent = `Extractor used: ${extractorLabel}. ${verified.ok.length} sighting(s) quote-verified in code${verified.rejected.length ? `, ${verified.rejected.length} rejected` : ''}. Claims are proposed — a teacher signs them into the Twin.`;
  renderTwin();
}

// --- init ---
$('learners').textContent = LEARNERS.map((l) => l.name).join(', ');
$('debrief').value = SAMPLE;
document.querySelectorAll('input[name=locus]').forEach((r) => r.addEventListener('change', renderGates));
$('extract-btn').addEventListener('click', runExtraction);
$('age').addEventListener('input', () => { $('age-val').textContent = $('age').value; renderTwin(); });
$('export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(crumbs, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'trail-export.json' });
  a.click();
});
fetch('/api/config').then((r) => r.json()).then((c) => { meta = c; $('extractor-note').textContent = c.metaConfigured ? `Meta API configured (${c.model}). It is called ONLY on the expressly authorized hosted-synthetic path; the declared local locus never contacts it.` : 'Meta API not configured. Local locus uses the deterministic LOCAL STUB — not a model; hosted-synthetic will refuse.'; }).catch(() => {});
(async () => {
  await crumb('ens.session.open', 'demo', 'Synthetic demo session opened; all learners are synthetic personas');
  renderGates();
  renderTwin();
})();
