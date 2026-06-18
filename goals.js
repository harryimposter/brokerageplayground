/* ============================================================================
   Brokerage Playground — GOAL INFERENCE engine  (deriveGoals)
   ----------------------------------------------------------------------------
   The old model assumed the client HANDED YOU a target split
   (goals.target = {Growth, Income, Preservation, Structured, Liquidity}). Real
   clients never do that — they say "I want to grow capital," "I have a $19m
   mortgage," "I need $0.8m/yr." So we INFER the goal from BOTH sides of the
   balance sheet plus the client's revealed risk appetite, into THREE buckets:

       PROTECTION · INCOME · GROWTH

   Methodology (liability-driven / goals-based, à la Chhabra's risk-allocation):
     1. Fund the floor first — obligations are not preferences:
          • near-term bills + debt + a concentrated single name  → PROTECTION
          • spending draw + debt servicing + debt-matching        → INCOME
     2. Deploy the surplus by how hard the money must work:
          • required return (from the funding goal) + horizon + WILLINGNESS → GROWTH
     3. Normalise the three raw scores to 100%.

   WILLINGNESS is read two ways and blended:
     • STATED   — parsed from the free-text `risk` string (if any).
     • REVEALED — read off the CURRENT BOOK: risk-asset share, how little is
                  parked in safety, and appetite for single-name concentration.
   When the client states no hard goal, the required-return term goes silent and
   we lean harder on willingness (confidence reweight) — a missing written goal
   must never quietly de-risk an obviously aggressive book.

   IMPORTANT — anti-circularity: the book sets the *willingness knob* (a scalar),
   NOT the target vector. The target is still BUILT by the bucket logic, so the
   gap between "have" and "need" stays meaningful (≠ "you're always on target").

   Every coefficient below is a calibration choice (like the affinity λ) and lives
   in PARAMS so it is visible and tunable. Every INPUT, by contrast, is a real
   measured quantity off the balance sheet.

   Pure function over a single client object. A `client.goalOverride`
   {Preservation, Income, Growth} pins a manual vector and short-circuits the model.
   Exposed as window.GOALS (browser) and module.exports (Node tests).
   ========================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.GOALS = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* today, for converting "...by 2045" into a holding period (env: 2026-06-18) */
  const NOW_YEAR = 2026;

  const PARAMS = {
    base: 8,                       // every bucket starts with a small baseline weight
    /* PROTECTION drivers */
    nearBillW: 1.0,                // × (near-term bullet liabilities, % of AUM)
    debtBallastW: 0.3,             // × (total debt load, % of AUM) — stable assets vs leverage
    concPivot: 15,                 // single-name % above which it creates a protection need
    concW: 1.0,                    // × (topName% − concPivot)
    drawdownBump: 15,              // spend-down phase → can't ride out drawdowns
    shortHorizonW: 3,              // × max(0, 5 − H years)
    /* INCOME drivers */
    incomeNeedW: 8,                // × (annual spending draw, % of AUM) — capitalises the draw
    serviceW: 8,                   // × (annual debt service, % of AUM)
    debtMatchW: 0.6,              // × (total debt load, % of AUM) — income-match the debt
    /* GROWTH drivers */
    reqReturnW: 5,                 // × (required return, %/yr)
    longHorizonW: 3,               // × max(0, H years − 6)
    willingW: 30,                  // × willingness, when a required-return signal EXISTS
    willingWNoGoal: 45,            // × willingness, when there is NO goal signal (lean harder)
    /* CAUTION — willingness is BIDIRECTIONAL: a LOW appetite must add ballast, not
       merely shrink Growth. Without this, a client with no liabilities/income needs
       comes out growth-heavy no matter how cautious they are (Income/Preservation only
       ever got weight from NEEDS). These add (1 − willingness) × W to the defensives. */
    cautionProtW: 28,              // × (1 − willingness) → Preservation (temperament ballast)
    cautionIncW: 18,               // × (1 − willingness) → Income (stable cash preference)
    /* WILLINGNESS — revealed blend */
    revealRiskW: 0.5,              // weight on risk-asset share
    revealDefenseW: 0.3,           // weight on low-defensiveness
    revealConcW: 0.2,              // weight on single-name concentration appetite
    fullDefenseAt: 0.55,           // 55%+ in cash/bonds/gold ⇒ fully cautious (defense signal → 0)
    fullConcAt: 0.25,              // 25%+ single name ⇒ maxed concentration appetite
    serviceRate: 0.06              // assumed annual servicing rate on debt-like liabilities
  };

  /* asset-class roles for the revealed-willingness read (self-contained) */
  const RISK_ON = ["Equity", "Alternatives"];        // growth / risk assets
  const DEFENSIVE = ["Cash", "Fixed Income", "Commodity"]; // ballast (gold sits in Commodity)

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const sum = (arr) => arr.reduce((s, v) => s + v, 0);

  /* ---- horizon: phase (accumulate vs draw down) + a midpoint in years ---- */
  function parseHorizon(client) {
    const h = String((client.goals && client.goals.horizon) || "").toLowerCase();
    const phase = /drawdown|decumulat|retire/.test(h) ? "drawdown" : "accumulation";
    const nums = (h.match(/\d+/g) || []).map(Number);
    let years = 7;
    if (nums.length >= 2) years = (nums[0] + nums[1]) / 2;
    else if (nums.length === 1) years = nums[0];
    return { phase, years };
  }

  /* ---- funding goal → required return (%/yr) and/or income need ($/yr) ----
     Handles three headline shapes seen in the book:
       • value target   "Grow to €70m by 2035"        → required return
       • income target  "Fund $3.6m/yr ..."           → income need
       • BOTH           "Fund $0.8m/yr; grow to $45m"  → both signals on */
  function parseFunding(client, H) {
    const f = (client.goals && client.goals.funding) || {};
    const head = String(f.headline || "").toLowerCase();
    const unit = String(f.unit || "");
    const aum = client.aum || 0;
    const isIncomeUnit = /\/\s*yr/.test(unit);

    // annual income draw
    let incomeNeed = null;
    const yrMatch = head.match(/[\$€£]?\s*([\d.]+)\s*m?\s*\/\s*yr/);
    if (isIncomeUnit || yrMatch) {
      incomeNeed = yrMatch ? parseFloat(yrMatch[1]) : (typeof f.target === "number" ? f.target : null);
    }

    // terminal value target → required return
    let terminalTarget = null;
    const toMatch = head.match(/to\s*[\$€£]?\s*([\d.]+)\s*m\b/);
    if (toMatch) terminalTarget = parseFloat(toMatch[1]);
    else if (!isIncomeUnit && typeof f.target === "number") terminalTarget = f.target;

    // base value the return compounds from: explicit funding.current (value goals), else AUM
    const baseValue = (!isIncomeUnit && typeof f.current === "number" && f.current > 0) ? f.current : aum;

    // holding period: prefer an explicit "by 20xx", else the horizon midpoint
    let years = H;
    const byMatch = head.match(/by\s*(20\d\d)/);
    if (byMatch) years = Math.max(1, parseInt(byMatch[1], 10) - NOW_YEAR);

    let requiredReturn = null;
    if (terminalTarget && baseValue > 0 && years > 0 && terminalTarget > baseValue) {
      requiredReturn = (Math.pow(terminalTarget / baseValue, 1 / years) - 1) * 100;
    }
    return { incomeNeed, requiredReturn, years };
  }

  /* ---- liabilities → near-term bullets vs serviceable debt (both % of AUM) ---- */
  function parseLiabilities(client) {
    const aum = client.aum || 0;
    const list = client.liabilities || [];
    let nearBill = 0, debtLoad = 0, service = 0;
    list.forEach((l) => {
      const amt = +l.amount || 0;
      const txt = ((l.name || "") + " " + (l.note || "")).toLowerCase();
      debtLoad += amt;
      // one-off bill due soon → protection reserve (no recurring servicing)
      const oneOff = l.near === true || /tax|due|bridge|bill|payable|q[1-4]\b|settlement/.test(txt);
      // serviceable debt (mortgage / loan / line of credit) → recurring income need
      const debtLike = /mortgage|loan|line|credit|leverage|margin|borrow/.test(txt);
      if (oneOff) nearBill += amt;
      if (debtLike) service += amt * (typeof l.rate === "number" ? l.rate : PARAMS.serviceRate);
    });
    const pct = (x) => (aum > 0 ? (x / aum) * 100 : 0);
    return { nearBillPct: pct(nearBill), debtLoadPct: pct(debtLoad), servicePct: pct(service) };
  }

  /* ---- willingness: stated (free text) and revealed (the current book) ---- */
  function statedWillingness(client) {
    const r = String(client.risk || "").toLowerCase();
    if (/aggressive|maximum|max\b/.test(r)) return 0.95;
    if (/growth/.test(r)) return 0.80;
    if (/moderate|balanced/.test(r)) return 0.50;
    if (/conservative|cautious|income|preservation|protect/.test(r)) return 0.30;
    return null;
  }

  function revealedWillingness(client) {
    const pos = client.positions || [];
    const total = sum(pos.map((p) => +p.weightPct || 0)) || 100;
    const shareOf = (classes) =>
      sum(pos.filter((p) => classes.includes(p.assetClass)).map((p) => +p.weightPct || 0)) / total;

    const R = clamp01(shareOf(RISK_ON));                          // risk-asset share
    const defense = shareOf(DEFENSIVE);                           // cash / bonds / gold
    const D = clamp01(1 - Math.min(1, defense / PARAMS.fullDefenseAt));

    // largest genuine single name (index cores / fundless sleeves excluded)
    const names = pos.filter((p) => p.ticker && p.ticker !== "—" && p.sector !== "Broad" && (+p.weightPct || 0) > 0);
    const topName = names.length ? Math.max.apply(null, names.map((p) => +p.weightPct || 0)) : 0;
    const C = clamp01((topName / 100) / PARAMS.fullConcAt);

    const value = PARAMS.revealRiskW * R + PARAMS.revealDefenseW * D + PARAMS.revealConcW * C;
    return { value: clamp01(value), R, D, C, topName, riskShare: R, defenseShare: defense };
  }

  /* ---- largest-remainder rounding so the vector sums to EXACTLY 100 ---- */
  function normalizeTo100(raw) {
    const keys = Object.keys(raw);
    const tot = sum(keys.map((k) => raw[k])) || 1;
    const exact = keys.map((k) => ({ k, v: (raw[k] / tot) * 100 }));
    const floored = exact.map((e) => ({ k: e.k, base: Math.floor(e.v), rem: e.v - Math.floor(e.v) }));
    let left = 100 - sum(floored.map((f) => f.base));
    floored.sort((a, b) => b.rem - a.rem);
    const out = {};
    floored.forEach((f, i) => { out[f.k] = f.base + (i < left ? 1 : 0); });
    return out;
  }

  /* ===================== the inference ===================== */
  function deriveGoals(client) {
    // manual override short-circuits the model
    if (client.goalOverride) {
      const v = normalizeTo100({
        Preservation: +client.goalOverride.Preservation || 0,
        Income: +client.goalOverride.Income || 0,
        Growth: +client.goalOverride.Growth || 0
      });
      return { vector: v, source: "override", confidence: 1, drivers: ["Manually pinned by advisor"],
               raw: v, willingness: null, inputs: null };
    }

    const { phase, years: H } = parseHorizon(client);
    const liab = parseLiabilities(client);
    const fund = parseFunding(client, H);
    const rev = revealedWillingness(client);
    const stated = statedWillingness(client);

    // blend stated + revealed willingness (revealed always available)
    const willingness = stated == null ? rev.value : 0.5 * stated + 0.5 * rev.value;

    const incomeNeedPct = fund.incomeNeed != null && client.aum ? (fund.incomeNeed / client.aum) * 100 : 0;
    const reqReturn = fund.requiredReturn || 0;
    const hasGoalSignal = reqReturn > 0;
    const willingCoef = hasGoalSignal ? PARAMS.willingW : PARAMS.willingWNoGoal;
    const isDrawdown = phase === "drawdown";

    const concExcess = Math.max(0, rev.topName - PARAMS.concPivot);
    const caution = 1 - willingness;   // low appetite → ballast (bidirectional willingness)
    const r2 = (n) => Math.round(n * 100) / 100;

    /* every raw score is the sum of named, inspectable terms (surfaced in the UI's
       "How were these goals derived" panel) */
    const components = {
      Preservation: {
        base: PARAMS.base,
        nearBill: r2(PARAMS.nearBillW * liab.nearBillPct),
        debtBallast: r2(PARAMS.debtBallastW * liab.debtLoadPct),
        concentration: r2(PARAMS.concW * concExcess),
        drawdown: isDrawdown ? PARAMS.drawdownBump : 0,
        shortHorizon: r2(PARAMS.shortHorizonW * Math.max(0, 5 - H)),
        caution: r2(PARAMS.cautionProtW * caution)
      },
      Income: {
        base: PARAMS.base,
        incomeNeed: r2(PARAMS.incomeNeedW * incomeNeedPct),
        service: r2(PARAMS.serviceW * liab.servicePct),
        debtMatch: r2(PARAMS.debtMatchW * liab.debtLoadPct),
        drawdown: isDrawdown ? PARAMS.drawdownBump : 0,
        caution: r2(PARAMS.cautionIncW * caution)
      },
      Growth: {
        base: PARAMS.base,
        requiredReturn: r2(PARAMS.reqReturnW * reqReturn),
        longHorizon: r2(PARAMS.longHorizonW * Math.max(0, H - 6)),
        willingness: r2(willingCoef * willingness)
      }
    };
    const sumComp = (o) => Object.keys(o).reduce((s, k) => s + o[k], 0);
    const raw = {
      Preservation: r2(sumComp(components.Preservation)),
      Income: r2(sumComp(components.Income)),
      Growth: r2(sumComp(components.Growth))
    };
    const vector = normalizeTo100(raw);

    const source = hasGoalSignal ? "stated-goal" : (stated != null ? "stated-risk" : "revealed");
    // confidence: highest with a hard goal, lowest when leaning purely on the book
    const confidence = hasGoalSignal ? 0.9 : (stated != null ? 0.7 : 0.55);

    const drivers = [];
    if (reqReturn > 0) drivers.push(`Needs ~${reqReturn.toFixed(1)}%/yr over ${fund.years}y to hit the funding goal → Growth`);
    if (incomeNeedPct > 0) drivers.push(`Income draw ${incomeNeedPct.toFixed(1)}% of book → Income`);
    if (liab.servicePct > 0) drivers.push(`Debt servicing ${liab.servicePct.toFixed(1)}% of book → Income`);
    if (liab.debtLoadPct > 0) drivers.push(`Debt load ${liab.debtLoadPct.toFixed(0)}% of book → Income/Preservation matching`);
    if (liab.nearBillPct > 0) drivers.push(`Near-term bill ${liab.nearBillPct.toFixed(1)}% of book → Preservation reserve`);
    if (concExcess > 0) drivers.push(`${rev.topName.toFixed(0)}% single-name concentration → Preservation`);
    if (isDrawdown) drivers.push(`Drawdown phase → Income/Preservation`);
    drivers.push(`Willingness ${willingness.toFixed(2)} (${stated == null ? "revealed only" : "stated+revealed"}: ${Math.round(rev.riskShare * 100)}% risk assets, ${Math.round(rev.defenseShare * 100)}% defensive, ${rev.topName.toFixed(0)}% top name) → Growth`);

    return {
      vector, raw, components, willingCoef, source, confidence, drivers,
      willingness: { value: +willingness.toFixed(3), stated, revealed: +rev.value.toFixed(3), R: +rev.R.toFixed(3), D: +rev.D.toFixed(3), C: +rev.C.toFixed(3) },
      inputs: {
        aum: client.aum, horizonYears: H, phase,
        requiredReturnPct: +reqReturn.toFixed(2), incomeNeedPct: +incomeNeedPct.toFixed(2),
        nearBillPct: +liab.nearBillPct.toFixed(2), debtLoadPct: +liab.debtLoadPct.toFixed(2),
        servicePct: +liab.servicePct.toFixed(2), topNamePct: +rev.topName.toFixed(1)
      }
    };
  }

  /* ===================== 3-bucket consumers (display + tagging) ===================== */

  /* the three goal buckets, in display order, with colours matching the legacy palette */
  const GOALS3 = [
    { key: "Growth",     name: "Growth",     color: "#29211A",
      desc: "Capital appreciation — the surplus that can take risk for long-term growth. Equities and growth alternatives (incl. crypto / venture) and participation notes." },
    { key: "Income",     name: "Income",     color: "#9A7B4F",
      desc: "Recurring cash the book must throw off — to fund spending or service debt. Bonds, dividend / real-asset income, and yield-style structured notes." },
    { key: "Preservation", name: "Preservation", color: "#3F6B4E",
      desc: "Downside defence and capital that can't be lost — ballast, near-term reserves and hedges. Cash, gold and capital-protected notes fold in here." }
  ];

  /* the canonical goal vector for a client (override-aware) */
  function goalsFor(client) { return deriveGoals(client).vector; }

  /* fold the CURRENT book into the same three buckets (the "now" side of the bar).
     Liquidity (cash) and Structured are NOT their own buckets any more — they fold by
     ROLE: cash + gold → Preservation, structured notes by their purpose, risk assets
     (equity + alternatives incl. crypto/venture) → Growth, fixed income / real assets → Income. */
  function classBucket3(cls) {
    cls = String(cls || "").replace(/_/g, " ");
    if (cls === "Equity" || cls === "Alternatives") return "Growth";
    if (cls === "Fixed Income" || cls === "Credit" || cls === "Real Assets") return "Income";
    return "Preservation"; // Commodity (gold), Cash, Structured (refined below)
  }
  function structuredBucket3(pos) {
    const txt = ((pos.name || "") + " " + ((pos.structures || []).join(" ")) + " " + (pos.note || "")).toLowerCase();
    if (/buffer|protect|capital|defensive|collar|principal/.test(txt)) return "Preservation";
    if (/autocall|coupon|reverse conv|phoenix|memory|income|yield/.test(txt)) return "Income";
    return "Growth";
  }
  function currentBuckets(client) {
    const out = { Growth: 0, Income: 0, Preservation: 0 };
    const pos = client.positions || [];
    if (pos.length) {
      pos.forEach((p) => {
        const cls = String(p.assetClass || "").replace(/_/g, " ");
        const b = cls === "Structured" ? structuredBucket3(p) : classBucket3(cls);
        out[b] += (+p.weightPct || 0);
      });
    } else if (client.split) {
      Object.keys(client.split).forEach((k) => { out[classBucket3(k)] += client.split[k]; });
    }
    return { Growth: Math.round(out.Growth), Income: Math.round(out.Income), Preservation: Math.round(out.Preservation) };
  }

  /* fold an asset-class split {Equity: 26, ...} into the three buckets. Used by the
     pre-trade impact view, where we only have a split (no position objects), so
     Structured can't be refined by purpose — it falls to classBucket3's default. */
  function bucketsFromSplit3(split) {
    const out = { Growth: 0, Income: 0, Preservation: 0 };
    Object.keys(split || {}).forEach((k) => { out[classBucket3(k)] += (+split[k] || 0); });
    return out;
  }

  /* which of the three goals does an idea SERVE? (from its goal type) */
  function ideaGoalType(idea) {
    if (window.MAPPING && window.MAPPING.goalTypeOf) return window.MAPPING.goalTypeOf(idea);
    const b = idea.bucket;
    if (b === "Preservation") return "protection";
    if (b === "Income" || b === "Liquidity") return "yield";
    return "appreciation";
  }
  function goalBucketOfIdea(idea) {
    const g = ideaGoalType(idea);
    return g === "protection" ? "Preservation" : g === "yield" ? "Income" : "Growth";
  }

  /* GOAL ALIGNMENT — the new goals-aware tagging signal used across every tab.
     An idea that fills a bucket where the client is UNDER its derived goal should tag
     that client MORE; one that piles into a bucket already over goal, LESS. Returns a
     bounded multiplier (0.85–1.15) applied to the client-fit score in mapping.js. */
  function goalAlignment(idea, client) {
    const b = goalBucketOfIdea(idea);
    const goal = goalsFor(client);
    const cur = currentBuckets(client);
    const gap = (goal[b] || 0) - (cur[b] || 0);          // + = under-allocated → idea helps close the gap
    const mult = Math.max(0.85, Math.min(1.15, 1 + gap / 200));
    return { bucket: b, goal: goal[b] || 0, current: cur[b] || 0, gap: Math.round(gap * 10) / 10, mult: Math.round(mult * 1000) / 1000 };
  }

  return {
    deriveGoals, parseHorizon, parseFunding, parseLiabilities, revealedWillingness, statedWillingness, PARAMS,
    GOALS3, goalsFor, currentBuckets, bucketsFromSplit3, classBucket3, goalBucketOfIdea, goalAlignment
  };
});
