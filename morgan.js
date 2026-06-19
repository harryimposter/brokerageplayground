/* ============================================================================
   Morgan AI — grounded, rule-based assistant (no backend, no LLM call)
   ----------------------------------------------------------------------------
   Answers three question types for EVERY client and EVERY idea, GROUNDED in the
   real data — it never free-associates a market view or invents a number:

     1. METHODOLOGY  — "how is fit scored?", "how is the comfort limit set?",
        "how do you derive goals?", "what's the conviction rubric?" …
        → composed from window.METHODOLOGY, which reads the LIVE engine constants.

     2. "WHY DID YOU RECOMMEND {idea}?"
        → composed from the idea's own record: conviction pillars + thesis +
          trade statement + trigger + variant + sources (Today's Focus), or the
          thesis + house theme + conviction tag (Solutions Views).

     3. "WHY {idea} FOR {client}?" / "WHY ISN'T {idea} FLAGGED TO {client}?"
        → composed from the LIVE fit engine for that exact pair:
          MAPPING.scoreIdeaForClient(idea, client) — the same per-axis breakdown,
          goal-alignment, chosen implementation, tradability/MiFID outcome and
          gap-vs-comfort the Today's-Focus drawers render, with the real numbers.

   SAFEGUARD: it parses the question for intent + entities (client, idea), then
   COMPOSES from the retrieved data. If it can't resolve the client/idea, or can't
   ground the answer, it says so plainly and asks — it does not guess.
   ========================================================================== */
