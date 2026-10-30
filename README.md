# The Trivial Pass, Made Real

**A teacher's observation should inform support without silently becoming a child's permanent label.**

Teachers notice more than a grade can describe: a learner explains an idea,
hesitates over a task, or helps a classmate. Turning those observations into
structured records creates another responsibility: keep the evidence attached,
keep interpretations open to challenge, and preserve the teacher's decision.

This project demonstrates one small slice of the **Educational Navigation
System (ENS)**: a post-class debrief becomes quoted observations, then proposed
learner claims. Code checks the quotes. A teacher decides what enters the
minimal Digital Twin, and can contest a claim without deleting it.

**Synthetic data only. Research demo, not an assessment product or a service
for real learners.**

Built for the **Meta Global AI Developer Hackathon 2026**, Indie track.
The ENS design and ZenOS collaboration foundations predate the event;
this repository's implementation was created from **27 October 2026 onward**
during the hackathon. See [previous work and team disclosure](DISCLOSURE.md).

## Try the demo

| Access | Status |
|---|---|
| Local application | Available: [run with Node or Docker](#run-locally), then open http://127.0.0.1:4173 |
| Public hosted deployment | **Pending.** No verified deployment URL is published here yet. Localhost is not a public demo link. |
| Recorded video walkthrough | **Pending filming and publication.** No completed video URL is published here yet. |

These pending entries are status slots, not finished deliverables. The lead
will replace them with actual, checked URLs when available. A Dockerfile or
a successful local run does not by itself establish a public deployment.

### What to look for

1. **The idea and the slice.** Begin with what ENS is trying to support,
   then narrow to one synthetic classroom debrief.
2. **A channel that can be held.** In the guided walkthrough, the default
   hosted route is HELD. Gate 9 asks where extraction will run. Choosing a
   declared local locus produces the qualified disposition **admitted on
   specification, not on evidence**; containment telemetry is not demonstrated.
3. **Evidence before interpretation.** Run extraction on the declared local
   path. Check the actual source label: local Ollama if available, otherwise
   **LOCAL STUB · not a model**. Quotes must pass deterministic checks before
   they support the demo's heuristic claim proposals.
4. **The teacher decides.** Sign one proposed claim into the Twin. Leave
   another proposed. Contesting marks a claim and preserves it. The optional
   **Model off** step accepts a teacher-authored observation without extraction.
5. **Inspect the same run.** Open Agent Console from a claim, inspect the
   tools, turns and checklist, and follow its actual warrant record. Return
   to teacher review without creating a second session or replaying a canned run.
6. **The next step and the Vision.** The concluding pages show proposed future
   work, not implemented recommendations. Their illustrations are AI-generated
   conceptual artwork, not model-run evidence.

In Agent Console, **Step through turns** pauses the workflow. Use **Next turn**
or turn stepping off to continue; switching views is not a new run.
The advisory judge is optional and requires a working local model. Its flags
never admit, sign, reject or block a claim. A failed judge must remain visibly
failed, not be narrated as a successful or merely uncertain answer.

For a short review, follow the default HELD route, switch to declared local,
inspect a proposed claim, sign or contest it, and open its record in Console.
Model latency is hardware-dependent. A recorded demonstration must distinguish
real inference, an explicitly labelled stub, and any pre-run or sped-up footage.

## Run locally

From a checkout of this repository:

```bash
node server.mjs
# open http://127.0.0.1:4173
```

The application has no installed runtime dependencies. `package.json` requires
Node >=18; the CI matrix tests Node **20, 22 and 24**.
No API key or model download is required to inspect the UI, use manual entry,
or exercise the labelled stub fallback. Opening the page alone does not start
extraction. If a configured local Ollama model is reachable, selecting local
and running extraction invokes that model even without a hosted API key.

Or build and run the same application with Docker:

```bash
docker build -t ens-trivial-pass .
docker run --rm -p 127.0.0.1:4173:4173 ens-trivial-pass
# open http://127.0.0.1:4173
```

The Docker image does **not** bundle Ollama or model weights. Its loopback
address refers to the container, not an Ollama process on the host; without
a reachable configured model, use manual entry or the labelled extraction stub.
This is a local synthetic demo, not a hardened, authenticated public service.
Run it in a trusted local environment. Public deployment requires a separate
operator review of endpoint access and model-call controls. Do not use real data.

## What the model does, what code does, what people do

| Role | Implemented responsibility |
|---|---|
| Extractor | Proposes sightings from the debrief, including quoted evidence and a learner name. |
| Deterministic code | Checks allowed learner names, quote length, literal source matching and learner-name inclusion; proposes claim classes using fixed rules; records the workflow. These checks do not establish educational truth. |
| Advisory DecisionJudge | Reads a proposed claim against its quote and learner, returning support, attribution and needs-support signals. It cannot take the teacher's decision. |
| Teacher | Authors observations, signs proposed claims into the Twin and contests claims. No model calls the sign-off control. |

**One session, one trail, two views:** guided review and Agent Console inspect
the same browser state. The console labels code, model and human turns rather
than presenting every step as AI reasoning.

### Model paths and configuration

| Path | Configuration and actual behavior |
|---|---|
| Declared local extraction | Server uses `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`) and `OLLAMA_MODEL` (default `muse-glimmer`). The repository does not install those weights. |
| Local extraction fallback | If the local request fails, the browser uses the deterministic **LOCAL STUB**, explicitly labelled. This is not Meta inference. |
| Local advisory judge | Ollama adapter; `OLLAMA_JUDGE_MODEL` falls back to `OLLAMA_MODEL`, then `muse-glimmer`. The same default model is used for extraction and judging, so this is **not an independent second opinion**. See [judge interface and calibration](judge/README.md). |
| Hosted synthetic extraction | Separate, optional route. Requires server-side `HOSTED_SYNTHETIC_AUTHORIZED=1` **and** `MODEL_API_KEY`, supplied through the process environment, plus selection of the hosted-synthetic UI option. Failure is reported; this mode does not silently fall back. |

