/* ============================================================================
   Brokerage Playground — seed data
   ----------------------------------------------------------------------------
   THEMES  : investment themes shown on the left rail of "Views & Ideas"
   IDEAS   : tiles under each theme. Each idea carries the list of clients it
             applies to, with a per-client rationale (the cross-link that powers
             both the idea drawer and the Advisor Book "recommended ideas").
   CLIENTS : the advisor's book. Aurora is the real anchor book; the rest are
             consistent, distinct private-bank books.

   This file is the SEED. User-added themes/ideas are layered on top from
   localStorage at runtime (see app.js). Nothing here is mutated.
   ========================================================================== */

const SEED_THEMES = [
  { id: "gold",        name: "Gold",            blurb: "Real-asset tail hedge as the geopolitical risk premium persists." },
  { id: "semis",       name: "Semiconductors",  blurb: "The AI compute and memory supercycle — leaders, supply chain and the laggards." },
  { id: "infra",       name: "Infrastructure",  blurb: "The AI build-out's binding constraint: power, grid and listed real assets." },
  { id: "oil",         name: "Oil",             blurb: "Integrated majors and the Brent war premium as a portfolio hedge." },
  { id: "tech",        name: "Technology",      blurb: "Enterprise software, AI monetization and mega-cap quality compounders." },
  { id: "utilities",   name: "US Utilities",    blurb: "Electrification and datacenter load growth meet regulated income." },
  { id: "earnings",    name: "Earnings",        blurb: "Monetizing the volatility risk premium and buffered post-print re-entry." }
];

