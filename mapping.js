/* ============================================================================
   Brokerage Playground — UNIFIED idea → client fit engine
   ----------------------------------------------------------------------------
   ONE intent-aware scorer. Replaces the old pair of engines (this file's 5-axis
   engine + scanner.js `ideaFit`), which used different math and disagreed.

   FOUR transparent axes, each 0–100 with a plain-English note, combined with FLAT
   (fixed) weights. The weighted sum is the client-FIT score (how RIGHT the idea is
   for THIS client — separate from the idea's own conviction). The axes:

     • GAP FIT — headroom from the book's current sector allocation up to the
       strategic peg: (target − current)/target. Shares ONE peg with Affinity.
     • AFFINITY FIT — recency-weighted (λ=0.94, 24-mo) sector affinity minus an
       over-the-peg concentration penalty.
     • MANDATE & RISK — 0.6·RiskSuitability + 0.4·IntentFit: does the idea's vol/beta/
       structure and goal type suit the mandate? (Tradability is no longer here.)
     • CONCENTRATION WITHIN SECTOR — (1 − Herfindahl)×100 over the book's in-sector
       holdings; inverted for fit by default (a concentrated sector wants a new name).

   HOUSE-VIEW FIT is NOT a client-fit axis — it is an idea-level property, so it lives
   in the CONVICTION score (its 4th pillar, build_today_focus.py), not here. It was
   removed from client-fit to stop double-counting holdings already captured by Affinity
   and Gap fit. The four weights below are the original five rescaled by 1/0.85.

   A GLOBAL TRADABILITY GATE (binary, MiFID) multiplies the whole weighted sum:
   Final Client-Fit = Tradability × Σ(axisᵢ·weightᵢ). If the client can't trade the
   idea's natural expression, fit = 0 and the idea is suppressed for that client
   (surfaced with the reason, not silently dropped).

   Reads the real data — `client.risk`, `client.sectorHistory`, positions — over ONE
   reconciled book (`split ≡ Σ positions`). Strategic pegs are a single source of
   truth (PARAMS.affinity.comfort via sectorPeg). Pure functions over window.SEED +
   window.Scanner. Exposed as window.MAPPING; scanner.js delegates its fit here.
   ========================================================================== */
