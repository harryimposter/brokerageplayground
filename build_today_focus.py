#!/usr/bin/env python3
"""
build_today_focus.py — generator step for the "Today's Focus" tab.

Reads today_focus.json (the raw research payload from the daily market sweep) and
writes today_focus.js (window.TODAY_FOCUS = {...}) that the app loads. Deterministic:
same input -> same output. The client mapping is intentionally NOT baked in here —
mapping.js scores each idea against the live Advisor Book at render time, so the
"flagged clients" always reflect the current books.

PIPELINE (how a daily run would use this):
  1. A Claude Code routine does the web sweep (Reuters/WSJ/Bloomberg/Yahoo/Seeking
     Alpha/Barron's), applying the >=2-source rule and tagging sourced vs estimated,
     and overwrites today_focus.json with the fresh ideas.
  2. Run:  python build_today_focus.py
  3. Commit today_focus.json + today_focus.js.
NOTE: there is NO scheduler wired up in this repo (no cron, no GitHub Action). The
"daily" cadence is a convention — the sweep is run ON DEMAND by a Claude Code
routine. To truly automate it, add a scheduler that performs steps 1-3.

COVERAGE SPEC (what every sweep MUST span — not just US equity/earnings):
  The daily sweep is a WHOLE-MARKET sweep across ALL asset classes and the major
  global regions, so the board never silently drops a market:
    - asset classes: EQUITIES, RATES (govt/duration), CREDIT, FX, COMMODITIES
      (and structured/defined-outcome where it fits);
    - regions: US, Europe, UK, Asia (not US-only).
  FX and RATES must be represented in EVERY run (they are the most often missed):
  at least one idea tagged sector "FX", and at least one rates idea (sector "Rates"
  or assetClass "Fixed Income"). The coverage check below WARNS when either is absent.

  TACTICAL TRADES must be represented: short-dated, directional/vol OPTION trades with
  a concrete construction (strikes/tenor/premium) and a defined entry / target (early
  unwind) / stop — carried in a `levels` block — primarily across FX (and where relevant
  rates/equity). The coverage check WARNS if no tactical idea (or no tactical FX idea) is present.

  TACTICAL TRIGGER GATE (event/move-driven ideas don't sit on the board permanently):
  a tactical idea (one carrying a `levels` block) MUST also carry:
    - `trigger`   — the stated condition that justifies it NOW (e.g. "USD/JPY pushed into
                    the 158 sell-zone overnight"); and
    - `triggered` — a boolean: true only when that condition is actually met today.
  Only TRIGGERED tactical ideas are written into today_focus.js (so the app only ever
  surfaces/flags a tactical idea with a live justification, shown as "Why now: <trigger>").
  Tactical ideas that are NOT triggered are dropped from the output and reported. Tactical
  options are short-dated DIRECTIONAL/VOL trades — bucket "Growth" / goalType "appreciation"
  (a directional FX option is a growth expression, not a hedge). Non-tactical (strategic /
  earnings) ideas are unaffected by this gate.

  EARNINGS must include BOTH stances:
    - "pre-position" — enter INTO the print (report date in the FUTURE);
    - "post-print"   — play the REACTION of a name that has ALREADY reported (report
      date in the PAST), with the actual result stated as a VERIFIED, sourced fact
      (earnings.result + resultSource="sourced") — never fabricated numbers.
  The coverage check WARNS if either stance is missing; the date check is stance-aware.

This script also VALIDATES the payload (prints warnings, never silently passes):
  - every idea cites >=2 sources;
  - every idea carries a tradeStatement (one precise sentence: instrument + direction
    + the actual view; FX must name long-vs-short legs and spot-vs-carry);
  - every fact is tagged sourced|estimated;
  - earnings report dates are not in the past relative to asOf (a forward event must
    not be described as already happened);
  - the sweep spans the required asset classes (FX and rates present — see COVERAGE);
  - conviction is computed from the rubric below, not hand-entered.
"""
import json
import sys
import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "today_focus.json"
OUT = HERE / "today_focus.js"

# ---- Conviction rubrics (TWO models, selected by idea kind) -------------------
# EARNINGS ideas are scored by the print rubric: four pillars, each 0-2 -> /8,
# with rule-based banding. EX-EARNINGS ideas use the seven-pillar /15 model. Each
# pillar carries its own `max`, and each pillar's
# core input is tagged sourced|estimated|unverified (the `dq` field) so the
# data-quality treatment can read it. Pillar scores + dq are authored in the
# research file; labels, max, totals, score/100 and the tier are computed here.

