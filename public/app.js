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
      ['3. In-Flight Transit Scope', 'Pass', 'No hosted transit: debrief and sightings stay on this machine (browser ↔ local server ↔ local Ollama).'],
      ['4. Instrument Identity and Held Weights', 'Pass', 'The extractor is pinned and named in every crumb: the Ollama model actually run on this machine, or — only if it is unavailable — the labelled LOCAL STUB.'],
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
//   JSON.stringify({action, target, context, from, issued_at}) with keys
//   deep-sorted at every level (the replacer sorts the root object too).
//   Anyone holding the exported trail can recompute it byte for byte.
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
  document.dispatchEvent(new CustomEvent('ens:crumb', { detail: { warrantId: c.warrant_id } }));
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
let RUN_SEQ = 0;
let TRAIL_VERIFIED = null; // null until the Verify-trail check actually runs (D-004 P1-1)
const SESSION_ID = randHex(3); // trails exported from two sessions cannot collide (D-004 round 3)
function verifyQuotes(sightings, text) {
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const sourceNorm = norm(text);
  const ok = [], rejected = [];
  for (const s of sightings || []) {
    const quote = String(s?.quote || '');
    const firstName = String(s?.learner || '').split(' ')[0];
    // A verified quote must be evidence about THIS learner (D-004 V3):
    // nonempty and long enough to mean something, naming the learner,
    // and verbatim in the debrief.
    if (!s || !LEARNER_NAMES.has(s.learner) || norm(quote).length < 20 || !new RegExp(`\\b${firstName}\\b`).test(quote)) { rejected.push(s); continue; }
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
let COVERAGE_REPORT = null;
const $ = (id) => document.getElementById(id);

// --- Agent Console (D-008): turns over the same run state ---
const TURNS = [];
const TOOLS = [
  ['channel_admit(locus)', 'code', 'Deterministic, code not model: admit the capture channel only if all Nine Gates pass at the declared locus. Refused: hosted without declaration.'],
  ['evidence_extract(debrief)', 'model', 'Extract sightings from the debrief at the admitted locus. Cannot run before admission.'],
  ['evidence_verify(sightings)', 'code', 'Deterministic, code not model: learner whitelisted, quote verbatim and naming the learner, >=20 chars. The extractor cannot call or skip this.'],
  ['claim_propose(sighting)', 'code', 'Deterministic, code not model: propose a claim from a verified sighting by fixed rules (claimFrom). Enters nothing by itself.'],
  ['claim_signoff(claim)', 'human', 'HUMAN ONLY. A teacher admits a proposed claim to the Twin. No model may call this.'],
  ['claim_contest(claim)', 'human', 'HUMAN ONLY. Mark a claim contested; preserved, never deleted.'],
  ['sighting_record(teacher, manual)', 'human', 'HUMAN ONLY, model off. Teacher writes a sighting by hand; verified under the teacher-authored posture and enters the same sign-off/trail pipeline. No model runs.'],
];
let stepResolve = null;
function waitStep() {
  if (!$('step-mode')?.checked) return Promise.resolve();
  $('next-turn').disabled = false;
  return new Promise((r) => { stepResolve = r; });
}
function turn(kind, title, detail, inspector) {
  // crumb: the newest trail entry when this turn ran (D-018 cross-link).
  const t = { n: TURNS.length + 1, kind, title, detail, inspector: inspector || null, at: new Date().toISOString(), crumb: lastCrumb };
  TURNS.push(t); renderConsole();
  document.dispatchEvent(new CustomEvent('ens:turn', { detail: { n: t.n, warrantId: t.crumb } }));
  return t;
}
function renderConsole() {
  if (!$('tools-list')) return;
  const CV = window.ENSConsole; // D-018: the console view draws the turns and the session band when loaded
  $('tools-list').innerHTML = TOOLS.map(([sig, who, note]) =>
    `<div class="tool ${who === 'human' ? 'human' : ''}"><code>${escapeHtml(sig)}</code> <span class="st ${who === 'human' ? 'held' : 'open'}">${who}</span><br><small>${escapeHtml(note)}</small></div>`).join('');
  $('turns').innerHTML = CV ? CV.turnsHtml(TURNS) : TURNS.length ? TURNS.map((t) => `
    <div class="turn ${t.kind === 'HUMAN' ? 'human-turn' : ''}">
      <span class="chip ${t.kind === 'HUMAN' ? 'human' : ''}">${escapeHtml(t.kind)}</span>
      <strong> Turn ${t.n} — ${escapeHtml(t.title)}</strong><br><small>${escapeHtml(t.detail)}</small>
      ${t.inspector ? `<details><summary>what the model saw / raw record</summary><pre>${escapeHtml(t.inspector)}</pre></details>` : ''}
    </div>`).join('') : '<p><small>No turns yet. Run the gate to begin.</small></p>';
  // Checklist: Nine Gates (from current gate walk state) + run milestones.
  const locus = document.querySelector('input[name=locus]:checked')?.value || 'hosted';
  const g9 = GATE9[locus];
  const items = [
    ...GATES_1_8.map(([g]) => [g.split('—')[0].trim(), 'done', 'walked in UI']),
    ['Gate 9 — Processing Locus', g9.admitted ? 'done' : 'held', g9.disposition.split('.')[0]],
    ['Sightings verified', SIGHTINGS.length ? 'done' : 'open', `${SIGHTINGS.length} verified sighting(s) in code`],
    ['Extraction coverage', COVERAGE_REPORT ? (COVERAGE_REPORT.passed ? 'done' : 'open') : 'open', COVERAGE_REPORT ? `${COVERAGE_REPORT.covered}/${COVERAGE_REPORT.total} (${COVERAGE_REPORT.percentage}%) — threshold ≥${COVERAGE_REPORT.thresholdPercentage}%` : 'Awaiting extraction'],
    ['Claims signed into Twin', CLAIMS.some((c) => c.status === 'signed') ? 'done' : 'open', `${CLAIMS.filter((c) => c.status === 'signed').length}/${CLAIMS.length} signed`],
    ['Trail recomputes', TRAIL_VERIFIED === null ? 'open' : TRAIL_VERIFIED ? 'done' : 'held', TRAIL_VERIFIED === null ? 'not yet recomputed — use Verify trail' : TRAIL_VERIFIED ? 'every crumb hash recomputed in browser' : 'RECOMPUTATION FAILED — trail altered'],
  ];
  $('checklist').innerHTML = items.map(([name, st, by]) =>
    `<div class="check"><span class="st ${st}">${st.toUpperCase()}</span> <strong>${escapeHtml(name)}</strong><br><small>Settled by: ${escapeHtml(by)}</small></div>`).join('');
  CV?.afterRender();
}

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
  renderConsole();
}

function decayed(claim) {
  const days = Number($('age').value);
  return Math.max(0.05, claim.confidence * Math.exp(-days / 90)).toFixed(2);
}

function claimCard(c, i) {
  const d = Number(decayed(c));
  return `
    <article class="claim ${c.contested ? 'contested' : ''}" data-claim-card="${escapeHtml(c.id)}" title="Select to highlight this claim's crumb chain">
      <h4>${escapeHtml(c.learner)} — ${escapeHtml(c.class)} <small>[${escapeHtml(c.status)} · run ${c.run ?? 1}]</small></h4>
      <p>${escapeHtml(c.statement)}</p>
      <div class="meter"><i style="width:${Math.round(d * 100)}%"></i></div>
      <p><small>Confidence ${c.confidence} at assertion → <strong>${d.toFixed(2)}</strong> after ${$('age').value} days (computed at read time — drag the slider)</small></p>
      <blockquote>“${escapeHtml(c.quote)}”</blockquote>
      <p><small>Extractor: ${escapeHtml(c.extractor)} · quote verified in code (${escapeHtml(c.match || 'literal')} match) · quote ${escapeHtml((c.quoteHash || '').slice(0, 19))}… · statement ${escapeHtml((c.statementHash || '').slice(0, 19))}…<br>
      ${c.contested ? '<strong>CONTESTED</strong> — preserved, never deleted (WT-I07). ' : ''}</small></p>
      ${c.judgment ? (Object.values(c.judgment.answers).some((a) => a?.failed)
        ? `<p><small><strong>DecisionJudge did not answer</strong> (${escapeHtml(c.judgment.judge.adapter)}/${escapeHtml(c.judgment.judge.model)}): one or more questions failed after retries. This is not a judgment of uncertainty. Advisory only; the teacher's reading stands on its own.</small></p>`
        : `<p><small><strong>DecisionJudge</strong> (${escapeHtml(c.judgment.judge.adapter)}/${escapeHtml(c.judgment.judge.model)}, ${escapeHtml(c.judgment.judge.signal)}): support ${escapeHtml(c.judgment.answers.support?.answer || '?')} (p=${c.judgment.answers.support?.probabilities?.true ?? '—'}), attribution ${escapeHtml(c.judgment.answers.attribution?.answer || '?')}, route: ${escapeHtml(c.judgment.routing.flags.join('; ') || 'no flags')} · attention: ${escapeHtml(c.judgment.routing.attention)}</small></p>`) : ''}
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
  document.querySelectorAll('[data-claim-card]').forEach((card) => card.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    highlightChain(CLAIMS.find((c) => c.id === card.dataset.claimCard));
  }));
  document.querySelectorAll('[data-contest]').forEach((b) => b.addEventListener('click', async () => {
    const c = CLAIMS[Number(b.dataset.contest)];
    c.contested = true;
    await crumb('ens.claim.contest', c.id, 'Teacher contests the claim; claim preserved and marked contested', { claim: c.id });
    turn('HUMAN', `claim_contest(${c.id})`, 'Human turn: teacher contests the claim; it is preserved, never deleted', null);
    renderTwin(); renderConsole();
  }));
  document.querySelectorAll('[data-signoff]').forEach((b) => b.addEventListener('click', async () => {
    const c = CLAIMS[Number(b.dataset.signoff)];
    // Contesting is not vetoing (D-004 V6): a contested claim may still be
    // signed, but never silently — the teacher confirms with eyes open and
    // the crumb records that the claim was contested at sign-off.
    if (c.contested && !confirm('This claim is CONTESTED. Contesting is not vetoing, but sign-off will admit it to the Twin with its contest attached. Continue?')) return;
    c.status = 'signed';
    await crumb('ens.claim.signoff', c.id, c.contested
      ? 'Teacher sign-off of a CONTESTED claim: admitted with contest attached, eyes open'
      : 'Teacher sign-off: claim admitted to the Twin by a human, not by the extractor', { claim: c.id, contested_at_signoff: Boolean(c.contested) });
    turn('HUMAN', `claim_signoff(${c.id})`, 'Human turn: teacher admits the claim to the Twin. No model may call this tool.', null);
    renderTwin(); renderConsole();
  }));
}

