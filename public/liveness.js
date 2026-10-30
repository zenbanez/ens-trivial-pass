// D-018 (Subok): one vocabulary for what actually ran, shared by the
// walkthrough and the Agent Console so both views say the same words.
// A label describes what produced a step; it never upgrades one. Anything
// that is not a live model call says so.
(() => {
  const LABELS = {
    live_local: { text: 'LIVE · local', tone: 'live', means: 'The local model ran on this machine, just now.' },
    live_hosted: { text: 'LIVE · hosted (synthetic only)', tone: 'live', means: 'The hosted Meta model ran, under the authorized synthetic-only gate.' },
    stub: { text: 'LOCAL STUB · not a model', tone: 'plain', means: 'Deterministic code stood in because the local model was unavailable.' },
    manual: { text: 'MANUAL ENTRY', tone: 'plain', means: 'A person typed the sighting; no model was involved.' },
    fixture: { text: 'FIXTURE', tone: 'plain', means: 'A stored sample answer was replayed, not a live call.' },
    code: { text: 'CODE · not a model', tone: 'code', means: 'Deterministic code decided this step.' },
    teacher: { text: 'TEACHER', tone: 'human', means: 'A human act. No model may take it.' },
    judge_failed: { text: 'JUDGE DID NOT ANSWER', tone: 'warn', means: 'The judge call failed or never returned usable JSON. This is not the judge being unsure.' },
    escalated: { text: 'ESCALATED TO YOU', tone: 'warn', means: 'Sightings still failed the quote check after the retries. They wait for the teacher.' },
  };

  // A judge answered only if every question it was asked came back usable:
  // present, not failed, with a numeric probability. A missing, partial or
  // unreadable record is a judge that did not answer, never a live one.
  const JUDGE_QUESTIONS = ['support', 'attribution', 'needs_support'];
  const judgeFailed = (judgment) => !judgment || !judgment.answers || JUDGE_QUESTIONS.some((q) => {
    const a = judgment.answers[q];
    return !a || a.failed || typeof a.probabilities?.true !== 'number';
  });

  /** The label for one console turn, read from what the turn recorded. */
  function forTurn(t) {
    const title = String(t?.title || '');
    switch (t?.kind) {
      case 'EXTRACT':
      case 'RETRY':
        if (/LOCAL STUB/.test(title)) return LABELS.stub;
        if (/Meta model via API/.test(title)) return LABELS.live_hosted;
        if (/Ollama local model/.test(title)) return LABELS.live_local;
        return LABELS.fixture;
      case 'JUDGE': {
        let judgment = null;
        try { judgment = JSON.parse(t.inspector || 'null'); } catch { /* unreadable record: say so below */ }
        if (!judgment || judgeFailed(judgment)) return LABELS.judge_failed;
        return LABELS.live_local;
      }
      case 'MANUAL': return LABELS.manual;
      case 'ESCALATE': return LABELS.escalated;
      case 'HUMAN': return LABELS.teacher;
      case 'GATE': case 'VERIFY': case 'PROPOSE': case 'REJECT': return LABELS.code;
      default: return LABELS.code;
    }
  }

  /** The label for one claim card: how its evidence was produced, then its judge. */
  function forClaim(c) {
    const source = c?.source === 'manual' ? LABELS.manual
      : /LOCAL STUB/.test(c?.extractor || '') ? LABELS.stub
      : /Meta model via API/.test(c?.extractor || '') ? LABELS.live_hosted
      : /Ollama local model/.test(c?.extractor || '') ? LABELS.live_local
      : LABELS.fixture;
    return { source, judge: c?.judgment ? (judgeFailed(c.judgment) ? LABELS.judge_failed : LABELS.live_local) : null };
  }

  /** What produced the session's evidence most recently, or null before anything ran. */
  function forSession(turns) {
    const last = [...(turns || [])].reverse().find((t) => ['EXTRACT', 'RETRY', 'MANUAL'].includes(t.kind));
    return last ? forTurn(last) : null;
  }

  const pill = (label) => `<span class="ens-live ens-live-${label.tone}" title="${label.means.replace(/"/g, '&quot;')}">${label.text}</span>`;

  // API for both views: LABELS (each {text, tone, means}); forTurn(turn);
  // forClaim(claim) -> {source, judge}; forSession(TURNS); judgeFailed(judgment);
  // pill(label) -> HTML. Nothing here can turn LOCAL STUB into LIVE.
  window.ENSLiveness = Object.freeze({ LABELS, forTurn, forClaim, forSession, judgeFailed, pill });
})();
