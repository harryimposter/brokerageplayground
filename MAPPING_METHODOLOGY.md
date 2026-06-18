# Idea → Client Mapping Methodology

A precise, code-accurate breakdown of how the Brokerage Playground maps ideas to
clients. There is **one** fit engine; it reads the real book; its five axes combine
with **flat (fixed) weights**. Source of truth: `mapping.js`, `scanner.js`, `data.js`,
`build_today_focus.py`, `app.js`.

---

## 1. One engine

`window.MAPPING.scoreIdeaForClient(idea, client)` is the single scorer. Everything
funnels through it:

- **Today's Focus** — flagged-client list + per-tile book count (`flagClients`).
- **Advisor Book top-3** — `topFocusIdeasForClient` blends conviction × fit.
- **Draft-a-view preview** — `flagClients(synth, {min: applyMin})`.
- **Solutions Views** client lists / search / drawer, **pre-trade**, **morgan.js** —
  `scanner.js`'s `ideaFit` / `clientsForIdea` / `matchedIdeas` are **thin facades**
  that call `MAPPING.scoreIdeaForClient` and keep their old output keys
  (`applies / score / reason / gap / secExp / acExp`).

So the saved-View client list and the draft-preview list agree — same algorithm, same gate.

`scanBook` (portfolio → idea findings, 11 hand-coded rules, severity-ranked) is unchanged
and unrelated — it powers the "See more ideas" asset-class list and the NBA, not a
per-client fit score.

---

## 2. Reconciled data (positions are canonical)

`positions` is the single source of truth. Each book's `weightPct` **sums to 100**, and
each client's `split` literal **equals the per-`assetClass` sum of its positions**
(`split ≡ Σ positions`). `bucketAlloc(split)` therefore reconciles with the holdings the
axes read.

The output object exposes `{ fit, tier, why, axes, intent, applies, score, reason, gap,
secExp, acExp }` plus the global-gate fields `{ tradable, suppressed, tradabilityReason,
naturalExpression, bracketFit }` (§5.5b — `bracketFit` is the pre-gate weighted sum; `fit =
tradability × bracketFit`). `axes` is four `{key, label, weight, score, contribution, note}` rows;
the `weight` is the **flat per-axis** weight (§6, exact fraction; the UI rounds it for display),
shown in the per-client drawer breakdown.

`data.js` also synthesises a 24-month monthly sector-allocation history per client
(`client.sectorHistory[sector]`, index 0 = most recent = current allocation) — clearly
labelled **synthetic seed data** to swap for real history. The Affinity axis reads it.

---

## 3. Idea descriptors — explicit fields, with derived fallbacks

Ideas may carry explicit fields; the engine **backfills sensible defaults** when absent:

- **`intent`** (`add / protect / trim / income`) — still tagged by the generator
  (`ensure_intent`) and `defaultIntent()`. It is kept for display / back-compat but
  **no longer drives the engine** (weights are flat; there is no Intent axis).
- **`goalType`** (`appreciation | yield | protection`) — `goalTypeOf(idea)`: from `bucket`
  (+ the structures/title text for `Structured`). Feeds Mandate & Risk's Intent Fit.
- **`riskProfile`** (`{vol, beta, structured}`) — `riskProfileOf(idea)`: `structured` from
  assetClass/structures; `beta` from the sector (HIGH_BETA = Tech/Crypto/Materials/Energy/
  Industrials/Consumer; LOW_BETA = Utilities/Gold/Rates/Credit/Infra/Real Estate/FX; else
  moderate); `vol` from bucket + beta + structured. Feeds Mandate & Risk's Risk Suitability.
- **`naturalExpression`** — `structures[0]` if absent. The expression Tradability is tested on.

---

## 4. One reconciled book; sector-level signals

The five axes operate on **sector-level** signals — sector exposure (`Scanner.exposure`),
the 24-month sector history, the book's in-sector holdings — plus the client's parsed
mandate. `relevantHolding` / `topName` remain in `buildCtx` for back-compat but the
current axes don't use single-name matching.