EARNINGS_RUBRIC = {
    "model": "earnings",
    "title": "Earnings ideas — print rubric",
    "blurb": "Four pillars, each 0-2 (max 8), scaled to 100. The print-reaction model for the earnings book.",
    "maxRaw": 8,
    "pillars": [
        {"key": "asymmetry",   "label": "Asymmetry signal",      "max": 2, "desc": "Implied straddle move into the print ÷ average absolute realised move over the trailing 4 prints. Materially below 1 (the market is underpricing the event) → 2 · near fair → 1 · implied rich → 0. Wide estimate dispersion can also carry it."},
        {"key": "consensus",   "label": "Sell-side consensus",   "max": 2, "desc": "Majority buy / upside to the mean price target / positive last-30-day revisions. All three → 2 · partial → 1 · none or contradicts → 0."},
        {"key": "catalyst",    "label": "Catalyst clarity",      "max": 2, "desc": "Pre-print: a dated, unpriced catalyst. Post-print: a reaction disproportionate to print quality. Clear → 2 · soft → 1 · none → 0."},
        {"key": "positioning", "label": "Positioning & sentiment","max": 2, "desc": "Short interest >10% of float OR an extreme positioning setup. Extreme → 2 · notable lean → 1 · neutral / unavailable → 0."},
    ],
    "bandsNote": "High = raw ≥6/8, no zero pillar, all inputs sourced · High — data gap = the same but ≥1 estimated input · Medium = raw 4-5, or any zero pillar, or consensus unverified · Low = raw <4 or two-plus zeros (excluded).",
}

EXEARN_RUBRIC = {
    "model": "exEarnings",
    "title": "Ex-earnings ideas — seven-pillar conviction",
    "blurb": "Seven pillars summed to 15, scaled to 100, on roughly a 70/30 fundamentals-to-technicals split: fundamental thesis and house view lead (11/15 ≈ 73%); technicals and positioning are capped confirmation (4/15 ≈ 27%). High ≥ 75 · Medium ≥ 55 · Watch ≥ 0.",
    "maxRaw": 15,
    "pillars": [
        {"key": "asymmetry",   "label": "Gap / asymmetry",          "max": 3, "desc": "Thesis expected move (entry → target) ÷ the name's normal move over the same horizon. ≥2.0 → 3 · 1.5-2.0 → 2 · 1.0-1.5 → 1 · <1.0 → 0. The thesis target is a soft input → tagged estimated."},
        {"key": "catalyst",    "label": "Catalyst",                 "max": 2, "desc": "A dated, hard reason it moves soon (earnings, FOMC, CPI, ECB) with a clear trigger → 2 · soft / undated → 1 · none → 0."},
        {"key": "consensus",   "label": "Consensus + confirmation", "max": 2, "desc": "Either sell-side aligned (buy ratio ≥0.6, mean-PT upside, revisions ≥0) OR a defensible variant view, AND an independent signal (breakout / fund flow / options skew). Both legs → 2 · one → 1 · neither → 0. Alignment and a variant edge both count — they don't fight the thesis pillar."},
        {"key": "thesis",      "label": "Fundamental thesis",       "max": 2, "desc": "Quality and edge of the underlying view — two checks, each 0/1: (1) driver specificity — named, quantified drivers (a margin/volume/pricing/policy path with numbers) vs narrative; (2) variant view — an articulated, computable gap vs consensus (our number vs the street's); pure consensus-hugging scores 0. Each idea also states the condition that would change our mind (the `changeMyMind` field), surfaced on the tile but not scored. dq is sourced only when the drivers trace to cited facts; an uncited thesis is estimated and trips the Medium cap."},
        {"key": "houseview",   "label": "House-view fit",           "max": 2, "desc": "Core desk theme, direct expression → 2 · on-theme / adjacent → 1 · off-theme or cuts against a house view → 0."},
        {"key": "positioning", "label": "Positioning",              "max": 2, "desc": "Confirmation / veto, not a driver. Crowd offside our trade is fuel; crowd already with us is unwind risk — a hard read (SI >10% float / extreme CoT, fund flows) plus a sentiment read (RSI at a crowded extreme). Clearly offside → 2 · neutral / mixed → 1 · clearly with us (unwind risk) → 0."},
        {"key": "technical",   "label": "Technical",                "max": 2, "desc": "Confirmation / veto, not a driver. Trend and entry agree with the thesis — 50/100/200-day moving-average alignment, Bollinger entry quality, Fibonacci off the trailing 6-month swing → 2 · mixed → 1 · contradicts → 0."},
    ],
    "tiers": [
        {"key": "High",   "min": 75, "label": "High conviction"},
        {"key": "Medium", "min": 55, "label": "Medium conviction"},
        {"key": "Watch",  "min": 0,  "label": "Watchlist"},
    ],
    "bandsNote": "Score = raw ÷ 15 × 100. High ≥75 · Medium ≥55 · Watch ≥0. Data-quality cap: if any pillar's core input is estimated or unverified, the label cannot exceed Medium.",
}

