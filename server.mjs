// The Trivial Pass, Made Real — zero-dependency local server.
// Serves the demo and, only when the steward supplies credentials via
// environment, proxies extraction to a Meta model endpoint. No credentials
// are ever read from files or committed.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./public', import.meta.url));
const PORT = process.env.PORT || 4173;
// Meta Model API, per the meta-models/legal-agent-workshop convention:
// OpenAI-compatible client pointed at api.meta.ai, key from environment only.
const MODEL_API_KEY = process.env.MODEL_API_KEY || '';
const MODEL_API_BASE_URL = (process.env.MODEL_API_BASE_URL || 'https://api.meta.ai/v1').replace(/\/$/, '');
const MODEL_API_MODEL = process.env.MODEL_API_MODEL || 'muse-spark-1.3';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

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
      res.end(JSON.stringify({ metaConfigured: Boolean(MODEL_API_KEY), model: MODEL_API_MODEL, baseUrl: MODEL_API_BASE_URL }));
      return;
    }
    if (req.url === '/api/extract' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { text, learners } = JSON.parse(body || '{}');
      if (!MODEL_API_KEY) {
        res.writeHead(501, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Meta API not configured; the client uses its labelled LOCAL STUB.' }));
        return;
      }
      const raw = await extractWithMeta(String(text || ''), learners || []);
      // Verification lives in code, outside the model (the workshop pattern):
      // a sighting is accepted only if its quote is verbatim in the debrief.
      const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
      const source = norm(text);
      const sightings = [], rejected = [];
      for (const s of raw) (source.includes(norm(s.quote)) ? sightings : rejected).push(s);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ sightings, rejected: rejected.length }));
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