(function () {
  "use strict";
  const S = () => window.SEED;
  const TF = () => window.TODAY_FOCUS || {};
  const MAP = () => window.MAPPING;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const round = (n) => Math.round(n);

  /* ---------------- the idea universe: Solutions Views + Today's Focus ------- */
  function allIdeas() {
    const tf = TF();
    const focus = [].concat(tf.earnings || [], tf.exEarnings || []);
    return [].concat(S().ideas || [], focus);
  }
  const ideaTitle = (i) => i.title || i.name || i.id || "this idea";
  /* stop-words: short/common tokens that must NOT match an idea, so ungroundable
     questions ("what is the weather today?") fall through instead of false-matching. */
  const STOP = new Set(["the", "and", "for", "you", "why", "did", "how", "are", "was", "that",
    "this", "with", "idea", "ideas", "flag", "flags", "flagged", "client", "recommend", "isnt",
    "not", "does", "your", "our", "what", "who", "whom", "when", "where", "which", "into", "from",
    "get", "got", "has", "have", "had", "its", "his", "her", "their", "them", "they", "here",
    "there", "about", "would", "should", "could", "today", "now", "set", "see", "ask", "any",
    "tell", "show", "give", "explain", "reason", "rationale", "fits", "fit", "book", "books"]);
  function ideaTokens(s) {
    return String(s || "").toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3 && !STOP.has(t));
  }

  /* ---------------- entity matching (resolve, never guess) ------------------ */
  function findClient(msg) {
    return (S().clients || []).find(c => msg.includes(" " + c.name.toLowerCase())) ||
           (S().clients || []).find(c => msg.includes(c.name.toLowerCase())) || null;
  }
  function findIdea(msg) {
    let best = null, bestScore = 0;
    allIdeas().forEach(idea => {
      const title = ideaTitle(idea).toLowerCase();
      let score = 0;
      // whole title / name appearing literally is the strongest signal
      if (title.length > 4 && msg.includes(title)) score += 100;
      // ticker hit
      const tickers = (idea.tickers || []).concat(idea.ticker ? [idea.ticker] : []);
      if (tickers.some(t => t && msg.includes(String(t).toLowerCase()))) score += 4;
      // name / title token overlap (weighted highest)
      ideaTokens(title).forEach(t => { if (msg.includes(t)) score += 2; });
      // structure / natural-expression / headline tokens (lighter — catches "range accrual", "puts")
      [].concat(idea.structures || [], idea.naturalExpression || [], idea.headline || "")
        .forEach(s => ideaTokens(s).forEach(t => { if (msg.includes(t)) score += 1; }));
      if (score > bestScore) { bestScore = score; best = idea; }
    });
    return bestScore >= 2 ? best : null;
  }
  const has = (msg, words) => words.some(w => msg.includes(w));

  /* ---------------- grounded helpers: per-pair fit (the engine) ------------- */
  const fitTier = (fit) => { const P = MAP().PARAMS; return fit >= P.tierStrong ? "Strong" : fit >= P.tierGood ? "Good" : "Marginal"; };

  function axisLine(a) {
    return `<li><b>${esc(a.label)}</b>: ${round(a.score)}/100 × ${(+a.weight).toFixed(2)} = ${(+a.contribution).toFixed(1)} — ${esc(a.note)}</li>`;
  }

  /* gap-vs-comfort, read from the same live values the engine scores (no new math) */
  function gapComfortText(idea, client) {
    try {
      const bucket = idea.bucket;
      const goal = window.GOALS.goalsFor(client) || {};
      const cur = window.GOALS.currentBuckets(client) || {};
      const tgt = round(goal[bucket] || 0), have = round(cur[bucket] || 0);
      const gap = tgt - have;
      const sector = idea.sector;
      const exp = Math.round((window.Scanner.exposure(client).bySector[sector] || 0) * 10) / 10;
      const cap = MAP().sectorPeg(client, sector);
      const overTarget = tgt > 0 && have > tgt, overComfort = exp > cap, fitsGap = tgt > 0 && gap >= 2;
      const capTxt = `${exp}% in ${esc(sector)} vs your ${cap}% comfort cap`;
      if (fitsGap && overComfort) return `Fits ${esc(client.name)}'s ${esc(bucket)} gap (${gap}pts under target) but is over your comfort cap (${capTxt}) — amber: recommend, but your call.`;
      if (fitsGap) return `Fits ${esc(client.name)}'s ${esc(bucket)} gap (${gap}pts under target) and within your comfort cap (${capTxt}) — clean to recommend.`;
      if (overComfort) return `${esc(client.name)} is at/over their ${esc(bucket)} goal and over your comfort cap (${capTxt})${overTarget ? " — trim rather than add" : ""}.`;
      return `${esc(client.name)} is ${gap < 0 ? "at/over" : "near"} their ${esc(bucket)} goal, and within your comfort cap (${capTxt}).`;
    } catch (e) { return ""; }
  }

  function groundFit(idea, client, negative) {
    const res = MAP().scoreIdeaForClient(idea, client);
    const title = esc(ideaTitle(idea)), C = esc(client.name);
    const flagMin = MAP().PARAMS.flagMin;

    if (res.suppressed) {
      const alt = (idea.structures || []).find(s => !S().isOtcOption(s));
      return `<b>${title}</b> is <b>not flagged to ${C}</b> — it's <b>suppressed by the MiFID tradability gate</b>, so its fit is forced to 0.<br><br>${esc(res.tradabilityReason)}${alt ? `<br><br>A non-complex / structured-note route — <b>${esc(alt)}</b> — would be tradable for ${C}.` : ""}`;
    }

    const flagged = res.fit >= flagMin;
    const al = res.goalAlignment || {};
    const axes = `<ul class="m-list">${res.axes.map(axisLine).join("")}</ul>`;
    const alignTxt = al.bucket
      ? `<b>Goal alignment:</b> ${esc(al.bucket)} bucket — goal ${round(al.goal)}% vs current ${round(al.current)}% (gap ${al.gap > 0 ? "+" : ""}${al.gap}) → ×${al.mult} multiplier on the weighted sum.`
      : "";
    const implTxt = res.bestImpl
      ? `<b>Best implementation for ${C}:</b> ${esc(res.bestImpl)} (suitability ${round(res.bestImplScore)}/100).`
      : "";
    const gc = gapComfortText(idea, client);

    const head = flagged
      ? `<b>${title}</b> ${negative ? "<i>is</i> in fact flagged to" : "fits"} <b>${C}</b> — fit <b>${res.fit}/100</b> (${fitTier(res.fit)}), at or above the flag threshold of ${flagMin}.`
      : `<b>${title}</b> is <b>not flagged to ${C}</b> — fit <b>${res.fit}/100</b> (${fitTier(res.fit)}), below the flag threshold of ${flagMin}.`;

    // for a "not flagged" answer, name the axes dragging it down
    let drag = "";
    if (!flagged) {
      const low = res.axes.slice().sort((a, b) => a.contribution - b.contribution).slice(0, 2);
      drag = `<br><br>What holds it back: ${low.map(a => `<b>${esc(a.label)}</b> (${round(a.score)}/100)`).join(" and ")}.`;
    }

    return `${head}<br><br><b>Pre-gate weighted sum ${res.bracketFit}/100</b> across the four axes:${axes}${alignTxt ? alignTxt + "<br><br>" : ""}${implTxt ? implTxt + "<br><br>" : ""}${gc ? "<b>Gap vs comfort:</b> " + gc : ""}${drag}`;
  }

  /* top-fit idea for a client (used when the question names a client but no idea) */
  function topIdeaFor(client) {
    let best = null, bestFit = -1;
    allIdeas().forEach(idea => {
      try {
        const r = MAP().scoreIdeaForClient(idea, client);
        if (!r.suppressed && r.fit > bestFit) { bestFit = r.fit; best = idea; }
      } catch (e) {}
    });
    return best;
  }

  /* ---------------- grounded helpers: why-this-idea (conviction record) ----- */
  function groundWhyIdea(idea) {
    const title = esc(ideaTitle(idea));
    const conv = idea.conviction;
    const pieces = [];

    // Today's Focus ideas carry a structured conviction object with pillars
    if (conv && Array.isArray(conv.pillars)) {
      pieces.push(`<b>${title}</b> — conviction <b>${conv.score}/100</b> (${esc(conv.label || conv.tier)}), raw ${conv.raw}/${conv.maxRaw} on the ${esc(conv.model)} rubric:`);
      pieces.push(`<ul class="m-list">${conv.pillars.map(p =>
        `<li><b>${esc(p.label)}</b> ${p.score}/${p.max} — ${esc(p.note)} <span class="m-note">[${esc(p.dq || "estimated")}]</span></li>`).join("")}</ul>`);
      if (conv.capped) pieces.push(`<span class="m-note">Label capped at Medium because at least one pillar's input is estimated/unverified.</span><br><br>`);
    } else if (conv) {
      pieces.push(`<b>${title}</b> — <b>${esc(conv)}</b> conviction (desk view).`);
    } else {
      pieces.push(`<b>${title}</b>.`);
    }

    if (idea.tradeStatement) pieces.push(`<b>Trade statement:</b> ${esc(idea.tradeStatement)}`);
    if (idea.thesis) pieces.push(`<b>Thesis:</b> ${esc(idea.thesis)}`);
    if (idea.trigger) pieces.push(`<b>Why now:</b> ${esc(idea.trigger)}`);
    if (idea.variant && (idea.variant.us || idea.variant.gap)) {
      const v = idea.variant;
      pieces.push(`<b>Our variant:</b> ${esc(v.us || "")}${v.street ? `<br><span class="m-note">Street: ${esc(v.street)}</span>` : ""}${v.gap ? `<br><span class="m-note">Gap: ${esc(v.gap)}</span>` : ""}`);
    }
    if (idea.changeMyMind) pieces.push(`<b>What would change our mind:</b> ${esc(idea.changeMyMind)}`);
    if ((idea.sources || []).length) pieces.push(`<span class="m-note">Sources: ${idea.sources.map(s => esc(s.name)).join(" · ")}${(idea.facts || []).length ? ` · ${idea.facts.length} sourced/estimated facts on file` : ""}</span>`);

    // Solutions Views idea (no conviction object): add theme + flagged-book context
    if (!conv || !Array.isArray(conv.pillars)) {
      const who = MAP().flagClients(idea).map(f => f.client.name);
      if (idea.structures) pieces.push(`Expressed via ${esc(idea.structures.join(", "))}.`);
      pieces.push(`This is a standing house view; it currently flags to <b>${who.length ? esc(who.join(", ")) : "no books strongly"}</b> — derived live from each book's exposure and goals.`);
    }
    return pieces.join("<br><br>");
  }

  /* ---------------- idea / client overviews (grounded fallbacks) ------------ */
  function ideaOverview(idea) {
    const title = esc(ideaTitle(idea));
    const flags = MAP().flagClients(idea);
    const who = flags.map(f => `${f.client.name} (${f.fit})`);
    const conv = idea.conviction;
    const convTxt = conv && conv.score != null ? `${conv.score}/100 (${esc(conv.label || conv.tier)})` : conv ? esc(conv) : "—";
    return `<b>${title}</b> — ${esc(idea.sector || "")}${idea.assetClass ? " · " + esc(idea.assetClass) : ""}${idea.bucket ? " · " + esc(idea.bucket) : ""}. Conviction ${convTxt}.<br><br>${esc(idea.thesis || idea.headline || "")}<br><br>Flags to: <b>${who.length ? esc(who.join(", ")) : "no books at the threshold"}</b>. Ask “why ${esc(ideaTitle(idea))} for ${flags[0] ? esc(flags[0].client.name) : "a client"}?” for the per-axis breakdown, or “why did you recommend ${esc(ideaTitle(idea))}?” for the conviction.`;
  }
  function clientOverview(client) {
    const ccy = client.ccy === "EUR" ? "€" : client.ccy === "GBP" ? "£" : "$";
    let goalTxt = "";
    try {
      const g = window.GOALS.goalsFor(client);
      goalTxt = `Derived goal — Growth ${g.Growth}% · Income ${g.Income}% · Preservation ${g.Preservation}%.`;
    } catch (e) {}
    const nba = (window.Scanner.nextBestAction(client) || {}).title || "—";
    return `<b>${esc(client.name)}</b> — ${esc(client.mifid)}, ${esc(client.risk)}, ${ccy}${client.aum}m.<br><i>${esc((client.goals || {}).objective || "")}</i><br>${goalTxt}<br><br>Next best action: <b>${esc(nba)}</b>. Ask me “why {an idea} for ${esc(client.name)}?” or “what are ${esc(client.name)}'s risks?”.`;
  }

  /* ============================ the composer ============================== */
  function answer(raw) {
    const msg = " " + String(raw || "").toLowerCase().trim() + " ";
    if (!window.SEED || !MAP()) return `I'm still loading the book — try again in a moment.`;

    const client = findClient(msg);
    const idea = findIdea(msg);
    const whyIntent = has(msg, ["why", "explain", "reason", "rationale", "how come"]);
    const recommendIntent = has(msg, ["recommend", "surface", "suggest", "pick this", "why this idea", "why the idea", "why did you", "why'd you", "flag this idea"]);
    const notFlagged = has(msg, ["isn't flag", "isnt flag", "not flag", "won't flag", "wont flag", "not flagged", "no flag", "why not"]);
    const forClient = has(msg, ["for ", "to ", "flag"]);

    // 1. WHY {idea} FOR {client}  /  WHY ISN'T {idea} FLAGGED TO {client}
    if (idea && client && (whyIntent || forClient || notFlagged)) {
      return groundFit(idea, client, notFlagged);
    }

    // 2. WHY DID YOU RECOMMEND {idea}  (no specific client)
    if (idea && !client && (whyIntent || recommendIntent)) {
      return groundWhyIdea(idea);
    }

    // 3. METHODOLOGY (fit / comfort / goals / conviction / tradability / tailoring / flag)
    if (window.METHODOLOGY) {
      const m = window.METHODOLOGY.answer(msg);
      if (m) return m;
    }

    // 4. WHY THIS IDEA FOR {client}  — client named, no idea: assume their top-fit idea
    if (client && (whyIntent || forClient) && !idea) {
      const top = topIdeaFor(client);
      if (top) {
        return `You didn't name an idea, so I'll take the one that currently fits <b>${esc(client.name)}</b> best — <b>${esc(ideaTitle(top))}</b> (name any other idea to switch).<br><br>${groundFit(top, client, false)}`;
      }
    }

    // 5. client risks / actions
    if (client && has(msg, ["risk", "what should", "what do", "biggest", "issue", "problem", "action", "concern", "watch"])) {
      const rec = window.Scanner.recommendations(client);
      const top = rec.findings.slice(0, 3);
      const items = top.length
        ? "<ul class='m-list'>" + top.map(t => `<li><b>${esc(t.title)}</b> — ${esc(t.rationale)}</li>`).join("") + "</ul>"
        : "<br>The book is in good shape — no urgent flags from the scan.";
      return `For <b>${esc(client.name)}</b> (${esc(client.mifid)}, ${esc(client.risk)}), the book scan flags:${items}Next best action: <b>${esc((rec.nba || {}).title || "—")}</b>.`;
    }

    // 6. overviews
    if (idea && client) return groundFit(idea, client, false);
    if (idea) return ideaOverview(idea);
    if (client) return clientOverview(client);

    // 7. greeting / help / fallback (honest about scope — no guessing)
    if (has(msg, ["hello", "hi ", "hey", "help", "what can you", "good morning", "good afternoon"])) {
      return `I'm <b>Morgan AI</b>. I answer three things, grounded in your live book — I won't invent a market view or a number. Try:<br>• “Why did you recommend the range accrual?” <span class="m-note">(conviction)</span><br>• “Why is the USD/JPY puts idea flagged to Amar?” <span class="m-note">(per-client fit)</span><br>• “Why isn't Micron flagged to Aurora?” <span class="m-note">(per-client fit)</span><br>• “How is the comfort limit set?” / “How do you derive goals?” <span class="m-note">(methodology)</span>`;
    }
    // can't ground → say so plainly, don't guess
    return `I can only answer from the book — I couldn't pin down a <b>client</b> and/or an <b>idea</b> in that. Name a client (e.g. Scott, Amar, Aurora) and/or an idea (e.g. the range accrual, Micron, USD/JPY puts), or ask a methodology question like “how is fit scored?”, “how is the comfort limit set?” or “what's the conviction rubric?”.`;
  }

  /* ---------------- widget UI (unchanged JPM aesthetic) -------------------- */
  const SUGGESTIONS = [
    "Why did you recommend the range accrual?",
    "Why is the USD/JPY puts idea flagged to Amar?",
    "How is the comfort limit set?"
  ];

  function mount() {
    if (document.getElementById("morganRoot")) return;
    const root = document.createElement("div");
    root.id = "morganRoot";
    root.innerHTML = `
      <button id="morganFab" aria-label="Open Morgan AI">
        <span class="morgan-spark">✦</span> Morgan AI
      </button>
      <div id="morganPanel" hidden>
        <div class="morgan-head">
          <div><span class="morgan-spark">✦</span> <b>Morgan AI</b><div class="morgan-sub">Grounded in your book · explains the reasoning</div></div>
          <button id="morganClose" aria-label="Minimise" title="Minimise">–</button>
        </div>
        <div class="morgan-msgs" id="morganMsgs"></div>
        <div class="morgan-sugs" id="morganSugs"></div>
        <form class="morgan-input" id="morganForm">
          <input id="morganText" placeholder="Ask why a trade fits a client…" autocomplete="off" />
          <button type="submit" aria-label="Send">➤</button>
        </form>
      </div>`;
    document.body.appendChild(root);

    const panel = document.getElementById("morganPanel");
    const msgs = document.getElementById("morganMsgs");
    const sugWrap = document.getElementById("morganSugs");

    function push(html, who) {
      const d = document.createElement("div");
      d.className = "morgan-msg " + who;
      d.innerHTML = html;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }
    function ask(text) {
      if (!text.trim()) return;
      push(esc(text), "user");
      setTimeout(() => push(answer(text), "bot"), 120);
    }
    sugWrap.innerHTML = SUGGESTIONS.map(s => `<button class="morgan-sug">${esc(s)}</button>`).join("");
    sugWrap.querySelectorAll(".morgan-sug").forEach(b => b.addEventListener("click", () => ask(b.textContent)));

    const fab = document.getElementById("morganFab");
    function openPanel() {
      panel.hidden = false; fab.hidden = true;
      if (!msgs.children.length) push(answer("hello"), "bot");
      document.getElementById("morganText").focus();
    }
    function minimisePanel() { panel.hidden = true; fab.hidden = false; }
    fab.addEventListener("click", openPanel);
    document.getElementById("morganClose").addEventListener("click", minimisePanel);
    document.getElementById("morganForm").addEventListener("submit", e => {
      e.preventDefault();
      const t = document.getElementById("morganText");
      ask(t.value); t.value = "";
    });
  }

  window.Morgan = { answer, mount };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
