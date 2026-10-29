// D-015 / Plan P2-follow: manual (model-off) sighting entry — verification posture.
//
// The manual path uses a *different* verification posture from the automated
// extraction path: a teacher-entered sighting must name a whitelisted learner
// and be substantive, but is NOT required to be verbatim in the debrief (the
// text is the teacher's own words, not a model's quote). The shared
// downstream pipeline (claim propose / sign-off / contest / warrant crumb) is
// asserted separately against the app; here we assert the module's posture in
// isolation, the way D-013 probes a named unit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyManualSighting,
  MANUAL_EXTRACTOR_LABEL,
  MANUAL_MATCH_KIND,
  MIN_OBSERVATION_CHARS,
} from '../public/manual-sighting.mjs';

const LEARNERS = ['Amara (SYNTHETIC)', 'Ben (SYNTHETIC)', 'Cora (SYNTHETIC)'];

test('exported constants carry the distinct manual labels', () => {
  assert.equal(MANUAL_EXTRACTOR_LABEL, 'teacher (manual, model off)');
  assert.equal(MANUAL_MATCH_KIND, 'teacher-entered');
  assert.equal(MIN_OBSERVATION_CHARS, 10);
});

test('a substantive teacher entry for a known learner passes and is shaped for the shared pipeline', () => {
  const { ok, rejected } = verifyManualSighting(
    [{ learner: 'Amara (SYNTHETIC)', observation: 'Amara quietly asked whether her work was right' }],
    LEARNERS,
  );
  assert.equal(rejected.length, 0);
  assert.equal(ok.length, 1);
  const s = ok[0];
  // Same shape the automated path feeds into claimFrom / crumb / CLAIMS:
  assert.equal(s.learner, 'Amara (SYNTHETIC)');
  assert.equal(s.quote, s.observation);
  assert.equal(s.match, MANUAL_MATCH_KIND);
  assert.equal(s.extractor, MANUAL_EXTRACTOR_LABEL);
  assert.equal(s.source, 'manual');
});

test('a teacher entry NOT verbatim in the debrief still passes (the posture difference)', () => {
  // This observation is the teacher's own phrasing; it would FAIL the
  // automated verbatim-in-debrief check, but the manual path does not run it.
  const { ok, rejected } = verifyManualSighting(
    [{ learner: 'Ben (SYNTHETIC)', observation: 'Ben seemed unsure about the fraction strips, his own words' }],
    LEARNERS,
  );
  assert.equal(rejected.length, 0);
  assert.equal(ok.length, 1);
  assert.equal(ok[0].match, MANUAL_MATCH_KIND);
});

test('an unknown learner is rejected even with a fine observation', () => {
  const { ok, rejected } = verifyManualSighting(
    [{ learner: 'Dana (SYNTHETIC)', observation: 'Dana raised a well-formed question about the diagram' }],
    LEARNERS,
  );
  assert.equal(ok.length, 0);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason, 'unknown learner');
});

test('a non-substantive observation is rejected', () => {
  const { ok, rejected } = verifyManualSighting(
    [{ learner: 'Cora (SYNTHETIC)', observation: 'did ok' }], // 6 chars < 10
    LEARNERS,
  );
  assert.equal(ok.length, 0);
  assert.equal(rejected.length, 1);
  assert.match(rejected[0].reason, /observation under 10 characters/);
});

test('the boundary length (exactly MIN_OBSERVATION_CHARS) passes', () => {
  const obs = 'x'.repeat(MIN_OBSERVATION_CHARS); // exactly 10
  const { ok, rejected } = verifyManualSighting([{ learner: 'Cora (SYNTHETIC)', observation: obs }], LEARNERS);
  assert.equal(ok.length, 1);
  assert.equal(rejected.length, 0);
});

test('learner whitelist is honoured when given as a Set', () => {
  const allowed = new Set(LEARNERS);
  const { ok, rejected } = verifyManualSighting(
    [
      { learner: 'Ben (SYNTHETIC)', observation: 'Ben hesitated before he began the task' },
      { learner: 'No One', observation: 'someone else entirely, not a tracked learner' },
    ],
    allowed,
  );
  assert.equal(ok.length, 1);
  assert.equal(ok[0].learner, 'Ben (SYNTHETIC)');
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason, 'unknown learner');
});

test('empty or missing input is safe (no throw, nothing accepted)', () => {
  assert.deepEqual(verifyManualSighting(null, LEARNERS), { ok: [], rejected: [] });
  assert.deepEqual(verifyManualSighting([], LEARNERS), { ok: [], rejected: [] });
  const { rejected } = verifyManualSighting([{ learner: '', observation: '' }], LEARNERS);
  assert.equal(rejected.length, 1);
});
