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
| Public hosted deployment | Live: https://ens.banezglobal.com/ (Firebase App Hosting, full stack, verified). No hosted model is used anywhere: extraction runs at the declared local locus (local Ollama model when reachable, otherwise the labelled LOCAL STUB). |
| Recorded video walkthrough | Published: https://youtu.be/1YeQR8paSx8 (3-minute guided walkthrough of the slice, filmed against the D-026 filming board). |

These pending entries are status slots, not finished deliverables. The lead
will replace them with actual, checked URLs when available. A Dockerfile or
a successful local run does not by itself establish a public deployment.

### What to look for

1. **The idea and the slice.** Begin with what ENS is trying to support,
   then narrow to one synthetic classroom debrief.
2. **A channel that can be held.** In the guided walkthrough, the hosted
   route is HELD. Gate 9 asks where extraction will run. The declared
   local locus is the recommended testing path and produces the qualified
   disposition **admitted on specification, not on evidence**; containment
   telemetry is not demonstrated.
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
6. **Navigation: the teacher's next step (`#navigation`).** From Agent Console,
   choose **Decide the next step →**. For each teacher-signed claim (including
   contested claims signed with eyes open), the teacher writes their own next
   step by hand (`ens.navigation.next_step`, `model_off: true`). No model runs
   on this page and no recommendation is generated; recording or revising a
   step invalidates any earlier trail check until **Verify trail** is run again.
7. **The next step and the Vision.** The concluding pages show proposed future
   work, not implemented recommendations. Their illustrations are AI-generated
   conceptual artwork, not model-run evidence.

In Agent Console, **Step through turns** pauses the workflow. Use **Next turn**
or turn stepping off to continue; switching views is not a new run.
The advisory judge is optional and requires a working local model. Its flags
never admit, sign, reject or block a claim. A failed judge must remain visibly
failed, not be narrated as a successful or merely uncertain answer.

For a short review, note the HELD hosted route, switch to the recommended declared local locus,
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

The declared local locus calls a local [Ollama](https://ollama.com) at
`http://127.0.0.1:11434` running `muse-glimmer` (override with
`OLLAMA_BASE_URL` and `OLLAMA_MODEL`). If that model is unavailable, the
run falls back to a deterministic **LOCAL STUB — not a model**, labelled as
such in the UI and in every crumb, and the advisory judge is unavailable.

Or build and run the same application with Docker:
```


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
| Teacher | Authors observations, signs proposed claims into the Twin, contests claims, and records their own next step per signed claim on `#navigation`. No model calls sign-off or next-step recording. |

**One session, one trail, two views:** guided review and Agent Console inspect
the same browser state. The console labels code, model and human turns rather
than presenting every step as AI reasoning.

## Where it fits: outcomes and the LMS

**Existing practice.** Schools already plan and report against learning
outcomes; in the Philippines, outcomes-based education and DepEd's learning
competencies. A grade summarises how a learner did against them. ENS keeps
what sits under such a summary: the teacher's observation, the claim it
supports, and the teacher's decision to keep or contest it. **Mapping claims
to a school's own outcomes is the next step, and it is not built in this
slice.** No claim here is aligned to any curriculum.

**Beside an LMS, not instead of one.** A learning-management system such as
Canvas tracks outcomes through scored work: an outcome has a mastery
threshold, scores come from aligned assignments and rubrics, and a
calculation method (for example a decaying average) rolls them up in a
Learning Mastery Gradebook
([Canvas Outcomes API](https://canvas.instructure.com/doc/api/outcomes.html),
[Outcome Results](https://developerdocs.instructure.com/services/canvas/resources/outcome_results)).
ENS records why: the quoted observation under each claim, the teacher's
sign-off or contest, and a trail that recomputes. It is meant to sit beside
an LMS, not to replace one, and this slice has no LMS integration.

## Meta models: what runs, and what does not

| Leg | Model | Status in this submission |
|---|---|---|
| Sighting extraction at the declared local locus | Muse Glimmer (open weights) via local Ollama | Demonstrated |
| Advisory DecisionJudge | the same local Muse Glimmer | Demonstrated |
| Jev adapter for the judge | — | Seam only: not wired, never called |

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
enough to catch a plainly wrong judge, not to certify one. The judge is an
advisory harness with a structured-question interface, not a System One model;
see [judge/README.md](judge/README.md).

**Jev.** The judge's adapter interface has a Jev slot, but it refuses every
call: Jev is not wired, and no Jev call has been made from this repository.

**No hosted extraction exists in this build.** The previously implemented
hosted-synthetic demo path was removed as confusing: every extraction
runs at the declared local locus only, and the server has no hosted
model endpoint. The Gate 9 held disposition fires for the undeclared
hosted route before any extraction would be made. The local path takes
up to two bounded retries, then escalates to the teacher.

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
cache, and users may export the trail. Do not enter real data.
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
```


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
| [server.mjs](server.mjs) | Static serving, the local extraction route, coverage and local judge integration |
| [public/app.js](public/app.js) | Gate walk, quote verification, heuristic proposals, human actions and crumbs |
| [judge/](judge/README.md) | Advisory framework, local adapter and calibration runner |
| [fixtures/ground-truth.mjs](fixtures/ground-truth.mjs) | Synthetic evidence and bounded coverage fixtures |
| [UI-REDESIGN.md](UI-REDESIGN.md) | Same-session UI contract and presentation boundaries |
| [ART-PROVENANCE.md](ART-PROVENANCE.md) | Generated-art prompts, tool attribution and file hashes |

- `node --test test/*.test.mjs` runs 47 unit tests, covering the
  coverage scorer and retry loop, the DecisionJudge, manual entry, and Navigation.
  GitHub Actions runs them on every pull request and on pushes to `main`,
  on Node 20, 22 and 24.
- `tools/verify-ui.cjs` and `tools/verify-shared-labels.cjs` drive the page
  in a browser. They need Playwright, installed separately, and are not
  part of CI.
- The layout: `server.mjs` (one zero-dependency Node server), `public/`
  (the page), `judge/` (the DecisionJudge and its adapters), `fixtures/`
  (ground truth and calibration cases), `test/`, `tools/`.
```


## Provenance, collaborators and license

**One human entrant:** Zen Bañez, steward, director and accountable submitter.
AI collaborators supported the build: Muse Wonder led integration; Sol built
the UI/screens; Subok built the Agent Console and supported verification;
zen4 owns the demo narrative; Linaw refreshed the filming board to the final
build. See [DISCLOSURE.md](DISCLOSURE.md)
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