/* Conviction scale: High / Medium-High / Medium. Horizon: Tactical / 6–12m / Strategic / Income */
const SEED_IDEAS = [
  /* ---------------------------------- GOLD --------------------------------- */
  {
    id: "gold-tail-hedge",
    themeId: "gold",
    title: "Gold as the book's tail hedge",
    conviction: "High",
    horizon: "Strategic",
    thesis: "Gold has doubled off the 2023 lows and is the cleanest hedge against a breakdown of the current geopolitical truce. We treat existing holdings as protective ballast — to be recognised, not trimmed, while the premium persists.",
    structures: ["Physical / ETC", "Gold accumulator", "Cash-secured entry"],
    clients: [
      { id: "aurora", why: "Xetra-Gold (+109%) is the book's deliberate tail hedge against a truce breakdown — recognise as protective, do not flag for profit-taking while the geopolitical premium holds." },
      { id: "amar",   why: "Commodity-tilted book — a gold accumulator builds the strategic hedge at a structured discount to spot." },
      { id: "scott",  why: "Add a small physical-gold sleeve as ballast against an equity-income book that has no real-asset hedge today." }
    ]
  },
  {
    id: "gold-miners",
    themeId: "gold",
    title: "Miners' catch-up to spot",
    conviction: "Medium",
    horizon: "Tactical",
    thesis: "Producers still lag bullion by roughly a third despite expanding margins at $4,300+ gold. A defined-risk call structure captures the operating leverage without the single-name balance-sheet risk.",
    structures: ["GDX basket", "Call spread", "Leveraged certificate"],
    clients: [
      { id: "amar",    why: "Miners lag spot by ~30% — a GDX call spread captures the catch-up with defined downside." },
      { id: "fable",   why: "High-beta proxy on the gold move; express via short-dated call spreads to keep risk capped." },
      { id: "prahnav", why: "Tactical satellite alongside the core growth sleeve." }
    ]
  },

  /* ------------------------------ SEMICONDUCTORS --------------------------- */
  {
    id: "memory-supercycle",
    themeId: "semis",
    title: "HBM / AI-memory supercycle (MU)",
    conviction: "High",
    horizon: "6–12m",
    thesis: "High-bandwidth memory is the gating component for AI accelerators and remains supply-constrained into 2027. Micron is the purest Western expression — but position sizing and earnings timing matter more than direction here.",
    structures: ["Direct equity", "Zero-cost collar", "Bullish risk reversal"],
    clients: [
      { id: "aurora",  why: "MU is 25.8% of the book on a ~10x gain into the 24-Jun print — express conviction while de-risking the concentration via a zero-cost collar (rich calls finance fat puts)." },
      { id: "fable",   why: "Core AI-memory conviction holding — add on weakness and overwrite the upside to harvest the elevated implied vol." },
      { id: "prahnav", why: "Already long the compute leaders; memory is the under-owned leg — size up through a bullish risk reversal." }
    ]
  },
  {
    id: "semicap",
    themeId: "semis",
    title: "Semi-cap equipment re-rating",
    conviction: "Medium",
    horizon: "12m",
    thesis: "Equipment makers (ASML, AMAT, LRCX) lag the compute leaders despite a multi-year capex cycle for advanced nodes and HBM packaging. The laggard leg of the AI trade with cleaner valuations.",
    structures: ["Equal-weight basket", "Leveraged certificate"],
    clients: [
      { id: "prahnav", why: "Equipment lags the compute names — an ASML/AMAT/LRCX basket is the catch-up trade to the datacenter capex cycle." },
      { id: "fable",   why: "Add the supply-chain leg via a leveraged certificate on a semi-cap basket." }
    ]
  },
  {
    id: "ai-compute",
    themeId: "semis",
    title: "AI compute leaders — range monetization (NVDA)",
    conviction: "High",
    horizon: "Tactical",
    thesis: "House still likes the AI compute leaders, but NVDA has consolidated 195–235 since March. Rather than chase, get paid for the range: sell downside to accumulate, or wrap the chop in a yield structure.",
    structures: ["Cash-secured puts", "Bullish range note", "Phoenix autocall"],
    clients: [
      { id: "aurora", why: "Holds NVDA -10.5%, range-bound 195–235; sell cash-secured puts on the idle $3m USD to get paid to add lower, or wrap in a bullish range note." },
      { id: "fable",  why: "Largest single position — monetize the chop with a Phoenix autocall while keeping upside participation." },
      { id: "jacob",  why: "Wants quality AI exposure without single-stock drawdown — a buffered NVDA note fits the moderate risk budget." }
    ]
  },

  /* ------------------------------ INFRASTRUCTURE --------------------------- */
  {
    id: "datacenter-power",
    themeId: "infra",
    title: "AI datacenter power build-out",
    conviction: "High",
    horizon: "Strategic",
    thesis: "Power, not chips, is the binding constraint on AI capacity. We pair listed global infrastructure with utilities directly exposed to datacenter load growth — and a private sleeve where suitable.",
    structures: ["Listed infrastructure", "Load-growth utilities", "Private markets"],
    clients: [
      { id: "prahnav", why: "Core thesis for the book — power is the binding constraint on AI; pair listed infra with utilities exposed to datacenter load growth." },
      { id: "amar",    why: "Real-asset tilt fits — access via listed global infrastructure plus a private sleeve." },
      { id: "jacob",   why: "Quality, regulated cashflows with a secular demand tailwind — fits the balanced mandate." }
    ]
  },
  {
    id: "listed-infra-income",
    themeId: "infra",
    title: "Listed infrastructure income",
    conviction: "Medium",
    horizon: "Income",
    thesis: "Toll roads, midstream and contracted power offer inflation-linked, equity-like income with lower drawdown than broad equity — a diversifier for income books carrying too much single-sector risk.",
    structures: ["Infrastructure fund", "EUR-hedged sleeve"],
    clients: [
      { id: "scott",  why: "Stable, inflation-linked income to complement the dividend-equity and bond sleeves." },
      { id: "ben",    why: "Real-asset income that diversifies away from the energy concentration." },
      { id: "aurora", why: "Diversifier away from the USD-equity beta — an EUR-hedged infra fund." }
    ]
  },

  /* ----------------------------------- OIL --------------------------------- */
  {
    id: "energy-geo-hedge",
    themeId: "oil",
    title: "Energy as a geopolitical hedge",
    conviction: "Medium-High",
    horizon: "Strategic",
    thesis: "Brent is holding a ~$90s war premium while the Strait of Hormuz risk persists. Integrated majors give cheap, dividend-paying exposure to that premium — protective for books long duration and growth.",
    structures: ["Integrated majors", "Energy ETF"],
    clients: [
      { id: "aurora", why: "TotalEnergies (+55%) is the book's energy hedge — protective while the Strait premium persists; hold, don't flag for trimming." },
      { id: "ben",    why: "Core overweight — the Brent war premium underwrites the integrated-majors thesis." },
      { id: "amar",   why: "Adds a geopolitical hedge that sits alongside the gold position." }
    ]
  },
  {
    id: "majors-income",
    themeId: "oil",
    title: "Integrated majors — buyback & dividend carry",
    conviction: "Medium",
    horizon: "Income",
    thesis: "At current strip prices the majors fund double-digit shareholder yield (dividend + buyback). Overwriting calls on the position lifts the carry further for income-oriented holders.",
    structures: ["Direct equity", "Covered calls"],
    clients: [
      { id: "ben",   why: "Buyback + dividend yield on the majors — overwrite calls to lift the carry." },
      { id: "scott", why: "A reliable energy dividend sleeve for the income mandate." }
    ]
  },

  /* -------------------------------- TECHNOLOGY ----------------------------- */
  {
    id: "enterprise-software",
    themeId: "tech",
    title: "Enterprise software & AI monetization",
    conviction: "High",
    horizon: "Strategic",
    thesis: "The clearest near-term AI monetization is in enterprise software (SAP, MSFT) attaching AI to existing seats. Winners with pricing power — and, where positions have run, overwrite candidates.",
    structures: ["Direct equity", "Call overwrite"],
    clients: [
      { id: "aurora", why: "SAP (+132%) is an overwrite candidate — sell upside calls to monetize the European-software winner and fund a diversifier." },
      { id: "jacob",  why: "Quality compounders (MSFT/SAP) anchor the growth sleeve." },
      { id: "fable",  why: "AI-monetization leaders — add on pullbacks." }
    ]
  },
  {
    id: "megacap-quality",
    themeId: "tech",
    title: "Mega-cap quality compounders",
    conviction: "High",
    horizon: "Strategic",
    thesis: "Cash-generative mega-caps with fortress balance sheets remain the core of a long-term equity allocation — lower drawdown than the speculative AI complex, with durable compounding.",
    structures: ["Direct equity", "Index core"],
    clients: [
      { id: "jacob", why: "Core of the balanced book — own the quality compounders via direct equity plus an index core." },
      { id: "scott", why: "Lower-vol mega-cap quality to stabilise the equity sleeve." },
      { id: "ben",   why: "Diversifier away from energy into quality growth." }
    ]
  },

  /* ------------------------------- US UTILITIES ---------------------------- */
  {
    id: "electrification-demand",
    themeId: "utilities",
    title: "Electrification & datacenter load growth",
    conviction: "Medium-High",
    horizon: "Strategic",
    thesis: "After two flat decades, US power demand is inflecting on datacenters, reshoring and electrification. Utilities with the right service territory get unprecedented rate-base growth — the demand side of the AI-power trade.",
    structures: ["Load-growth utilities", "Utility basket"],
    clients: [
      { id: "scott",   why: "Utilities with load growth marry the income need to a secular demand story." },
      { id: "prahnav", why: "The demand side of the datacenter-power thesis — utilities capturing AI load." },
      { id: "amar",    why: "Infrastructure-adjacent utility exposure in the US sleeve." }
    ]
  },
  {
    id: "regulated-yield",
    themeId: "utilities",
    title: "Regulated utility yield",
    conviction: "Medium",
    horizon: "Income",
    thesis: "Regulated utilities offer defensive, bond-proxy yield with inflation pass-through. A complement to fixed income for books that need ballast and income without taking duration risk.",
    structures: ["Dividend basket", "Bond complement"],
    clients: [
      { id: "scott",  why: "Core income holding — regulated utility yield with defensive characteristics." },
      { id: "ben",    why: "Defensive yield to balance the cyclical energy book." },
      { id: "aurora", why: "A low-vol utility dividend sleeve as a complement to the underwater bond book." }
    ]
  },

  /* --------------------------------- EARNINGS ------------------------------ */
  {
    id: "prevol-monetize",
    themeId: "earnings",
    title: "Pre-earnings vol monetization",
    conviction: "Medium-High",
    horizon: "Tactical",
    thesis: "Implied vol is rich into prints across the AI complex. For holders of the underlying, overwriting or collaring into the event harvests the volatility risk premium and, where wanted, de-risks a concentrated gain.",
    structures: ["Covered calls", "Zero-cost collar"],
    clients: [
      { id: "aurora",  why: "MU IVol is rich into the 24-Jun print — a collar or call overwrite monetizes the event while protecting the concentrated gain." },
      { id: "fable",   why: "Sell elevated pre-earnings premium on the core holdings via covered calls." },
      { id: "prahnav", why: "Overwrite semis into prints to harvest the vol-risk-premium." }
    ]
  },
  {
    id: "postvol-reentry",
    themeId: "earnings",
    title: "Post-earnings buffered re-entry",
    conviction: "Medium",
    horizon: "Tactical",
    thesis: "Names that gap down on earnings into crushed vol are ideal candidates for buffered notes — re-enter with explicit downside protection and defined participation, financed by the cheaper options.",
    structures: ["Buffered note", "Stock repair"],
    clients: [
      { id: "aurora", why: "AVGO -21% post-print — harvest the loss and re-enter via a buffered note for downside-protected participation." },
      { id: "fable",  why: "Use buffered notes to re-enter names that gapped on earnings." },
      { id: "jacob",  why: "Buffered re-entry fits the moderate risk budget after a drawdown." }
    ]
  }
];

