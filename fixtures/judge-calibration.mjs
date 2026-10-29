// D-016 (Subok): labelled cases for calibrating the DecisionJudge.
//
// Lutang's ground-truth fixtures (fixtures/ground-truth.mjs) label which
// sightings an extraction should find. They don't label support or
// attribution, so they can't calibrate the judge (plan P8 review, O3). These
// cases do. Every learner is a synthetic persona; the quotes come from the
// sample debrief, except one sentence written to put two learners in one line.
//
// Each case gives the state the judge sees and the answer a careful teacher
// would give to each question: true or false. Twelve cases, thirty-six
// judgments: enough to catch a judge that is plainly wrong, not enough to
// certify one. The calibration report says so.

const AMARA = 'Amara (SYNTHETIC)', BEN = 'Ben (SYNTHETIC)', CORA = 'Cora (SYNTHETIC)';
const Q = {
  amara: 'Amara explained to her group why the water cycle diagram needed arrows both ways',
  benFull: 'Ben finished the fraction worksheet quickly but when I asked him to show 3/4 with the paper strips he folded them into eighths instead and looked unsure',
  benQuick: 'Ben finished the fraction worksheet quickly',
  coraAsk: 'Cora asked three times whether her poster was "right" before she would start',
  coraFull: 'Cora asked three times whether her poster was "right" before she would start, then produced the most careful labelled diagram in the class once she began',
  helped: 'Amara helped Ben fold the strips again.',
};
const c = (id, learner, quote, statement, support, attribution, needs_support, note) =>
  ({ id, state: { learner, quote, claim: { statement } }, expected: { support, attribution, needs_support }, note });

export const JUDGE_CALIBRATION_CASES = [
  c('JC-01', AMARA, Q.amara, 'Amara can explain to peers why the water cycle runs both ways.', true, true, false, 'supported strength'),
  c('JC-02', AMARA, Q.amara, 'Amara has mastered all of Grade 4 science.', false, true, false, 'statement goes far beyond the quote'),
  c('JC-03', BEN, Q.benFull, 'Ben is not yet sure how to show 3/4 with paper strips.', true, true, true, 'supported need'),
  c('JC-04', BEN, Q.benFull, 'Ben cannot do fractions at all.', false, true, true, 'overreach: the quote says he finished the worksheet'),
  c('JC-05', BEN, Q.benQuick, 'Ben completes fraction worksheets quickly.', true, true, false, 'supported strength from part of a sentence'),
  c('JC-06', CORA, Q.coraAsk, 'Cora looks for reassurance before she starts a task.', true, true, true, 'supported need'),
  c('JC-07', CORA, Q.coraFull, 'Cora produces careful labelled diagrams.', true, true, false, 'supported strength in a mixed sentence'),
  c('JC-08', CORA, Q.coraAsk, 'Cora cannot read the poster instructions.', false, true, true, 'a need the quote never shows'),
  c('JC-09', BEN, Q.amara, 'Ben can explain the water cycle to his group.', false, false, false, "Amara's sentence credited to Ben"),
  c('JC-10', BEN, Q.helped, 'Ben can fold paper strips into fourths without help.', false, false, false, 'Ben is the one being helped'),
  c('JC-11', AMARA, Q.helped, 'Amara helps classmates with fractions.', true, true, false, 'the helper in a two-learner sentence'),
  c('JC-12', AMARA, Q.benQuick, 'Amara finishes worksheets quickly.', false, false, false, "Ben's sentence credited to Amara; she is not even named"),
];
