/* ============================================================================
   Brokerage Playground — seed data (v2)
   ----------------------------------------------------------------------------
   THEMES / IDEAS : the "Views" board, refreshed around J.P. Morgan Private
                    Bank's mid-year-outlook positioning (synthesised, original
                    copy — AI & productivity, power & infrastructure, extending
                    duration, broadening beyond mega-caps, real assets,
                    resilience/protection, gold & currency, healthcare).
                    Each idea is tagged by TYPE + ASSET CLASS + SECTOR + goal
                    BUCKET. Which clients an idea applies to is DERIVED from each
                    book's exposure + goals (see scanner.js), never hand-picked.
   CLIENTS        : seven deliberately different books, each engineered so the
                    portfolio scanner surfaces a different set of actions.
   ========================================================================== */

/* ----------------------------------- THEMES -------------------------------- */
const SEED_THEMES = [
  { id: "ai",         name: "AI & Productivity",        blurb: "The productivity boom — compute leaders, the software layer and the adopters monetising AI." },
  { id: "power",      name: "Power & Infrastructure",   blurb: "Electricity is the new oil of AI: generation, the grid and the names that build it." },
  { id: "duration",   name: "Core Fixed Income",        blurb: "Own quality duration for the ~4.5% carry and ballast — the Fed's hawkish hold has pushed the cutting cycle into 2027." },
  { id: "broaden",    name: "Broadening Equity",        blurb: "Diversify beyond the mega-caps — quality cyclicals, value and international catch-up." },
  { id: "realassets", name: "Real Assets",              blurb: "Infrastructure and real estate for inflation-protected, contracted income." },
  { id: "resilience", name: "Resilience & Protection",  blurb: "Structured downside protection and diversifiers to carry risk through the cycle." },
  { id: "gold",       name: "Gold & Currency",          blurb: "Gold as a debasement hedge and currency diversification for concentrated-USD books." },
  { id: "health",     name: "Healthcare Innovation",    blurb: "GLP-1, devices and medical innovation as a durable, less-correlated growth engine." },
  { id: "structured", name: "Structured Outcomes",      blurb: "Defined-outcome notes — autocalls, buffered and capital-protected structures that reshape risk and return as packaged securities. Retail-eligible; OTC derivatives are not." }
];

