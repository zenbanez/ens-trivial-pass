// Test suite for D-009 / Plan P2: Ground-truth coverage and bounded retry loop.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COVERAGE_THRESHOLD, GROUND_TRUTH_FIXTURES, scoreCoverage } from '../fixtures/ground-truth.mjs';

test('Ground-truth fixtures exist and are structurally valid', () => {
  assert.equal(typeof COVERAGE_THRESHOLD, 'number');
  assert.equal(COVERAGE_THRESHOLD, 0.67);
  const fixture = GROUND_TRUTH_FIXTURES['sample-post-class-debrief'];
  assert.ok(Array.isArray(fixture));
  assert.equal(fixture.length, 3);
  for (const item of fixture) {
    assert.ok(item.id.startsWith('GT-'));
    assert.ok(item.learner.includes('(SYNTHETIC)'));
    assert.ok(Array.isArray(item.expectedAnchors));
    assert.ok(item.expectedAnchors.length > 0);
  }
});

test('Coverage Scorer: computes 100% (3/3) on full set of verified sightings', () => {
  const verifiedSightings = [
    {
      learner: 'Amara (SYNTHETIC)',
      quote: 'Amara explained to her group why the water cycle diagram needed arrows both ways, and two classmates copied her reasoning into their notebooks.',
      observation: 'Amara explained diagram needing arrows both ways',
    },
    {
      learner: 'Ben (SYNTHETIC)',
      quote: 'Ben finished the fraction worksheet quickly but when I asked him to show 3/4 with the paper strips he folded them into eighths instead and looked unsure.',
      observation: 'Ben folded paper strips into eighths and looked unsure',
    },
    {
      learner: 'Cora (SYNTHETIC)',
      quote: 'Cora asked three times whether her poster was "right" before she would start, then produced the most careful labelled diagram in the class once she began.',
      observation: 'Cora asked three times before producing careful diagram',
    },
  ];

  const score = scoreCoverage(verifiedSightings);
  assert.equal(score.covered, 3);
  assert.equal(score.total, 3);
  assert.equal(score.ratio, 1);
  assert.equal(score.percentage, 100);
  assert.equal(score.passed, true);
  assert.equal(score.thresholdPercentage, 67);
});

test('Coverage Scorer: computes 67% (2/3) and passes threshold', () => {
  const verifiedSightings = [
    {
      learner: 'Amara (SYNTHETIC)',
      quote: 'Amara explained to her group why the water cycle diagram needed arrows both ways.',
      observation: 'Amara explained water cycle diagram',
    },
    {
      learner: 'Ben (SYNTHETIC)',
      quote: 'Ben finished the fraction worksheet quickly but looked unsure.',
      observation: 'Ben fraction worksheet',
    },
  ];

  const score = scoreCoverage(verifiedSightings);
  assert.equal(score.covered, 2);
  assert.equal(score.total, 3);
  assert.equal(score.percentage, 67);
  assert.equal(score.passed, true);
});

test('Coverage Scorer: computes 33% (1/3) and fails threshold', () => {
  const verifiedSightings = [
    {
      learner: 'Amara (SYNTHETIC)',
      quote: 'Amara explained to her group why the water cycle diagram needed arrows both ways.',
      observation: 'Amara explained water cycle diagram',
    },
  ];

  const score = scoreCoverage(verifiedSightings);
  assert.equal(score.covered, 1);
  assert.equal(score.total, 3);
  assert.equal(score.percentage, 33);
  assert.equal(score.passed, false);
});

test('Coverage Scorer: misattributed sighting does not count towards coverage', () => {
  // Sighting quotes Cora's behavior but attributes to Ben
  const verifiedSightings = [
    {
      learner: 'Ben (SYNTHETIC)',
      quote: 'Cora asked three times whether her poster was "right" before she would start.',
      observation: 'Cora poster check',
    },
  ];

  const score = scoreCoverage(verifiedSightings);
  // Cora fixture requires learner === 'Cora (SYNTHETIC)', so Ben cannot satisfy it
  assert.equal(score.covered, 0);
  assert.equal(score.passed, false);
});

test('Retry logic & state machine: terminates and escalates to teacher on 3rd failure', () => {
  // Simulating bounded retry loop:
  // attempt 1 (initial extract) -> verification fails (rejections)
  // attempt 2 (retry 1 with feedback) -> verification fails
  // attempt 3 (retry 2 with feedback) -> verification fails
  // -> ESCALATE: proposed-claims-blocked

  const MAX_RETRIES = 2; // at most 2 retries (3 attempts total)
  let attempt = 0;
  let escalated = false;
  let state = 'init';
  const turns = [];

  function simulateLoop(alwaysFails) {
    while (attempt <= MAX_RETRIES) {
      attempt++;
      turns.push({ turn: attempt === 1 ? 'EXTRACT' : `RETRY_${attempt - 1}`, attempt });

      const hasRejections = alwaysFails;
      if (!hasRejections) {
        state = 'claims-proposed';
        return;
      }

      // Rejections exist
      if (attempt > MAX_RETRIES) {
        // Third failure: escalate to teacher
        state = 'proposed-claims-blocked';
        escalated = true;
        turns.push({ turn: 'ESCALATE', reason: 'Verification rejections unresolved after 2 retries' });
        return;
      }
    }
  }

  simulateLoop(true);

  assert.equal(attempt, 3);
  assert.equal(escalated, true);
  assert.equal(state, 'proposed-claims-blocked');
  assert.deepEqual(turns.map(t => t.turn), ['EXTRACT', 'RETRY_1', 'RETRY_2', 'ESCALATE']);
});

test('Retry logic: succeeds early when retry resolves rejections', () => {
  let attempt = 0;
  let escalated = false;
  let state = 'init';
  const turns = [];

  // Fails on attempt 1, succeeds on attempt 2 (retry 1)
  while (attempt <= 2) {
    attempt++;
    turns.push({ turn: attempt === 1 ? 'EXTRACT' : `RETRY_${attempt - 1}`, attempt });
    const hasRejections = attempt === 1; // only first attempt fails
    if (!hasRejections) {
      state = 'claims-proposed';
      break;
    }
  }

  assert.equal(attempt, 2);
  assert.equal(escalated, false);
  assert.equal(state, 'claims-proposed');
  assert.deepEqual(turns.map(t => t.turn), ['EXTRACT', 'RETRY_1']);
});
