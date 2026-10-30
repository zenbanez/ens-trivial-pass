# UI redesign — design and integration handoff

This presentation layer preserves the existing one-page session and runtime
pipeline. It is not a new assessment engine or navigation recommender.

## Three application surfaces; six story beats

- **Overview:** The idea → The slice. The opening answers what ENS is before
  technical detail. The broader vision is explicitly aspirational.
- **Guided walkthrough:** The existing editable debrief, channel admission,
  optional model-off observation entry, proposed/signed claims, and warrant
  trail. The controls invoke the existing application logic, not scripted
  successful outcomes.
- **Agent Console:** The mechanism behind the same session. The existing
  console mount and trail are retained for the console builder.
- **Conclusion:** The next step → The Vision. Future work is distinguished
  from demonstrated capabilities. The final headings are Empowered Teachers,
  Involved Parents, Guided Learners, Learning Institutions.

The selected visual direction is a tactile paper world: a fictional classroom
moment unfolding into possible paths. This artwork is conceptual; it is not
an output of the application or evidence of implemented recommendations.

## Ownership and seam

Sol owns `public/index.html`, `public/story-shell.css`,
`public/story-shell.js`, `public/assets/ens-paper-world.png`, this note,
the optional author smoke test, and the PNG MIME addition only.
The console builder owns `public/console-view.js`,
`public/console-view.css`, `public/liveness.js`, and the agreed bounded
`app.js` event/delegation changes. No extraction, gate, scoring, judge or
admission semantics are changed by this shell. The lead integrates and opens
PRs; this branch does not integrate peer work by assuming it is accepted.

Script order after integration: `app.js`, `liveness.js`, `story-shell.js`,
`console-view.js` (classic scripts); `manual-sighting.mjs` stays an ES module.
Styles: existing `style.css`, `story-shell.css`, then `console-view.css`.
The standalone shell does not request the peer files before they exist.

The existing IDs remain unique and addressable:

| Preserved hooks | Role |
|---|---|
| `debrief`, `learners`, `debrief-panel` | Actual input/source |
| `gate-panel`, `gates`, `gate9-walk`, `disposition`, `extract-btn`, `extractor-note`, `input[name=locus]` | Actual gate and extraction |
| `manual-panel`, `manual-learner`, `manual-observation`, `manual-btn`, `manual-note` | Actual model-off entry |
| `twin-panel`, `twin`, `age`, `age-val`, `judge-btn`, `judge-note`, `data-signoff`, `data-contest`, `data-claim-card` | Actual claims and human actions |
| `console-panel`, `console-grid`, `tools-list`, `turns`, `verify-feedback`, `checklist`, `step-mode`, `next-turn` | Live console mount, intact subtree |
| `trail-panel`, `trail`, `verify-trail-btn`, `verify-trail-result`, `export-btn`, `data-crumb-id` | The original session trail |
| `view-teacher`, `view-console` | Application-surface controls |

Presentation-only stepping intentionally hides inactive teacher panels.
Existing probes should navigate before requiring visibility, rather than
expecting every control to be visible on first load. Deep links to
`#debrief-panel`, `#gate-panel`, `#manual-panel`, `#twin-panel`, `#trail-panel`
open the matching step. `#console` opens the console. `#idea`, `#slice`,
`#next`, `#vision` open narrative chapters. Navigation does not reload.

### Shared events and read-only access

```js
document.dispatchEvent(new CustomEvent('ens:navigate', { detail: {
  view: 'console', // or 'review'
  warrantId: 'an-actual-session-warrant-id',
  claimId: 'an-actual-session-claim-id'
}}));
```

The shell shows the surface; the console component owns record selection when
`window.ENSConsole` is installed. Without that component the shell supplies a
working fallback selecting the actual trail row or claim. Claim and trail links
dispatch this same event in both directions. The original `trail-panel` DOM node
is moved between `ens-review-trail` and `ens-console-trail`, never cloned.

`window.ensUI.navigate(target, detail)`, `ensUI.getView()` and
`ensUI.snapshot()` are available. A snapshot is a JSON copy read on demand
from the existing `SESSION_ID`, `RUN_SEQ`, `CLAIMS`, `SIGHTINGS`, `crumbs`,
`TURNS`, coverage and current locus. It is never restored, persisted, used to
simulate execution, or substituted for the original state. The console can
read the original classic-script state directly. `ens:ui-ready` is a one-time
notification; components loaded later must also initialize from current state.