/* ----------------------------------- IDEAS --------------------------------- */
/* type: Thematic | Opportunistic | Strategic.  bucket (goal role): Growth | Income | Preservation */
const SEED_IDEAS = [
  /* ---- AI & Productivity ---- */
  {
    id: "ai-compute", themeId: "ai", intent: "add", title: "AI infrastructure & compute leaders",
    type: "Thematic", assetClass: "Equity", sector: "Technology", bucket: "Growth",
    conviction: "High", horizon: "Strategic",
    thesis: "The build-out of AI compute remains supply-constrained into 2027. We stay long the leaders but increasingly express it with downside-defined structures given valuations and concentration.",
    structures: ["Direct equity", "Index core", "Structured note"]
  },
  {
    id: "ai-software", themeId: "ai", intent: "add", title: "Software & the AI adopters",
    type: "Thematic", assetClass: "Equity", sector: "Technology", bucket: "Growth",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "The next leg of the AI trade broadens from infrastructure to the software and services layer attaching AI to existing revenue. Quality compounders with pricing power.",
    structures: ["Direct equity", "Call overwrite"]
  },

  /* ---- Power & Infrastructure ---- */
  {
    id: "power-grid", themeId: "power", intent: "income", title: "Electricity & the grid build-out",
    type: "Thematic", assetClass: "Equity", sector: "Utilities", bucket: "Income",
    conviction: "High", horizon: "Strategic",
    thesis: "After two flat decades, US power demand is inflecting on datacenters, reshoring and electrification. Utilities and grid suppliers with the right footprint get unprecedented rate-base growth.",
    structures: ["Load-growth utilities", "Utility basket"]
  },
  {
    id: "power-gas-nuclear", themeId: "power", intent: "add", title: "Natural gas & nuclear as AI power",
    type: "Opportunistic", assetClass: "Equity", sector: "Energy", bucket: "Growth",
    conviction: "Medium-High", horizon: "12m",
    thesis: "Firm, dispatchable power is the binding constraint on AI capacity. Gas infrastructure and nuclear operators are the cleanest way to own the supply side of datacenter load.",
    structures: ["Direct equity", "Thematic basket"]
  },

  /* ---- Core Fixed Income ---- */
  {
    id: "extend-duration", themeId: "duration", intent: "income", title: "Lock in yields — extend duration",
    type: "Strategic", assetClass: "Fixed Income", sector: "Rates", bucket: "Income",
    conviction: "High", horizon: "Strategic",
    thesis: "The Fed held but turned hawkish — the first cut is now a 2027 story, so this is about carry and ballast, not a rally. You're paid ~4.5% to wait in intermediate high-quality bonds, with a true equity diversifier for books running at all-time highs.",
    structures: ["Govt / IG bonds", "Bond ladder"]
  },
  {
    id: "quality-credit", themeId: "duration", intent: "income", title: "Quality credit carry",
    type: "Strategic", assetClass: "Fixed Income", sector: "Credit", bucket: "Income",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "Investment-grade and select securitised credit offer attractive all-in yields with limited spread risk — durable income for books that have been sitting in cash.",
    structures: ["IG corporates", "Securitised sleeve"]
  },

  /* ---- Broadening Equity ---- */
  {
    id: "broaden-quality", themeId: "broaden", intent: "add", title: "Diversify the rally — quality & cyclicals",
    type: "Strategic", assetClass: "Equity", sector: "Broad", bucket: "Growth",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "Leadership is narrow. As earnings broaden, quality cyclicals, industrials and equal-weight exposure should catch up — a diversifier for books concentrated in a handful of names.",
    structures: ["Equal-weight index", "Quality basket"]
  },
  {
    id: "international-value", themeId: "broaden", intent: "add", title: "International & value catch-up",
    type: "Opportunistic", assetClass: "Equity", sector: "Broad", bucket: "Growth",
    conviction: "Medium", horizon: "12m",
    thesis: "International developed and value trade at a wide discount to US growth. A weaker-dollar regime and a broadening cycle argue for trimming home bias.",
    structures: ["International ETF", "Value basket"]
  },

  /* ---- Real Assets ---- */
  {
    id: "listed-infra", themeId: "realassets", intent: "income", title: "Listed & private infrastructure",
    type: "Strategic", assetClass: "Real Assets", sector: "Infrastructure", bucket: "Income",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "Toll roads, midstream and contracted power deliver inflation-linked, equity-like income with lower drawdown — a core diversifier for income-oriented books.",
    structures: ["Infrastructure fund", "Private markets"]
  },
  {
    id: "real-estate", themeId: "realassets", intent: "income", title: "Real estate, selectively",
    type: "Opportunistic", assetClass: "Real Assets", sector: "Real Estate", bucket: "Income",
    conviction: "Medium", horizon: "12m",
    thesis: "With rates peaking, high-quality logistics, data-center and residential real estate offer a re-rating opportunity and a contracted income stream.",
    structures: ["REIT basket", "Private real estate"]
  },

  /* ---- Resilience & Protection ---- */
  {
    id: "structured-protection", themeId: "resilience", intent: "protect", title: "Structured downside protection",
    type: "Strategic", assetClass: "Multi-Asset", sector: "Broad", bucket: "Preservation",
    conviction: "High", horizon: "Strategic",
    thesis: "After a strong run in risk assets, buffered notes and collars let concentrated holders keep upside participation while defining the downside — protect the gains without realising the tax.",
    structures: ["Buffered note", "Zero-cost collar"]
  },
  {
    id: "diversifiers", themeId: "resilience", intent: "protect", title: "Diversifiers & hedges",
    type: "Strategic", assetClass: "Alternatives", sector: "Broad", bucket: "Preservation",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "Macro, trend and relative-value strategies add a return stream that is genuinely uncorrelated to a 60/40 — ballast for the next drawdown.",
    structures: ["Liquid alternatives", "Macro sleeve"]
  },

  /* ---- Gold & Currency ---- */
  {
    id: "gold-hedge", themeId: "gold", intent: "protect", tickers: ["XAU", "GLD", "4GLD", "GDX", "IAU", "GLDM"], title: "Gold as a debasement hedge",
    type: "Strategic", assetClass: "Commodity", sector: "Gold", bucket: "Preservation",
    conviction: "High", horizon: "Strategic",
    thesis: "Persistent deficits, central-bank buying and geopolitical risk underpin gold as the cleanest tail hedge. We treat it as strategic ballast, sized to the book's protection gap.",
    structures: ["Physical / ETC", "Gold accumulator"]
  },
  {
    id: "fx-diversify", themeId: "gold", intent: "protect", title: "Currency diversification & FX overlays",
    type: "Opportunistic", assetClass: "Multi-Asset", sector: "FX", bucket: "Preservation",
    conviction: "Medium", horizon: "12m",
    thesis: "Books that have drifted heavily into one currency carry an unmanaged risk. A weaker-dollar regime argues for FX overlays and hedging the mismatch between base currency and asset currency.",
    structures: ["FX forward / collar", "Currency-hedged sleeve"]
  },

  /* ---- Healthcare Innovation ---- */
  {
    id: "glp1", themeId: "health", intent: "add", title: "GLP-1 & medical innovation",
    type: "Thematic", assetClass: "Equity", sector: "Healthcare", bucket: "Growth",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "Metabolic-disease therapeutics, devices and tools offer a durable, less cyclical growth engine that is under-owned in most growth books — a quality diversifier away from tech.",
    structures: ["Direct equity", "Healthcare basket"]
  },

  /* ---- Structured Outcomes ---- */
  {
    id: "halo-acm", themeId: "structured", intent: "income", title: "HALO equal-weight basket autocall — CEG · MP Materials · CAT",
    type: "Opportunistic", assetClass: "Structured", sector: "Broad", bucket: "Income",
    conviction: "High", horizon: "12m",
    thesis: "The desk's flagship note: an Autocall Market Plus (ACM+) on an equally-weighted basket of Constellation Energy, MP Materials and Caterpillar — one-third each. It pays a fixed 24% p.a. coupon in USD while the basket holds above 80% of its start level, and autocalls early if it rallies. Three different drivers — power, rare-earth materials and industrials — combine into one volatile basket that funds the rich coupon, with a 20% cushion before any capital is at risk. A packaged note Retail can hold.",
    structures: ["HALO basket (ACM+)", "Phoenix autocall", "Reverse convertible", "Capital-protected note"]
  },
  {
    id: "struct-income", themeId: "structured", intent: "income", title: "Defined-income autocalls on names you'd own",
    type: "Strategic", assetClass: "Structured", sector: "Broad", bucket: "Income",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "Single-stock and worst-of autocalls (ACM+ / Phoenix) and reverse convertibles on quality names you'd be happy to own anyway — turning a flat-to-up view into a high contractual coupon with a soft capital barrier. The core building block of the structured-notes sleeve.",
    structures: ["Phoenix autocall", "Reverse convertible", "Buffered note", "Capital-protected note"]
  },
  {
    id: "struct-protect", themeId: "structured", intent: "protect", title: "Protected & buffered participation",
    type: "Strategic", assetClass: "Structured", sector: "Broad", bucket: "Preservation",
    conviction: "High", horizon: "Strategic",
    thesis: "Stay invested with a floor — buffered and capital-protected notes that give equity-index upside (often to a cap) while protecting some or all of the downside. The way to keep a concentrated winner's upside, or re-enter after a loss, without taking full drawdown risk.",
    structures: ["Buffered note", "Capital-protected note", "Structured note"]
  }
];

