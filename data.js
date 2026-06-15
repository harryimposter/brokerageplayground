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
  { id: "duration",   name: "Core Fixed Income",        blurb: "Extend duration and lock in yields before the cutting cycle compresses them." },
  { id: "broaden",    name: "Broadening Equity",        blurb: "Diversify beyond the mega-caps — quality cyclicals, value and international catch-up." },
  { id: "realassets", name: "Real Assets",              blurb: "Infrastructure and real estate for inflation-protected, contracted income." },
  { id: "resilience", name: "Resilience & Protection",  blurb: "Structured downside protection and diversifiers to carry risk through the cycle." },
  { id: "gold",       name: "Gold & Currency",          blurb: "Gold as a debasement hedge and currency diversification for concentrated-USD books." },
  { id: "health",     name: "Healthcare Innovation",    blurb: "GLP-1, devices and medical innovation as a durable, less-correlated growth engine." }
];

/* ----------------------------------- IDEAS --------------------------------- */
/* type: Thematic | Opportunistic | Strategic.  bucket: Growth|Income|Protection|Liquidity */
const SEED_IDEAS = [
  /* ---- AI & Productivity ---- */
  {
    id: "ai-compute", themeId: "ai", title: "AI infrastructure & compute leaders",
    type: "Thematic", assetClass: "Equity", sector: "Technology", bucket: "Growth",
    conviction: "High", horizon: "Strategic",
    thesis: "The build-out of AI compute remains supply-constrained into 2027. We stay long the leaders but increasingly express it with downside-defined structures given valuations and concentration.",
    structures: ["Direct equity", "Index core", "Structured note"]
  },
  {
    id: "ai-software", themeId: "ai", title: "Software & the AI adopters",
    type: "Thematic", assetClass: "Equity", sector: "Technology", bucket: "Growth",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "The next leg of the AI trade broadens from infrastructure to the software and services layer attaching AI to existing revenue. Quality compounders with pricing power.",
    structures: ["Direct equity", "Call overwrite"]
  },

  /* ---- Power & Infrastructure ---- */
  {
    id: "power-grid", themeId: "power", title: "Electricity & the grid build-out",
    type: "Thematic", assetClass: "Equity", sector: "Utilities", bucket: "Income",
    conviction: "High", horizon: "Strategic",
    thesis: "After two flat decades, US power demand is inflecting on datacenters, reshoring and electrification. Utilities and grid suppliers with the right footprint get unprecedented rate-base growth.",
    structures: ["Load-growth utilities", "Utility basket"]
  },
  {
    id: "power-gas-nuclear", themeId: "power", title: "Natural gas & nuclear as AI power",
    type: "Opportunistic", assetClass: "Equity", sector: "Energy", bucket: "Growth",
    conviction: "Medium-High", horizon: "12m",
    thesis: "Firm, dispatchable power is the binding constraint on AI capacity. Gas infrastructure and nuclear operators are the cleanest way to own the supply side of datacenter load.",
    structures: ["Direct equity", "Thematic basket"]
  },

  /* ---- Core Fixed Income ---- */
  {
    id: "extend-duration", themeId: "duration", title: "Lock in yields — extend duration",
    type: "Strategic", assetClass: "Fixed Income", sector: "Rates", bucket: "Income",
    conviction: "High", horizon: "Strategic",
    thesis: "With the cutting cycle approaching, reinvestment risk in cash and bills is rising. Extending into intermediate high-quality bonds locks in yields and adds a true equity diversifier.",
    structures: ["Govt / IG bonds", "Bond ladder"]
  },
  {
    id: "quality-credit", themeId: "duration", title: "Quality credit carry",
    type: "Strategic", assetClass: "Fixed Income", sector: "Credit", bucket: "Income",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "Investment-grade and select securitised credit offer attractive all-in yields with limited spread risk — durable income for books that have been sitting in cash.",
    structures: ["IG corporates", "Securitised sleeve"]
  },

  /* ---- Broadening Equity ---- */
  {
    id: "broaden-quality", themeId: "broaden", title: "Diversify the rally — quality & cyclicals",
    type: "Strategic", assetClass: "Equity", sector: "Broad", bucket: "Growth",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "Leadership is narrow. As earnings broaden, quality cyclicals, industrials and equal-weight exposure should catch up — a diversifier for books concentrated in a handful of names.",
    structures: ["Equal-weight index", "Quality basket"]
  },
  {
    id: "international-value", themeId: "broaden", title: "International & value catch-up",
    type: "Opportunistic", assetClass: "Equity", sector: "Broad", bucket: "Growth",
    conviction: "Medium", horizon: "12m",
    thesis: "International developed and value trade at a wide discount to US growth. A weaker-dollar regime and a broadening cycle argue for trimming home bias.",
    structures: ["International ETF", "Value basket"]
  },

  /* ---- Real Assets ---- */
  {
    id: "listed-infra", themeId: "realassets", title: "Listed & private infrastructure",
    type: "Strategic", assetClass: "Real Assets", sector: "Infrastructure", bucket: "Income",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "Toll roads, midstream and contracted power deliver inflation-linked, equity-like income with lower drawdown — a core diversifier for income-oriented books.",
    structures: ["Infrastructure fund", "Private markets"]
  },
  {
    id: "real-estate", themeId: "realassets", title: "Real estate, selectively",
    type: "Opportunistic", assetClass: "Real Assets", sector: "Real Estate", bucket: "Income",
    conviction: "Medium", horizon: "12m",
    thesis: "With rates peaking, high-quality logistics, data-center and residential real estate offer a re-rating opportunity and a contracted income stream.",
    structures: ["REIT basket", "Private real estate"]
  },

  /* ---- Resilience & Protection ---- */
  {
    id: "structured-protection", themeId: "resilience", title: "Structured downside protection",
    type: "Strategic", assetClass: "Multi-Asset", sector: "Broad", bucket: "Protection",
    conviction: "High", horizon: "Strategic",
    thesis: "After a strong run in risk assets, buffered notes and collars let concentrated holders keep upside participation while defining the downside — protect the gains without realising the tax.",
    structures: ["Buffered note", "Zero-cost collar"]
  },
  {
    id: "diversifiers", themeId: "resilience", title: "Diversifiers & hedges",
    type: "Strategic", assetClass: "Alternatives", sector: "Broad", bucket: "Protection",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "Macro, trend and relative-value strategies add a return stream that is genuinely uncorrelated to a 60/40 — ballast for the next drawdown.",
    structures: ["Liquid alternatives", "Macro sleeve"]
  },

  /* ---- Gold & Currency ---- */
  {
    id: "gold-hedge", themeId: "gold", title: "Gold as a debasement hedge",
    type: "Strategic", assetClass: "Commodity", sector: "Gold", bucket: "Protection",
    conviction: "High", horizon: "Strategic",
    thesis: "Persistent deficits, central-bank buying and geopolitical risk underpin gold as the cleanest tail hedge. We treat it as strategic ballast, sized to the book's protection gap.",
    structures: ["Physical / ETC", "Gold accumulator"]
  },
  {
    id: "fx-diversify", themeId: "gold", title: "Currency diversification & FX overlays",
    type: "Opportunistic", assetClass: "Multi-Asset", sector: "FX", bucket: "Protection",
    conviction: "Medium", horizon: "12m",
    thesis: "Books that have drifted heavily into one currency carry an unmanaged risk. A weaker-dollar regime argues for FX overlays and hedging the mismatch between base currency and asset currency.",
    structures: ["FX forward / collar", "Currency-hedged sleeve"]
  },

  /* ---- Healthcare Innovation ---- */
  {
    id: "glp1", themeId: "health", title: "GLP-1 & medical innovation",
    type: "Thematic", assetClass: "Equity", sector: "Healthcare", bucket: "Growth",
    conviction: "Medium-High", horizon: "Strategic",
    thesis: "Metabolic-disease therapeutics, devices and tools offer a durable, less cyclical growth engine that is under-owned in most growth books — a quality diversifier away from tech.",
    structures: ["Direct equity", "Healthcare basket"]
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
      target: { Growth: 80, Income: 5, Protection: 10, Liquidity: 5 },
      funding: { headline: "Grow to $75m by 2034", metricLabel: "Projected value", current: 38, target: 75, unit: "$m", status: "On track" }
    },
    positions: [
      { name: "NVIDIA",   ticker: "NVDA US", assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 24.0, pnlPct: 12,  note: "Largest position; range-bound 195–235." },
      { name: "Broadcom", ticker: "AVGO US", assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 14.0, pnlPct: -21, note: "Bought into the print, gapped ~20%." },
      { name: "Micron",   ticker: "MU US",   assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 13.0, pnlPct: 180, note: "HBM supercycle; large unrealised gain." },
      { name: "ASML",     ticker: "ASML NA", assetClass: "Equity", sector: "Technology", ccy: "EUR", weightPct: 9.0,  pnlPct: 30,  note: "Semi-cap leader." },
      { name: "Microsoft",ticker: "MSFT US", assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 8.0,  pnlPct: 40,  note: "AI monetization core." },
      { name: "Phoenix autocall (semis)", ticker: "—", assetClass: "Structured", sector: "Technology", ccy: "USD", weightPct: 6.0, pnlPct: 4, note: "Yield on range-bound semis." },
      { name: "USD cash", ticker: "—", assetClass: "Cash", sector: "Cash", ccy: "USD", weightPct: 4.0, pnlPct: 0, note: "Idle." }
    ],
    summary: "Concentrated, options-fluent AI-growth book — NVDA, AVGO and the semis supply chain at high single-stock weights, almost no cash. The agenda is to keep the upside but get paid for the volatility: protect the Micron gain, overwrite rich premium, recover the AVGO loss, and diversify the single-sector risk into the broader AI build-out."
  },

  /* =========================== AURORA (real book) ======================== */
  {
    id: "aurora", name: "Aurora", ccy: "EUR", aum: 50.2,
    classification: "Retail", mifid: "MiFID Retail",
    relationship: "5-yr relationship · MiFID Retail · Growth + income",
    risk: "Growth, with income needs",
    profile: "EMEA private-bank client, growth with income needs. The book is 72% USD against an EUR base, with a dominant Micron position into earnings and two bonds underwater on rates.",
    split: { Equity: 71, "Fixed Income": 13.9, Commodity: 6, Cash: 10.1 },
    goals: {
      objective: "Grow the book while drawing income — and protect the concentrated MU gain",
      horizon: "Long-term · 7–10 yrs",
      target: { Growth: 55, Income: 25, Protection: 12, Liquidity: 8 },
      funding: { headline: "Grow to €70m by 2035 while drawing income", metricLabel: "Projected value", current: 50.2, target: 70, unit: "€m", status: "On track" }
    },
    positions: [
      { name: "Micron",        ticker: "MU US",  assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 25.8, pnlPct: 1080, note: "~10x gain; earnings 24-Jun; IVol rich." },
      { name: "SPDR S&P 500",  ticker: "SPY US", assetClass: "Equity", sector: "Broad",     ccy: "USD", weightPct: 20.4, pnlPct: 74,  note: "Core beta anchor." },
      { name: "NVIDIA",        ticker: "NVDA US",assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 7.2,  pnlPct: -10, note: "Range-bound; house still likes it." },
      { name: "US Treasury 1.25% '31", ticker: "T 1.25 08/31", assetClass: "Fixed Income", sector: "Rates", ccy: "USD", weightPct: 6.0, pnlPct: -14, note: "Underwater on rates — bond-swap candidate." },
      { name: "Xetra-Gold ETC",ticker: "4GLD GY",assetClass: "Commodity", sector: "Gold",  ccy: "EUR", weightPct: 5.2,  pnlPct: 109, note: "Tail hedge — protective." },
      { name: "TotalEnergies", ticker: "TTE FP", assetClass: "Equity", sector: "Energy",    ccy: "EUR", weightPct: 4.3,  pnlPct: 55,  note: "Energy hedge." },
      { name: "SAP",           ticker: "SAP GY", assetClass: "Equity", sector: "Technology", ccy: "EUR", weightPct: 4.1,  pnlPct: 132, note: "Winner — overwrite candidate." },
      { name: "EUR cash",      ticker: "—", assetClass: "Cash", sector: "Cash", ccy: "EUR", weightPct: 10.1, pnlPct: 0, note: "Idle; ~€5m equivalent." }
    ],
    summary: "EMEA book dominated by a 25.8% Micron position on a ~10x gain into a 24-Jun print, 72% USD against an EUR base, with a bond underwater on rates and gold and TotalEnergies as deliberate hedges. The agenda: protect the MU concentration, hedge the USD/EUR mismatch, harvest the bond and NVDA losses, monetize SAP's gain, and put idle cash to work — while protecting the gold and energy hedges, not trimming them."
  },

  /* =========================== SCOTT (biggest book) ====================== */
  {
    id: "scott", name: "Scott", ccy: "USD", aum: 124.0,
    classification: "Retail", mifid: "US Retail",
    relationship: "11-yr relationship · Retiree · Income & preservation",
    risk: "Conservative income",
    profile: "The desk's largest relationship. A broad, well-diversified preservation book — treasuries, munis, dividend equity, regulated utilities and infrastructure — but carrying a handful of underwater single names and a long-duration bond that need attention.",
    split: { Equity: 40, "Fixed Income": 38, "Real Assets": 9, Commodity: 3, Cash: 10 },
    goals: {
      objective: "Fund retirement income and preserve capital across the whole estate",
      horizon: "Drawdown · 0–5 yrs",
      target: { Growth: 30, Income: 48, Protection: 14, Liquidity: 8 },
      funding: { headline: "Fund $3.6m/yr retirement income", metricLabel: "Annual income run-rate", current: 3.0, target: 3.6, unit: "$m/yr", status: "Slightly behind" }
    },
    positions: [
      { name: "US Treasury ladder",   ticker: "—",      assetClass: "Fixed Income", sector: "Rates",      ccy: "USD", weightPct: 17.0, pnlPct: 1,   note: "2–7yr ladder, current coupons." },
      { name: "US Treasury 2.0% '40", ticker: "T 2.0 40",assetClass: "Fixed Income", sector: "Rates",     ccy: "USD", weightPct: 8.0,  pnlPct: -22, note: "Long-duration — bought at the lows; deep loss." },
      { name: "Muni bond sleeve",     ticker: "—",      assetClass: "Fixed Income", sector: "Credit",     ccy: "USD", weightPct: 13.0, pnlPct: 2,   note: "Tax-exempt income." },
      { name: "NextEra Energy",       ticker: "NEE US", assetClass: "Equity",       sector: "Utilities",  ccy: "USD", weightPct: 7.0,  pnlPct: 35,  note: "Regulated yield + load growth." },
      { name: "Johnson & Johnson",    ticker: "JNJ US", assetClass: "Equity",       sector: "Healthcare", ccy: "USD", weightPct: 6.0,  pnlPct: 18,  note: "Defensive dividend." },
      { name: "Pfizer",               ticker: "PFE US", assetClass: "Equity",       sector: "Healthcare", ccy: "USD", weightPct: 5.0,  pnlPct: -28, note: "Underwater — post-COVID de-rating." },
      { name: "Realty Income (REIT)", ticker: "O US",   assetClass: "Real Assets",  sector: "Real Estate",ccy: "USD", weightPct: 5.0,  pnlPct: -18, note: "Underwater on rates; high yield." },
      { name: "Listed infra fund",    ticker: "—",      assetClass: "Real Assets",  sector: "Infrastructure", ccy: "USD", weightPct: 4.0, pnlPct: 9, note: "Inflation-linked income." },
      { name: "Procter & Gamble",     ticker: "PG US",  assetClass: "Equity",       sector: "Consumer",   ccy: "USD", weightPct: 6.0,  pnlPct: 22,  note: "Defensive dividend." },
      { name: "Gold ETF",             ticker: "GLD US", assetClass: "Commodity",    sector: "Gold",       ccy: "USD", weightPct: 3.0,  pnlPct: 40,  note: "Small hedge sleeve." },
      { name: "IG corporate bonds",   ticker: "—",      assetClass: "Fixed Income", sector: "Credit",     ccy: "USD", weightPct: 10.0, pnlPct: 0,   note: "Core fixed income." },
      { name: "USD cash",             ticker: "—",      assetClass: "Cash",         sector: "Cash",       ccy: "USD", weightPct: 10.0, pnlPct: 0,   note: "Drawdown buffer; some redeployable." }
    ],
    summary: "The desk's biggest and most diversified book — a $124m preservation estate built for retirement income. It is in good shape, but three things need work: a long-duration Treasury down 22% and two single names (Pfizer, Realty Income) underwater are textbook tax-loss-harvest and bond-swap candidates, the cash sleeve can be laddered for more income, and the book is light on protection relative to its size."
  },

  /* =========================== AMAR (Pro, commodities + BTC) ============= */
  {
    id: "amar", name: "Amar", ccy: "USD", aum: 71.0,
    classification: "Professional", mifid: "MiFID Professional",
    relationship: "7-yr relationship · Family office · Real assets + digital",
    risk: "Growth, real-asset tilt",
    profile: "APAC family-office mandate, multi-currency. Strong tilt to commodities, gold, energy and infrastructure — plus a large Bitcoin position that is now well underwater. Comfortable with options, structured products and private markets.",
    split: { Equity: 30, Commodity: 18, "Real Assets": 16, Alternatives: 16, "Fixed Income": 12, Cash: 8 },
    goals: {
      objective: "Compound a real-asset core across cycles; rehabilitate the digital-asset sleeve",
      horizon: "Multi-generational · 10+ yrs",
      target: { Growth: 35, Income: 20, Protection: 35, Liquidity: 10 },
      funding: { headline: "Preserve real value, grow to $90m by 2036", metricLabel: "Projected value", current: 71, target: 90, unit: "$m", status: "Slightly behind" }
    },
    positions: [
      { name: "Bitcoin",            ticker: "BTC",     assetClass: "Alternatives", sector: "Crypto",         ccy: "USD", weightPct: 16.0, pnlPct: -38, note: "Bought near the highs; deep drawdown — the book's problem child." },
      { name: "Gold (allocated)",   ticker: "XAU",     assetClass: "Commodity",    sector: "Gold",           ccy: "USD", weightPct: 12.0, pnlPct: 40,  note: "Strategic hard-asset core." },
      { name: "Global infra fund",  ticker: "—",       assetClass: "Real Assets",  sector: "Infrastructure", ccy: "USD", weightPct: 10.0, pnlPct: 12,  note: "Listed infrastructure." },
      { name: "Shell",              ticker: "SHEL LN", assetClass: "Equity",       sector: "Energy",         ccy: "GBP", weightPct: 8.0,  pnlPct: 22,  note: "Majors / energy premium." },
      { name: "EM equity sleeve",   ticker: "—",       assetClass: "Equity",       sector: "Broad",          ccy: "USD", weightPct: 9.0,  pnlPct: 5,   note: "APAC / EM growth." },
      { name: "GDX gold miners",    ticker: "GDX US",  assetClass: "Equity",       sector: "Materials",      ccy: "USD", weightPct: 6.0,  pnlPct: -5,  note: "Lags spot — catch-up candidate." },
      { name: "Private infra co-invest", ticker: "—",  assetClass: "Real Assets",  sector: "Infrastructure", ccy: "USD", weightPct: 6.0,  pnlPct: 0,   note: "Datacenter power." },
      { name: "EUR IG bonds",       ticker: "—",       assetClass: "Fixed Income", sector: "Credit",         ccy: "EUR", weightPct: 12.0, pnlPct: -4,  note: "Diversifier; mild duration loss." },
      { name: "Macro hedge fund",   ticker: "—",       assetClass: "Alternatives", sector: "Broad",          ccy: "USD", weightPct: 7.0,  pnlPct: 8,   note: "Uncorrelated sleeve." },
      { name: "USD cash",           ticker: "—",       assetClass: "Cash",         sector: "Cash",           ccy: "USD", weightPct: 8.0,  pnlPct: 0,   note: "Dry powder." }
    ],
    summary: "Multi-currency real-assets family office with a hard-asset core (gold, energy, infrastructure) and an uncorrelated alternatives sleeve — but the standout issue is a 16% Bitcoin position down 38%. As a Professional client we can be creative: harvest the crypto loss and re-enter with a downside-defined structure, collar or partially monetize it, and keep building the gold and infrastructure core. The miners lag spot and are a tactical catch-up."
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
      target: { Growth: 50, Income: 30, Protection: 10, Liquidity: 10 },
      funding: { headline: "Net worth to $120m by 2033 (after liabilities)", metricLabel: "Net projected value", current: 75, target: 120, unit: "$m", status: "On track" }
    },
    positions: [
      { name: "S&P 500 index core", ticker: "VOO US",  assetClass: "Equity",       sector: "Broad",      ccy: "USD", weightPct: 24.0, pnlPct: 55, note: "Passive core." },
      { name: "Microsoft",          ticker: "MSFT US", assetClass: "Equity",       sector: "Technology", ccy: "USD", weightPct: 10.0, pnlPct: 48, note: "Quality compounder." },
      { name: "Apple",              ticker: "AAPL US", assetClass: "Equity",       sector: "Technology", ccy: "USD", weightPct: 8.0,  pnlPct: 30, note: "Mega-cap quality." },
      { name: "UnitedHealth",       ticker: "UNH US",  assetClass: "Equity",       sector: "Healthcare", ccy: "USD", weightPct: 6.0,  pnlPct: -12,note: "Underwater; defensive compounder." },
      { name: "IG corporate bonds", ticker: "—",       assetClass: "Fixed Income", sector: "Credit",     ccy: "USD", weightPct: 14.0, pnlPct: 0,  note: "Core fixed income." },
      { name: "Muni bond sleeve",   ticker: "—",       assetClass: "Fixed Income", sector: "Credit",     ccy: "USD", weightPct: 8.0,  pnlPct: 1,  note: "Tax-aware income." },
      { name: "Buffered S&P note",  ticker: "—",       assetClass: "Structured",   sector: "Broad",      ccy: "USD", weightPct: 8.0,  pnlPct: 6,  note: "Downside-protected equity." },
      { name: "Listed infra fund",  ticker: "—",       assetClass: "Real Assets",  sector: "Infrastructure", ccy: "USD", weightPct: 7.0, pnlPct: 8, note: "Contracted income." },
      { name: "Apple covered-call income", ticker: "—",assetClass: "Equity",       sector: "Technology", ccy: "USD", weightPct: 5.0,  pnlPct: 12, note: "Overwrite income sleeve." },
      { name: "USD cash",           ticker: "—",       assetClass: "Cash",         sector: "Cash",       ccy: "USD", weightPct: 5.0,  pnlPct: 0,  note: "Tight vs upcoming liabilities." }
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
      target: { Growth: 68, Income: 17, Protection: 8, Liquidity: 7 },
      funding: { headline: "Grow to $70m by 2034; $4m house deposit by 2028", metricLabel: "Projected value", current: 44, target: 70, unit: "$m", status: "On track" }
    },
    positions: [
      { name: "NVIDIA",          ticker: "NVDA US", assetClass: "Equity",       sector: "Technology", ccy: "USD", weightPct: 22.0, pnlPct: 240, note: "Concentrated; huge unrealised gain — needs protecting." },
      { name: "Constellation Energy", ticker: "CEG US", assetClass: "Equity",   sector: "Utilities",  ccy: "USD", weightPct: 15.0, pnlPct: 95,  note: "Concentrated; datacenter-power winner." },
      { name: "S&P 500 index core", ticker: "VOO US",assetClass: "Equity",      sector: "Broad",      ccy: "USD", weightPct: 16.0, pnlPct: 28,  note: "Diversified core." },
      { name: "ASML",            ticker: "ASML NA", assetClass: "Equity",       sector: "Technology", ccy: "EUR", weightPct: 7.0,  pnlPct: 20,  note: "Semi-cap." },
      { name: "IG corporate bonds", ticker: "—",    assetClass: "Fixed Income", sector: "Credit",     ccy: "USD", weightPct: 15.0, pnlPct: 1,   note: "Income sleeve, on plan." },
      { name: "Listed infra fund", ticker: "—",      assetClass: "Real Assets",  sector: "Infrastructure", ccy: "USD", weightPct: 8.0, pnlPct: 7, note: "Diversifier." },
      { name: "USD cash",        ticker: "—",        assetClass: "Cash",         sector: "Cash",       ccy: "USD", weightPct: 7.0,  pnlPct: 0,   note: "House-deposit reserve building." }
    ],
    summary: "The most goals-aligned book at the top line — bucket allocation sits almost exactly on its strategic target. The whole job here is bottom-up risk management: NVDA (22%, +240%) and Constellation (15%, +95%) are two concentrated, deep-in-the-money winners that should be protected with collars to lock in gains ahead of the house-deposit goal. Because Prahnav is Retail, the collar needs reclassification or a non-complex protective alternative — that's the key conversation."
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
      target: { Growth: 55, Income: 30, Protection: 8, Liquidity: 7 },
      funding: { headline: "Fund $0.8m/yr income; grow to $45m by 2033", metricLabel: "Annual income run-rate", current: 0.5, target: 0.8, unit: "$m/yr", status: "Behind" }
    },
    positions: [
      { name: "ExxonMobil",     ticker: "XOM US",  assetClass: "Equity", sector: "Energy",     ccy: "USD", weightPct: 13.0, pnlPct: 32, note: "Energy overweight; buyback + dividend." },
      { name: "Shell",          ticker: "SHEL LN", assetClass: "Equity", sector: "Energy",     ccy: "GBP", weightPct: 10.0, pnlPct: 18, note: "Energy overweight." },
      { name: "Berkshire Hathaway", ticker: "BRK/B US", assetClass: "Equity", sector: "Financials", ccy: "USD", weightPct: 14.0, pnlPct: 40, note: "Quality compounder." },
      { name: "Apple",          ticker: "AAPL US", assetClass: "Equity", sector: "Technology", ccy: "USD", weightPct: 11.0, pnlPct: 25, note: "Mega-cap quality." },
      { name: "JPMorgan",       ticker: "JPM US",  assetClass: "Equity", sector: "Financials", ccy: "USD", weightPct: 9.0,  pnlPct: 30, note: "Financials." },
      { name: "Caterpillar",    ticker: "CAT US",  assetClass: "Equity", sector: "Industrials",ccy: "USD", weightPct: 8.0,  pnlPct: 15, note: "Cyclical quality." },
      { name: "Diageo",         ticker: "DGE LN",  assetClass: "Equity", sector: "Consumer",   ccy: "GBP", weightPct: 7.0,  pnlPct: -16,note: "Underwater — staples de-rating." },
      { name: "Short IG bonds", ticker: "—",       assetClass: "Fixed Income", sector: "Credit",ccy: "USD", weightPct: 6.0,  pnlPct: 1,  note: "Thin fixed-income sleeve." },
      { name: "REIT sleeve",    ticker: "—",       assetClass: "Real Assets", sector: "Real Estate", ccy: "USD", weightPct: 4.0, pnlPct: 3, note: "Small real-asset allocation." },
      { name: "USD cash",       ticker: "—",       assetClass: "Cash", sector: "Cash",         ccy: "USD", weightPct: 8.0,  pnlPct: 0,  note: "Idle." }
    ],
    summary: "An equity-heavy value book — energy, financials and quality compounders at 82% equity with barely any fixed income or protection. It has done well, but it is one drawdown away from a problem and it under-delivers income versus the goal. The agenda is to diversify: extend into core fixed income and infrastructure for income and ballast, trim the energy-sector concentration, and recover the Diageo loss — all with non-complex instruments, since Ben is Retail."
  }
];

