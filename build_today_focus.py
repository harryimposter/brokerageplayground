#!/usr/bin/env python3
"""
build_today_focus.py — generator step for the "Today's Focus" tab.

Reads today_focus.json (the raw research payload from the daily market sweep) and
writes today_focus.js (window.TODAY_FOCUS = {...}) that the app loads. Deterministic:
same input -> same output. The client mapping is intentionally NOT baked in here —
mapping.js scores each idea against the live Advisor Book at render time, so the
"flagged clients" always reflect the current books.

PIPELINE (how a daily scheduled run would use this):
  1. A Claude Code routine does the web sweep (Reuters/WSJ/Bloomberg/Yahoo/Seeking
     Alpha/Barron's), applying the >=2-source rule and tagging sourced vs estimated,
     and overwrites today_focus.json with the fresh ideas.
  2. Run:  python build_today_focus.py
  3. Commit today_focus.json + today_focus.js.
The scheduler only needs to run steps 1-3; no manual editing of the app.

This script also VALIDATES the payload (prints warnings, never silently passes):
  - every idea cites >=2 sources;
  - every fact is tagged sourced|estimated;
  - earnings report dates are not in the past relative to asOf (a forward event must
    not be described as already happened);
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
    "blurb": "Seven pillars summed to 15, scaled to 100. Fundamental thesis and house view lead (11/15 ≈ 73%); technicals and positioning are capped confirmation (4/15 ≈ 27%). High ≥ 75 · Medium ≥ 55 · Watch ≥ 0.",
    "maxRaw": 15,
    "pillars": [
        {"key": "asymmetry",   "label": "Gap / asymmetry",          "max": 3, "desc": "Thesis expected move (entry → target) ÷ the name's normal move over the same horizon. ≥2.0 → 3 · 1.5-2.0 → 2 · 1.0-1.5 → 1 · <1.0 → 0. The thesis target is a soft input → tagged estimated."},
        {"key": "catalyst",    "label": "Catalyst",                 "max": 2, "desc": "A dated, hard reason it moves soon (earnings, FOMC, CPI, ECB) with a clear trigger → 2 · soft / undated → 1 · none → 0."},
        {"key": "consensus",   "label": "Consensus + confirmation", "max": 2, "desc": "Either sell-side aligned (buy ratio ≥0.6, mean-PT upside, revisions ≥0) OR a defensible variant view, AND an independent signal (breakout / fund flow / options skew). Both legs → 2 · one → 1 · neither → 0. Alignment and a variant edge both count — they don't fight the thesis pillar."},
        {"key": "thesis",      "label": "Fundamental thesis",       "max": 2, "desc": "Quality and edge of the underlying view — two checks, each 0/1: (1) driver specificity — named, quantified drivers (a margin/volume/pricing/policy path with numbers) vs narrative; (2) variant view — an articulated, computable gap vs consensus (our number vs the street's); pure consensus-hugging scores 0. Each idea also states the condition that would change our mind (the `changeMyMind` field), surfaced on the tile but not scored. dq is sourced only when the drivers trace to cited facts; an uncited thesis is estimated and trips the Medium cap."},
        {"key": "houseview",   "label": "House-view fit",           "max": 2, "desc": "Core desk theme, direct expression → 2 · on-theme / adjacent → 1 · off-theme or cuts against a house view → 0."},
        {"key": "positioning", "label": "Positioning",              "max": 2, "desc": "Confirmation / veto, not a driver. Crowd offside our trade is fuel; crowd already with us is unwind risk — a hard read (SI >10% float / extreme CoT) plus a price-crowding read (RSI + stretch from the 50/200-day). Clearly offside → 2 · neutral / mixed → 1 · clearly with us (unwind risk) → 0."},
        {"key": "technical",   "label": "Technical",                "max": 2, "desc": "Confirmation / veto, not a driver. Trend and entry agree with the thesis — 50/100/200-day MA alignment, Bollinger entry quality, Fibonacci off the trailing 6-month swing, RSI not at a crowded extreme against us → 2 · mixed → 1 · contradicts → 0."},
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


def default_intent(idea):
    bucket = idea.get("bucket")
    if bucket == "Protection":
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


def validate(idea, as_of, warns):
    if len(idea.get("sources", [])) < 2:
        warns.append(f"{idea['id']}: fewer than 2 sources cited")
    for f in idea.get("facts", []):
        if f.get("tag") not in ("sourced", "estimated"):
            warns.append(f"{idea['id']}: fact not tagged sourced/estimated -> {f.get('text','')[:50]}")
    e = idea.get("earnings")
    if e and e.get("reportDate"):
        try:
            d = datetime.date.fromisoformat(e["reportDate"])
            if d < as_of:
                warns.append(f"{idea['id']}: report date {e['reportDate']} is BEFORE asOf {as_of} — a forward event must stay future-tense")
        except ValueError:
            warns.append(f"{idea['id']}: bad reportDate {e['reportDate']}")


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
            ensure_intent(idea, warns)
            score_conviction(idea, warns)

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
    if warns:
        print("VALIDATION WARNINGS:")
        for w in warns:
            print("  - " + w)
    else:
        print("Validation: clean (>=2 sources each, facts tagged, no forward event in past tense).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