(function () {
  "use strict";
  const S = () => window.SEED;
  const round = (n) => Math.round(n * 10) / 10;
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  /* smooth 0..1 ramp: 0 at x<=lo, 1 at x>=hi, linear between (kills cliffs) */
  const ramp = (x, lo, hi) => x <= lo ? 0 : x >= hi ? 1 : (x - lo) / (hi - lo);

  /* the four client-fit axes, in display order (House-view fit moved to conviction) */
  const AXES = [
    { key: "gap",        label: "Gap fit" },                    // headroom from current sector alloc up to the strategic peg
    { key: "holdings",   label: "Affinity fit" },               // recency-weighted sector affinity − over-limit penalty
    { key: "mandate",    label: "Mandate & risk" },             // 0.6·RiskSuitability + 0.4·IntentFit
    { key: "concSector", label: "Concentration within sector" } // (1 − Herfindahl) × 100, inverted for fit by default
  ];

  /* ------------------------------------------------------------------ tunables
     Every magic number lives here so the model is visible and calibratable. */
  const PARAMS = {
    /* FLAT axis weights — fixed per axis. The original five (0.25/0.20/0.25/0.15/0.15)
       with House-view (0.15) removed, the remaining four rescaled by 1/0.85 so they keep
       their relative balance and sum to EXACTLY 1.00. EXACT fractions are used in the math
       (not the rounded display values 0.29 / 0.29 / 0.24 / 0.18 shown in the UI). */
    weights: {
      holdings:   0.25 / 0.85,   // 0.294117…  (shown 0.29)
      gap:        0.20 / 0.85,   // 0.235294…  (shown 0.24)
      mandate:    0.25 / 0.85,   // 0.294117…  (shown 0.29)
      concSector: 0.15 / 0.85    // 0.176470…  (shown 0.18)
    },
    /* Affinity-fit axis: max(0, thematicAffinity − concentrationPenalty). The
       `comfort` pegs are the SINGLE source of truth, shared with Gap fit (sectorPeg). */
    affinity: {
      lambda: 0.94,                                          // month t weight = 0.94^t
      comfort: { growth: 25, income: 15, preservation: 10 }, // per-mandate sector comfort limit (% of book)
      sectorComfort: {},                                     // optional per-sector overrides, e.g. { Gold: 12 } — tunable
      penaltyPerPp: 10, penaltyCap: 100                      // overshoot (pp over comfort) × 10, capped at 100
    },
    /* Concentration-within-sector axis: (1 − HHI) × 100 over in-sector holdings.
       invertForFit=true ⇒ a more CONCENTRATED sector position scores HIGHER fit
       (a new name diversifies it). Flip to false to reward diversified books. */
    concWithinSector: { invertForFit: true, noHoldingScore: 50 },
    applyMin: 45,                     // fit floor for "applies" (Views / draft preview)
    flagMin: 50, flagMax: 6,          // Today's Focus flagging
    tierStrong: 66, tierGood: 48
  };

  /* ---- small lookups ---- */
  function tickerRoot(p) { return String(p.ticker || "").split(" ")[0]; }
  function bucketName(key) {
    const b = (S().GOAL_BUCKETS || []).find(x => x.key === key);
    return b ? (b.name || b.key) : key;
  }
  /* (themeName / themeSectors removed with the House-view client-fit axis — house-view
     fit is now a conviction pillar, not a per-client signal.) */

  /* ---- intent (explicit, with a derived fallback) ---- */
  function ideaIntent(idea) { return idea.intent || defaultIntent(idea); }
  function defaultIntent(idea) {
    const b = idea.bucket;
    if (b === "Preservation") return "protect";
    if (b === "Income") return "income";
    if (b === "Structured") {
      const txt = ((idea.structures || []).join(" ") + " " + (idea.title || idea.name || "")).toLowerCase();
      return /buffer|protect|collar|capital.protected/.test(txt) ? "protect" : "income";
    }
    return "add"; // Growth / default
  }

  /* ---- client risk profile, from the explicit free-text `risk` string ----
     Parsed to {level, tilt}; falls back to target-derived tilt only when the
     string is unparseable. The OLD engine ignored `risk` entirely. */
  function tiltFromTargets(client) {
    const t = client.goals.target || {};
    const growth = (t.Growth || 0) + (t.Structured || 0);
    if (growth >= 58) return { level: "growth", tilt: "growth" };
    if ((t.Income || 0) >= 35) return { level: "moderate", tilt: "income" };
    if ((t.Preservation || 0) >= 25) return { level: "conservative", tilt: "preservation" };
    return { level: "moderate", tilt: "balanced" };
  }
  function riskProfile(client) {
    const r = String(client.risk || "").toLowerCase();
    let level = null, tilt = null;
    if (/aggressive/.test(r)) level = "aggressive";
    else if (/growth/.test(r)) level = "growth";
    else if (/moderate|balanced/.test(r)) level = "moderate";
    else if (/conservative|cautious|preservation|income/.test(r)) level = "conservative";
    if (/income/.test(r)) tilt = "income";
    else if (/conservative|preservation|protect/.test(r)) tilt = "preservation";
    else if (/aggressive|growth/.test(r)) tilt = "growth";
    else if (/moderate|balanced|value/.test(r)) tilt = "balanced";
    if (!level || !tilt) { const d = tiltFromTargets(client); level = level || d.level; tilt = tilt || d.tilt; }
    return { level, tilt, raw: (client.risk || "").trim() };
  }
  function tiltOf(client) { return riskProfile(client).tilt; } // back-compat export

  /* mandate class for the Affinity-fit comfort peg: growth | income | preservation.
     Derived from the parsed risk profile (explicit `risk` string first). */
  function mandateClass(client) {
    const rp = riskProfile(client);
    if (rp.tilt === "income") return "income";
    if (rp.tilt === "preservation" || rp.level === "conservative") return "preservation";
    if (rp.tilt === "growth" || rp.level === "growth" || rp.level === "aggressive") return "growth";
    return "income"; // moderate / balanced → middle peg
  }

  /* THE STRATEGIC SECTOR PEG — SINGLE SOURCE OF TRUTH.
     One constant (PARAMS.affinity.comfort by mandate, + optional per-sector
     overrides in PARAMS.affinity.sectorComfort) read by BOTH the Gap-fit axis
     (rewards headroom toward it) and the Affinity penalty (punishes overshoot
     beyond it). There is no second copy. */
  function sectorPeg(client, sector) {
    const A = PARAMS.affinity;
    return (A.sectorComfort[sector] != null) ? A.sectorComfort[sector] : A.comfort[mandateClass(client)];
  }

  /* ---- idea risk descriptors (explicit field on the idea, else derived) ----
     Used by the Mandate & Risk axis. Backfill = sensible derivation when the
     idea doesn't carry an explicit field. */
  function naturalExpression(idea) {                 // the idea's primary structure
    return idea.naturalExpression || (idea.structures && idea.structures[0]) || "Direct equity";
  }
  function goalTypeOf(idea) {                         // appreciation | yield | protection
    if (idea.goalType) return idea.goalType;
    const b = idea.bucket;
    const txt = ((idea.structures || []).join(" ") + " " + (idea.title || idea.name || "") + " " + (idea.headline || "")).toLowerCase();
    if (b === "Preservation") return "protection";
    if (b === "Income" || b === "Liquidity") return "yield";
    if (b === "Structured") {
      if (/buffer|protect|collar|capital.protected|principal/.test(txt)) return "protection";
      if (/autocall|coupon|reverse convertible|range accrual|dividend|phoenix|income/.test(txt)) return "yield";
      return "appreciation";
    }
    return "appreciation"; // Growth / default
  }
  const HIGH_BETA_SECTORS = ["Technology", "Crypto", "Materials", "Energy", "Industrials", "Consumer"];
  const LOW_BETA_SECTORS  = ["Utilities", "Gold", "Rates", "Credit", "Infrastructure", "Real Estate", "FX"];
  function riskProfileOf(idea) {                      // {vol, beta, structured}
    if (idea.riskProfile) return idea.riskProfile;
    const structured = idea.assetClass === "Structured" || (idea.structures || []).some(s => S().isStructuredProduct && S().isStructuredProduct(s));
    const goal = goalTypeOf(idea);
    let beta = HIGH_BETA_SECTORS.includes(idea.sector) ? "high" : LOW_BETA_SECTORS.includes(idea.sector) ? "low" : "moderate";
    let vol;
    if (structured && goal === "protection") { vol = "low"; beta = "low"; }
    else if (idea.bucket === "Preservation") vol = "moderate";          // gold etc: low beta but can be volatile
    else if (idea.bucket === "Income") vol = beta === "high" ? "moderate" : "low";
    else vol = beta === "high" ? "high" : beta === "low" ? "low" : "moderate";
    return { vol, beta, structured };
  }

  /* Risk Suitability (0–100 + reason): the idea's vol/beta/structure vs the mandate. */
  function riskSuitability(mandate, rp) {
    const hi = rp.beta === "high" || rp.vol === "high";
    const lo = rp.vol === "low";
    const protectedNote = rp.structured && rp.vol === "low";
    if (mandate === "growth") {
      if (hi) return { score: 92, reason: "high-beta / high-vol matches a growth appetite" };
      if (rp.beta === "moderate" || rp.vol === "moderate") return { score: 72, reason: "moderate risk for a growth book" };
      return { score: 55, reason: "low-vol — safe but light on the upside a growth book wants" };
    }
    if (mandate === "income") {
      if (lo) return { score: 90, reason: "low-vol / low-drawdown suits an income book" };
      if (rp.vol === "moderate" && rp.beta !== "high") return { score: 82, reason: "moderate-vol yield fits an income mandate" };
      if (hi) return { score: 45, reason: "high-beta — too racy for an income book" };
      return { score: 70, reason: "acceptable for an income mandate" };
    }
    // preservation
    if (protectedNote || (lo && rp.beta === "low")) return { score: 92, reason: "low-vol / capital-protected suits preservation" };
    if (lo) return { score: 80, reason: "low-vol fits a preservation mandate" };
    if (hi) return { score: 22, reason: "high-beta — unsuitable for a preservation book" };
    return { score: 50, reason: "moderate risk for a preservation mandate" };
  }

  /* Intent Fit (0–100 + reason): the idea's GOAL TYPE vs the mandate's goal. */
  const INTENT_FIT = {
    growth:       { appreciation: 90, yield: 55, protection: 45 },
    income:       { appreciation: 60, yield: 90, protection: 65 },
    preservation: { appreciation: 30, yield: 68, protection: 92 }
  };
  function intentFitScore(mandate, goalType) {
    const row = INTENT_FIT[mandate] || INTENT_FIT.growth;
    const score = row[goalType] != null ? row[goalType] : 60;
    const g = goalType === "appreciation" ? "capital-appreciation" : goalType === "yield" ? "yield-generating" : "capital-protection";
    return { score, reason: `${g} goal vs a ${mandate} mandate` };
  }

  /* ---- relevant holding: the position that best represents the idea ----
     ticker root / alias list, else the largest single position in the sector. */
  function relevantHolding(idea, client) {
    const positions = client.positions || [];
    const aliases = (idea.tickers && idea.tickers.length) ? idea.tickers
      : (idea.ticker ? [idea.ticker] : []);
    if (aliases.length) {
      const hits = positions.filter(p => aliases.includes(tickerRoot(p)));
      if (hits.length) {
        const top = hits.reduce((a, b) => b.weightPct > a.weightPct ? b : a);
        return { name: top.name, ticker: top.ticker, ownPct: top.weightPct, pnlPct: top.pnlPct, kind: "name" };
      }
    }
    const inSector = positions.filter(p => p.sector === idea.sector);
    if (inSector.length) {
      const top = inSector.reduce((a, b) => b.weightPct > a.weightPct ? b : a);
      return { name: top.name, ticker: top.ticker, ownPct: top.weightPct, pnlPct: top.pnlPct, kind: "sector-top" };
    }
    return null;
  }

  /* ---- per idea×client context ---- */
  function buildCtx(idea, client) {
    const exp = window.Scanner.exposure(client);
    const buckets = window.Scanner.bucketAlloc(client.split);
    const rh = relevantHolding(idea, client);
    // the book's largest single-name position — what a generic protect/trim idea
    // (Broad / Multi-Asset, no sector match) should act on, regardless of sector
    const named = (client.positions || []).filter(p => p.ticker && p.ticker !== "—" && p.weightPct > 0);
    const topName = named.length ? named.reduce((a, b) => b.weightPct > a.weightPct ? b : a) : null;
    return {
      buckets,
      rh, topName,
      ownIsName: !!(rh && rh.kind === "name"),
      ownPct: rh ? rh.ownPct : 0,
      ownPnl: rh ? rh.pnlPct : 0,
      ownName: rh ? rh.name : null,
      sectorExp: round(exp.bySector[idea.sector] || 0),
      acExp: round(exp.byClass[idea.assetClass] || 0),
      gap: Math.max(0, round((client.goals.target[idea.bucket] || 0) - (buckets[idea.bucket] || 0))),
      intent: ideaIntent(idea),
      risk: riskProfile(client)
    };
  }

  /* ============================== the five axes ============================ */

  /* GAP FIT — bucket-aware: does this idea fill a GOAL BUCKET the client is UNDER on?
       Gap Fit = max(0, (bucketTarget − bucketCurrent) / bucketTarget × 100), 0–100.
     Pegs the idea's bucket (Growth / Income / Preservation / Structured) to the client's
     own goal-allocation target (client.goals.target), NOT the mandate sector-comfort
     ceiling — so a Preservation idea is judged against the Preservation goal and scores 0
     once that bucket is already at/over target (e.g. gold for a client whose Preservation
     bucket is full). Falls back to sector headroom vs the mandate peg only when the
     client has no goal target for that bucket. */
  function axisGap(idea, client, ctx) {
    const bucket = idea.bucket;
    const tgt = (client.goals && client.goals.target && client.goals.target[bucket]) || 0;
    if (tgt > 0) {
      const cur = (ctx.buckets && ctx.buckets[bucket]) || 0;   // current % of book in this goal bucket
      const score = Math.max(0, (tgt - cur) / tgt * 100);
      const note = cur >= tgt
        ? `${bucket} bucket ${cur}% vs goal ${tgt}% — at/over target, no headroom.`
        : `${bucket} bucket ${cur}% vs goal ${tgt}% → ${Math.round(score)}% headroom toward the goal.`;
      return { score, note };
    }
    // fallback: no goal target for this bucket → sector headroom to the mandate comfort peg
    const cur = ctx.sectorExp;
    const peg = sectorPeg(client, idea.sector);
    const mc = mandateClass(client);
    const score = peg > 0 ? Math.max(0, (peg - cur) / peg * 100) : 0;
    const note = cur >= peg
      ? `${cur}% in ${idea.sector} vs the ${mc}-mandate comfort ${peg}% — at/over, no headroom.`
      : `${cur}% in ${idea.sector} vs the ${mc}-mandate comfort ${peg}% → ${Math.round(score)}% headroom.`;
    return { score, note };
  }

  /* AFFINITY FIT — replaces the old holdings axis.
       Affinity Fit = max(0, Thematic Affinity − Concentration Penalty), 0–100.
     A · Thematic Affinity: recency-weighted (λ=0.94) percentile rank of the CURRENT
         sector allocation within the client's trailing-24-month monthly history for
         that sector — "has this book been building / sitting at the top of its range".
     B · Concentration Penalty: how far the current allocation is OVER the mandate's
         sector comfort limit, in pp × 10 (capped 100).
     Reads client.sectorHistory[sector] (synthetic seed data — see data.js). */
  function axisAffinity(idea, client, ctx) {
    const sector = idea.sector;
    const cur = ctx.sectorExp;            // current % of the book in the idea's sector
    const A = PARAMS.affinity;

    // ---- Part A: Thematic Affinity (0–100) ----
    let affinity, hnote;
    const hist = client.sectorHistory && client.sectorHistory[sector];
    if (cur <= 0) {
      affinity = 0; hnote = `no current ${sector} exposure`;
    } else if (!hist || !hist.length) {
      // documented fallback: holds the sector but no history on file → flat at current → ~100
      affinity = 100; hnote = `no ${sector} history on file — treated as steady at ${cur}%`;
    } else {
      let wsum = 0, wle = 0;
      for (let t = 0; t < hist.length; t++) {
        const w = Math.pow(A.lambda, t);  // t=0 most recent, highest weight
        wsum += w;
        if (hist[t] <= cur) wle += w;      // weights of months at/below the current allocation
      }
      affinity = wsum > 0 ? (wle / wsum) * 100 : 0;
      hnote = `${cur}% now within a 24-mo ${Math.round(Math.min.apply(null, hist))}–${Math.round(Math.max.apply(null, hist))}% range`;
    }

    // ---- Part B: Concentration Penalty (0–100, subtracted) ----
    const mc = mandateClass(client);
    const peg = sectorPeg(client, sector);   // SAME shared peg constant as Gap fit
    const overshoot = cur - peg;
    const penalty = overshoot <= 0 ? 0 : Math.min(A.penaltyCap, overshoot * A.penaltyPerPp);

    // ---- Part C ----
    const score = Math.max(0, affinity - penalty);
    const note = penalty > 0
      ? `Thematic affinity ${Math.round(affinity)} (${hnote}) − ${Math.round(penalty)} over-limit penalty (${cur}% vs ${mc}-mandate comfort ${peg}%) = ${Math.round(score)}.`
      : `Thematic affinity ${Math.round(affinity)} (${hnote}); within the ${mc}-mandate comfort limit (${peg}%) → no penalty = ${Math.round(score)}.`;
    return { score, note };
  }

  /* MANDATE & RISK = 0.6·RiskSuitability + 0.4·IntentFit, 0–100.
     Tradability is NO LONGER on this axis — it is now a GLOBAL gate (see
     `tradability()` + scoreIdeaForClient) that multiplies the whole weighted sum,
     so keeping it here too would double-count. This axis is a clean blend of the
     two sub-scores grading the idea against the client's mandate (mandateClass /
     riskProfile). Both sub-scores stay visible in the note and on the result. */
  function axisMandate(idea, client, ctx) {
    const mandate = mandateClass(client);
    const rs = riskSuitability(mandate, riskProfileOf(idea));
    const intf = intentFitScore(mandate, goalTypeOf(idea));
    const blend = 0.6 * rs.score + 0.4 * intf.score;
    const note = `Risk Suitability ${rs.score} (${rs.reason}); Intent Fit ${intf.score} (${intf.reason}); Mandate & Risk ${Math.round(blend)}.`;
    return { score: blend, note, riskSuitability: rs.score, intentFit: intf.score };
  }

  /* CONCENTRATION WITHIN SECTOR — Herfindahl diversification of the book's holdings
     INSIDE the idea's sector. raw = (1 − HHI) × 100 (concentrated→0, diversified→100,
     where HHI = Σ(in-sector weightᵢ)² over weights normalised to sum to 1).
     For the FIT blend it is INVERTED by default — a concentrated sector position
     means a new name diversifies it, so it should fit MORE. */
  function axisConcSector(idea, client, ctx) {
    const P = PARAMS.concWithinSector, sector = idea.sector;
    const inSector = (client.positions || []).filter(p => p.sector === sector && p.weightPct > 0);
    const total = inSector.reduce((s, p) => s + p.weightPct, 0);
    if (!inSector.length || total <= 0) {
      return { score: P.noHoldingScore, note: `No ${sector} holdings to measure within-sector concentration — neutral ${P.noHoldingScore}.` };
    }
    let hhi = 0;
    inSector.forEach(p => { const w = p.weightPct / total; hhi += w * w; });
    const raw = Math.max(0, Math.min(100, (1 - hhi) * 100));      // diversification score (0 conc … 100 diversified)
    const fitContribution = P.invertForFit ? (100 - raw) : raw;   // ← SINGLE flippable line: PARAMS.concWithinSector.invertForFit
    const note = `${inSector.length} ${sector} name${inSector.length === 1 ? "" : "s"} (HHI ${hhi.toFixed(2)}) → diversification ${Math.round(raw)}/100; fit contribution ${Math.round(fitContribution)} (${P.invertForFit ? "more concentrated ⇒ a new name fits more" : "more diversified ⇒ fits more"}).`;
    return { score: fitContribution, note };
  }

  /* HOUSE-VIEW FIT removed from client-fit — it is an idea-level property and now
     lives in the CONVICTION score (4th pillar, build_today_focus.py / today_focus.json),
     scored 1–5 and shown in the UI as a percentage (20% per level). */

  const AXIS_FN = { gap: axisGap, holdings: axisAffinity, mandate: axisMandate, concSector: axisConcSector };

  /* ===================== GLOBAL TRADABILITY GATE ===========================
     Binary {0,1}, computed ONCE per idea×client, BEFORE the weighted sum, and
     multiplied across the whole bracketed score (see scoreIdeaForClient). NOT an
     axis — it used to live on Mandate & Risk; moved out so it gates the WHOLE fit
     rather than one 0.25-weighted term, and to stop double-counting.
       Final Client-Fit = Tradability × Σ(axisᵢ · weightᵢ)
     Tradability 0 ⇒ Final Client-Fit 0 and the idea is suppressed for that client.
     The reason is surfaced in the UI ("Not tradable — …"), never silently dropped.

     Model (data.js complexityOf): a **Retail** client cannot trade an **OTC**
     natural expression (collars, forwards, OTC options…). Structured NOTES are
     packaged securities a Retail client CAN trade; a Professional can trade any
     expression. */
  function tradability(idea, client) {
    const natural = naturalExpression(idea);
    const blocked = client.classification === "Retail" && S().isOtcOption(natural);
    if (blocked) {
      return { ok: 0, natural,
        reason: `Not tradable — ${client.mifid || "Retail"} classification doesn't permit ${natural} (OTC derivative). Needs Professional re-classification or a non-complex / structured-note alternative.` };
    }
    return { ok: 1, natural, reason: `Tradable — ${client.mifid || client.classification} permits ${natural}.` };
  }

  /* ---- score one idea for one client → superset consumed by every call site ---- */
  function scoreIdeaForClient(idea, client) {
    const ctx = buildCtx(idea, client);
    const W = PARAMS.weights;   // flat weights (fixed per axis), Σ = 1.00
    const axes = AXES.map(a => {
      const r = AXIS_FN[a.key](idea, client, ctx);
      const weight = W[a.key];
      return { key: a.key, label: a.label, weight, score: Math.round(r.score), contribution: round(r.score * weight), note: r.note };
    });

    /* the bracketed weighted sum — inner five weights Σ = 1.00, so this stays 0–100.
       The global gate below only ever passes it through or zeroes it; nothing is
       re-normalised. */
    const bracketFit = Math.round(axes.reduce((s, a) => s + a.score * a.weight, 0));

    /* GOAL ALIGNMENT — goals-aware multiplier over the bracketed score. Reads the
       client's DERIVED 3-bucket goal (goals.js) and boosts the fit when this idea fills
       a bucket the client is UNDER goal on, trims it when the bucket is already over.
       Bounded 0.85–1.15. This is what makes Today's Focus / Views / Advisor Book all tag
       the clients whose GOALS the idea actually serves. goals.js loads after mapping.js,
       but this runs at call time, so window.GOALS is present (guarded for safety). */
    const align = (window.GOALS && window.GOALS.goalAlignment)
      ? window.GOALS.goalAlignment(idea, client) : { mult: 1, gap: 0, bucket: null, goal: 0, current: 0 };
    const alignedFit = bracketFit * align.mult;

    /* GLOBAL TRADABILITY GATE — binary multiplier over the whole score. */
    const trad = tradability(idea, client);
    const fit = trad.ok ? Math.round(alignedFit) : 0;
    const suppressed = !trad.ok;

    const tier = fit >= PARAMS.tierStrong ? "Strong" : fit >= PARAMS.tierGood ? "Good" : "Marginal";
    const lead = axes.slice().sort((a, b) => b.contribution - a.contribution)[0];
    const why = suppressed ? trad.reason : lead.note;
    return {
      fit, tier, why, axes, intent: ctx.intent,
      // global tradability gate
      tradable: !!trad.ok, suppressed, tradabilityReason: trad.reason,
      naturalExpression: trad.natural, bracketFit,
      // goals-aware alignment multiplier (derived 3-bucket goal vs current)
      goalAlignment: align,
      // back-compat fields for scanner.js / pre-trade / morgan.js
      applies: trad.ok && alignedFit >= PARAMS.applyMin, score: fit, reason: why,
      gap: ctx.gap, secExp: ctx.sectorExp, acExp: ctx.acExp
    };
  }

  /* clients an idea is SUPPRESSED for by the global tradability gate — so the UI can
     surface the MiFID reason instead of silently dropping them. */
  function suppressedClients(idea) {
    return (S().clients || [])
      .map(c => ({ client: c, ...scoreIdeaForClient(idea, c) }))
      .filter(x => x.suppressed);
  }

  /* flag the clients an idea applies to, scored + sorted (default: fit >= flagMin) */
  function flagClients(idea, opts) {
    opts = opts || {};
    const min = opts.min == null ? PARAMS.flagMin : opts.min;
    const max = opts.max == null ? PARAMS.flagMax : opts.max;
    return (S().clients || [])
      .map(c => ({ client: c, ...scoreIdeaForClient(idea, c) }))
      .filter(x => x.fit >= min)
      .sort((a, b) => b.fit - a.fit)
      .slice(0, max);
  }

  window.MAPPING = { AXES, PARAMS, scoreIdeaForClient, flagClients, tradability, suppressedClients, tiltOf, mandateClass, sectorPeg, naturalExpression, goalTypeOf, riskProfileOf, ideaIntent, relevantHolding };
})();
