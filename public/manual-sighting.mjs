// D-015: manual (model-off) sighting entry.
//
// A teacher can record a sighting by hand with no model running at all. It is
// not the automated extraction path — it is the teacher's own observation, so
// it uses a *different* verification posture than model-produced sightings:
//
//   model-produced: the quote must be VERBATIM in the debrief (code disposes of
//                   the extractor's proposal), the learner whitelisted, >= 20 chars.
//   teacher-entered: the learner is whitelisted and the observation is
//                   SUBSTANTIVE (>= MIN_OBSERVATION_CHARS). There is no
//                   verbatim-in-debrief check, because the text is the
//                   teacher's own words, not a model's quote of the debrief.
//
// Everything downstream (claim proposal, teacher sign-off, contest, warrant
// crumb) is shared with the automated path; only the verification posture and
// the label differ. No model (Ollama, Meta, or stub) is called for this path.
//
// Exported as a real ES module so the node test suite can import it, and
// self-attached to `window` so the classic app.js script can call it at
// event time (the module is deferred and has loaded by then).

export const MANUAL_EXTRACTOR_LABEL = 'teacher (manual, model off)';
export const MANUAL_MATCH_KIND = 'teacher-entered';
export const MIN_OBSERVATION_CHARS = 10;

/**
 * Verify manually-entered sightings under the teacher-authored posture.
 *
 * @param {Array<{learner?: string, observation?: string}>} entries
 * @param {string[] | Set<string>} allowedLearners
 * @returns {{ ok: Array<object>, rejected: Array<object> }}
 *   ok items are shaped to the same `sighting` shape the pipeline already
 *   consumes (learner, quote, observation, match, extractor, source), so the
 *   existing claimFrom / crumb / CLAIMS flow reuses them unchanged.
 */
export function verifyManualSighting(entries, allowedLearners) {
  const allowed = allowedLearners instanceof Set ? allowedLearners : new Set(allowedLearners || []);
  const ok = [];
  const rejected = [];
  for (const e of entries || []) {
    const obs = String(e?.observation ?? '').trim();
    // Learner must be one of the known synthetic learners — same whitelist as
    // the automated path. Teacher-authored evidence still must not name a
    // learner the demo does not track.
    if (!e || !allowed.has(e.learner)) {
      rejected.push({ learner: e?.learner, observation: obs, reason: 'unknown learner' });
      continue;
    }
    // Teacher-authored posture: substantive, but NOT verbatim-in-debrief.
    if (obs.length < MIN_OBSERVATION_CHARS) {
      rejected.push({ learner: e.learner, observation: obs, reason: 'observation under ' + MIN_OBSERVATION_CHARS + ' characters' });
      continue;
    }
    ok.push({
      learner: e.learner,
      quote: obs,
      observation: obs,
      match: MANUAL_MATCH_KIND,
      extractor: MANUAL_EXTRACTOR_LABEL,
      source: 'manual',
    });
  }
  return { ok, rejected };
}

// Browser: expose to the classic app.js script. No-op under node (guarded).
if (typeof window !== 'undefined') {
  window.ensManual = {
    verifyManualSighting,
    MANUAL_EXTRACTOR_LABEL,
    MANUAL_MATCH_KIND,
    MIN_OBSERVATION_CHARS,
  };
}