function renderTrail() {
  $('trail').innerHTML = crumbs.map((c) =>
    `<div class="crumb" data-crumb-id="${escapeHtml(c.warrant_id)}" data-crumb-claim="${escapeHtml(c.context.claim || '')}"><code>${escapeHtml(c.warrant_id)}</code> <strong>${escapeHtml(c.action)}</strong> → ${escapeHtml(c.target)}<br><small>from: ${escapeHtml(c.from || 'null (root)')} · ${escapeHtml(c.issued_at)}<br>${escapeHtml(c.context.note || '')}</small></div>`).join('');
}

// Selecting a claim highlights its crumb chain: the asserting crumb plus
// every later crumb that names the claim (sign-off, contest).
function highlightChain(claim) {
  document.querySelectorAll('.crumb.highlight, .claim.highlight').forEach((el) => el.classList.remove('highlight'));
  if (!claim) return;
  const ids = new Set([claim.crumb]);
  crumbs.forEach((c) => { if (c.context.claim === claim.id) ids.add(c.warrant_id); });
  let first = null;
  document.querySelectorAll('[data-crumb-id]').forEach((el) => {
    if (ids.has(el.dataset.crumbId)) { el.classList.add('highlight'); first = first || el; }
  });
  document.querySelector(`[data-claim-card="${CSS.escape(claim.id)}"]`)?.classList.add('highlight');
  first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function runExtraction() {
  const locus = document.querySelector('input[name=locus]:checked').value;
  const regNote = {
    hosted: 'Channel HELD at Gate 9: undeclared hosted locus; extraction refused',
    local: 'Channel admitted ON SPECIFICATION under Gate 9 declared local locus; condition 6 outstanding; extraction strictly local (local Ollama model on this machine; no hosted API call)',
    'hosted-synthetic': 'Channel admitted FOR SYNTHETIC DATA ONLY under expressly authorized hosted path; NOT Gate 9 compliance for real learner data',
  }[locus];
  const reg = await crumb('ens.channel.register', 'channel:post-class-debrief', regNote,
    { locus, gate9: locus === 'hosted' ? 'held' : locus === 'local' ? 'admitted-on-specification' : 'admitted-synthetic-only', synthetic_only: locus === 'hosted-synthetic' });
  turn('GATE', `channel_admit(locus="${locus}")`, regNote, JSON.stringify(reg, null, 2));
  await waitStep();
  if (locus === 'hosted') { renderTwin(); renderConsole(); return; }

    const text = $('debrief').value;
  const MAX_RETRIES = 2; // at most 2 retries (3 attempts total), local locus only
  let attempt = 0;
  let verified = null;
  let extractorLabel = '';
  let retryPayload = null;
  // P2-5: Accumulate verified sightings across attempts so earlier attempt successes survive later partial runs
  const accumulatedVerified = new Map();

  while (attempt <= MAX_RETRIES) {
    attempt++;
    const isRetry = attempt > 1;
    let sightings;

    if (locus === 'local') {
      try {
        const res = await fetch('/api/local-extract', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            text,
            learners: LEARNERS.map((l) => l.name),
            gate: { mode: 'local', admitted: true },
            retry: retryPayload ? { attempt: attempt - 1, rejected: retryPayload } : null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `server ${res.status}`);
        sightings = data.sightings;
        sightings._metrics = data.metrics; sightings._raw = data.rawModelOutput; sightings._prompt = data.promptSent; sightings._serverRejected = data.rejectedDetails || [];
        extractorLabel = `Ollama local model (${data.locus?.model || 'muse-glimmer'}) on this machine`;
      } catch (e) {
        sightings = stubExtract(text);
        extractorLabel = `LOCAL STUB — not a model (local model unavailable: ${e.message}; stub carried this run, on this machine only)`;
      }
    } else {
      // hosted-synthetic: single attempt (retry loop is out of scope for live hosted per D-009)
      try {
        const res = await fetch('/api/extract', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, learners: LEARNERS.map((l) => l.name), gate: { mode: 'hosted-synthetic', admitted: true, syntheticOnly: true } }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `server ${res.status}`);
        sightings = data.sightings;
        sightings._serverRejected = data.rejectedDetails || [];
        extractorLabel = `Meta model via API (${data.locus?.model || meta.model}) at ${data.locus?.endpoint || 'declared endpoint'} — synthetic data sent, expressly authorized`;
      } catch (e) {
        await crumb('ens.evidence.reject', 'debrief:demo', `Hosted-synthetic extraction refused/failed: ${e.message}. No fallback applied in this mode.`, { locus });
        $('extractor-note').textContent = `Hosted-synthetic extraction did not run: ${e.message}. Configure MODEL_API_KEY on the server, or use the declared local locus.`;
        renderTwin();
        return;
      }
    }

    const m = sightings._metrics || {};
    const turnKind = isRetry ? 'RETRY' : 'EXTRACT';
    const turnTitle = isRetry ? `evidence_extract (retry ${attempt - 1}/${MAX_RETRIES}) via ${extractorLabel}` : `evidence_extract via ${extractorLabel}`;
    turn(turnKind, turnTitle,
      `${sightings.length} raw sighting(s) proposed${m.evalTokens ? ` · ${m.promptTokens ?? '?'} prompt + ${m.evalTokens} eval tokens · ${m.totalSeconds ?? '?'}s (measured by Ollama)` : ''}`,
      sightings._prompt ? `PROMPT SENT:\n${sightings._prompt}\n\nRAW MODEL OUTPUT (before verification):\n${sightings._raw || ''}` : JSON.stringify(sightings, null, 2));
    await waitStep();

    verified = verifyQuotes(sightings, text);
    const allRejected = [...(sightings._serverRejected || []), ...verified.rejected];
    verified.rejected = allRejected;

    // P2-5: register newly verified sightings into the session accumulator
    for (const s of (verified.ok || [])) {
      const key = `${s.learner}:::${s.quote}`;
      if (!accumulatedVerified.has(key)) {
        accumulatedVerified.set(key, s);
      }
    }
    const currentCombinedOk = Array.from(accumulatedVerified.values());

    $('verify-feedback').innerHTML = allRejected.length
      ? `<span class="fail">✗ ${allRejected.length} rejected</span> <small>${allRejected.map((s) => `${escapeHtml(s?.quote || '(empty)')} — ${escapeHtml(s?.reason || 'not verbatim')}`).join(' · ')}</small>`
      : `<span class="pass">✓ all ${currentCombinedOk.length} sightings pass deterministic checks</span> <small>quote verbatim · names learner · ≥20 chars · learner whitelisted</small>`;
    turn('VERIFY', isRetry ? `evidence_verify (retry ${attempt - 1} checks, code not model)` : 'evidence_verify (code, not model)',
      `${verified.ok.length} verified, ${verified.rejected.length} rejected — deterministic checks, the extractor cannot skip this`,
      JSON.stringify({ accepted: currentCombinedOk, rejected: verified.rejected }, null, 2));
    await waitStep();

    if (verified.rejected.length > 0) {
      await crumb('ens.evidence.reject', 'debrief:demo', `${verified.rejected.length} sighting(s) rejected by code: quote empty, learner unknown, or quote not verbatim in the debrief (the extractor proposes, code disposes)`, { rejected: verified.rejected.length, attempt });
      if (locus === 'local' && attempt <= MAX_RETRIES) {
        retryPayload = verified.rejected;
        await crumb('ens.evidence.retry', 'debrief:demo', `Bounded retry ${attempt}/${MAX_RETRIES}: returning ${verified.rejected.length} rejection reason(s) verbatim to local extractor`, { attempt, reasons: verified.rejected.map((r) => r.reason || 'not verbatim') });
        continue;
      } else if (locus === 'local' && attempt > MAX_RETRIES) {
        // Retries exhausted: escalate unresolved rejections to teacher (P2-1)
        await crumb('ens.evidence.escalate', 'debrief:demo', `Verification rejections unresolved after ${MAX_RETRIES} retries (${attempt} attempts exhausted); ${verified.rejected.length} unresolved rejection(s) escalated to teacher`, { attempts: attempt, unresolved_rejections: verified.rejected.length });
        turn('ESCALATE', 'Human escalation — unresolved rejections', `${verified.rejected.length} sighting(s) unresolved after ${MAX_RETRIES} retries. Escalated to teacher; ${currentCombinedOk.length} verified sighting(s) proceed to proposed claims.`, JSON.stringify(verified.rejected, null, 2));
        if (currentCombinedOk.length === 0) {
          $('extractor-note').innerHTML = `<strong class="fail">PROPOSED CLAIMS BLOCKED:</strong> All ${verified.rejected.length} sightings failed verification after ${MAX_RETRIES} retries.`;
          renderTwin();
          renderConsole();
          return;
        }
        break;
      }
    } else {
      break;
    }

    if (locus !== 'local') break;
  }

  const finalVerifiedSightings = Array.from(accumulatedVerified.values());
  const finalRejectedSightings = verified?.rejected || [];

  // Score coverage against ground truth fixtures (generalized with debriefText)
  try {
    const covRes = await fetch('/api/coverage', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sightings: finalVerifiedSightings,
        debriefId: 'sample-post-class-debrief',
        debriefText: text,
      }),
    });
    if (covRes.ok) {
      COVERAGE_REPORT = await covRes.json();
    }
  } catch {
    COVERAGE_REPORT = null;
  }

  const runNo = ++RUN_SEQ;
  await crumb('ens.evidence.extract', 'debrief:demo', locus === 'local'
    ? `Extraction ran at the declared local locus (this machine; extractor: ${extractorLabel}); ${finalVerifiedSightings.length} verified sighting(s), ${finalRejectedSightings.length} rejected`
    : `Extraction ran via the expressly authorized hosted-synthetic path; synthetic debrief text was sent to the declared Meta endpoint; ${finalVerifiedSightings.length} verified sighting(s), ${finalRejectedSightings.length} rejected`,
  { extractor: extractorLabel, locus, parent: reg.warrant_id, run: runNo, debrief_hash: 'sha256:' + (await sha256Hex(text)) });

  SIGHTINGS = [...SIGHTINGS, ...finalVerifiedSightings];
  for (const s of finalVerifiedSightings) {
    const cl = claimFrom(s);
    const id = `claim_${SESSION_ID}_r${runNo}_${++CLAIM_SEQ}`;
    const cc = await crumb('ens.claim.assert', id, `${cl.class} proposed from verified sighting evidence; confidence ${cl.confidence}; awaits teacher sign-off`, {
      learner: s.learner, match: s.match, run: runNo,
      quote_hash: 'sha256:' + (await sha256Hex(s.quote)),
      statement_hash: 'sha256:' + (await sha256Hex(cl.statement)),
    });
    CLAIMS.push({ id, run: runNo, learner: s.learner, quote: s.quote, match: s.match, extractor: s.extractor || extractorLabel, contested: false, status: 'proposed', ...cl, quoteHash: cc.context.quote_hash, statementHash: cc.context.statement_hash, crumb: cc.warrant_id });
  }

  turn('PROPOSE', 'claim_propose from verified sightings',
    `${finalVerifiedSightings.length} claim(s) proposed; none enters the Twin without teacher sign-off`, null);
  const coverageNote = (COVERAGE_REPORT && !COVERAGE_REPORT.passed)
    ? ` <span class="warn">(Coverage shortfall: ${COVERAGE_REPORT.covered}/${COVERAGE_REPORT.total} below threshold ${COVERAGE_REPORT.thresholdPercentage}%; surfaces to teacher for review)</span>`
    : '';
  const escalationNote = finalRejectedSightings.length
    ? ` <span class="fail">(${finalRejectedSightings.length} rejected sighting(s) escalated to teacher after retries)</span>`
    : '';
  $('extractor-note').innerHTML = `Extractor used: ${extractorLabel}. ${finalVerifiedSightings.length} sighting(s) quote-verified in code.${escalationNote}${coverageNote} Claims are proposed — a teacher signs them into the Twin.`;
  renderTwin();
  renderConsole();
}

