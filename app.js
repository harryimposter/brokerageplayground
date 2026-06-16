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
    ["ideas", "focus", "book", "pretrade"].forEach(t => { $("#view-" + t).hidden = (t !== tab); });
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

    const structs = window.EXPRESSIONS.accordionHTML(idea.structures || [],
      { sector: idea.sector, assetClass: idea.assetClass, title: idea.title });
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
        ${(idea.structures || []).length ? `<div class="drawer-section"><span class="eyebrow">How we'd express it</span><p class="struct-hint">Tap any expression to see exactly how to do it — mechanics, terms, pros &amp; cons.</p>${structs}</div>` : ""}
        <div class="drawer-section">
          <span class="eyebrow">Which books this fits · ${clients.length}</span>
          ${clientCards}
        </div>
      </div>`;
    $("#drawerClose").addEventListener("click", closeDrawer);
    window.EXPRESSIONS.wire($("#drawer"));
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
    const chips = window.EXPRESSIONS.accordionHTML((it.structures || []).slice(0, 3),
      { sector: it.sector, assetClass: it.assetClass, title: it.title },
      { sm: true, blockedFn: (s) => SEED.isOtcOption(s) && it.retailBlocked });
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
    const curBuckets = window.Scanner.bucketAlloc(c.split);
    const nbaKey = nba ? (nba.source === "View" ? nba.ideaId : nba.title) : null;

    const top3 = topFocusIdeasForClient(c, 3);
    const topIdeasHTML = top3.length ? `
      <div class="panel" style="margin-top:18px">
        <div class="panel-head"><h3>Top ideas for ${esc(c.name)}</h3><span class="rec-theme" style="margin-left:auto">today's focus · ranked for this book (conviction × fit)</span></div>
        <div class="panel-body"><div class="focus-tiles">${top3.map(t => focusTileHTML(t.idea, { client: c, fit: t.fit })).join("")}</div></div>
      </div>` : "";

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

      ${topIdeasHTML}

      <button class="see-more-btn" id="seeMoreIdeas" type="button" aria-expanded="false">See more ideas — all ${rec.all.length} recommendations by asset class ›</button>
      <div class="panel" id="moreIdeasPanel" hidden style="margin-top:14px">
        <div class="panel-head"><h3>Recommendations by asset class</h3><span class="rec-theme" style="margin-left:auto">${rec.findings.length} from the book · ${rec.viewItems.length} from Views</span></div>
        <div class="panel-body reco-body">${groupsHTML}</div>
      </div>

      <div class="panel" style="margin-top:18px">
        <div class="panel-head"><h3>Strategic allocation — now vs target</h3></div>
        <div class="panel-body">${BPCharts.goalTargetBar(c.goals.target, curBuckets)}</div>
      </div>

      <details class="goals-explainer" style="margin-top:14px">
        <summary>What do these goals mean? <span class="ge-hint">Growth · Income · Protection · Structured notes · Liquidity</span></summary>
        <div class="ge-body">${BPCharts.goalGlossary()}</div>
      </details>

      <div class="panel" style="margin-top:18px">
        <div class="panel-head"><h3>Holdings</h3></div>
        <div class="panel-body">${positions || '<p class="pos-note" style="padding:12px 0">No positions on file.</p>'}</div>
      </div>
      ${liabilities}`;

    // wire interactions
    window.EXPRESSIONS.wire($("#clientDetail"));
    wireFocusTiles($("#clientDetail"));
    const seeMore = $("#seeMoreIdeas"), morePanel = $("#moreIdeasPanel");
    if (seeMore && morePanel) seeMore.addEventListener("click", () => {
      const open = !morePanel.hidden;
      morePanel.hidden = open;
      seeMore.setAttribute("aria-expanded", String(!open));
      seeMore.classList.toggle("open", !open);
      seeMore.textContent = open
        ? `See more ideas — all ${rec.all.length} recommendations by asset class ›`
        : `Hide the full recommendation list ▲`;
    });
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
      const gap = SEED.GOAL_BUCKETS.map(b => ({ key: b.key, name: b.name || b.key, d: (c.goals.target[b.key] || 0) - (buckets[b.key] || 0) }))
        .sort((a, b) => b.d - a.d)[0];
      const gapTxt = gap && gap.d >= 4 ? `${esc(gap.name)} <b>${gap.d.toFixed(0)}pts under</b>` : `<span class="cov-ontrack">on plan</span>`;
      const cells = cols.map(ac => {
        const v = Math.round(ns[ac] || 0);
        const shade = v === 0 ? 0 : Math.min(1, v / 45);
        return `<div class="cov-cell cov-num" style="background:rgba(154,123,79,${(shade * 0.85).toFixed(2)});color:${shade > 0.55 ? "#fff" : "var(--ink)"}" title="${esc(c.name)} holds ${v}% of the book in ${esc(ac)}">${v ? v + "%" : "·"}</div>`;
      }).join("");
      return `<div class="cov-row" data-client="${esc(c.id)}">
        <div class="cov-cell cov-client">${avatar(c.name)}<span>${esc(c.name)}</span></div>
        ${cells}<div class="cov-cell cov-gap">${gapTxt}</div></div>`;
    }).join("");
    $("#coverageWrap").innerHTML = `
      <div class="cov-grid" style="--cols:${cols.length + 1}">${head}${rows}</div>
      <p class="cov-note"><b>Each number is the % of that client's book held in that asset class</b> (cells shaded darker = a bigger holding; “·” = none). It is a holding weight, <b>not</b> a gap. The <b>Biggest gap</b> column is the one place the book is furthest <b>under its strategic goal target</b>, in percentage points — e.g. “Structured 8pts under” means the book holds 8pts less in structured notes than its plan, so that's the sleeve to build. Click a row to open the client.</p>`;
    $$("#coverageWrap .cov-row[data-client]").forEach(el =>
      el.addEventListener("click", () => { setBookView("list"); selectClient(el.dataset.client); }));
  }

  /* ====================== PRE-TRADE ANALYSIS ========================= */
  const CUSTOM_STRUCTURES = ["Direct equity", "ETF / fund", "Covered calls", "Zero-cost collar",
    "Buffered note", "Phoenix autocall", "Reverse convertible", "Capital-protected note",
    "HALO basket (ACM+)", "Call spread", "Leveraged certificate", "Cash-secured puts"];

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
    const cls = SEED.complexityOf(structure);
    const retailOtc = c.classification === "Retail" && cls === "otc";
    checks.push(retailOtc
      ? { type: "warn", title: "Appropriateness — MiFID Retail blocks this", detail: `${c.name} is <b>${c.mifid}</b>. A <b>${esc(structure)}</b> is an <b>OTC derivative</b> — a Retail client can't trade it without Professional re-classification. Use a structured-product or non-complex alternative (autocall / buffered note, direct equity, ETF, bond ladder).` }
      : cls === "structured"
        ? { type: "ok", title: "Appropriateness — structured product, Retail-eligible", detail: `<b>${esc(structure)}</b> is a <b>packaged security (a note)</b>, so ${c.name} (${c.mifid}) can hold it — unlike an OTC derivative. It's still a complex product, so the appropriateness test applies.` }
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

  /* ====================== TODAY'S FOCUS =============================== */
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function fmtFocusDate(iso) { const p = String(iso).split("-").map(Number); return p[2] + " " + MONTHS[p[1] - 1]; }
  const convTierClass = (t) => "conv-" + String(t).toLowerCase();
  const fitTierClass = (t) => "fit-" + String(t).toLowerCase();
  const srcFlag = (tag) => `<span class="src-flag ${esc(tag)}">${esc(tag)}</span>`;

  function pillarHTML(p) {
    return `<div class="pill-row">
      <span class="pl-k">${esc(p.label)}</span>
      <span class="pl-bar"><span style="width:${(p.score / p.max * 100).toFixed(0)}%"></span></span>
      <span class="pl-sc">${p.score}/${p.max}</span>
      <div class="pl-note">${esc(p.note)}</div>
    </div>`;
  }

  function axisRowHTML(a) {
    return `<div class="ax-row">
      <span class="ax-k">${esc(a.label)}</span>
      <span class="ax-bar"><span style="width:${a.score}%"></span></span>
      <span class="ax-sc">${a.score}</span>
      <span class="ax-w">× ${a.weight}</span>
      <div class="ax-note">${esc(a.note)}</div>
    </div>`;
  }

  function focusClientHTML(idea, flag) {
    const c = flag.client;
    return `<div class="fc-client" data-fclient="${esc(c.id)}">
      <div class="fcl-top">
        ${avatar(c.name)}
        <span class="fcl-name">${esc(c.name)}</span>
        <span class="fcl-meta">${esc(c.classification)} · ${esc(fmtAum(c))}</span>
        <span class="fcl-fit ${fitTierClass(flag.tier)}" title="Client-fit score">${flag.fit}<span class="fcl-fit-lbl">fit</span></span>
      </div>
      <p class="fcl-why">${esc(flag.why)}</p>
      <button type="button" class="fcl-expand">Why ${esc(c.name)}? See the per-axis breakdown ›</button>
      <div class="fcl-axes" hidden>
        ${flag.axes.map(axisRowHTML).join("")}
        <div class="ax-total">Weighted client-fit score <b>${flag.fit}</b> / 100 — <a href="index.html?tab=book&client=${esc(c.id)}" class="ax-open">open ${esc(c.name)} in the Advisor Book ›</a></div>
      </div>
    </div>`;
  }

  function themeTagHTML(idea) {
    if (idea.themeId) {
      const t = themeById(idea.themeId);
      return `<span class="fc-tag theme" data-gotheme="${esc(idea.themeId)}" role="button" tabindex="0">On theme · ${esc(t ? t.name : "House view")} ›</span>`;
    }
    return `<span class="fc-tag offtheme">Off-theme</span>`;
  }

  function earningsIntelHTML(idea) {
    const e = idea.earnings; if (!e) return "";
    const vsCls = /rich/.test(e.impliedVsHist) ? "rich" : /cheap/.test(e.impliedVsHist) ? "cheap" : "";
    return `<div class="fc-intel">
      <div class="intel-cell"><div class="ic-k">Reports</div><div class="ic-v">${fmtFocusDate(e.reportDate)} · ${esc(e.reportWhen)}</div></div>
      <div class="intel-cell"><div class="ic-k">Implied move ${srcFlag(e.impliedSource)}</div><div class="ic-v">±${e.impliedMovePct}%</div></div>
      <div class="intel-cell"><div class="ic-k">Historical avg ${srcFlag(e.historicalSource)}</div><div class="ic-v">±${e.historicalAvgMovePct}%</div></div>
      <div class="intel-cell"><div class="ic-k">Implied vs history</div><div class="ic-v ${vsCls}">${esc(e.impliedVsHist)}</div></div>
    </div>
    <div class="fc-watch"><b>What to watch:</b> ${esc(e.watch)}</div>`;
  }

  function macroIntelHTML(idea) {
    const m = idea.macro; if (!m) return "";
    return `<div class="fc-macro">
      <div class="fm-top"><span class="fm-metric">${esc(m.metric)}</span> ${srcFlag(m.source)}</div>
      <div class="fm-detail">${esc(m.detail)}</div>
      <div class="fc-watch"><b>What to watch:</b> ${esc(m.watch)}</div>
    </div>`;
  }

  function factsHTML(idea) {
    if (!(idea.facts || []).length) return "";
    return `<details class="fc-facts"><summary>Evidence &amp; sources (${idea.facts.length})</summary>
      <ul class="fcf-list">${idea.facts.map(f => `<li>${esc(f.text)} ${srcFlag(f.tag)}</li>`).join("")}</ul>
      <div class="fcf-src">Sources: ${(idea.sources || []).map(s => esc(s.name)).join(" · ")}</div>
    </details>`;
  }

  let FOCUS_BY_ID = {};
  const fitTier = (fit) => fit >= 68 ? "Strong" : fit >= 50 ? "Good" : "Marginal";

  /* compact tile — just the essentials; clicking opens the full side drawer */
  function focusTileHTML(idea, opts) {
    opts = opts || {};
    const conv = idea.conviction;
    const theme = idea.themeId ? themeById(idea.themeId) : null;
    const rightChip = opts.client
      ? `<span class="fcl-fit ${fitTierClass(fitTier(opts.fit))}" title="Client-fit score for ${esc(opts.client.name)}">${opts.fit}<span class="fcl-fit-lbl">fit</span></span>`
      : (() => { const n = window.MAPPING.flagClients(idea).length; return `<span class="ft-count">${n} book${n === 1 ? "" : "s"}</span>`; })();
    return `<button type="button" class="focus-tile" data-ftile="${esc(idea.id)}"${opts.client ? ` data-fclient="${esc(opts.client.id)}"` : ""}>
      <div class="ft-top">
        <span class="ft-conv ${convTierClass(conv.tier)}" title="Conviction ${conv.score}/100 (${esc(conv.tier)})">${conv.score}</span>
        <div class="ft-id">
          <div class="ft-name">${esc(idea.name)}${idea.ticker ? ` <span class="ft-tick">${esc(idea.ticker)}</span>` : ""}</div>
          <div class="ft-headline">${esc(idea.headline)}</div>
        </div>
      </div>
      <div class="ft-tags">
        <span class="fc-tag ${idea.kind === "earnings" ? "earn" : "macro"}">${idea.kind === "earnings" ? "Earnings" : "Ex-earnings"}</span>
        ${idea.themeId ? `<span class="fc-tag theme nolink">${esc(theme ? theme.name : "House view")}</span>` : `<span class="fc-tag offtheme">Off-theme</span>`}
        ${rightChip}
      </div>
    </button>`;
  }

  /* the full detail (everything from the old long card) — rendered into the drawer */
  function focusDrawerInnerHTML(idea) {
    const conv = idea.conviction;
    const flags = window.MAPPING.flagClients(idea);
    const intel = idea.kind === "earnings" ? earningsIntelHTML(idea) : macroIntelHTML(idea);
    return `
      <div class="fc-tags">
        ${themeTagHTML(idea)}
        <span class="fc-tag ${idea.kind === "earnings" ? "earn" : "macro"}">${idea.kind === "earnings" ? "Earnings" : "Ex-earnings"}</span>
        <span class="fc-tag sector">${esc(idea.sector)}</span>
      </div>
      ${idea.offThemeWhy ? `<div class="fc-offwhy"><b>Off-theme —</b> ${esc(idea.offThemeWhy)}</div>` : ""}

      <div class="drawer-section">
        <span class="eyebrow">The idea</span>
        <p class="fc-thesis">${esc(idea.thesis)}</p>
      </div>

      <div class="drawer-section">
        <span class="eyebrow">Conviction ${conv.score}/100 · ${esc(conv.tier)}</span>
        <div class="fc-conv-detail-open">
          <div class="fcd-head">Four pillars (1–5 each):</div>
          ${conv.pillars.map(pillarHTML).join("")}
        </div>
      </div>

      ${intel ? `<div class="drawer-section"><span class="eyebrow">${idea.kind === "earnings" ? "Earnings intelligence" : "The setup"}</span>${intel}</div>` : ""}

      <div class="drawer-section">
        <span class="eyebrow">How we'd express it — tap any to see exactly how</span>
        ${window.EXPRESSIONS.accordionHTML(idea.structures || [], { sector: idea.sector, assetClass: idea.assetClass, title: idea.name })}
      </div>

      <div class="drawer-section">
        <span class="eyebrow">Flagged to ${flags.length} client${flags.length === 1 ? "" : "s"} · client-fit score</span>
        <div class="fc-clients">${flags.length ? flags.map(f => focusClientHTML(idea, f)).join("") : `<p class="fcl-why">No client in the book is a strong fit right now (scored live against the Advisor Book).</p>`}</div>
      </div>

      <div class="drawer-section">${factsHTML(idea)}</div>`;
  }

  /* open the full focus detail in the shared side drawer (same component as Views) */
  function openFocusDrawer(ideaOrId) {
    const idea = typeof ideaOrId === "string" ? FOCUS_BY_ID[ideaOrId] : ideaOrId;
    if (!idea) return;
    $("#drawer").innerHTML = `
      <div class="drawer-head">
        <button class="drawer-close" id="drawerClose" aria-label="Close">×</button>
        <span class="eyebrow">${idea.kind === "earnings" ? "Earnings idea" : "Ex-earnings idea"} · ${esc(idea.sector)}</span>
        <h2>${esc(idea.name)}${idea.ticker ? ` <span class="fc-tick">${esc(idea.ticker)}</span>` : ""}</h2>
        <p class="drawer-sub">${esc(idea.headline)}</p>
      </div>
      <div class="drawer-body">${focusDrawerInnerHTML(idea)}</div>`;
    const root = $("#drawer");
    $("#drawerClose").addEventListener("click", closeDrawer);
    window.EXPRESSIONS.wire(root);
    $$(".fcl-expand", root).forEach(btn => btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const ax = btn.closest(".fc-client").querySelector(".fcl-axes");
      if (ax) { ax.hidden = !ax.hidden; btn.classList.toggle("open", !ax.hidden); }
    }));
    $$(".fc-tag.theme[data-gotheme]", root).forEach(el => el.addEventListener("click", () => {
      const id = el.dataset.gotheme; closeDrawer(); activeThemeId = id; switchTab("ideas"); renderThemes(); renderIdeaPanel();
    }));
    $("#overlay").classList.add("open");
    root.classList.add("open");
    root.setAttribute("aria-hidden", "false");
  }

  /* rank the daily focus ideas for one client by a conviction × client-fit blend */
  function topFocusIdeasForClient(client, n) {
    const TF = window.TODAY_FOCUS;
    if (!TF) return [];
    return (TF.earnings || []).concat(TF.exEarnings || []).map(idea => {
      const fit = window.MAPPING.scoreIdeaForClient(idea, client).fit;
      const conv = (idea.conviction && idea.conviction.score) || 0;
      return { idea, fit, conv, blend: Math.round(0.45 * conv + 0.55 * fit) };
    }).sort((a, b) => b.blend - a.blend).slice(0, n);
  }

  function renderFocus() {
    const TF = window.TODAY_FOCUS;
    if (!TF) return;
    FOCUS_BY_ID = {};
    (TF.earnings || []).concat(TF.exEarnings || []).forEach(i => { FOCUS_BY_ID[i.id] = i; });
    $("#focusAsOf").textContent = "as of " + fmtFocusDate(TF.asOf) + " " + TF.asOf.slice(0, 4);
    $("#focusSweepNote").innerHTML =
      `<span class="fsn-k">Market sweep</span> ${esc(TF.sweep.sources.join(" · "))}. <span class="fsn-rule">${esc(TF.sweep.rule)}</span>`;
    $("#focusEarnings").innerHTML = (TF.earnings || []).map(i => focusTileHTML(i)).join("");
    $("#focusExEarnings").innerHTML = (TF.exEarnings || []).map(i => focusTileHTML(i)).join("");
    wireFocusTiles($("#view-focus"));
  }

  /* wire compact tiles (Today's Focus + Advisor-Book top-3) -> open the side drawer */
  function wireFocusTiles(root) {
    if (!root) return;
    $$(".focus-tile[data-ftile]", root).forEach(btn =>
      btn.addEventListener("click", () => openFocusDrawer(btn.dataset.ftile)));
  }

  /* ----------------------- rubric / methodology modal ----------------- */
  const AXIS_DESC = {
    holdings: "Does the book own the underlying name, or at least the sector? Owning the name scores highest.",
    gap: "Is the book under its strategic target for the goal this idea fills (e.g. under its Income or Structured-notes target)?",
    mandate: "Can the client trade the expressions (MiFID tier vs OTC), and does the idea suit a growth / income / preservation mandate?",
    concentration: "Is the book heavily concentrated in this name — making the idea urgent (protect / monetise) rather than optional?",
    houseview: "Does the client already sit on the Solutions Views theme behind the idea? Off-theme ideas score lower here."
  };
  function openRubric() {
    const R = (window.TODAY_FOCUS || {}).convictionRubric || { max_per_pillar: 5, pillars: [], tiers: [] };
    openModal(`
      <div class="modal-head"><span class="eyebrow">Methodology</span><h2>How an idea is scored</h2></div>
      <div class="modal-body">
        <h3 class="rub-h">1 · Conviction score — “how good is the idea”</h3>
        <p class="rub-p">Four pillars, each scored 1–${R.max_per_pillar}; the total is shown out of 100. ${R.tiers.map(t => `<b>${esc(t.key)}</b> ≥ ${t.min}`).join(" · ")}.</p>
        <div class="rub-list">${R.pillars.map(p => `<div class="rub-item"><div class="ri-k">${esc(p.label)}</div><div class="ri-d">${esc(p.desc)}</div></div>`).join("")}</div>
        <h3 class="rub-h">2 · Client-fit score — “how right for THIS client”</h3>
        <p class="rub-p">Separate from conviction. Each idea is scored against every client across five weighted axes; the weighted sum is the fit score (0–100), and you can open the per-axis breakdown on any flagged client.</p>
        <div class="rub-list">${window.MAPPING.AXES.map(a => `<div class="rub-item"><div class="ri-k">${esc(a.label)} <span class="ri-w">weight ${a.weight}</span></div><div class="ri-d">${esc(AXIS_DESC[a.key] || "")}</div></div>`).join("")}</div>
      </div>
      <div class="modal-foot"><button class="btn btn-primary" id="rubClose">Got it</button></div>`);
    $("#rubClose").onclick = closeModal;
  }

  /* ----------------------- draft a view (lighter add) ----------------- */
  const DRAFT_RULES = [
    { kw: ["ai", "semiconductor", "semis", "chip", "gpu", "compute", "memory", "hbm", "nvidia", "datacenter", "data center", "software"], themeId: "ai", sector: "Technology", assetClass: "Equity", bucket: "Growth", structs: ["Direct equity", "Structured note", "Index core"] },
    { kw: ["power", "grid", "electric", "utility", "utilities", "nuclear", "smr"], themeId: "power", sector: "Utilities", assetClass: "Equity", bucket: "Income", structs: ["Utility basket", "Thematic basket"] },
    { kw: ["bond", "duration", "yield", "treasur", "rates", "fixed income"], themeId: "duration", sector: "Rates", assetClass: "Fixed Income", bucket: "Income", structs: ["Extend duration", "Bond ladder", "Govt / IG bonds"] },
    { kw: ["gold", "bullion", "debasement"], themeId: "gold", sector: "Gold", assetClass: "Commodity", bucket: "Protection", structs: ["Physical / ETC", "Gold accumulator"] },
    { kw: ["infrastructure", "infra", "toll", "midstream", "real asset"], themeId: "realassets", sector: "Infrastructure", assetClass: "Real Assets", bucket: "Income", structs: ["Infrastructure fund", "Listed infrastructure"] },
    { kw: ["health", "glp", "pharma", "medtech", "biotech", "device"], themeId: "health", sector: "Healthcare", assetClass: "Equity", bucket: "Growth", structs: ["Healthcare basket", "Direct equity"] },
    { kw: ["protect", "hedge", "downside", "collar", "buffer"], themeId: "resilience", sector: "Broad", assetClass: "Multi-Asset", bucket: "Protection", structs: ["Buffered note", "Zero-cost collar"] },
    { kw: ["value", "international", "cyclical", "quality", "broaden", "small cap"], themeId: "broaden", sector: "Broad", assetClass: "Equity", bucket: "Growth", structs: ["Quality basket", "Equal-weight index"] },
    { kw: ["coupon", "autocall", "structured note", "income note"], themeId: "structured", sector: "Broad", assetClass: "Structured", bucket: "Structured", structs: ["Phoenix autocall", "Reverse convertible", "Buffered note"] },
    { kw: ["copper", "materials", "mining", "rare earth", "lithium"], themeId: null, sector: "Materials", assetClass: "Equity", bucket: "Growth", structs: ["Thematic basket", "Direct equity"] },
    { kw: ["energy", "oil", "gas", "crude", "brent"], themeId: null, sector: "Energy", assetClass: "Equity", bucket: "Income", structs: ["Direct equity", "Call overwrite", "Thematic basket"] },
    { kw: ["real estate", "reit", "property", "housing"], themeId: "realassets", sector: "Real Estate", assetClass: "Real Assets", bucket: "Income", structs: ["REIT basket", "Private real estate"] },
    { kw: ["crypto", "bitcoin", "digital asset"], themeId: null, sector: "Crypto", assetClass: "Alternatives", bucket: "Protection", structs: ["Direct equity", "Structured note"] }
  ];
  function draftFromThesis(thesis) {
    const s = String(thesis || "").toLowerCase();
    for (const r of DRAFT_RULES) { if (r.kw.some(k => s.includes(k))) return r; }
    return { themeId: null, sector: "Broad", assetClass: "Equity", bucket: "Growth", structs: ["Direct equity", "Structured note", "Index core"] };
  }
  function titleFromThesis(thesis) {
    let t = String(thesis || "").trim().replace(/\s+/g, " ");
    if (t.length > 64) t = t.slice(0, 61) + "…";
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function openDraftView(prefill) {
    const themeOpts = (extraId) => DATA.themes.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
    openModal(`
      <div class="modal-head"><span class="eyebrow">Draft a view</span><h2>From a one-line thesis</h2></div>
      <div class="modal-body">
        <div class="field"><label class="field-label">Your thesis (one line)</label>
          <textarea id="dvThesis" placeholder="e.g. copper supply deficit into the energy transition">${esc(prefill || "")}</textarea></div>
        <button class="btn btn-ghost" id="dvDraft" style="margin-bottom:6px">✎ Draft it for me</button>
        <div id="dvResult" class="dv-result"><p class="hint">The desk will suggest a theme, asset class, expressions and the client books it would fit — all editable before you save.</p></div>
      </div>
      <div class="modal-foot"><button class="btn btn-ghost" id="dvCancel">Cancel</button><button class="btn btn-primary" id="dvSave" disabled>Add to Solutions Views</button></div>`);
    $("#dvCancel").onclick = closeModal;
    const doDraft = () => {
      const thesis = $("#dvThesis").value.trim();
      if (!thesis) { $("#dvThesis").focus(); return; }
      const d = draftFromThesis(thesis);
      const synth = { ticker: "", name: titleFromThesis(thesis), sector: d.sector, assetClass: d.assetClass, bucket: d.bucket, structures: d.structs, themeId: d.themeId };
      const flags = window.MAPPING.flagClients(synth, { min: 45, max: 5 });
      const acOpts = ["Equity", "Fixed Income", "Commodity", "Real Assets", "Alternatives", "Multi-Asset", "Structured"]
        .map(a => `<option ${a === d.assetClass ? "selected" : ""}>${a}</option>`).join("");
      const secOpts = ["Technology", "Healthcare", "Financials", "Energy", "Utilities", "Industrials", "Materials", "Consumer", "Real Estate", "Infrastructure", "Rates", "Credit", "Gold", "Crypto", "FX", "Broad"]
        .map(x => `<option ${x === d.sector ? "selected" : ""}>${x}</option>`).join("");
      const themeSel = DATA.themes.map(t => `<option value="${esc(t.id)}" ${t.id === d.themeId ? "selected" : ""}>${esc(t.name)}</option>`).join("");
      $("#dvResult").innerHTML = `
        <div class="dv-draft">
          <div class="dv-eyebrow">Suggested — edit anything</div>
          <div class="field"><label class="field-label">Idea title</label><input id="dvTitle" value="${esc(titleFromThesis(thesis))}" /></div>
          <div class="field" style="display:flex;gap:10px">
            <div style="flex:1"><label class="field-label">Theme</label><select id="dvTheme">${themeSel}</select></div>
            <div style="flex:1"><label class="field-label">Conviction</label><select id="dvConv"><option>High</option><option selected>Medium-High</option><option>Medium</option></select></div>
          </div>
          <div class="field" style="display:flex;gap:10px">
            <div style="flex:1"><label class="field-label">Asset class</label><select id="dvAC">${acOpts}</select></div>
            <div style="flex:1"><label class="field-label">Sector</label><select id="dvSector">${secOpts}</select></div>
          </div>
          <div class="field"><label class="field-label">Expressions (comma-separated)</label><input id="dvStructs" value="${esc(d.structs.join(", "))}" /></div>
          <div class="dv-eyebrow">Candidate client books — scored live</div>
          <div class="dv-clients">${flags.length ? flags.map(f => `<div class="dv-client"><span class="dv-c-name">${avatar(f.client.name)} ${esc(f.client.name)}</span><span class="fcl-fit ${fitTierClass(f.tier)}">${f.fit}</span><span class="dv-c-why">${esc(f.why)}</span></div>`).join("") : `<p class="hint">No strong client fit yet — adjust the sector / bucket above.</p>`}</div>
        </div>`;
      $("#dvSave").disabled = false;
    };
    $("#dvDraft").onclick = doDraft;
    $("#dvSave").onclick = () => {
      const title = ($("#dvTitle") || {}).value;
      if (!title || !title.trim()) return;
      const assetClass = $("#dvAC").value, sector = $("#dvSector").value;
      const bucket = SEED.SECTOR_BUCKET[sector] || SEED.ASSET_BUCKET[assetClass] || "Growth";
      const structs = $("#dvStructs").value.split(",").map(s => s.trim()).filter(Boolean);
      const themeId = $("#dvTheme").value;
      userData.ideas.push({
        id: "u-idea-" + Date.now().toString(36), themeId, title: title.trim(),
        type: "Thematic", assetClass, sector, bucket,
        conviction: $("#dvConv").value, horizon: "Strategic",
        thesis: $("#dvThesis").value.trim() || "Drafted from a one-line thesis.",
        structures: structs.length ? structs : ["Direct equity"]
      });
      saveUser(userData); rebuildData(); activeThemeId = themeId;
      switchTab("ideas"); renderThemes(); renderIdeaPanel(); renderBookTable(); renderBookStats();
      closeModal();
    };
    if (prefill && prefill.trim()) doDraft();
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

    renderFocus();
    $("#rubricBtn").addEventListener("click", openRubric);
    $("#draftGoBtn").addEventListener("click", () => openDraftView($("#draftThesis").value));
    $("#draftThesis").addEventListener("keydown", e => { if (e.key === "Enter") openDraftView($("#draftThesis").value); });

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
    else if (qTab === "ideas") { switchTab("ideas"); }
    else { switchTab("focus"); }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
