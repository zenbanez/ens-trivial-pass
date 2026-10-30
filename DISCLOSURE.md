# Disclosure — previous work vs. hackathon work

This submission builds on previous work. In the interest of judging
fairness, the boundary is stated plainly.

## Previous work (existed before the hackathon, 26 Oct – 4 Nov 2026)

- **The ENS candidate corpus.** The Educational Navigation System
  specifications demonstrated here (ENS-0001 foundational frame, ENS-0002
  Digital Twin, ENS007 Warrant Trail profile, ENS011 Navigation Engine,
  ENSP001 Capture Channel Admission including its Nine Gates and the §9
  post-class debrief case) were authored in August–September 2026 in
  dialogue between Zen Bañez and AI assistants (GPT-5.6 Thinking and
  Claude Fable 5, as recorded in the corpus manifest), and were then
  subjected to independent review, reconciliation, candidate revision,
  and verification inside the ZenOS repository (ZenOS INT-0042 / WS-0042,
  August–October 2026). The corpus is **not** included in this repository
  and is not public at this time; it remains candidate research under
  governed validation, adopted by no institution.
- **The design this demo implements** — the Nine Gates, Gate 9
  (Processing Locus), evidence/claim separation, contestable claims, and
  warrant crumbs — is therefore previous work. What the hackathon
  produced is its *implementation as a working slice*, not the ideas'
  first conception.
- **ZenOS**, the steward's private governance repository in which ENS
  research is held, also predates the hackathon. Its records (intents,
  delegations, warrant trails) are not part of this submission.

## Hackathon work (created 27 October 2026 onward, for this event)

- This repository's entire codebase: the zero-dependency Node server,
  the Nine Gates user interface with the interactive Gate 9
  processing-locus decision, sighting extraction wiring, the minimal
   Digital Twin view, teacher sign-off, contest handling, heuristic-prior
   decay display (labelled heuristic, not measured), and the visible
   warrant-trail panel.
 - The three-screen walkthrough interface (Teacher workspace, Guided
   review, Agent Console page) and story shell, designed and built by
   Sol during the hackathon; and the Agent Console technical layer
   built by Subok on that design.
 - Six AI-generated illustrations (paper-world hero, next step, and
   four ENS-vision aspects) directed by the steward and integrated
   during the hackathon; prompts, tool, and file hashes are recorded
   in `ART-PROVENANCE.md`. They are presentation artwork, not evidence
   or capability claims.
- The deterministic LOCAL STUB extractor (labelled scaffolding, not a
  model) and the Meta Model API integration (Responses API,
  `MODEL_API_*` environment convention).
- This README set, including the demo narrative and this disclosure.

## Third-party and pattern sources

- **Design pattern:** the trust architecture — verification in code
  outside the model, quote-checked facts, and human sign-off — follows
  the pattern taught in Meta's own hackathon workshop
  (`meta-models/legal-agent-workshop`, Agents 101), adopted here on
  27 October 2026 and credited in the README.
- **Models/APIs:** Meta Muse models via the Meta Model API when a key
  is supplied (environment only, never committed). No other third-party
  code: the server and client are dependency-free.
- **AI assistance:** this implementation was written with AI coding
  assistance (Muse Wonder leading integration, Sol on UI/screens,
  Subok on the Agent Console and verification, zen4 on the demo
  narrative and filming board), directed and reviewed by the human
  steward, Zen Bañez, who is accountable for the submission. ENS source material itself arose in human–AI dialogue, as
  disclosed above.

## Data

All learners in the demo are synthetic personas. No real educational
data was used at any stage — in the previous research or in this build.
