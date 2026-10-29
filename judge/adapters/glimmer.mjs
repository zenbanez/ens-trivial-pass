// D-016 (Subok): the glimmer-wrapper adapter. A local model through Ollama
// on this machine, Muse Glimmer by default, asked for a JSON reply that
// matches a strict schema. Plan P8 rule 1: think:false, temperature 0, a
// strict JSON schema, capped output.
//
// The probabilities it returns are what the model says about itself, not
// token probabilities. decision-judge.mjs labels them that way (review O5).
// The adapter asks and reports; validation and retries live in the judge.

export const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
export const DEFAULT_JUDGE_MODEL = 'muse-glimmer';
export const TOKENS_PER_QUESTION = 48;

/** The JSON schema the reply must match: one {true, false} pair per question. */
export function replySchema(ids) {
  const side = { type: 'number', minimum: 0, maximum: 1 };
  return {
    type: 'object',
    additionalProperties: false,
    required: ids,
    properties: Object.fromEntries(ids.map((id) => [id, {
      type: 'object', additionalProperties: false, required: ['true', 'false'],
      properties: { true: side, false: side },
    }])),
  };
}

/** The prompt: the state, then each question with what yes and no mean. */
export function judgePrompt(state, questions, correction = null) {
  const lines = [
    'Answer each question about the state below with the probability that it is true.',
    'The learners are synthetic demo personas.',
    '',
    'State:',
    JSON.stringify(state, null, 2),
    '',
    'Questions:',
  ];
  for (const [id, q] of Object.entries(questions)) {
    lines.push(`- ${id}: ${q.text}`, `  true means: ${q.true}`, `  false means: ${q.false}`);
  }
  lines.push('', `Reply with JSON only: {${Object.keys(questions).map((id) => `"${id}": {"true": <0..1>, "false": <0..1>}`).join(', ')}}. The two numbers for a question should sum to 1.`);
  if (correction) lines.push('', `Your previous reply was not accepted: ${correction}. Reply again, with JSON only.`);
  return lines.join('\n');
}

export function createGlimmerAdapter({ baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL,
  model = process.env.OLLAMA_JUDGE_MODEL || process.env.OLLAMA_MODEL || DEFAULT_JUDGE_MODEL,
  fetchImpl = globalThis.fetch } = {}) {
  const url = String(baseUrl).replace(/\/$/, '');
  return {
    name: 'glimmer-wrapper',
    model,
    locus: { mode: 'local', endpoint: url },
    async ask({ state, questions, correction }) {
      const ids = Object.keys(questions);
      const prompt = judgePrompt(state, questions, correction);
      const res = await fetchImpl(`${url}/api/generate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model, prompt, stream: false, think: false,
          format: replySchema(ids),
          options: { temperature: 0, num_predict: TOKENS_PER_QUESTION * ids.length + 32 },
        }),
      });
      if (!res.ok) throw new Error(`Ollama ${res.status}`);
      const data = await res.json();
      return { prompt, raw: data.response ?? '' };
    },
  };
}

// The Jev slot (D-010's adapter seam). D-016 is local only: this slot refuses
// until the lead wires Jev on the hosted-synthetic path, with credentials from
// the environment and the destination recorded in every judgment crumb.
export function createJevAdapter() {
  return {
    name: 'jev', model: null, locus: { mode: 'hosted-synthetic', endpoint: null },
    async ask() { throw new Error('the Jev adapter is not enabled in D-016; it rides hosted-synthetic under D-010'); },
  };
}