/* ----------------------------------- CLIENTS -------------------------------
   classification: Retail | Professional. Retail cannot trade OTC / complex
   (the scanner suggests the action anyway but flags appropriateness).
   positions carry sector + pnlPct + ccy so the scanner can reason about them.
*/
const SEED_CLIENTS = [
  /* =========================== FABLE (unchanged-ish) ===================== */
  {
    id: "fable", name: "Fable", ccy: "USD", aum: 38.0,
    classification: "Professional", mifid: "MiFID Professional",
    relationship: "3-yr relationship · Professional · Aggressive growth",
    risk: "Aggressive",
    profile: "US tech founder, options-fluent. Concentrated in the AI complex at high single-stock weights, minimal cash. Comfortable with autocalls, overwrites and leveraged certificates.",
    split: { Equity: 88, Structured: 6, Cash: 4, "Fixed Income": 2 },
    goals: {
      objective: "Aggressive capital growth concentrated in the AI complex",
      horizon: "Long-term · 10+ yrs",
      funding: { headline: "Grow to $75m by 2034", metricLabel: "Projected value", current: 38, target: 75, unit: "$m", status: "On track" }
    },
    positions: [
      { name: "NVIDIA",   ticker: "NVDA US", assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 24.0, pnlPct: 15,  entryDate: "2025-11-04", entrySpot: 178.00, mat: null, note: "Largest position; near its highs ~$205." },
      { name: "Broadcom", ticker: "AVGO US", assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 14.0, pnlPct: 30,  entryDate: "2026-02-10", entrySpot: 295.00, mat: null, note: "Dipped ~15% after the 3-Jun print, since recovered to ~$384." },
      { name: "Micron",   ticker: "MU US",   assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 13.0, pnlPct: 1582, entryDate: "2023-05-15", entrySpot: 62.00, mat: null, note: "HBM supercycle; ~17x unrealised gain at ~$1,043." },
      { name: "ASML",     ticker: "ASML NA", assetClass: "Equity", sector: "Technology", ccy: "EUR", weightPct: 19.0, pnlPct: 121, entryDate: "2024-09-20", entrySpot: 720.00, mat: null, note: "Semi-cap leader; ~€1,591." },
      { name: "Microsoft",ticker: "MSFT US", assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 18.0, pnlPct: -4,  entryDate: "2024-03-12", entrySpot: 410.00, mat: null, note: "AI monetization core; modest drawdown YTD." },
      { name: "Phoenix autocall (semis)", ticker: "—", assetClass: "Structured", sector: "Technology", ccy: "USD", weightPct: 6.0, pnlPct: 4, entryDate: "2025-12-01", entrySpot: null, mat: "2027-12-01", note: "Yield on range-bound semis." },
      { name: "Short IG bonds", ticker: "—", assetClass: "Fixed Income", sector: "Credit", ccy: "USD", weightPct: 2.0, pnlPct: 0, entryDate: "2025-10-01", entrySpot: null, mat: "2027-10-01", note: "Thin core sleeve." },
      { name: "USD cash", ticker: "—", assetClass: "Cash", sector: "Cash", ccy: "USD", weightPct: 4.0, pnlPct: 0, entryDate: null, entrySpot: null, mat: null, note: "Idle." }
    ],
    summary: "Concentrated, options-fluent AI-growth book — NVDA, AVGO and the semis supply chain at high single-stock weights, almost no cash. Micron is now a ~17x position after the memory supercycle and ASML has more than doubled, while AVGO has recovered from its post-print dip. The agenda is to keep the upside but get paid for the volatility: protect the outsized Micron and ASML gains, overwrite rich premium, and diversify the single-sector risk into the broader AI build-out."
  },

  /* =========================== AURORA (real book) ======================== */
  {
    id: "aurora", name: "Aurora", ccy: "EUR", aum: 50.2,
    classification: "Retail", mifid: "MiFID Retail",
    relationship: "5-yr relationship · MiFID Retail · Growth + income",
    risk: "Growth, with income needs",
    profile: "EMEA private-bank client, growth with income needs. The book is 72% USD against an EUR base, with a dominant Micron position into earnings and two bonds underwater on rates.",
    split: { Equity: 70.9, "Fixed Income": 13.8, Commodity: 5.2, Cash: 10.1 },
    goals: {
      objective: "Grow the book while drawing income — and protect the concentrated MU gain",
      horizon: "Long-term · 7–10 yrs",
      funding: { headline: "Grow to €70m by 2035 while drawing income", metricLabel: "Projected value", current: 50.2, target: 70, unit: "€m", status: "On track" }
    },
    positions: [
      { name: "Micron",        ticker: "MU US",  assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 25.8, pnlPct: 2645, entryDate: "2019-06-10", entrySpot: 38.00, mat: null, note: "~27x gain at ~$1,043; FQ3 earnings 24-Jun; IVol rich." },
      { name: "SPDR S&P 500",  ticker: "SPY US", assetClass: "Equity", sector: "Broad",     ccy: "USD", weightPct: 25.2, pnlPct: 106, entryDate: "2021-02-01", entrySpot: 360.00, mat: null, note: "Core beta anchor." },
      { name: "NVIDIA",        ticker: "NVDA US",assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 7.2,  pnlPct: 0,   entryDate: "2026-01-20", entrySpot: 205.00, mat: null, note: "Roughly flat since January; house still likes it." },
      { name: "US Treasury 1.25% '31", ticker: "T 1.25 08/31", assetClass: "Fixed Income", sector: "Rates", ccy: "USD", weightPct: 6.0, pnlPct: -15, entryDate: "2021-08-15", entrySpot: 98.50, mat: "2031-08-31", note: "Underwater on rates — bond-swap candidate." },
      { name: "Xetra-Gold ETC",ticker: "4GLD GY",assetClass: "Commodity", sector: "Gold",  ccy: "EUR", weightPct: 5.2,  pnlPct: 180, entryDate: "2020-03-01", entrySpot: 42.00, mat: null, note: "Tail hedge — protective." },
      { name: "TotalEnergies", ticker: "TTE FP", assetClass: "Equity", sector: "Energy",    ccy: "EUR", weightPct: 4.3,  pnlPct: 50,  entryDate: "2022-05-10", entrySpot: 48.00, mat: null, note: "Energy hedge." },
      { name: "SAP",           ticker: "SAP GY", assetClass: "Equity", sector: "Technology", ccy: "EUR", weightPct: 8.4,  pnlPct: 48,  entryDate: "2021-09-01", entrySpot: 95.00, mat: null, note: "Winner off its highs (~€141) — overwrite candidate." },
      { name: "US IG corporates", ticker: "—", assetClass: "Fixed Income", sector: "Credit", ccy: "USD", weightPct: 7.8, pnlPct: 0, entryDate: "2025-09-01", entrySpot: null, mat: "2030-09-01", note: "Core USD income sleeve." },
      { name: "EUR cash",      ticker: "—", assetClass: "Cash", sector: "Cash", ccy: "EUR", weightPct: 10.1, pnlPct: 0, entryDate: null, entrySpot: null, mat: null, note: "Idle; ~€5m equivalent." }
    ],
    summary: "EMEA book dominated by a 25.8% Micron position on a ~27x gain into a 24-Jun print, 72% USD against an EUR base, with a bond underwater on rates and gold and TotalEnergies as deliberate hedges. The agenda: protect the outsized MU concentration, hedge the USD/EUR mismatch, harvest the underwater bond, monetize SAP's gain, and put idle cash to work — while protecting the gold and energy hedges, not trimming them."
  },

  /* =========================== SCOTT (biggest book) ====================== */
  {
    id: "scott", name: "Scott", ccy: "USD", aum: 124.0,
    classification: "Retail", mifid: "US Retail",
    relationship: "11-yr relationship · Retiree · Income & preservation",
    risk: "Conservative income",
    profile: "The desk's largest relationship. A broad, well-diversified preservation book — treasuries, munis, dividend equity, regulated utilities and infrastructure — but carrying a handful of underwater single names and a long-duration bond that need attention.",
    split: { Equity: 30, "Fixed Income": 48, "Real Assets": 9, Commodity: 3, Cash: 10 },
    goals: {
      objective: "Fund retirement income and preserve capital across the whole estate",
      horizon: "Drawdown · 0–5 yrs",
      funding: { headline: "Fund $3.6m/yr retirement income", metricLabel: "Annual income run-rate", current: 3.0, target: 3.6, unit: "$m/yr", status: "Slightly behind" }
    },
    positions: [
      { name: "US Treasury ladder",   ticker: "—",      assetClass: "Fixed Income", sector: "Rates",      ccy: "USD", weightPct: 17.0, pnlPct: 1,   entryDate: "2024-01-15", entrySpot: null, mat: "2031-01-15", note: "2–7yr ladder, current coupons." },
      { name: "US Treasury 2.0% '40", ticker: "T 2.0 40",assetClass: "Fixed Income", sector: "Rates",     ccy: "USD", weightPct: 8.0,  pnlPct: -24, entryDate: "2020-07-01", entrySpot: 72.00, mat: "2040-05-15", note: "Long-duration — bought at the lows; deep loss, worse on the hawkish back-up to ~4.5%." },
      { name: "Muni bond sleeve",     ticker: "—",      assetClass: "Fixed Income", sector: "Credit",     ccy: "USD", weightPct: 13.0, pnlPct: 2,   entryDate: "2023-06-01", entrySpot: null, mat: "2033-06-01", note: "Tax-exempt income." },
      { name: "NextEra Energy",       ticker: "NEE US", assetClass: "Equity",       sector: "Utilities",  ccy: "USD", weightPct: 7.0,  pnlPct: 49,  entryDate: "2022-11-01", entrySpot: 58.00, mat: null, note: "Regulated yield + load growth." },
      { name: "Johnson & Johnson",    ticker: "JNJ US", assetClass: "Equity",       sector: "Healthcare", ccy: "USD", weightPct: 9.0,  pnlPct: 55,  entryDate: "2022-04-01", entrySpot: 152.00, mat: null, note: "Defensive dividend." },
      { name: "Pfizer",               ticker: "PFE US", assetClass: "Equity",       sector: "Healthcare", ccy: "USD", weightPct: 5.0,  pnlPct: -38, entryDate: "2021-12-01", entrySpot: 42.00, mat: null, note: "Underwater — post-COVID de-rating; ~$26." },
      { name: "Realty Income (REIT)", ticker: "O US",   assetClass: "Real Assets",  sector: "Real Estate",ccy: "USD", weightPct: 5.0,  pnlPct: -11, entryDate: "2021-09-01", entrySpot: 68.00, mat: null, note: "Underwater on rates; high yield." },
      { name: "Listed infra fund",    ticker: "—",      assetClass: "Real Assets",  sector: "Infrastructure", ccy: "USD", weightPct: 4.0, pnlPct: 9, entryDate: "2023-03-01", entrySpot: null, mat: null, note: "Inflation-linked income." },
      { name: "Procter & Gamble",     ticker: "PG US",  assetClass: "Equity",       sector: "Consumer",   ccy: "USD", weightPct: 9.0,  pnlPct: 22,  entryDate: "2022-02-01", entrySpot: 138.00, mat: null, note: "Defensive dividend." },
      { name: "Gold ETF",             ticker: "GLD US", assetClass: "Commodity",    sector: "Gold",       ccy: "USD", weightPct: 3.0,  pnlPct: 136, entryDate: "2021-06-01", entrySpot: 168.00, mat: null, note: "Small hedge sleeve; gold ~$4,300." },
      { name: "IG corporate bonds",   ticker: "—",      assetClass: "Fixed Income", sector: "Credit",     ccy: "USD", weightPct: 10.0, pnlPct: 0,   entryDate: "2025-08-01", entrySpot: null, mat: "2030-08-01", note: "Core fixed income." },
      { name: "USD cash",             ticker: "—",      assetClass: "Cash",         sector: "Cash",       ccy: "USD", weightPct: 10.0, pnlPct: 0,   entryDate: null, entrySpot: null, mat: null, note: "Drawdown buffer; some redeployable." }
    ],
    summary: "The desk's biggest and most diversified book — a $124m preservation estate built for retirement income. It is in good shape, but three things need work: a long-duration Treasury down 24% and two single names (Pfizer, Realty Income) underwater are textbook tax-loss-harvest and bond-swap candidates, the cash sleeve can be laddered for more income, and the book is light on protection relative to its size."
  },

  /* =========================== AMAR (Pro, commodities + BTC) ============= */
  {
    id: "amar", name: "Amar", ccy: "USD", aum: 71.0,
    classification: "Professional", mifid: "MiFID Professional",
    relationship: "7-yr relationship · Family office · Real assets + digital",
    risk: "Growth, real-asset tilt",
    profile: "APAC family-office mandate, multi-currency. Strong tilt to commodities, gold, energy and infrastructure — plus a large Bitcoin position that is now well underwater. Comfortable with options, structured products and private markets.",
    split: { Equity: 26, Commodity: 12, "Real Assets": 19, Alternatives: 23, "Fixed Income": 12, Cash: 8 },
    goals: {
      objective: "Compound a real-asset core across cycles; rehabilitate the digital-asset sleeve",
      horizon: "Multi-generational · 10+ yrs",
      funding: { headline: "Preserve real value, grow to $90m by 2036", metricLabel: "Projected value", current: 71, target: 90, unit: "$m", status: "Slightly behind" }
    },
    positions: [
      { name: "Bitcoin",            ticker: "BTC",     assetClass: "Alternatives", sector: "Crypto",         ccy: "USD", weightPct: 16.0, pnlPct: -30, entryDate: "2024-11-01", entrySpot: 92000.00, mat: null, note: "Bought near the highs; ~$64k now — the book's problem child." },
      { name: "Gold (allocated)",   ticker: "XAU",     assetClass: "Commodity",    sector: "Gold",           ccy: "USD", weightPct: 12.0, pnlPct: 132, entryDate: "2022-01-01", entrySpot: 1850.00, mat: null, note: "Strategic hard-asset core; gold ~$4,300." },
      { name: "Global infra fund",  ticker: "—",       assetClass: "Real Assets",  sector: "Infrastructure", ccy: "USD", weightPct: 13.0, pnlPct: 12,  entryDate: "2023-05-01", entrySpot: null, mat: null, note: "Listed infrastructure." },
      { name: "Shell",              ticker: "SHEL LN", assetClass: "Equity",       sector: "Energy",         ccy: "GBP", weightPct: 8.0,  pnlPct: 42,  entryDate: "2022-06-01", entrySpot: 22.50, mat: null, note: "Majors / energy premium; ~£32." },
      { name: "EM equity sleeve",   ticker: "—",       assetClass: "Equity",       sector: "Broad",          ccy: "USD", weightPct: 12.0, pnlPct: 5,   entryDate: "2024-02-01", entrySpot: null, mat: null, note: "APAC / EM growth." },
      { name: "GDX gold miners",    ticker: "GDX US",  assetClass: "Equity",       sector: "Materials",      ccy: "USD", weightPct: 6.0,  pnlPct: 122, entryDate: "2025-09-01", entrySpot: 38.00, mat: null, note: "Miners caught up to spot — ~$84, +122%." },
      { name: "Private infra co-invest", ticker: "—",  assetClass: "Real Assets",  sector: "Infrastructure", ccy: "USD", weightPct: 6.0,  pnlPct: 0,   entryDate: "2024-06-01", entrySpot: null, mat: "2034-06-01", note: "Datacenter power." },
      { name: "EUR IG bonds",       ticker: "—",       assetClass: "Fixed Income", sector: "Credit",         ccy: "EUR", weightPct: 12.0, pnlPct: -6,  entryDate: "2023-10-01", entrySpot: null, mat: "2029-10-01", note: "Diversifier; mild duration loss." },
      { name: "Macro hedge fund",   ticker: "—",       assetClass: "Alternatives", sector: "Broad",          ccy: "USD", weightPct: 7.0,  pnlPct: 8,   entryDate: "2023-01-01", entrySpot: null, mat: null, note: "Uncorrelated sleeve." },
      { name: "USD cash",           ticker: "—",       assetClass: "Cash",         sector: "Cash",           ccy: "USD", weightPct: 8.0,  pnlPct: 0,   entryDate: null, entrySpot: null, mat: null, note: "Dry powder." }
    ],
    summary: "Multi-currency real-assets family office with a hard-asset core (gold, energy, infrastructure) and an uncorrelated alternatives sleeve — but the standout issue is a 16% Bitcoin position down 30%. As a Professional client we can be creative: harvest the crypto loss and re-enter with a downside-defined structure, collar or partially monetize it, and keep building the gold and infrastructure core. The gold core and the miners (now caught up to spot, +122%) have done the heavy lifting."
  },

  /* =========================== JACOB (very big + liabilities) =========== */
  {
    id: "jacob", name: "Jacob", ccy: "USD", aum: 96.0,
    classification: "Professional", mifid: "MiFID Professional",
    relationship: "4-yr relationship · Executive · Balanced + liabilities",
    risk: "Moderate",
    profile: "Senior executive with a large balanced book — mega-cap quality, an index core and core fixed income — but a meaningful liability schedule: a $19m mortgage across two properties and a near-term tax bill. Liquidity and cashflow matching matter as much as returns.",
    split: { Equity: 58, "Fixed Income": 22, Structured: 8, "Real Assets": 7, Cash: 5 },
    liabilities: [
      { name: "Mortgage (two properties)", amount: 19.0, unit: "$m", note: "Floating-rate; resets with the curve." },
      { name: "Estimated tax (Q3)",        amount: 2.4,  unit: "$m", note: "Due September." }
    ],
    goals: {
      objective: "Grow wealth while comfortably servicing mortgage and tax liabilities",
      horizon: "Long-term · 8–10 yrs",
      funding: { headline: "Net worth to $120m by 2033 (after liabilities)", metricLabel: "Net projected value", current: 75, target: 120, unit: "$m", status: "On track" }
    },
    positions: [
      { name: "S&P 500 index core", ticker: "VOO US",  assetClass: "Equity",       sector: "Broad",      ccy: "USD", weightPct: 29.0, pnlPct: 92, entryDate: "2021-03-01", entrySpot: 360.00, mat: null, note: "Passive core." },
      { name: "Microsoft",          ticker: "MSFT US", assetClass: "Equity",       sector: "Technology", ccy: "USD", weightPct: 10.0, pnlPct: 41, entryDate: "2022-08-01", entrySpot: 280.00, mat: null, note: "Quality compounder." },
      { name: "Apple",              ticker: "AAPL US", assetClass: "Equity",       sector: "Technology", ccy: "USD", weightPct: 8.0,  pnlPct: 99, entryDate: "2022-10-01", entrySpot: 150.00, mat: null, note: "Mega-cap quality." },
      { name: "UnitedHealth",       ticker: "UNH US",  assetClass: "Equity",       sector: "Healthcare", ccy: "USD", weightPct: 6.0,  pnlPct: -26,entryDate: "2024-09-01", entrySpot: 540.00, mat: null, note: "Underwater (~$400); defensive compounder." },
      { name: "IG corporate bonds", ticker: "—",       assetClass: "Fixed Income", sector: "Credit",     ccy: "USD", weightPct: 14.0, pnlPct: 0,  entryDate: "2025-07-01", entrySpot: null, mat: "2030-07-01", note: "Core fixed income." },
      { name: "Muni bond sleeve",   ticker: "—",       assetClass: "Fixed Income", sector: "Credit",     ccy: "USD", weightPct: 8.0,  pnlPct: 1,  entryDate: "2024-05-01", entrySpot: null, mat: "2032-05-01", note: "Tax-aware income." },
      { name: "Buffered S&P note",  ticker: "—",       assetClass: "Structured",   sector: "Broad",      ccy: "USD", weightPct: 8.0,  pnlPct: 6,  entryDate: "2025-06-01", entrySpot: null, mat: "2027-06-01", note: "Downside-protected equity." },
      { name: "Listed infra fund",  ticker: "—",       assetClass: "Real Assets",  sector: "Infrastructure", ccy: "USD", weightPct: 7.0, pnlPct: 8, entryDate: "2023-04-01", entrySpot: null, mat: null, note: "Contracted income." },
      { name: "Apple covered-call income", ticker: "—",assetClass: "Equity",       sector: "Technology", ccy: "USD", weightPct: 5.0,  pnlPct: 12, entryDate: "2025-03-01", entrySpot: null, mat: null, note: "Overwrite income sleeve." },
      { name: "USD cash",           ticker: "—",       assetClass: "Cash",         sector: "Cash",       ccy: "USD", weightPct: 5.0,  pnlPct: 0,  entryDate: null, entrySpot: null, mat: null, note: "Tight vs upcoming liabilities." }
    ],
    summary: "A large balanced book with a complication most clients don't have: a $19m floating-rate mortgage and a $2.4m tax bill due in Q3, against only 5% cash. The agenda is liability-aware: build a liquidity and cashflow-matching sleeve (T-bills, munis), consider a securities-backed line rather than selling appreciated stock into the tax event, and keep compounding the quality core — while recovering the UnitedHealth loss."
  },

  /* =========================== PRAHNAV (retail, goals-aligned, concentrated) */
  {
    id: "prahnav", name: "Prahnav", ccy: "USD", aum: 44.0,
    classification: "Retail", mifid: "MiFID Retail",
    relationship: "2-yr relationship · Tech operator · Goals-aligned growth",
    risk: "Growth",
    profile: "US tech operator whose top-down allocation is the most goals-aligned in the book — buckets sit almost exactly on target. The issue is bottom-up: two concentrated single stocks dominate and need protecting, and as a Retail client the obvious collar needs handling.",
    split: { Equity: 70, "Fixed Income": 15, "Real Assets": 8, Cash: 7 },
    goals: {
      objective: "Steady goals-based growth toward a house purchase and long-term wealth",
      horizon: "Long-term · 7–10 yrs",
      funding: { headline: "Grow to $70m by 2034; $4m house deposit by 2028", metricLabel: "Projected value", current: 44, target: 70, unit: "$m", status: "On track" }
    },
    positions: [
      { name: "NVIDIA",          ticker: "NVDA US", assetClass: "Equity",       sector: "Technology", ccy: "USD", weightPct: 22.0, pnlPct: 294, entryDate: "2023-08-01", entrySpot: 52.00, mat: null, note: "Concentrated; huge unrealised gain — needs protecting." },
      { name: "Constellation Energy", ticker: "CEG US", assetClass: "Equity",   sector: "Utilities",  ccy: "USD", weightPct: 15.0, pnlPct: 181, entryDate: "2023-04-01", entrySpot: 95.00, mat: null, note: "Concentrated; datacenter-power winner." },
      { name: "S&P 500 index core", ticker: "VOO US",assetClass: "Equity",      sector: "Broad",      ccy: "USD", weightPct: 26.0, pnlPct: 72,  entryDate: "2023-01-01", entrySpot: 400.00, mat: null, note: "Diversified core." },
      { name: "ASML",            ticker: "ASML NA", assetClass: "Equity",       sector: "Technology", ccy: "EUR", weightPct: 7.0,  pnlPct: 115, entryDate: "2024-10-01", entrySpot: 740.00, mat: null, note: "Semi-cap." },
      { name: "IG corporate bonds", ticker: "—",    assetClass: "Fixed Income", sector: "Credit",     ccy: "USD", weightPct: 15.0, pnlPct: 1,   entryDate: "2025-08-01", entrySpot: null, mat: "2030-08-01", note: "Income sleeve, on plan." },
      { name: "Listed infra fund", ticker: "—",      assetClass: "Real Assets",  sector: "Infrastructure", ccy: "USD", weightPct: 8.0, pnlPct: 7, entryDate: "2024-01-01", entrySpot: null, mat: null, note: "Diversifier." },
      { name: "USD cash",        ticker: "—",        assetClass: "Cash",         sector: "Cash",       ccy: "USD", weightPct: 7.0,  pnlPct: 0,   entryDate: null, entrySpot: null, mat: null, note: "House-deposit reserve building." }
    ],
    summary: "The most goals-aligned book at the top line — bucket allocation sits almost exactly on its strategic target. The whole job here is bottom-up risk management: NVDA (22%, +294%) and Constellation (15%, +181%) are two concentrated, deep-in-the-money winners that should be protected with collars to lock in gains ahead of the house-deposit goal. Because Prahnav is Retail, the collar needs reclassification or a non-complex protective alternative — that's the key conversation."
  },

  /* =========================== BEN (retail, equity-heavy) =============== */
  {
    id: "ben", name: "Ben", ccy: "USD", aum: 29.0,
    classification: "Retail", mifid: "MiFID Retail",
    relationship: "9-yr relationship · Business owner · Equity-focused",
    risk: "Moderate, value tilt",
    profile: "UK/US business owner with a heavily equity-weighted book — value and quality names plus an energy overweight — but very little fixed income or protection. The opportunity is to diversify the equity concentration into income and ballast.",
    split: { Equity: 82, "Fixed Income": 6, "Real Assets": 4, Cash: 8 },
    goals: {
      objective: "Grow the equity book while building durable income and ballast",
      horizon: "Long-term · 5–8 yrs",
      funding: { headline: "Fund $0.8m/yr income; grow to $45m by 2033", metricLabel: "Annual income run-rate", current: 0.5, target: 0.8, unit: "$m/yr", status: "Behind" }
    },
    positions: [
      { name: "ExxonMobil",     ticker: "XOM US",  assetClass: "Equity", sector: "Energy",     ccy: "USD", weightPct: 13.0, pnlPct: 61, entryDate: "2022-09-01", entrySpot: 88.00, mat: null, note: "Energy overweight; buyback + dividend." },
      { name: "Shell",          ticker: "SHEL LN", assetClass: "Equity", sector: "Energy",     ccy: "GBP", weightPct: 10.0, pnlPct: 39, entryDate: "2022-06-01", entrySpot: 23.00, mat: null, note: "Energy overweight." },
      { name: "Berkshire Hathaway", ticker: "BRK/B US", assetClass: "Equity", sector: "Financials", ccy: "USD", weightPct: 18.0, pnlPct: 54, entryDate: "2022-01-01", entrySpot: 320.00, mat: null, note: "Quality compounder." },
      { name: "Apple",          ticker: "AAPL US", assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 14.0, pnlPct: 97, entryDate: "2022-11-01", entrySpot: 152.00, mat: null, note: "Mega-cap quality." },
      { name: "JPMorgan",       ticker: "JPM US",  assetClass: "Equity", sector: "Financials", ccy: "USD", weightPct: 12.0, pnlPct: 95, entryDate: "2023-02-01", entrySpot: 165.00, mat: null, note: "Financials." },
      { name: "Caterpillar",    ticker: "CAT US",  assetClass: "Equity", sector: "Industrials",ccy: "USD", weightPct: 8.0,  pnlPct: 226, entryDate: "2023-05-01", entrySpot: 290.00, mat: null, note: "Cyclical quality; record backlog, ~$946." },
      { name: "Diageo",         ticker: "DGE LN",  assetClass: "Equity", sector: "Consumer",   ccy: "GBP", weightPct: 7.0,  pnlPct: -53,entryDate: "2023-03-01", entrySpot: 32.00, mat: null, note: "Underwater — staples de-rating; ~£15." },
      { name: "Short IG bonds", ticker: "—",       assetClass: "Fixed Income", sector: "Credit",ccy: "USD", weightPct: 6.0,  pnlPct: 1,  entryDate: "2025-09-01", entrySpot: null, mat: "2027-09-01", note: "Thin fixed-income sleeve." },
      { name: "REIT sleeve",    ticker: "—",       assetClass: "Real Assets", sector: "Real Estate", ccy: "USD", weightPct: 4.0, pnlPct: 3, entryDate: "2024-02-01", entrySpot: null, mat: null, note: "Small real-asset allocation." },
      { name: "USD cash",       ticker: "—",       assetClass: "Cash", sector: "Cash",         ccy: "USD", weightPct: 8.0,  pnlPct: 0,  entryDate: null, entrySpot: null, mat: null, note: "Idle." }
    ],
    summary: "An equity-heavy value book — energy, financials and quality compounders at 82% equity with barely any fixed income or protection. It has done well, but it is one drawdown away from a problem and it under-delivers income versus the goal. The agenda is to diversify: extend into core fixed income and infrastructure for income and ballast, trim the energy-sector concentration, and recover the Diageo loss — all with non-complex instruments, since Ben is Retail."
  },

  /* =========================== MORGAN (Pro, max-aggressive) ============== */
  {
    id: "morgan", name: "Mitch", ccy: "USD", aum: 38.0,
    classification: "Professional", mifid: "MiFID Professional",
    relationship: "3-yr relationship · Tech founder · Maximum growth",
    risk: "Aggressive — maximum long-term capital growth, very high risk tolerance",
    profile: "Young tech founder with post-exit liquidity, no liabilities and no income needs. Wants maximum compounding and is explicitly comfortable with large drawdowns and concentrated, illiquid and digital-asset risk. The book is ~92% risk assets — a 24% single-name NVIDIA position, direct crypto, a leveraged Nasdaq sleeve and late-stage venture — with only a token cash buffer. There is no goal split to read off a form; the goal has to be inferred from how the book is actually run.",
    split: { Equity: 64, Alternatives: 28, Cash: 8 },
    goals: {
      objective: "Maximize long-term capital — high conviction, fully invested, drawdowns accepted",
      horizon: "Long-term · 15–20 yrs",
      /* NO funding goal on file and nothing numeric stated. deriveGoals infers the goal
         from the book + the stated aggressive risk appetite (no required-return signal
         → source "stated-risk"). */
    },
    positions: [
      { name: "NVIDIA",                ticker: "NVDA US", assetClass: "Equity",       sector: "Technology", ccy: "USD", weightPct: 24.0, pnlPct: 1264, entryDate: "2022-11-01", entrySpot: 15.00, mat: null, note: "Core AI position (split-adjusted entry) — huge unrealised gain, deliberately unhedged." },
      { name: "Bitcoin",               ticker: "BTC",     assetClass: "Alternatives", sector: "Crypto",     ccy: "USD", weightPct: 18.0, pnlPct: 94,  entryDate: "2021-02-01", entrySpot: 33000.00, mat: null, note: "Direct digital-asset holding in custody; ~$64k." },
      { name: "Tesla",                 ticker: "TSLA US", assetClass: "Equity",       sector: "Consumer",   ccy: "USD", weightPct: 11.0, pnlPct: 230, entryDate: "2023-01-01", entrySpot: 120.00, mat: null, note: "High-beta growth." },
      { name: "S&P 500 index core",    ticker: "VOO US",  assetClass: "Equity",       sector: "Broad",      ccy: "USD", weightPct: 12.0, pnlPct: 92,  entryDate: "2022-06-01", entrySpot: 360.00, mat: null, note: "The only diversified sleeve." },
      { name: "2x Nasdaq leveraged ETF", ticker: "—",     assetClass: "Equity",       sector: "Technology", ccy: "USD", weightPct: 10.0, pnlPct: 60,  entryDate: "2023-03-01", entrySpot: null, mat: null, note: "Daily-leveraged Nasdaq — tactical, high decay risk." },
      { name: "Coinbase",              ticker: "COIN US", assetClass: "Equity",       sector: "Financials", ccy: "USD", weightPct: 7.0,  pnlPct: 200, entryDate: "2023-05-01", entrySpot: 55.00, mat: null, note: "Crypto-levered equity; ~$165." },
      { name: "Pre-IPO venture sleeve",ticker: "—",       assetClass: "Alternatives", sector: "Broad",      ccy: "USD", weightPct: 10.0, pnlPct: 0,   entryDate: "2024-01-01", entrySpot: null, mat: null, note: "Illiquid late-stage venture." },
      { name: "USD cash",              ticker: "—",       assetClass: "Cash",         sector: "Cash",       ccy: "USD", weightPct: 8.0,  pnlPct: 0,   entryDate: null, entrySpot: null, mat: null, note: "Token buffer — fully invested by choice." }
    ],
    summary: "A max-aggressive founder book: ~92% in risk assets with a 24% NVIDIA single name, 18% direct Bitcoin, a leveraged Nasdaq sleeve and late-stage venture, against only 8% cash and no fixed income, gold or protection. No liabilities, no income draw, 15–20yr horizon. The whole point of this client is that the goal can't be taken off a form — it has to be inferred from the book, which screams growth. The standing risk note is concentration: NVDA and crypto dominate, so the real conversation is sizing and optional protection on the winners, not whether to add more risk."
  },

  /* =========================== TEJPAUL (unprofiled, balanced book) ======= */
  {
    id: "tejpaul", name: "Fotis", ccy: "USD", aum: 60.0,
    classification: "Retail", mifid: "MiFID Retail",
    relationship: "6-yr relationship · Inherited account · Not formally profiled",
    risk: "Not formally risk-profiled",
    profile: "Inherited the account and has never sat for a risk questionnaire or set explicit targets — there is no stated mandate and no funding goal on file. No liabilities and no income draw. The only evidence of intent is how the book is actually invested: a broadly balanced ~60/35 split — diversified equity core, investment-grade and Treasury fixed income, a little infrastructure and gold — with no large single name. The system has to read his goals off the portfolio alone.",
    split: { Equity: 57, "Fixed Income": 20, "Real Assets": 8, Commodity: 3, Cash: 12 },
    goals: {
      objective: "No formal mandate on file — invests broadly for long-term growth with some income",
      horizon: "Long-term · 7–10 yrs",
      /* NO funding goal and NO stated risk profile — deriveGoals must infer everything
         from the current book (no required-return, no stated willingness → source
         "revealed"). The balanced book should reveal a moderate appetite on its own. */
    },
    positions: [
      { name: "S&P 500 index core",  ticker: "VOO US",  assetClass: "Equity",       sector: "Broad",      ccy: "USD", weightPct: 24.0, pnlPct: 68, entryDate: "2021-05-01", entrySpot: 410.00, mat: null, note: "Diversified core." },
      { name: "Global equity fund",  ticker: "—",       assetClass: "Equity",       sector: "Broad",      ccy: "USD", weightPct: 16.0, pnlPct: 20, entryDate: "2021-09-01", entrySpot: null, mat: null, note: "Ex-US diversification." },
      { name: "Microsoft",           ticker: "MSFT US", assetClass: "Equity",       sector: "Technology", ccy: "USD", weightPct: 9.0,  pnlPct: 36, entryDate: "2022-03-01", entrySpot: 290.00, mat: null, note: "Largest single name — still modest." },
      { name: "Berkshire Hathaway",  ticker: "BRK/B US",assetClass: "Equity",       sector: "Financials", ccy: "USD", weightPct: 8.0,  pnlPct: 64, entryDate: "2022-01-01", entrySpot: 300.00, mat: null, note: "Quality compounder." },
      { name: "IG corporate bonds",  ticker: "—",       assetClass: "Fixed Income", sector: "Credit",     ccy: "USD", weightPct: 12.0, pnlPct: 0,  entryDate: "2025-06-01", entrySpot: null, mat: "2030-06-01", note: "Core income sleeve." },
      { name: "US Treasury ladder",  ticker: "—",       assetClass: "Fixed Income", sector: "Rates",      ccy: "USD", weightPct: 8.0,  pnlPct: 1,  entryDate: "2024-02-01", entrySpot: null, mat: "2031-02-01", note: "2–7yr ladder." },
      { name: "Listed infra fund",   ticker: "—",       assetClass: "Real Assets",  sector: "Infrastructure", ccy: "USD", weightPct: 8.0, pnlPct: 6, entryDate: "2023-04-01", entrySpot: null, mat: null, note: "Contracted income diversifier." },
      { name: "Gold ETF",            ticker: "GLD US",  assetClass: "Commodity",    sector: "Gold",       ccy: "USD", weightPct: 3.0,  pnlPct: 136, entryDate: "2021-06-01", entrySpot: 168.00, mat: null, note: "Small hedge sleeve; gold ~$4,300." },
      { name: "USD cash",            ticker: "—",       assetClass: "Cash",         sector: "Cash",       ccy: "USD", weightPct: 12.0, pnlPct: 0,  entryDate: null, entrySpot: null, mat: null, note: "Idle buffer." }
    ],
    summary: "A textbook 'no stated goal' case: never risk-profiled, no targets, no funding goal, no liabilities. The book itself is the only signal — broadly balanced (~57% equity, ~35% defensive, no concentrated name), which reads as a moderate appetite. The whole point of Fotis is to watch the system infer a moderate goal from the portfolio alone, with no form to read off."
  }
];