`mandateClass(client) ∈ {growth, income, preservation}` is derived from the explicit
`client.risk` string (via `riskProfile`), falling back to target-derived tilt only when
unparseable.

---

## 5. The four axes (each 0–100). All constants live in `PARAMS`.

Weights are the exact fractions in §6 (shown rounded here for readability).

### 5.1 Gap fit (`gap`, weight 0.24) — bucket-aware
`Gap = max(0, (bucketTarget − bucketCurrent) / bucketTarget × 100)`, where `bucketTarget`
is the client's **goal-allocation target** for the idea's bucket (`client.goals.target[idea.bucket]`,
e.g. Preservation 35%) and `bucketCurrent` is the book's current allocation to that bucket
(`bucketAlloc(split)[idea.bucket]`). **0 once that goal bucket is at/over target** — so a Preservation
idea (gold) scores 0 for a client whose Preservation bucket is already full, rather than being scored
against the mandate's sector-comfort ceiling. Worked (Preservation goal 35): current 10 → 71, 25 → 29,
35 → 0. If the client has **no goal target** for that bucket, it falls back to the old sector-headroom
calc against the mandate peg (`sectorPeg`).
Worked example: **gold × Amar** — his Preservation bucket is 35% against a 35% goal → Gap fit **0** (no
headroom), dropping his overall fit from a misleading Strong 70 to Good 58. Clients *under* their
Preservation target (Scott, Fotis, Aurora) score high instead.

### 5.2 Affinity fit (`holdings`, weight 0.29)
`max(0, ThematicAffinity − ConcentrationPenalty)`.
- **Thematic Affinity** = recency-weighted (λ=0.94) percentile of the current sector
  allocation within the 24-mo `client.sectorHistory[sector]` (Σ weights of months ≤ current).
- **Penalty** = `max(0, current − peg) × 10`, capped 100, where `peg = sectorPeg(client, sector)`
  (the mandate sector-comfort limit). Affinity is **sector-based**; Gap fit (5.1) is now
  **bucket-based**, so the two no longer share one peg.

