// D-018 (Subok): the Agent Console's technical layer.
//
// One run, one trail, two views. This file draws the console from the same
// state the walkthrough uses: app.js's top-level TURNS, crumbs, CLAIMS and
// SESSION_ID, read directly (classic scripts share one global scope). It keeps
// no copy of its own and never replays or invents a run.
//
// Navigation between the views is one event, shared with the story shell:
//   document.dispatchEvent(new CustomEvent('ens:navigate', { detail: {
//     view: 'console' | 'review', warrantId?, claimId? } }))
// The shell (Sol, D-017) shows and hides surfaces; this file picks the turn,
// crumb or claim the event names. Until the shell owns surfaces, the existing
// view buttons do the showing.
(() => {
  const L = window.ENSLiveness;
  const esc = (s) => escapeHtml(s);
  let selected = null;      // the warrant id the console is showing
  let openedFrom = null;    // the claim the viewer came from, for the way back

  const crumbById = (id) => crumbs.find((c) => c.warrant_id === id) || null;
  const claimById = (id) => CLAIMS.find((c) => c.id === id) || null;
  // The newest trail entry that names a claim: its judgment, sign-off or
  // contest if any, otherwise the crumb that asserted it.
  const latestCrumbFor = (claim) => [...crumbs].reverse().find((c) => c.context.claim === claim.id)?.warrant_id || claim.crumb;
  const short = (id) => (id ? id.slice(0, 10) + '…' : '—');

  function judgeBody(t) {
    let j = null;
    try { j = JSON.parse(t.inspector || 'null'); } catch { /* shown as unreadable */ }
    if (!j) return '<p class="cv-judge-line">The judge record could not be read.</p>';
    const failed = L.judgeFailed(j);
    const answers = ['support', 'attribution', 'needs_support'].map((q) => {
      const a = j.answers?.[q];
      if (!a || a.failed) return `<span class="cv-q">${q}: no answer</span>`;
      const p = a.probabilities?.true;
      return `<span class="cv-q">${q} ${typeof p === 'number' ? p.toFixed(2) : '—'} → ${esc(a.answer)}</span>`;
    }).join('');
    const route = j.routing || { flags: [], attention: 'none' };
    const attention = { none: 'nothing to add', look: 'look', 'look-first': 'look first' }[route.attention] || route.attention;
    return `
      <div class="cv-answers">${answers}</div>
      <p class="cv-judge-line">Code's route: <strong class="cv-att cv-att-${esc(route.attention)}">${esc(attention)}</strong>${route.flags?.length ? ` — ${esc(route.flags.join('; '))}` : ''}</p>
      <p class="cv-fine">${failed ? 'The judge did not answer; this is not uncertainty. ' : ''}Self-reported, uncalibrated model probabilities. The route is code, not the model. Judge: ${esc(j.judge?.adapter || '?')} / ${esc(j.judge?.model || '?')} / local.</p>`;
  }

  function inspectorParts(t) {
    const raw = String(t.inspector || '');
    const m = /^PROMPT SENT:\n([\s\S]*?)\n\nRAW MODEL OUTPUT \(before verification\):\n([\s\S]*)$/.exec(raw);
    if (m) {
      return `<details><summary>Prompt sent ▸</summary><pre>${esc(m[1])}</pre></details>
              <details><summary>Raw model output, before verification ▸</summary><pre>${esc(m[2])}</pre></details>`;
    }
    return raw ? `<details><summary>${t.kind === 'JUDGE' ? 'Judge record ▸' : 'Raw record ▸'}</summary><pre>${esc(raw)}</pre></details>` : '';
  }

  /** The timeline; app.js calls this in place of its own list. */
  function turnsHtml(turns) {
    if (!turns.length) return '<p><small>No turns yet. Run the gate to begin.</small></p>';
    return turns.map((t) => {
      const label = L.forTurn(t);
      const at = crumbById(t.crumb);
      const human = t.kind === 'HUMAN';
      return `
      <div class="turn cv-turn ${human ? 'human-turn' : ''} ${t.crumb && t.crumb === selected ? 'cv-selected' : ''}" data-turn="${t.n}" data-warrant-id="${esc(t.crumb || '')}">
        <div class="cv-head">
          <span class="chip ${human ? 'human' : ''}">${esc(t.kind)}</span>
          <strong>Turn ${t.n} — ${esc(t.title)}</strong>
          ${L.pill(label)}
        </div>
        <small>${esc(t.detail)}</small>
        ${t.kind === 'JUDGE' ? judgeBody(t) : ''}
        ${inspectorParts(t)}
        ${at ? `<button type="button" class="cv-link" data-cv-crumb="${esc(at.warrant_id)}">trail at this turn: ${esc(short(at.warrant_id))} · ${esc(at.action)}</button>` : ''}
      </div>`;
    }).join('');
  }

  function bandHtml() {
    const extracts = TURNS.filter((t) => t.kind === 'EXTRACT' || t.kind === 'RETRY' || t.kind === 'MANUAL');
    const live = extracts.length ? L.forTurn(extracts[extracts.length - 1]) : null;
    const runs = Math.max(0, ...CLAIMS.map((c) => c.run || 0));
    const trail = TRAIL_VERIFIED === null
      ? `<span class="cv-pill cv-open">Trail: ${crumbs.length} entries, not yet recomputed</span>`
      : TRAIL_VERIFIED
        ? `<span class="cv-pill cv-ok">Trail ${crumbs.length}/${crumbs.length} recomputes</span>`
        : '<span class="cv-pill cv-bad">Trail does NOT recompute</span>';
    return `
      <span class="cv-pill cv-synth">SYNTHETIC DATA</span>
      ${live ? L.pill(live) : '<span class="cv-pill">nothing has run yet</span>'}
      <span class="cv-pill cv-mono">session ${esc(SESSION_ID)} · run ${runs || '—'}</span>
      ${trail}`;
  }

  function openedHtml() {
    const claim = openedFrom && claimById(openedFrom);
    if (!claim) return '';
    return `<span>The same session you walked, not a recording. Opened from <strong>the claim about ${esc(claim.learner)}</strong>; its newest trail entry is selected.</span>
      <button type="button" class="cv-back" data-cv-back="${esc(claim.id)}">← Back to the claim</button>`;
  }

  function trailHtml() {
    return crumbs.map((c, i) => {
      const claim = c.context.claim && claimById(c.context.claim);
      return `<div class="cv-crumb ${c.warrant_id === selected ? 'cv-selected' : ''}" data-cv-crumb="${esc(c.warrant_id)}" tabindex="0">
        <span class="cv-n">${String(i + 1).padStart(2, '0')}</span>
        <span class="cv-act">${esc(c.action)}${claim ? ` · ${esc(claim.learner)}` : ''}<br><small>${esc(c.warrant_id)} ← ${esc(c.from || 'root')}</small></span>
        <span class="cv-hash">${esc(c.content_hash.slice(0, 15))}…</span>
        ${claim ? `<button type="button" class="cv-link" data-cv-back="${esc(claim.id)}">open claim ↗</button>` : ''}
      </div>`;
    }).join('');
  }

  function ensureMounts() {
    const panel = $('console-panel');
    if (!panel) return false;
    if (!$('cv-band')) {
      const band = Object.assign(document.createElement('div'), { id: 'cv-band', className: 'cv-band' });
      const opened = Object.assign(document.createElement('div'), { id: 'cv-opened', className: 'cv-opened' });
      const grid = $('console-grid');
      panel.insertBefore(band, grid);
      panel.insertBefore(opened, grid);
    }
    if (!$('cv-trail')) {
      const box = document.createElement('section');
      box.id = 'cv-trail-box';
      box.innerHTML = '<h3>Trail — the same entries the walkthrough wrote</h3><div id="cv-trail" class="cv-trail"></div>';
      $('console-center')?.appendChild(box);
    }
    return true;
  }

  /** Band, way back and trail; app.js calls this after it draws the console. */
  function afterRender() {
    if (!ensureMounts()) return;
    $('cv-band').innerHTML = bandHtml();
    $('cv-opened').innerHTML = openedHtml();
    $('cv-opened').hidden = !$('cv-opened').innerHTML;
    $('cv-trail').innerHTML = trailHtml();
  }

  function select(warrantId, scroll = true) {
    selected = warrantId || null;
    renderConsole();
    if (!scroll || !selected) return;
    const turnEl = document.querySelector(`#turns [data-warrant-id="${CSS.escape(selected)}"]`);
    const crumbEl = document.querySelector(`#cv-trail [data-cv-crumb="${CSS.escape(selected)}"]`);
    (turnEl || crumbEl)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function navigate(detail = {}) {
    if (detail.view === 'console') {
      const claim = detail.claimId && claimById(detail.claimId);
      openedFrom = claim ? claim.id : null;
      if ($('console-panel')?.hidden) $('view-console')?.click();
      select(detail.warrantId || (claim ? latestCrumbFor(claim) : null));
    } else if (detail.view === 'review') {
      const claim = detail.claimId && claimById(detail.claimId);
      $('view-teacher')?.click();
      if (claim) highlightChain(claim);
    }
  }

  document.addEventListener('ens:navigate', (e) => navigate(e.detail));
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open-console]');
    const back = e.target.closest('[data-cv-back]');
    const crumbEl = e.target.closest('[data-cv-crumb]');
    const go = (detail) => document.dispatchEvent(new CustomEvent('ens:navigate', { detail }));
    // Opening the console by hand starts fresh: no claim to go back to.
    if (e.isTrusted && e.target.closest('#view-console')) { openedFrom = null; selected = null; }
    if (open) { e.stopPropagation(); go({ view: 'console', claimId: open.dataset.openConsole }); }
    else if (back) go({ view: 'review', claimId: back.dataset.cvBack });
    else if (crumbEl && crumbEl.closest('#console-panel')) select(crumbEl.dataset.cvCrumb);
  });
  // A new turn or crumb redraws the console only while it is showing.
  for (const name of ['ens:turn', 'ens:crumb']) {
    document.addEventListener(name, () => { if (!$('console-panel')?.hidden) afterRender(); });
  }

  window.ENSConsole = Object.freeze({ turnsHtml, afterRender, navigate });
})();
