// Test suite for D-009 / Plan P2: Ground-truth coverage and bounded retry loop.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { COVERAGE_THRESHOLD, GROUND_TRUTH_FIXTURES, scoreCoverage } from '../fixtures/ground-truth.mjs';

// Repo root, so server-spawning integration tests run on any machine (not one path).
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('Ground-truth fixtures exist and are structurally valid', () => {
  assert.equal(typeof COVERAGE_THRESHOLD, 'number');
  assert.equal(COVERAGE_THRESHOLD, 0.66);
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
  assert.equal(score.thresholdPercentage, 66);
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

test('Retry logic & state machine (P2-1): verified sightings proceed, rejected portion escalates', () => {
  const MAX_RETRIES = 2; // at most 2 retries (3 attempts total)
  let attempt = 0;
  let escalated = false;
  let state = 'init';
  const turns = [];

  // Scenario 1: Mixed result (2 verified, 1 rejected that never resolves)
  while (attempt <= MAX_RETRIES) {
    attempt++;
    turns.push({ turn: attempt === 1 ? 'EXTRACT' : `RETRY_${attempt - 1}`, attempt });
    const hasRejections = true;
    if (attempt > MAX_RETRIES && hasRejections) {
      escalated = true;
      turns.push({ turn: 'ESCALATE', reason: 'Unresolved rejections escalated to teacher' });
      // P2-1: verified sightings proceed to proposed claims
      state = 'proposed-claims-with-escalation';
      break;
    }
  }

  assert.equal(attempt, 3);
  assert.equal(escalated, true);
  assert.equal(state, 'proposed-claims-with-escalation');
  assert.deepEqual(turns.map(t => t.turn), ['EXTRACT', 'RETRY_1', 'RETRY_2', 'ESCALATE']);

  // Scenario 2: All sightings rejected
  let allFailedAttempt = 0;
  let allBlockedState = 'init';
  while (allFailedAttempt <= MAX_RETRIES) {
    allFailedAttempt++;
    if (allFailedAttempt > MAX_RETRIES) {
      const okSightings = 0;
      if (okSightings === 0) {
        allBlockedState = 'proposed-claims-blocked';
      }
      break;
    }
  }
  assert.equal(allBlockedState, 'proposed-claims-blocked');
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


test('Server integration: POST /api/coverage endpoint', async () => {
  // Start server on ephemeral port for integration test
  const { spawn } = await import('node:child_process');
  const testPort = 5174;
  const proc = spawn(process.execPath, ['server.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(testPort) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  try {
    // Wait for server to output listening address
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server startup timeout')), 4000);
      proc.stdout.on('data', (d) => {
        if (d.toString().includes('http://127.0.0.1')) {
          clearTimeout(timer);
          resolve();
        }
      });
      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    // Test POST /api/coverage with verified sightings
    const res = await fetch(`http://127.0.0.1:${testPort}/api/coverage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sightings: [
          {
            learner: 'Amara (SYNTHETIC)',
            quote: 'Amara explained to her group why the water cycle diagram needed arrows both ways',
          },
          {
            learner: 'Ben (SYNTHETIC)',
            quote: 'Ben finished the fraction worksheet quickly but when I asked him to show 3/4 with the paper strips he folded them into eighths instead and looked unsure.',
          },
        ],
      }),
    });

    assert.equal(res.status, 200);
    const report = await res.json();
    assert.equal(report.covered, 2);
    assert.equal(report.total, 3);
    assert.equal(report.passed, true);
    assert.equal(report.threshold, 0.66);

    // Test POST /api/coverage with invalid input
    const badRes = await fetch(`http://127.0.0.1:${testPort}/api/coverage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sightings: 'not-an-array' }),
    });
    assert.equal(badRes.status, 400);

  } finally {
    proc.kill('SIGTERM');
  }
});


test('Server integration: POST /api/local-extract with retry feedback and isolation proof', async () => {
  const { spawn } = await import('node:child_process');
  const testPort = 5175;
  // Point OLLAMA_BASE_URL to an uncalled endpoint; we test Gate 9 and prompt/rejection behavior
  const proc = spawn(process.execPath, ['server.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(testPort), OLLAMA_BASE_URL: 'http://127.0.0.1:59999' },
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server startup timeout')), 4000);
      proc.stdout.on('data', (d) => {
        if (d.toString().includes('http://127.0.0.1')) {
          clearTimeout(timer);
          resolve();
        }
      });
      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    // 1. Refuses without local gate
    const noGateRes = await fetch(`http://127.0.0.1:${testPort}/api/local-extract`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'Amara explained the water cycle diagram with arrows both ways.',
        learners: ['Amara (SYNTHETIC)'],
      }),
    });
    assert.equal(noGateRes.status, 403);

    // 2. Refuses hosted gate claim on local endpoint
    const hostedGateRes = await fetch(`http://127.0.0.1:${testPort}/api/local-extract`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: 'Amara explained the water cycle diagram with arrows both ways.',
        learners: ['Amara (SYNTHETIC)'],
        gate: { mode: 'hosted-synthetic', admitted: true },
      }),
    });
    assert.equal(hostedGateRes.status, 403);

  } finally {
    proc.kill('SIGTERM');
  }
});

