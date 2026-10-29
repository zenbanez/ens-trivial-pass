# DecisionJudge (D-016)

A System-One-style decision harness: a pseudo-System-One in Jev's interface
shape, run on a local model. It is not a System One model, and nothing that
shows its output should call it one.

It makes **judgments**: three yes/no questions with probabilities, asked
about a claim, its quote and its learner. **Code** decides what they mean.
It is advisory: it flags things for the teacher's attention, and it never
admits, rejects, signs or blocks a claim. Deterministic verification stays
primary.

| File | What it holds |
|---|---|
| `questions.mjs` | The three questions, the 0.7/0.3 bands, `judgeState()`, and `route()`, the decision layer that maps every combination of answers to advisory flags |
| `decision-judge.mjs` | `createJudge(adapter, { mode })` → `decide(state, questions)`: validation, normalization that is recorded when applied, at most two corrective retries, then `uncertain`, and the attempt history |
| `adapters/glimmer.mjs` | The local adapter: Ollama, `think:false`, temperature 0, a strict JSON schema, capped output. Plus the Jev slot, which refuses until D-010 wires it |
| `calibrate.mjs` | The calibration runner: agreement, unsettled and failed counts, honesty by stated probability, and Brier score, against `fixtures/judge-calibration.mjs` |

```bash
node judge/calibrate.mjs together    # or: separate (one question per call)
```

That command runs the local model on this machine (`OLLAMA_BASE_URL`,
`OLLAMA_JUDGE_MODEL`, which falls back to `OLLAMA_MODEL`, then
`muse-glimmer`), and prints the report as JSON. Its probabilities are
**self-reported, uncalibrated model signal**. Show them with that label
until a calibration report exists, and only claim what the report measures:
12 synthetic cases, 36 judgments.

For integration (the lead's part): call `decide(judgeState(...), QUESTIONS)`
per proposed claim, show `route(answers)` on the claim card and in the
console's verification band, and put `judge` (adapter, model, locus) in the
judgment crumb.
