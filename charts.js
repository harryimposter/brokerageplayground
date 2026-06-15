/* ============================================================================
   Brokerage Playground — shared charts + portfolio analytics
   Used by app.js (Pre-Trade) and portfolio.html. Pure functions; no state.
   ========================================================================== */
(function () {
  "use strict";

  const PALETTE = ["#29211A", "#9A7B4F", "#C2A661", "#3F6B4E", "#6E7E8C", "#A9803B", "#8A8073", "#B5651D"];

  /* SVG donut. segments: [{label, value, color}] (value = %). */
  function donut(segments, opts) {
    opts = opts || {};
    const size = opts.size || 132, th = opts.thickness || 22, cx = size / 2, r = (size - th) / 2;
    const C = 2 * Math.PI * r;
    const total = segments.reduce((s, x) => s + (x.value || 0), 0) || 1;
    let off = 0;
    const arcs = segments.map(s => {
      const len = (s.value || 0) / total * C;
      const el = `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${th}" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 ${cx} ${cx})"/>`;
      off += len; return el;
    }).join("");
    const center = opts.center
      ? `<text x="${cx}" y="${cx - 1}" text-anchor="middle" font-family="Libre Baskerville,serif" font-size="${opts.centerSize || 16}" fill="#1C1A17">${opts.center}</text>` +
        (opts.sub ? `<text x="${cx}" y="${cx + 14}" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" letter-spacing="1.2" fill="#8A8073">${opts.sub}</text>` : "")
      : "";
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img">${arcs}${center}</svg>`;
  }

  function legend(segments) {
    return `<div class="don-legend">` + segments.map(s =>
      `<span><i class="don-dot" style="background:${s.color}"></i>${s.label} <b>${Math.round(s.value)}%</b></span>`).join("") + `</div>`;
  }

  /* normalize a split key for bucket lookup (Real_Assets -> Real Assets) */
  function bucketForClass(cls) {
    const map = window.SEED.BUCKET_OF;
    return map[cls] || map[String(cls).replace(/_/g, " ")] || "Growth";
  }

  /* split object -> array of {label,value,color} by asset class */
  function splitSegments(split) {
    return Object.entries(split).map(([k, v], i) => ({
      label: String(k).replace(/_/g, " "), value: v, color: PALETTE[i % PALETTE.length]
    }));
  }

  /* split object -> goal-bucket allocation {Growth,Income,Protection,Liquidity} */
  function bucketAlloc(split) {
    const out = { Growth: 0, Income: 0, Protection: 0, Liquidity: 0 };
    Object.entries(split).forEach(([k, v]) => { out[bucketForClass(k)] += v; });
    return out;
  }

  /* goal-bucket object -> segments in canonical order/colour */
  function bucketSegments(buckets) {
    return window.SEED.GOAL_BUCKETS.map(b => ({ key: b.key, label: b.key, value: buckets[b.key] || 0, color: b.color }));
  }

  /* apply a trade: move `notional`% into `assetClass`, funded from cash then the
     largest non-cash sleeve. Returns { split, funding } (funding describes source). */
  function applyTrade(split, assetClass, notional) {
    const s = {};
    Object.keys(split).forEach(k => { s[k] = split[k]; });
    const cls = findKey(s, assetClass);
    const avail = s.Cash || 0;
    const fromCash = Math.min(notional, avail);
    let remainder = notional - fromCash;
    if (s.Cash != null) s.Cash = +(avail - fromCash).toFixed(2);

    let trimmedFrom = null;
    if (remainder > 0.0001) {
      // trim the largest non-cash sleeve that isn't the one we're adding to
      const cand = Object.keys(s).filter(k => k !== "Cash" && k !== cls)
        .sort((a, b) => s[b] - s[a])[0];
      if (cand) { s[cand] = +Math.max(0, s[cand] - remainder).toFixed(2); trimmedFrom = cand.replace(/_/g, " "); }
    }
    if (cls) s[cls] = +(s[cls] + notional).toFixed(2);
    else s[assetClass] = +notional.toFixed(2);

    const funding = fromCash >= notional
      ? { ok: true, text: `Funded from the ${avail}% cash sleeve.` }
      : { ok: false, text: `Only ${avail}% cash available — the remaining ${(notional - fromCash).toFixed(1)}% would come from trimming ${trimmedFrom || "an existing holding"}.` };
    return { split: s, funding };
  }

  function findKey(obj, label) {
    const norm = String(label).replace(/_/g, " ").toLowerCase();
    return Object.keys(obj).find(k => String(k).replace(/_/g, " ").toLowerCase() === norm) || null;
  }

  /* distance of an allocation from its strategic target (sum of abs diffs) */
  function targetDistance(buckets, target) {
    return Object.keys(target).reduce((d, k) => d + Math.abs((buckets[k] || 0) - target[k]), 0);
  }

  window.BPCharts = {
    PALETTE, donut, legend, splitSegments, bucketAlloc, bucketSegments,
    bucketForClass, applyTrade, targetDistance
  };
})();
