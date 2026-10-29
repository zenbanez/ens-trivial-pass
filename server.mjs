// The Trivial Pass, Made Real — zero-dependency local server.
// Serves the demo and, only when the steward supplies credentials via
// environment, proxies extraction to a Meta model endpoint. No credentials
// are ever read from files or committed.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreCoverage, COVERAGE_THRESHOLD } from './fixtures/ground-truth.mjs';

const root = fileURLToPath(new URL('./public', import.meta.url));
const PORT = process.env.PORT || 4173;
// Meta Model API, per the meta-models/legal-agent-workshop convention:
// OpenAI-compatible client pointed at api.meta.ai, key from environment only.
const MODEL_API_KEY = process.env.MODEL_API_KEY || '';
const MODEL_API_BASE_URL = (process.env.MODEL_API_BASE_URL || 'https://api.meta.ai/v1').replace(/\/$/, '');
const MODEL_API_MODEL = process.env.MODEL_API_MODEL || 'muse-spark-1.3';
// Operator authorization for the hosted-synthetic path. The server, not the
// page, holds this: a client claiming admission is refused unless the
// operator has expressly enabled hosted-synthetic on the server.
const HOSTED_SYNTHETIC_AUTHORIZED = /^(1|true|yes|on)$/i.test(process.env.HOSTED_SYNTHETIC_AUTHORIZED || '');
// Local model via Ollama on this machine (the declared local locus). Default
// model is Muse Glimmer, an open Meta model; OLLAMA_MODEL can name another
// local model (e.g. a smaller Qwen) without changing the locus claim.
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'muse-glimmer';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

async function extractWithOllama(text, learners, retryFeedback = null) {
  const feedbackBlock = (Array.isArray(retryFeedback) && retryFeedback.length > 0)
    ? [
        '',
        'CORRECTION REQUIRED: Your previous extraction attempt failed deterministic verification:',
        ...retryFeedback.map((r) => `- Quote: "${r.quote || ''}" -> Reason: ${r.reason || 'quote not verbatim in debrief'}`),
        'Ensure every quote is an exact, verbatim substring of the debrief (at least 20 characters), names the learner, and corresponds to what was observed. Do not invent quotes.',
        '',
      ]
    : [];
  const prompt = [
    'You extract sightings from a teacher post-class debrief. The learners are SYNTHETIC demo personas.',
    'Return ONLY JSON, no prose: {"sightings":[{"learner":"<exact learner name>","quote":"<exact substring of the debrief, at least 20 characters, naming the learner>","observation":"<at most 10 words: what was observed>"}]}',
    'Use only these learner names:', learners.join(', '),
    ...feedbackBlock,
    'Debrief:', text,
  ].join('\n');
  // think:false — Muse Glimmer is a reasoning model; structured extraction
  // needs its answer channel, not its thinking budget.
  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, think: false, options: { temperature: 0, num_predict: 512 } }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = await res.json();
  const content = (data.response || '').replace(/^```json?|```$/gm, '').trim();
  const parsed = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1));
  const sightings = (parsed.sightings || []).map((s) => ({ ...s, extractor: `ollama:${OLLAMA_MODEL} (local)` }));
  // Real measured fields only (Agent Console): Ollama reports these itself.
  sightings.metrics = {
    promptTokens: data.prompt_eval_count ?? null,
    evalTokens: data.eval_count ?? null,
    totalSeconds: data.total_duration ? Math.round(data.total_duration / 1e8) / 10 : null,
  };
  sightings.raw = content;
  sightings.prompt = prompt;
  return sightings;
}

function verifySightings(raw, text, learners) {
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const source = norm(text);
  const allowed = new Set(['Amara (SYNTHETIC)', 'Ben (SYNTHETIC)', 'Cora (SYNTHETIC)']);
  const sightings = [], rejected = [];
  for (const s of raw) {
    const firstName = String(s?.learner || '').split(' ')[0];
    // Each rejection carries its reason (D-004 round 4 / D-009 retry contract):
    // the retry loop and the console feedback band consume these verbatim.
    if (!s || typeof s?.quote !== 'string' || !norm(s.quote)) { rejected.push({ ...s, reason: 'empty quote' }); continue; }
    if (!allowed.has(s.learner)) { rejected.push({ ...s, reason: 'unknown learner' }); continue; }
    if (norm(s.quote).length < 20) { rejected.push({ ...s, reason: 'quote under 20 normalized characters' }); continue; }
    if (!new RegExp(`\\b${firstName}\\b`).test(s.quote)) { rejected.push({ ...s, reason: `quote does not name ${firstName}` }); continue; }
    if (text.includes(s.quote.trim())) sightings.push({ ...s, match: 'literal' });
    else if (source.includes(norm(s.quote))) sightings.push({ ...s, match: 'normalized' });
    else rejected.push({ ...s, reason: 'quote not verbatim in debrief' });
  }
  return { sightings, rejected };
}