/* ---------------------------------------------------------------------------
   Domain maps + helpers (shared by scanner.js, app.js, portfolio.html, morgan.js)
--------------------------------------------------------------------------- */
const GOAL_BUCKETS = [
  { key: "Growth",     color: "#29211A" },
  { key: "Income",     color: "#9A7B4F" },
  { key: "Protection", color: "#3F6B4E" },
  { key: "Liquidity",  color: "#C2A661" }
];

/* asset class -> goal bucket (role in the plan) */
const BUCKET_OF = {
  "Equity": "Growth", "Structured": "Growth", "Alternatives": "Protection",
  "Commodity": "Protection", "Real Assets": "Income", "Real_Assets": "Income",
  "Fixed Income": "Income", "Credit": "Income", "Cash": "Liquidity"
};

/* idea bucket override by sector role (energy majors read as income, etc.) */
const SECTOR_BUCKET = { Energy: "Income", Utilities: "Income", "Real Estate": "Income", Infrastructure: "Income", Gold: "Protection", Crypto: "Protection" };

/* custom/ad-hoc instrument asset class -> bucket (pre-trade) */
const ASSET_BUCKET = {
  "Equity": "Growth", "Fixed Income": "Income", "Commodity": "Protection",
  "Real Assets": "Income", "Alternatives": "Protection", "Structured": "Growth", "Cash": "Liquidity"
};

/* asset classes shown in the coverage matrix, in order */
const ASSET_CLASSES = ["Equity", "Fixed Income", "Real Assets", "Commodity", "Alternatives", "Structured", "Cash"];

/* MiFID appropriateness */
const OTC_KEYWORDS = ["collar","risk reversal","autocall","phoenix","buffered","range note",
  "accumulator","reverse convertible","certificate","covered call","overwrite","call spread",
  "cash-secured","seagull","prepaid","dcd","structured note","note","variable forward"];
const NONCOMPLEX_KEYWORDS = ["direct equity","equity etf","index core","index","basket","physical",
  "etc","fund","gilt","govt","bonds","bond ladder","ladder","dividend","international etf","reit basket","direct"];

function isOtcOption(structure) {
  const s = String(structure || "").toLowerCase();
  if (NONCOMPLEX_KEYWORDS.some(k => s.includes(k))) return false;
  return OTC_KEYWORDS.some(k => s.includes(k));
}

window.SEED = {
  themes: SEED_THEMES, ideas: SEED_IDEAS, clients: SEED_CLIENTS,
  GOAL_BUCKETS, BUCKET_OF, SECTOR_BUCKET, ASSET_BUCKET, ASSET_CLASSES, isOtcOption
};