/* ===========================================================================
   SYNTHETIC 24-month sector-allocation history  ⚠️ SEED DATA — REPLACE LATER
   ---------------------------------------------------------------------------
   The books only carry CURRENT holdings, so we synthesise a plausible monthly
   history to feed the Affinity-fit axis (mapping.js). Attached as:

     client.sectorHistory[sector] = [24 numbers]   // index 0 = most recent month,
                                                    // index 23 = oldest

   Invariants / design:
   • index 0 EXACTLY equals the client's current allocation to that sector
     (Σ weightPct of its positions in that sector), so history is consistent
     with the live book.
   • The trajectory toward "now" is shaped from the sector's dominant position
     P&L (a proxy for how the weight got there — pure price drift aside):
         winner (pnl ≥ 50)  → 'ramp'  (built up into the book — like Micron)
         loser  (pnl ≤ -10) → 'fade'  (was a larger slice, drifted down)
         else               → 'core'  (held roughly steady around current)
   • Deterministic (no RNG) so the seed is reproducible.
   • Cash is excluded (not a thematic sector).

   To swap in REAL data: replace `client.sectorHistory[sector]` with the true
   24-month monthly series (index 0 = most recent). Nothing else changes.
=========================================================================== */
function _curSectorAlloc(client) {
  const m = {};
  (client.positions || []).forEach(p => { m[p.sector] = (m[p.sector] || 0) + p.weightPct; });
  return m;
}
function _sectorShape(client, sector) {
  const ps = (client.positions || []).filter(p => p.sector === sector);
  if (!ps.length) return "core";
  const top = ps.reduce((a, b) => (b.weightPct > a.weightPct ? b : a));
  if (top.pnlPct >= 50) return "ramp";
  if (top.pnlPct <= -10) return "fade";
  return "core";
}
function _genSectorHistory(cur, shape, seed) {
  const n = 24, arr = new Array(n);
  // oldest-month level as a fraction of current: ramps start low, fades start high
  const startFrac = shape === "ramp" ? 0.12 : shape === "fade" ? 1.30 : 0.92;
  for (let t = 0; t < n; t++) {
    let v;
    if (shape === "ramp") {
      // index 0 = current; index 1 sits at a small recent peak just ABOVE current
      // (so "now" is not the strict 24-mo max → affinity lands in the mid-90s, not
      // a saturated 100); index 2+ is a clean rise from the oldest up to ~current.
      if (t === 0) v = cur;
      else if (t === 1) v = cur * 1.05;
      else { const frac = (t - 2) / (n - 1 - 2); v = cur * 0.98 - (cur * 0.98 - cur * startFrac) * frac; }
    } else {
      const age = t / (n - 1);                        // 0 = newest … 1 = oldest
      v = cur * (1 - age * (1 - startFrac));           // linear: cur (now) → cur*startFrac (oldest)
    }
    if (t >= 4) v += Math.sin(t * 1.1 + seed) * cur * 0.04; // small deterministic wobble (older months only)
    arr[t] = Math.max(0, +v.toFixed(2));
  }
  arr[0] = +(+cur).toFixed(2);                         // most recent month == current allocation, exactly
  return arr;
}
SEED_CLIENTS.forEach(c => {
  const cur = _curSectorAlloc(c);
  c.sectorHistory = {};
  let seed = 0;
  Object.keys(cur).forEach(sec => {
    if (sec === "Cash") return;
    seed += 1.7;
    c.sectorHistory[sec] = _genSectorHistory(cur[sec], _sectorShape(c, sec), seed);
  });
});

