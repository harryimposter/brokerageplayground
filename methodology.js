/* ============================================================================
   Brokerage Playground — CONSOLIDATED METHODOLOGY  (single source of truth)
   ----------------------------------------------------------------------------
   ONE authoritative, watertight description of how the desk scores ideas and
   maps them to clients. Designed to NOT drift: every number is read LIVE from the
   actual engines at call time —

     • client-fit weights / pegs / thresholds  ← window.MAPPING.PARAMS
     • the four fit axes + their labels         ← window.MAPPING.AXES
     • goal-derivation coefficients             ← window.GOALS.PARAMS / GOALS3
     • the conviction rubric (both models)      ← window.TODAY_FOCUS.convictionRubric

   So the prose can never disagree with the code: if a weight or a comfort limit
   changes (including a live advisor override of a comfort cap), this doc reflects
   it the next time it's read. The legacy MAPPING_METHODOLOGY.md / METHODOLOGY.html
   / GOAL_DERIVATION.html are human-readable snapshots; THIS file is what the Morgan
   AI assistant reads, and is the canonical reference.

   Exposes window.METHODOLOGY with:
     consts()                 -> a live snapshot of every constant used below
     topicFor(msg)            -> a methodology-topic key for a question, or null
     answer(msg)              -> composed HTML for a methodology question, or null
     section(key)             -> composed HTML for one topic (fit/comfort/goals/
                                 conviction/tradability/tailoring/gapVsComfort/overview)
   Pure read-only over the live engines. No state, no side effects.
   ========================================================================== */
