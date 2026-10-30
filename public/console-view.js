// D-018 (Subok): the Agent Console's technical layer.
//
// One run, one trail, two views. This file draws the console from the same
// state the walkthrough uses: app.js's top-level TURNS, crumbs, CLAIMS and
// SESSION_ID, read directly (classic scripts share one global scope). It keeps
// no copy of its own and never replays or invents a run. The trail itself is
// the original #trail-panel, which Sol's story shell (D-017) moves into the
// console; this file only marks rows in it.
//
// Navigation between the views is one event, shared with the shell:
//   document.dispatchEvent(new CustomEvent('ens:navigate', { detail: {
//     view: 'console' | 'review', warrantId?, claimId? } }))
// The shell shows the surface. With this file installed, record selection is
// ours: the named turn and trail entry in the console, or the claim's chain in
// review. Without the shell, the existing view buttons do the showing.
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
      const at = crumbById(t.crumb);
      const human = t.kind === 'HUMAN';
      return `
      <div class="turn cv-turn ${human ? 'human-turn' : ''} ${t.crumb && t.crumb === selected ? 'cv-selected' : ''}" data-turn="${t.n}" data-warrant-id="${esc(t.crumb || '')}">
        <div class="cv-head">
          <span class="chip ${human ? 'human' : ''}">${esc(t.kind)}</span>
          <strong>Turn ${t.n} — ${esc(t.title)}</strong>
          ${L.pill(L.forTurn(t))}
        </div>
        <small>${esc(t.detail)}</small>
        ${t.kind === 'JUDGE' ? judgeBody(t) : ''}
        ${inspectorParts(t)}
        ${at ? `<button type="button" class="cv-link" data-cv-crumb="${esc(at.warrant_id)}">trail at this turn: ${esc(short(at.warrant_id))} · ${esc(at.action)}</button>` : ''}
      </div>`;
    }).join('');
  }

  function bandHtml() {
    const live = L.forSession(TURNS);
    const runs = Math.max(0, ...CLAIMS.map((c) => c.run || 0));
    const trail = TRAIL_VERIFIED === null
      ? `<span class="cv-pill">Trail: ${crumbs.length} entries, not yet recomputed</span>`
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
    return `<span>The same session you walked, not a recording. Opened from <strong>the claim about ${esc(claim.learner)}</strong>; its trail entry is selected.</span>
      <button type="button" class="cv-back" data-cv-back="${esc(claim.id)}">← Back to the claim</button>`;
  }

  function ensureMounts() {
    const panel = $('console-panel');
    if (!panel) return false;
    if (!$('cv-band')) {
      const grid = $('console-grid');
      panel.insertBefore(Object.assign(document.createElement('div'), { id: 'cv-band', className: 'cv-band' }), grid);
      panel.insertBefore(Object.assign(document.createElement('div'), { id: 'cv-opened', className: 'cv-opened' }), grid);
    }
    return true;
  }

  // Mark the selected entry in the original trail. app.js redraws #trail on
  // every crumb, so the mark is reapplied after each redraw.
  function markTrail() {
    document.querySelectorAll('#trail .cv-selected').forEach((el) => el.classList.remove('cv-selected'));
    if (selected) document.querySelector(`#trail [data-crumb-id="${CSS.escape(selected)}"]`)?.classList.add('cv-selected');
  }

  /** Band and the way back; app.js calls this after it draws the console. */
  function afterRender() {
    if (!ensureMounts()) return;
    $('cv-band').innerHTML = bandHtml();
    $('cv-opened').innerHTML = openedHtml();
    $('cv-opened').hidden = !$('cv-opened').innerHTML;
    markTrail();
  }

  function select(warrantId) {
    selected = warrantId || null;
    renderConsole();
    if (!selected) return;
    const turnEl = document.querySelector(`#turns [data-warrant-id="${CSS.escape(selected)}"]`);
    const rowEl = document.querySelector(`#trail [data-crumb-id="${CSS.escape(selected)}"]`);
    (turnEl || rowEl)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // After the shell has shown the surface, pick the record the event names.
  function navigate(detail = {}) {
    const claim = detail.claimId && claimById(detail.claimId);
    const shell = Boolean(window.ensUI);
    // A task, not an animation frame: frames pause in a hidden tab.
    setTimeout(() => {
      if (detail.view === 'console') {
        openedFrom = claim ? claim.id : null;
        if (!shell && $('console-panel')?.hidden) $('view-console')?.click();
        select(claim && (!detail.warrantId || detail.warrantId === claim.crumb) ? latestCrumbFor(claim) : detail.warrantId || null);
      } else if (detail.view === 'review') {
        if (!shell) $('view-teacher')?.click();
        if (claim) highlightChain(claim);
      }
    }, 0);
  }

  const go = (detail) => document.dispatchEvent(new CustomEvent('ens:navigate', { detail }));
  document.addEventListener('ens:navigate', (e) => navigate(e.detail || {}));
  document.addEventListener('click', (e) => {
    const back = e.target.closest('[data-cv-back]');
    const crumbBtn = e.target.closest('[data-cv-crumb]');
    // With the shell present it leaves the view buttons to us: route them
    // through the shared event. Opening the console by hand starts fresh.
    if (window.ensUI && e.target.closest('#view-console')) { openedFrom = null; selected = null; go({ view: 'console' }); }
    else if (window.ensUI && e.target.closest('#view-teacher')) go({ view: 'review' });
    else if (!window.ensUI && e.isTrusted && e.target.closest('#view-console')) { openedFrom = null; selected = null; }
    if (back) go({ view: 'review', claimId: back.dataset.cvBack });
    else if (crumbBtn) select(crumbBtn.dataset.cvCrumb);
  });
  document.addEventListener('ens:crumb', () => { if (!$('console-panel')?.hidden) afterRender(); });

  // Step through holds a run between turns. The run is started from the
  // walkthrough, but Next turn lives in the console, so the walkthrough says
  // the run is paused and offers both ways on (R10-5d). The note is removed
  // as soon as the turn is released.
  function pauseNote() {
    let note = $('cv-pause-note');
    if (!note) {
      note = Object.assign(document.createElement('div'), { id: 'cv-pause-note', className: 'cv-pause-note' });
      note.setAttribute('role', 'status');
      note.innerHTML = `<span><strong>Paused by Step through.</strong> The run waits for the next turn, so you can inspect what the model saw before it continues.</span>
        <span class="cv-pause-actions"><button type="button" class="cv-link" data-cv-next-turn>Next turn ▸</button>
        <button type="button" class="cv-link" data-cv-open-console>Open the Agent Console ▸</button></span>`;
      $('extract-btn')?.insertAdjacentElement('afterend', note);
    }
    return note;
  }
  document.addEventListener('ens:step-wait', () => { pauseNote().hidden = false; });
  document.addEventListener('ens:step-release', () => { const note = $('cv-pause-note'); if (note) note.hidden = true; });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-cv-next-turn]')) $('next-turn')?.click();
    else if (e.target.closest('[data-cv-open-console]')) go({ view: 'console' });
  });

  window.ENSConsole = Object.freeze({ turnsHtml, afterRender, navigate });
  renderConsole(); // initialise from current state; ens:ui-ready may already have fired
})();