/* ---------------------------------------------------------------------------
   Domain maps + helpers (shared by scanner.js, app.js, portfolio.html, morgan.js)
--------------------------------------------------------------------------- */
/* The goal model is THREE buckets — Growth · Income · Preservation — defined once in
   goals.js (GOALS3) and inferred per client by deriveGoals(). Cash/gold fold into
   Preservation and structured notes fold by purpose; there is no separate Structured
   or Liquidity goal bucket. Asset-class → bucket lives in goals.js::classBucket3. */

/* idea bucket override by sector role (energy majors read as income, etc.).
   Crypto is a high-beta RISK asset (see mapping.js HIGH_BETA_SECTORS) — it plays a
   Growth role, NOT Preservation. Gold is the genuine ballast. Values are 3-bucket. */
const SECTOR_BUCKET = { Energy: "Income", Utilities: "Income", "Real Estate": "Income", Infrastructure: "Income", Gold: "Preservation", Crypto: "Growth" };

/* asset classes shown in the coverage matrix, in order */
const ASSET_CLASSES = ["Equity", "Fixed Income", "Real Assets", "Commodity", "Alternatives", "Structured", "Cash"];

/* MiFID appropriateness — THE key distinction:
   - Structured products (autocalls, buffered/RevCon/capital-protected NOTES,
     certificates) are PACKAGED SECURITIES — a MiFID Retail client CAN trade them
     (they're complex, so appropriateness still applies, but they're not OTC).
   - OTC derivatives (collars, forwards, OTC options, accumulators, PVFs) are
     bilateral contracts a Retail client CANNOT trade without Professional
     re-classification.
   Order matters: check structured BEFORE otc (a "HALO basket (ACM+)" contains
   "basket" but is a structured note, not a non-complex basket). */
