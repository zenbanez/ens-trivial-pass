// Ground-truth expected sightings and deterministic coverage scorer.
// Part of D-009 / Plan P2.
//
// CONSTITUTIONAL & ARCHITECTURAL BOUNDS:
// 1. Synthetic data only. No real educational data.
// 2. This module and its fixtures are held STRICTLY OUTSIDE the extractor's
//    prompt, model context, and input path. The extractor never sees this.
// 3. Verbatim-quote strictness is never relaxed to raise coverage: the scorer
//    only evaluates sightings that have already passed deterministic code verification.
// 4. Threshold is displayed as a visible, inspectable constant.

export const COVERAGE_THRESHOLD = 0.67; // 2 out of 3 expected sightings (67%) minimum for pass

export const GROUND_TRUTH_FIXTURES = {
  'sample-post-class-debrief': [
    {
      id: 'GT-AMARA-01',
      learner: 'Amara (SYNTHETIC)',
      aspect: 'Water cycle diagram reasoning & peer uptake',
      expectedAnchors: ['arrows both ways', 'water cycle diagram', 'copied her reasoning'],
    },
    {
      id: 'GT-BEN-01',
      learner: 'Ben (SYNTHETIC)',
      aspect: 'Fraction worksheet representation (3/4 folded into eighths) & uncertainty',
      expectedAnchors: ['fraction worksheet', '3/4', 'folded them into eighths', 'looked unsure'],
    },
    {
      id: 'GT-CORA-01',
      learner: 'Cora (SYNTHETIC)',
      aspect: 'Validation seeking prior to task & careful diagram production',
      expectedAnchors: ['asked three times', 'whether her poster was "right"', 'careful labelled diagram'],
    },
  ],
};

/**
 * Score coverage of verified sightings against ground-truth fixtures.
 * Deterministic code only — no model calls or heuristic softening.
 *
 * @param {Array<object>} verifiedSightings Sightings that passed deterministic quote verification
 * @param {string|Array<object>} fixtureKeyOrList Fixture ID or custom expected-sightings list
 * @returns {object} Coverage report with counts, ratio, pass/fail status, and per-item matches
 */
export function scoreCoverage(verifiedSightings = [], fixtureKeyOrList = 'sample-post-class-debrief') {
  const expectedList = Array.isArray(fixtureKeyOrList)
    ? fixtureKeyOrList
    : (GROUND_TRUTH_FIXTURES[fixtureKeyOrList] || GROUND_TRUTH_FIXTURES['sample-post-class-debrief']);

  if (!expectedList || expectedList.length === 0) {
    return {
      covered: 0,
      total: 0,
      ratio: 0,
      passed: false,
      threshold: COVERAGE_THRESHOLD,
      details: [],
    };
  }

  const details = expectedList.map((expected) => {
    // Find matching sighting: must match learner exactly and contain an anchor from the debrief
    const matchedSighting = verifiedSightings.find((s) => {
      if (!s || s.learner !== expected.learner) return false;
      const quoteText = String(s.quote || '').toLowerCase();
      const obsText = String(s.observation || '').toLowerCase();
      return expected.expectedAnchors.some((anchor) =>
        quoteText.includes(anchor.toLowerCase()) || obsText.includes(anchor.toLowerCase())
      );
    });

    return {
      id: expected.id,
      learner: expected.learner,
      aspect: expected.aspect,
      covered: Boolean(matchedSighting),
      matchedQuote: matchedSighting?.quote || null,
    };
  });

  const covered = details.filter((d) => d.covered).length;
  const total = expectedList.length;
  const ratio = total > 0 ? covered / total : 0;
  const passed = ratio >= COVERAGE_THRESHOLD;

  return {
    covered,
    total,
    ratio,
    percentage: Math.round(ratio * 100),
    passed,
    threshold: COVERAGE_THRESHOLD,
    thresholdPercentage: Math.round(COVERAGE_THRESHOLD * 100),
    details,
  };
}
