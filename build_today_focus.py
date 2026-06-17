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

# ---- Conviction rubric (shown in the UI) --------------------------------------
# Four pillars, each scored 1-5 in the research file; total /20 -> /100.
RUBRIC = {
    "max_per_pillar": 5,
    "pillars": [
        {"key": "catalyst",  "label": "Catalyst clarity",      "desc": "Is there a dated, hard catalyst (a print, a meeting) or just a drift?"},
        {"key": "setup",     "label": "Setup & positioning",   "desc": "Technicals, valuation and how crowded / reset the trade is."},
        {"key": "pricing",   "label": "Risk / reward & pricing","desc": "How well priced the reward is versus the risk you take."},
        {"key": "houseview", "label": "House-view fit",         "desc": "Alignment with a standing desk house view — an idea-level property (moved here from client-fit). 5 core desk theme / direct expression · 4 on-theme · 3 thematically adjacent · 2 off-theme, tactical · 1 cuts against a house view. Shown in the UI as a percentage (20% per level)."},
    ],
    "tiers": [
        {"key": "High",   "min": 75, "label": "High conviction"},
        {"key": "Medium", "min": 55, "label": "Medium conviction"},
        {"key": "Watch",  "min": 0,  "label": "Watchlist"},
    ],
}
PILLAR_LABELS = {p["key"]: p["label"] for p in RUBRIC["pillars"]}


def tier_for(score):
    for t in RUBRIC["tiers"]:
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


def score_conviction(idea, warns):
    pillars = idea.get("conviction", {}).get("pillars", [])
    total = sum(p.get("score", 0) for p in pillars)
    mx = RUBRIC["max_per_pillar"] * len(RUBRIC["pillars"])
    if len(pillars) != len(RUBRIC["pillars"]):
        warns.append(f"{idea['id']}: expected {len(RUBRIC['pillars'])} conviction pillars, found {len(pillars)}")
    score = round(total / mx * 100) if mx else 0
    # normalise pillar labels from the rubric so the UI is consistent
    for p in pillars:
        p["label"] = PILLAR_LABELS.get(p["key"], p.get("label", p["key"]))
        p["max"] = RUBRIC["max_per_pillar"]
    idea["conviction"]["score"] = score
    idea["conviction"]["tier"] = tier_for(score)
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

    data["convictionRubric"] = RUBRIC

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
