// D-025: the Navigation page module — the teacher's own next step per signed
// claim. The page wiring (route, crumb, console, verification freshness) is
// asserted in the browser by tools/verify-ui.cjs; here we assert the module's
// rules in isolation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NEXT_STEP_ACTION,
  MIN_NEXT_STEP_CHARS,
  canRecord,
  validateNextStep,
  nextStepContext,
  stepsFor,
  currentStep,
  staleVerifyNotice,
} from '../public/navigation.mjs';

const signed = { id: 'claim_a', status: 'signed', contested: false };
const proposed = { id: 'claim_b', status: 'proposed', contested: false };
const contested = { id: 'claim_c', status: 'signed', contested: true };
const TEXT = 'Tomorrow I will ask her to explain the strips to a partner first.';

test('only a teacher-signed claim can carry a next step', () => {
  assert.equal(canRecord(signed), true);
  assert.equal(canRecord(proposed), false);
  assert.equal(canRecord(null), false);
  assert.throws(() => nextStepContext(proposed, TEXT, 'sha256:x'), /teacher-signed/);
});

test('empty or short text is rejected with a reason; nothing judges its content', () => {
  assert.deepEqual(validateNextStep('   '), { ok: false, reason: 'the next step is empty' });
  assert.deepEqual(validateNextStep('short'), { ok: false, reason: `the next step is under ${MIN_NEXT_STEP_CHARS} characters` });
  assert.deepEqual(validateNextStep(`  ${TEXT}  `), { ok: true, text: TEXT });
});

test('the context carries the claim, the teacher as author, model off, and the hash of the text', () => {
  const ctx = nextStepContext(signed, TEXT, 'sha256:abc');
  assert.deepEqual(ctx, {
    claim: 'claim_a',
    author: 'teacher',
    model_off: true,
    next_step: TEXT,
    next_step_hash: 'sha256:abc',
    contested_at_decision: false,
    supersedes: null,
  });
});

test('a contested claim may get a next step, and the context records the contest', () => {
  assert.equal(canRecord(contested), true);
  assert.equal(nextStepContext(contested, TEXT, 'sha256:abc').contested_at_decision, true);
});

test('a revision names the step it supersedes, and the first step stays', () => {
  const first = { warrant_id: 'w_1', action: NEXT_STEP_ACTION, context: nextStepContext(signed, TEXT, 'sha256:1') };
  const revised = { warrant_id: 'w_2', action: NEXT_STEP_ACTION, context: nextStepContext(signed, TEXT + ' Then check.', 'sha256:2', 'w_1') };
  const other = { warrant_id: 'w_3', action: 'ens.claim.signoff', context: { claim: 'claim_a' } };
  const crumbs = [first, other, revised];
  assert.equal(revised.context.supersedes, 'w_1');
  assert.deepEqual(stepsFor('claim_a', crumbs).map((c) => c.warrant_id), ['w_1', 'w_2']);
  assert.equal(currentStep('claim_a', crumbs).warrant_id, 'w_2');
  assert.equal(currentStep('claim_b', crumbs), null);
});

test('the stale-verification notice names both counts', () => {
  assert.equal(staleVerifyNotice(7, 8),
    'The trail changed after the last check. That check covered 7 crumbs; the trail now has 8. Verify again.');
});
