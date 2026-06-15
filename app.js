/* ============================================================================
   Brokerage Playground — app logic (v2)
   Wires the UI to the scanner engine: ideas<->clients are DERIVED, the advisor
   book shows scanner findings + matched ideas grouped by asset class, and the
   add-idea flow tags an idea (type/asset class/sector) without picking clients.
   ========================================================================== */
(function () {
  "use strict";

  const LS_KEY = "bp_user_data_v2";
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* base seed snapshots so user additions layer cleanly and the scanner sees them */
  const BASE_IDEAS = window.SEED.ideas.slice();
  const BASE_THEMES = window.SEED.themes.slice();

  let DATA = { themes: [], ideas: [], clients: window.SEED.clients };
  let activeThemeId = null;
  let selectedClientId = null;
  let ptFindings = [];

  /* ---------- persistence ---------- */
  function loadUser() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || { themes: [], ideas: [] }; }
    catch { return { themes: [], ideas: [] }; }
  }
  function saveUser(u) { localStorage.setItem(LS_KEY, JSON.stringify(u)); }
  let userData = loadUser();

  function rebuildData() {
    const themes = BASE_THEMES.concat((userData.themes || []).map(t => ({ ...t, _user: true })));
    const ideas  = BASE_IDEAS.concat((userData.ideas  || []).map(i => ({ ...i, _user: true })));
    // keep window.SEED in sync so Scanner matches user-added ideas too
    window.SEED.themes = themes;
    window.SEED.ideas = ideas;
    DATA = { themes, ideas, clients: window.SEED.clients };
  }

  /* ---------- helpers ---------- */
  const clientById = (id) => DATA.clients.find(c => c.id === id);
  const themeById  = (id) => DATA.themes.find(t => t.id === id);
  const ideaById   = (id) => DATA.ideas.find(i => i.id === id);
  const ideasForTheme = (themeId) => DATA.ideas.filter(i => i.themeId === themeId);
  const matchedIdeas = (client) => window.Scanner.matchedIdeas(client);
  const clientsForIdea = (idea) => window.Scanner.clientsForIdea(idea);
  const initials = (name) => name.trim().slice(0, 1).toUpperCase();
  const convClass = (c) => "conv-" + String(c).toLowerCase().replace(/[^a-z]/g, "");
  const fmtAum = (c) => (c.ccy === "EUR" ? "€" : c.ccy === "GBP" ? "£" : "$") + c.aum.toFixed(1) + "m";
  function avatar(name, cls = "") { return `<span class="avatar ${cls}" title="${esc(name)}">${esc(initials(name))}</span>`; }
  const sourceTag = (src) => src === "Portfolio"
    ? `<span class="src-tag portfolio">Portfolio</span>`
    : `<span class="src-tag view">View</span>`;

  /* ============================== TABS ================================== */
  function switchTab(tab) {
    $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    ["ideas", "book", "pretrade"].forEach(t => { $("#view-" + t).hidden = (t !== tab); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ====================== VIEWS & IDEAS ================================ */
  function renderThemes() {
    $("#themeList").innerHTML = DATA.themes.map(t =>
      `<li class="theme-item ${t.id === activeThemeId ? "active" : ""}" data-theme="${esc(t.id)}">
        <span>${esc(t.name)}${t._user ? '<span class="user-flag">new</span>' : ""}</span>
        <span class="count">${ideasForTheme(t.id).length}</span>
      </li>`).join("");
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
    tiles.innerHTML = ideas.length
      ? ideas.map(renderTile).join("")
      : `<div class="empty-note">No ideas under this theme yet. Use <strong>+ Add idea</strong> to create one.</div>`;
    $$("#tiles .tile").forEach(el => el.addEventListener("click", () => openIdeaDrawer(el.dataset.idea)));
  }

  function renderTile(idea) {
    const clients = clientsForIdea(idea);
    const avatars = clients.slice(0, 4).map(x => avatar(x.client.name)).join("");
    const extra = clients.length > 4 ? `<span class="avatar">+${clients.length - 4}</span>` : "";
    return `<article class="tile" data-idea="${esc(idea.id)}">
      <div class="tile-top">
        <span class="tag ${convClass(idea.conviction)}">${esc(idea.conviction)}</span>
        <span class="tag type">${esc(idea.type || "Thematic")}</span>
        ${idea._user ? '<span class="user-flag">new</span>' : ""}
      </div>
      <h3>${esc(idea.title)}</h3>
      <p class="thesis">${esc(idea.thesis)}</p>
      <div class="tile-tags">${esc(idea.assetClass)} · ${esc(idea.sector)}</div>
      <div class="tile-foot">
        <span class="avatars">${avatars}${extra}</span>
        <span class="clients-pill">${clients.length} book${clients.length === 1 ? "" : "s"}</span>
        <span class="arrow">›</span>
      </div>
    </article>`;
  }

  /* ----------------------- idea drawer -------------------------------- */
  function openIdeaDrawer(ideaId) {
    const idea = ideaById(ideaId);
    if (!idea) return;
    const theme = themeById(idea.themeId);
    const clients = clientsForIdea(idea);

    const clientCards = clients.map(x => {
      const cl = x.client;
      const blocked = cl.classification === "Retail" && (idea.structures || []).every(s => SEED.isOtcOption(s));
      return `<div class="client-apply" data-goclient="${esc(cl.id)}">
        <div class="client-apply-top">
          ${avatar(cl.name)}
          <span class="cname">${esc(cl.name)}</span>
          <span class="cmeta">${esc(fmtAum(cl))} · ${esc(cl.classification)}</span>
        </div>
        <p class="why">${esc(x.reason)}</p>
        ${blocked ? `<p class="why" style="color:var(--neg)">⚠️ Retail — complex structure; needs a non-complex alternative.</p>` : ""}
        <div class="go">View in Advisor Book ›</div>
      </div>`;
    }).join("") || `<p class="why">No books are a strong fit right now (derived from exposure + goals).</p>`;

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
          <span class="tag type">${esc(idea.type || "Thematic")}</span>
          <span class="tag horizon">${esc(idea.horizon)}</span>
        </div>
        <div class="drawer-section">
          <span class="eyebrow">The view</span>
          <p class="thesis-full">${esc(idea.thesis)}</p>
          <p class="thesis-full" style="font-size:12.5px;color:var(--ink-faint);margin-top:8px">${esc(idea.assetClass)} · ${esc(idea.sector)} · ${esc(idea.bucket)} role</p>
        </div>
        ${structs ? `<div class="drawer-section"><span class="eyebrow">How we'd express it</span><div class="struct-row">${structs}</div></div>` : ""}
        <div class="drawer-section">
          <span class="eyebrow">Which books this fits · ${clients.length}</span>
          ${clientCards}
        </div>
      </div>`;
    $("#drawerClose").addEventListener("click", closeDrawer);
    $$("#drawer .client-apply").forEach(el =>
      el.addEventListener("click", () => { closeDrawer(); switchTab("book"); selectClient(el.dataset.goclient); }));
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
    const totalUsd = DATA.clients.reduce((s, c) => s + c.aum * (c.ccy === "EUR" ? 1.154 : c.ccy === "GBP" ? 1.27 : 1), 0);
    $("#bookStats").innerHTML = `
      <div class="book-stat"><div class="k">Clients</div><div class="v">${DATA.clients.length}</div></div>
      <div class="book-stat"><div class="k">Book AUM</div><div class="v">$${totalUsd.toFixed(0)}m</div></div>
      <div class="book-stat"><div class="k">Live ideas</div><div class="v">${DATA.ideas.length}</div></div>`;
  }

  function renderBookTable() {
    const head = `<div class="book-row is-head">
      <span>Client</span><span>AUM</span><span>Risk</span><span>Next best action</span><span style="text-align:right">Actions</span>
    </div>`;
    const rows = DATA.clients.map(c => {
      const rec = window.Scanner.recommendations(c);
      const nba = rec.nba;
      return `<div class="book-row" data-client="${esc(c.id)}">
        <div class="br-client">${avatar(c.name)}<div><div class="nm">${esc(c.name)}</div><div class="rl">${esc(c.relationship)}</div></div></div>
        <div class="br-aum">${esc(fmtAum(c))}</div>
        <div class="br-risk">${esc(c.risk)}<br><span class="class-pill ${c.classification.toLowerCase()}">${esc(c.classification)}</span></div>
        <div class="br-themes">
          ${nba ? `<div class="lead-line"><span class="lead-k">Lead</span> ${esc(nba.title)}</div>` : ""}
          <div class="mini-tags">${rec.findings.slice(0, 3).map(f => `<span class="mini-tag">${esc(f.kind)}</span>`).join("")}</div>
        </div>
        <div class="br-ideas"><span class="n">${rec.all.length}</span> <span class="lbl">recs</span></div>
      </div>`;
    }).join("");
    $("#bookTable").innerHTML = head + rows;
    $$("#bookTable .book-row[data-client]").forEach(el => el.addEventListener("click", () => selectClient(el.dataset.client)));
  }

  function selectClient(id) {
    selectedClientId = id;
    $("#clientSelect").value = id || "";
    const detail = $("#clientDetail"), table = $("#bookTable");
    if (!id) { detail.hidden = true; table.style.display = ""; return; }
    table.style.display = "none";
    detail.hidden = false;
    renderClientDetail(clientById(id));
    detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderAllocBar(split) {
    const C = BPCharts.PALETTE;
    const entries = Object.entries(split);
    const segs = entries.map(([k, v], i) => `<div class="alloc-seg" style="width:${v}%;background:${C[i % C.length]}"></div>`).join("");
    const legend = entries.map(([k, v], i) => `<span><span class="alloc-dot" style="background:${C[i % C.length]}"></span>${esc(k.replace(/_/g, " "))} ${v}%</span>`).join("");
    return `<div class="alloc"><div class="alloc-bar">${segs}</div><div class="alloc-legend">${legend}</div></div>`;
  }

  /* one recommendation tile (scanner finding OR matched view idea) */
  function recoItemHTML(it, isNba) {
    const chips = (it.structures || []).slice(0, 3).map(s =>
      `<span class="struct-chip sm ${SEED.isOtcOption(s) && it.retailBlocked ? "blocked" : ""}">${esc(s)}</span>`).join("");
    const handle = it.source === "View" ? `data-idea="${esc(it.ideaId)}"` : `data-stage="1"`;
    return `<article class="reco-card${isNba ? " is-nba" : ""}" ${handle}>
      <div class="rc-top">
        ${isNba ? '<span class="nba-tag">Next best</span>' : ""}
        ${sourceTag(it.source)}
        ${it.conviction ? `<span class="tag ${convClass(it.conviction)}">${esc(it.conviction)}</span>` : ""}
      </div>
      <h4>${esc(it.title)}</h4>
      <p class="rc-why">${esc(it.rationale)}</p>
      <div class="rc-structs">${chips}</div>
      ${it.retailBlocked ? `<div class="rc-alt">⚠️ Retail — alt: ${esc(it.alt || "non-complex instrument")}</div>` : ""}
      <div class="rc-foot"><span class="rc-bucket">${esc(it.bucket || "")} role</span><span class="rc-cta">${it.source === "View" ? "View idea ›" : "Stage ›"}</span></div>
    </article>`;
  }

  function renderClientDetail(c) {
    if (!c) return;
    const rec = window.Scanner.recommendations(c);
    const nba = rec.nba;
    const nbaKey = nba ? (nba.source === "View" ? nba.ideaId : nba.title) : null;

    const groupsHTML = rec.groups.map(g => `
      <div class="reco-group">
        <div class="reco-group-head">${esc(g.assetClass)} <span class="reco-count">${g.items.length}</span></div>
        <div class="reco-tiles">${g.items.map(it => recoItemHTML(it, nbaKey && (it.source === "View" ? it.ideaId : it.title) === nbaKey)).join("")}</div>
      </div>`).join("") || `<p class="reco-why" style="padding:12px 0">No recommendations — book is on plan.</p>`;

    const positions = (c.positions || []).map(p =>
      `<div class="pos-row">
        <div>
          <div class="pos-name">${esc(p.name)}<span class="pos-tick">${esc(p.ticker)}</span></div>
          <div class="pos-note">${esc(p.note || "")}</div>
        </div>
        <div>
          <div class="pos-wt">${p.weightPct}%</div>
          <div class="pos-pnl ${p.pnlPct > 0 ? "up" : p.pnlPct < 0 ? "dn" : ""}">${p.pnlPct > 0 ? "+" : ""}${p.pnlPct}%</div>
        </div>
      </div>`).join("");

    const liabilities = (c.liabilities || []).length
      ? `<div class="panel" style="margin-top:18px"><div class="panel-head"><h3>Liabilities</h3></div><div class="panel-body">
          ${c.liabilities.map(l => `<div class="pos-row"><div><div class="pos-name">${esc(l.name)}</div><div class="pos-note">${esc(l.note || "")}</div></div><div><div class="pos-wt">${l.unit === "$m" ? "$" + l.amount + "m" : l.amount + l.unit}</div></div></div>`).join("")}
        </div></div>` : "";

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
        ${BPCharts.fundingBar(c.goals.funding)}
        <div class="cd-actions">
          <a class="view-port-btn" href="portfolio.html?client=${esc(c.id)}">View current portfolio ›</a>
          <a class="view-port-btn ghost" href="onepager.html?client=${esc(c.id)}">Client one-pager ›</a>
        </div>
      </div>

      ${nba ? `<div class="nba-banner" data-stage="1">
        <div class="nba-banner-l">
          <span class="nba-tag">Next best action</span>
          <span class="nba-title">${esc(nba.title)}</span>
          <p class="nba-why">${esc(nba.rationale)}</p>
        </div>
        <span class="nba-cta">Stage in Pre-Trade ›</span>
      </div>` : ""}

      <div class="agenda"><span class="eyebrow">The desk's agenda for this book</span><p>${esc(c.summary)}</p></div>

      <div class="panel" style="margin-top:18px">
        <div class="panel-head"><h3>Recommendations by asset class</h3><span class="rec-theme" style="margin-left:auto">${rec.findings.length} from the book · ${rec.viewItems.length} from Views</span></div>
        <div class="panel-body reco-body">${groupsHTML}</div>
      </div>

      <div class="panel" style="margin-top:18px">
        <div class="panel-head"><h3>Holdings</h3></div>
        <div class="panel-body">${positions || '<p class="pos-note" style="padding:12px 0">No positions on file.</p>'}</div>
      </div>
      ${liabilities}`;

    // wire interactions
    $$("#clientDetail .reco-card[data-idea]").forEach(el =>
      el.addEventListener("click", () => openIdeaDrawer(el.dataset.idea)));
    $$("#clientDetail .reco-card[data-stage]").forEach(el =>
      el.addEventListener("click", () => stageFinding(c.id, el.querySelector("h4").textContent)));
    const banner = $("#clientDetail .nba-banner");
    if (banner) banner.addEventListener("click", () => stageNba(c.id, nba));
  }

  function stageNba(clientId, nba) {
    if (!nba) return;
    if (nba.source === "View") stageView(clientId, nba.ideaId);
    else stageFinding(clientId, nba.title);
  }
  function stageView(clientId, ideaId) {
    switchTab("pretrade");
    const cl = $("#ptClient"); cl.value = clientId; cl.dispatchEvent(new Event("change"));
    const id = $("#ptIdea"); id.value = ideaId; id.dispatchEvent(new Event("change"));
    $("#ptForm").dispatchEvent(new Event("submit"));
  }
  function stageFinding(clientId, title) {
    switchTab("pretrade");
    const cl = $("#ptClient"); cl.value = clientId; cl.dispatchEvent(new Event("change"));
    const id = $("#ptIdea");
    const opt = Array.from(id.options).find(o => o.text.replace(/^Portfolio · /, "") === title);
    if (opt) { id.value = opt.value; id.dispatchEvent(new Event("change")); $("#ptForm").dispatchEvent(new Event("submit")); }
  }

  /* ----------------------- coverage: allocation vs target ------------- */
  function setBookView(v) {
    $$(".book-viewtoggle .seg").forEach(b => b.classList.toggle("active", b.dataset.bookview === v));
    $("#bookListWrap").hidden = v !== "list";
    $("#coverageWrap").hidden = v !== "coverage";
    if (v === "coverage") renderCoverageGrid();
  }

  function normSplit(split) {
    const out = {};
    SEED.ASSET_CLASSES.forEach(ac => { out[ac] = 0; });
    Object.entries(split).forEach(([k, v]) => {
      const key = k.replace(/_/g, " ");
      out[key] = (out[key] || 0) + v;
    });
    return out;
  }

  function renderCoverageGrid() {
    const cols = SEED.ASSET_CLASSES;
    const head = `<div class="cov-row cov-head">
      <div class="cov-cell cov-client">Client</div>
      ${cols.map(ac => `<div class="cov-cell cov-th">${esc(ac)}</div>`).join("")}
      <div class="cov-cell cov-th">Biggest gap</div></div>`;
    const rows = DATA.clients.map(c => {
      const ns = normSplit(c.split);
      const buckets = window.Scanner.bucketAlloc(c.split);
      const gap = SEED.GOAL_BUCKETS.map(b => ({ key: b.key, d: (c.goals.target[b.key] || 0) - (buckets[b.key] || 0) }))
        .sort((a, b) => b.d - a.d)[0];
      const gapTxt = gap && gap.d >= 4 ? `${gap.key} <b>−${gap.d.toFixed(0)}</b>` : `<span class="cov-ontrack">on plan</span>`;
      const cells = cols.map(ac => {
        const v = Math.round(ns[ac] || 0);
        const shade = v === 0 ? 0 : Math.min(1, v / 45);
        return `<div class="cov-cell cov-num" style="background:rgba(154,123,79,${(shade * 0.85).toFixed(2)});color:${shade > 0.55 ? "#fff" : "var(--ink)"}" title="${esc(ac)} ${v}%">${v ? v + "%" : "·"}</div>`;
      }).join("");
      return `<div class="cov-row" data-client="${esc(c.id)}">
        <div class="cov-cell cov-client">${avatar(c.name)}<span>${esc(c.name)}</span></div>
        ${cells}<div class="cov-cell cov-gap">${gapTxt}</div></div>`;
    }).join("");
    $("#coverageWrap").innerHTML = `
      <div class="cov-grid" style="--cols:${cols.length + 1}">${head}${rows}</div>
      <p class="cov-note">Each row is a client; each column an <b>asset class</b>, shaded by weight (darker = bigger holding). The <b>Biggest gap</b> column shows where the book is furthest under its strategic target — the sleeve to build. Click a row to open the client.</p>`;
    $$("#coverageWrap .cov-row[data-client]").forEach(el =>
      el.addEventListener("click", () => { setBookView("list"); selectClient(el.dataset.client); }));
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
  function isFinding() { return $("#ptIdea").value.startsWith("pf:"); }
  function toggleCustom() { $("#ptCustom").hidden = !isCustom(); }

  function refreshPtIdeas() {
    const c = clientById($("#ptClient").value);
    if (!c) return;
    const rec = window.Scanner.recommendations(c);
    ptFindings = rec.findings;
    const matched = rec.viewItems;
    const matchedIds = new Set(matched.map(m => m.ideaId));
    const others = DATA.ideas.filter(i => !matchedIds.has(i.id));
    $("#ptIdea").innerHTML =
      `<option value="__custom__">＋ Custom / ad-hoc trade…</option>` +
      (ptFindings.length ? `<optgroup label="Portfolio actions (from the book)">${ptFindings.map((f, i) => `<option value="pf:${i}">Portfolio · ${esc(f.title)}</option>`).join("")}</optgroup>` : "") +
      (matched.length ? `<optgroup label="Matched ideas (from Views)">${matched.map(m => `<option value="${esc(m.ideaId)}">${esc(m.title)} — fits</option>`).join("")}</optgroup>` : "") +
      `<optgroup label="Other ideas">${others.map(i => `<option value="${esc(i.id)}">${esc(i.title)}</option>`).join("")}</optgroup>`;
    toggleCustom();
    refreshPtStructures();
  }
  function refreshPtStructures() {
    let list;
    if (isCustom()) list = CUSTOM_STRUCTURES;
    else if (isFinding()) list = (ptFindings[+$("#ptIdea").value.slice(3)] || {}).structures || ["Direct equity"];
    else list = (ideaById($("#ptIdea").value) || {}).structures || ["Direct equity"];
    $("#ptStructure").innerHTML = list.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join("");
  }

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

    let label, assetClass, bucket, theme, fitText, deskView;
    if (isCustom()) {
      label = $("#ptCustomName").value.trim() || "Ad-hoc trade";
      assetClass = $("#ptCustomClass").value;
      bucket = SEED.ASSET_BUCKET[assetClass] || "Growth";
      theme = "Custom"; fitText = null;
      deskView = `Ad-hoc trade — no house view on file. Expressed as ${structure}.`;
    } else if (isFinding()) {
      const f = ptFindings[+$("#ptIdea").value.slice(3)];
      label = f.title; assetClass = f.assetClass === "Multi-Asset" ? "Alternatives" : f.assetClass;
      bucket = f.bucket; theme = "Portfolio action"; fitText = f.rationale;
      deskView = `Portfolio-derived action (${f.kind}). Expressed via ${structure}.`;
    } else {
      const idea = ideaById($("#ptIdea").value);
      if (!idea) return;
      label = idea.title; assetClass = idea.assetClass === "Multi-Asset" ? "Alternatives" : idea.assetClass;
      bucket = idea.bucket; theme = (themeById(idea.themeId) || {}).name || "";
      const fit = window.Scanner.ideaFit(idea, c);
      fitText = fit.applies ? fit.reason : null;
      deskView = `${idea.conviction} conviction · ${idea.horizon} horizon. Preferred expression: ${structure}.`;
    }

    /* asset-class impact */
    const curSplit = c.split;
    const { split: postSplit, funding } = BPCharts.applyTrade(curSplit, assetClass, notional);
    const labels = [...new Set([...Object.keys(curSplit), ...Object.keys(postSplit)].map(k => k.replace(/_/g, " ")))];
    const colorOf = (lab) => BPCharts.PALETTE[labels.indexOf(lab) % BPCharts.PALETTE.length];
    const segOf = (sp) => Object.entries(sp).map(([k, v]) => ({ label: k.replace(/_/g, " "), value: v, color: colorOf(k.replace(/_/g, " ")) }));
    const curSeg = segOf(curSplit), postSeg = segOf(postSplit);

    /* goal impact */
    const curB = BPCharts.bucketAlloc(curSplit);
    const postB = moveToBucket(curB, bucket, notional);
    const target = c.goals.target;
    const before = BPCharts.targetDistance(curB, target), after = BPCharts.targetDistance(postB, target);
    const closer = after < before - 0.05, neutral = Math.abs(after - before) <= 0.05;
    const moveMag = Math.abs(before - after).toFixed(1);
    const targetSeg = SEED.GOAL_BUCKETS.map(b => ({ label: b.key, value: target[b.key] || 0, color: b.color }));
    const postBSeg = SEED.GOAL_BUCKETS.map(b => ({ label: b.key, value: postB[b.key] || 0, color: b.color }));
    const deltas = SEED.GOAL_BUCKETS.map(b => ({ key: b.key, d: (postB[b.key] || 0) - (curB[b.key] || 0) }));

    /* checks */
    const checks = [];
    const otc = c.classification === "Retail" && SEED.isOtcOption(structure);
    checks.push(otc
      ? { type: "warn", title: "Appropriateness — MiFID Retail blocks this", detail: `${c.name} is <b>${c.mifid}</b>. A <b>${esc(structure)}</b> is a complex / OTC product — Retail can't trade it without re-classification or a non-complex alternative (direct equity, ETF, fund, bond ladder).` }
      : { type: "ok", title: "Appropriateness — cleared", detail: `${c.name} (${c.mifid}) can trade <b>${esc(structure)}</b>.` });

    checks.push(fitText
      ? { type: "ok", title: "Suitability — fits the book", detail: fitText }
      : { type: "info", title: "Suitability — confirm fit", detail: `Confirm this fits ${c.name}'s ${c.risk.toLowerCase()} mandate and "${esc(c.goals.objective)}".` });

    checks.push(funding.ok
      ? { type: "ok", title: "Funding — covered by cash", detail: funding.text }
      : { type: "warn", title: "Funding — exceeds cash", detail: funding.text });

    const top = (c.positions || []).slice().sort((a, b) => b.weightPct - a.weightPct)[0];
    checks.push(top && top.weightPct >= 20
      ? { type: "warn", title: "Concentration flag", detail: `Largest position ${esc(top.name)} is ${top.weightPct}% — size this so it diversifies rather than compounds the concentration.` }
      : { type: "ok", title: "Concentration — within range", detail: `Largest position is ${top ? top.weightPct : 0}%; a ${notional}% trade keeps single-name risk in range.` });

    checks.push({ type: closer ? "ok" : neutral ? "info" : "warn", title: "Long-term goal alignment",
      detail: `${c.name}'s objective: "${esc(c.goals.objective)}" (${esc(c.goals.horizon)}). This lifts the <b>${bucket}</b> sleeve and moves the book ${neutral ? "broadly neutrally vs" : (closer ? `~${moveMag}pts closer to` : `~${moveMag}pts further from`)} the strategic target. Funding goal: ${esc(c.goals.funding.headline)} — <b>${esc(c.goals.funding.status)}</b>.` });

    if (c.ccy !== "USD")
      checks.push({ type: "info", title: "Currency", detail: `Book base is ${c.ccy}; most ideas are USD-denominated. Consider an FX overlay or ${c.ccy}-hedged sleeve.` });
    checks.push({ type: "info", title: "Desk view", detail: deskView });

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
        <div class="pt-verdict ${closer || neutral ? "toward" : "away"}">
          <span class="vch">${neutral ? "≈" : (closer ? "✓" : "▲")}</span>
          <div>${neutral ? `Broadly neutral for ${esc(c.name)}'s strategic target.`
            : (closer ? `Moves the book <b>~${moveMag}pts closer</b> to ${esc(c.name)}'s strategic target.`
              : `Moves the book <b>~${moveMag}pts further</b> from ${esc(c.name)}'s strategic target — size with care.`)}</div>
        </div>
        <div class="pt-delta-row">${deltas.map(d => `<span class="pt-delta">${d.key} <b class="${d.d > 0 ? "up" : d.d < 0 ? "dn" : ""}">${d.d > 0 ? "+" : ""}${d.d.toFixed(1)}</b></span>`).join("")}</div>
      </div>
      <a class="pt-portfolio-link" href="portfolio.html?client=${esc(c.id)}">View ${esc(c.name)}'s current portfolio ›</a>
      <div class="pt-checks">
        ${checks.map(ck => `<div class="pt-check ${ck.type}"><span class="ico">${ico(ck.type)}</span><div><div class="ck-title">${ck.title}</div><div class="ck-detail">${ck.detail}</div></div></div>`).join("")}
      </div>`;
  }

  /* ============================ MODALS =============================== */
  function openModal(html) { $("#modal").innerHTML = html; $("#overlay").classList.add("open"); $("#modal").classList.add("open"); }
  function closeModal() { $("#overlay").classList.remove("open"); $("#modal").classList.remove("open"); }

  function openAddTheme() {
    openModal(`
      <div class="modal-head"><span class="eyebrow">New theme</span><h2>Add an investment theme</h2></div>
      <div class="modal-body">
        <div class="field"><label class="field-label">Theme name</label><input id="mThemeName" placeholder="e.g. Defence &amp; Aerospace" /></div>
        <div class="field"><label class="field-label">House view (one line)</label><textarea id="mThemeBlurb" placeholder="The desk's one-line summary."></textarea></div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add theme</button></div>`);
    $("#mCancel").onclick = closeModal;
    $("#mSave").onclick = () => {
      const name = $("#mThemeName").value.trim();
      if (!name) { $("#mThemeName").focus(); return; }
      const id = "u-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString(36).slice(-4);
      userData.themes.push({ id, name, blurb: $("#mThemeBlurb").value.trim() });
      saveUser(userData); rebuildData(); activeThemeId = id;
      renderThemes(); renderIdeaPanel(); renderBookTable(); renderBookStats();
      closeModal();
    };
  }

  function openAddIdea() {
    const themeOpts = DATA.themes.map(t => `<option value="${esc(t.id)}" ${t.id === activeThemeId ? "selected" : ""}>${esc(t.name)}</option>`).join("");
    const acOpts = ["Equity", "Fixed Income", "Commodity", "Real Assets", "Alternatives", "Multi-Asset", "Structured"].map(a => `<option>${a}</option>`).join("");
    const secOpts = ["Technology", "Healthcare", "Financials", "Energy", "Utilities", "Industrials", "Materials", "Consumer", "Real Estate", "Infrastructure", "Rates", "Credit", "Gold", "Crypto", "FX", "Broad"].map(s => `<option>${s}</option>`).join("");
    openModal(`
      <div class="modal-head"><span class="eyebrow">New idea</span><h2>Add an idea</h2></div>
      <div class="modal-body">
        <div class="field"><label class="field-label">Theme</label><select id="mIdeaTheme">${themeOpts}</select></div>
        <div class="field"><label class="field-label">Idea title</label><input id="mIdeaTitle" placeholder="e.g. Copper supply deficit" /></div>
        <div class="field" style="display:flex;gap:12px">
          <div style="flex:1"><label class="field-label">Type</label><select id="mIdeaType"><option>Thematic</option><option>Opportunistic</option><option>Strategic</option></select></div>
          <div style="flex:1"><label class="field-label">Conviction</label><select id="mIdeaConv"><option>High</option><option>Medium-High</option><option>Medium</option></select></div>
        </div>
        <div class="field" style="display:flex;gap:12px">
          <div style="flex:1"><label class="field-label">Asset class</label><select id="mIdeaAC">${acOpts}</select></div>
          <div style="flex:1"><label class="field-label">Sector</label><select id="mIdeaSector">${secOpts}</select></div>
        </div>
        <div class="field"><label class="field-label">Horizon</label><select id="mIdeaHorizon"><option>Tactical</option><option>12m</option><option>Strategic</option></select></div>
        <div class="field"><label class="field-label">Thesis</label><textarea id="mIdeaThesis" placeholder="The investment case in one or two sentences."></textarea></div>
        <div class="field"><label class="field-label">Structures (comma-separated)</label><input id="mIdeaStructs" placeholder="Direct equity, Call spread" /></div>
        <div class="hint">No need to pick clients — Morgan works out which books this fits from each portfolio's exposure and goals.</div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" id="mCancel">Cancel</button><button class="btn btn-primary" id="mSave">Add idea</button></div>`);
    $("#mCancel").onclick = closeModal;
    $("#mSave").onclick = () => {
      const title = $("#mIdeaTitle").value.trim();
      if (!title) { $("#mIdeaTitle").focus(); return; }
      const assetClass = $("#mIdeaAC").value, sector = $("#mIdeaSector").value;
      const bucket = SEED.SECTOR_BUCKET[sector] || SEED.ASSET_BUCKET[assetClass] || "Growth";
      const structs = $("#mIdeaStructs").value.split(",").map(s => s.trim()).filter(Boolean);
      const themeId = $("#mIdeaTheme").value;
      userData.ideas.push({
        id: "u-idea-" + Date.now().toString(36), themeId, title,
        type: $("#mIdeaType").value, assetClass, sector, bucket,
        conviction: $("#mIdeaConv").value, horizon: $("#mIdeaHorizon").value,
        thesis: $("#mIdeaThesis").value.trim() || "Custom idea added from the desk.",
        structures: structs.length ? structs : ["Direct equity"]
      });
      saveUser(userData); rebuildData(); activeThemeId = themeId;
      renderThemes(); renderIdeaPanel(); renderBookTable(); renderBookStats();
      if (selectedClientId) renderClientDetail(clientById(selectedClientId));
      closeModal();
    };
  }

  /* ============================== INIT ============================== */
  function init() {
    rebuildData();
    activeThemeId = DATA.themes[0] && DATA.themes[0].id;
    const d = new Date();
    $("#asOf").textContent = "As of " + d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    $$(".tab").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));
    renderThemes(); renderIdeaPanel();
    $("#addThemeBtn").addEventListener("click", openAddTheme);
    $("#addIdeaBtn").addEventListener("click", openAddIdea);

    renderClientSelect(); renderBookStats(); renderBookTable();
    $$(".book-viewtoggle .seg").forEach(b => b.addEventListener("click", () => setBookView(b.dataset.bookview)));

    renderPretradeForm();
    $("#ptForm").addEventListener("submit", runPretrade);

    $("#overlay").addEventListener("click", () => { closeDrawer(); closeModal(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDrawer(); closeModal(); } });

    const p = new URLSearchParams(location.search);
    const qTab = p.get("tab"), qClient = p.get("client"), qIdea = p.get("idea");
    if (qIdea && ideaById(qIdea)) {
      switchTab("ideas"); activeThemeId = ideaById(qIdea).themeId;
      renderThemes(); renderIdeaPanel(); openIdeaDrawer(qIdea);
    } else if (qTab === "book") {
      switchTab("book"); if (qClient && clientById(qClient)) selectClient(qClient);
    } else if (qTab === "pretrade") { switchTab("pretrade"); }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
