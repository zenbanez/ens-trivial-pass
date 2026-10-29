# Demo Storyboard — 3:00 exactly

Shot-by-shot board for filming `ens-trivial-pass` @ `74e74a9` (UI as
redecorated). Sources: zen4's D-005 script (ZenOS WS-0058), the
Cloud-Claude suggestion's frame and pitch line, Sol's narrative spine.
Rule for every frame: **the screen only claims what the code does** —
Subok's probes (D-004, rounds 1–3) are the fact-check for this board.

**Title (pre-roll, not counted):** *The Trivial Pass, Made Real* ·
github.com/zenbanez/ens-trivial-pass · Apache 2.0 · **ALL LEARNERS ARE
SYNTHETIC**

## The board

| # | Time | Screen (what the camera sees) | Narration (VO) | On-screen text | Earns |
|---|---|---|---|---|---|
| 1 | 0:00–0:12 | The debrief panel. The synthetic sample debrief sits in the editor; Amara, Ben, Cora labelled SYNTHETIC. Slow scroll. | "A teacher ends her day with a notebook of things she noticed about her learners. By the next lesson, most of it is gone." | A teacher's observation should not silently become a child's label. | Impact |
| 2 | 0:12–0:20 | Step 2. Gates 1–8 tick past as the grid fills — quick, almost dismissive. | "So we built the channel that turns that debrief into structured sightings — and then we made it pass a test first." | The Nine Gates | Demo |
| 3 | 0:20–0:38 | Gate 9 card. **Hosted API** selected. Conditions 1, 2, 4 FAIL. The full-width rust disposition lands: **HELD**. Cursor tries the disabled Run button. | "Gate 9 asks one question: where does extraction run? A hosted API means per-learner sightings about named children cross to someone else's machine. The channel is held — and the refusal is enforced by the server, not by a grey button." | **HELD. The refusal is the product.** | Technical, Demo |
| 4 | 0:38–0:52 | Select **Declared local locus**. The walk completes; green disposition: *admitted on specification, not on evidence*, condition 6 marked outstanding. | "Declare where processing runs — this machine, a named local model — and the channel is admitted. On specification. Not on evidence. The demo says the exact words, because shortening them would be a lie." | Admitted on specification, not on evidence. | Depth |
| 5 | 0:52–1:22 | Run extraction. (Glimmer runs at ~1.6 tok/s on this hardware: film this beat pre-run, or at 20× with the honesty caption at right.) Sightings land beside the debrief, quotes in blockquotes. | "A Meta open model — Muse Glimmer, running on this machine's own GPUs — extracts sightings. Each one must quote the debrief verbatim, and name the learner it is about. Code checks that. The extractor proposes; code disposes." | Muse Glimmer · on-device · extraction 4m55s, shown at 20× | Meta tooling, open weights |
| 6 | 1:22–1:38 | One sighting is rejected on screen (contingency below): red reject note, `ens.evidence.reject` crumb appears in the trail. | "And when a sighting's quote doesn't check out — wrong learner, not in the text — code rejects it, and the rejection itself is recorded. A model that misattributes cannot quietly mint a claim about the wrong child." | The extractor proposes. Code disposes. | Technical |
| 7 | 1:38–1:58 | Twin panel. Three claims in the **Proposed** lane. Teacher signs one off; it moves to the Twin with its sign-off crumb. One claim stays proposed. | "Claims don't enter the Twin because a model said so. A teacher signs — one click, one crumb — and the unsigned claim stays exactly where it is. Admission is a stewardship act." | The model proposes. The teacher decides. | Agentic, Impact |
| 8 | 1:58–2:16 | Teacher contests a signed claim (eyes-open confirmation shown). Drag the decay slider: the confidence meter visibly shrinks. | "Contesting marks a claim. It never deletes it. And confidence decays at read time — drag the age, watch it fall. Staleness you can see." | Contesting marks. It never deletes. | Depth |
| 9 | 2:16–2:40 | Click a claim card: its crumb chain lights up down the timeline — assert, sign-off, contest — with `sha256(quote)` and `sha256(statement)` visible. Scroll to the root gate crumb. | "Every claim walks back to its sighting, its extraction, and the gate decision that allowed it to exist. Change one byte of the evidence and the hash no longer matches. The trail is not a log. It is the audit." | Walk any claim back to its evidence. | Technical |
| 10 | 2:40–2:52 | Quick beat: switch the model off (stop Ollama / stub label on screen), run the same flow by hand — same sign-off, same trail. | "Switch the model off and the workflow still works. The AI speeds up the teacher. It is never load-bearing." | The AI is never load-bearing. | Impact, Depth |
| 11 | 2:52–3:00 | Return to the title card. Repo URL, Apache 2.0, and the disclosure line. | "The design existed before this hackathon. Everything you just saw run was built during it — by one human and a team of AI agents, with every claim in this video independently probed. ENS. The model proposes. The teacher decides." | github.com/zenbanez/ens-trivial-pass · design: previous work · code: built Oct 27–Nov 4 | New-work rule, Demo |

## Production notes

- **Narration budget:** ~390 words at a calm pace. If a beat runs long,
  cut beat 10 first (say the line over beat 9's tail), never beat 3.
- **Beat 5 timing honesty:** Glimmer measured 295s for three sightings
  on the steward's hardware. Film it pre-run or sped, and keep the
  `shown at 20×` caption. Never let editing imply it is instant.
- **Beat 6 contingency:** a rejection needs an extractor mistake. The
  deterministic way to film it: temporarily run the local extraction
  against a debrief edited *after* extraction (stale quotes reject
  verbatim), or use Subok's probe fixtures. Do not fake the UI state.
- **Beat 3's server refusal:** the page's Run button is disabled on
  Hosted; to *show* enforcement, cut in a 2-second terminal shot of the
  direct POST returning `403` (probe-verified behavior), as the lead's
  PR #318 review suggested.
- **No real children, no real data, ever.** Every learner on screen is
  a synthetic persona; the banner stays visible in frame 1.
- **Claims discipline:** if a frame and the code disagree on the day,
  the frame is re-shot, not the code described differently.

## What this board deliberately does not show

- ENS011 route generation (not built in this slice).
- Voice capture (typed debrief only in this build).
- Any DepEd, legal, or educational-validity claim. ENS remains
  candidate research under governed validation (see DISCLOSURE.md).
