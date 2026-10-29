// D-016 (Subok): the judge's questions, thresholds and routing, in one place.
//
// The DecisionJudge is a System-One-style decision harness: a pseudo-System-
// One in Jev's interface shape, never "a System One model". It makes
// judgments; this module's code makes the decisions (plan P8, review O1, O2,
// O6). Every question is a Noul: the probability that one statement is true.
// Doubt lives in that probability, which code reads in bands; the model is
// never asked to pick "uncertain".
//
// The judge is advisory. route() returns flags for a teacher's attention.
// Nothing here admits, rejects, signs or blocks a claim.

export const NOUL_YES = 0.7;   // at or above: yes
export const NOUL_NO = 0.3;    // at or below: no; between the two: unsettled

// State the judge sees, assembled in code from a verified sighting and its
// proposed claim. Named fields only; nothing the questions don't need.
export function judgeState({ learner, quote, statement }) {
  return { learner, quote, claim: { statement } };
}

export const QUESTIONS = {
  support: {
    type: 'noul',
    text: 'Does `quote` show what `claim.statement` says about `learner`?',
    true: 'The quote describes the learner doing or showing what the statement says.',
    false: 'The statement says more than, or something different from, what the quote describes; for example, it names a skill the quote never shows.',
    bands: { yes: 'supported', no: 'unsupported', unsettled: 'uncertain' },
  },
  attribution: {
    type: 'noul',
    text: 'Is `quote` about `learner`, and not about another learner it mentions?',
    true: 'The sentence describes something this learner did, said or showed.',
    false: 'The sentence describes what another learner did; this learner is only mentioned, for example as the one being helped.',
    bands: { yes: 'certain', no: 'other-learner', unsettled: 'ambiguous' },
  },
  needs_support: {
    type: 'noul',
    text: 'Does `claim.statement` say that `learner` needs help or a different route?',
    true: 'The statement describes a difficulty, a hesitation or a need for support.',
    false: 'The statement describes something the learner did well or showed they can do.',
    bands: { yes: 'needs-support', no: 'strength', unsettled: 'unclear' },
  },
};

/** The band a probability falls in: 'yes', 'no' or 'unsettled'. */
export function band(p) {
  if (typeof p !== 'number' || Number.isNaN(p)) return 'unsettled';
  if (p >= NOUL_YES) return 'yes';
  if (p <= NOUL_NO) return 'no';
  return 'unsettled';
}

/**
 * The decision layer: every combination of answers maps to advisory flags.
 * A failed question (no probability after retries) reads as unsettled.
 * Returns { flags: string[], attention: 'none' | 'look' | 'look-first' }.
 */
export function route(answers) {
  const b = (q) => band(answers?.[q]?.probabilities?.true);
  const support = b('support'), attribution = b('attribution'), need = b('needs_support');
  const flags = [];
  if (attribution === 'no') flags.push('the sentence may be about another learner');
  if (support === 'no') flags.push('the quote may not show what the claim says');
  if (support === 'unsettled' || attribution === 'unsettled') flags.push('the judge is unsure');
  const thin = support !== 'yes' || attribution !== 'yes';
  if (need === 'yes' && thin) flags.push('a claim about a learner\'s needs rests on evidence the judge did not find clear');
  // Look first: anything that could put a claim on the wrong child or a need
  // on thin evidence. Look: the judge is unsure. Otherwise nothing to add.
  const attention = (attribution === 'no' || support === 'no' || (need === 'yes' && thin)) ? 'look-first'
    : flags.length ? 'look' : 'none';
  return { flags, attention };
}