// --- D-015: manual (model-off) sighting entry ---
// The teacher records a sighting by hand. It is NOT the automated extraction
// path: no model (Ollama / Meta / stub) runs. It is verified under the
// teacher-authored posture (learner whitelisted + substantive text), then
// enters the SAME downstream pipeline — claim proposal, teacher sign-off,
// contest, warrant crumb — with distinct manual labels. window.ensManual is
// the deferred ES module (public/manual-sighting.mjs); it has loaded by the
// time a user clicks, since it only runs at event time.
let MANUAL_SEQ = 0;
async function recordManualSighting() {
  const M = window.ensManual;
  if (!M) { $('manual-note').textContent = 'The manual-entry module did not load; nothing was recorded.'; return; }
  const learner = $('manual-learner').value;
  const observation = String($('manual-observation').value || '').trim();
  const entries = [{ learner, observation }];
  const { ok, rejected } = M.verifyManualSighting(entries, LEARNER_NAMES);

  if (rejected.length) {
    await crumb('ens.evidence.reject', 'manual-entry', `Manual sighting rejected (teacher-authored posture): ${rejected[0].reason}`, { learner, reason: rejected[0].reason, manual: true });
    $('manual-note').textContent = `Rejected: ${rejected[0].reason}. A sighting needs a named learner and at least ${M.MIN_OBSERVATION_CHARS} characters of your own observation.`;
    turn('REJECT', 'sighting_record(teacher, manual) — rejected in code', `${rejected[0].reason}; nothing entered the Twin`, JSON.stringify(entries, null, 2));
    return;
  }

  const s = ok[0];
  const runNo = ++RUN_SEQ;
  await crumb('ens.evidence.extract', 'manual-entry',
    `Manual sighting recorded by hand with the model OFF; teacher-authored evidence is not a model quote, so it is verified substantively, not verbatim-in-debrief; ${s.learner} labelled ${s.extractor}`,
    { extractor: M.MANUAL_EXTRACTOR_LABEL, locus: 'manual', model_off: true, run: runNo });
  turn('MANUAL', `sighting_record(teacher, manual) — ${s.learner}`,
    'Model off: the teacher wrote the observation by hand; verified under the teacher-authored posture (learner + substance), not verbatim-in-debrief',
    JSON.stringify(entries, null, 2));
  await waitStep();

  SIGHTINGS.push(s);
  const cl = claimFrom(s);
  const id = `claim_${SESSION_ID}_m${runNo}_${++MANUAL_SEQ}`;
  const cc = await crumb('ens.claim.assert', id,
    `${cl.class} proposed from a manual, model-off sighting (teacher-authored); confidence ${cl.confidence}; awaits teacher sign-off`,
    { learner: s.learner, match: s.match, source: 'manual', run: runNo,
      quote_hash: 'sha256:' + (await sha256Hex(s.quote)),
      statement_hash: 'sha256:' + (await sha256Hex(cl.statement)) });
  CLAIMS.push({ id, run: runNo, learner: s.learner, quote: s.quote, match: s.match, extractor: s.extractor, source: 'manual', contested: false, status: 'proposed', ...cl, quoteHash: cc.context.quote_hash, statementHash: cc.context.statement_hash, crumb: cc.warrant_id });

  turn('PROPOSE', 'claim_propose from the manual sighting',
    'One claim proposed from the teacher-authored sighting; it enters the Twin only on teacher sign-off, like every claim', null);
  $('manual-note').textContent = `Recorded ${s.learner} by hand (model off) — a claim is proposed. Sign it off in the Twin panel to admit it; the crumb trail carries the manual label.`;
  $('manual-observation').value = '';
  renderTwin();
  renderConsole();
}

