// D-016 (Subok): tests for the DecisionJudge framework, against a stand-in for
// Ollama that records each request and answers from a queue. No model runs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { QUESTIONS, NOUL_YES, NOUL_NO, band, route, judgeState } from '../judge/questions.mjs';
import { createJudge, validate, normalize, MAX_CORRECTIVE_RETRIES, UNCALIBRATED } from '../judge/decision-judge.mjs';
import { createGlimmerAdapter, createJevAdapter, replySchema, judgePrompt } from '../judge/adapters/glimmer.mjs';
import { calibrate, describe } from '../judge/calibrate.mjs';
import { JUDGE_CALIBRATION_CASES } from '../fixtures/judge-calibration.mjs';

let requests = [], queue = [], status = 200;
const ollama = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => { body += c; });
  req.on('end', () => {
    requests.push(JSON.parse(body || '{}'));
    if (status !== 200) { res.writeHead(status); res.end('down'); return; }
    const answer = queue.length > 1 ? queue.shift() : queue[0];
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ response: typeof answer === 'string' ? answer : JSON.stringify(answer) }));
  });
});
let base;
before(async () => { await new Promise((r) => ollama.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${ollama.address().port}`; });
after(() => ollama.close());
const reset = () => { requests = []; queue = []; status = 200; };
const glimmer = (mode) => createJudge(createGlimmerAdapter({ baseUrl: base, model: 'stand-in-model' }), mode ? { mode } : undefined);
const STATE = judgeState({ learner: 'Ben (SYNTHETIC)', quote: 'Ben finished the fraction worksheet quickly', statement: 'Ben completes fraction worksheets quickly.' });
const all = (t, a, n) => ({ support: t, attribution: a, needs_support: n });
const noul = (p) => ({ true: p, false: 1 - p });

// The questions and the decision layer
test('bands: yes at or above 0.7, no at or below 0.3, unsettled between, and anything not a number', () => {
  assert.deepEqual([NOUL_YES, NOUL_NO], [0.7, 0.3]);
  assert.deepEqual([0.7, 0.95, 0.3, 0.05, 0.5, 0.31, 0.69, undefined, NaN].map(band), ['yes', 'yes', 'no', 'no', 'unsettled', 'unsettled', 'unsettled', 'unsettled', 'unsettled']);
});
test('every question is a Noul with a concrete true and false, and asks for a judgment, not a decision', () => {
  for (const [id, q] of Object.entries(QUESTIONS)) {
    assert.equal(q.type, 'noul', id);
    assert.ok(q.text.endsWith('?') && q.true && q.false, id);
    assert.deepEqual(Object.keys(q.bands).sort(), ['no', 'unsettled', 'yes'], id);
    assert.doesNotMatch(q.text, /\bshould\b|\bescalate\b|\bdecide\b/i, id);
  }
});
test('route: all 64 combinations of yes/no/unsettled/failed give an outcome, and only advisory ones', () => {
  const p = { yes: 0.9, no: 0.1, unsettled: 0.5, failed: undefined };
  const seen = new Set();
  for (const s of Object.keys(p)) for (const a of Object.keys(p)) for (const n of Object.keys(p)) {
    const ans = (x) => (p[x] === undefined ? { failed: true, probabilities: null } : { probabilities: noul(p[x]) });
    const out = route({ support: ans(s), attribution: ans(a), needs_support: ans(n) });
    assert.ok(['none', 'look', 'look-first'].includes(out.attention), `${s}/${a}/${n}`);
    assert.ok(Array.isArray(out.flags));
    assert.deepEqual(Object.keys(out).sort(), ['attention', 'flags'], 'flags and attention only: nothing admits, rejects or signs');
    seen.add(out.attention);
  }
  assert.deepEqual([...seen].sort(), ['look', 'look-first', 'none']);
});
test('route: the rows that matter', () => {
  const r = (s, a, n) => route({ support: { probabilities: noul(s) }, attribution: { probabilities: noul(a) }, needs_support: { probabilities: noul(n) } });
  assert.deepEqual(r(0.9, 0.9, 0.1), { flags: [], attention: 'none' }, 'clear strength');
  assert.deepEqual(r(0.9, 0.9, 0.9), { flags: [], attention: 'none' }, 'clear need, well supported');
  assert.equal(r(0.9, 0.1, 0.1).attention, 'look-first', 'another learner\'s sentence');
  assert.equal(r(0.1, 0.9, 0.1).attention, 'look-first', 'quote does not show the claim');
  assert.equal(r(0.5, 0.9, 0.1).attention, 'look', 'judge unsure about a strength');
  assert.equal(r(0.5, 0.9, 0.9).attention, 'look-first', 'a need on unclear evidence');
  assert.ok(r(0.5, 0.9, 0.9).flags.includes("a claim about a learner's needs rests on evidence the judge did not find clear"));
});
test('judgeState carries only what the questions need', () => {
  assert.deepEqual(Object.keys(STATE).sort(), ['claim', 'learner', 'quote']);
  assert.deepEqual(Object.keys(STATE.claim), ['statement']);
});

// The glimmer-wrapper adapter
test('the adapter asks Ollama with think:false, temperature 0, a strict schema and a capped output, in one call', async () => {
  reset(); queue = [all(noul(0.9), noul(0.9), noul(0.1))];
  await glimmer().decide(STATE, QUESTIONS);
  assert.equal(requests.length, 1);
  const r = requests[0];
  assert.equal(r.model, 'stand-in-model'); assert.equal(r.think, false); assert.equal(r.stream, false);
  assert.equal(r.options.temperature, 0);
  assert.ok(r.options.num_predict > 0 && r.options.num_predict <= 256);
  assert.deepEqual(r.format, replySchema(Object.keys(QUESTIONS)));
  assert.equal(r.format.additionalProperties, false);
  assert.deepEqual(r.format.required, ['support', 'attribution', 'needs_support']);
  for (const q of Object.values(QUESTIONS)) { assert.ok(r.prompt.includes(q.text)); assert.ok(r.prompt.includes(q.false)); }
  assert.ok(r.prompt.includes(JSON.stringify(STATE, null, 2)));
});
test('nothing the judge says or records calls it a System One model', async () => {
  reset(); queue = [all(noul(0.9), noul(0.9), noul(0.1))];
  const out = await glimmer().decide(STATE, QUESTIONS);
  const said = JSON.stringify(out) + judgePrompt(STATE, QUESTIONS, 'x');
  assert.doesNotMatch(said, /System One/i);
  assert.equal(out.judge.signal, UNCALIBRATED);
  assert.deepEqual(out.judge, { adapter: 'glimmer-wrapper', model: 'stand-in-model', locus: { mode: 'local', endpoint: base }, mode: 'together', signal: 'self-reported, uncalibrated model signal' });
});

// The judge: answers, normalization, retries, failures
test('a clean reply: banded labels, probabilities and raw probabilities kept, nothing normalized', async () => {
  reset(); queue = [all({ true: 0.92, false: 0.08 }, { true: 0.5, false: 0.5 }, { true: 0.1, false: 0.9 })];
  const { answers, attempts } = await glimmer().decide(STATE, QUESTIONS);
  assert.deepEqual(answers.support, { answer: 'supported', probabilities: { true: 0.92, false: 0.08 }, normalized: false, raw_probabilities: { true: 0.92, false: 0.08 }, failed: false });
  assert.equal(answers.attribution.answer, 'ambiguous');
  assert.equal(answers.needs_support.answer, 'strength');
  assert.equal(attempts.length, 1); assert.equal(attempts[0].retry_reason, null);
  assert.equal(attempts[0].raw_output, JSON.stringify(queue[0]));
});
test('sides that do not sum to 1 are normalized, and the record says so and keeps the raw pair', async () => {
  reset(); queue = [all({ true: 0.6, false: 0.6 }, noul(0.9), noul(0.1))];
  const { answers } = await glimmer().decide(STATE, QUESTIONS);
  assert.deepEqual(answers.support.probabilities, { true: 0.5, false: 0.5 });
  assert.equal(answers.support.normalized, true);
  assert.deepEqual(answers.support.raw_probabilities, { true: 0.6, false: 0.6 });
  assert.equal(answers.attribution.normalized, false);
  assert.deepEqual(normalize({ true: 0, false: 0 }), { probabilities: null, normalized: false });
});
test('malformed, then valid: one corrective retry carrying the validation error', async () => {
  reset(); queue = ['{"support": {"true": 0.9}}', all(noul(0.9), noul(0.9), noul(0.1))];
  const { answers, attempts } = await glimmer().decide(STATE, QUESTIONS);
  assert.equal(requests.length, 2);
  assert.match(requests[1].prompt, /Your previous reply was not accepted: "support.false" must be a number from 0 to 1/);
  assert.equal(attempts[1].retry_reason, '"support.false" must be a number from 0 to 1');
  assert.equal(answers.support.answer, 'supported');
});
test('malformed every time: two corrective retries, then every answer is uncertain and failed, never a guess', async () => {
  reset(); queue = ['not json at all'];
  const { answers, attempts } = await glimmer().decide(STATE, QUESTIONS);
  assert.equal(requests.length, 1 + MAX_CORRECTIVE_RETRIES);
  for (const a of Object.values(answers)) assert.deepEqual(a, { answer: 'uncertain', probabilities: null, normalized: false, raw_probabilities: null, failed: true });
  assert.match(attempts.at(-1).retry_reason, /^gave up after 2 corrective retries: the reply is not valid JSON/);
  assert.equal(route(answers).attention, 'look', 'a failed judge reads as unsure');
});
test('validation refuses wrong shapes, out-of-range numbers and extra keys', () => {
  const ids = ['support'];
  assert.match(validate([], ids).error, /not a JSON object/);
  assert.match(validate({}, ids).error, /missing answer for "support"/);
  assert.match(validate({ support: { true: 1.2, false: 0 } }, ids).error, /from 0 to 1/);
  assert.match(validate({ support: { true: '0.9', false: 0.1 } }, ids).error, /from 0 to 1/);
  assert.match(validate({ support: noul(0.9), extra: 1 }, ids).error, /unexpected keys: extra/);
  assert.equal(validate({ support: noul(0.9) }, ids).error, null);
});
test('a failed call to Ollama is an error recorded as failed, not an answer of "no"', async () => {
  reset(); status = 500;
  const { answers, attempts } = await glimmer().decide(STATE, QUESTIONS);
  assert.ok(Object.values(answers).every((a) => a.failed && a.probabilities === null));
  assert.match(attempts[0].retry_reason, /the adapter call failed: Ollama 500/);
});
test('separate mode asks one question per call, so no answer can see another', async () => {
  reset(); queue = [{ support: noul(0.9) }, { attribution: noul(0.8) }, { needs_support: noul(0.2) }];
  const { answers, attempts, judge } = await glimmer('separate').decide(STATE, QUESTIONS);
  assert.equal(requests.length, 3); assert.equal(attempts.length, 3); assert.equal(judge.mode, 'separate');
  assert.deepEqual(requests.map((r) => r.format.required), [['support'], ['attribution'], ['needs_support']]);
  assert.deepEqual(Object.values(answers).map((a) => a.answer), ['supported', 'certain', 'strength']);
});
test('the Jev slot refuses until D-010 wires it', async () => {
  const out = await createJudge(createJevAdapter()).decide(STATE, QUESTIONS);
  assert.ok(Object.values(out.answers).every((a) => a.failed));
  assert.match(out.attempts[0].retry_reason, /not enabled in D-016/);
  assert.equal(out.judge.locus.mode, 'hosted-synthetic');
});

// The calibration set and runner
test('the calibration set: twelve synthetic cases, unique ids, labels for every question, hard negatives included', () => {
  assert.equal(JUDGE_CALIBRATION_CASES.length, 12);
  assert.equal(new Set(JUDGE_CALIBRATION_CASES.map((k) => k.id)).size, 12);
  for (const k of JUDGE_CALIBRATION_CASES) {
    assert.match(k.state.learner, /\(SYNTHETIC\)$/, k.id);
    assert.deepEqual(Object.keys(k.expected).sort(), Object.keys(QUESTIONS).sort(), k.id);
    assert.deepEqual(Object.keys(k.state).sort(), ['claim', 'learner', 'quote'], k.id);
  }
  assert.ok(JUDGE_CALIBRATION_CASES.filter((k) => !k.expected.attribution).length >= 3, 'misattribution cases');
  assert.ok(JUDGE_CALIBRATION_CASES.filter((k) => !k.expected.support && k.expected.attribution).length >= 3, 'overreach cases');
});
test('no fixture id, aspect or anchor list from the ground truth reaches the judge', async () => {
  const src = await Promise.all(['../judge/questions.mjs', '../judge/decision-judge.mjs', '../judge/adapters/glimmer.mjs'].map((f) => readFile(new URL(f, import.meta.url), 'utf8')));
  for (const s of src) assert.doesNotMatch(s, /ground-truth|GROUND_TRUTH|expectedAnchors/);
});
// A stub adapter that answers each case from its labels, optionally wrong on some.
const labelled = (wrong = new Set(), unsure = new Set(), broken = new Set()) => ({
  name: 'stub', model: 'labels', locus: { mode: 'local', endpoint: 'none' },
  async ask({ state, questions }) {
    const kase = JUDGE_CALIBRATION_CASES.find((k) => k.state.quote === state.quote && k.state.learner === state.learner && k.state.claim.statement === state.claim.statement);
    const out = {};
    for (const id of Object.keys(questions)) {
      const key = `${kase.id}:${id}`;
      const truth = kase.expected[id] !== wrong.has(key);
      out[id] = unsure.has(key) ? noul(0.5) : noul(truth ? 0.95 : 0.05);
    }
    return { prompt: 'stub', raw: broken.has(kase.id) ? 'nonsense' : JSON.stringify(out) };
  },
});
test('calibrate: a judge that matches the labels agrees 36 of 36, with an honest top band', async () => {
  const report = await calibrate(createJudge(labelled()), JUDGE_CALIBRATION_CASES);
  assert.equal(report.judgments, 36);
  for (const s of Object.values(report.summary)) {
    assert.deepEqual([s.settled, s.agreed, s.agreement, s.unsettled, s.failed], [12, 12, 1, 0, 0]);
    assert.deepEqual(s.honesty.map((h) => [h.stated_from, h.n, h.right_rate]), [[0.9, 12, 1]]);
  }
  assert.match(report.caveat, /36 judgments from 12 synthetic cases/);
  assert.equal(report.judge.signal, UNCALIBRATED);
});
test('calibrate: wrong, unsettled and failed answers are each counted, not hidden', async () => {
  const report = await calibrate(createJudge(labelled(new Set(['JC-09:attribution', 'JC-10:attribution']), new Set(['JC-11:attribution']), new Set(['JC-12']))), JUDGE_CALIBRATION_CASES);
  const a = report.summary.attribution;
  assert.deepEqual([a.judgments, a.settled, a.agreed, a.unsettled, a.failed], [12, 10, 8, 1, 1]);
  assert.equal(a.agreement, 0.8);
  const top = a.honesty.find((h) => h.stated_from === 0.9);
  assert.deepEqual([top.n, top.right_rate], [10, 0.8], 'stated 0.95, right 0.8 of the time: shown, not adjusted');
  assert.match(describe(report).find((l) => l.startsWith('attribution')), /^attribution: 8 of 10 settled answers agreed with the labels; 1 unsettled, 1 failed; Brier /);
});
