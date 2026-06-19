/* ============================================================================
   Brokerage Playground — EXPRESSIONS knowledge base
   ----------------------------------------------------------------------------
   "How we'd express it" detail. Every distinct expression string used anywhere
   in the app (SEED_IDEAS.structures, scanner.js findings, custom ideas) resolves
   to ONE canonical entry below, via an alias table + keyword fallback. Each entry
   carries the concrete "exactly how": what it is, the precise mechanics/payoff,
   typical underlying + tenor, CONCRETE example terms, pros/cons and when to use.

   Additive + data-driven: no change to the theme/idea model or the scanner.
   Exposes window.EXPRESSIONS with:
     resolve(raw)            -> canonical id (or null)
     get(raw)                -> entry (or graceful fallback)
     detail(raw, ctx)        -> entry + a context line tailored to the idea
     itemHTML(raw, ctx, o)   -> one accordion item (button + hidden panel)
     accordionHTML(arr,c,o)  -> wrapped list of accordion items
     wire(rootEl)            -> attach click/keyboard toggles within a root
   ========================================================================== */
(function () {
  "use strict";

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* sector -> representative underlying, so an example can read against the
     specific idea (e.g. "Structured note" under AI reads against the semis). */
  const SECTOR_U = {
    "Technology":  { name: "the AI & semis complex",   ticker: "NVDA",       index: "the SOX semiconductor index", etf: "SMH/SOXX" },
    "Utilities":   { name: "load-growth utilities",    ticker: "NEE/CEG",    index: "a utilities index",          etf: "XLU" },
    "Energy":      { name: "energy majors",            ticker: "XOM/SHEL",   index: "an energy index",            etf: "XLE" },
    "Healthcare":  { name: "healthcare innovation",    ticker: "LLY",        index: "a healthcare index",         etf: "XLV/IHI" },
    "Broad":       { name: "the broad market",         ticker: "SPY",        index: "the S&P 500",                etf: "SPY/VOO" },
    "Rates":       { name: "the high-quality rates sleeve", ticker: "UST",   index: "the Treasury curve",         etf: "IEF/GOVT" },
    "Credit":      { name: "investment-grade credit",  ticker: "LQD",        index: "the IG credit index",        etf: "LQD" },
    "Gold":        { name: "the gold sleeve",          ticker: "gold (XAU)", index: "the gold price",             etf: "GLD/4GLD" },
    "Infrastructure": { name: "listed infrastructure", ticker: "IGF",        index: "a global infrastructure index", etf: "IGF" },
    "Real Estate": { name: "the real-estate sleeve",   ticker: "O",          index: "a REIT index",               etf: "VNQ" },
    "FX":          { name: "the currency mismatch",    ticker: "EUR/USD",    index: "the currency pair",          etf: "—" },
    "Materials":   { name: "miners & materials",       ticker: "GDX",        index: "a materials index",          etf: "XME" },
    "Financials":  { name: "financials",               ticker: "JPM",        index: "a financials index",         etf: "XLF" },
    "Industrials": { name: "industrials",              ticker: "CAT",        index: "an industrials index",       etf: "XLI" },
    "Consumer":    { name: "consumer staples",         ticker: "PG",         index: "a staples index",            etf: "XLP" },
    "Crypto":      { name: "the digital-asset sleeve", ticker: "BTC",        index: "bitcoin",                    etf: "IBIT" },
    "Cash":        { name: "the cash sleeve",          ticker: "T-bills",    index: "the front end",              etf: "BIL/SGOV" },
    "default":     { name: "the underlying",           ticker: "the name",   index: "the relevant index",         etf: "the ETF" }
  };
  function uFor(ctx) {
    const base = Object.assign({}, (ctx && ctx.sector && SECTOR_U[ctx.sector]) || SECTOR_U.default);
    // A single-name idea overrides the sector proxy with its OWN ticker/name, so a
    // Micron idea's example reads "MU" — not the sector's representative "NVDA".
    if (ctx && ctx.ticker) {
      base.ticker = String(ctx.ticker).split(" ")[0];
      if (ctx.name) base.name = ctx.name;
    }
    return base;
  }

  /* ---------------------------- canonical entries ------------------------- */
  const E = {

    "direct-equity": {
      label: "Direct equity", complex: false,
      what: "Own the shares outright — the cleanest, most liquid way to take the view.",
      mechanics: "Buy the common stock (or ADR/local line) in the cash account. Full upside and downside, you collect dividends and keep voting rights — no leverage, no embedded option, no counterparty.",
      underlying: "Single stocks, or a small hand-picked set of names in the theme.",
      tenor: "Open-ended — hold as long as the thesis runs.",
      example: "Buy a 3–5% position in the 2–4 highest-conviction names; e.g. a 4% line funded from cash, with a rule to trim if any single name passes ~8% of the book.",
      pros: ["Maximum liquidity and transparency", "No fees beyond commission; no counterparty/credit risk", "Full dividend and uncapped upside", "Simple tax lots (harvest, gift, step-up)"],
      cons: ["Full downside — no protection", "Single-name idiosyncratic risk", "Needs position-sizing discipline to avoid concentration"],
      whenToUse: "Highest-conviction names where you want uncapped upside and will manage risk by sizing rather than by structure.",
      context: (u) => `Expressed as a direct line in ${u.name} — e.g. a 3–5% position in ${u.ticker}-type names, sized so no single stock dominates the book.`
    },

    "index-core": {
      label: "Index core / ETF", complex: false,
      what: "Own the whole theme through a low-cost ETF or fund rather than picking winners.",
      mechanics: "Buy a passive ETF or active fund tracking the sector/index. One ticker gives diversified exposure; the fund holds and rebalances the basket for you.",
      underlying: "A sector/thematic index or broad benchmark.",
      tenor: "Open-ended core holding.",
      example: "A 5–10% allocation to a sector ETF at ~0.10–0.35% expense ratio, held as the strategic core with single names layered on top.",
      pros: ["Instant diversification — removes single-stock risk", "Cheap and tax-efficient (ETFs)", "Daily liquidity"],
      cons: ["No alpha vs the index; you own the laggards too", "Tracking error / fees on active funds", "Caps upside vs a winning single name"],
      whenToUse: "The strategic core of a theme, or when you want the exposure without a view on individual names.",
      context: (u) => `Held via a ${u.etf}-type ETF tracking ${u.index} — the diversified core of the ${u.name} exposure.`
    },

    "structured-note": {
      label: "Structured note",
      what: "A packaged senior bank note with a defined, formula-based payoff — the wrapper for autocalls, buffered and capital-protected notes.",
      mechanics: "An unsecured senior note from a bank issuer with an embedded option strategy: instead of a fixed coupon it pays a rule (coupon, participation, buffer, autocall). Because it's a packaged SECURITY (an ISIN you book like a bond), a MiFID Retail client can hold it — unlike an OTC option. Which structure to use follows the view: flat-to-up single name → Autocall Market Plus (ACM+); re-enter after a loss → buffered note; stay invested with a floor → capital-protected note.",
      underlying: "A single stock, worst-of basket, or equity index tied to the theme.",
      tenor: "12–24 months for income/autocalls. The coupon and barrier are the levers, not a long hold — short enough to re-strike as the view moves, long enough to earn the coupon through an earnings cycle.",
      example: "Recommended for a constructive single-name view: a 12-month ACM+ — 80% capital barrier, ~12–24% p.a. coupon paid while above the barrier, quarterly autocall at the start level. Why 12m: it banks a full coupon year and lets you reassess at the next annual earnings cycle.",
      pros: ["Payoff tailored to the exact view (income, protection or leverage)", "Packaged security — MiFID Retail eligible (it is not OTC)", "Defined, rules-based outcome you can show the client"],
      cons: ["Issuer credit risk (it's an unsecured bank note)", "Illiquid — secondary market only at the issuer's mark", "Capped upside / no dividends; complex, so the appropriateness test still applies"],
      whenToUse: "When you want a defined outcome on a theme — high income, protected participation or leverage — as a security the client can hold to maturity.",
      context: (u) => `On ${u.index}: e.g. a 12-month ACM+ on ${u.ticker} — 80% barrier, rich quarterly coupon, autocall at the start level — a packaged way to monetise the ${u.name} view without holding the stock outright.`
    },

    "range-accrual": {
      label: "Range accrual note",
      what: "A packaged senior bank note that pays an enhanced coupon for each day a reference rate (the 10-year Treasury yield, SOFR, or a defined rate band) fixes INSIDE a set band — income for a range-bound-rates view.",
      mechanics: "An unsecured senior note (an ISIN you book like a bond) whose coupon accrues only on days the reference rate fixes within a set band: coupon ≈ (max rate) × (days in range ÷ total days). You are effectively short rate-volatility — paid an above-cash coupon to hold the view that the rate stays range-bound, forgoing the coupon on out-of-range days. Capital is typically returned at par at maturity (issuer credit risk aside). It's a Retail-friendly packaged note — a MiFID Retail client can hold it directly (it is not an OTC derivative).",
      underlying: "An interest-rate reference — the 10-year Treasury (CMS) yield, overnight SOFR, or a policy-rate band — with an upper/lower accrual barrier.",
      tenor: "6–18 months. Short enough to re-strike the band as the rate path evolves, long enough to bank a meaningful enhanced-coupon pickup over cash.",
      example: "12-month 10Y Treasury range accrual: ~7.5% p.a. coupon accrued daily for each day the 10Y yield fixes in 4.00–4.90%, ~4.0% on cash, A-rated issuer, capital returned at par — paid to hold the 10Y boxed below the 5% ceiling.",
      pros: ["Enhanced coupon well above cash while the rate stays range-bound", "Retail-friendly packaged note — held directly, not an OTC derivative", "Defined, rules-based payoff you can show the client"],
      cons: ["Coupon forgone on any day the rate fixes OUTSIDE the band", "Issuer credit risk (unsecured bank note); illiquid to maturity", "A breakout (a fiscal/supply or Fed surprise) can zero the coupon while you stay locked in"],
      whenToUse: "An income book that wants an above-cash coupon and shares the view that a hawkish-hold Fed keeps the 10Y range-bound below its proven 5% ceiling.",
      context: (u) => `On the 10-year Treasury (or SOFR) yield: e.g. a 12-month note paying an enhanced coupon for each day the rate fixes inside the band — monetising a range-bound 10Y.`
    },

    "buffered-note": {
      label: "Buffered note",
      what: "A structured note that participates in the upside with a soft floor — the desk's go-to loss-repair / protected re-entry structure.",
      mechanics: "A senior bank note that gives you the underlying's upside (often uncapped) while protecting the first part of any fall: down to the barrier (e.g. 70% — a 30% cushion) your capital is returned in full; only below it do you take the loss from par. Pairs perfectly with a tax-loss harvest — sell the underwater stock, book the loss, put the proceeds into a buffered note to stay invested with a cushion through the 30-day wash window.",
      underlying: "A single stock you're repairing (e.g. a post-miss name) or a broad equity index.",
      tenor: "12–18 months. Why: long enough to clear the 30-day wash-sale window and ride out the drawdown that created the loss, short enough to re-underwrite the name at the next cycle.",
      example: "Recommended re-entry note: 70% barrier (protected until the stock is down 30%), 100% uncapped upside participation, 15-month, USD, A-rated issuer — turns a −21% post-earnings loss into a protected stay-invested.",
      pros: ["30% downside cushion while keeping full upside", "Ideal stock-repair / re-entry after a loss harvest", "Packaged security — Retail eligible (it is not OTC)"],
      cons: ["Below the barrier you take the loss from par (it's a barrier, not a hard buffer)", "Issuer credit risk; illiquid to maturity", "No dividends while you hold the note"],
      whenToUse: "Re-entering a name you've just harvested a loss in, or staying invested late in a rally — when you want participation but a cushion against the next leg down.",
      context: (u) => `On ${u.ticker}: e.g. a 15-month note, 70% barrier with full uncapped upside — the protected way back into ${u.name} after harvesting the loss.`
    },

    "call-overwrite": {
      label: "Call overwrite / covered calls", complex: true,
      what: "Sell call options against stock you own to turn it into income.",
      mechanics: "Hold the shares and sell (write) out-of-the-money calls against them. You collect premium up front; if the stock stays below the strike the calls expire worthless and you keep premium + shares. Above the strike, upside is capped and shares may be called away.",
      underlying: "Single stocks you own, or an index/ETF overlay.",
      tenor: "Roll monthly to quarterly (30–90 day options).",
      example: "Own a winner, sell 1-month calls ~5% OTM for ~1.0–1.5% premium; ~10–15% annualised income if repeated, capping gains above the strike.",
      pros: ["Monetises a flat/range-bound winner into yield", "Premium cushions small drawdowns", "Keeps the position (no immediate tax vs selling)"],
      cons: ["Caps upside — shares called away in a rally", "Still fully exposed below the premium", "Requires active rolling/management"],
      whenToUse: "On a high-conviction-but-richly-valued winner you expect to grind sideways and want to be paid to hold.",
      context: (u) => `Write ~1-month calls ~5% out-of-the-money on your ${u.ticker} line in ${u.name}, harvesting ~1% premium a month while it trades range-bound.`
    },

    "utility-basket": {
      label: "Utility basket", complex: false,
      what: "A basket of regulated utilities positioned for AI/electrification load growth.",
      mechanics: "Hold a diversified set of regulated and integrated utilities (plus select IPPs) with rate-base growth from datacenters, reshoring and electrification. Income from regulated dividends plus rate-base compounding.",
      underlying: "Regulated/integrated utilities and grid suppliers (e.g. NextEra, Constellation, Vistra) plus grid names.",
      tenor: "Strategic, multi-year.",
      example: "An 8-name, roughly equal-weighted basket (~5–8% of book) tilted to load-growth utilities yielding ~3% with mid-single-digit rate-base growth; or an XLU-type ETF as the core.",
      pros: ["Regulated, contracted income with a growth kicker", "Lower-beta defensive sleeve", "Direct play on AI power demand"],
      cons: ["Rate-sensitive (long-duration equity)", "Regulatory/political risk on allowed returns", "IPPs add volatility"],
      whenToUse: "Income-oriented books wanting the power/AI theme in a defensive, yield-bearing form.",
      context: (u) => `A basket of load-growth utilities (${u.ticker}-type names) for ${u.name} — regulated income plus datacenter-driven rate-base growth.`
    },

    "thematic-basket": {
      label: "Thematic basket", complex: false,
      what: "A custom, roughly equal-weighted basket of stocks expressing one specific theme.",
      mechanics: "Build (or buy as a tradable basket) 8–20 names that capture the theme end-to-end. Equal- or conviction-weighted, rebalanced periodically — concentrated enough to express the view, diversified enough to avoid single-name blow-ups.",
      underlying: "Stocks across the theme's value chain (e.g. gas + nuclear + grid for AI power).",
      tenor: "Strategic to 12-month, rebalanced quarterly.",
      example: "A 10-name AI-power basket (gas infra, nuclear operators, turbines, grid) equal-weighted at ~0.6% each for a ~6% sleeve, rebalanced quarterly.",
      pros: ["Captures a theme no single ETF covers cleanly", "Tunable weights and names", "Diversifies single-name risk"],
      cons: ["More maintenance than one ETF", "Needs periodic rebalancing", "Commission/implementation drag across many lines"],
      whenToUse: "When the theme spans several sub-sectors and you want curated exposure rather than an off-the-shelf fund.",
      context: (u) => `A curated 8–15 name basket across the ${u.name} value chain, equal-weighted into a single ~5–7% sleeve.`
    },

    "govt-ig-bonds": {
      label: "Govt / IG bonds", complex: false,
      what: "Own high-quality government and investment-grade corporate bonds directly for yield and ballast.",
      mechanics: "Buy individual Treasuries/gilts/bunds and IG corporates, holding to maturity for a known yield-to-maturity (or via a fund). Adds duration that tends to rally when equities fall.",
      underlying: "Sovereigns (UST/gilt/bund) and IG corporates.",
      tenor: "Intermediate, ~3–10 year maturities.",
      example: "A blend of 5–10y Treasuries at ~4.3% YTM and A/BBB corporates at ~5.3% YTM, ~10–15% of book, locking the yield to maturity.",
      pros: ["Locks in today's yields before cuts", "True equity diversifier (duration)", "High quality, predictable cashflows"],
      cons: ["Mark-to-market loss if yields rise", "Credit/spread risk on the corporate sleeve", "Lower long-run return than equities"],
      whenToUse: "Extending out of cash to lock yields and add ballast as the cutting cycle approaches.",
      context: (u) => `High-quality govvies and IG paper at ~4.3–5.3% YTM — locking yield and adding duration ballast around ${u.name}.`
    },

    "bond-ladder": {
      label: "Bond ladder", complex: false,
      what: "A staggered set of bonds maturing in consecutive years.",
      mechanics: "Buy roughly equal amounts maturing in each of, say, years 1 through 7. Each year a rung matures and is reinvested at the long end — smoothing reinvestment risk and giving predictable annual liquidity without timing rates.",
      underlying: "Treasuries and/or IG corporates (or munis for taxable accounts).",
      tenor: "Ladder spans ~1–7 (or 2–10) years; rolling.",
      example: "A 1–7 year Treasury ladder, ~$1m per rung at ~4.2–4.6% YTM; each maturing rung rolls into a fresh 7-year, locking ~4.4% blended yield.",
      pros: ["Removes rate-timing decisions", "Predictable cashflow and annual liquidity", "Self-managing reinvestment"],
      cons: ["Average yield can lag a barbell in some curves", "Needs enough capital to diversify each rung", "Manual rolls (unless a laddered ETF/UIT)"],
      whenToUse: "Income books that want dependable cashflow and to neutralise reinvestment risk.",
      context: (u) => `A 1–7y ladder of high-quality bonds, ~equal per rung at ~4.4% blended YTM, rolling maturities out each year.`
    },

    "ig-corporates": {
      label: "IG corporates", complex: false,
      what: "Investment-grade corporate bonds for extra carry over govvies at modest credit risk.",
      mechanics: "Hold A/BBB-rated corporate bonds (single names or a fund/ETF) to capture the credit spread above Treasuries. Income is coupon plus spread; default risk is low but non-zero.",
      underlying: "Senior IG corporate bonds across sectors.",
      tenor: "Intermediate, ~3–7 years.",
      example: "An A/BBB corporate sleeve at ~5.2% YTM (~90–110bp over Treasuries), ~8–12% of book, via individual bonds or an LQD-type ETF.",
      pros: ["Higher yield than govvies for limited extra risk", "Diversified income sleeve", "Liquid via ETFs"],
      cons: ["Spread widening in risk-off", "Quality drift if not monitored", "Still rate-sensitive"],
      whenToUse: "Building durable income with a small step out of governments into high-quality credit.",
      context: (u) => `IG corporate paper at ~5.2% YTM (~100bp of spread) — the carry engine of the income sleeve.`
    },

    "securitised-sleeve": {
      label: "Securitised sleeve", complex: false,
      what: "Select securitised credit — agency MBS, ABS, senior CLOs — for spread and diversification.",
      mechanics: "Allocate to pools of collateralised cashflows (mortgages, consumer loans, senior CLO tranches), typically via a specialist fund. Adds spread and a different risk factor (prepayment, consumer credit) than corporate bonds.",
      underlying: "Agency MBS, asset-backed securities, AAA/AA CLO tranches.",
      tenor: "Intermediate; varies by structure.",
      example: "A 4–6% allocation to a securitised-credit fund yielding ~6%, weighted to agency MBS and senior (AAA) CLOs for spread with limited credit risk.",
      pros: ["Attractive all-in yields", "Diversifies away from corporate-spread risk", "Senior tranches are high quality"],
      cons: ["Complexity and prepayment risk", "Liquidity varies; usually fund-only", "Lower tranches carry real credit risk"],
      whenToUse: "Income books that already hold govvies/corporates and want spread diversification.",
      context: (u) => `A specialist securitised-credit fund (agency MBS / senior CLOs) at ~6% yield, diversifying the income sleeve away from corporate spreads.`
    },

    "equal-weight-index": {
      label: "Equal-weight index", complex: false,
      what: "Own the index equal-weighted so the rally can broaden beyond the mega-caps.",
      mechanics: "Buy an equal-weight version of the benchmark (each constituent ~the same weight) instead of cap-weighted — tilting away from the largest names toward the median stock. A bet that breadth improves.",
      underlying: "A broad index, equal-weighted (e.g. RSP for the S&P 500).",
      tenor: "Strategic; the fund rebalances quarterly.",
      example: "Swap part of an S&P 500 cap-weight core into an equal-weight ETF (RSP); an ~8–10% sleeve cuts top-name weight from ~7% to ~0.2% each.",
      pros: ["Reduces mega-cap concentration", "Benefits if leadership broadens", "Simple one-ticker implementation"],
      cons: ["Lags badly if mega-caps keep leading", "Higher turnover/fees than cap-weight", "Small/mid tilt adds cyclicality"],
      whenToUse: "Diversifying a book dominated by a handful of mega-caps as earnings broaden.",
      context: (u) => `An equal-weight ETF (RSP-type) sized to dilute mega-cap concentration in the ${u.name} exposure.`
    },

    "quality-basket": {
      label: "Quality basket", complex: false,
      what: "A basket of high-return-on-capital, low-leverage compounders.",
      mechanics: "Screen for high ROIC, stable margins, low debt and consistent cash generation; hold the resulting names (or a quality-factor ETF). A defensive-growth sleeve that holds up better in drawdowns.",
      underlying: "Quality-factor stocks across sectors; or a quality ETF (QUAL).",
      tenor: "Strategic.",
      example: "A 12–15 name quality basket (or the QUAL ETF) at ~6–8% of book, tilted to industrials/healthcare/staples compounders at reasonable multiples.",
      pros: ["Lower drawdowns, durable compounding", "Diversifies away from a single hot sector", "Works across cycles"],
      cons: ["Can lag in junk/cyclical rallies", "'Quality' can get expensive", "Factor crowding"],
      whenToUse: "Broadening a concentrated growth book into resilient compounders.",
      context: (u) => `A quality-factor basket (or QUAL ETF) broadening ${u.name} into high-ROIC compounders with lower drawdown.`
    },

    "international-etf": {
      label: "International ETF", complex: false,
      what: "Diversify out of US home-bias into developed / EM international equities.",
      mechanics: "Buy a developed-international (or EM) ETF to add non-US exposure and FX diversification, capturing the valuation discount to US growth. Currency-hedged share classes are available if you want equity-only exposure.",
      underlying: "Developed ex-US (EAFE) and/or EM indices.",
      tenor: "Strategic.",
      example: "A 6–10% allocation split across an EAFE ETF (IEFA) and a small EM sleeve (IEMG); optionally a currency-hedged class to strip out FX.",
      pros: ["Wide valuation discount to US", "Weaker-dollar tailwind", "Genuine geographic diversification"],
      cons: ["Persistent US outperformance has burned this trade before", "FX adds volatility unless hedged", "Governance/quality dispersion"],
      whenToUse: "Trimming home bias when the dollar and the US-growth premium look stretched.",
      context: (u) => `A developed-international ETF (IEFA-type) sleeve to trim US home bias and add the valuation-discount / FX angle to ${u.name}.`
    },

    "value-basket": {
      label: "Value basket", complex: false,
      what: "A basket tilted to cheap, cash-generative value stocks.",
      mechanics: "Hold low-multiple, high-free-cash-flow names (financials, energy, industrials, staples) or a value-factor ETF — a bet that the value/growth gap narrows as the cycle broadens.",
      underlying: "Value-factor stocks; or a value ETF (e.g. VTV).",
      tenor: "Strategic to cyclical.",
      example: "A 6–8% value sleeve via a VTV-type ETF plus a few high-conviction names, tilted to financials and energy at ~10–12x earnings.",
      pros: ["Cheap entry multiples, dividend support", "Catches up when breadth/rates rotate", "Diversifies a growth-heavy book"],
      cons: ["Value traps; can stay cheap for years", "Cyclically sensitive", "Lags in a momentum/growth regime"],
      whenToUse: "Rotating part of a growth-concentrated book toward cyclicals and value as earnings broaden.",
      context: (u) => `A value-factor basket (VTV-type) tilted to financials/energy, broadening ${u.name} toward cheaper cyclicals.`
    },

    "infrastructure-fund": {
      label: "Infrastructure fund", complex: false,
      what: "A fund holding contracted, inflation-linked infrastructure assets.",
      mechanics: "Allocate to a listed or open-ended infrastructure fund holding toll roads, midstream, contracted power, airports and utilities. Income is often inflation-linked via concession/contract escalators, with lower drawdown than broad equity.",
      underlying: "Global listed/core infrastructure assets.",
      tenor: "Strategic, multi-year.",
      example: "A 5–8% allocation to a core-infrastructure fund yielding ~4–5% with CPI-linked escalators, as an income-and-ballast diversifier.",
      pros: ["Inflation-linked, contracted income", "Equity-like return with lower drawdown", "Real-asset diversification"],
      cons: ["Rate-sensitive", "Some funds use leverage", "Liquidity varies (open-ended vs listed)"],
      whenToUse: "Income-oriented books wanting real-asset diversification with inflation protection.",
      context: (u) => `A core-infrastructure fund at ~4–5% yield with CPI-linked income — the real-asset ballast around ${u.name}.`
    },

    "private-markets": {
      label: "Private markets", complex: true,
      what: "Access the theme through private equity, credit or infrastructure funds / co-invests.",
      mechanics: "Commit capital to a closed-end private fund (PE, private credit, private infra) or a co-investment. Capital is drawn over time and locked for years; return comes from the illiquidity premium, operational value-add and leverage. Often accessed via feeder/evergreen vehicles for private banks.",
      underlying: "Private companies, assets or loans in the theme.",
      tenor: "Long — 5–10+ year lock-ups (evergreen vehicles offer limited liquidity).",
      example: "A $2–5m commitment to a private-infrastructure fund (e.g. datacenter power), drawn over 3 years, ~12–15% target net IRR, 8–10 year life.",
      pros: ["Illiquidity premium and access to unique assets", "Lower mark-to-market volatility", "Deals not available in public markets"],
      cons: ["Capital locked for years; J-curve", "High fees; wide manager dispersion", "Qualified-investor gating and capital calls"],
      whenToUse: "Long-horizon, professional/qualified books that can fund commitments and tolerate illiquidity for higher returns.",
      context: (u) => `A closed-end or evergreen private fund in ${u.name} (e.g. infra/PE), ~$2–5m committed over a multi-year drawdown for an illiquidity premium.`
    },

    "reit-basket": {
      label: "REIT basket", complex: false,
      what: "A basket of listed real-estate investment trusts for property income.",
      mechanics: "Hold a diversified set of REITs (logistics, datacenter, residential, healthcare) or a REIT ETF. Income from rents distributed as dividends; also a re-rating play as rates peak.",
      underlying: "Listed REITs / REIT ETF (e.g. VNQ), tilted to logistics, datacenter and residential.",
      tenor: "Strategic.",
      example: "A 4–6% REIT sleeve tilted to logistics and datacenter names yielding ~4%, via a VNQ-type ETF plus 2–3 high-quality single REITs.",
      pros: ["Liquid real-estate income", "Re-rating upside as rates peak", "Inflation pass-through via rents"],
      cons: ["Rate-sensitive; hit hard in 2022", "Sector dispersion (office weak)", "Equity-market correlation"],
      whenToUse: "Adding liquid, income-generating real assets — selectively by property type.",
      context: (u) => `A REIT basket (VNQ-type plus logistics/datacenter names) at ~4% yield for liquid real-estate income alongside ${u.name}.`
    },

    "private-real-estate": {
      label: "Private real estate", complex: true,
      what: "Direct/fund ownership of physical real estate for contracted income and lower volatility.",
      mechanics: "Invest via a private real-estate fund (open-ended core or closed-end value-add) holding physical buildings. Income from leases; returns from rent growth, cap-rate moves and (value-add) refurbishment. Valued periodically, so smoother than listed REITs.",
      underlying: "Physical logistics, residential, datacenter or core commercial assets.",
      tenor: "Long; multi-year, with periodic liquidity windows.",
      example: "A 4–6% commitment to a core open-ended real-estate fund yielding ~4–5% with (gated) quarterly redemption windows, tilted to logistics/residential.",
      pros: ["Stable, contracted income; low reported volatility", "Direct inflation hedge via rents", "Diversifies away from listed-market beta"],
      cons: ["Illiquid; redemption gates", "Appraisal lag hides true volatility", "Leverage and sector risk (office)"],
      whenToUse: "Long-horizon income books wanting physical real estate with smoother marks than listed REITs.",
      context: (u) => `A core private real-estate fund at ~4–5% yield (logistics/residential) with periodic liquidity — smoother than listed REITs for the income sleeve.`
    },

    "zero-cost-collar": {
      label: "Zero-cost collar", complex: true,
      what: "Protect a holding by buying a downside put funded by selling an upside call — at ~no premium.",
      mechanics: "On a stock you own, buy a protective put (sets the floor) and simultaneously sell a call (sets the ceiling), choosing strikes so the call premium pays for the put. You're protected below the put strike, give up gains above the call strike, and keep the stock (and usually dividends) in between.",
      underlying: "A concentrated single-stock winner you don't want to sell.",
      tenor: "3–12 months; commonly 6–12m, rolled.",
      example: "Hold a stock at $200: buy a 12-month 90% put ($180 floor), sell a 12-month 115% call ($230 ceiling) for ~zero net premium — protected below $180, capped above $230.",
      pros: ["Locks in a gain without selling (defers tax)", "No upfront premium", "Keeps the position and dividends"],
      cons: ["Upside capped at the call strike", "Possible early assignment / dividend risk", "Complex / OTC — appropriateness gating"],
      whenToUse: "A large, deep-in-the-money single name you want to ride a bit longer but must protect — without triggering a taxable sale.",
      context: (u) => `On your ${u.ticker} winner: buy a ~12-month 90% put and sell a 115% call for ~zero cost — a protected band around the position without selling it.`
    },

    "liquid-alternatives": {
      label: "Liquid alternatives", complex: false,
      what: "Daily-liquid alternative strategies that add an uncorrelated return stream.",
      mechanics: "Allocate to '40 Act / UCITS funds running market-neutral, long-short, managed-futures or multi-strategy approaches. The aim is equity-like return with low correlation to a 60/40, providing ballast in drawdowns.",
      underlying: "Diversified alternative strategies in a liquid fund wrapper.",
      tenor: "Strategic core diversifier; daily liquidity.",
      example: "A 5–10% allocation across a managed-futures fund and a market-neutral fund, targeting ~5–8% return at <0.3 correlation to equities.",
      pros: ["Genuine diversification vs 60/40", "Daily liquidity (unlike hedge funds)", "Ballast in equity drawdowns"],
      cons: ["High strategy/manager dispersion", "Can lag in straight-up equity markets", "Fees above passive"],
      whenToUse: "Adding an uncorrelated sleeve for resilience without locking up capital.",
      context: (u) => `Daily-liquid alt funds (managed futures, market-neutral) as an uncorrelated ballast sleeve alongside ${u.name}.`
    },

    "macro-sleeve": {
      label: "Macro sleeve", complex: false,
      what: "A global-macro / trend allocation that can profit in either direction.",
      mechanics: "Allocate to discretionary global-macro and systematic-trend managers who trade rates, FX, equities and commodities long and short. Designed to be long-volatility / crisis-responsive — often rising when equities fall.",
      underlying: "Cross-asset macro positions (rates, FX, commodities, equity indices).",
      tenor: "Strategic; fund liquidity monthly/daily depending on wrapper.",
      example: "A 5–7% macro/trend sleeve targeting ~7–10% return with positive skew in risk-off (trend has historically gained in sustained equity drawdowns).",
      pros: ["Crisis-alpha / positive drawdown convexity", "Truly uncorrelated return driver", "Can be long or short any market"],
      cons: ["Whipsaw in choppy, range-bound markets", "Manager dispersion; opaque", "Long flat stretches"],
      whenToUse: "Books wanting an explicit hedge/diversifier that tends to perform when equities don't.",
      context: (u) => `A global-macro/trend sleeve (~5–7%) as crisis-responsive ballast that can profit when ${u.name} sells off.`
    },

    "physical-gold": {
      label: "Physical gold / ETC", complex: false,
      what: "Own gold itself via allocated bullion or a physically-backed ETC.",
      mechanics: "Buy allocated/vaulted physical gold or a physically-backed exchange-traded commodity (ETC) that holds bars one-for-one. No income; value tracks the gold price. A debasement / tail hedge.",
      underlying: "Spot gold (XAU).",
      tenor: "Strategic, open-ended hold.",
      example: "A 3–7% allocation via a physically-backed ETC (e.g. 4GLD, GLD) sized to the book's protection gap; held as strategic ballast, not traded.",
      pros: ["Clean tail / debasement hedge", "No credit/counterparty risk (allocated)", "Low correlation to equities and bonds"],
      cons: ["No yield; storage cost", "Long flat/negative stretches possible", "Sized too big, it drags returns"],
      whenToUse: "Strategic protection — sizing gold to a book's protection target as ballast against debasement and geopolitical risk.",
      context: (u) => `A physically-backed gold ETC (GLD/4GLD), 3–7% of book, as strategic ballast — sized to the protection gap, not traded.`
    },

    "gold-accumulator": {
      label: "Gold accumulator", complex: true,
      what: "A structured product to build a gold position at a discount — with conditional obligations.",
      mechanics: "An accumulator lets you buy gold at a fixed strike below spot on a schedule. If gold trades above a knock-out you stop early (capped benefit); if it falls below the strike you're obliged to buy at the strike (often at double size). Effectively, you finance a discounted entry by selling downside.",
      underlying: "Spot gold.",
      tenor: "Typically 3–12 months, with periodic (e.g. weekly) fixings.",
      example: "12-month gold accumulator: buy at 95% of spot weekly, knock-out at 105%; obliged to take 2x if gold is below the 95% strike at a fixing — accumulates ~5% under market while gold is range-bound.",
      pros: ["Builds the position below spot", "Good for systematic accumulation in a range", "No upfront premium"],
      cons: ["Doubled buying into a falling market", "Upside capped by the knock-out", "Complex / OTC — appropriateness and margin"],
      whenToUse: "Professional books wanting to accumulate gold at a discount with a range-bound-to-firm view.",
      context: (u) => `A 12-month gold accumulator buying at ~95% of spot on weekly fixings (knock-out ~105%) to build the gold hedge below market.`
    },

    "fx-forward-collar": {
      label: "FX forward / collar", complex: true,
      what: "Hedge a currency mismatch with an outright forward or a zero-cost FX collar.",
      mechanics: "A forward locks a future exchange rate to fully hedge the mismatch. A collar instead buys a protective option and sells one on the other side (zero premium) to bound the rate within a band — keeping some favourable move while capping adverse moves. Sized to the non-base-currency exposure.",
      underlying: "The currency pair of the mismatch (e.g. EUR/USD for a USD-asset, EUR-base book).",
      tenor: "1–12 months, rolled.",
      example: "Hedge 72% USD exposure in an EUR-base book: sell USD 6-month forward at ~1.08, or a EUR/USD collar protecting beyond 1.12 while giving up gains below 1.04, at zero premium.",
      pros: ["Removes / bounds an unmanaged FX risk", "Collar keeps some upside at no premium", "Deep, liquid market"],
      cons: ["A forward gives up any favourable FX move", "Roll cost / carry (rate differential)", "Complex / OTC for Retail"],
      whenToUse: "Books whose asset currency has drifted far from the base currency, and the rate-differential narrative is turning.",
      context: (u) => `On ${u.name}: a 6-month forward or zero-cost collar to bound the currency mismatch (e.g. EUR/USD), sized to the non-base exposure.`
    },

    "currency-hedged-sleeve": {
      label: "Currency-hedged sleeve", complex: false,
      what: "Hold the same assets in currency-hedged share classes to strip out FX.",
      mechanics: "Swap foreign-currency funds/ETFs into their currency-hedged share class, which rolls FX forwards internally to neutralise currency moves. You keep the asset return and remove the FX return — the non-complex way to hedge a mismatch.",
      underlying: "Existing international equity/bond funds, hedged share class.",
      tenor: "Strategic, ongoing.",
      example: "Move a 10% international-equity sleeve into EUR-hedged share classes so an EUR-base client gets the equity return without USD/EUR noise; ~0.1–0.2% hedging cost.",
      pros: ["Non-complex — Retail-eligible", "Removes FX volatility cleanly", "No derivatives account needed"],
      cons: ["Small ongoing hedging cost/carry", "Gives up favourable FX moves", "Hedges the fund's currency, not full look-through"],
      whenToUse: "The simple, appropriateness-friendly FX hedge — especially for Retail books with a currency mismatch.",
      context: (u) => `Shift the foreign sleeve in ${u.name} into currency-hedged share classes — a Retail-friendly way to strip out the FX mismatch.`
    },

    "healthcare-basket": {
      label: "Healthcare basket", complex: false,
      what: "A basket spanning GLP-1, devices and medical innovation.",
      mechanics: "Hold a curated set of pharma (GLP-1 leaders), medtech/devices and tools/diagnostics names, or a healthcare ETF tilted to innovation. A durable, less-cyclical growth engine that's under-owned in tech-heavy books.",
      underlying: "Healthcare innovators; or a healthcare ETF (XLV / IHI for devices).",
      tenor: "Strategic.",
      example: "A 5–7% sleeve: ~40% GLP-1/pharma leaders, ~35% devices, ~25% tools/diagnostics — via single names plus an IHI-type device ETF.",
      pros: ["Durable secular growth, defensive", "Diversifies away from tech concentration", "Under-owned in most growth books"],
      cons: ["Binary clinical/regulatory risk on single names", "Drug-pricing politics", "GLP-1 valuations elevated"],
      whenToUse: "Diversifying a tech-concentrated growth book into a second, less-correlated growth engine.",
      context: (u) => `A healthcare-innovation basket (GLP-1 + devices + tools, ~XLV/IHI core) as a second growth engine diversifying ${u.name}.`
    },

    "prepaid-variable-forward": {
      label: "Prepaid variable forward", complex: true,
      what: "Monetise a concentrated stock now while deferring the sale and capping the price band.",
      mechanics: "Contract with a bank to deliver a variable number of shares at a future date in exchange for cash up front (typically ~75–90% of value today). It embeds a collar (floor + cap), so you keep gains up to the cap and are protected below the floor — and you get liquidity now without a current taxable sale.",
      underlying: "A large, low-basis concentrated single stock.",
      tenor: "1–3 years.",
      example: "On a $20m stake: a PVF advancing ~85% ($17m) now, floor at 90% / cap at 130%, 2-year; settle in shares or cash at maturity, deferring the capital-gains event.",
      pros: ["Immediate liquidity from a low-basis position", "Downside protection via the floor", "Defers capital-gains tax"],
      cons: ["Upside capped above the cap", "Counterparty risk and complex tax (constructive-sale rules)", "Complex / OTC — sophisticated investors only"],
      whenToUse: "A concentrated, low-basis holder who needs liquidity and protection now but wants to defer the tax hit.",
      context: (u) => `On a low-basis ${u.ticker} stake: a 2-year PVF advancing ~85% cash now with a 90%/130% collar — liquidity and protection without a taxable sale.`
    },

    "protective-put": {
      label: "Protective put", complex: true,
      what: "Buy a put to insure a holding's downside while keeping all the upside.",
      mechanics: "Own the stock and buy a put at a chosen strike. Below the strike the put's gains offset the stock's loss (a hard floor); above it you keep full upside. You pay a premium for the insurance.",
      underlying: "A single stock or index position you want to protect.",
      tenor: "1–6 months, rolled (LEAPS for longer).",
      example: "Hold a stock at $200, buy a 3-month 90% put ($180 strike) for ~2.5% premium — loss capped at ~12.5% over the period, full upside retained.",
      pros: ["Hard floor, uncapped upside", "Simple, exchange-traded", "Keeps the position and dividends"],
      cons: ["Premium is a recurring drag", "Time decay if the stock holds", "Complex for Retail (options approval)"],
      whenToUse: "Protecting a winner through a known risk event (earnings, macro) when you don't want to cap upside.",
      context: (u) => `Buy a 3-month ~90% put on your ${u.ticker} line for ~2–3% — a hard floor through the next event with upside intact.`
    },

    "tax-loss-harvest": {
      label: "Tax-loss harvest", complex: false,
      what: "Realise a paper loss to bank a tax asset, then re-establish the exposure.",
      mechanics: "Sell the underwater position to crystallise the capital loss (offsets gains elsewhere), then re-enter the exposure without breaching wash-sale rules — buy a similar-but-not-identical ETF/peer immediately, or repurchase the same name after 31 days.",
      underlying: "Any underwater position with an unrealised loss.",
      tenor: "Immediate; 30-day wash-sale window.",
      example: "Sell a −28% line to bank the loss, immediately buy a sector ETF or peer for the 31-day window, then optionally rotate back — the loss offsets realised gains, exposure barely interrupted.",
      pros: ["Creates a usable tax asset with no view change", "Keeps market exposure via a proxy", "Cheap and simple"],
      cons: ["Wash-sale rules constrain repurchase", "Proxy tracking error for ~30 days", "Resets the cost basis lower"],
      whenToUse: "Any time you hold a meaningful loss against realised gains and want the tax benefit without abandoning the exposure.",
      context: (u) => `Crystallise the loss in the underwater ${u.name} name, hold a ${u.etf}-type proxy through the 31-day wash-sale window, then rotate back.`
    },

    "peer-rotation": {
      label: "Peer rotation", complex: false,
      what: "Rotate from an underwater name into a comparable peer to keep exposure during a wash-sale window.",
      mechanics: "Sell the loss-making stock and immediately buy a close peer (same sector/factor) so the portfolio keeps its market exposure while the tax loss is banked and the 30-day wash-sale clock runs. Optionally rotate back, or keep the peer if conviction has shifted.",
      underlying: "An underwater single stock and its sector peer.",
      tenor: "Immediate; ~30-day window.",
      example: "Harvest a loss in one pharma name, buy a close pharma peer for 31 days — sector exposure continues, the loss is realised, then decide whether to switch back.",
      pros: ["Maintains exposure precisely", "Banks the tax loss cleanly", "May upgrade to a better name"],
      cons: ["Peer isn't identical (basis/idiosyncratic risk)", "Two sets of transaction costs", "Needs a genuine comparable"],
      whenToUse: "Loss-harvesting a single stock where a close peer keeps the exposure intact through the wash-sale window.",
      context: (u) => `Sell the underwater ${u.name} name into a close sector peer for the 31-day window — exposure intact, loss banked.`
    },

    "bond-swap": {
      label: "Bond swap", complex: false,
      what: "Swap an underwater bond into similar-quality, current-coupon paper.",
      mechanics: "Sell a bond that's down on rates (not credit), bank the loss for tax, and buy a comparable-maturity, comparable-quality bond at today's higher coupon. Duration and credit profile stay similar; you pick up carry plus a tax loss with no real change in risk.",
      underlying: "An underwater high-quality bond (Treasury / IG).",
      tenor: "Matched to the bond sold.",
      example: "Sell a UST 1.25% '31 down 14% (a rate, not credit, loss), buy a current-coupon ~4.4% Treasury of similar maturity — bank the loss, lift coupon income by ~3pts.",
      pros: ["Tax loss with no real risk change", "Materially higher carry", "Stays in high quality"],
      cons: ["Only works on rate-driven losses", "Small bid/offer cost", "No benefit if you can't use the loss"],
      whenToUse: "Underwater high-quality bonds where the loss is rate-driven — harvest it and pick up today's coupon.",
      context: (u) => `Sell the underwater bond and roll into current-coupon paper of the same maturity/quality — bank the loss, lift carry by ~3pts.`
    },

    "current-coupon-ladder": {
      label: "Current-coupon ladder", complex: false,
      what: "Reinvest into a ladder of bonds issued at today's higher coupons.",
      mechanics: "Build a maturity ladder using newly-issued, current-coupon bonds so each rung carries today's yield. Often the destination of a bond swap — replaces low-coupon legacy holdings with market-rate income across the curve.",
      underlying: "Current-coupon Treasuries / IG across maturities.",
      tenor: "Ladder ~1–7 (or 2–10) years.",
      example: "Redeploy proceeds into a 2–10y ladder of current-coupon bonds averaging ~4.5% YTM, one rung per maturity, replacing ~1–2% legacy coupons.",
      pros: ["Locks today's higher coupons", "Smooths reinvestment risk", "Predictable cashflow"],
      cons: ["Mark-to-market risk if yields rise further", "Needs scale to diversify", "Manual rolls"],
      whenToUse: "The reinvestment leg after harvesting or swapping legacy low-coupon bonds.",
      context: (u) => `Reinvest proceeds into a 2–10y current-coupon ladder at ~4.5% YTM, replacing legacy low-coupon paper.`
    },

    "staged-trim": {
      label: "Staged trim", complex: false,
      what: "Reduce a winner gradually on a pre-set schedule rather than all at once.",
      mechanics: "Sell the position down in tranches against a rule (calendar, price levels, or % steps) to de-risk a concentrated winner while spreading the tax hit across periods and avoiding market-timing. Proceeds rotate into diversifiers.",
      underlying: "A concentrated, appreciated single-stock winner.",
      tenor: "Spread over months / quarters / tax years.",
      example: "Trim a 22% position by 3% of book per quarter over a year into an equal-weight core — cutting single-name risk and splitting the gain across two tax years.",
      pros: ["Non-complex — no options/approval needed", "Spreads tax across periods", "Removes timing risk vs one big sale"],
      cons: ["Stays exposed while trimming", "Realises gains (taxable)", "Requires discipline to follow the schedule"],
      whenToUse: "Right-sizing a concentrated winner when a collar/derivative is unavailable or unwanted (e.g. Retail).",
      context: (u) => `Trim the concentrated ${u.ticker} winner ~3% of book per quarter into a diversified core — spreading the gain across tax years.`
    },

    "tbill-ladder": {
      label: "T-bill / muni ladder", complex: false,
      what: "A short ladder of Treasury bills (or munis) to earn yield on idle cash.",
      mechanics: "Buy T-bills maturing in staggered weeks/months (e.g. 1/3/6/12-month) so cash rolls continuously at the front-end yield while staying liquid. For taxable books a muni version delivers tax-exempt income. Removes cash drag without taking duration or credit risk.",
      underlying: "Treasury bills (or short munis).",
      tenor: "Front-end, ~1–12 months, rolling.",
      example: "Ladder idle cash across 1/3/6/12-month T-bills at ~4.8–5.1%; for a high-tax book use short munis at ~3.6% tax-exempt (≈5.9% taxable-equivalent).",
      pros: ["Earns ~5% on otherwise idle cash", "Stays liquid (rungs mature constantly)", "No duration/credit risk; muni option for tax"],
      cons: ["Reinvestment risk as bills mature into cuts", "Yields fall with the front end", "Slightly more admin than a money fund"],
      whenToUse: "Putting idle cash to work while preserving liquidity, or as the liquidity leg of a liability plan.",
      context: (u) => `Ladder idle cash across 1/3/6/12-month T-bills (~5%), or short munis for taxable books — yield without giving up liquidity.`
    },

    "short-duration-bonds": {
      label: "Short-duration bonds", complex: false,
      what: "Step from cash into short high-quality bonds for a bit more yield with little rate risk.",
      mechanics: "Hold 1–3 year Treasuries / IG corporates (single bonds or a short-duration ETF). Captures most of the yield with low price sensitivity to rates — a low-risk extension of cash that locks yield a little longer than bills.",
      underlying: "1–3y Treasuries / IG corporates; or a short-duration bond ETF.",
      tenor: "1–3 years.",
      example: "Move idle cash into a 1–3y IG bond ETF at ~4.9% YTM, ~1.8y duration — ~+20–40bp over bills, locked a bit longer with minimal rate risk.",
      pros: ["More yield than cash/bills, low volatility", "Locks yield beyond the very front end", "Liquid via ETFs"],
      cons: ["Small mark-to-market risk", "Modest credit risk on corporates", "Less liquid than pure bills"],
      whenToUse: "Reducing cash drag while keeping rate risk minimal and locking yield slightly longer than T-bills.",
      context: (u) => `Shift idle cash into a 1–3y high-quality bond sleeve (~4.9% YTM, ~1.8y duration) — a low-risk step out of cash.`
    },

    "cash-secured-puts": {
      label: "Cash-secured puts", complex: true,
      what: "Get paid premium to set a limit-buy on a name you'd happily own lower.",
      mechanics: "Sell (write) a put on a stock you want to buy, setting aside the cash to purchase it at the strike. You collect premium; if the stock stays above the strike you keep it as income, if it falls below you buy the shares at the strike (your target entry) — effectively a paid limit order.",
      underlying: "A name you'd add to on a dip; or an index.",
      tenor: "30–60 day options, rolled.",
      example: "Sell a 1-month put ~5% below spot on a name you want, collect ~1% premium; assigned → you own it ~5% cheaper, not assigned → ~12% annualised income on the reserved cash.",
      pros: ["Earns income on cash earmarked to invest", "Disciplined, below-market entry", "Monetises the cash sleeve"],
      cons: ["Obliged to buy in a fast decline (could keep falling)", "Upside above premium foregone if not assigned", "Complex / OTC — options approval"],
      whenToUse: "Deploying idle cash into names you want to own anyway, getting paid to wait for a better entry.",
      context: (u) => `Sell 1-month puts ~5% below spot on ${u.name} names you'd add lower — ~1% premium a month, or assignment at your target entry.`
    },

    "securities-backed-line": {
      label: "Securities-backed line (SBL)", complex: false,
      what: "Borrow against the portfolio instead of selling appreciated assets.",
      mechanics: "A revolving credit line collateralised by marketable securities; advance rate typically ~50–70% of eligible holdings. Funds a liability (tax, mortgage, purchase) without triggering a taxable sale or disturbing the strategy. Variable rate; subject to maintenance/margin call if collateral falls.",
      underlying: "The diversified portfolio as collateral.",
      tenor: "Revolving / on-demand.",
      example: "Draw a $2.4m SBL at ~SOFR+1.5% to fund a Q3 tax bill against a $96m book (well within a ~50% advance rate) — avoiding a sale of appreciated stock into the event.",
      pros: ["No taxable sale; strategy stays intact", "Fast, flexible liquidity", "Cheaper than disturbing low-basis positions"],
      cons: ["Floating rate; cost rises with rates", "Margin-call risk if collateral drops", "Adds leverage to the book"],
      whenToUse: "Meeting a near-term liability when selling appreciated assets would be tax-inefficient and the book can support the collateral.",
      context: (u) => `Draw an SBL at ~SOFR+1.5% against the book to fund the liability — no taxable sale, strategy untouched.`
    },

    "diversifiers": {
      label: "Cross-asset diversifiers", complex: false,
      what: "A blend of uncorrelated assets/strategies added as portfolio ballast.",
      mechanics: "Combine return streams with low correlation to equities — gold, trend/macro, market-neutral and high-quality duration — sized to lower whole-portfolio drawdown rather than to maximise return. The point is the correlation, not any single sleeve.",
      underlying: "Gold + managed futures/macro + quality bonds (a blend).",
      tenor: "Strategic core.",
      example: "A 10–15% diversifier block: ~5% gold, ~5% managed-futures, ~5% high-quality duration — aiming to cut 60/40 drawdown by a few points at similar return.",
      pros: ["Lowers drawdown and volatility", "Multiple uncorrelated drivers", "Improves risk-adjusted return"],
      cons: ["Drags in straight-up bull markets", "Needs rebalancing discipline", "Instrument/manager selection matters"],
      whenToUse: "Building genuine resilience into a book that's effectively all equity beta.",
      context: (u) => `A cross-asset diversifier block (gold + trend + quality duration, ~10–15%) to cut whole-book drawdown around ${u.name}.`
    },

    "extend-duration": {
      label: "Extend duration", complex: false,
      what: "Move out of cash/bills into intermediate bonds to lock yields and add ballast.",
      mechanics: "Lengthen the average maturity of the fixed-income sleeve from the front end (bills) into ~5–10y high-quality bonds. Locks today's yield for longer and adds duration that appreciates if the cutting cycle drives yields down — a genuine equity diversifier.",
      underlying: "Intermediate Treasuries / IG corporates (or a core bond ETF).",
      tenor: "~5–10 year duration target.",
      example: "Rotate part of a 10% cash/bill holding into a 5–10y bond sleeve at ~4.4% YTM (~6y duration); a 1% fall in yields would add ~6% price upside on top of carry.",
      pros: ["Locks yields before cuts", "Convexity / upside if yields fall", "Strong equity diversifier"],
      cons: ["Mark-to-market loss if yields rise", "Gives up some front-end yield today", "Duration cuts both ways"],
      whenToUse: "Reducing reinvestment risk in cash/bills as the cutting cycle approaches; adding ballast to an equity-heavy book.",
      context: (u) => `Extend from cash/bills into a 5–10y high-quality bond sleeve (~4.4% YTM, ~6y duration) — lock yield and add ballast to ${u.name}.`
    },

    "listed-infrastructure": {
      label: "Listed infrastructure", complex: false,
      what: "Listed equities of infrastructure operators for liquid, inflation-linked income.",
      mechanics: "Own listed owners/operators of toll roads, midstream, contracted power, airports and towers — via single names or an infrastructure-equity ETF. Concession/contract structures pass inflation through to revenue; lower drawdown than broad equity, with daily liquidity (unlike private infra).",
      underlying: "Listed infrastructure equities / ETF (e.g. IGF).",
      tenor: "Strategic.",
      example: "A 5–8% allocation to listed infrastructure (an IGF-type ETF plus 2–3 midstream/toll-road names) yielding ~3.5–4.5% with CPI-linked revenue escalators.",
      pros: ["Inflation-linked, contracted income", "Daily liquidity vs private markets", "Lower-drawdown diversifier"],
      cons: ["Rate-sensitive", "Equity-market correlation in stress", "Regulatory/concession risk"],
      whenToUse: "Adding real-asset income with liquidity — the listed alternative to a private-infrastructure commitment.",
      context: (u) => `A listed-infrastructure sleeve (IGF-type + midstream/toll roads, ~5–8%) at ~4% yield with CPI-linked income — liquid real-asset ballast.`
    },

    "phoenix-autocall": {
      label: "Autocall (ACM+ / Phoenix)",
      what: "A high-coupon income note that pays conditional coupons and can redeem early — the desk's core income structure on a flat-to-up view.",
      mechanics: "An Autocall Market Plus (ACM+) / Phoenix note on a single name or worst-of basket. On each observation it pays a fixed coupon if the underlying is above the coupon barrier (e.g. 70–80%); if it's at/above the autocall level (usually the start level) the note redeems early at par + coupon. At maturity capital is returned in full unless the underlying is below the capital barrier (e.g. 65–80%), where you take the loss. 'Phoenix / memory' means missed coupons are recovered once the barrier is regained.",
      underlying: "A single stock or worst-of basket of names you'd be happy to own — ideally range-bound to firm.",
      tenor: "12 months with quarterly observations. Why: a year banks a meaningful coupon and the quarterly autocall gives four early-exit chances; you re-underwrite the names annually rather than locking in for years.",
      example: "Recommended on a constructive single name: 1-year ACM+, 80% capital barrier, ~12–16% p.a. coupon (memory) paid quarterly while above 80%, autocall at ≥100% on any quarterly observation. Multi-name baskets pay more (see the HALO basket).",
      pros: ["High contractual income on a flat/range-bound view", "Soft barrier (e.g. 80%) gives a cushion before capital is at risk", "Early autocall frees capital; packaged security — Retail eligible"],
      cons: ["Capital at risk below the barrier (worst-of is more so)", "Upside capped at the coupons — no equity participation", "Issuer credit risk; hold to call/maturity"],
      whenToUse: "Generating yield on names or baskets you expect to trade sideways-to-up within a band — not for a strongly directional view.",
      context: (u) => `On ${u.ticker} (or a worst-of basket): a 1-year ACM+, 80% barrier, rich quarterly memory coupon, autocall at the start level — income on a range-bound ${u.name} view.`
    },

    "call-spread": {
      label: "Call spread", complex: true,
      what: "A cheaper, capped way to take bullish upside using two call options.",
      mechanics: "Buy a call at a lower strike and sell a call at a higher strike (same expiry). The sold call cheapens the position; you profit between the strikes and your gain is capped at the upper strike. Defined cost (net premium) and defined max payoff — leveraged participation in a band.",
      underlying: "A single stock or index you're moderately bullish on.",
      tenor: "1–12 months.",
      example: "On an index at 100: buy the 100-strike call, sell the 115-strike call, net premium ~4% — max ~11% payoff if it's ≥115 at expiry, for a defined ~4% outlay.",
      pros: ["Cheap leveraged upside; defined risk", "Lower cost than an outright call", "Good for a moderate, bounded view"],
      cons: ["Upside capped at the short strike", "Premium lost if it doesn't rise (time decay)", "Complex / OTC — options approval"],
      whenToUse: "A defined-risk bullish tactical view where you expect a move to a level, not a melt-up — or to add cheap upside without full capital.",
      context: (u) => `On ${u.index}: buy the 100 / sell the 115 call (net ~4%) for capped, defined-risk upside to a ${u.name} move — without committing full capital.`
    },

    "leveraged-certificate": {
      label: "Leveraged certificate",
      what: "An exchange-traded certificate giving geared exposure to an underlying.",
      mechanics: "A bank-issued tracker/factor certificate delivering a multiple (e.g. 2–3x) of the underlying's move, or geared participation above a strike (with a knock-out level). Daily-leveraged factor certs reset each day (path-dependent); participation certs gear a single move. You take issuer credit risk.",
      underlying: "Single stock, index or commodity.",
      tenor: "Open-ended (factor) or fixed (participation); a knock-out can end it early.",
      example: "A 2x long factor certificate on a semis index: a +5% day → ~+10%, a −5% day → ~−10%; knock-out if the index falls ~50% intraday — tactical geared exposure, not a hold.",
      pros: ["Capital-efficient leverage in one liquid line", "No margin account / maintenance calls", "Exchange-traded packaged security — Retail eligible"],
      cons: ["Daily reset decays in choppy markets (factor certs)", "Knock-out can wipe the position", "Issuer credit risk; a complex, geared product"],
      whenToUse: "Short-term, tactical geared expression of a strong directional view — actively monitored, not buy-and-hold.",
      context: (u) => `A 2x factor certificate on ${u.index} for tactical geared exposure to ${u.name} — monitored daily, minding reset decay and the knock-out.`
    },

    "halo-basket": {
      label: "HALO basket (ACM+)",
      what: "The desk's flagship structured note: a high-coupon autocall on an equally-weighted basket of Constellation Energy, MP Materials and Caterpillar.",
      mechanics: "An Autocall Market Plus (ACM+) referencing an equally-weighted basket of three names — CEG (power), MP Materials (rare-earth materials) and CAT (industrials), one-third each. It pays a fixed 24% p.a. coupon in USD on each observation while the basket sits above 80% of its start level, and autocalls (redeems early at par + coupon) if the basket is back at/above its start level on an observation date. At maturity capital is returned in full unless the basket closes below the 80% barrier, in which case you take the basket's loss. The combined volatility of three high-beta names with different drivers is what funds the rich coupon.",
      underlying: "Equally-weighted basket of CEG · MP Materials · CAT (one-third each), USD.",
      tenor: "12 months, quarterly autocall observations. Why: long enough to bank a serious coupon, short enough to re-underwrite three fast-moving names each year.",
      example: "Equal-weight basket ACM+: 24% p.a. coupon (≈6%/quarter) paid while the basket ≥80% of strike; autocall at ≥100% of the basket on any quarterly observation; 80% capital barrier at maturity with memory coupon. A ~$2–3m clip as the core of the structured-notes sleeve.",
      pros: ["Very high 24% USD coupon vs a single-name autocall", "20% cushion before any capital is at risk; memory coupon", "Packaged note — MiFID Retail eligible (it is not OTC)", "Early autocall frees capital to redeploy"],
      cons: ["Capital at risk if the equally-weighted basket ends more than 20% down", "Three high-beta names — the basket can move sharply", "Coupon-capped — no equity upside beyond the 24%", "Issuer credit risk; hold to call/maturity"],
      whenToUse: "Books under their structured-notes target wanting high contractual USD income, comfortable with a 20% cushion on an equally-weighted basket of CEG, MP Materials and CAT.",
      context: (u) => `Sits in the structured-notes sleeve: 24% p.a. USD coupon on an equally-weighted basket of CEG / MP Materials / CAT, 80% barrier, 1-year — a high-income complement to the ${u.name} exposure.`
    },

    "reverse-convertible": {
      label: "Reverse convertible (RevCon / FCN)",
      what: "A high fixed-coupon income note on a single name, where you risk being delivered the stock if it falls through a barrier.",
      mechanics: "A short-dated note (RevCon, or a Fixed-Coupon Note / FCN) that pays a high guaranteed coupon. If the underlying never breaches the knock-in barrier (e.g. 70–80%) you get coupon + full capital back. If it breaches and ends below the strike, the note converts — you're delivered the shares (or the cash loss) at the strike. Effectively you're paid a rich coupon for selling a downside put.",
      underlying: "A single stock you'd be willing to own lower (often an underwater name you'd average into).",
      tenor: "3–6 months. Why: short tenors keep the conversion risk tightly defined and let you re-coupon frequently; it's an income trade, not a long hold.",
      example: "Recommended on a name you'd add to: 6-month RevCon, 75% knock-in barrier, ~10–12% p.a. coupon, USD — keep coupon + capital unless it ends down >25%, in which case you own the stock at the strike (your intended add level).",
      pros: ["High fixed coupon, paid regardless of direction (above the barrier)", "Defined: worst case is owning a stock you wanted anyway", "Packaged security — Retail eligible (it is not OTC)"],
      cons: ["Capped upside (you only ever earn the coupon)", "Converts to shares / takes the loss below the barrier", "Issuer credit risk; short tenor means frequent re-underwriting"],
      whenToUse: "Income on a name you'd be happy to own at a lower level — turning a 'what should I average down to?' decision into a paid one.",
      context: (u) => `On ${u.ticker}: e.g. a 6-month RevCon, 75% barrier, ~10–12% coupon — income now, or you own ${u.name} at your add level if it falls through.`
    },

    "capital-protected-note": {
      label: "Capital-protected note",
      what: "A note that returns 100% of capital at maturity plus a share of the upside — participation with a hard floor.",
      mechanics: "The issuer combines a zero-coupon bond (which accretes back to par at maturity, providing the 100% protection) with a call option funded by the remaining premium (which provides the upside). You get a participation rate in the underlying's gain (often <100%, sometimes capped); if the underlying falls you still get your capital back at maturity. The longer tenor is what makes the zero-coupon + option affordable.",
      underlying: "A broad equity index (or basket) — protection is cheapest on liquid indices.",
      tenor: "2–3 years. Why: the protection is funded by the discount on a zero-coupon bond, which needs time to accrete back to par — too short and there's no premium left to buy meaningful upside.",
      example: "Recommended for protected growth: 3-year note, 100% capital protection at maturity, ~60–70% participation in the index upside (uncapped or a generous cap), USD/EUR — full downside protection, a defined share of the rally.",
      pros: ["100% capital back at maturity, whatever the market does", "Keeps equity upside (at a participation rate)", "Packaged security — Retail eligible; the most conservative structured note"],
      cons: ["Participation is below 100% (and may be capped)", "Protection only holds AT maturity; no dividends", "Issuer credit risk; ties up capital for 2–3 years"],
      whenToUse: "Putting cautious or drawdown-sensitive capital to work in equities with a guaranteed floor — or for clients who can't stomach a loss but need growth.",
      context: (u) => `On ${u.index}: a 3-year note, 100% capital protected with ~65% participation — protected access to ${u.name} for capital that can't take a drawdown.`
    },

    "dual-currency-deposit": {
      label: "Dual-currency deposit (DCD)", complex: true,
      what: "A short FX-linked deposit that pays an enhanced coupon in exchange for the bank's right to repay you in the weaker of two currencies.",
      mechanics: "You deposit in a base currency and pick an alternate currency and a strike. You earn a coupon well above the cash rate (funded by the rate differential plus the option premium you're effectively selling). At maturity: if the alternate currency hasn't weakened past the strike you get principal + coupon back in your base; if it has, you're repaid (principal + coupon) converted into the alternate currency at the strike — i.e. you end up holding the currency you'd have been happy to own at that level. A bilateral, OTC structure — not Retail-eligible.",
      underlying: "A liquid currency pair you're comfortable holding either side of (e.g. EUR/USD, USD/JPY).",
      tenor: "1–3 months, rolled — short enough to keep the conversion risk tightly defined and re-coupon often.",
      example: "EUR-base, USD alternate, 1-month, strike near spot: earn ~6–9% annualised vs ~2% cash; if EUR/USD ends below the strike you keep coupon + EUR, if above you take USD at the strike — your intended add level.",
      pros: ["Enhanced yield from the wide rate differential", "Worst case is owning a currency you wanted at a level you chose", "Short, repeatable income on a range view"],
      cons: ["Converted into the weaker currency if the pair moves through the strike (capped upside, real FX risk)", "OTC / complex — not MiFID Retail eligible; needs Professional classification", "Bank credit and roll risk"],
      whenToUse: "Professional income books wanting to monetise a wide rate differential on a pair they'd hold either side of — get paid to wait for a target FX level.",
      context: (u) => `On ${u.name}: a 1-month dual-currency deposit at a strike near spot — an enhanced coupon for agreeing to convert at your target level if the pair moves through it.`
    },

    "fx-option": {
      label: "FX option (vanilla call / put)", complex: true,
      what: "A short-dated, defined-risk directional bet on a currency pair via a bought call or put.",
      mechanics: "Buy a vanilla OTC FX option — a put to play downside in the pair, a call to play upside — struck a touch out-of-the-money for a short tenor. You pay a premium (your entire max loss); the payoff is geared to a fast move toward the strike and beyond. Tactical: defined entry near spot, a take-profit / early-unwind level, and a hard time-stop at expiry.",
      underlying: "A liquid G10 pair (e.g. USD/JPY, EUR/USD, GBP/USD).",
      tenor: "2–6 weeks — short-dated, sized to a specific catalyst (a central-bank meeting, intervention threshold).",
      example: "Buy 4–6wk ~1–2% OTM options on the pair for ~0.8–1.2% premium; unwind into the target, let it expire (max loss = premium) if the move doesn't come.",
      pros: ["Defined risk — premium is the most you can lose", "Geared to a fast directional move", "Clean tactical entry/target/stop discipline"],
      cons: ["Premium decays (theta) if the move stalls", "Needs the catalyst to land inside the tenor", "OTC / complex — not MiFID Retail eligible"],
      whenToUse: "A short-dated, high-conviction directional FX view around a dated catalyst — when you want leverage with a capped, known downside.",
      context: (u) => `Short-dated (4–6wk) ${u.ticker} options struck ~1–2% out-of-the-money (~1% premium) — geared to a fast directional move, premium-at-risk only; unwind on the target break.`
    },

    "fx-option-spread": {
      label: "FX option spread (call / put spread)", complex: true,
      what: "A cheaper, fully-defined-risk FX directional play using two options — buy one, sell a further-OTM one.",
      mechanics: "Buy a near-the-money option and sell one further out-of-the-money (same expiry, same pair) — a call spread for upside, a put spread for downside. The sold leg cheapens the trade; profit accrues between the strikes and is capped at the far strike. Net premium is the entire cost and max loss.",
      underlying: "A liquid G10 pair with a defined target band.",
      tenor: "4–6 weeks.",
      example: "Buy the near-the-money / sell ~3% OTM strike on the pair for ~0.6–0.8% net — capped payoff in the target band, max loss = the net premium.",
      pros: ["Cheaper than an outright option; fully defined risk", "Ideal when you expect a move to a level, not a melt", "Lower theta drag than a single option"],
      cons: ["Upside capped at the short strike", "Still expires worthless if the pair doesn't move", "OTC / complex — not Retail eligible"],
      whenToUse: "A defined-risk, bounded directional FX view to a specific level over a few weeks.",
      context: (u) => `A 4–6wk ${u.ticker} option spread (buy near-the-money, sell ~3% further OTM) for ~0.7% net — capped, defined-risk payoff in the target band.`
    },

    "fx-risk-reversal": {
      label: "FX risk reversal", complex: true,
      what: "A geared, near-zero-cost directional FX trade — sell an OTM option on one side to fund buying one on the other.",
      mechanics: "To play upside in a pair: sell an OTM put and use the premium to buy an OTM call (reverse for downside) — for ≈zero net cost. You get leveraged participation beyond the long strike; the risk is being assigned/long the pair at the short strike if it moves against you (so it carries real directional risk, not just premium).",
      underlying: "A liquid G10 pair with a clear directional lean and carry.",
      tenor: "4–6 weeks, rolled.",
      example: "Sell the ~2% OTM put / buy the ~2% OTM call (≈zero premium); profit above the call strike, but obliged at the put strike if it sells off — unwind on the target or if spot breaks the short strike.",
      pros: ["≈zero upfront premium; geared to the directional view", "Leans with the carry/skew", "Efficient way to express a strong lean"],
      cons: ["Assignment risk at the short strike — real downside, not just premium", "Skew can move against you", "OTC / complex — not Retail eligible"],
      whenToUse: "A strong, carry-supported directional FX lean where you'll accept being put the pair at a worse level in exchange for zero-cost upside.",
      context: (u) => `A 4–6wk ${u.ticker} risk reversal — sell the OTM put, buy the OTM call (≈zero premium) — geared and directional, with assignment risk at the short strike; unwind on the target.`
    },

    "fx-strangle": {
      label: "FX strangle / straddle (long vol)", complex: true,
      what: "A long-volatility FX trade that profits from a large move in EITHER direction — own an OTM put and an OTM call.",
      mechanics: "Buy an out-of-the-money put AND an out-of-the-money call on the pair (a strangle; same strike = a straddle), short-dated into an event. You're long volatility: a big move either way pays; the cost (both premiums) is the max loss and decays if the pair sits still. Non-directional — the bet is on the SIZE of the move, not its sign.",
      underlying: "A liquid pair pinned into a binary event (e.g. a central-bank decision, an intervention threshold).",
      tenor: "2–4 weeks — tight around the event.",
      example: "Buy a 2–4wk strangle (~OTM put + ~OTM call, ~1.2–1.5% total) — profit on a break beyond either wing, max loss = both premiums if it expires inside.",
      pros: ["Profits on a large move either direction", "Defined risk (both premiums)", "Ideal around a binary event with uncertain sign"],
      cons: ["Needs a BIG move to beat the double premium", "Theta-heavy — decays fast if it sits", "OTC / complex — not Retail eligible"],
      whenToUse: "A high-uncertainty binary FX event where the move could be large but the direction is genuinely two-sided.",
      context: (u) => `A 2–4wk ${u.ticker} strangle — buy an OTM put AND an OTM call (~1.3% total) — long volatility into the event; profits on a large move either way, premium decays if it sits.`
    }
  };

  /* --------------------------- alias table -------------------------------- */
  /* every raw string used anywhere in the app, normalised -> canonical id */
  const ALIAS = {
    "direct equity": "direct-equity",
    "index core": "index-core",
    "etf / fund": "index-core",
    "structured note": "structured-note",
    "structured re-entry note": "structured-note",
    "call overwrite": "call-overwrite",
    "covered calls": "call-overwrite",
    "load-growth utilities": "utility-basket",
    "utility basket": "utility-basket",
    "thematic basket": "thematic-basket",
    "govt / ig bonds": "govt-ig-bonds",
    "bond ladder": "bond-ladder",
    "ig corporates": "ig-corporates",
    "securitised sleeve": "securitised-sleeve",
    "equal-weight index": "equal-weight-index",
    "quality basket": "quality-basket",
    "quality / equal-weight basket": "quality-basket",
    "international etf": "international-etf",
    "value basket": "value-basket",
    "infrastructure fund": "infrastructure-fund",
    "private markets": "private-markets",
    "reit basket": "reit-basket",
    "private real estate": "private-real-estate",
    "buffered note": "buffered-note",
    "buffered notes": "buffered-note",
    "buffered re-entry note": "buffered-note",
    "zero-cost collar": "zero-cost-collar",
    "collar": "zero-cost-collar",
    "liquid alternatives": "liquid-alternatives",
    "macro sleeve": "macro-sleeve",
    "physical / etc": "physical-gold",
    "gold (physical/etc)": "physical-gold",
    "gold accumulator": "gold-accumulator",
    "fx forward / collar": "fx-forward-collar",
    "fx option (vanilla call / put)": "fx-option",
    "fx option spread (call / put spread)": "fx-option-spread",
    "fx risk reversal": "fx-risk-reversal",
    "fx strangle / straddle (long vol)": "fx-strangle",
    "dual currency deposit / dcd": "dual-currency-deposit",
    "dual-currency deposit (dcd)": "dual-currency-deposit",
    "dual currency deposit": "dual-currency-deposit",
    "dcd": "dual-currency-deposit",
    "currency-hedged sleeve": "currency-hedged-sleeve",
    "healthcare basket": "healthcare-basket",
    "prepaid variable forward": "prepaid-variable-forward",
    "protective put": "protective-put",
    "tax-loss harvest": "tax-loss-harvest",
    "loss harvest": "tax-loss-harvest",
    "peer rotation": "peer-rotation",
    "bond swap": "bond-swap",
    "current-coupon ladder": "current-coupon-ladder",
    "staged trim": "staged-trim",
    "t-bill ladder": "tbill-ladder",
    "t-bill / muni ladder": "tbill-ladder",
    "short-duration bonds": "short-duration-bonds",
    "cash-secured puts": "cash-secured-puts",
    "securities-backed line (sbl)": "securities-backed-line",
    "diversifiers": "diversifiers",
    "cross-asset diversifiers": "diversifiers",
    "extend duration": "extend-duration",
    "listed infrastructure": "listed-infrastructure",
    "phoenix autocall": "phoenix-autocall",
    "autocall market plus": "phoenix-autocall",
    "acm+": "phoenix-autocall",
    "call spread": "call-spread",
    "leveraged certificate": "leveraged-certificate",
    "halo basket (acm+)": "halo-basket",
    "halo basket": "halo-basket",
    "reverse convertible": "reverse-convertible",
    "reverse convertible (revcon / fcn)": "reverse-convertible",
    "capital-protected note": "capital-protected-note",
    "capital protected note": "capital-protected-note"
  };

  function norm(s) { return String(s == null ? "" : s).toLowerCase().replace(/\s+/g, " ").trim(); }

  /* keyword fallback so user-added ideas (arbitrary structure strings) still
     resolve to a real, sensible entry rather than the generic placeholder. */
  function keywordResolve(n) {
    const has = (k) => n.indexOf(k) !== -1;
    // tactical FX option structures resolve FIRST (before generic call-spread / put / collar)
    if (has("risk reversal") || has("seagull")) return "fx-risk-reversal";
    if (has("strangle") || has("straddle")) return "fx-strangle";
    if (has("fx") && has("spread")) return "fx-option-spread";
    if (has("fx") && (has("put") || has("call") || has("option"))) return "fx-option";
    if (has("collar")) return "zero-cost-collar";
    if (has("halo")) return "halo-basket";
    if (has("range accrual") || has("accrual")) return "range-accrual";
    if (has("buffer")) return "buffered-note";
    if (has("reverse convertible") || has("revcon") || has("fcn")) return "reverse-convertible";
    if (has("capital-protected") || has("capital protected") || has("cpn")) return "capital-protected-note";
    if (has("autocall") || has("autocallable") || has("acm+") || has("phoenix")) return "phoenix-autocall";
    if (has("covered call") || has("overwrite")) return "call-overwrite";
    if (has("call spread") || (has("spread") && has("call"))) return "call-spread";
    if (has("certificate")) return "leveraged-certificate";
    if (has("variable forward") || has("prepaid")) return "prepaid-variable-forward";
    if (has("cash-secured") || has("secured put")) return "cash-secured-puts";
    if (has("protective put") || (has("put") && has("protect"))) return "protective-put";
    if (has("accumulator")) return "gold-accumulator";
    if (has("securities-backed") || has("sbl")) return "securities-backed-line";
    if (has("bond swap") || has("swap")) return "bond-swap";
    if (has("current-coupon")) return "current-coupon-ladder";
    if (has("t-bill") || has("tbill") || (has("bill") && has("ladder"))) return "tbill-ladder";
    if (has("ladder")) return "bond-ladder";
    if (has("short-duration") || has("short duration")) return "short-duration-bonds";
    if (has("extend") && has("duration")) return "extend-duration";
    if (has("duration")) return "extend-duration";
    if (has("securitised") || has("securitized") || has("clo") || has("mbs")) return "securitised-sleeve";
    if (has("ig ") || has("corporate")) return "ig-corporates";
    if (has("govt") || has("government") || has("treasur") || has("gilt")) return "govt-ig-bonds";
    if (has("loss harvest") || has("tax-loss") || has("harvest")) return "tax-loss-harvest";
    if (has("peer")) return "peer-rotation";
    if (has("trim")) return "staged-trim";
    if (has("structured") || has("note")) return "structured-note";
    if (has("gold") || has("physical") || has("etc")) return "physical-gold";
    if (has("dual currency") || has("dual-currency") || has("dcd") || has("dcs")) return "dual-currency-deposit";
    if (has("fx") || has("forward") || has("currency overlay")) return "fx-forward-collar";
    if (has("hedged")) return "currency-hedged-sleeve";
    if (has("reit")) return "reit-basket";
    if (has("private real")) return "private-real-estate";
    if (has("private")) return "private-markets";
    if (has("listed infra")) return "listed-infrastructure";
    if (has("infrastructure") || has("infra")) return "infrastructure-fund";
    if (has("equal-weight") || has("equal weight")) return "equal-weight-index";
    if (has("quality")) return "quality-basket";
    if (has("value")) return "value-basket";
    if (has("international") || has("ex-us") || has("ex us")) return "international-etf";
    if (has("healthcare") || has("health")) return "healthcare-basket";
    if (has("utility") || has("utilities")) return "utility-basket";
    if (has("macro") || has("trend")) return "macro-sleeve";
    if (has("alternativ") || has("hedge fund") || has("market-neutral")) return "liquid-alternatives";
    if (has("diversif")) return "diversifiers";
    if (has("basket")) return "thematic-basket";
    if (has("etf") || has("fund") || has("index")) return "index-core";
    if (has("direct") || has("equity") || has("shares")) return "direct-equity";
    return null;
  }

  function resolve(raw) {
    const n = norm(raw);
    if (ALIAS[n]) return ALIAS[n];
    return keywordResolve(n);
  }

  /* MiFID class by canonical id — structured products are Retail-eligible
     packaged securities; OTC derivatives are not; private = qualified-investor. */
  const STRUCTURED_IDS = ["structured-note", "buffered-note", "phoenix-autocall", "leveraged-certificate",
    "halo-basket", "reverse-convertible", "capital-protected-note"];
  const OTC_IDS = ["call-overwrite", "zero-cost-collar", "gold-accumulator", "fx-forward-collar",
    "prepaid-variable-forward", "protective-put", "cash-secured-puts", "call-spread", "dual-currency-deposit",
    "fx-option", "fx-option-spread", "fx-risk-reversal", "fx-strangle"];
  const PRIVATE_IDS = ["private-markets", "private-real-estate"];
  function clsOf(id) {
    if (STRUCTURED_IDS.indexOf(id) !== -1) return "structured";
    if (OTC_IDS.indexOf(id) !== -1) return "otc";
    if (PRIVATE_IDS.indexOf(id) !== -1) return "private";
    return "non-complex";
  }

  function fallback(raw) {
    return {
      label: String(raw || "Expression"),
      what: "A way to express this view in the portfolio.",
      mechanics: "The precise structure for this expression isn't catalogued yet — agree the mechanics, sizing and instrument with the desk before trading.",
      underlying: "Per the idea's asset class and sector.",
      tenor: "Per the client's mandate and horizon.",
      example: "Sized to the book's policy weights and risk targets.",
      pros: ["Tailored to the specific idea"],
      cons: ["Needs desk specification before execution"],
      whenToUse: "When this expression best fits the client's mandate, goals and appropriateness.",
      context: null
    };
  }

  function get(raw) {
    const id = resolve(raw);
    return (id && E[id]) ? E[id] : fallback(raw);
  }

  /* ---- idea-aware EXAMPLE TERMS ----------------------------------------------
     The generic `example` strings are sector-templated. When an expression is shown
     INSIDE a specific idea's drawer we render concrete terms that name THAT idea's
     underlying (u.ticker / u.name / pair) and plausible levels/tenor. Builders below
     cover the common expressions; anything without a builder falls back to the entry's
     own idea-aware `context(u)` line, and only to the generic `example` with no idea. */
  function fmtPair(t) {
    const s = String(t || "").toUpperCase().replace(/[^A-Z]/g, "");
    const C = "(EUR|GBP|USD|JPY|CHF|AUD|CAD)";
    if (new RegExp("^" + C + C + "$").test(s)) return s.slice(0, 3) + "/" + s.slice(3, 6);
    if (/USD|EUR|JPY|GBP/.test(s)) return s;
    return "EUR/USD";
  }
  const EXAMPLE_BUILDERS = {
    "direct-equity": (u) => `Buy a 3–5% ${u.ticker} line, sized to stay under ~8% of the book — add into weakness, trim into strength.`,
    "index-core": (u) => `A 5–10% ${u.etf}-type ETF tracking ${u.index} as the diversified core of the ${u.name} exposure (~0.1–0.35% fee).`,
    "structured-note": (u) => `A 12-month note on ${u.ticker}: 80% barrier, rich quarterly coupon, autocall at the start level — a packaged way to play ${u.name}.`,
    "phoenix-autocall": (u) => `1-year ACM+/Phoenix on ${u.ticker}: 80% capital barrier, ~12–18% p.a. memory coupon (quarterly) while above 80%, autocall at ≥100% — income on a range-bound ${u.name} view.`,
    "buffered-note": (u) => `15-month buffered note on ${u.ticker}: 70% barrier (protected to −30%), full uncapped upside — a protected (re)entry into ${u.ticker}.`,
    "capital-protected-note": (u, ctx) => `3-year note on ${ctx && ctx.sector === "Gold" ? "gold" : u.index}: 100% capital protected at maturity, ~60–70% participation — full downside protection with a defined share of the upside.`,
    "zero-cost-collar": (u) => `On the ${u.ticker} holding: buy a 3–6m ~90% put, sell a ~110% call for ~zero premium — protected below −10%, capped above +10%, keep the shares and dividends.`,
    "protective-put": (u) => `Buy a 3-month ~90% put on ${u.ticker} for ~2–3% — a hard floor at ~−10% through the event, full upside kept.`,
    "call-overwrite": (u) => `Sell 1-month ~5% OTM calls on the ${u.ticker} line for ~1% premium/mo (~10–15% annualised), capping gains above the strike.`,
    "cash-secured-puts": (u) => `Sell 1-month puts ~5% below spot on ${u.ticker} — ~1% premium, or assignment at your target add level.`,
    "physical-gold": () => `A 3–7% allocated-gold / ETC (4GLD or GLD) position sized to the protection gap — strategic ballast, held not traded.`,
    "gold-accumulator": () => `12-month gold accumulator: buy weekly at ~95% of spot, knock-out ~105%, double-up below the 95% strike — accumulate ~5% under market while range-bound.`,
    "currency-hedged-sleeve": () => `Move the foreign (USD) sleeve into home-currency-hedged share classes (~0.1–0.2% cost) to strip out the FX mismatch — Retail-friendly, no derivatives account.`,
    "fx-forward-collar": (u) => `A 6-month ${fmtPair(u.ticker)} forward, or a zero-cost collar (e.g. protect beyond 1.12, give up below 1.04), sized to the non-base exposure.`,
    "dual-currency-deposit": (u) => `1-month DCD on ${fmtPair(u.ticker)}: strike near spot, ~6–9% annualised coupon vs ~2% cash — converts into the weaker leg at the strike if it trades through (your target add level).`,
    "govt-ig-bonds": () => `5–10y Treasuries ~4.3% YTM plus A/BBB corporates ~5.3%, ~10–15% of book — lock the yield, add duration ballast.`,
    "bond-ladder": () => `A 1–7y Treasury/IG ladder, ~equal per rung at ~4.4% blended YTM, rolling maturities out each year.`,
    "extend-duration": () => `Rotate cash/bills into a 5–10y high-quality sleeve (~4.4% YTM, ~6y duration) — a 1% fall in yields adds ~6% price on top of carry.`,
    "tbill-ladder": () => `Ladder idle cash across 1/3/6/12-month T-bills (~5%), or short munis for taxable books — yield without giving up liquidity.`,
    "utility-basket": () => `An 8-name load-growth utility basket (~5–8% of book) yielding ~3% with rate-base growth, or an XLU-type core.`,
    "thematic-basket": (u) => `A curated 8–15 name basket across the ${u.name} value chain, equal-weighted into a single ~5–7% sleeve.`,
    "halo-basket": () => `Equal-weight ACM+ on CEG / MP Materials / CAT: 24% p.a. USD coupon while the basket ≥80%, autocall at ≥100%, 1-year — a ~$2–3m clip.`,
    "reverse-convertible": (u) => `6-month RevCon on ${u.ticker}: 75% knock-in, ~10–12% p.a. coupon — keep coupon + capital unless it ends >25% down, in which case you own ${u.ticker} at the strike.`,
    "range-accrual": () => `12-month 10Y Treasury range accrual: ~7.5% p.a. coupon accrued daily for each day the 10Y yield fixes inside 4.00–4.90% (vs ~4.0% on cash), A-rated issuer, capital at par — paid to hold the 10Y boxed below the 5% ceiling; coupon forgone on a break above 4.90% or below 4.00%.`
  };
  function exampleFor(id, u, ctx) {
    const b = EXAMPLE_BUILDERS[id];
    if (!b) return null;
    try { return b(u, ctx || {}); } catch (e) { return null; }
  }

  /* entry + idea-aware example terms + a context line tailored to the idea (ctx has .sector) */
  function detail(raw, ctx) {
    const id = resolve(raw);
    const base = (id && E[id]) ? E[id] : fallback(raw);
    const u = uFor(ctx);
    let contextLine = null;
    if (typeof base.context === "function") {
      try { contextLine = base.context(u, ctx || {}); } catch (e) { contextLine = null; }
    }
    // Example terms: concrete idea-aware builder first; else the idea-aware context
    // line (when shown inside an idea); else the generic catalogue example.
    const builderExample = (id && ctx) ? exampleFor(id, u, ctx) : null;
    const example = builderExample || (ctx ? (contextLine || base.example) : base.example);
    // keep the "For this idea" callout only when it ADDS framing beyond the example
    // (i.e. a concrete builder example is shown) — avoids printing the same line twice.
    const showContext = !!(builderExample && contextLine);
    return {
      label: base.label, cls: clsOf(id), what: base.what, mechanics: base.mechanics,
      underlying: base.underlying, tenor: base.tenor, example: example,
      pros: base.pros || [], cons: base.cons || [], whenToUse: base.whenToUse,
      contextLine: showContext ? contextLine : null, raw: raw
    };
  }

  /* --------------------------- rendering ---------------------------------- */
  function detailHTML(d) {
    const li = (arr) => (arr || []).map(x => `<li>${esc(x)}</li>`).join("");
    return `<div class="xd">
      ${d.contextLine ? `<div class="xd-context"><span class="xd-ctx-k">For this idea</span><span class="xd-ctx-v">${esc(d.contextLine)}</span></div>` : ""}
      <p class="xd-what">${esc(d.what)}</p>
      <div class="xd-grid">
        <div class="xd-row"><span class="xd-k">How it's built</span><span class="xd-v">${esc(d.mechanics)}</span></div>
        <div class="xd-row"><span class="xd-k">Example terms</span><span class="xd-v">${esc(d.example)}</span></div>
      </div>
      <div class="xd-pc">
        <div class="xd-col xd-pros"><span class="xd-k">Pros</span><ul>${li(d.pros)}</ul></div>
        <div class="xd-col xd-cons"><span class="xd-k">Cons</span><ul>${li(d.cons)}</ul></div>
      </div>
      <div class="xd-when"><span class="xd-k">When to use</span><span class="xd-when-v">${esc(d.whenToUse)}</span></div>
      ${noteHTML(d.cls)}
    </div>`;
  }

  /* MiFID appropriateness note — the key correction: structured products (notes)
     ARE tradable by Retail; OTC derivatives are not. */
  function noteHTML(cls) {
    if (cls === "otc")
      return `<div class="xd-note otc">⚠️ <b>OTC derivative</b> — <b>not</b> available to a MiFID Retail client. Needs Professional re-classification, or use a structured-product / non-complex alternative.</div>`;
    if (cls === "structured")
      return `<div class="xd-note structured">ℹ️ <b>Structured product</b> — a packaged security (a note), so <b>MiFID Retail can trade it</b> (unlike an OTC derivative). It's complex, so the appropriateness test still applies.</div>`;
    if (cls === "private")
      return `<div class="xd-note otc">⚠️ <b>Private / illiquid</b> — restricted to qualified or professional investors; capital is locked for the term.</div>`;
    return "";
  }

  function itemHTML(raw, ctx, opts) {
    opts = opts || {};
    const d = detail(raw, ctx);
    const sm = opts.sm ? " sm" : "";
    const blocked = opts.blocked ? " blocked" : "";
    return `<div class="struct-acc-item">
      <button type="button" class="struct-chip struct-toggle${sm}${blocked}" aria-expanded="false">
        <span class="st-label">${esc(d.label)}</span><span class="st-caret" aria-hidden="true">›</span>
      </button>
      <div class="struct-detail" hidden>${detailHTML(d)}</div>
    </div>`;
  }

  function accordionHTML(structures, ctx, opts) {
    opts = opts || {};
    const items = (structures || []).map(s => itemHTML(s, ctx, {
      sm: opts.sm,
      blocked: typeof opts.blockedFn === "function" ? opts.blockedFn(s) : false
    })).join("");
    return `<div class="struct-accordion">${items}</div>`;
  }

  /* attach click/keyboard toggles within a root; idempotent + stops the click
     bubbling to any clickable parent card */
  function wire(root) {
    if (!root) return;
    root.querySelectorAll(".struct-toggle").forEach(btn => {
      if (btn.dataset.xwired) return;
      btn.dataset.xwired = "1";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const item = btn.closest(".struct-acc-item");
        if (!item) return;
        const panel = item.querySelector(".struct-detail");
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        item.classList.toggle("open", !open);
        if (panel) panel.hidden = open;
      });
    });
    root.querySelectorAll(".struct-detail").forEach(p => {
      if (p.dataset.xwired) return;
      p.dataset.xwired = "1";
      p.addEventListener("click", (e) => e.stopPropagation());
    });
  }

  /* --------- per-expression PROFILE FIT (shared by mapping.js + app.js) ----------
     How well each canonical expression serves a goal profile (growth | income |
     preservation), 0–2. Directional → growth; coupon/yield → income; protected/hedge →
     preservation. The single source of truth so the engine's mandate axis, the per-client
     "best implementation" and the recommendation block all agree. */
  const PROFILE_FIT = {
    "direct-equity": { g: 2, i: 0, p: 0 }, "index-core": { g: 2, i: 1, p: 1 }, "structured-note": { g: 1, i: 1, p: 1 },
    "buffered-note": { g: 1, i: 0, p: 2 }, "call-overwrite": { g: 0, i: 2, p: 1 }, "utility-basket": { g: 1, i: 2, p: 1 },
    "thematic-basket": { g: 2, i: 0, p: 0 }, "govt-ig-bonds": { g: 0, i: 2, p: 1 }, "bond-ladder": { g: 0, i: 2, p: 1 },
    "ig-corporates": { g: 0, i: 2, p: 0 }, "securitised-sleeve": { g: 0, i: 2, p: 0 }, "equal-weight-index": { g: 2, i: 0, p: 0 },
    "quality-basket": { g: 2, i: 0, p: 1 }, "international-etf": { g: 2, i: 0, p: 0 }, "value-basket": { g: 2, i: 1, p: 0 },
    "infrastructure-fund": { g: 1, i: 2, p: 1 }, "private-markets": { g: 2, i: 0, p: 0 }, "reit-basket": { g: 1, i: 2, p: 0 },
    "private-real-estate": { g: 0, i: 2, p: 1 }, "zero-cost-collar": { g: 0, i: 0, p: 2 }, "liquid-alternatives": { g: 0, i: 0, p: 2 },
    "macro-sleeve": { g: 0, i: 0, p: 2 }, "physical-gold": { g: 1, i: 0, p: 2 }, "gold-accumulator": { g: 1, i: 1, p: 1 },
    "healthcare-basket": { g: 2, i: 0, p: 1 }, "prepaid-variable-forward": { g: 0, i: 1, p: 2 }, "protective-put": { g: 1, i: 0, p: 2 },
    "tax-loss-harvest": { g: 1, i: 0, p: 0 }, "peer-rotation": { g: 1, i: 0, p: 0 }, "bond-swap": { g: 0, i: 2, p: 1 },
    "current-coupon-ladder": { g: 0, i: 2, p: 1 }, "staged-trim": { g: 0, i: 0, p: 2 }, "tbill-ladder": { g: 0, i: 2, p: 2 },
    "short-duration-bonds": { g: 0, i: 2, p: 1 }, "cash-secured-puts": { g: 1, i: 2, p: 0 }, "securities-backed-line": { g: 0, i: 1, p: 0 },
    "diversifiers": { g: 0, i: 0, p: 2 }, "extend-duration": { g: 0, i: 2, p: 1 }, "listed-infrastructure": { g: 1, i: 2, p: 1 },
    "phoenix-autocall": { g: 1, i: 2, p: 0 }, "call-spread": { g: 2, i: 0, p: 0 }, "leveraged-certificate": { g: 2, i: 0, p: 0 },
    "halo-basket": { g: 1, i: 2, p: 0 }, "reverse-convertible": { g: 0, i: 2, p: 0 }, "capital-protected-note": { g: 1, i: 0, p: 2 },
    "range-accrual": { g: 0, i: 2, p: 1 },
    "fx-forward-collar": { g: 0, i: 1, p: 2 }, "currency-hedged-sleeve": { g: 0, i: 0, p: 2 }, "dual-currency-deposit": { g: 0, i: 2, p: 0 },
    "fx-option": { g: 2, i: 0, p: 1 }, "fx-option-spread": { g: 2, i: 0, p: 0 }, "fx-risk-reversal": { g: 2, i: 0, p: 0 }, "fx-strangle": { g: 2, i: 0, p: 1 }
  };
  const PF_PROTECTIVE = new Set(["capital-protected-note", "zero-cost-collar", "buffered-note", "protective-put", "prepaid-variable-forward", "fx-forward-collar", "currency-hedged-sleeve"]);
  const PF_COUPON = new Set(["phoenix-autocall", "reverse-convertible", "halo-basket", "call-overwrite", "dual-currency-deposit", "range-accrual"]);
  const PF_DIRECTIONAL = new Set(["direct-equity", "thematic-basket", "equal-weight-index", "leveraged-certificate", "call-spread", "index-core", "fx-option", "fx-option-spread", "fx-risk-reversal"]);
  /* raw profile score (0..~2.3) for a canonical id + small style bonus (protective for
     preservation, coupon for income, directional for growth) to sharpen ties. */
  function profileScore(profile, id) {
    const f = PROFILE_FIT[id];
    let base = f ? (profile === "growth" ? f.g : profile === "income" ? f.i : f.p) : 1;
    if (profile === "preservation" && PF_PROTECTIVE.has(id)) base += 0.5;
    else if (profile === "income" && PF_COUPON.has(id)) base += 0.3;
    else if (profile === "growth" && PF_DIRECTIONAL.has(id)) base += 0.3;
    return base;
  }
  /* 0–100 suitability of an expression for a goal profile (used by the mandate axis). */
  function implFit(structure, profile) {
    const id = resolve(structure);
    return Math.max(0, Math.min(100, Math.round(40 + 30 * profileScore(profile, id))));
  }

  window.EXPRESSIONS = { resolve, get, detail, itemHTML, accordionHTML, wire, E, SECTOR_U, profileScore, implFit };
})();