/* ----------------------------------- CLIENTS ----------------------------------
   ccy is display currency. aum in millions of that currency. split = % by asset
   class. positions are top holdings (weight % of book). summary = the desk's
   agenda for the book (Shark-Tank-style "what we want to do"). The list of
   applicable ideas is DERIVED from SEED_IDEAS at runtime, so it can never drift.
*/
const SEED_CLIENTS = [
  {
    id: "fable",
    name: "Fable",
    ccy: "USD",
    aum: 38.0,
    relationship: "3-yr relationship · Entrepreneur · Aggressive growth",
    risk: "Aggressive",
    classification: "Professional",
    mifid: "MiFID Professional",
    goals: {
      objective: "Aggressive capital growth concentrated in the AI complex",
      horizon: "Long-term · 10+ yrs",
      target: { Growth: 80, Income: 5, Protection: 10, Liquidity: 5 }
    },
    profile: "US tech founder, options-fluent. High single-stock concentration in the AI complex, minimal cash. Comfortable with autocalls, overwrites and leveraged certificates.",
    split: { Equity: 88, "Structured": 6, Cash: 4, "Fixed Income": 2 },
    positions: [
      { name: "NVIDIA",        ticker: "NVDA US", assetClass: "Equity",     weightPct: 24.0, note: "Largest position; range-bound 195–235." },
      { name: "Broadcom",      ticker: "AVGO US", assetClass: "Equity",     weightPct: 14.0, note: "Bought into the print, gapped ~20%." },
      { name: "Micron",        ticker: "MU US",   assetClass: "Equity",     weightPct: 12.0, note: "HBM supercycle conviction holding." },
      { name: "ASML",          ticker: "ASML NA", assetClass: "Equity",     weightPct: 9.0,  note: "Semi-cap leader." },
      { name: "Microsoft",     ticker: "MSFT US", assetClass: "Equity",     weightPct: 8.0,  note: "AI monetization core." },
      { name: "Phoenix autocall (semis)", ticker: "—", assetClass: "Structured", weightPct: 6.0, note: "Yield on range-bound semis." }
    ],
    summary: "Concentrated, options-fluent AI-growth book — NVDA, AVGO and the semis supply chain at high single-stock weights, with almost no cash. The agenda is to keep the upside but get paid for the volatility: overwrite rich pre-earnings premium, monetize range-bound names with autocalls, and add the under-owned legs — memory, semi-cap, miners — through defined-risk structures rather than more naked stock."
  },
  {
    id: "aurora",
    name: "Aurora",
    ccy: "EUR",
    aum: 50.2,
    relationship: "5-yr relationship · MiFID Retail · Growth + income",
    risk: "Growth, with income needs",
    classification: "Retail",
    mifid: "MiFID Retail",
    goals: {
      objective: "Grow the book while drawing income — and protect the concentrated MU gain",
      horizon: "Long-term · 7–10 yrs",
      target: { Growth: 55, Income: 25, Protection: 12, Liquidity: 8 }
    },
    profile: "EMEA private-bank client, growth-oriented with income needs. Comfortable with structured products and derivatives overlays. Book is 72% USD against an EUR base.",
    split: { Equity: 71, "Fixed Income": 13.9, Commodity: 6, Cash: 10.1 },
    positions: [
      { name: "Micron",          ticker: "MU US",  assetClass: "Equity",       weightPct: 25.8, note: "~10x gain; earnings 24-Jun; IVol rich." },
      { name: "SPDR S&P 500",    ticker: "SPY US", assetClass: "Equity ETF",   weightPct: 20.4, note: "Core beta anchor." },
      { name: "NVIDIA",          ticker: "NVDA US",assetClass: "Equity",       weightPct: 7.2,  note: "-10.5%, range-bound; house still likes it." },
      { name: "US Treasury 1.25% '31", ticker: "T 1.25 08/31", assetClass: "Govt bond", weightPct: 6.0, note: "Underwater on rates — bond-swap candidate." },
      { name: "Xetra-Gold ETC",  ticker: "4GLD GY",assetClass: "Commodity",    weightPct: 5.2,  note: "+109% — book's tail hedge." },
      { name: "TotalEnergies",   ticker: "TTE FP", assetClass: "Equity",       weightPct: 4.3,  note: "Energy hedge; Brent war premium." },
      { name: "SAP",             ticker: "SAP GY", assetClass: "Equity",       weightPct: 4.1,  note: "+132% — overwrite candidate." }
    ],
    summary: "EMEA book dominated by a 25.8% Micron position on a ~10x gain into a 24-Jun earnings print, 72% USD against an EUR base, with two bonds underwater on rates (not credit) and gold and TotalEnergies held as deliberate geopolitical hedges. The desk's agenda: collar the MU concentration, harvest the bond and AVGO/LVMH losses into better carry and buffered re-entries, monetize SAP's gain, and put ~€5m of idle cash to work — while protecting the gold and energy hedges, not trimming them."
  },
  {
    id: "scott",
    name: "Scott",
    ccy: "USD",
    aum: 22.0,
    relationship: "11-yr relationship · Retiree · Income & preservation",
    risk: "Conservative income",
    classification: "Retail",
    mifid: "US Retail",
    goals: {
      objective: "Fund retirement income and preserve capital",
      horizon: "Drawdown · 0–5 yrs",
      target: { Growth: 25, Income: 50, Protection: 15, Liquidity: 10 }
    },
    profile: "US retiree drawing income. Capital preservation first. Dividend equity, regulated utilities, treasuries and munis with a healthy cash buffer. Low appetite for single-stock risk.",
    split: { Equity: 46, "Fixed Income": 38, Real_Assets: 8, Cash: 8 },
    positions: [
      { name: "NextEra Energy",  ticker: "NEE US",  assetClass: "Utility",     weightPct: 9.0, note: "Regulated yield + load growth." },
      { name: "US Treasuries (ladder)", ticker: "—", assetClass: "Govt bond", weightPct: 22.0, note: "2–7yr ladder, current coupons." },
      { name: "Muni bond sleeve", ticker: "—",      assetClass: "Muni",        weightPct: 12.0, note: "Tax-exempt income." },
      { name: "Procter & Gamble", ticker: "PG US",  assetClass: "Equity",      weightPct: 7.0, note: "Defensive dividend." },
      { name: "Chevron",          ticker: "CVX US", assetClass: "Equity",      weightPct: 6.0, note: "Energy dividend sleeve." },
      { name: "Listed infra fund", ticker: "—",     assetClass: "Real assets", weightPct: 8.0, note: "Inflation-linked income." }
    ],
    summary: "US income-and-preservation book for a retiree — regulated utilities, dividend equity, a treasury ladder and munis, with a meaningful cash buffer. The agenda is durable income with ballast: lean into electrification-driven utilities and listed-infrastructure income, add a small gold sleeve for tail protection the book currently lacks, and stabilise the equity with mega-cap quality."
  },
  {
    id: "amar",
    name: "Amar",
    ccy: "USD",
    aum: 61.0,
    relationship: "7-yr relationship · Family office · Real assets",
    risk: "Growth, real-asset tilt",
    classification: "Retail",
    mifid: "MiFID Retail",
    goals: {
      objective: "Compound a real-asset core across cycles",
      horizon: "Multi-generational · 10+ yrs",
      target: { Growth: 40, Income: 20, Protection: 30, Liquidity: 10 }
    },
    profile: "APAC family-office mandate, multi-currency (USD/SGD). Strong tilt to commodities, gold, energy and infrastructure. Comfortable with private markets and structured accumulators.",
    split: { Equity: 40, Commodity: 18, Real_Assets: 16, "Fixed Income": 14, Cash: 6, Private: 6 },
    positions: [
      { name: "Gold (allocated)", ticker: "XAU",     assetClass: "Commodity",   weightPct: 12.0, note: "Strategic hard-asset core." },
      { name: "Shell",            ticker: "SHEL LN", assetClass: "Equity",      weightPct: 8.0,  note: "Majors / energy premium." },
      { name: "Global infra fund",ticker: "—",       assetClass: "Real assets", weightPct: 10.0, note: "Listed infrastructure." },
      { name: "GDX miners",       ticker: "GDX US",  assetClass: "Equity",      weightPct: 5.0,  note: "Catch-up to spot." },
      { name: "EM equity sleeve", ticker: "—",       assetClass: "Equity",      weightPct: 9.0,  note: "APAC / EM growth." },
      { name: "Private infra co-invest", ticker: "—",assetClass: "Private",     weightPct: 6.0,  note: "Datacenter power." }
    ],
    summary: "Multi-currency real-assets book tilted to commodities, gold, energy and infrastructure across APAC and the US. The agenda is to compound the hard-asset thesis: build the strategic gold hedge at a structured discount, play the miners' catch-up to spot, and own the AI-datacenter power build-out through listed infrastructure, utilities and a private co-invest — with energy as a second geopolitical hedge."
  },
  {
    id: "jacob",
    name: "Jacob",
    ccy: "USD",
    aum: 29.0,
    relationship: "4-yr relationship · Executive · Balanced",
    risk: "Moderate",
    classification: "Professional",
    mifid: "MiFID Professional",
    goals: {
      objective: "Balanced growth with controlled drawdown",
      horizon: "Long-term · 8–10 yrs",
      target: { Growth: 55, Income: 30, Protection: 8, Liquidity: 7 }
    },
    profile: "US corporate executive, balanced mandate. Mega-cap quality plus an index core. Wants AI exposure but is drawdown-sensitive — prefers buffered structures to naked single stocks.",
    split: { Equity: 64, "Fixed Income": 22, Structured: 9, Cash: 5 },
    positions: [
      { name: "S&P 500 index core", ticker: "VOO US", assetClass: "Equity ETF", weightPct: 26.0, note: "Passive core." },
      { name: "Microsoft",          ticker: "MSFT US",assetClass: "Equity",     weightPct: 10.0, note: "Quality compounder." },
      { name: "Apple",              ticker: "AAPL US",assetClass: "Equity",     weightPct: 8.0,  note: "Mega-cap quality." },
      { name: "IG corporate bonds", ticker: "—",      assetClass: "Credit",     weightPct: 18.0, note: "Core fixed income." },
      { name: "Buffered NVDA note", ticker: "—",      assetClass: "Structured", weightPct: 9.0,  note: "AI exposure, capped drawdown." }
    ],
    summary: "Balanced US book anchored in mega-cap quality and an index core, with a moderate risk budget and modest cash. The agenda is quality growth with controlled drawdown: own the compounders directly, take AI exposure through buffered notes rather than naked single stocks, and diversify into regulated-cashflow infrastructure for ballast."
  },
  {
    id: "prahnav",
    name: "Prahnav",
    ccy: "USD",
    aum: 44.0,
    relationship: "2-yr relationship · Tech operator · Thematic growth",
    risk: "Growth",
    classification: "Professional",
    mifid: "MiFID Professional",
    goals: {
      objective: "Own the AI build-out end to end",
      horizon: "Long-term · 7–10 yrs",
      target: { Growth: 70, Income: 15, Protection: 8, Liquidity: 7 }
    },
    profile: "US tech operator running a thematic growth book around the AI build-out. Owns the whole supply chain — compute, memory, equipment and the power that feeds it. Comfortable with overwrites and certificates.",
    split: { Equity: 78, Structured: 8, "Real_Assets": 8, Cash: 6 },
    positions: [
      { name: "NVIDIA",          ticker: "NVDA US", assetClass: "Equity",      weightPct: 16.0, note: "Compute leader." },
      { name: "Micron",          ticker: "MU US",   assetClass: "Equity",      weightPct: 11.0, note: "Memory — under-owned leg." },
      { name: "ASML",            ticker: "ASML NA", assetClass: "Equity",      weightPct: 9.0,  note: "Semi-cap." },
      { name: "Constellation Energy", ticker: "CEG US", assetClass: "Utility", weightPct: 8.0,  note: "Datacenter load growth." },
      { name: "Global infra fund", ticker: "—",     assetClass: "Real assets", weightPct: 8.0,  note: "Listed power / grid." },
      { name: "Semis overwrite (certificate)", ticker: "—", assetClass: "Structured", weightPct: 8.0, note: "Harvest earnings vol." }
    ],
    summary: "Growth book built around the AI build-out — semiconductors plus the infrastructure and power that feed them. The agenda is to own the whole supply chain: compute leaders and memory, the lagging semi-cap and gold miners as catch-up trades, and the binding constraint — datacenter power — through listed infrastructure and load-growth utilities, harvesting earnings vol along the way."
  },
  {
    id: "ben",
    name: "Ben",
    ccy: "USD",
    aum: 33.0,
    relationship: "9-yr relationship · Business owner · Value & income",
    risk: "Moderate, value tilt",
    classification: "Retail",
    mifid: "MiFID Retail",
    goals: {
      objective: "Durable income from diversified real assets",
      horizon: "Long-term · 5–8 yrs",
      target: { Growth: 45, Income: 35, Protection: 12, Liquidity: 8 }
    },
    profile: "UK/US business owner, GBP/USD split. Value-and-income style with an energy overweight and real-asset income. Wants to keep the energy carry but diversify its cyclicality.",
    split: { Equity: 58, "Fixed Income": 20, Real_Assets: 13, Cash: 9 },
    positions: [
      { name: "ExxonMobil",       ticker: "XOM US", assetClass: "Equity",      weightPct: 11.0, note: "Buyback + dividend carry." },
      { name: "Shell",            ticker: "SHEL LN",assetClass: "Equity",      weightPct: 9.0,  note: "Energy overweight." },
      { name: "Listed infra fund",ticker: "—",      assetClass: "Real assets", weightPct: 13.0, note: "Real-asset income." },
      { name: "IG / gilt sleeve", ticker: "—",      assetClass: "Fixed income",weightPct: 20.0, note: "Ballast." },
      { name: "Berkshire Hathaway",ticker: "BRK/B US",assetClass: "Equity",    weightPct: 8.0,  note: "Quality diversifier." },
      { name: "Utilities basket", ticker: "—",      assetClass: "Utility",     weightPct: 7.0,  note: "Defensive yield." }
    ],
    summary: "Energy-and-value book with real-asset income and a GBP/USD split. The agenda is to keep the energy overweight working while diversifying its cyclicality: hold the majors for buyback-and-dividend carry under the Brent war premium, add listed-infrastructure and regulated-utility yield for ballast, and rotate a sleeve into quality growth."
  }
];

