// D-016 (Subok): the DecisionJudge, one interface with adapters behind it.
//
//   decide(state, questions) -> {
//     answers:  { <id>: { answer, probabilities: { true, false }, normalized,
//                         raw_probabilities, failed } },
//     attempts: [ { adapter, model, prompt, raw_output, retry_reason } ],
//     judge:    { adapter, model, locus, mode, signal }
//   }
//
// Plan P8's rules, as code:
// - raw probabilities are kept; normalization, when needed, is applied and
//   recorded (rule 2);
// - malformed output gets at most two corrective retries, each told the
//   validation error, then the question is `uncertain` and `failed` — never
//   a parse guess (rule 3);
// - judge identity is part of every result (rule 6);
// - `signal` says plainly what the probabilities are: self-reported and
//   uncalibrated until a calibration report exists (rule 4, review O5).
// The adapter only asks; this module validates, normalizes and records.
import { band } from './questions.mjs';

export const MAX_CORRECTIVE_RETRIES = 2;
export const SUM_TOLERANCE = 0.02;    // a Noul's two sides may drift this far from 1 before normalizing
export const UNCALIBRATED = 'self-reported, uncalibrated model signal';

/**
 * Check one adapter reply against the questions asked. Returns
 * { ok: { <id>: { true, false } }, error: string | null }.
 */
export function validate(parsed, ids) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: null, error: 'the reply is not a JSON object' };
  const ok = {};
  for (const id of ids) {
    const a = parsed[id];
    if (!a || typeof a !== 'object') return { ok: null, error: `missing answer for "${id}"` };
    for (const side of ['true', 'false']) {
      const p = a[side];
      if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 1) return { ok: null, error: `"${id}.${side}" must be a number from 0 to 1` };
    }
    ok[id] = { true: a.true, false: a.false };
  }
  const extra = Object.keys(parsed).filter((k) => !ids.includes(k));
  if (extra.length) return { ok: null, error: `unexpected keys: ${extra.join(', ')}` };
  return { ok, error: null };
}

/** Normalize a Noul's two sides so they sum to 1, saying whether it was needed. */
export function normalize(raw) {
  const sum = raw.true + raw.false;
  if (Math.abs(sum - 1) <= SUM_TOLERANCE) return { probabilities: { true: raw.true, false: raw.false }, normalized: false };
  if (sum === 0) return { probabilities: null, normalized: false };
  return { probabilities: { true: raw.true / sum, false: raw.false / sum }, normalized: true };
}

function parse(text) {
  // Extract the JSON object if the model wrapped it (code fences, trailing
  // special tokens such as <|eot|>). The raw output is preserved verbatim in
  // attempts; extraction here only locates the object, never repairs content.
  let body = String(text ?? '').replace(/^```(?:json)?|```$/gm, '').trim();
  const first = body.indexOf('{'), last = body.lastIndexOf('}');
  if (first > 0 || (last >= 0 && last < body.length - 1)) body = body.slice(first, last + 1);
  try { return { value: JSON.parse(body), error: null }; } catch (e) { return { value: null, error: 'the reply is not valid JSON: ' + e.message.slice(0, 120) }; }
}

const failedAnswer = () => ({ answer: 'uncertain', probabilities: null, normalized: false, raw_probabilities: null, failed: true });

export function createJudge(adapter, { mode = 'together', signal = UNCALIBRATED } = {}) {
  if (!adapter || typeof adapter.ask !== 'function') throw new TypeError('a DecisionJudge needs an adapter with ask()');
  if (!['together', 'separate'].includes(mode)) throw new TypeError('mode is "together" or "separate"');
  const identity = { adapter: adapter.name, model: adapter.model, locus: adapter.locus, mode, signal };

  // Ask one group of questions, with up to two corrective retries.
  async function askGroup(state, group, attempts) {
    const ids = Object.keys(group);
    let correction = null;
    for (let i = 0; i <= MAX_CORRECTIVE_RETRIES; i++) {
      let reply;
      try { reply = await adapter.ask({ state, questions: group, correction }); }
      catch (e) {
        // A failed call is an error, never an answer: it ends this group as failed.
        attempts.push({ adapter: adapter.name, model: adapter.model, prompt: null, raw_output: null, retry_reason: 'the adapter call failed: ' + e.message });
        return Object.fromEntries(ids.map((id) => [id, failedAnswer()]));
      }
      const { value, error: parseError } = parse(reply.raw);
      const { ok, error } = parseError ? { ok: null, error: parseError } : validate(value, ids);
      attempts.push({ adapter: adapter.name, model: adapter.model, prompt: reply.prompt, raw_output: reply.raw, retry_reason: correction });
      if (ok) {
        return Object.fromEntries(ids.map((id) => {
          const { probabilities, normalized } = normalize(ok[id]);
          if (!probabilities) return [id, { ...failedAnswer(), raw_probabilities: ok[id] }];
          return [id, { answer: group[id].bands[band(probabilities.true)], probabilities, normalized, raw_probabilities: ok[id], failed: false }];
        }));
      }
      correction = error;
    }
    attempts.push({ adapter: adapter.name, model: adapter.model, prompt: null, raw_output: null, retry_reason: `gave up after ${MAX_CORRECTIVE_RETRIES} corrective retries: ${correction}` });
    return Object.fromEntries(ids.map((id) => [id, failedAnswer()]));
  }

  return {
    judge: identity,
    async decide(state, questions) {
      const attempts = [];
      const groups = mode === 'together'
        ? [questions]
        : Object.entries(questions).map(([id, q]) => ({ [id]: q }));
      const answers = {};
      for (const group of groups) Object.assign(answers, await askGroup(state, group, attempts));
      return { answers, attempts, judge: identity };
    },
  };
}