Shared liveness vocabulary belongs to the console builder's `liveness.js`;
integration must preserve truthful LOCAL STUB, MANUAL ENTRY, failed-judge and
escalation labels. A live browser session is not proof of live model execution.
No fixed success, numeric confidence or calibration result is added by the shell.
The teacher view consumes the same `ENSLiveness.forSession`, `forClaim` and
`pill` API when D-018 is loaded. No second label classifier is maintained.
Latest-evidence labels and per-claim source/judge pills do not upgrade stub
or manual records to live model output. In a shell-only checkout without
D-018, the original explicit extractor strings remain visible instead.

After D-018 files are present, `node tools/verify-shared-labels.cjs` checks
the pure shared helper's stub/manual/failed/missing-answer handling and the
tool rail's code roles without a model call. `ENS_EXPECT_CONSOLE=1` makes
the served smoke test require actual console modules and matching labels.

### Style tokens

`--ens-paper:#f7f3e9`, `--ens-surface:#fffdf7`, `--ens-ink:#173f38`,
`--ens-muted:#506b60`, `--ens-line:#d6dece`, `--ens-accent:#1e5947`,
`--ens-sage:#e5eddb`, `--ens-ochre:#8d5b21`.
Legacy `--paper`, `--card`, `--ink`, `--ink-soft`, `--line`, `--accent`
alias these. Story headings use Georgia/serif; controls and narrative UI use
system sans; inspectable records use monospace. No remote fonts or runtime
framework are introduced.

## Asset provenance

`public/assets/ens-paper-world.png` was generated with OpenAI's built-in
image-generation tool in Codex, from a prompt for a fictional paper-sculpture
classroom, an open-book landscape and branching possibilities. The steward
selected this direction. No real children, reference photographs or learner
records were supplied. It is decorative concept art, not a screenshot.
SHA-256: `6a8681f561d293e0934c772e689c0515428e6357e8fe2d3b8e49cca479189f4a`.
The `.png: image/png` static MIME addition is the only server change.

## Author verification, not independent acceptance

`node --test test/*.test.mjs`: 41/41 existing tests passed using fixtures and
stand-ins. `node tools/verify-ui.cjs` additionally uses Playwright plus an
installed Edge (or `ENS_BROWSER_CHANNEL=chrome`) for a served-page smoke test.
If Playwright is supplied outside Node's normal package lookup, set `NODE_PATH`
to that installed package directory. It is not a runtime app dependency.

The UI test clears the model key/hosted authorization for its isolated server,
replaces local extraction with an explicit 503 stand-in to exercise the labelled
stub, and replaces advisory judge calls with a failure stand-in. It verifies
no startup model request, HELD state, actual manual model-off entry, sign-off,
contest preservation, same session/claims/crumbs in both views, bidirectional
record links, real crumb-hash recomputation, PNG/MJS serving, and no overflow
at 1360/1024/390/320px or browser script errors/external requests. This is author
testing of the UI shell, not a real model run, independent review, integrated
D-018 verification, security/accessibility certification, or readiness closure.

Known limits of the prior candidate remain unless separately disposed. In
particular, navigation does not make a selected local label into enforced
containment or a crumb-metadata hash check into full payload verification.

## Approved closing-art follow-up (30 October)

Zen requested and approved a companion Next step image plus one image for
each of the four Vision headings, then directly authorized integration.
This follow-up starts at integrated candidate `a9a65aa`; it does not replace
that locked pin or confer submission/merge authority. Muse Wonder integrates.
The Next step page pairs the new image with existing text, then retains the
three proposed next steps. The Vision shows all four uncropped square images
at desktop width, two columns at tablet width, and one on narrow screens.
Existing wording, long-term-vision limits and the final line are retained.

All five PNGs are local, lazy-loaded and asynchronously decoded, with intrinsic
dimensions and descriptive alt text. They depict fictional people and a
conceptual future, not learner records, model outputs or implemented capabilities.
The PNG originals are byte-preserved, about 12 MB total; lazy loading avoids
making the whole set a startup requirement. See [asset provenance and prompts](ART-PROVENANCE.md).
No app.js, console/liveness, provider, judge, fixture, admission or trail logic
changes. Served smoke additionally checks all asset URLs/MIME, actual decode,
four exact headings/desktop columns, unchanged session and zero model calls
on concluding-page navigation. Existing round-trip and responsive tests remain.
