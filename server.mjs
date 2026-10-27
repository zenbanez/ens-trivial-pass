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
const META_API_KEY = process.env.META_API_KEY || '';
const META_API_BASE_URL = (process.env.META_API_BASE_URL || '').replace(/\/$/, '');
const META_MODEL = process.env.META_MODEL || '';

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

async function extractWithMeta(text, learners) {
  const prompt = [
    'You extract sightings from a teacher post-class debrief. The learners are SYNTHETIC demo personas.',
    'Return ONLY JSON: {"sightings":[{"learner":"<name>","quote":"<exact substring of the debrief>","observation":"<what was observed, no interpretation beyond the quote>"}]}',
    'Use only these learner names:', learners.join(', '),
    'Debrief:', text,
  ].join('\n');
  const res = await fetch(`${META_API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${META_API_KEY}` },
    body: JSON.stringify({
      model: META_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  });
  if (!res.ok) throw new Error(`Meta API ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const parsed = JSON.parse(content.replace(/^```json?|```$/gm, '').trim());
  return (parsed.sightings || []).map((s) => ({ ...s, extractor: `meta:${META_MODEL}` }));
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === '/api/config') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ metaConfigured: Boolean(META_API_KEY && META_API_BASE_URL && META_MODEL), model: META_MODEL || null }));
      return;
    }
    if (req.url === '/api/extract' && req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const { text, learners } = JSON.parse(body || '{}');
      if (!META_API_KEY || !META_API_BASE_URL || !META_MODEL) {
        res.writeHead(501, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Meta API not configured; the client uses its labelled LOCAL STUB.' }));
        return;
      }
      const sightings = await extractWithMeta(String(text || ''), learners || []);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ sightings }));
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
  console.log(`ENS Trivial Pass demo at http://127.0.0.1:${PORT} (Meta API ${META_API_KEY ? 'configured' : 'not configured — LOCAL STUB extraction'})`);
});
