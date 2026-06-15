/* ============================================================================
   Brokerage Playground — app logic
   - merges seed data with user-added themes/ideas (localStorage)
   - tab switching, theme filtering, idea drawer, advisor book, pre-trade
   ========================================================================== */
(function () {
  "use strict";

  const LS_KEY = "bp_user_data_v1";
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* allocation colours, cycled */
  const ALLOC_COLORS = ["#29211A", "#9A7B4F", "#C2A661", "#3F6B4E", "#6E7E8C", "#A9803B", "#8A8073"];

  /* ---------- state ---------- */
  let DATA = { themes: [], ideas: [], clients: [] };
  let activeThemeId = null;
  let selectedClientId = null;

  /* ---------- persistence ---------- */
  function loadUser() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || { themes: [], ideas: [] }; }
    catch { return { themes: [], ideas: [] }; }
  }
  function saveUser(u) { localStorage.setItem(LS_KEY, JSON.stringify(u)); }
  let userData = loadUser();

  function rebuildData() {
    const themes = SEED.themes.concat((userData.themes || []).map(t => ({ ...t, _user: true })));
    const ideas  = SEED.ideas.concat((userData.ideas  || []).map(i => ({ ...i, _user: true })));
    DATA = { themes, ideas, clients: SEED.clients };
  }

  /* ---------- helpers ---------- */
  const clientById = (id) => DATA.clients.find(c => c.id === id);
  const themeById  = (id) => DATA.themes.find(t => t.id === id);
  const ideaById   = (id) => DATA.ideas.find(i => i.id === id);
  const ideasForTheme  = (themeId) => DATA.ideas.filter(i => i.themeId === themeId);
  const ideasForClient = (clientId) => DATA.ideas.filter(i => (i.clients || []).some(c => c.id === clientId));
  const initials = (name) => name.trim().slice(0, 1).toUpperCase();
  const convClass = (c) => "conv-" + String(c).toLowerCase().replace(/[^a-z]/g, "");
  const fmtAum = (c) => {
    const sym = c.ccy === "EUR" ? "€" : c.ccy === "GBP" ? "£" : "$";
    return sym + c.aum.toFixed(1) + "m";
  };
  const themeCount = (clientId) => {
    const ts = new Set(ideasForClient(clientId).map(i => i.themeId));
    return ts.size;
  };

  function avatar(name, cls = "") {
    return `<span class="avatar ${cls}" title="${esc(name)}">${esc(initials(name))}</span>`;
  }

  /* ============================== TABS ================================== */
  function switchTab(tab) {
    $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    ["ideas", "book", "pretrade"].forEach(t => {
      $("#view-" + t).hidden = (t !== tab);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ====================== VIEWS & IDEAS ================================ */
  function renderThemes() {
    const list = $("#themeList");
    list.innerHTML = DATA.themes.map(t => {
      const n = ideasForTheme(t.id).length;
      return `<li class="theme-item ${t.id === activeThemeId ? "active" : ""}" data-theme="${esc(t.id)}">
        <span>${esc(t.name)}${t._user ? '<span class="user-flag">new</span>' : ""}</span>
        <span class="count">${n}</span>
      </li>`;
    }).join("");
    $$("#themeList .theme-item").forEach(el =>
      el.addEventListener("click", () => { activeThemeId = el.dataset.theme; renderThemes(); renderIdeaPanel(); }));
  }

  function renderIdeaPanel() {
    const theme = themeById(activeThemeId) || DATA.themes[0];
    if (!theme) return;
    activeThemeId = theme.id;
    $("#ideaThemeEyebrow").textContent = theme._user ? "Custom theme" : "Theme";
    $("#ideaThemeTitle").textContent = theme.name;
    $("#ideaThemeBlurb").textContent = theme.blurb || "";

    const ideas = ideasForTheme(theme.id);
    const tiles = $("#tiles");
    if (!ideas.length) {
      tiles.innerHTML = `<div class="empty-note">No ideas under this theme yet. Use <strong>+ Add idea</strong> to create one.</div>`;
      return;
    }
    tiles.innerHTML = ideas.map(renderTile).join("");
    $$("#tiles .tile").forEach(el =>
      el.addEventListener("click", () => openIdeaDrawer(el.dataset.idea)));
  }

  function renderTile(idea) {
    const clients = idea.clients || [];
    const shown = clients.slice(0, 4);
    const avatars = shown.map(c => {
      const cl = clientById(c.id);
      return cl ? avatar(cl.name) : "";
    }).join("");
    const extra = clients.length > 4 ? `<span class="avatar">+${clients.length - 4}</span>` : "";
    return `<article class="tile" data-idea="${esc(idea.id)}">
      <div class="tile-top">
        <span class="tag ${convClass(idea.conviction)}">${esc(idea.conviction)}</span>
        <span class="tag horizon">${esc(idea.horizon)}</span>
        ${idea._user ? '<span class="user-flag">new</span>' : ""}
      </div>
      <h3>${esc(idea.title)}</h3>
      <p class="thesis">${esc(idea.thesis)}</p>
      <div class="tile-foot">
        <span class="avatars">${avatars}${extra}</span>
        <span class="clients-pill">${clients.length} client${clients.length === 1 ? "" : "s"}</span>
        <span class="arrow">›</span>
      </div>
    </article>`;
  }

  /* ----------------------- idea drawer -------------------------------- */
  function openIdeaDrawer(ideaId) {
    const idea = ideaById(ideaId);
    if (!idea) return;
    const theme = themeById(idea.themeId);
    const clients = (idea.clients || []);

    const clientCards = clients.map(c => {
      const cl = clientById(c.id);
      if (!cl) return "";
      return `<div class="client-apply" data-goclient="${esc(cl.id)}">
        <div class="client-apply-top">
          ${avatar(cl.name)}
          <span class="cname">${esc(cl.name)}</span>
          <span class="cmeta">${esc(fmtAum(cl))} · ${esc(cl.risk)}</span>
        </div>
        <p class="why">${esc(c.why)}</p>
        <div class="go">View in Advisor Book ›</div>
      </div>`;
    }).join("") || `<p class="why">No clients tagged yet.</p>`;

    const structs = (idea.structures || []).map(s => `<span class="struct-chip">${esc(s)}</span>`).join("");

    $("#drawer").innerHTML = `
      <div class="drawer-head">
        <button class="drawer-close" id="drawerClose" aria-label="Close">×</button>
        <span class="eyebrow">${esc(theme ? theme.name : "Idea")}</span>
        <h2>${esc(idea.title)}</h2>
      </div>
      <div class="drawer-body">
        <div class="drawer-meta">
          <span class="tag ${convClass(idea.conviction)}">${esc(idea.conviction)} conviction</span>
          <span class="tag horizon">${esc(idea.horizon)}</span>
        </div>
        <div class="drawer-section">
          <span class="eyebrow">The view</span>
          <p class="thesis-full">${esc(idea.thesis)}</p>
        </div>
        ${structs ? `<div class="drawer-section">
          <span class="eyebrow">How we'd express it</span>
          <div class="struct-row">${structs}</div>
        </div>` : ""}
        <div class="drawer-section">
          <span class="eyebrow">Who this applies to · ${clients.length} client${clients.length === 1 ? "" : "s"}</span>
          ${clientCards}
        </div>
      </div>`;

    $("#drawerClose").addEventListener("click", closeDrawer);
    $$("#drawer .client-apply").forEach(el =>
      el.addEventListener("click", () => {
        closeDrawer();
        switchTab("book");
        selectClient(el.dataset.goclient);
      }));

    $("#overlay").classList.add("open");
    $("#drawer").classList.add("open");
    $("#drawer").setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    $("#overlay").classList.remove("open");
    $("#drawer").classList.remove("open");
    $("#drawer").setAttribute("aria-hidden", "true");
  }

  /* ========================= ADVISOR BOOK ============================= */
  function renderClientSelect() {
    const sel = $("#clientSelect");
    sel.innerHTML = `<option value="">All clients — full book</option>` +
      DATA.clients.map(c => `<option value="${esc(c.id)}">${esc(c.name)} · ${esc(fmtAum(c))}</option>`).join("");
    sel.value = selectedClientId || "";
    sel.onchange = () => selectClient(sel.value || null);
  }

  function renderBookStats() {
    const totalUsd = DATA.clients.reduce((s, c) => {
      const fx = c.ccy === "EUR" ? 1.154 : c.ccy === "GBP" ? 1.27 : 1;
      return s + c.aum * fx;
    }, 0);
    const totalIdeas = new Set();
    DATA.clients.forEach(c => ideasForClient(c.id).forEach(i => totalIdeas.add(i.id)));
    $("#bookStats").innerHTML = `
      <div class="book-stat"><div class="k">Clients</div><div class="v">${DATA.clients.length}</div></div>
      <div class="book-stat"><div class="k">Book AUM</div><div class="v">$${totalUsd.toFixed(0)}m</div></div>
      <div class="book-stat"><div class="k">Live ideas</div><div class="v">${DATA.ideas.length}</div></div>`;
  }

  function renderBookTable() {
    const head = `<div class="book-row is-head">
      <span>Client</span><span>AUM</span><span>Risk</span><span>Themes in play</span><span style="text-align:right">Ideas</span>
    </div>`;
    const rows = DATA.clients.map(c => {
      const themes = [...new Set(ideasForClient(c.id).map(i => i.themeId))]
        .map(tid => themeById(tid)).filter(Boolean).slice(0, 4)
        .map(t => `<span class="mini-tag">${esc(t.name)}</span>`).join("");
      const nIdeas = ideasForClient(c.id).length;
      return `<div class="book-row" data-client="${esc(c.id)}">
        <div class="br-client">${avatar(c.name)}<div><div class="nm">${esc(c.name)}</div><div class="rl">${esc(c.relationship)}</div></div></div>
        <div class="br-aum">${esc(fmtAum(c))}</div>
        <div class="br-risk">${esc(c.risk)}<br><span class="class-pill ${c.classification.toLowerCase()}">${esc(c.classification)}</span></div>
        <div class="br-themes">${themes}</div>
        <div class="br-ideas"><span class="n">${nIdeas}</span> <span class="lbl">ideas</span></div>
      </div>`;
    }).join("");
    $("#bookTable").innerHTML = head + rows;
    $$("#bookTable .book-row[data-client]").forEach(el =>
      el.addEventListener("click", () => selectClient(el.dataset.client)));
  }

  function selectClient(id) {
    selectedClientId = id;
    $("#clientSelect").value = id || "";
    const detail = $("#clientDetail");
    const table = $("#bookTable");
    if (!id) {
      detail.hidden = true;
      table.style.display = "";
      return;
    }
    table.style.display = "none";
    detail.hidden = false;
    renderClientDetail(clientById(id));
    detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderAllocBar(split) {
    const entries = Object.entries(split);
    const segs = entries.map(([k, v], i) =>
      `<div class="alloc-seg" style="width:${v}%;background:${ALLOC_COLORS[i % ALLOC_COLORS.length]}"></div>`).join("");
    const legend = entries.map(([k, v], i) =>
      `<span><span class="alloc-dot" style="background:${ALLOC_COLORS[i % ALLOC_COLORS.length]}"></span>${esc(k.replace(/_/g, " "))} ${v}%</span>`).join("");
    return `<div class="alloc"><div class="alloc-bar">${segs}</div><div class="alloc-legend">${legend}</div></div>`;
  }

  function renderClientDetail(c) {
    if (!c) return;
    const recos = ideasForClient(c.id).map(idea => {
      const why = (idea.clients.find(x => x.id === c.id) || {}).why || "";
      const theme = themeById(idea.themeId);
      return `<div class="rec-idea" data-idea="${esc(idea.id)}">
        <div class="rec-idea-top">
          <span class="tag ${convClass(idea.conviction)}">${esc(idea.conviction)}</span>
          <span class="rec-title">${esc(idea.title)}</span>
          <span class="rec-theme">${esc(theme ? theme.name : "")}</span>
        </div>
        <p class="rec-why">${esc(why)}</p>
      </div>`;
    }).join("") || `<p class="rec-why" style="padding:14px 0">No ideas currently mapped to this client.</p>`;

    const positions = (c.positions || []).map(p =>
      `<div class="pos-row">
        <div>
          <div class="pos-name">${esc(p.name)}<span class="pos-tick">${esc(p.ticker)}</span></div>
          <div class="pos-note">${esc(p.note || "")}</div>
        </div>
        <div><div class="pos-wt">${p.weightPct}%</div><div class="pos-cls">${esc(p.assetClass)}</div></div>
      </div>`).join("");

    $("#clientDetail").innerHTML = `
      <div class="cd-head">
        <div class="cd-head-top">
          ${avatar(c.name)}
          <div>
            <h2>${esc(c.name)} <span class="class-pill ${c.classification.toLowerCase()}">${esc(c.classification)}</span></h2>
            <div class="cd-rel">${esc(c.relationship)}</div>
          </div>
          <div class="cd-aum"><div class="k">Book AUM</div><div class="v">${esc(fmtAum(c))}</div></div>
        </div>
        <p class="cd-profile">${esc(c.profile)}</p>
        ${renderAllocBar(c.split)}
        <div class="goal-strip">
          <div class="goal-item"><div class="gk">Objective</div><div class="gv">${esc(c.goals.objective)}</div></div>
          <div class="goal-item"><div class="gk">Horizon</div><div class="gv">${esc(c.goals.horizon)}</div></div>
          <div class="goal-item"><div class="gk">Classification</div><div class="gv">${esc(c.mifid)}</div></div>
        </div>
        <div class="cd-actions">
          <a class="view-port-btn" href="portfolio.html?client=${esc(c.id)}">View current portfolio ›</a>
        </div>
      </div>

      <div class="agenda">
        <span class="eyebrow">The desk's agenda for this book</span>
        <p>${esc(c.summary)}</p>
      </div>

      <div class="cd-cols" style="margin-top:18px">
        <div class="panel">
          <div class="panel-head"><h3>Recommended ideas</h3><span class="rec-theme" style="margin-left:auto">${ideasForClient(c.id).length} mapped</span></div>
          <div class="panel-body">${recos}</div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Top holdings</h3></div>
          <div class="panel-body">${positions || '<p class="pos-note" style="padding:12px 0">No positions on file.</p>'}</div>
        </div>
      </div>`;

    $$("#clientDetail .rec-idea").forEach(el =>
      el.addEventListener("click", () => openIdeaDrawer(el.dataset.idea)));
  }

  /* ====================== PRE-TRADE ANALYSIS ========================= */
  const CUSTOM_STRUCTURES = ["Direct equity", "ETF / fund", "Covered calls", "Zero-cost collar",
    "Buffered note", "Phoenix autocall", "Call spread", "Leveraged certificate", "Cash-secured puts"];

  function renderPretradeForm() {
    $("#ptClient").innerHTML = DATA.clients.map(c =>
      `<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.classification)} · ${esc(fmtAum(c))}</option>`).join("");
    refreshPtIdeas();
    $("#ptClient").onchange = refreshPtIdeas;
    $("#ptIdea").onchange = () => { toggleCustom(); refreshPtStructures(); };
  }
  function isCustom() { return $("#ptIdea").value === "__custom__"; }
  function toggleCustom() { $("#ptCustom").hidden = !isCustom(); }
  function refreshPtIdeas() {
    const cid = $("#ptClient").value;
    const mapped = ideasForClient(cid);
    const others = DATA.ideas.filter(i => !mapped.includes(i));
    const opt = (i, tag) => `<option value="${esc(i.id)}">${esc(i.title)}${tag ? " — " + tag : ""}</option>`;
    $("#ptIdea").innerHTML =
      `<option value="__custom__">＋ Custom / ad-hoc trade…</option>` +
      (mapped.length ? `<optgroup label="Mapped to this client">${mapped.map(i => opt(i, "fits")).join("")}</optgroup>` : "") +
      `<optgroup label="Other ideas">${others.map(i => opt(i)).join("")}</optgroup>`;
    toggleCustom();
    refreshPtStructures();
  }
  function refreshPtStructures() {
    const list = isCustom() ? CUSTOM_STRUCTURES : ((ideaById($("#ptIdea").value) || {}).structures || ["Direct equity"]);
    $("#ptStructure").innerHTML = list.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
  }

  /* move `amt`% into a goal bucket, funded from Liquidity then largest other bucket */
  function moveToBucket(buckets, target, amt) {
    const b = Object.assign({}, buckets);
    const fromLiq = Math.min(amt, b.Liquidity || 0);
    let rem = amt - fromLiq;
    b.Liquidity = (b.Liquidity || 0) - fromLiq;
    if (rem > 0.0001) {
      const cand = Object.keys(b).filter(k => k !== target && k !== "Liquidity").sort((x, y) => b[y] - b[x])[0];
      if (cand) b[cand] = Math.max(0, b[cand] - rem);
    }
    b[target] = (b[target] || 0) + amt;
    return b;
  }

  function runPretrade(e) {
    e.preventDefault();
    const c = clientById($("#ptClient").value);
    if (!c) return;
    const structure = $("#ptStructure").value;
    const notional = Math.max(0, parseFloat($("#ptNotional").value) || 0);

    // resolve the trade target (idea or custom)
    let label, assetClass, bucket, theme, mapped = false, why = null, deskView;
    if (isCustom()) {
      label = ($("#ptCustomName").value.trim() || "Ad-hoc trade");
      assetClass = $("#ptCustomClass").value;
      bucket = SEED.ASSET_BUCKET[assetClass] || "Growth";
      theme = "Custom";
      deskView = `Ad-hoc trade — no house view on file. Expressed as ${structure}.`;
    } else {
      const idea = ideaById($("#ptIdea").value);
      if (!idea) return;
      const imp = SEED.THEME_IMPACT[idea.themeId] || { assetClass: "Equity", bucket: "Growth" };
      label = idea.title; assetClass = imp.assetClass; bucket = imp.bucket;
      theme = (themeById(idea.themeId) || {}).name || "";
      mapped = (idea.clients || []).some(x => x.id === c.id);
      why = (idea.clients.find(x => x.id === c.id) || {}).why;
      deskView = `${idea.conviction} conviction · ${idea.horizon} horizon. Preferred expression: ${structure}.`;
    }

    /* ---- portfolio impact (asset-class lens) ---- */
    const curSplit = c.split;
    const { split: postSplit, funding } = BPCharts.applyTrade(curSplit, assetClass, notional);
    // stable colour per label across both donuts
    const labels = [...new Set([...Object.keys(curSplit), ...Object.keys(postSplit)].map(k => k.replace(/_/g, " ")))];
    const colorOf = (lab) => BPCharts.PALETTE[labels.indexOf(lab) % BPCharts.PALETTE.length];
    const segOf = (split) => Object.entries(split).map(([k, v]) => ({ label: k.replace(/_/g, " "), value: v, color: colorOf(k.replace(/_/g, " ")) }));
    const curSeg = segOf(curSplit), postSeg = segOf(postSplit);

    /* ---- goal impact (bucket lens) ---- */
    const curB = BPCharts.bucketAlloc(curSplit);
    const postB = moveToBucket(curB, bucket, notional);
    const target = c.goals.target;
    const before = BPCharts.targetDistance(curB, target);
    const after = BPCharts.targetDistance(postB, target);
    const closer = after < before - 0.05, neutral = Math.abs(after - before) <= 0.05;
    const moveMag = Math.abs(before - after).toFixed(1);
    const targetSeg = SEED.GOAL_BUCKETS.map(b => ({ label: b.key, value: target[b.key] || 0, color: b.color }));
    const postBSeg = SEED.GOAL_BUCKETS.map(b => ({ label: b.key, value: postB[b.key] || 0, color: b.color }));
    const deltas = SEED.GOAL_BUCKETS.map(b => ({ key: b.key, d: (postB[b.key] || 0) - (curB[b.key] || 0) }));

    /* ---- checks ---- */
    const checks = [];
    const otc = c.classification === "Retail" && SEED.isOtcOption(structure);
    checks.push(otc
      ? { type: "warn", title: "Appropriateness — MiFID Retail blocks this", detail: `${c.name} is classified <b>${c.mifid}</b>. A <b>${esc(structure)}</b> is a complex / OTC-derivative product — Retail clients can't trade it without re-classification or a non-complex alternative (direct equity, ETF or fund).` }
      : { type: "ok", title: "Appropriateness — cleared", detail: `${c.name} (${c.mifid}) can trade <b>${esc(structure)}</b>.` });

    checks.push(mapped
      ? { type: "ok", title: "Suitability — fits the mandate", detail: why || "Mapped to the client's mandate." }
      : { type: "info", title: "Suitability — confirm fit", detail: isCustom()
          ? `Ad-hoc trade — confirm it fits ${c.name}'s ${c.risk.toLowerCase()} mandate and "${esc(c.goals.objective)}".`
          : `Not on ${c.name}'s mapped list. Confirm it fits the ${c.risk.toLowerCase()} mandate.` });

    checks.push(funding.ok
      ? { type: "ok", title: "Funding — covered by cash", detail: funding.text }
      : { type: "warn", title: "Funding — exceeds cash", detail: funding.text });

    const top = (c.positions || [])[0];
    checks.push(top && top.weightPct >= 20
      ? { type: "warn", title: "Concentration flag", detail: `Largest position ${esc(top.name)} is ${top.weightPct}% of the book — size this so it diversifies rather than compounds the concentration.` }
      : { type: "ok", title: "Concentration — within range", detail: `Largest position is ${top ? top.weightPct : 0}%; a ${notional}% sleeve-level trade keeps single-name risk in range.` });

    checks.push({ type: closer ? "ok" : neutral ? "info" : "warn",
      title: "Long-term goal alignment",
      detail: `${c.name}'s objective: "${esc(c.goals.objective)}" (${esc(c.goals.horizon)}). This lifts the <b>${bucket}</b> sleeve and moves the book ${neutral ? "broadly neutrally vs" : (closer ? `~${moveMag}pts closer to` : `~${moveMag}pts further from`)} the strategic target.` });

    if (c.ccy !== "USD")
      checks.push({ type: "info", title: "Currency", detail: `Book base is ${c.ccy}; most ideas are USD-denominated. Consider an FX overlay or ${c.ccy}-hedged sleeve.` });

    checks.push({ type: "info", title: "Desk view", detail: deskView });

    /* ---- render ---- */
    const ico = (t) => t === "ok" ? "✓" : t === "warn" ? "!" : "i";
    $("#ptResult").innerHTML = `
      <div class="pt-result-head">
        <span class="eyebrow">${esc(c.name)} · ${esc(theme)} · ${esc(c.classification)}</span>
        <h3>${esc(label)} — ${esc(structure)}, ${notional}% of book</h3>
      </div>

      <div class="pt-section">
        <span class="eyebrow">Impact on the portfolio</span>
        <div class="pie-row">
          <div class="pie-card"><div class="pc-t">Current allocation</div>${BPCharts.donut(curSeg)}${BPCharts.legend(curSeg)}</div>
          <div class="pie-card"><div class="pc-t">After this trade</div>${BPCharts.donut(postSeg)}${BPCharts.legend(postSeg)}</div>
        </div>
      </div>

      <div class="pt-section">
        <span class="eyebrow">Impact on long-term goals</span>
        <div class="pie-row">
          <div class="pie-card"><div class="pc-t">Strategic target</div>${BPCharts.donut(targetSeg)}${BPCharts.legend(targetSeg)}</div>
          <div class="pie-card"><div class="pc-t">Book after trade</div>${BPCharts.donut(postBSeg)}${BPCharts.legend(postBSeg)}</div>
        </div>
        <div class="pt-verdict ${neutral ? "toward" : (closer ? "toward" : "away")}">
          <span class="vch">${neutral ? "≈" : (closer ? "✓" : "▲")}</span>
          <div>${neutral
            ? `Broadly neutral for ${esc(c.name)}'s strategic target.`
            : (closer
              ? `Moves the book <b>~${moveMag}pts closer</b> to ${esc(c.name)}'s strategic target.`
              : `Moves the book <b>~${moveMag}pts further</b> from ${esc(c.name)}'s strategic target — size with care.`)}</div>
        </div>
        <div class="pt-delta-row">
          ${deltas.map(d => `<span class="pt-delta">${d.key} <b class="${d.d > 0 ? "up" : d.d < 0 ? "dn" : ""}">${d.d > 0 ? "+" : ""}${d.d.toFixed(1)}</b></span>`).join("")}
        </div>
      </div>

      <a class="pt-portfolio-link" href="portfolio.html?client=${esc(c.id)}">View ${esc(c.name)}'s current portfolio ›</a>

      <div class="pt-checks">
        ${checks.map(ck => `<div class="pt-check ${ck.type}">
          <span class="ico">${ico(ck.type)}</span>
          <div><div class="ck-title">${ck.title}</div><div class="ck-detail">${ck.detail}</div></div>
        </div>`).join("")}
      </div>`;
  }

  /* ============================ MODALS =============================== */
  function openModal(html) {
    $("#modal").innerHTML = html;
    $("#overlay").classList.add("open");
    $("#modal").classList.add("open");
  }
  function closeModal() {
    $("#overlay").classList.remove("open");
    $("#modal").classList.remove("open");
  }

  function openAddTheme() {
    openModal(`
      <div class="modal-head"><span class="eyebrow">New theme</span><h2>Add an investment theme</h2></div>
      <div class="modal-body">
        <div class="field">
          <label class="field-label">Theme name</label>
          <input id="mThemeName" placeholder="e.g. Defence &amp; Aerospace" />
        </div>
        <div class="field">
          <label class="field-label">House view (one line)</label>
          <textarea id="mThemeBlurb" placeholder="The desk's one-line summary of this theme."></textarea>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="mCancel">Cancel</button>
        <button class="btn btn-primary" id="mSave">Add theme</button>
      </div>`);
    $("#mCancel").onclick = closeModal;
    $("#mSave").onclick = () => {
      const name = $("#mThemeName").value.trim();
      if (!name) { $("#mThemeName").focus(); return; }
      const id = "u-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36).slice(-4);
      userData.themes.push({ id, name, blurb: $("#mThemeBlurb").value.trim() });
      saveUser(userData); rebuildData();
      activeThemeId = id;
      renderThemes(); renderIdeaPanel(); renderBookTable(); renderBookStats();
      closeModal();
    };
  }

  function openAddIdea() {
    const themeOpts = DATA.themes.map(t =>
      `<option value="${esc(t.id)}" ${t.id === activeThemeId ? "selected" : ""}>${esc(t.name)}</option>`).join("");
    const clientChecks = DATA.clients.map(c =>
      `<label class="check-item" data-cid="${esc(c.id)}">
        <input type="checkbox" value="${esc(c.id)}" /> ${esc(c.name)}
      </label>`).join("");
    openModal(`
      <div class="modal-head"><span class="eyebrow">New idea</span><h2>Add an idea</h2></div>
      <div class="modal-body">
        <div class="field">
          <label class="field-label">Theme</label>
          <select id="mIdeaTheme">${themeOpts}</select>
        </div>
        <div class="field">
          <label class="field-label">Idea title</label>
          <input id="mIdeaTitle" placeholder="e.g. Copper supply deficit" />
        </div>
        <div class="field" style="display:flex;gap:12px">
          <div style="flex:1">
            <label class="field-label">Conviction</label>
            <select id="mIdeaConv"><option>High</option><option>Medium-High</option><option>Medium</option></select>
          </div>
          <div style="flex:1">
            <label class="field-label">Horizon</label>
            <select id="mIdeaHorizon"><option>Tactical</option><option>6–12m</option><option>12m</option><option>Strategic</option><option>Income</option></select>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Thesis</label>
          <textarea id="mIdeaThesis" placeholder="The investment case in one or two sentences."></textarea>
        </div>
        <div class="field">
          <label class="field-label">Structures (comma-separated)</label>
          <input id="mIdeaStructs" placeholder="Direct equity, Call spread" />
        </div>
        <div class="field">
          <label class="field-label">Applies to which clients?</label>
          <div class="check-list" id="mIdeaClients">${clientChecks}</div>
          <div class="hint">Tick the clients this idea fits — they'll appear in the idea and in each client's recommended list.</div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="mCancel">Cancel</button>
        <button class="btn btn-primary" id="mSave">Add idea</button>
      </div>`);

    $$("#mIdeaClients .check-item").forEach(el => {
      const cb = el.querySelector("input");
      cb.addEventListener("change", () => el.classList.toggle("checked", cb.checked));
    });
    $("#mCancel").onclick = closeModal;
    $("#mSave").onclick = () => {
      const title = $("#mIdeaTitle").value.trim();
      if (!title) { $("#mIdeaTitle").focus(); return; }
      const themeId = $("#mIdeaTheme").value;
      const structs = $("#mIdeaStructs").value.split(",").map(s => s.trim()).filter(Boolean);
      const clients = $$("#mIdeaClients input:checked").map(cb => ({
        id: cb.value,
        why: `Flagged by the desk as a fit for ${clientById(cb.value).name}'s book.`
      }));
      const id = "u-idea-" + Date.now().toString(36);
      userData.ideas.push({
        id, themeId, title,
        conviction: $("#mIdeaConv").value,
        horizon: $("#mIdeaHorizon").value,
        thesis: $("#mIdeaThesis").value.trim() || "Custom idea added from the desk.",
        structures: structs.length ? structs : ["Direct equity"],
        clients
      });
      saveUser(userData); rebuildData();
      activeThemeId = themeId;
      renderThemes(); renderIdeaPanel(); renderBookTable(); renderBookStats();
      if (selectedClientId) renderClientDetail(clientById(selectedClientId));
      closeModal();
    };
  }

  /* ============================== INIT ============================== */
  function init() {
    rebuildData();
    activeThemeId = DATA.themes[0] && DATA.themes[0].id;

    // date stamp
    const d = new Date();
    $("#asOf").textContent = "As of " + d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    // tabs
    $$(".tab").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));

    // ideas
    renderThemes();
    renderIdeaPanel();
    $("#addThemeBtn").addEventListener("click", openAddTheme);
    $("#addIdeaBtn").addEventListener("click", openAddIdea);

    // book
    renderClientSelect();
    renderBookStats();
    renderBookTable();

    // pretrade
    renderPretradeForm();
    $("#ptForm").addEventListener("submit", runPretrade);

    // overlay closes drawer + modal
    $("#overlay").addEventListener("click", () => { closeDrawer(); closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); closeModal(); } });

    // deep links from the portfolio page (?tab=&client=&idea=)
    const p = new URLSearchParams(location.search);
    const qTab = p.get("tab"), qClient = p.get("client"), qIdea = p.get("idea");
    if (qIdea && ideaById(qIdea)) {
      switchTab("ideas");
      activeThemeId = ideaById(qIdea).themeId;
      renderThemes(); renderIdeaPanel();
      openIdeaDrawer(qIdea);
    } else if (qTab === "book") {
      switchTab("book");
      if (qClient && clientById(qClient)) selectClient(qClient);
    } else if (qTab === "pretrade") {
      switchTab("pretrade");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