### 5.3 Mandate & Risk (`mandate`, weight 0.29)
`Mandate & Risk = 0.6·RiskSuitability + 0.4·IntentFit`. **Tradability is no longer on this
axis** — it is now a [global gate](#55b-global-tradability-gate) that multiplies the whole fit,
so keeping it here too would double-count.
- **Risk Suitability** (0–100 + reason) = deterministic matrix of `riskProfile{vol,beta,structured}`
  vs mandate: growth rewards high-beta/high-vol; income rewards low-vol/low-drawdown; preservation
  rewards low-vol / capital-protected and punishes high-beta.
- **Intent Fit** (0–100 + reason) = matrix `INTENT_FIT[mandate][goalType]`: growth↔appreciation 90,
  income↔yield 90, preservation↔protection 92; off-goal pairings lower (e.g. income↔appreciation 60).

Both sub-scores stay visible on the result (`axes[mandate].score`, plus `riskSuitability` /
`intentFit` on the axis row's source). Worked: income client, a **low-vol dividend equity**
(`vol:low`, `goalType:appreciation`) → Risk Suitability **90**, Intent Fit **60** →
`0.6·90 + 0.4·60` = **78**.

### 5.4 Concentration within sector (`concSector`, weight 0.18)
`raw = (1 − HHI) × 100`, where `HHI = Σ(weightᵢ)²` over the book's holdings **inside the idea's
sector**, weights normalised to sum to 1. Concentrated → 0, diversified → 100.
Worked: one name → HHI 1.0 → **0**; five equal names → HHI 0.20 → **80**.

**Fit direction — inverted by default.** A concentrated sector position *needs* a new name, so
it should fit **more**: `fitContribution = invertForFit ? (100 − raw) : raw`, controlled by the
single flippable line `PARAMS.concWithinSector.invertForFit` (default `true`). The breakdown
shows **both** the raw diversification score and the fit contribution. No in-sector holdings →
neutral `noHoldingScore` (50).

### 5.5 House-view fit — moved out of client-fit
House-view fit is **no longer a client-fit axis**. It is an idea-level property (not a per-client
signal) and was double-counting holdings already captured by Affinity (5.2) and Gap fit (5.1), so
it now lives in the **conviction score** (see §5.5a). For *ex-earnings* ideas it is one of the seven
conviction pillars (0–2: core theme/direct → 2 · on-theme/adjacent → 1 · off-theme/against → 0).
*Earnings* ideas are scored by the print rubric, which has no house-view pillar — the on-theme /
off-theme tag still shows on the tile, it just doesn't enter the earnings conviction sum.

### 5.5a Conviction — two models by idea kind
Conviction (`build_today_focus.py`, `today_focus.json` → `today_focus.js`) is computed by **one of
two rubrics**, chosen by `idea.kind`. Each pillar carries its own `max` and a data-quality tag
`dq ∈ {sourced, estimated, unverified}`; the generator stamps `label`/`max`, sums the raw score,
scales to `/100` and bands it. Both models surface in the "How scoring works" modal behind an
**Earnings / Ex-earnings** toggle, and each idea's drawer renders its own model as collapsed pillar
tiles (tap to reveal the one-line read).

**Earnings ideas — print rubric (`EARNINGS_RUBRIC`, /8).** Four pillars, each
**0–2**, the print-reaction pillars:

| pillar | 0–2 criterion |
|---|---|
| Asymmetry signal | implied straddle move ÷ avg absolute realised move over the trailing **4 prints** — materially <1 (market underpricing) → 2 · near fair → 1 · implied rich → 0 |
| Sell-side consensus | majority buy / upside to mean PT / positive last-30d revisions |
| Catalyst clarity | pre: a dated, unpriced catalyst; post: a reaction disproportionate to print quality |
| Positioning & sentiment | short interest >10% float OR extreme positioning |

The banding governs the label: **High** (raw ≥6, no 0 pillar, all sourced) · **High — data
gap** (same but ≥1 estimated input) · **Medium** (raw 4–5, or any 0 pillar, or consensus
unverified) · **Low** (raw <4 or two-plus zeros → excluded).

**Ex-earnings ideas — seven-pillar model (`EXEARN_RUBRIC`, /15).** Asymmetry (0–3) · Catalyst
(0–2) · Consensus + confirmation (0–2) · **Fundamental thesis (0–2)** · House-view fit (0–2) ·
Positioning (0–2) · Technical (0–2). `score = raw ÷ 15 × 100`; **High ≥75 · Medium ≥55 · Watch ≥0**.

**The view drives; technicals confirm.** Fundamental thesis + house view + the thesis-bearing
pillars (Asymmetry, Catalyst, Consensus) carry **11/15 (≈73%)**; Positioning + Technical carry
**4/15 (≈27%)** — **roughly a 70/30 fundamentals-to-technicals split** — and are framed as
*confirmation / veto, not drivers* — they can support or kill a view
but can't manufacture conviction. (Was ~60/40 before this rebalance.) The old Stop / risk-reward pillar
was removed — a technical stop-loss construct that penalised strategic / thematic basket ideas for not
being stop-and-target trades; Asymmetry already scores the upside. The **Fundamental thesis**
pillar (0–2) scores the quality and edge of the view itself through two 0/1 checks — **driver
specificity** (named, quantified drivers vs narrative) and **variant view** (an articulated, computable
gap vs consensus — pure consensus-hugging scores 0; authored in the idea's `variant` `{street, us, gap}`
field). Its `dq` is `sourced` only when the drivers trace to cited facts, so an uncited thesis trips
the Medium cap. **Every idea — earnings and ex-earnings alike — carries a `changeMyMind` field** —
the condition that would invalidate the view (for an earnings idea, the print outcome that breaks the
thesis) — surfaced on the conviction tile but **not scored** (a discrete kill-switch would bias the
score toward dated catalyst trades over strategic holds, the same flaw the Stop pillar had). The old
standalone **RSI flag** pillar now lives in **Positioning** only, as the crowding/sentiment read
(alongside short interest, CoT and flows); **Technical** is purely trend + entry — moving-average
alignment, Bollinger, Fibonacci — so RSI scores in exactly one pillar and the moving averages in the
other, with no overlap. **Consensus** now credits *either* sell-side alignment *or*
a defensible variant, so it no longer fights the thesis pillar.

**Data-quality cap (global modifier).** If any pillar's core input is `estimated`/`unverified`
(`capped = true`), the ex-earnings label cannot exceed **Medium**; the earnings model expresses the
same idea through the "High — data gap" label. With the current playground data (straddle /
short-interest / RSI feeds not wired up, so those pillars are `estimated`), the cap is binding on
every idea — wire sourced inputs in and Highs unlock.

### 5.5b Global tradability gate
`tradability(idea, client) ∈ {0,1}` (`window.MAPPING.tradability`), computed **once** per
idea×client **before** the weighted sum and multiplied across the whole bracketed score (not an
axis — see §6). Binary MiFID rule (data.js `complexityOf`): a **Retail** client + an **OTC**
`naturalExpression` (`isOtcOption` — collars, forwards, OTC options) → **0**; a Professional, or a
non-complex / structured-note expression → **1**. (Structured *notes* are packaged securities a
Retail client *can* trade.)

`0` ⇒ `fit = 0`, `suppressed = true`, `applies = false` — the idea drops out of every flag/apply
list, but the UI **surfaces** it with the reason (`tradabilityReason`, "Not tradable — …") rather
than silently dropping it: the focus drawer lists suppressed clients in a dedicated section, and
`window.MAPPING.suppressedClients(idea)` returns them for any other call site.

---

## 6. Flat weights, the shared peg, the global gate, and combine

**Flat axis weights (sum = 1.00), in `PARAMS.weights`.** With House-view removed, the original
five weights are rescaled by **1/0.85** so the remaining four keep their relative balance and sum
to exactly 1.00. The **exact fractions** are used in the math; the UI shows the rounded values:

| axis | original | exact fraction | code value | shown |
|---|---|---|---|---|
| Affinity fit (`holdings`) | 0.25 | 0.25 / 0.85 | 0.294117… | 0.29 |
| Mandate & Risk (`mandate`) | 0.25 | 0.25 / 0.85 | 0.294117… | 0.29 |
| Gap fit (`gap`) | 0.20 | 0.20 / 0.85 | 0.235294… | 0.24 |
| Concentration within sector (`concSector`) | 0.15 | 0.15 / 0.85 | 0.176470… | 0.18 |

**Combine — global gate × bracketed weighted sum:**

```
bracketFit = round(Σ score·weight)          # four axes, exact weights Σ = 1.00 → 0–100
fit        = tradability × bracketFit        # binary gate (§5.5b); 0 ⇒ suppressed
```

The gate only ever **passes the bracket through (×1) or zeroes it (×0)** — because the four
weights already sum to 1.00, nothing is re-normalised. Tiers: `≥66 Strong`, `≥48 Good`, else
Marginal. Gates: `applies` = tradable **and** `bracketFit ≥ 45` (`applyMin`); `flagClients`
defaults to `fit ≥ 50` (`flagMin`), top 6 (suppressed clients have `fit 0`, so they fall out and
are surfaced separately per §5.5b). `why` = the suppression reason when gated, else the
highest-contribution axis's note.

**The sector-comfort peg:** `PARAMS.affinity.comfort = {growth:25, income:15, preservation:10}`
(+ optional `PARAMS.affinity.sectorComfort` per-sector overrides), read via `sectorPeg(client, sector)`
by the **Affinity penalty** (punishes overshoot beyond it). Gap fit (5.1) no longer uses this peg —
it now reads the client's **goal-bucket target** (`client.goals.target[idea.bucket]`) — and only falls
back to `sectorPeg` when the client has no goal target for that bucket.

---

## 7. Worked examples (live data)

- **Mandate & Risk** — income client (Scott), low-vol dividend equity → RS 90, IF 60,
  Mandate & Risk **78**.
- **Global tradability gate** — a Retail client (Aurora) + an OTC natural expression (zero-cost
  collar) → tradability **0**, so the whole fit is **0** and the idea is suppressed for Aurora
  (surfaced with the MiFID reason). A Professional client, or a structured-note expression, → 1
  and the bracketed weighted sum passes through unchanged.
- **Concentration within sector** — one name → raw 0; five equal → raw 80. Fable's 6 spread
  Technology names → HHI 0.19, diversification 81, inverted fit contribution **19** (already
  diversified within tech, so a new tech name adds little).
- **Gap fit (bucket-aware)** — gold × Amar: Preservation bucket 35% vs 35% goal → **0** (bucket full);
  a client under their Preservation target scores high on the same idea.

---

## 8. What this restructure changed

1. **Removed** the old penalty-stacking "Mandate & risk" axis and the concentration×intent
   "Intent fit" axis.
2. **Added** the new **Mandate & Risk** (Tradability × Risk × Intent) and **Concentration within
   sector** (Herfindahl, inverted-for-fit) axes.
3. **Flat weights** replace the intent-conditional weight matrix.
4. Gap fit is **bucket-aware** — headroom from the current goal-bucket allocation up to the client's
   goal target for that bucket (a Preservation idea scores 0 once the Preservation bucket is full),
   falling back to sector headroom vs the mandate peg only when no goal target exists. Affinity fit
   still reads the sector-comfort peg; the two axes no longer share one peg.
5. **Tradability moved off the Mandate & Risk axis to a global gate** (§5.5b): it now multiplies
   the whole weighted sum (`fit = tradability × bracketFit`) instead of zeroing one 0.25-weighted
   term, so a non-tradable idea is fully suppressed (`fit 0`) rather than scoring up to ~75. The
   axis is now a clean `0.6·RiskSuitability + 0.4·IntentFit` blend. Suppressed clients are
   surfaced with the MiFID reason, not silently dropped.
6. **House-view fit removed from client-fit and moved to conviction** (§5.5): it was an idea-level
   property double-counting holdings already in Affinity / Gap fit. It now lives in the conviction
   score (a pillar of the ex-earnings model; the earnings model has no house-view pillar). The
   remaining four client-fit weights are the original five rescaled by **1/0.85** (0.29 / 0.29 /
   0.24 / 0.18 — exact fractions in code, §6); client-fit is now a **four-axis** model.
7. **Conviction split into two models by idea kind** (§5.5a): earnings ideas use a four-pillar /8
   print rubric (asymmetry over the trailing 4 prints, consensus, catalyst, positioning); ex-earnings
   ideas use the seven-pillar /15 model. A per-pillar data-quality tag
   feeds a cap that holds estimated/unverified ideas at Medium. Both render as collapsed pillar
   tiles, and the "How scoring works" modal toggles between the two rubrics.

### Remaining limitations / candidates for further work
- AUM, ccy-hedging depth, liquidity and liability-funding still don't enter the fit
  (`scanBook` handles some of this separately).
- `riskProfile` / `goalType` are **derived** sensibly unless an idea carries explicit fields;
  per-idea curation (in `data.js` / the generator) would sharpen Mandate & Risk.
- The `concSector` fit-direction is a product decision (`invertForFit`); confirm and tune.
- The `PARAMS` numbers are reasoned, not fit to outcomes; the in-browser harness (load the app,
  score against `window.SEED`) is how they were sanity-checked and is the place to recalibrate.