RUBRICS = {"earnings": EARNINGS_RUBRIC, "ex-earnings": EXEARN_RUBRIC}
DQ_TAGS = ("sourced", "estimated", "unverified")
DQ_OK = "sourced"
EXEARN_TIER_LABEL = {"High": "High conviction", "Medium": "Medium conviction", "Watch": "Watchlist"}


def tier_for(score, rubric):
    for t in rubric.get("tiers", []):
        if score >= t["min"]:
            return t["key"]
    return "Watch"


# ---- Intent (add / protect / trim / income) ----------------------------------
# Each idea declares an intent so the mapping engine can read concentration + P&L
# through the right lens. Mirrors defaultIntent() in mapping.js for the fallback.
ALLOWED_INTENTS = ("add", "protect", "trim", "income")

# Earnings STANCE — pre-position (enter into the print) or post-print (play the
# already-reported reaction, Shark-Tank style). Required on every earnings idea.
ALLOWED_STANCES = ("pre-position", "post-print")


def default_intent(idea):
    bucket = idea.get("bucket")
    if bucket == "Preservation":
        return "protect"
    if bucket == "Income":
        return "income"
    if bucket == "Structured":
        txt = (" ".join(idea.get("structures", [])) + " " + idea.get("headline", "")).lower()
        return "protect" if any(k in txt for k in ("buffer", "protect", "collar", "capital-protected", "capital protected")) else "income"
    return "add"  # Growth / default


def ensure_intent(idea, warns):
    intent = idea.get("intent")
    if intent is None:
        idea["intent"] = default_intent(idea)
        warns.append(f"{idea['id']}: no intent declared — defaulted to '{idea['intent']}'")
    elif intent not in ALLOWED_INTENTS:
        warns.append(f"{idea['id']}: intent '{intent}' is not one of {ALLOWED_INTENTS}")
    return idea


def _norm_pillars(idea, rubric, warns):
    """Stamp label + max from the rubric onto each authored pillar, default/validate
    its data-quality tag, and check the count, keys and score ceilings."""
    by_key = {p["key"]: p for p in rubric["pillars"]}
    pillars = idea.get("conviction", {}).get("pillars", [])
    if len(pillars) != len(rubric["pillars"]):
        warns.append(f"{idea['id']}: expected {len(rubric['pillars'])} {rubric['model']} pillars, found {len(pillars)}")
    for p in pillars:
        meta = by_key.get(p.get("key"))
        if not meta:
            warns.append(f"{idea['id']}: unknown pillar '{p.get('key')}' for the {rubric['model']} model")
            continue
        p["label"] = meta["label"]
        p["max"] = meta["max"]
        if p.get("dq") not in DQ_TAGS:
            warns.append(f"{idea['id']}/{p['key']}: data-quality tag '{p.get('dq')}' missing/invalid — defaulted to estimated")
            p["dq"] = "estimated"
        if p.get("score", 0) > meta["max"]:
            warns.append(f"{idea['id']}/{p['key']}: score {p['score']} exceeds max {meta['max']}")
    return pillars


def _earnings_label(raw, pillars, capped):
    """Earnings print-rubric banding."""
    zeros = sum(1 for p in pillars if p.get("score", 0) == 0)
    if raw < 4 or zeros >= 2:
        return "Low", "Watch"
    if raw >= 6 and zeros == 0:
        return ("High — data gap", "High") if capped else ("High", "High")
    return "Medium", "Medium"