async function extractWithMeta(text, learners) {
  const prompt = [
    'You extract sightings from a teacher post-class debrief. The learners are SYNTHETIC demo personas.',
    'Return ONLY JSON: {"sightings":[{"learner":"<name>","quote":"<exact substring of the debrief>","observation":"<what was observed, no interpretation beyond the quote>"}]}',
    'Use only these learner names:', learners.join(', '),
    'Debrief:', text,
  ].join('\n');
  // Responses API (client.responses.create in the workshop's Python kit).
  const res = await fetch(`${MODEL_API_BASE_URL}/responses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${MODEL_API_KEY}` },
    body: JSON.stringify({ model: MODEL_API_MODEL, input: prompt, temperature: 0 }),
  });
  if (!res.ok) throw new Error(`Meta API ${res.status}`);
  const data = await res.json();
  const content = data.output_text || data.output?.flatMap((o) => o.content || []).find((c) => c.type === 'output_text')?.text || '{}';
  const parsed = JSON.parse(content.replace(/^```json?|```$/gm, '').trim());
  return (parsed.sightings || []).map((s) => ({ ...s, extractor: `meta:${MODEL_API_MODEL}` }));
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/api/config') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ metaConfigured: Boolean(MODEL_API_KEY), model: MODEL_API_MODEL, baseUrl: MODEL_API_BASE_URL, hostedSyntheticAuthorized: HOSTED_SYNTHETIC_AUTHORIZED, localModel: OLLAMA_MODEL, ollamaBaseUrl: OLLAMA_BASE_URL }));
      return;
    }
    if (req.url === '/api/local-extract' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 65536) { res.writeHead(413, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'request too large' })); return; } }
      let parsed;
      try { parsed = JSON.parse(body || '{}'); } catch {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'request body is not valid JSON' }));
        return;
      }
      const { text, learners, gate, retry } = parsed;
      if (typeof text !== 'string' || text.length > 20000 || !Array.isArray(learners)) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'expected {text: string (<=20000 chars), learners: string[]}' }));
        return;
      }
      // Local gate: this endpoint exists only for the declared local locus.
      if (!gate || gate.mode !== 'local' || gate.admitted !== true) {
        res.writeHead(403, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gate 9: local extraction requires the declared-local gate decision.' }));
        return;
      }
      let raw;
      try { raw = await extractWithOllama(text, learners, retry?.rejected); } catch (e) {
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: `local model (Ollama ${OLLAMA_MODEL}) unavailable: ${e.message}` }));
        return;
      }
      const { sightings, rejected } = verifySightings(raw, text, learners);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ sightings, rejected: rejected.length, rejectedDetails: rejected, locus: { mode: 'local', endpoint: OLLAMA_BASE_URL, model: OLLAMA_MODEL }, metrics: raw.metrics || null, rawModelOutput: raw.raw || null, promptSent: raw.prompt || null }));
      return;
    }
    if (req.url === '/api/coverage' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 65536) { res.writeHead(413, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'request too large' })); return; } }
      let parsed;
      try { parsed = JSON.parse(body || '{}'); } catch {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'request body is not valid JSON' }));
        return;
      }
      const { sightings, debriefId } = parsed;
      if (!Array.isArray(sightings)) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'expected {sightings: object[]}' }));
        return;
      }
      const report = scoreCoverage(sightings, debriefId || 'sample-post-class-debrief');
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(report));
      return;
    }
    if (req.url === '/api/extract' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 65536) { res.writeHead(413, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'request too large' })); return; } }
      let parsed;
      try { parsed = JSON.parse(body || '{}'); } catch {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'request body is not valid JSON' }));
        return;
      }
      const { text, learners, gate } = parsed;
      if (typeof text !== 'string' || text.length > 20000 || !Array.isArray(learners)) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'expected {text: string (<=20000 chars), learners: string[]}' }));
        return;
      }
      // The server enforces the gate, not just the page (D-004 V2): the model
      // is reachable only on the expressly authorized hosted-synthetic path.
      // Every other gate decision — held, local, or absent — is refused here.
      if (!gate || gate.mode !== 'hosted-synthetic' || gate.admitted !== true || gate.syntheticOnly !== true) {
        res.writeHead(403, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gate 9: extraction refused. The model endpoint is reachable only on the expressly authorized hosted-synthetic path (synthetic data only).', gate: gate ?? null }));
        return;
      }
      if (!HOSTED_SYNTHETIC_AUTHORIZED) {
        res.writeHead(403, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Gate 9: hosted-synthetic is not authorized on this server. The operator must set HOSTED_SYNTHETIC_AUTHORIZED=1 to enable it; a client claim of admission is not sufficient.' }));
        return;
      }
      if (!MODEL_API_KEY) {
        res.writeHead(501, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Meta API not configured; the client uses its labelled LOCAL STUB.' }));
        return;
      }
      let raw;
      try { raw = await extractWithMeta(text, learners); } catch (e) {
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: `upstream model call failed: ${e.message}` }));
        return;
      }
      // Verification lives in code, outside the model (the workshop pattern):
      // a sighting is accepted only if its learner is whitelisted, its quote
      // is nonempty, and the quote is verbatim in the debrief.
      const { sightings, rejected } = verifySightings(raw, text, learners);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ sightings, rejected: rejected.length, rejectedDetails: rejected, locus: { mode: 'hosted-synthetic', endpoint: MODEL_API_BASE_URL, model: MODEL_API_MODEL, syntheticOnly: true } }));
      return;
    }
    const path = normalize(join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0]));
    if (!path.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
    const data = await readFile(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'text/plain' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
  }
});

server.listen(PORT, () => {
  console.log(`ENS Trivial Pass demo at http://127.0.0.1:${PORT} (Meta API ${MODEL_API_KEY ? `configured: ${MODEL_API_MODEL} @ ${MODEL_API_BASE_URL}` : 'not configured — LOCAL STUB extraction'})`);
});