const STRUCTURED_KEYWORDS = ["structured note","structured re-entry","buffered","autocall","autocallable",
  "acm+","phoenix","reverse convertible","revcon","fcn","range note","bren","certificate",
  "capital-protected","capital protected","participation note","memory coupon","barrier note",
  "credit-linked","twin-win","shark-fin","booster","halo"];
const OTC_KEYWORDS = ["collar","risk reversal","seagull","accumulator","decumulator","prepaid","variable forward",
  "fx forward","forward / collar","dcd","dcs","dual currency","covered call","overwrite","cash-secured",
  "call spread","protective put"];

function complexityOf(structure) {
  const s = String(structure || "").toLowerCase();
  if (STRUCTURED_KEYWORDS.some(k => s.includes(k))) return "structured";
  if (OTC_KEYWORDS.some(k => s.includes(k))) return "otc";
  return "non-complex";
}
/* true only for genuinely OTC instruments (drives Retail "can't trade" flags) */
function isOtcOption(structure) { return complexityOf(structure) === "otc"; }
function isStructuredProduct(structure) { return complexityOf(structure) === "structured"; }

window.SEED = {
  themes: SEED_THEMES, ideas: SEED_IDEAS, clients: SEED_CLIENTS,
  SECTOR_BUCKET, ASSET_CLASSES,
  isOtcOption, isStructuredProduct, complexityOf
};