(function () {
  "use strict";

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const f2 = (n) => (Math.round(n * 100) / 100).toFixed(2);   // 0.294… -> "0.29"

  /* ---- live constant snapshot (read at call time, never cached) ---- */
  function consts() {
    const M = window.MAPPING, G = window.GOALS, TF = window.TODAY_FOCUS || {};
    const P = (M && M.PARAMS) || {};
    const A = P.affinity || {};
    return {
      ok: !!(M && G),
      weights: P.weights || {},
      axes: (M && M.AXES) || [],
      comfort: A.comfortByBucket || {},
      sectorComfort: A.sectorComfort || {},
      lambda: A.lambda, penaltyPerPp: A.penaltyPerPp, penaltyCap: A.penaltyCap,
      flagMin: P.flagMin, flagMax: P.flagMax, applyMin: P.applyMin,
      tierStrong: P.tierStrong, tierGood: P.tierGood,
      goalParams: (G && G.PARAMS) || {},
      goals3: (G && G.GOALS3) || [],
      rubric: TF.convictionRubric || {}
    };
  }

  /* =====================================================================
     1 · CLIENT-FIT — "how RIGHT is this idea for THIS client"
     ===================================================================== */
  function sectionFit() {
    const c = consts();
    if (!c.ok) return `<p>The fit engine isn't loaded yet.</p>`;
    const W = c.weights;
    const rows = c.axes.map(a => {
      const note = AXIS_PROSE[a.key] || "";
      return `<li><b>${esc(a.label)}</b> <span class="m-w">× ${f2(W[a.key] || 0)}</span> — ${note}</li>`;
    }).join("");
    return `Each idea is scored against every client on <b>four transparent axes</b>, each 0–100, combined with <b>flat (fixed) weights</b> that sum to 1.00. The weighted sum is the <b>client-fit score</b> — distinct from the idea's own conviction.
<ul class="m-list">${rows}</ul>
<b>Global tradability gate (binary, applied last):</b> Final client-fit = <b>Tradability × Σ(axis × weight)</b>. Tradability is a MiFID check on the idea's <i>natural expression</i> — a Retail client and an OTC derivative (collar, forward, OTC option) → <b>0</b>, so fit = 0 and the idea is <b>suppressed</b> for that client (surfaced with the reason, never silently dropped). A Professional, or a non-complex / structured-note expression → 1, and the weighted sum passes straight through.<br><br>
<b>Goal-alignment multiplier:</b> the bracketed sum is then nudged by a bounded <b>0.85–1.15</b> multiplier (1 + gap/200, where gap = the client's derived goal for the idea's bucket minus their current allocation to it) — boosting ideas that fill a bucket the client is <i>under</i> on, trimming those piling into a bucket already over goal.<br><br>
<b>Tiers & gates:</b> fit ≥ <b>${c.tierStrong}</b> Strong · ≥ <b>${c.tierGood}</b> Good · else Marginal. An idea “applies” when tradable and the pre-gate sum ≥ <b>${c.applyMin}</b> (applyMin); Today's Focus <b>flags</b> a client at fit ≥ <b>${c.flagMin}</b> (flagMin), top ${c.flagMax}.<br><br>
<span class="m-note">One engine — <code>MAPPING.scoreIdeaForClient</code> — powers Today's Focus, the Advisor Book, Solutions Views, pre-trade and this assistant, so every surface agrees.</span>`;
  }
  const AXIS_PROSE = {
    gap: "headroom in the idea's <b>goal bucket</b> (Growth / Income / Preservation): (bucketTarget − bucketCurrent) / bucketTarget × 100, against the client's <i>derived</i> goal vector. Zero once that bucket is at/over target. (FX ideas use the currency-mismatch % instead.)",
    holdings: "Affinity fit = max(0, thematic affinity − concentration penalty). Affinity is a recency-weighted (λ=0.94) percentile of the current sector allocation within the book's 24-month sector history; the penalty is (current − comfort-limit) × 10 (capped 100) when the book is over the comfort cap.",
    mandate: "0.6 × Risk Suitability + 0.4 × Intent Fit. Risk Suitability matches the idea's vol/beta/structure to the mandate (scored on the best <i>tradable</i> implementation, so suitability shapes the structure, not a ban); Intent Fit matches the idea's goal type (appreciation/yield/protection) to the mandate's goal.",
    concSector: "Herfindahl diversification of the book's holdings inside the idea's sector, (1 − HHI) × 100 — inverted for fit by default, so a more concentrated sector position scores higher (a new name diversifies it)."
  };

  /* =====================================================================
     2 · COMFORT / CONCENTRATION LIMITS
     ===================================================================== */
  function sectionComfort() {
    const c = consts();
    if (!c.ok) return `<p>The fit engine isn't loaded yet.</p>`;
    const rows = Object.keys(c.comfort).map(k => `<li><b>${esc(k)}</b> — ${c.comfort[k]}% of book</li>`).join("");
    const ov = Object.keys(c.sectorComfort);
    const ovTxt = ov.length
      ? `<br>Per-sector overrides currently set: ${ov.map(s => `<b>${esc(s)}</b> ${c.sectorComfort[s]}%`).join(", ")} (a sector override wins over its bucket cap).`
      : `<br>No per-sector overrides are set, so the bucket cap applies to every sector in that bucket.`;
    return `The <b>comfort limit</b> is the maximum single-sector exposure <b>you</b> (the advisor) are comfortable with, keyed off the <b>asset's goal bucket</b> (gold → Preservation, tech → Growth, energy majors → Income…), not the client's mandate — so gold is judged against the Preservation cap for every client alike. Current limits:
<ul class="m-list">${rows}</ul>${ovTxt}<br><br>
It feeds the <b>Affinity-fit penalty</b>: a book running over the cap for an idea's sector is penalised (overshoot in pp × ${c.penaltyPerPp}, capped ${c.penaltyCap}), and it sets the Gap-fit fallback peg when a client has no goal target for the bucket.<br><br>
These limits are <b>editable</b> (in “How scoring works”) and persisted; every fit recomputes live when you change them. A changed cap shows an <b>“overridden · default …%”</b> badge so it's clear it differs from the house default. They are <b>your</b> limits — distinct from each client's goal target (see the gap-vs-comfort flag).`;
  }

  /* =====================================================================
     3 · GOAL DERIVATION (the 3-bucket goal vector)
     ===================================================================== */
  function sectionGoals() {
    const c = consts();
    if (!c.ok) return `<p>The goal engine isn't loaded yet.</p>`;
    const gp = c.goalParams;
    const names = c.goals3.map(g => g.name).join(" · ") || "Growth · Income · Preservation";
    return `Real clients don't hand you a target split — they say “grow capital”, “I have a $19m mortgage”, “I need $0.8m/yr”. So the goal is <b>inferred</b> from <b>both sides of the balance sheet</b> plus revealed risk appetite, into three buckets: <b>${esc(names)}</b> (liability-driven / goals-based, à la Chhabra's risk-allocation).
<ol class="m-list">
<li><b>Fund the floor first</b> — obligations aren't preferences: near-term bills + debt + a concentrated single name → <b>Preservation</b>; spending draw + debt servicing + debt-matching → <b>Income</b>.</li>
<li><b>Deploy the surplus</b> by how hard the money must work: required return (from the funding goal) + horizon + <b>willingness</b> → <b>Growth</b>.</li>
<li><b>Normalise</b> the three raw scores to 100% (largest-remainder rounding).</li>
</ol>
<b>Willingness</b> blends <i>stated</i> (parsed from the free-text <code>risk</code> string) and <i>revealed</i> (read off the live book: risk-asset share ${gp.revealRiskW != null ? `(weight ${gp.revealRiskW})` : ""}, how little is parked in safety, single-name concentration appetite). It is <b>bidirectional</b> — a low appetite adds ballast to Preservation/Income, it doesn't merely shrink Growth. When the client states no hard goal, the required-return term goes silent and the model leans harder on willingness (and lowers its confidence).<br><br>
<b>Anti-circularity:</b> the book sets the willingness <i>knob</i> (a scalar), not the target vector — the target is still built by the bucket logic, so the gap between “have” and “need” stays meaningful. Every coefficient (baseline ${gp.base != null ? `<b>${gp.base}</b>` : "—"}, the income/return/caution weights, the ${gp.serviceRate != null ? `${(gp.serviceRate * 100).toFixed(0)}% assumed debt-service rate` : "service rate"}, …) lives in <code>GOALS.PARAMS</code>; every input is a measured quantity off the client's assets, liabilities and stated risk. A manual <code>goalOverride</code> pins the vector and short-circuits the model.`;
  }

  /* =====================================================================
     4 · CONVICTION — "how GOOD is the idea" (two rubrics, read live)
     ===================================================================== */
  function rubricHTML(R) {
    if (!R) return "";
    const pills = (R.pillars || []).map(p => `<li><b>${esc(p.label)}</b> <span class="m-w">max ${p.max}</span> — ${esc(p.desc)}</li>`).join("");
    return `<div class="m-rub"><b>${esc(R.title)}</b><br><span class="m-note">${esc(R.blurb)}</span>
<ul class="m-list">${pills}</ul>${R.bandsNote ? `<span class="m-note">${esc(R.bandsNote)}</span>` : ""}</div>`;
  }
  function sectionConviction() {
    const c = consts();
    const R = c.rubric || {};
    if (!R.earnings && !R.exEarnings) return `<p>The conviction rubric isn't loaded yet.</p>`;
    return `Conviction (“how good is the idea”, separate from client-fit) uses <b>one of two rubrics</b>, picked by idea type. Each pillar carries a data-quality tag (<i>sourced / estimated / unverified</i>); if any core input is estimated or unverified, the label is <b>capped at Medium</b>. The view drives; technicals confirm.<br><br>
<b>Earnings ideas — print rubric</b>${rubricHTML(R.earnings)}
<b>Ex-earnings ideas — seven-pillar model</b>${rubricHTML(R.exEarnings)}
<span class="m-note">Pre-print ideas are scored on a dated, unpriced catalyst; post-print ideas on a reaction disproportionate to print quality. Tactical ideas only surface once their level/trigger is live. Every idea also carries a <code>changeMyMind</code> — the condition that would break the thesis — shown but not scored.</span>`;
  }

  /* =====================================================================
     5 · TRADABILITY / MiFID
     ===================================================================== */
  function sectionTradability() {
    return `Under MiFID, the engine runs a <b>binary tradability gate</b> on the idea's <i>natural expression</i> before anything else:
<ul class="m-list">
<li><b>OTC derivatives</b> — collars, risk-reversals, forwards, OTC options, accumulators, prepaid variable forwards — a <b>Retail</b> client <b>cannot</b> trade them without Professional re-classification.</li>
<li><b>Structured notes</b> — autocalls, buffered, capital-protected, reverse convertibles, range-accrual notes — are <b>packaged securities</b> a Retail client <b>can</b> hold (complex, so appropriateness still applies, but not OTC).</li>
<li><b>Professional</b> clients can trade any expression.</li>
</ul>
If the natural expression is blocked, Tradability = 0 → fit = 0 and the idea is <b>suppressed</b> for that client, surfaced with the reason (“Not tradable — …”) and a non-complex / structured-note alternative. Suitability otherwise drives the <b>implementation</b> (the best tradable structure for the mandate), not a ban.`;
  }

  /* =====================================================================
     6 · PER-CLIENT TAILORING (best suitable implementation)
     ===================================================================== */
  function sectionTailoring() {
    return `For each client the engine picks the <b>best suitable, tradable implementation</b> of an idea — not just whether it fits. Among the idea's structures the client can actually trade (MiFID gate), it scores each against the client's mandate profile (income structure for an income book, directional for growth, protected for preservation) using the shared per-expression knowledge base (<code>EXPRESSIONS.implFit</code>) and tags the winner (“Best for {client}: …”). That chosen implementation also feeds the Mandate &amp; Risk axis, so the suitability score, the per-client tag and the recommendation all agree.`;
  }

  /* =====================================================================
     7 · GAP-vs-COMFORT tri-color flag
     ===================================================================== */
  function sectionGapVsComfort() {
    return `Two different things are checked side by side for the idea's bucket/sector:
<ul class="m-list">
<li><b>Goal gap</b> — is the client <i>under</i> their derived strategic target for the idea's bucket? (room to add)</li>
<li><b>Comfort limit</b> — is the book <i>over</i> <b>your</b> single-sector concentration cap for the idea's sector?</li>
</ul>
The flag colour: <b>red</b> when both conditions hold (over the client's goal target <i>and</i> over your comfort cap — trim, don't add); <b>amber</b> when exactly one holds (e.g. fills the goal gap but is over your comfort cap — “recommend, but flagged for your call”); <b>no warning</b> when neither holds (clean to recommend). It reads the same values the engine scores (derived goal, current buckets, sector exposure, comfort peg) — wording only, no extra math.`;
  }

  function sectionOverview() {
    return `Two independent scores drive everything:
<ul class="m-list">
<li><b>Conviction</b> — how good the idea is, on its own (the print or seven-pillar rubric). Ask “what's the conviction rubric?”.</li>
<li><b>Client-fit</b> — how right it is for a specific book (four weighted axes × a MiFID gate × a goal-alignment multiplier). Ask “how is fit scored?”.</li>
</ul>
Around those sit the <b>comfort limits</b> (your concentration caps), <b>goal derivation</b> (the 3-bucket target inferred from each balance sheet), <b>per-client tailoring</b> (the best tradable structure) and the <b>gap-vs-comfort</b> flag. Ask me about any of them.`;
  }

  const SECTIONS = {
    fit: sectionFit, comfort: sectionComfort, goals: sectionGoals,
    conviction: sectionConviction, tradability: sectionTradability,
    tailoring: sectionTailoring, gapVsComfort: sectionGapVsComfort, overview: sectionOverview
  };
  function section(key) { return (SECTIONS[key] || sectionOverview)(); }

  /* ---- topic detection for methodology questions ---- */
  const has = (m, words) => words.some(w => m.includes(w));
  function topicFor(msg) {
    const m = " " + String(msg || "").toLowerCase() + " ";
    // conviction rubric
    if (has(m, ["conviction", "rubric", "pillar", "how good is the idea", "how is the idea scored", "how do you score the idea", "print rubric", "seven-pillar", "7-pillar"])) return "conviction";
    // comfort limits
    if (has(m, ["comfort limit", "comfort cap", "concentration limit", "concentration cap", "single-sector", "single sector", "how is the comfort", "your limit", "comfort / concentration"])) return "comfort";
    // goal derivation
    if (has(m, ["derive goal", "derive a client", "deriving goal", "how do you derive", "infer goal", "goal derivation", "how are goals", "how is the goal", "where do goals", "3-bucket", "three bucket", "goal vector", "willingness"])) return "goals";
    // tradability / mifid
    if (has(m, ["tradability", "mifid", "otc", "appropriate", "suppress", "why can't", "why cant", "complex product", "retail trade", "professional trade"])) return "tradability";
    // tailoring / best implementation
    if (has(m, ["best implementation", "best structure", "best expression", "tailor", "which structure", "implementation for", "best for the client", "pick the structure"])) return "tailoring";
    // gap vs comfort flag
    if (has(m, ["gap-vs-comfort", "gap vs comfort", "tri-color", "tri color", "amber", "red flag", "flag colour", "flag color", "gap versus comfort"])) return "gapVsComfort";
    // client-fit scoring (broad — last so the more specific topics win first)
    if (has(m, ["how is fit", "how is the fit", "fit scored", "how do you score fit", "fit engine", "how is suitab", "suitability calc", "how do you score", "how does scoring", "how is the score", "how are ideas scored", "how do you rank", "how are ideas ranked", "scoring work", "four axes", "4 axes", "how do you decide", "weighted sum", "client-fit", "client fit"])) return "fit";
    // generic "how does it work / methodology"
    if (has(m, ["methodology", "how does this work", "how does it work", "how do you work", "how does morgan", "explain the model", "what's the method", "how is this built"])) return "overview";
    return null;
  }

  function answer(msg) {
    const t = topicFor(msg);
    return t ? section(t) : null;
  }

  window.METHODOLOGY = { consts, topicFor, answer, section };
})();
