// D-016 (Subok): the calibration runner (plan P8 rule 4).
//
// Runs a DecisionJudge over labelled cases and reports, per question:
// - agreement: of the answers that were settled (yes or no), how many match
//   the label; unsettled and failed answers are counted, not hidden;
// - honesty: whether answers stated with high probability are right at about
//   that rate, in three bands of stated probability;
// - the Brier score of the stated probability against the label.
// The report says how many judgments it rests on. It measures; it does not
// certify, and it never retunes anything.
//
//   node judge/calibrate.mjs [together|separate]
// runs the glimmer-wrapper on this machine (OLLAMA_BASE_URL, OLLAMA_JUDGE_MODEL)
// against fixtures/judge-calibration.mjs and prints the report as JSON.
import { pathToFileURL } from 'node:url';
import { band, QUESTIONS } from './questions.mjs';
import { createJudge } from './decision-judge.mjs';

export const HONESTY_BANDS = [[0.5, 0.7], [0.7, 0.9], [0.9, 1.0000001]];

export async function calibrate(judge, cases, questions = QUESTIONS) {
  const per = Object.fromEntries(Object.keys(questions).map((id) => [id, { n: 0, settled: 0, agree: 0, unsettled: 0, failed: 0, brier: 0, scored: 0, honesty: HONESTY_BANDS.map(([lo, hi]) => ({ from: lo, to: Math.min(hi, 1), n: 0, right: 0, stated: 0 })) }]));
  const rows = [];
  for (const kase of cases) {
    const { answers, attempts } = await judge.decide(kase.state, questions);
    const row = { id: kase.id, note: kase.note, attempts: attempts.length, answers: {} };
    for (const [id, expected] of Object.entries(kase.expected)) {
      if (!(id in per)) continue;
      const s = per[id], a = answers[id];
      s.n++;
      if (!a || a.failed) { s.failed++; row.answers[id] = { expected, got: 'failed' }; continue; }
      const p = a.probabilities.true, b = band(p);
      s.brier += (p - (expected ? 1 : 0)) ** 2; s.scored++;
      const chosenTrue = p >= 0.5, stated = chosenTrue ? p : 1 - p, right = chosenTrue === expected;
      const h = s.honesty.find((x) => stated >= x.from && stated < (x.to === 1 ? 1.0000001 : x.to));
      if (h) { h.n++; h.stated += stated; if (right) h.right++; }
      if (b === 'unsettled') s.unsettled++;
      else { s.settled++; if ((b === 'yes') === expected) s.agree++; }
      row.answers[id] = { expected, p, answer: a.answer, normalized: a.normalized };
    }
    rows.push(row);
  }
  const summary = Object.fromEntries(Object.entries(per).map(([id, s]) => [id, {
    judgments: s.n, settled: s.settled, agreed: s.agree,
    agreement: s.settled ? s.agree / s.settled : null,
    unsettled: s.unsettled, failed: s.failed,
    brier: s.scored ? s.brier / s.scored : null,
    honesty: s.honesty.filter((h) => h.n).map((h) => ({ stated_from: h.from, stated_to: h.to, n: h.n, mean_stated: h.stated / h.n, right_rate: h.right / h.n })),
  }]));
  const total = Object.values(per).reduce((t, s) => t + s.n, 0);
  return {
    judge: judge.judge,
    cases: cases.length, judgments: total,
    caveat: `${total} judgments from ${cases.length} synthetic cases: enough to catch a judge that is plainly wrong, not enough to certify one.`,
    summary, rows,
  };
}

/** One plain sentence per question, for people. */
export function describe(report) {
  return Object.entries(report.summary).map(([id, s]) => {
    const agree = s.agreement === null ? 'no settled answers' : `${s.agreed} of ${s.settled} settled answers agreed with the labels`;
    const honest = s.honesty.map((h) => `stated ${h.stated_from}–${Math.min(h.stated_to, 1)}: right ${h.right_rate.toFixed(2)} of ${h.n} (mean stated ${h.mean_stated.toFixed(2)})`).join('; ');
    return `${id}: ${agree}; ${s.unsettled} unsettled, ${s.failed} failed${s.brier === null ? '' : `; Brier ${s.brier.toFixed(3)}`}${honest ? `. ${honest}` : ''}.`;
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { createGlimmerAdapter } = await import('./adapters/glimmer.mjs');
  const { JUDGE_CALIBRATION_CASES } = await import('../fixtures/judge-calibration.mjs');
  const judge = createJudge(createGlimmerAdapter(), { mode: process.argv[2] || 'together' });
  const report = await calibrate(judge, JUDGE_CALIBRATION_CASES);
  console.log(JSON.stringify({ ...report, plain: describe(report) }, null, 2));
}