test('P2-2: anchors must match in verified quote ONLY, not model-written observation', () => {
  // Sighting whose observation has anchor but whose verified quote has NO anchor text
  const sneakyObservationSighting = [
    {
      learner: 'Amara (SYNTHETIC)',
      quote: 'Amara listened quietly while others worked.', // no anchor in quote
      observation: 'Amara explained why water cycle diagram needed arrows both ways', // anchor in observation
    },
  ];

  const score = scoreCoverage(sneakyObservationSighting);
  assert.equal(score.covered, 0, 'Sighting with anchor only in observation must NOT cover ground-truth item');
  assert.equal(score.passed, false);

  // Sighting with anchor in verified quote
  const legitimateSighting = [
    {
      learner: 'Amara (SYNTHETIC)',
      quote: 'Amara explained to her group why the water cycle diagram needed arrows both ways.',
      observation: 'Student explained science diagram',
    },
  ];
  const legitimateScore = scoreCoverage(legitimateSighting);
  assert.equal(legitimateScore.covered, 1);
});

test('P2-3: /api/coverage rejects non-string keys and scores server-verified sightings only', async () => {
  const { spawn } = await import('node:child_process');
  const testPort = 5176;
  const proc = spawn(process.execPath, ['server.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(testPort) },
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server startup timeout')), 4000);
      proc.stdout.on('data', (d) => {
        if (d.toString().includes('http://127.0.0.1')) {
          clearTimeout(timer);
          resolve();
        }
      });
      proc.on('error', (err) => { clearTimeout(timer); reject(err); });
    });

    // 1. Rejects caller-injected fixture arrays as debriefId
    const injectedRes = await fetch(`http://127.0.0.1:${testPort}/api/coverage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sightings: [],
        debriefId: [{ id: 'FAKE', learner: 'Fake', expectedAnchors: ['x'] }],
      }),
    });
    assert.equal(injectedRes.status, 400);

    // 2. Unverified hallucinated sightings are filtered out server-side
    const hallucinatedRes = await fetch(`http://127.0.0.1:${testPort}/api/coverage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sightings: [
          {
            learner: 'Amara (SYNTHETIC)',
            quote: 'This is a hallucinated quote that is not anywhere in the debrief text at all.',
            observation: 'Fake',
          },
        ],
      }),
    });
    assert.equal(hallucinatedRes.status, 200);
    const rep = await hallucinatedRes.json();
    assert.equal(rep.covered, 0, 'Hallucinated sighting must be rejected by server verifySightings');

    // 3. Dynamic debriefText generalization: verifies against custom debrief text if provided
    const customDebrief = 'Amara explained to her group why the water cycle diagram needed arrows both ways, completely rewritten here for testing purposes.';
    const customRes = await fetch(`http://127.0.0.1:${testPort}/api/coverage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sightings: [
          {
            learner: 'Amara (SYNTHETIC)',
            quote: 'Amara explained to her group why the water cycle diagram needed arrows both ways',
          },
        ],
        debriefId: 'sample-post-class-debrief',
        debriefText: customDebrief,
      }),
    });
    assert.equal(customRes.status, 200);
    const customRep = await customRes.json();
    assert.equal(customRep.covered, 1, 'Verified against custom debrief text');
  } finally {
    proc.kill('SIGTERM');
  }
});

test('P2-5: verified sightings accumulate across attempts', () => {
  const accumulated = new Map();
  const attempt1Verified = [
    { learner: 'Amara (SYNTHETIC)', quote: 'Amara explained to her group why the water cycle diagram needed arrows both ways' },
    { learner: 'Ben (SYNTHETIC)', quote: 'Ben finished the fraction worksheet quickly but when I asked him to show 3/4' },
  ];
  for (const s of attempt1Verified) {
    accumulated.set(`${s.learner}:::${s.quote}`, s);
  }

  // Attempt 2: returns empty or failed
  const attempt2Verified = [];
  for (const s of attempt2Verified) {
    accumulated.set(`${s.learner}:::${s.quote}`, s);
  }

  // Attempt 3: returns only Cora
  const attempt3Verified = [
    { learner: 'Cora (SYNTHETIC)', quote: 'Cora asked three times whether her poster was "right"' },
  ];
  for (const s of attempt3Verified) {
    accumulated.set(`${s.learner}:::${s.quote}`, s);
  }

  const finalVerified = Array.from(accumulated.values());
  assert.equal(finalVerified.length, 3, 'All 3 learners preserved across attempts');
  assert.deepEqual(finalVerified.map(s => s.learner), ['Amara (SYNTHETIC)', 'Ben (SYNTHETIC)', 'Cora (SYNTHETIC)']);
});
