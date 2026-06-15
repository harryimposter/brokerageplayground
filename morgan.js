/* ============================================================================
   Morgan AI — grounded, rule-based assistant (no backend)
   ----------------------------------------------------------------------------
   Answers questions about the book from the actual data + Scanner logic:
     • why an idea applies to a client          • how suitability / NBA is scored
     • MiFID Retail / OTC appropriateness        • a client's biggest risks / actions
     • what an idea is                           • how the views/coverage work
   Deterministic: it retrieves and explains; it does not invent market views.
   ========================================================================== */
(function () {
  "use strict";
  const S = () => window.SEED;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------- matching helpers ---------------- */
  function findClient(msg) {
    return S().clients.find(c => msg.includes(c.name.toLowerCase())) || null;
  }
  function findIdea(msg) {
    let best = null, bestScore = 0;
    S().ideas.forEach(idea => {
      if (msg.includes(idea.title.toLowerCase())) { best = idea; bestScore = 99; return; }
      const toks = idea.title.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3);
      const hits = toks.filter(t => msg.includes(t)).length;
      if (hits > bestScore) { best = idea; bestScore = hits; }
    });
    return bestScore >= 1 ? best : null;
  }
  const has = (msg, words) => words.some(w => msg.includes(w));

  /* ---------------- answer composer ---------------- */
  function answer(raw) {
    const msg = " " + String(raw || "").toLowerCase().trim() + " ";
    const client = findClient(msg);
    const idea = findIdea(msg);

    // 1. suitability / scoring / NBA
    if (has(msg, ["how is suitab", "suitability calc", "how do you score", "how does scoring", "how is the score", "next best action", "how do you rank", "how are ideas ranked", "scoring work", "how do you decide"])) {
      return `Every idea is scored for a client as <b>goal-gap × conviction × suitability</b>:
<ul>
<li><b>Goal-gap</b> — how far <i>under</i> the client's strategic target the idea's role (Growth / Income / Protection / Liquidity) sits. A bigger gap means the book needs it more.</li>
<li><b>Conviction</b> — the desk view: High = 3, Medium-High = 2, Medium = 1.</li>
<li><b>Suitability</b> — normally 1, but drops to 0.4 if the client is <b>MiFID Retail</b> and the idea can only be expressed through complex / OTC structures.</li>
</ul>
The <b>Next Best Action</b> is the highest-severity finding from the portfolio scan (concentration, underwater positions, FX, cash drag, liabilities…), or the top-scored idea if the book is clean.${client ? `<br><br>For <b>${esc(client.name)}</b>, that currently points to: <b>${esc((window.Scanner.nextBestAction(client) || {}).title || "—")}</b>.` : ""}`;
    }

    // 2. MiFID / OTC / appropriateness
    if (has(msg, ["otc", "mifid", "appropriate", "retail", "professional", "why can't", "why cant", "complex product"])) {
      const retail = S().clients.filter(c => c.classification === "Retail").map(c => c.name).join(", ");
      const pro = S().clients.filter(c => c.classification === "Professional").map(c => c.name).join(", ");
      let extra = "";
      if (client) extra = `<br><br><b>${esc(client.name)}</b> is <b>${esc(client.mifid)}</b>${client.classification === "Retail" ? " — so collars, autocalls, buffered notes, covered calls and FX forwards are off the table without re-classification; the desk flags the action and proposes a non-complex alternative (direct equity, ETF, fund, bond ladder)." : " — so complex / OTC structures are available."}`;
      return `Under MiFID, <b>Retail</b> clients can't trade complex / OTC products — collars, risk-reversals, autocalls, buffered notes, covered calls, FX forwards and the like. The scanner still surfaces the right <i>action</i>, but flags appropriateness and offers a non-complex route.<br><br><b>Retail:</b> ${esc(retail)}<br><b>Professional:</b> ${esc(pro)}${extra}`;
    }

    // 3. why does idea X apply to client Y  (or just one of them)
    if (idea && client) {
      const fit = window.Scanner.ideaFit(idea, client);
      if (fit.applies) {
        return `<b>${esc(idea.title)}</b> fits <b>${esc(client.name)}</b> because: ${esc(fit.reason)}<br><br><i>${esc(idea.thesis)}</i><br><br>Type: ${esc(idea.type)} · ${esc(idea.assetClass)} · ${esc(idea.sector)} · ${esc(idea.conviction)} conviction. Expressed via ${esc(idea.structures.join(", "))}.${client.classification === "Retail" && idea.structures.every(s => S().isOtcOption(s)) ? `<br><br>⚠️ ${esc(client.name)} is Retail — these structures are complex; we'd need a non-complex alternative.` : ""}`;
      }
      return `<b>${esc(idea.title)}</b> isn't a strong fit for <b>${esc(client.name)}</b> right now — the book has limited ${esc(idea.sector)}/${esc(idea.assetClass)} exposure and isn't materially under its ${esc(idea.bucket)} target, so it scores low on goal-gap and exposure. It would be an overlay rather than a need.`;
    }

    // 4. client risks / what to do
    if (client && has(msg, ["risk", "what should", "what do", "biggest", "issue", "problem", "action", "recommend", "do for", "watch", "concern"])) {
      const rec = window.Scanner.recommendations(client);
      const top = rec.findings.slice(0, 3);
      const items = top.length
        ? "<ul>" + top.map(t => `<li><b>${esc(t.title)}</b> — ${esc(t.rationale)}</li>`).join("") + "</ul>"
        : "<br>The book is in good shape — no urgent flags from the scan.";
      return `For <b>${esc(client.name)}</b> (${esc(client.mifid)}, ${esc(client.risk)}), the scan flags:${items}Next best action: <b>${esc((rec.nba || {}).title || "—")}</b>.`;
    }

    // 5. a client overview
    if (client) {
      const rec = window.Scanner.recommendations(client);
      return `<b>${esc(client.name)}</b> — ${esc(client.mifid)}, ${esc(client.risk)}, ${client.ccy === "EUR" ? "€" : client.ccy === "GBP" ? "£" : "$"}${client.aum}m.<br><i>${esc(client.goals.objective)}</i> (${esc(client.goals.horizon)}).<br><br>${esc(client.summary)}<br><br>Next best action: <b>${esc((rec.nba || {}).title || "—")}</b>. Ask me "what are ${esc(client.name)}'s risks?" for the full list.`;
    }

    // 6. an idea overview
    if (idea) {
      const who = window.Scanner.clientsForIdea(idea).map(x => x.client.name);
      return `<b>${esc(idea.title)}</b> — ${esc(idea.type)} · ${esc(idea.assetClass)} · ${esc(idea.sector)} · ${esc(idea.conviction)} conviction, ${esc(idea.horizon)}.<br><br>${esc(idea.thesis)}<br><br>Expressed via ${esc(idea.structures.join(", "))}.<br>Currently fits: <b>${who.length ? esc(who.join(", ")) : "no books strongly"}</b> (derived from each book's exposure + goals).`;
    }

    // 7. coverage / views / how it works
    if (has(msg, ["coverage", "grid", "matrix", "asset class"])) {
      return `The <b>Coverage grid</b> (Advisor Book → Coverage) shows every client's asset-class allocation against their strategic target — bronze cells are on/over plan, faded cells are <b>under target</b> (a gap to fill). It's the bird's-eye view of where each book is light.`;
    }
    if (has(msg, ["view", "idea", "theme", "outlook"])) {
      return `The <b>Views</b> tab holds the desk's themes (from the mid-year outlook — AI, power & infrastructure, fixed income, real assets, resilience, gold, healthcare). Open any idea to see which client books it fits — and that list is <b>derived</b> from each book's exposure and goals, not hand-picked. Portfolio-specific actions (collar this, hedge that) come from the book scan on each client.`;
    }

    // 8. greeting / help / fallback
    if (has(msg, ["hello", "hi ", "hey", "help", "what can you"])) {
      return `I'm <b>Morgan AI</b>. I can explain the book. Try:<br>• "Why does gold apply to Scott?"<br>• "How is suitability calculated?"<br>• "What are Amar's biggest risks?"<br>• "Why can't Aurora trade OTC?"`;
    }
    return `I can answer questions grounded in the book — try naming a <b>client</b> (e.g. Scott, Amar) and/or an <b>idea</b> (e.g. gold, duration), or ask "how is suitability calculated?" or "why can't Prahnav trade OTC?"`;
  }

  /* ---------------- widget UI ---------------- */
  const SUGGESTIONS = [
    "How is suitability calculated?",
    "What are Amar's biggest risks?",
    "Why can't Prahnav trade OTC?"
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
          <button id="morganClose" aria-label="Close">×</button>
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

    document.getElementById("morganFab").addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden && !msgs.children.length) push(answer("hello"), "bot");
      if (!panel.hidden) document.getElementById("morganText").focus();
    });
    document.getElementById("morganClose").addEventListener("click", () => { panel.hidden = true; });
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