def score_conviction(idea, warns):
    rubric = RUBRICS[idea["kind"]]
    pillars = _norm_pillars(idea, rubric, warns)
    raw = sum(p.get("score", 0) for p in pillars)
    score = round(raw / rubric["maxRaw"] * 100) if rubric["maxRaw"] else 0
    # data-quality: any pillar whose core input isn't sourced trips the modifier
    capped = any(p.get("dq", DQ_OK) != DQ_OK for p in pillars)
    if idea["kind"] == "earnings":
        # The print rubric's own labels (incl. "High — data gap") govern the earnings book.
        label, tier = _earnings_label(raw, pillars, capped)
    else:
        # seven-pillar model: tier off the /100 score, then the hard Medium cap.
        tier = tier_for(score, rubric)
        if capped and tier == "High":
            tier = "Medium"
        label = EXEARN_TIER_LABEL[tier]
    c = idea["conviction"]
    c["raw"] = raw
    c["maxRaw"] = rubric["maxRaw"]
    c["score"] = score
    c["tier"] = tier
    c["label"] = label
    c["capped"] = capped
    c["model"] = rubric["model"]
    return idea


# ---- Tactical trigger gate ---------------------------------------------------
# A tactical idea is a short-dated option trade carrying a `levels` block (defined
# entry/target/stop). Tactical ideas are event/move-driven and must not sit on the
# board permanently: each MUST declare a `trigger` (the condition that justifies it
# now) and a `triggered` boolean; only triggered ones ship.
def is_tactical(idea):
    return bool(idea.get("levels"))


def validate_tactical(idea, warns):
    """Enforce the trigger contract on tactical ideas (warn, never silently pass)."""
    if not is_tactical(idea):
        return
    trig = idea.get("trigger")
    if not (trig and str(trig).strip()):
        warns.append(f"{idea['id']}: tactical idea (has a `levels` block) but no `trigger` text — REQUIRED (the live condition that justifies surfacing it now)")
    if not isinstance(idea.get("triggered"), bool):
        warns.append(f"{idea['id']}: tactical idea needs a boolean `triggered` (true only when the trigger is actually met today) — defaulting to false so it does NOT surface")
        idea["triggered"] = False
    # a directional/vol FX option is a GROWTH expression, not a hedge — nudge if mis-bucketed
    if idea.get("bucket") == "Preservation":
        warns.append(f"{idea['id']}: tactical option bucketed 'Preservation' — short-dated directional/vol option trades are Growth/appreciation; check the classification")


def gate_tactical(data, warns):
    """Drop tactical ideas that are not triggered from the shipped sections. Returns the
    list of (id, trigger) dropped, and logs what shipped vs what was held back."""
    dropped = []
    for section in ("earnings", "exEarnings"):
        kept = []
        for idea in data.get(section, []):
            if is_tactical(idea) and idea.get("triggered") is not True:
                dropped.append((idea.get("id"), idea.get("trigger", "")))
            else:
                kept.append(idea)
        data[section] = kept
    return dropped


def validate(idea, as_of, warns):
    if len(idea.get("sources", [])) < 2:
        warns.append(f"{idea['id']}: fewer than 2 sources cited")
    ts = idea.get("tradeStatement")
    if not (ts and str(ts).strip()):
        warns.append(f"{idea['id']}: no tradeStatement — REQUIRED (one precise sentence: instrument + direction + the actual view; for FX, name which currency is long vs short and whether it's a spot or differential/carry bet)")
    for f in idea.get("facts", []):
        if f.get("tag") not in ("sourced", "estimated"):
            warns.append(f"{idea['id']}: fact not tagged sourced/estimated -> {f.get('text','')[:50]}")
    # earnings-stance-aware date check. pre-position (into the print) → report must be
    # in the FUTURE (a forward event can't be described as already happened). post-print
    # (play the reaction) → report must be in the PAST, AND its result must be stated as
    # a VERIFIED, sourced fact (no fabricated/unverified numbers).
    if idea.get("kind") == "earnings":
        stance = idea.get("stance")
        if stance not in ALLOWED_STANCES:
            warns.append(f"{idea['id']}: earnings idea needs a stance in {ALLOWED_STANCES} (pre-position into the print, or post-print reaction)")
        e = idea.get("earnings") or {}
        rd = e.get("reportDate")
        if rd:
            try:
                d = datetime.date.fromisoformat(rd)
                if stance == "post-print":
                    if d >= as_of:
                        warns.append(f"{idea['id']}: stance=post-print but report date {rd} is not before asOf {as_of} — a reaction idea needs a report that has already happened")
                    if not (e.get("result") and e.get("resultSource") == "sourced"):
                        warns.append(f"{idea['id']}: post-print needs earnings.result stated as a VERIFIED fact (resultSource='sourced') — no fabricated/unverified results")
                else:  # pre-position (or unset)
                    if d < as_of:
                        warns.append(f"{idea['id']}: report date {rd} is BEFORE asOf {as_of} — a forward (pre-position) event must stay future-tense (or set stance='post-print')")
            except ValueError:
                warns.append(f"{idea['id']}: bad reportDate {rd}")


