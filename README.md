# The Trivial Pass, Made Real

A synthetic-only slice of the **Educational Navigation System (ENS)**, built
for the **Meta AI Developer Hackathon** (submissions due 4 November 2026).

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
4. Extraction produces **sightings** (verbatim evidence). Sightings support
   **claims** in a minimal Digital Twin — with provenance, confidence that
   decays at read time, and a Contest button. Contested claims are marked,
   never deleted.
5. Every consequential act appends a **warrant crumb** (Warrants v0 shape,
   `ens.*` namespace). Any claim can be walked back to the debrief sentence
   and the gate decision that allowed it to exist.

## Run it

```bash
node server.mjs        # zero dependencies, Node >= 18
# open http://127.0.0.1:4173
```

Three-minute judge path: read the held disposition (hosted is the default) →
switch Gate 9 to the declared local locus → run extraction → contest a
claim → walk the trail.

## Meta models

Extraction is one function. With credentials supplied **via environment
only** (never committed):

```bash
MODEL_API_KEY=... node server.mjs
# optional: MODEL_API_BASE_URL (default https://api.meta.ai/v1),
#           MODEL_API_MODEL  (default muse-spark-1.3)
```

it calls a Meta Muse model for sighting extraction via the Responses API
(the `meta-models/legal-agent-workshop` convention: OpenAI-compatible
client pointed at `api.meta.ai`). Without a key, a deterministic
**LOCAL STUB — not a model** (labelled as such in the UI and in every
crumb) keeps the demo fully judgeable offline. The Gate 9 held disposition
fires *before* any hosted call would be made.

Two trust patterns are borrowed from that workshop and kept in code,
outside the model:

- **Quote-checked sightings.** The extractor proposes; code verifies every
  quote is a verbatim substring of the debrief before it counts.
  Unverifiable sightings are rejected with a crumb, never silently fixed.
- **Teacher sign-off.** Claims are born *proposed*. Only a human click —
  recorded as an `ens.claim.signoff` crumb — admits a claim to the Twin.
  Admission is a stewardship act (ENSP001 §5), not a model output.

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