For the optional hosted path, `MODEL_API_BASE_URL` defaults to
`https://api.meta.ai/v1` and `MODEL_API_MODEL` to `muse-spark-1.3`;
the server calls `/responses`. Supplying a key alone does not authorize a
hosted call, and the declared-local path does not use this hosted extractor.
Hosted-synthetic sends the synthetic debrief to the configured provider;
it is **not** Gate 9 compliance for real learner data.
Never commit keys, put them in browser code, or use real learner text.

Local execution depends on the operator's configured endpoints. A model name
and a selected local label are not proof of pinned weight bytes, blocked
network egress or independently verified containment.

The checked-in [29 October calibration report](evaluation/calibration-together-2026-10-29.json)
records one Glimmer run over **12 synthetic cases / 36 judgments**. It is a
bounded fixture measurement, not proof of general accuracy or a guarantee for
another configured model. Running the calibration command invokes the
configured local judge; it is not the mocked test suite.

## Evidence, limitations and data boundaries

- **Quoted evidence is not a diagnosis.** Literal quote checks and learner-name
  inclusion are mechanical checks, not a general solution to attribution or
  assessment. Claim classification is a fixed heuristic, not a second model.
- **Priors are illustrative.** The displayed values are labelled heuristic
  priors, not measured learner confidence. Read-time decay demonstrates
  revisability; it is not a validated psychometric measure.
- **Coverage is fixture-bounded.** The coverage scorer uses bundled synthetic
  ground truth. It does not measure complete understanding of arbitrary classes
  or custom debriefs. The local path has bounded correction retries and human
  escalation, not an unlimited self-correction promise.
- **The trail is inspectable, not a truth certificate.** Crumbs record gate,
  extraction, rejection, proposal and human actions, with source/statement
  commitments where recorded. **Verify trail** recomputes crumb-metadata
  hashes; it does not itself establish full payload integrity, an unalterable
  history, or the correctness of an educational interpretation.
