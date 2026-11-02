// D-025: the Navigation page — the teacher's own next step per signed claim.
//
// This page records a decision; it never makes, suggests or ranks one. No
// model (Ollama, Meta, judge or stub) is called anywhere in this path, and
// the module makes no network requests. The teacher writes the next step by
// hand, and it joins the same session trail as an `ens.navigation.next_step`
// crumb whose context commits to the teacher's own words.
//
// Revision appends: a revised step is a new crumb naming the one it
// supersedes. Both stay in the trail.
//
// Verification freshness (scope §4a, Sol's D-024 finding R1): recording a
// step must not leave an earlier "Verify trail" result presented as covering
// the new trail. staleVerifyNotice() supplies the wording; app.js resets the
// result to unchecked right after the crumb is written.
//
// Exported as a real ES module so the node test suite can import it, and
// self-attached to `window` so the classic app.js script can call it at
// event time (the module is deferred and has loaded by then).

export const NEXT_STEP_ACTION = 'ens.navigation.next_step';
export const NEXT_STEP_AUTHOR = 'teacher';
export const MIN_NEXT_STEP_CHARS = 10;

/** Only a teacher-signed claim can carry a next step. */
export function canRecord(claim) {
  return Boolean(claim) && claim.status === 'signed';
}

/**
 * Check the teacher's text. It is the teacher's own decision, so the only
 * checks are that it is there and substantive; nothing judges its content.
 * @returns {{ ok: true, text: string } | { ok: false, reason: string }}
 */
export function validateNextStep(text) {
  const t = String(text ?? '').trim();
  if (!t) return { ok: false, reason: 'the next step is empty' };
  if (t.length < MIN_NEXT_STEP_CHARS) return { ok: false, reason: `the next step is under ${MIN_NEXT_STEP_CHARS} characters` };
  return { ok: true, text: t };
}

/**
 * Build the crumb context for a next step. The hash is passed in (computed
 * by the caller with the session's sha256) so this stays a pure function.
 * Throws for an unsigned claim: the button never exists there, and this
 * checks again.
 */
export function nextStepContext(claim, text, textHash, priorWarrantId = null) {
  if (!canRecord(claim)) throw new Error('a next step can only follow a teacher-signed claim');
  return {
    claim: claim.id,
    author: NEXT_STEP_AUTHOR,
    model_off: true,
    next_step: text,
    next_step_hash: textHash,
    contested_at_decision: Boolean(claim.contested),
    supersedes: priorWarrantId || null,
  };
}

/** Every next-step crumb recorded for a claim, oldest first. */
export function stepsFor(claimId, crumbs) {
  return (crumbs || []).filter((c) => c.action === NEXT_STEP_ACTION && c.context?.claim === claimId);
}

/** The step that currently stands for a claim: the newest one, or null. */
export function currentStep(claimId, crumbs) {
  const steps = stepsFor(claimId, crumbs);
  return steps.length ? steps[steps.length - 1] : null;
}

/** The result line shown when the trail grew after the last verification. */
export function staleVerifyNotice(checkedCount, nowCount) {
  return `The trail changed after the last check. That check covered ${checkedCount} crumbs; the trail now has ${nowCount}. Verify again.`;
}

// Browser: expose to the classic app.js script. No-op under node (guarded).
if (typeof window !== 'undefined') {
  window.ensNavigation = {
    NEXT_STEP_ACTION,
    NEXT_STEP_AUTHOR,
    MIN_NEXT_STEP_CHARS,
    canRecord,
    validateNextStep,
    nextStepContext,
    stepsFor,
    currentStep,
    staleVerifyNotice,
  };
}