// --- init ---
$('learners').textContent = LEARNERS.map((l) => l.name).join(', ');
// D-015: populate the manual-entry learner picker from the same whitelist.
$('manual-learner').innerHTML = LEARNERS.map((l) =>
  `<option value="${l.name}">${escapeHtml(l.name)}</option>`).join('');
$('manual-btn').addEventListener('click', recordManualSighting);
$('debrief').value = SAMPLE;
document.querySelectorAll('input[name=locus]').forEach((r) => r.addEventListener('change', renderGates));
$('extract-btn').addEventListener('click', runExtraction);
$('age').addEventListener('input', () => { $('age-val').textContent = $('age').value; renderTwin(); });
$('export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(crumbs, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'trail-export.json' });
  a.click();
});
fetch('/api/config').then((r) => r.json()).then((c) => { meta = c; $('extractor-note').textContent = c.metaConfigured ? `Meta API configured (${c.model}); hosted-synthetic server authorization is ${c.hostedSyntheticAuthorized ? 'ON' : 'OFF (operator must set HOSTED_SYNTHETIC_AUTHORIZED=1)'}. The model is called ONLY on that authorized path; the declared local locus never contacts it.` : 'Meta API not configured. Local locus runs the local Ollama model on this machine (deterministic LOCAL STUB only if that model is unavailable); hosted-synthetic will refuse.'; }).catch(() => {});
$('verify-trail-btn')?.addEventListener('click', async () => {
  let bad = 0;
  for (const c of crumbs) {
    const recomputed = 'sha256:' + (await sha256Hex(canonical({ action: c.action, target: c.target, context: c.context, from: c.from, issued_at: c.issued_at })));
    if (recomputed !== c.content_hash) bad++;
  }
  TRAIL_VERIFIED = bad === 0;
  $('verify-trail-result').textContent = bad
    ? `✗ ${bad}/${crumbs.length} crumb hash(es) DO NOT recompute. The trail has been altered since the crumbs were written.`
    : `✓ ${crumbs.length}/${crumbs.length} crumb hashes recompute in this browser. Change one byte of a quote, statement, or note and this check fails.`;
  renderConsole();
});
$('judge-btn')?.addEventListener('click', async () => {
  const proposed = CLAIMS.filter((c) => c.status === 'proposed' && !c.judgment);
  if (!proposed.length) { $('judge-note').textContent = 'No unjudged proposed claims. The judge is advisory; it does not change claim status.'; return; }
  $('judge-btn').disabled = true;
  $('judge-note').textContent = `Judging ${proposed.length} claim(s) with the local Glimmer wrapper… (slow on this hardware)`;
  try {
    const res = await fetch('/api/judge', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ claims: proposed.map((c) => ({ learner: c.learner, quote: c.quote, statement: c.statement })), gate: { mode: 'local', admitted: true } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `server ${res.status}`);
    for (let k = 0; k < proposed.length; k++) {
      const c = proposed[k];
      c.judgment = { ...data.results[k], calibration: data.calibration };
      const judgeFailed = Object.values(c.judgment.answers).some((a) => a?.failed);
      await crumb('ens.judgment.assess', c.id, judgeFailed
        ? 'DecisionJudge DID NOT ANSWER after retries. Not an uncertainty judgment. Advisory only; teacher still disposes.'
        : `DecisionJudge advisory: support=${c.judgment.answers.support?.answer}, attribution=${c.judgment.answers.attribution?.answer}, attention=${c.judgment.routing.attention}. Advisory only; teacher still disposes.`, {
        claim: c.id, judge_adapter: c.judgment.judge.adapter, judge_model: c.judgment.judge.model, judge_locus: 'local',
      });
      turn('JUDGE', `DecisionJudge on ${c.id}`, `support=${c.judgment.answers.support?.answer} · attention=${c.judgment.routing.attention} · ${c.judgment.judge.signal}`, JSON.stringify(c.judgment, null, 2));
    }
    const anyFailed = CLAIMS.some((c) => c.judgment && Object.values(c.judgment.answers).some((a) => a?.failed));
    $('judge-note').textContent = anyFailed
      ? `The judge did not answer one or more questions after retries (shown as DID NOT ANSWER, not uncertainty). ${data.calibration || ''}`
      : `Judged. ${data.calibration || ''}`;
  } catch (e) {
    $('judge-note').textContent = `DecisionJudge did not run: ${e.message}. Claims remain proposed; sign-off is unaffected.`;
  }
  $('judge-btn').disabled = false;
  renderTwin(); renderConsole();
});
$('next-turn')?.addEventListener('click', () => { $('next-turn').disabled = true; stepResolve?.(); stepResolve = null; });
$('view-teacher')?.addEventListener('click', () => { $('console-panel').hidden = true; $('view-teacher').classList.add('on'); $('view-console').classList.remove('on'); });
$('view-console')?.addEventListener('click', () => { $('console-panel').hidden = false; renderConsole(); $('view-console').classList.add('on'); $('view-teacher').classList.remove('on'); $('console-panel').scrollIntoView({ behavior: 'smooth' }); });

(async () => {
  await crumb('ens.session.open', 'demo', 'Synthetic demo session opened; all learners are synthetic personas');
  renderGates();
  renderTwin();
  renderConsole();
})();