/* ---------------------------------------------------------------------------
   Domain maps used by pre-trade impact + portfolio analytics.
   THEME_IMPACT : which asset-class sleeve a theme's trade lands in, and the
                  role ("goal bucket") it plays for the client's objectives.
   BUCKET_OF    : maps any holding's asset class to a goal bucket so we can
                  read a book against its strategic target.
   GOAL_BUCKETS : canonical order + colour for the four goal buckets.
   OTC / NON-COMPLEX keyword lists drive the MiFID Retail appropriateness flag.
--------------------------------------------------------------------------- */
const THEME_IMPACT = {
  gold:      { assetClass: "Commodity",   bucket: "Protection" },
  semis:     { assetClass: "Equity",      bucket: "Growth" },
  infra:     { assetClass: "Real Assets", bucket: "Income" },
  oil:       { assetClass: "Equity",      bucket: "Income" },
  tech:      { assetClass: "Equity",      bucket: "Growth" },
  utilities: { assetClass: "Utility",     bucket: "Income" },
  earnings:  { assetClass: "Structured",  bucket: "Protection" }
};

const BUCKET_OF = {
  "Equity": "Growth", "Equity ETF": "Growth", "Structured": "Growth", "Private": "Growth",
  "Commodity": "Protection",
  "Real Assets": "Income", "Real_Assets": "Income",
  "Fixed Income": "Income", "Credit": "Income", "Muni": "Income", "Govt bond": "Income", "Utility": "Income",
  "Cash": "Liquidity"
};

