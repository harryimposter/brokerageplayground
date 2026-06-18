/* ============================================================================
   Brokerage Playground — portfolio scanner + idea matching engine
   ----------------------------------------------------------------------------
   Two directions, both DERIVED from the book (nothing hand-tagged):
     1. scanBook(client)      portfolio -> ideas  (concentration, losses, FX,
                              cash drag, bond swap, big winners, crypto,
                              liabilities, protection/income gaps)
     2. matchedIdeas(client)  ideas -> portfolio  (which Views ideas fit this
                              book, from sector/asset-class exposure + goal gaps)
   recommendations(client) merges both, grouped by asset class, and picks the
   Next Best Action. All pure functions over window.SEED.
   ========================================================================== */
(function () {
  "use strict";
  const S = () => window.SEED;
  const round = (n) => Math.round(n * 10) / 10;
  const CONV_W = { "High": 3, "Medium-High": 2, "Medium": 1 };

  /* ---- exposures ---- */
  function exposure(client) {
    const byClass = {}, bySector = {}, byCcy = {};
    (client.positions || []).forEach(p => {
      byClass[p.assetClass] = (byClass[p.assetClass] || 0) + p.weightPct;
      bySector[p.sector] = (bySector[p.sector] || 0) + p.weightPct;
      byCcy[p.ccy] = (byCcy[p.ccy] || 0) + p.weightPct;
    });
    return { byClass, bySector, byCcy };
  }
  function bucketAlloc(split) {
    const out = { Growth: 0, Income: 0, Preservation: 0, Structured: 0, Liquidity: 0 };
    Object.entries(split).forEach(([k, v]) => {
      const b = S().BUCKET_OF[k] || S().BUCKET_OF[k.replace(/_/g, " ")] || "Growth";
      out[b] += v;
    });
    return out;
  }

  /* ---- portfolio -> ideas : the book scan ---- */
  function scanBook(client) {
    const f = [];
    const retail = client.classification === "Retail";
    const positions = client.positions || [];
    const split = client.split;
    const buckets = bucketAlloc(split);
    const target = client.goals.target;
    const exp = exposure(client);
    const flag = (complex) => retail && complex;

    // 1. concentration (protect / collar) — single-name equity/alts only, not index funds, ladders or crypto
    positions.filter(p => p.weightPct >= 15 && ["Equity", "Alternatives"].includes(p.assetClass) && !["Broad", "Crypto"].includes(p.sector)).forEach(p => {
      const winner = p.pnlPct >= 50;
      f.push({
        source: "Portfolio", kind: "concentration", severity: p.weightPct >= 22 ? 3 : 2,
        title: `Protect the concentrated ${p.name} position`,
        rationale: `${p.name} is ${p.weightPct}% of the book${winner ? ` on a +${p.pnlPct}% gain` : ""} — single-name risk well above policy. A zero-cost collar locks in the level (and the gain) without realising tax or giving up all upside.`,
        structures: ["Zero-cost collar", "Prepaid variable forward", "Protective put"],
        assetClass: p.assetClass, sector: p.sector, bucket: "Preservation",
        complex: true, retailBlocked: flag(true),
        alt: "Scale out gradually into a diversified core / structured note with capital protection.",
        ref: { ticker: p.ticker, name: p.name }
      });
    });

    // 2. unrealised loss harvest (equity-like)
    positions.filter(p => p.pnlPct <= -10 && ["Equity", "Alternatives", "Real Assets"].includes(p.assetClass) && p.sector !== "Crypto").forEach(p => {
      f.push({
        source: "Portfolio", kind: "loss-harvest", severity: 2,
        title: `Harvest the loss in ${p.name}`,
        rationale: `${p.name} is ${p.pnlPct}%. Harvest the tax loss and re-enter the exposure — via a buffered note for downside-protected participation, or by rotating into a peer for the wash-sale window.`,
        structures: ["Tax-loss harvest", "Buffered re-entry note", "Peer rotation"],
        assetClass: p.assetClass, sector: p.sector, bucket: "Growth",
        complex: true, retailBlocked: flag(true),
        alt: "Harvest the loss and rotate into a comparable ETF/fund (non-complex) for 30+ days.",
        ref: { ticker: p.ticker, name: p.name }
      });
    });

    // 3. underwater bond (bond swap)
    positions.filter(p => p.assetClass === "Fixed Income" && p.pnlPct <= -8).forEach(p => {
      f.push({
        source: "Portfolio", kind: "bond-swap", severity: 2,
        title: `Bond swap — ${p.name}`,
        rationale: `${p.name} is ${p.pnlPct}% on rates, not credit. Swap it: harvest the loss and roll into current-coupon paper of similar quality — bank the loss and pick up materially more carry.`,
        structures: ["Bond swap", "Current-coupon ladder"],
        assetClass: "Fixed Income", sector: p.sector, bucket: "Income",
        complex: false, retailBlocked: false,
        ref: { ticker: p.ticker, name: p.name }
      });
    });

    // 4. crypto underwater
    positions.filter(p => p.sector === "Crypto" && p.pnlPct <= -20).forEach(p => {
      f.push({
        source: "Portfolio", kind: "crypto", severity: 3,
        title: `Rehabilitate the ${p.name} position`,
        rationale: `${p.name} is ${p.weightPct}% of the book and ${p.pnlPct}%. Options: harvest the loss and re-enter with a downside-defined structure, collar the position to cap further drawdown, or partially monetize and redeploy into the real-asset core.`,
        structures: ["Loss harvest", "Collar", "Structured re-entry note"],
        assetClass: "Alternatives", sector: "Crypto", bucket: "Preservation",
        complex: true, retailBlocked: flag(true),
        alt: "Trim into the real-asset core; re-size the digital sleeve to policy.",
        ref: { ticker: p.ticker, name: p.name }
      });
    });

    // 5. big winner overwrite (not already a concentration finding, not a hedge)
    positions.filter(p => p.pnlPct >= 50 && p.weightPct < 15 && p.assetClass === "Equity" && p.sector !== "Gold").forEach(p => {
      f.push({
        source: "Portfolio", kind: "overwrite", severity: 1,
        title: `Overwrite ${p.name} for income`,
        rationale: `${p.name} is +${p.pnlPct}% with lower forward conviction at this level. Sell covered calls to monetize the gain into income, or stage a tax-aware trim.`,
        structures: ["Covered calls", "Staged trim"],
        assetClass: "Equity", sector: p.sector, bucket: "Income",
        complex: true, retailBlocked: flag(true),
        alt: "Staged, tax-aware trim into diversifiers (non-complex).",
        ref: { ticker: p.ticker, name: p.name }
      });
    });

    // 6. FX mismatch
    const nonBase = round(Object.entries(exp.byCcy).filter(([c]) => c !== client.ccy && c !== "Cash").reduce((s, [, v]) => s + v, 0));
    if (nonBase >= 40) {
      f.push({
        source: "Portfolio", kind: "fx", severity: 2,
        title: `Hedge the ${nonBase}% non-${client.ccy} exposure`,
        rationale: `${nonBase}% of the book is in currencies other than the ${client.ccy} base. That is an unmanaged risk — hedge the mismatch with an FX overlay, especially if the rate-differential narrative turns.`,
        structures: ["FX forward / collar", "Currency-hedged sleeve"],
        assetClass: "Multi-Asset", sector: "FX", bucket: "Preservation",
        complex: true, retailBlocked: flag(true),
        alt: "Move the foreign sleeve into currency-hedged share classes (non-complex).",
        ref: { ticker: "FX", name: `${client.ccy} mismatch` }
      });
    }

    // 7. cash drag
    const cash = split.Cash || 0;
    if (cash >= 8) {
      f.push({
        source: "Portfolio", kind: "cash", severity: 1,
        title: `Put the ${cash}% idle cash to work`,
        rationale: `${cash}% is sitting in cash earning little while reinvestment risk rises. Ladder T-bills or extend into short high-quality bonds for income; sell cash-secured puts on names you'd add lower.`,
        structures: ["T-bill ladder", "Short-duration bonds", "Cash-secured puts"],
        assetClass: "Fixed Income", sector: "Rates", bucket: "Income",
        complex: false, retailBlocked: false,
        ref: { ticker: "CASH", name: "Idle cash" }
      });
    }

    // 8. liabilities / cashflow
    if ((client.liabilities || []).length) {
      const tot = round(client.liabilities.reduce((s, l) => s + l.amount, 0));
      f.push({
        source: "Portfolio", kind: "liability", severity: 3,
        title: `Liability & cashflow planning`,
        rationale: `${client.name} carries ${client.liabilities.map(l => `${l.name} (${l.unit === "$m" ? "$" + l.amount + "m" : l.amount + l.unit})`).join(" and ")} against thin cash. Build a liquidity/cashflow-matching sleeve and consider a securities-backed line rather than selling appreciated stock into the tax event.`,
        structures: ["T-bill / muni ladder", "Securities-backed line (SBL)"],
        assetClass: "Cash", sector: "Cash", bucket: "Liquidity",
        complex: false, retailBlocked: false,
        ref: { ticker: "LIAB", name: `${tot}m liabilities` }
      });
    }

    // 9. protection gap
    const protGap = round(target.Preservation - buckets.Preservation);
    if (protGap >= 6) {
      f.push({
        source: "Portfolio", kind: "protection-gap", severity: 2,
        title: `Close the ${protGap}pt protection gap`,
        rationale: `The book holds ${round(buckets.Preservation)}% in protective assets versus a ${target.Preservation}% strategic target. Add gold and/or structured downside protection to bring the book back to plan.`,
        structures: ["Gold (physical/ETC)", "Buffered notes", "Diversifiers"],
        assetClass: "Commodity", sector: "Gold", bucket: "Preservation",
        complex: false, retailBlocked: false,
        ref: { ticker: "PROT", name: "Preservation sleeve" }
      });
    }

    // 10. income gap
    const incGap = round(target.Income - buckets.Income);
    if (incGap >= 8) {
      f.push({
        source: "Portfolio", kind: "income-gap", severity: 1,
        title: `Lift income toward the ${target.Income}% target`,
        rationale: `Income-role assets are ${round(buckets.Income)}% versus a ${target.Income}% target. Extend duration in high-quality fixed income and add listed infrastructure for contracted income.`,
        structures: ["Extend duration", "Listed infrastructure"],
        assetClass: "Fixed Income", sector: "Rates", bucket: "Income",
        complex: false, retailBlocked: false,
        ref: { ticker: "INC", name: "Income sleeve" }
      });
    }

    // 11. sector concentration (diversify)
    Object.entries(exp.bySector).filter(([sec, v]) => v >= 30 && !["Cash", "Rates", "Credit", "Broad"].includes(sec)).forEach(([sec, v]) => {
      f.push({
        source: "Portfolio", kind: "sector", severity: 1,
        title: `Diversify the ${sec} concentration`,
        rationale: `${round(v)}% of the book sits in ${sec}. Diversify into uncorrelated sectors and asset classes to reduce factor risk.`,
        structures: ["Quality / equal-weight basket", "Cross-asset diversifiers"],
        assetClass: "Equity", sector: sec, bucket: "Growth",
        complex: false, retailBlocked: false,
        ref: { ticker: "SECT", name: `${sec} sleeve` }
      });
    });

    /* Normalise appropriateness from the actual structures: a finding is only
       Retail-blocked when EVERY way to express it is OTC (if a structured-product
       or non-complex route exists, Retail can take that instead). */
    f.forEach(x => {
      const structs = x.structures || [];
      const anyOtc = structs.some(s => S().isOtcOption(s));
      const allOtc = structs.length > 0 && structs.every(s => S().isOtcOption(s));
      x.complex = anyOtc || structs.some(s => S().isStructuredProduct(s));
      x.retailBlocked = retail && allOtc;
    });

    return f.sort((a, b) => b.severity - a.severity);
  }

  /* ---- ideas -> portfolio : DELEGATED to the unified MAPPING engine ----
     A thin facade so the Views tab, search, pre-trade and morgan.js keep their
     existing output keys (applies / score / reason / gap / secExp / acExp) while
     sharing ONE algorithm with Today's Focus and the Advisor-Book top-3.
     mapping.js loads after scanner.js, but every call here happens post-load. */
  function ideaFit(idea, client) {
    return window.MAPPING.scoreIdeaForClient(idea, client);
  }

  function matchedIdeas(client) {
    return S().ideas
      .map(idea => ({ idea, ...ideaFit(idea, client) }))
      .filter(x => x.applies)
      .sort((a, b) => b.score - a.score);
  }

  /* which clients does an idea apply to (for the Views tab) */
  function clientsForIdea(idea) {
    return S().clients
      .map(c => ({ client: c, ...ideaFit(idea, c) }))
      .filter(x => x.applies)
      .sort((a, b) => b.score - a.score);
  }

  /* ---- merge into asset-class-grouped recommendations + NBA ---- */
  function recommendations(client) {
    const findings = scanBook(client);
    const viewItems = matchedIdeas(client).map(m => ({
      source: "View", ideaId: m.idea.id, title: m.idea.title, rationale: m.reason,
      structures: m.idea.structures, assetClass: m.idea.assetClass, sector: m.idea.sector,
      bucket: m.idea.bucket, severity: 1, conviction: m.idea.conviction, type: m.idea.type,
      complex: (m.idea.structures || []).every(s => S().isOtcOption(s)),
      retailBlocked: client.classification === "Retail" && (m.idea.structures || []).every(s => S().isOtcOption(s)),
      score: m.score
    }));
    const all = findings.concat(viewItems);

    // group by asset class, ordered per ASSET_CLASSES then any extras
    const order = S().ASSET_CLASSES.concat(["Multi-Asset"]);
    const groups = [];
    const byAC = {};
    all.forEach(it => { (byAC[it.assetClass] = byAC[it.assetClass] || []).push(it); });
    order.concat(Object.keys(byAC)).forEach(ac => {
      if (byAC[ac]) { groups.push({ assetClass: ac, items: byAC[ac] }); delete byAC[ac]; }
    });

    // NBA: highest-severity portfolio finding, else top-scored view idea
    const nba = findings[0] || viewItems[0] || null;
    return { findings, viewItems, all, groups, nba };
  }

  function nextBestAction(client) { return recommendations(client).nba; }

  window.Scanner = {
    exposure, bucketAlloc, scanBook, ideaFit, matchedIdeas, clientsForIdea,
    recommendations, nextBestAction, CONV_W
  };
})();