- **Synthetic-only operation.** Amara, Ben and Cora are fictional and labelled.
  The demo has no user accounts or durable learner database. Browser session
  state is in memory; the server retains a bounded in-memory retry-rejection
  cache, and users may export the trail. Hosted inference transmits the
  submitted synthetic text to the configured provider. Do not enter real data.
- **Worked-case boundaries.** The displayed gate walk is a demonstration of
  specified conditions, not comprehensive organizational admission review.
  The UI does not prove Gate 9 enforcement telemetry or legal compliance.

The wider ENS ambition is a foundation for learning applications that preserve
evidence, human judgment and revision. **This slice does not implement a
navigation recommender, a full learning-management system, a judge that walks
a learner's history, or voice capture.** The Vision's Empowered Teachers,
Involved Parents, Guided Learners and Learning Institutions are long-term
directions, not four delivered products.

ENS remains candidate research under governed validation. No educational
effectiveness, institutional adoption, DepEd representation, legal compliance,
or readiness for use with real learners is claimed.

## Inspect and reproduce

```bash
node --test test/*.test.mjs
node tools/verify-shared-labels.cjs
```

These commands exercise deterministic logic, fixtures and mocked transports;
they do not prove a live model ran. [CI](.github/workflows/ci.yml) runs the Node
test suites. The optional served-browser smoke test requires Playwright and
an installed compatible browser; it is a development dependency, not an app
runtime requirement:

```bash
# With Playwright available to Node and Edge installed:
ENS_EXPECT_CONSOLE=1 node tools/verify-ui.cjs
```

In PowerShell, set `$env:ENS_EXPECT_CONSOLE='1'` before running
`node tools/verify-ui.cjs`. The smoke test uses explicit model stand-ins,
requires the actual console modules, checks the shared session and navigation,
and tests desktop/mobile layouts. See [UI contract](UI-REDESIGN.md).

| Read the code | Purpose |
|---|---|
| [server.mjs](server.mjs) | Static serving, extraction routes, hosted authorization, coverage and local judge integration |
| [public/app.js](public/app.js) | Gate walk, quote verification, heuristic proposals, human actions and crumbs |
| [judge/](judge/README.md) | Advisory framework, local adapter and calibration runner |
| [fixtures/ground-truth.mjs](fixtures/ground-truth.mjs) | Synthetic evidence and bounded coverage fixtures |
| [UI-REDESIGN.md](UI-REDESIGN.md) | Same-session UI contract and presentation boundaries |
| [ART-PROVENANCE.md](ART-PROVENANCE.md) | Generated-art prompts, tool attribution and file hashes |

## Provenance, collaborators and license

**One human entrant:** Zen Bañez, steward, director and accountable submitter.
AI collaborators supported the build: Muse Wonder led integration; Sol built
the UI/screens; Subok built the Agent Console and supported verification;
zen4 owns the demo narrative and filming board. See [DISCLOSURE.md](DISCLOSURE.md)
for the previous-work boundary and contributor roles.

The ENS specifications and the private ZenOS collaboration foundations existed
before this event. They are not bundled here. The hackathon contribution is
the public working implementation, interface, tests and supporting materials,
with its development history in this repository. The worked case comes from
ENSP001 §9; the prior candidate design includes ENS-0001, ENS-0002, ENS007,
ENS011 and ENSP001. These references are design provenance, not public-source
availability or institutional endorsement claims.

The pattern of verification outside the model, quote-checked facts and human
sign-off follows Meta's Agents 101 workshop, `meta-models/legal-agent-workshop`.
The six paper-world illustrations were generated using OpenAI's built-in
image-generation tool in Codex under the steward's direction. They are not
Meta model output and must not count as evidence of Meta runtime usage.

**License:** Apache 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

**The model proposes. The teacher decides.**