# ---- Coverage spec: every sweep must span all asset classes / global markets -----
# Required asset-class coverage so the board is never accidentally US-equity-only.
# FX and RATES are the most-often-missed and are REQUIRED each run.
REQUIRED_COVERAGE = ("FX", "Rates")


def check_coverage(data, warns):
    """Warn if the day's ideas don't span the required asset classes. RATES is met by
    a sector 'Rates' OR an assetClass 'Fixed Income'; FX by a sector 'FX'."""
    ideas = list(data.get("earnings", [])) + list(data.get("exEarnings", []))
    sectors = {str(i.get("sector", "")).lower() for i in ideas}
    classes = {str(i.get("assetClass", "")).lower() for i in ideas}
    has_fx = "fx" in sectors
    has_rates = ("rates" in sectors) or ("fixed income" in classes)
    if not has_fx:
        warns.append("COVERAGE: no FX idea in this sweep — every run must include FX (sector 'FX').")
    if not has_rates:
        warns.append("COVERAGE: no rates idea — every run must include rates (sector 'Rates' or assetClass 'Fixed Income').")
    # earnings book must carry BOTH stances: pre-print (into the report) and post-print
    # (play the already-reported reaction). Don't ship an all-upcoming or all-reacted board.
    earnings = data.get("earnings", [])
    if earnings:
        stances = {i.get("stance") for i in earnings}
        if "pre-position" not in stances:
            warns.append("COVERAGE: no PRE-print (pre-position) earnings idea — include both pre- and post-print.")
        if "post-print" not in stances:
            warns.append("COVERAGE: no POST-print (reaction) earnings idea — include both pre- and post-print.")
    # tactical, short-dated OPTION trades with a defined entry/target/stop (the `levels`
    # block) — keep surfacing this style, primarily across FX (and where relevant rates/equity).
    ideas = list(earnings) + list(data.get("exEarnings", []))
    tactical = [i for i in ideas if i.get("levels")]
    if not tactical:
        warns.append("COVERAGE: no tactical short-dated option trade (an idea with a `levels` block: defined entry/target/stop) — include tactical FX/rates/equity option trades each run.")
    elif not any(str(i.get("sector", "")).lower() == "fx" for i in tactical):
        warns.append("COVERAGE: tactical trades present but none in FX — surface tactical FX option trades (entry/target/stop) too.")
    return has_fx and has_rates


def main():
    if not SRC.exists():
        print(f"ERROR: {SRC.name} not found", file=sys.stderr)
        return 1
    data = json.loads(SRC.read_text(encoding="utf-8"))
    as_of = datetime.date.fromisoformat(data.get("asOf", "1970-01-01"))
    warns = []

    for section in ("earnings", "exEarnings"):
        for idea in data.get(section, []):
            idea["kind"] = "earnings" if section == "earnings" else "ex-earnings"
            validate(idea, as_of, warns)
            validate_tactical(idea, warns)
            ensure_intent(idea, warns)
            score_conviction(idea, warns)

    # tactical gate: only TRIGGERED tactical ideas ship. Validation above ran on the full
    # set (so a missing trigger always warns); the drop happens here, before coverage/output.
    dropped_tactical = gate_tactical(data, warns)

    check_coverage(data, warns)

    data["convictionRubric"] = {"earnings": EARNINGS_RUBRIC, "exEarnings": EXEARN_RUBRIC}

    banner = (
        "/* AUTO-GENERATED by build_today_focus.py from today_focus.json — do not edit by hand.\n"
        f"   Generated for asOf {data.get('asOf')}. Re-run: python build_today_focus.py */\n"
    )
    js = banner + "window.TODAY_FOCUS = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    OUT.write_text(js, encoding="utf-8")

    n = len(data.get("earnings", [])) + len(data.get("exEarnings", []))
    print(f"Wrote {OUT.name}: {n} ideas "
          f"({len(data.get('earnings', []))} earnings, {len(data.get('exEarnings', []))} ex-earnings) for {data.get('asOf')}.")
    if dropped_tactical:
        print(f"TACTICAL GATE: held back {len(dropped_tactical)} un-triggered tactical idea(s) (not on the board):")
        for tid, trig in dropped_tactical:
            print(f"  - {tid}: trigger not met — {trig}")
    if warns:
        print("VALIDATION WARNINGS:")
        for w in warns:
            print("  - " + w)
    else:
        print("Validation: clean (>=2 sources each, facts tagged, no forward event in past tense).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