const GOAL_BUCKETS = [
  { key: "Growth",     color: "#29211A" },
  { key: "Income",     color: "#9A7B4F" },
  { key: "Protection", color: "#3F6B4E" },
  { key: "Liquidity",  color: "#C2A661" }
];

/* asset class a custom/ad-hoc instrument sits in -> goal bucket */
const ASSET_BUCKET = {
  "Equity": "Growth", "Fixed Income": "Income", "Commodity": "Protection",
  "Real Assets": "Income", "Structured": "Protection", "Cash": "Liquidity"
};

/* MiFID appropriateness: complex / OTC-derivative structures vs non-complex */
const OTC_KEYWORDS = ["collar","risk reversal","autocall","phoenix","buffered","range note",
  "accumulator","reverse convertible","certificate","covered call","overwrite","call spread",
  "cash-secured","seagull","prepaid","dcd","structured note","note"];
const NONCOMPLEX_KEYWORDS = ["direct equity","equity etf","etf","index","basket","physical",
  "etc","fund","gilt","bond","dividend basket","direct"];

function isOtcOption(structure) {
  const s = String(structure || "").toLowerCase();
  if (NONCOMPLEX_KEYWORDS.some(k => s.includes(k))) return false;
  return OTC_KEYWORDS.some(k => s.includes(k));
}

/* expose to app.js + portfolio.html */
window.SEED = {
  themes: SEED_THEMES, ideas: SEED_IDEAS, clients: SEED_CLIENTS,
  THEME_IMPACT, BUCKET_OF, GOAL_BUCKETS, ASSET_BUCKET, isOtcOption
};
