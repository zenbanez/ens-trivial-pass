# The Trivial Pass, Made Real

A synthetic-only slice of the **Educational Navigation System (ENS)**, built
for the **Meta AI Developer Hackathon** (submissions due 4 November 2026).

**Track:** Indie. **Team:** one human — Zen Bañez, steward, director, and
accountable submitter — and several AI agent collaborators (see
[DISCLOSURE.md](DISCLOSURE.md) for who did what, and what predates the
hackathon). **License:** Apache 2.0 ([LICENSE](LICENSE), [NOTICE](NOTICE)).

ENS is a governed research corpus (ZenOS INT-0042 / WS-0042) that asks what
an educational system must *refuse* to become before it asks what to build.
**Previous-work disclosure:** the ENS specifications predate this hackathon;
the implementation in this repository was built during it. The full
boundary is in [DISCLOSURE.md](DISCLOSURE.md).
This demo implements one worked case from that corpus — ENSP001 §9, the
post-class debrief — because it is the case the corpus itself calls trivial,
right up until the ninth gate.

## The one interaction

1. A teacher (you) writes a short post-class debrief about a synthetic class.
2. Before any AI touches it, the capture channel must pass the **Nine Gates**
   admission test. Gates 1–8 pass in minutes.
3. **Gate 9 — Processing Locus** asks where extraction runs:
   - *Hosted API* → the channel is **HELD**. Per-learner sightings about
     named children may not cross the boundary to an unnamed extractor.
     "A channel is not benign because its microphone is."
   - *Declared local locus* → **admitted on the specification, not on
     evidence** — and the demo says exactly that, because enforcement
     telemetry (condition 6) is simulated, not produced.
   - *Hosted, synthetic demo only* → admitted **for synthetic data only**,
     and only when the server operator has authorized it. This is not
     Gate 9 compliance for real learner data.
4. Extraction produces **sightings** (verbatim evidence). Sightings support
   **claims** in a minimal Digital Twin — with provenance, a heuristic prior
   (not measured) that decays at read time, and a Contest button. Contested
   claims are marked, never deleted.
5. Every consequential act appends a **warrant crumb** (Warrants v0 shape,
   `ens.*` namespace). Any claim can be walked back to the debrief sentence
   and the gate decision that allowed it to exist.

## Run it

```bash
node server.mjs        # no npm dependencies; CI tests Node 20, 22 and 24
# open http://127.0.0.1:4173
```

The declared local locus calls a local [Ollama](https://ollama.com) at
`http://127.0.0.1:11434` running `muse-glimmer` (override with
`OLLAMA_BASE_URL` and `OLLAMA_MODEL`). If that model is unavailable, the
run falls back to a deterministic **LOCAL STUB — not a model**, labelled as
such in the UI and in every crumb, and the advisory judge is unavailable.

Or with Docker (synthetic demo, no keys needed):

```bash
docker build -t ens-trivial-pass .
docker run -p 4173:4173 ens-trivial-pass
# open http://127.0.0.1:4173
```

Inside the container, the default Ollama address is the container itself.
So unless `OLLAMA_BASE_URL` points at an Ollama the container can reach,
the local locus runs the labelled LOCAL STUB and the judge is unavailable.

Three-minute judge path: read the held disposition (hosted is the default) →
switch Gate 9 to the declared local locus → run extraction → optionally ask
the advisory judge → contest a claim → walk the trail, and recompute it.

## Meta models: what runs, and what does not

| Leg | Model | Status in this submission |
|---|---|---|
| Sighting extraction at the declared local locus | Muse Glimmer (open weights) via local Ollama | Demonstrated |
| Advisory DecisionJudge | the same local Muse Glimmer | Demonstrated |
| Jev adapter for the judge | — | Seam only: not wired, never called |
| Hosted extraction, synthetic only | Meta Model API, `muse-spark-1.3` | Implemented, not exercised for this submission |

**Local extraction.** The extractor runs at temperature 0. The Agent
Console shows the exact prompt sent and the raw model output, before code
verifies it. Code returns rejected sightings to the extractor with their
reasons verbatim, at most twice, and then escalates to the teacher.
Coverage is scored in code against ground-truth fixtures the extractor
never sees; the threshold, two of three expected sightings, is shown on
screen.

**The DecisionJudge is advisory: a local Glimmer model answers three yes/no
questions about each proposed claim, code routes the answers to the
teacher's attention, and nothing it says admits, rejects, signs or blocks a
claim.** It runs only at the declared local locus. The judge and the
extractor are the same model, so they can share blind spots: their
agreement is not independent confirmation. The probabilities are the
model's own, self-reported and uncalibrated. A committed calibration record
([evaluation/](evaluation/)) covers 12 synthetic cases (36 judgments):
enough to catch a plainly wrong judge, not to certify one. The judge is
System-One-style in its interface only; see [judge/README.md](judge/README.md).

**Jev.** The judge's adapter interface has a Jev slot, but it refuses every
call: Jev is not wired, and no Jev call has been made from this repository.

**Hosted extraction** uses the Responses API (the
`meta-models/legal-agent-workshop` convention: an OpenAI-compatible client
pointed at `api.meta.ai`). It needs both a key, supplied **via environment
only** (never committed), and the operator's authorization on the server:

```bash
MODEL_API_KEY=... HOSTED_SYNTHETIC_AUTHORIZED=1 node server.mjs
# optional: MODEL_API_BASE_URL (default https://api.meta.ai/v1),
#           MODEL_API_MODEL  (default muse-spark-1.3)
```

Without both, the hosted-synthetic option refuses. A client's claim of
admission is not enough. The Gate 9 held disposition fires *before* any
hosted call would be made. Hosted runs take one attempt, with no retry
loop.

Two trust patterns are borrowed from that workshop and kept in code,
outside the model:

- **Quote-checked sightings.** The extractor proposes; code verifies every
  quote is a verbatim substring of the debrief before it counts.
  Unverifiable sightings are rejected with a crumb, never silently fixed.
- **Teacher sign-off.** Claims are born *proposed*. Only a human click —
  recorded as an `ens.claim.signoff` crumb — admits a claim to the Twin.
  Admission is a stewardship act (ENSP001 §5), not a model output.

## Tests and layout

- `node --test test/*.test.mjs` runs 41 unit tests, covering the
  coverage scorer and retry loop, the DecisionJudge, and manual entry.
  GitHub Actions runs them on every pull request and on pushes to `main`,
  on Node 20, 22 and 24.
- `tools/verify-ui.cjs` and `tools/verify-shared-labels.cjs` drive the page
  in a browser. They need Playwright, installed separately, and are not
  part of CI.
- The layout: `server.mjs` (one zero-dependency Node server), `public/`
  (the page), `judge/` (the DecisionJudge and its adapters), `fixtures/`
  (ground truth and calibration cases), `test/`, `tools/`.

## Data discipline

All learners (Amara, Ben, Cora) are **synthetic personas**, labelled as such
in the UI. No real educational data is used, stored, or transmitted. No
accounts, no analytics, no persistence beyond an exportable trail file.

## What this does not claim

ENS is candidate research under governed validation. This demo shows that
its gate discipline is *implementable* and that Gate 9 changes real
outcomes. It does not claim educational validity, psychometric soundness,
legal compliance (DepEd or otherwise), or readiness for any real learner.
Source corpus: ENS-0001, ENS-0002, ENS007, ENS011, ENSP001 §§4, 7–9.

*Cost of doing: complexity. Cost of not doing: death. This is the complexity,
carried where it belongs — in the gates, not on the teacher.*
