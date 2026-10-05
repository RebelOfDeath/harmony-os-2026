/* =====================================================================
   Scrollytelling engine.
   One master GSAP timeline holds every visual change. Each story step
   (<section class="step" data-beat="...">) maps to a label on it. When
   a step becomes active (by scrolling, or by a clicker/keyboard), the
   timeline tweens to that label, forwards or backwards.
   ===================================================================== */
gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const SVGNS = "http://www.w3.org/2000/svg";
const C = {
  black: "#000000", mid: "#7D7D7D", light: "#CDCDCD", yellow: "#FCF84A", gold: "#FDB60D",
  orange: "#FC801D", red: "#FE2857", dpink: "#DD1265", pink: "#FF318C", lpink: "#FF45ED",
  purple: "#AF1DF5", violet: "#6B57FF", blue: "#087CFA", cyan: "#07C3F2", teal: "#21D789", green: "#3DEA62",
};

/* ------------------------------ canvas fit ------------------------------ */
function fit() {
  const u = Math.min(innerWidth / 1600, innerHeight / 900);
  root.style.setProperty("--u", u);
  root.style.setProperty("--ox", (innerWidth - 1600 * u) / 2 + "px");
}
fit();
addEventListener("resize", () => { fit(); ScrollTrigger.refresh(); });

/* seeded PRNG so schematic dots are identical on every run */
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
function svg(tag, attrs = {}, parent) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(el);
  return el;
}
function text(parent, x, y, str, attrs = {}) {
  const t = svg("text", { x, y, fill: "#CDCDCD", ...attrs }, parent);
  t.textContent = str;
  return t;
}

function main() {
const initialHash = location.hash.slice(1);
/* ------------------------------ camera presets ------------------------------ */
// The laptop display sits at (576,350) with size 448x252 in world units.
const DISP = { x: 576, y: 350, w: 448 };
function frameDisplay(tx, ty, tw) {
  const s = tw / DISP.w;
  return { x: tx - DISP.x * s, y: ty - DISP.y * s, scale: s };
}
const CAM = {
  worldR: { x: 330, y: 95, scale: 0.78 },
  worldC: { x: 176, y: 95, scale: 0.78 },
  screenR: frameDisplay(560, 168.75, 1000),
  c4m: { x: 320, y: 230, scale: 0.5 },
};

/* ------------------------------ build generated content ------------------------------ */

// Ghost text for suggestion lines: same text as the real line, rendered grey.
$$(".ln.sug").forEach(ln => {
  const real = $(".real", ln);
  const g = document.createElement("span");
  g.className = "ghost";
  g.textContent = real.textContent;
  ln.appendChild(g);
});

// Typed lines: measure their natural width (layout px, unaffected by transforms).
const typed = {};
$$(".type").forEach(el => {
  el.style.width = "auto";
  typed[el.id] = { w: el.offsetWidth, n: el.textContent.length };
  el.style.width = "0px";
});

// Tree markers for agent edits.
$("#t-test .mk").textContent = "A"; $("#t-test .mk").style.color = "#5FB865";
$("#t-stats .mk").textContent = "M"; $("#t-stats .mk").style.color = "#6CA4F8";

// World drawables: normalise path length so we can draw them on.
$$("#world .draw").forEach(el => el.setAttribute("pathLength", "1"));

/* --- 273 benchmarks waffle (21 x 13 = 273) --- */
const BENCH = [
  { name: "Code generation", n: 94, pct: "34.4%", c: C.pink },
  { name: "Code understanding", n: 48, pct: "17.7%", c: C.blue },
  { name: "Repair & maintenance", n: 42, pct: "15.4%", c: C.violet },
  { name: "All other tasks", n: 89, pct: "32.5%", c: "#4a4a4a" },
];
{
  const g = $("#bench-svg");
  let k = 0;
  BENCH.forEach((cat, ci) => {
    for (let j = 0; j < cat.n; j++, k++) {
      const r = Math.floor(k / 21), c = k % 21;
      const sq = svg("rect", { x: c * 30 + 3, y: r * 30 + 3, width: 24, height: 24, rx: 4, fill: "#2a2a2a", class: "sq cat" + ci }, g);
      svg("title", {}, sq).textContent = cat.name;
    }
  });
  $("#bench-legend").innerHTML = BENCH.map(b =>
    `<span><i style="background:${b.c}"></i><div><b>${b.n}</b> ${b.name}<small style="color:#7D7D7D">${b.pct}</small></div></span>`).join("");
}

/* --- HumanEval vs HumanEvalNext dumbbells (TSE 2025, Table XXIII) --- */
const HE = [
  ["Nxcode-CQ", 87.23, 51.22], ["CodeQwen1.5", 87.20, 10.98], ["deepseek-coder", 80.22, 58.54],
  ["starcoder2", 77.40, 43.29], ["Magicoder", 76.80, 53.66], ["Artigenz-Coder", 75.60, 53.66],
  ["starchat2", 73.80, 43.29], ["codegemma", 60.40, 41.46], ["CodeLlama", 50.60, 29.88], ["stable-code", 30.72, 1.83],
];
{
  const g = $("#he-svg"), X = v => 190 + v * 6.7, top = 50, rh = 45;
  [0, 25, 50, 75, 100].forEach(v => {
    svg("line", { x1: X(v), x2: X(v), y1: top - 16, y2: top + rh * 10 - 10, stroke: "#262626", "stroke-width": 1 }, g);
    text(g, X(v), top - 24, v, { "text-anchor": "middle", "font-size": 14, fill: "#7D7D7D" });
  });
  HE.forEach(([name, a, b], i) => {
    const y = top + i * rh + 10;
    text(g, 176, y + 5, name, { "text-anchor": "end", "font-size": 17, fill: "#CDCDCD", "font-family": "JBMono" });
    svg("line", { x1: X(a), x2: X(a), y1: y, y2: y, stroke: "#555", "stroke-width": 2.5, class: "he-link", "data-to": X(b) }, g);
    const ca = svg("circle", { cx: X(a), cy: y, r: 9, fill: C.mid, stroke: "#0a0a0e", "stroke-width": 2, class: "he-a" }, g);
    svg("title", {}, ca).textContent = `${name}, HumanEval ${a}`;
    const cb = svg("circle", { cx: X(a), cy: y, r: 9, fill: C.pink, stroke: "#0a0a0e", "stroke-width": 2, class: "he-b", "data-to": X(b) }, g);
    svg("title", {}, cb).textContent = `${name}, HumanEvalNext ${b}`;
    if (name === "CodeQwen1.5") text(g, X(b) + 12, y - 14, "87.2 → 11.0", { "font-size": 15, fill: "#F2F2F2", class: "he-lab" });
    if (name === "deepseek-coder") text(g, X(b) - 18, y + 5, "best on HumanEvalNext: 58.5", { "text-anchor": "end", "font-size": 15, fill: "#F2F2F2", class: "he-lab" });
  });
  text(g, X(50), top + rh * 10 + 22, "pass@1 (%)", { "text-anchor": "middle", "font-size": 14, fill: "#7D7D7D" });
}

/* --- Reliability diagram (schematic) --- */
{
  const g = $("#rel-svg"), X = v => 60 + v * 440, Y = v => 460 - v * 440;
  svg("rect", { x: 60, y: 20, width: 440, height: 440, fill: "none", stroke: "#2a2a2a" }, g);
  [0.25, 0.5, 0.75].forEach(v => {
    svg("line", { x1: X(v), x2: X(v), y1: 20, y2: 460, stroke: "#1c1c1c" }, g);
    svg("line", { x1: 60, x2: 500, y1: Y(v), y2: Y(v), stroke: "#1c1c1c" }, g);
  });
  [0, 0.5, 1].forEach(v => {
    text(g, X(v), 484, v, { "text-anchor": "middle", "font-size": 14, fill: "#7D7D7D" });
    text(g, 48, Y(v) + 5, v, { "text-anchor": "end", "font-size": 14, fill: "#7D7D7D" });
  });
  text(g, 280, 510, "model confidence", { "text-anchor": "middle", "font-size": 16 });
  text(g, 18, 240, "observed acceptance", { "text-anchor": "middle", "font-size": 16, transform: "rotate(-90 18 240)" });
  svg("path", { d: `M${X(0)} ${Y(0)} L${X(1)} ${Y(1)}`, stroke: C.mid, "stroke-width": 2, "stroke-dasharray": "6 6", fill: "none", class: "rel-diag" }, g);
  const raw = [[0.1, 0.04], [0.3, 0.12], [0.5, 0.2], [0.7, 0.3], [0.9, 0.42]];
  const cal = [[0.1, 0.11], [0.3, 0.28], [0.5, 0.47], [0.7, 0.66], [0.9, 0.84]];
  const line = (pts, col, cls) => {
    svg("path", { d: "M" + pts.map(([a, b]) => `${X(a)} ${Y(b)}`).join(" L"), stroke: col, "stroke-width": 3, fill: "none", pathLength: 1, class: cls }, g);
    pts.forEach(([a, b]) => svg("circle", { cx: X(a), cy: Y(b), r: 7, fill: col, stroke: "#0a0a0e", "stroke-width": 2, class: cls + "-pt" }, g));
  };
  line(raw, C.red, "rel-raw");
  line(cal, C.blue, "rel-cal");
  text(g, X(0.62), Y(0.2), "overconfident", { "font-size": 15, fill: "#FE2857", class: "rel-raw-pt" });
}

/* --- Brier skill score bars (FSE 2026, Tables 4 and 5) --- */
{
  const g = $("#bss-svg"), zero = 210, k = 6000; // px per unit BSS
  const Y = v => zero - v * k;
  [-0.02, -0.01, 0, 0.01, 0.02, 0.03].forEach(v => {
    svg("line", { x1: 90, x2: 940, y1: Y(v), y2: Y(v), stroke: v === 0 ? "#7D7D7D" : "#1f1f1f", "stroke-width": v === 0 ? 1.5 : 1 }, g);
    text(g, 80, Y(v) + 5, (v > 0 ? "+" : "") + v.toFixed(2), { "text-anchor": "end", "font-size": 14, fill: "#7D7D7D", "font-family": "JBMono" });
  });
  svg("line", { x1: 525, x2: 525, y1: 20, y2: 400, stroke: "#2a2a2a", "stroke-dasharray": "4 6" }, g);
  const bars = [
    [170, -0.015, "General", C.mid], [300, 0.020, "Per person", C.blue], [430, 0.013, "Per person\n× project", C.blue],
    [620, 0.009, "Low", C.blue], [750, 0.016, "Average", C.blue], [880, 0.024, "High", C.blue],
  ];
  bars.forEach(([x, v, lab, col]) => {
    const h = Math.abs(v * k), y = v >= 0 ? zero - h : zero;
    const r = svg("rect", { x: x - 40, y: zero, width: 80, height: 0, rx: 4, fill: col, class: "bss-bar", "data-y": y, "data-h": h }, g);
    svg("title", {}, r).textContent = `${lab.replace("\n", " ")}: BSS ${v}`;
    text(g, x, v >= 0 ? y - 12 : y + h + 24, (v > 0 ? "+" : "") + v.toFixed(3), { "text-anchor": "middle", "font-size": 18, fill: "#F2F2F2", "font-weight": 600, class: "bss-val", "font-family": "JBMono" });
    lab.split("\n").forEach((l, i) => text(g, x, 364 + i * 20, l, { "text-anchor": "middle", "font-size": 16, fill: "#CDCDCD" }));
  });
  text(g, 300, 430, "which calibrator", { "text-anchor": "middle", "font-size": 15, fill: "#7D7D7D", "font-family": "JBMono" });
  text(g, 750, 430, "per person, by user activity", { "text-anchor": "middle", "font-size": 15, fill: "#7D7D7D", "font-family": "JBMono" });
}

/* --- Per-developer acceptance spread --- */
{
  const g = $("#spread-svg"), X = v => 40 + v * 33.6; // 0..25%
  svg("line", { x1: X(0), x2: X(25), y1: 230, y2: 230, stroke: "#555" }, g);
  [0, 5, 10, 15, 20, 25].forEach(v => {
    svg("line", { x1: X(v), x2: X(v), y1: 230, y2: 238, stroke: "#555" }, g);
    text(g, X(v), 258, v + "%", { "text-anchor": "middle", "font-size": 14, fill: "#7D7D7D" });
  });
  text(g, X(12.5), 290, "share of a developer's suggestions they accept", { "text-anchor": "middle", "font-size": 15, fill: "#7D7D7D" });
  svg("rect", { x: X(2.38), y: 120, width: 0, height: 90, rx: 10, fill: "rgba(255,49,140,.13)", stroke: C.pink, "stroke-width": 1.5, class: "sp-band", "data-w": X(21.21) - X(2.38) }, g);
  text(g, X(2.38), 108, "2.4%", { "text-anchor": "middle", "font-size": 16, fill: "#F2F2F2", class: "sp-lab" });
  text(g, X(21.21), 108, "21.2%", { "text-anchor": "middle", "font-size": 16, fill: "#F2F2F2", class: "sp-lab" });
  text(g, X(11.8), 30, "middle 90% of developers", { "text-anchor": "middle", "font-size": 18, fill: "#FF318C", class: "sp-lab" });
  const r = rng(7);
  for (let i = 0; i < 90; i++) {
    // right-skewed schematic spread inside the band
    const v = 2.6 + Math.pow(r(), 1.7) * 18.4;
    svg("circle", { cx: X(v), cy: 132 + r() * 66, r: 4.5, fill: C.light, opacity: 0, class: "sp-dot" }, g);
  }
  svg("line", { x1: X(9.72), x2: X(9.72), y1: 92, y2: 230, stroke: C.gold, "stroke-width": 2.5, class: "sp-mark", opacity: 0 }, g);
  text(g, X(9.72) + 8, 88, "overall 9.72%", { "font-size": 15, fill: C.gold, class: "sp-mark", opacity: 0 });
}

/* --- Rank reshuffle (TSE 2025, Table XXIII) --- */
{
  const g = $("#rank-svg"), xL = 330, xR = 570, Y = r => 62 + r * 50;
  const rankOf = (score, key) => 1 + HE.filter(d => d[key] > score).length; // ties share a rank
  const next = [...HE].sort((a, b) => b[2] - a[2]);
  text(g, xL, 24, "HumanEval", { "text-anchor": "middle", "font-size": 15, fill: "#7D7D7D", "font-family": "JBMono" });
  text(g, xR, 24, "HumanEvalNext", { "text-anchor": "middle", "font-size": 15, fill: "#7D7D7D", "font-family": "JBMono" });
  HE.forEach(([name, a, b], i) => {
    const j = next.findIndex(d => d[0] === name);
    const hi = name === "CodeQwen1.5" ? C.pink : name === "deepseek-coder" ? C.blue : null;
    const col = hi || "#4a4a4a", ink = hi ? "#F2F2F2" : "#9a9a9a", w = hi ? 600 : 400;
    svg("path", { d: `M${xL} ${Y(i)} C${xL + 120} ${Y(i)} ${xR - 120} ${Y(j)} ${xR} ${Y(j)}`, stroke: col, "stroke-width": hi ? 3.5 : 2, fill: "none", pathLength: 1, class: "rk-line" + (hi ? " hi" : "") }, g);
    svg("circle", { cx: xL, cy: Y(i), r: 7, fill: col, stroke: "#0a0a0e", "stroke-width": 2, class: "rk-l" }, g);
    svg("circle", { cx: xR, cy: Y(j), r: 7, fill: col, stroke: "#0a0a0e", "stroke-width": 2, class: "rk-r" }, g);
    text(g, xL - 18, Y(i) + 6, `${name}  #${rankOf(a, 1)}`, { "text-anchor": "end", "font-size": 17, fill: ink, "font-weight": w, "font-family": "JBMono", class: "rk-l" });
    text(g, xR + 18, Y(j) + 6, `#${rankOf(b, 2)}  ${name}`, { "font-size": 17, fill: ink, "font-weight": w, "font-family": "JBMono", class: "rk-r" });
  });
}

/* --- Personalization experiments (Table II, nominal, not matched) --- */
{
  const g = $("#exp-svg"), X = v => 330 + (v - 15) * 60, top = 44, rh = 46;
  const rows = [
    ["Deployed CatBoost", 17.3, 17.3, "17.3%", "base"],
    ["CatBoost + history, k = 1 to 5", 20.5, 22.6, "20.5 to 22.6%"],
    ["Feedforward, no history", 19, 19, "about 19%"],
    ["Feedforward, k previous events", 19.2, 19.4, "19.2 to 19.4%"],
    ["Feedforward, tuned", 21, 22, "21 to 22%"],
    ["LSTM / GRU user state", 20, 21, "20 to 21%"],
    ["TabPFN, zero-shot", 15.6, 17.3, "below 17.3%", "below"],
  ];
  const bottom = top + rows.length * rh;
  for (let v = 15; v <= 24; v++) {
    svg("line", { x1: X(v), x2: X(v), y1: top - 10, y2: bottom, stroke: "#1f1f1f" }, g);
    text(g, X(v), bottom + 22, v + "%", { "text-anchor": "middle", "font-size": 14, fill: "#7D7D7D" });
  }
  svg("line", { x1: X(17.3), x2: X(17.3), y1: top - 24, y2: bottom, stroke: C.mid, "stroke-width": 2, "stroke-dasharray": "5 5" }, g);
  text(g, X(17.3), top - 30, "deployed", { "text-anchor": "middle", "font-size": 14, fill: "#CDCDCD", "font-family": "JBMono" });
  rows.forEach(([lab, lo, hi, val, kind], i) => {
    const y = top + i * rh + rh / 2;
    text(g, 312, y + 6, lab, { "text-anchor": "end", "font-size": 17, fill: "#CDCDCD" });
    if (kind === "below") {
      svg("line", { x1: X(17.3), x2: X(15.8), y1: y, y2: y, stroke: C.mid, "stroke-width": 3, "marker-end": "url(#expArr)", class: "exp-bar-line", opacity: 0 }, g);
    } else {
      const x = X(lo) - 8, w = X(hi) - X(lo) + 16;
      svg("rect", { x, y: y - 9, width: 0, height: 18, rx: 9, fill: kind === "base" ? C.mid : C.blue, class: "exp-bar", "data-w": w }, g);
    }
    text(g, kind === "below" ? X(17.3) + 14 : X(hi) + 20, y + 6, val, { "font-size": 15, fill: "#F2F2F2", "font-family": "JBMono", class: "exp-val", opacity: 0 });
  });
  const defs = svg("defs", {}, g);
  const m = svg("marker", { id: "expArr", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, defs);
  svg("path", { d: "M0 0 L10 5 L0 10 z", fill: C.mid }, m);
}

/* --- Research loop: champion vs ~300 generations (schematic points) --- */
{
  const g = $("#search-svg");
  svg("line", { x1: 20, x2: 890, y1: 30, y2: 30, stroke: C.light, "stroke-width": 2.5, pathLength: 1, class: "champ" }, g);
  text(g, 890, 20, "best existing CatBoost configuration", { "text-anchor": "end", "font-size": 15, fill: "#CDCDCD", class: "champ-lab" });
  const r = rng(11);
  for (let i = 0; i < 300; i++) {
    const y = 42 + Math.pow(r(), 0.8) * 124;
    svg("circle", { cx: 24 + i * 2.9, cy: y, r: 3, fill: C.lpink, opacity: 0, class: "gen-pt" }, g);
  }
  text(g, 20, 186, "generation →", { "font-size": 14, fill: "#7D7D7D" });
}

/* --- Event stream: 1,000 raw events, 2.16% survive --- */
{
  const g = $("#stream-svg"), r = rng(3), keep = new Set();
  while (keep.size < 22) keep.add(Math.floor(r() * 1000));
  text(g, 0, 16, "raw IDE event stream", { "font-size": 15, fill: "#CDCDCD", "font-family": "JBMono" });
  text(g, 0, 150, "what reaches the trigger model", { "font-size": 15, fill: "#FF318C", "font-family": "JBMono", class: "st-lab2", opacity: 0 });
  for (let i = 0; i < 1000; i++) {
    const h = 18 + r() * 40, x = 10 + i * 0.92;
    const k = keep.has(i);
    svg("line", { x1: x, x2: x, y1: 70 - h / 2, y2: 70 + h / 2, stroke: "#6a6a6a", "stroke-width": 0.7, class: "tick" + (k ? " keep" : ""), opacity: 0 }, g);
    if (k) svg("line", { x1: x, x2: x, y1: 165, y2: 215, stroke: C.pink, "stroke-width": 3, "stroke-linecap": "round", class: "kept", opacity: 0 }, g);
  }
}

/* --- MDP (illustrative) --- */
{
  const g = $("#mdp-svg"), R = 34;
  const N = { start: [60, 150, "start"], read: [220, 150, "read"], edit: [410, 150, "edit"], test: [600, 150, "test"], ok: [820, 150, "success"], fail: [600, 330, "fail"] };
  const defs = svg("defs", {}, g);
  const mk = (id, col) => { const m = svg("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs); svg("path", { d: "M0 0 L10 5 L0 10 z", fill: col }, m); };
  mk("arr", "#9a9a9a");
  // [from, to, probability, label x, label y, anchor, loop?]
  const E = [
    ["start", "read", "1.00", 140, 136, "middle"], ["read", "edit", "1.00", 315, 136, "middle"],
    ["edit", "test", "0.88", 505, 176, "middle", 1], ["test", "ok", "0.58", 710, 136, "middle"],
    ["test", "fail", "0.08", 616, 248, "start"], ["edit", "fail", "0.12", 486, 262, "end"],
  ];
  const edge = (d, cls) => svg("path", { d, stroke: "#9a9a9a", "stroke-width": 2, fill: "none", "marker-end": "url(#arr)", pathLength: 1, class: "mdp-e " + (cls || "") }, g);
  E.forEach(([a, b, p, lx, ly, anchor, loop]) => {
    const [x1, y1] = N[a], [x2, y2] = N[b];
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    edge(`M${x1 + ux * R} ${y1 + uy * R} L${x2 - ux * (R + 4)} ${y2 - uy * (R + 4)}`, loop ? "mdp-loop" : "");
    text(g, lx, ly, p, { "text-anchor": anchor, "font-size": 15, fill: "#F2F2F2", "font-family": "JBMono", class: "mdp-p", opacity: 0 });
  });
  // the retry loop: test back to edit, arcing above
  edge("M578 126 Q505 40 436 124", "mdp-loop");
  text(g, 505, 66, "0.34  retry", { "text-anchor": "middle", "font-size": 15, fill: "#F2F2F2", "font-family": "JBMono", class: "mdp-p", opacity: 0 });
  Object.entries(N).forEach(([k, [x, y, lab]]) => {
    const col = k === "ok" ? C.teal : k === "fail" ? C.red : C.light;
    const n = svg("g", { class: "mdp-n", transform: `translate(${x} ${y})` }, g);
    svg("circle", { r: k === "ok" ? 40 : R, fill: "#101016", stroke: col, "stroke-width": 2.5 }, n);
    text(n, 0, 6, lab, { "text-anchor": "middle", "font-size": 16, fill: "#F2F2F2", "font-family": "JBMono" });
  });
}

/* --- Guardrail posts --- */
{
  const g = $("#posts");
  [[455, 40, 60, 700], [545, 40, 940, 700]].forEach(([x1, y1, x2, y2]) => {
    for (let i = 1; i <= 12; i++) {
      const t = Math.pow(i / 12, 1.6), x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      svg("line", { x1: x, x2: x, y1: y, y2: y + 6 + 26 * t }, g);
    }
  });
}

/* --- Code4Me particles --- */
{
  const g = $("#particles");
  for (let i = 0; i < 7; i++) svg("circle", { cx: 850, cy: 468, r: 5, class: "pt", opacity: 0 }, g);
}

/* ------------------------------ initial state ------------------------------ */
gsap.set("#camera", CAM.worldR);
gsap.set("#world .draw", { strokeDasharray: 1, strokeDashoffset: 1 });
gsap.set("#keys", { opacity: 0 });
gsap.set("#world", { opacity: 0 });
gsap.set("#dev", { x: -760, opacity: 0 });
gsap.set("#ov-me", { scale: 0.92 });
gsap.set(".chip", { opacity: 0, y: 14 });
gsap.set(".b1", { opacity: 0.38 }); gsap.set(".b2", { opacity: 0.28 }); gsap.set(".b3", { opacity: 0.3 });
gsap.set("#tab-stats", { attr: { "data-on": 1 } }); gsap.set("#t-stats", { attr: { "data-sel": 1 } });
gsap.set("#t-test", { display: "none" });
gsap.set(".tr .mk", { opacity: 0 });
gsap.set(".msg:not(.agent .msg)", { y: 12 });
gsap.set(".sq", { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" });
gsap.set(".rel-raw, .rel-cal", { strokeDasharray: 1, strokeDashoffset: 1 });
gsap.set(".rel-raw-pt, .rel-cal-pt, .he-lab, .bss-val, .he-a, .he-b", { opacity: 0 });
gsap.set(".champ", { strokeDasharray: 1, strokeDashoffset: 1 });
gsap.set(".mdp-e", { strokeDasharray: 1, strokeDashoffset: 1 });
gsap.set(".mdp-n", { opacity: 0 });
gsap.set(".issues span, .bf, .bf-arr, .bf-note", { opacity: 0, y: 10 });
gsap.set(".rk-line", { strokeDasharray: 1, strokeDashoffset: 1 }); gsap.set(".rk-l, .rk-r", { opacity: 0 });
gsap.set(".lp, .lp-arr, .loop-back, .frozen", { opacity: 0 });
gsap.set("#ov-fail", { transformOrigin: "0 0", x: -36, y: 82, scale: 0.25 });
gsap.set(".fl, .fl-foot", { opacity: 0 }); gsap.set(".fl .tag", { opacity: 0, scale: 0.8 });
gsap.set(".lg", { opacity: 0, x: 20 }); gsap.set(".lg-line i", { height: 0 });
gsap.set(".rc.r1", { x: -60, opacity: 0 }); gsap.set(".rc.r2", { x: 60, opacity: 0 }); gsap.set(".ri", { opacity: 0 });
gsap.set(".n-c4ma", { opacity: 0, y: 16 });
gsap.set(".stack i", { scaleX: 0 });
gsap.set(".era, .era-line", { opacity: 0 });
gsap.set("#railL, #railR", { strokeDasharray: 800, strokeDashoffset: 800 });
gsap.set(".profile .pi", { x: 20 });
// agent windows start collapsed into the laptop display centre (world 800,476)
$$(".aw").forEach(w => {
  const cx = w.offsetLeft + 145, cy = w.offsetTop + 50;
  gsap.set(w, { x: 800 - cx, y: 476 - cy, scale: 0.15 });
});
gsap.set(".mo", { scale: 0.4 });
gsap.set("#he7", { "--hl": 0 }); gsap.set("#he15", { "--sq": 0 }); gsap.set(".ln.rel-good, .ln.rel-warn", { "--rel": 0 });

/* ------------------------------ the master timeline ------------------------------ */
const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out", duration: 0.6 } });
tl.addLabel("cover", 0);

function beat(name, build) {
  const s = tl.duration();
  build((o = 0) => s + o);
  tl.addLabel(name, Math.max(tl.duration(), s + 0.05));
}
const show = (sel, at, v = {}) => tl.to(sel, { autoAlpha: 1, y: 0, x: 0, scale: 1, duration: 0.7, ...v }, at);
const hide = (sel, at, v = {}) => tl.to(sel, { autoAlpha: 0, duration: 0.35, ease: "power1.in", ...v }, at);
const cam = (p, at, d = 1.8) => tl.to("#camera", { ...CAM[p], duration: d, ease: "power3.inOut" }, at);
const dim = (v, at, d = 0.6) => tl.to("#dimmer", { opacity: v, duration: d, ease: "power1.inOut" }, at);
const mood = (a, b, c, at, o = [0.22, 0.16, 0.2]) => tl.to(".b1", { backgroundColor: a, opacity: o[0], duration: 1.4, ease: "sine.inOut" }, at)
  .to(".b2", { backgroundColor: b, opacity: o[1], duration: 1.4, ease: "sine.inOut" }, at)
  .to(".b3", { backgroundColor: c, opacity: o[2], duration: 1.4, ease: "sine.inOut" }, at);
const typeLine = (id, at, cps = 26) => {
  const { w, n } = typed[id];
  tl.to("#" + id, { width: w, duration: n / cps, ease: `steps(${n})` }, at);
  return at + n / cps;
};
const tab = (on, at) => {
  ["stats", "he", "test"].forEach(k => {
    tl.set("#tab-" + k, { attr: { "data-on": k === on ? 1 : 0 } }, at);
    tl.set("#t-" + k, { attr: { "data-sel": k === on ? 1 : 0 } }, at);
  });
  ["stats", "he", "test"].forEach(k => tl.to("#f-" + k, { autoAlpha: k === on ? 1 : 0, duration: 0.25 }, at));
};

/* PROLOGUE */
beat("me", t => {
  show("#ov-me", t(0.1), { duration: 1, ease: "power3.out" });
  tl.to(".chip", { opacity: 1, y: 0, stagger: 0.12, duration: 0.5 }, t(0.5));
});

beat("dev", t => {
  hide("#ov-me", t(0));
  mood(C.violet, C.blue, C.pink, t(0), [0.14, 0.1, 0.1]);
  tl.to("#world", { opacity: 1, duration: 0.2 }, t(0.15));
  tl.to("#world .draw", { strokeDashoffset: 0, duration: 1.6, stagger: 0.035, ease: "power2.inOut" }, t(0.2));
  tl.to("#keys", { opacity: 1, duration: 0.6 }, t(1.2));
  tl.to("#dev", { x: 0, opacity: 1, duration: 1.8, ease: "power3.out" }, t(0.7));
  tl.to("#screen", { opacity: 1, duration: 0.5 }, t(1.9));
  tl.to("#glow", { opacity: 1, duration: 1.2 }, t(1.9));
  tl.to("#lampLight", { opacity: 1, duration: 1 }, t(2.1));
  tl.set("#c3", { visibility: "visible" }, t(2.2));
});

beat("zoom", t => {
  cam("screenR", t(0), 2.2);
  tl.to("#room", { opacity: 0.35, duration: 1.2 }, t(0.4));
});

/* CHAPTER I: the assistant */
beat("a1", t => {
  mood(C.blue, C.cyan, C.violet, t(0));
  tl.set("#c3", { visibility: "hidden" }, t(0.2));
  tl.set("#c4", { visibility: "visible" }, t(0.2));
  let e = typeLine("ty4", t(0.25));
  tl.set("#c4", { visibility: "hidden" }, e);
  tl.set("#c5", { visibility: "visible" }, e);
  e = typeLine("ty5", e + 0.2);
});

beat("a2", t => {
  tl.to(".s1 .ghost", { opacity: 1, stagger: 0.07, duration: 0.25 }, t(0.2));
  tl.to("#tabhint", { opacity: 1, duration: 0.3 }, t(0.7));
  tl.set("#c5", { visibility: "hidden" }, t(1.6));
  tl.to("#tabhint kbd", { backgroundColor: "#3574F0", duration: 0.15, yoyo: true, repeat: 1 }, t(1.6));
  tl.to(".s1 .ghost", { opacity: 0, duration: 0.2 }, t(1.9));
  tl.to(".s1 .real", { opacity: 1, duration: 0.2 }, t(1.9));
  tl.to("#tabhint", { opacity: 0, duration: 0.3 }, t(2.0));
});

beat("a3", t => {
  tl.to("#ide-ai", { width: 470, duration: 0.8, ease: "power3.inOut" }, t(0));
  show("#m1", t(0.8), { duration: 0.4 });
  show("#m2", t(1.6), { duration: 0.5 });
});

beat("b1", t => {
  hide("#m1, #m2", t(0));
  tl.set("#m1, #m2", { display: "none" }, t(0.36));
  tab("he", t(0.2));
  tl.to("#he7", { "--hl": 1, duration: 0.6 }, t(0.8));
});

beat("b2", t => {
  tl.to("#he15", { "--sq": 1, duration: 0.4 }, t(0));
  show("#m3", t(0.3), { duration: 0.4 });
  show("#m4", t(1.0), { duration: 0.5 });
  tl.to("#he8", { opacity: 1, duration: 0.4 }, t(1.6));
  tl.to("#henote", { opacity: 1, duration: 0.4 }, t(1.9));
});

beat("b3", t => {
  dim(0.82, t(0));
  show("#ov-bench", t(0.2));
  tl.to(".sq", { opacity: 1, scale: 1, duration: 0.35, stagger: { each: 0.0035, from: "random" } }, t(0.4));
  BENCH.forEach((b, i) => tl.to(".sq.cat" + i, { fill: b.c, duration: 0.3, stagger: 0.002 }, t(1.5 + i * 0.35)));
  tl.from("#bench-legend > span", { opacity: 0, x: 12, stagger: 0.35, duration: 0.4 }, t(1.5));
  tl.from(".s-2024", { opacity: 0, y: 14 }, t(3.0));
  tl.from(".s-247", { opacity: 0, y: 14 }, t(3.2));
});

beat("bf", t => {
  hide("#ov-bench", t(0));
  show("#ov-bf", t(0.2));
  tl.to(".issues span", { opacity: 1, y: 0, stagger: 0.14, duration: 0.4 }, t(0.5));
  tl.to(".bf, .bf-arr", { opacity: 1, y: 0, stagger: 0.16, duration: 0.45 }, t(1.5));
  tl.to(".bf-note", { opacity: 1, y: 0, duration: 0.4 }, t(2.8));
});

beat("b4", t => {
  hide("#ov-bf", t(0));
  show("#ov-he", t(0.2));
  tl.to(".he-a", { opacity: 1, stagger: 0.04, duration: 0.3 }, t(0.5));
  tl.set(".he-b", { opacity: 1 }, t(1.0));
  $$(".he-b").forEach((c, i) => tl.to(c, { attr: { cx: +c.dataset.to }, duration: 1.1, ease: "power3.inOut" }, t(1.0 + i * 0.06)));
  $$(".he-link").forEach((l, i) => tl.to(l, { attr: { x2: +l.dataset.to }, duration: 1.1, ease: "power3.inOut" }, t(1.0 + i * 0.06)));
  tl.to(".he-lab", { opacity: 1, duration: 0.4 }, t(2.4));
  tl.from(".s-drop", { opacity: 0, y: 12 }, t(2.5));
});

beat("b5", t => {
  hide("#ov-he", t(0));
  show("#ov-rank", t(0.2));
  tl.to(".rk-l", { opacity: 1, stagger: 0.03, duration: 0.3 }, t(0.4));
  tl.to(".rk-line:not(.hi)", { strokeDashoffset: 0, stagger: 0.05, duration: 0.9, ease: "power2.inOut" }, t(0.9));
  tl.to(".rk-line.hi", { strokeDashoffset: 0, stagger: 0.2, duration: 1.1, ease: "power2.inOut" }, t(1.5));
  tl.to(".rk-r", { opacity: 1, stagger: 0.03, duration: 0.3 }, t(2.2));
});

/* CHAPTER II: Code4Me */
beat("c1", t => {
  hide("#ov-rank", t(0));
  dim(0, t(0.1));
  mood(C.teal, C.green, C.blue, t(0), [0.14, 0.1, 0.12]);
  tl.to("#ide-ai", { width: 0, duration: 0.5 }, t(0.1));
  tab("stats", t(0.1));
  cam("c4m", t(0.2), 2);
  tl.to("#room", { opacity: 0.12, duration: 1 }, t(0.3));
  show("#ov-c4m", t(1.6));
  tl.from("#ov-c4m .node, #ov-c4m .researcher, .c4m-brand", { opacity: 0, y: 16, stagger: 0.18, duration: 0.5 }, t(1.7));
});

beat("c2", t => {
  hide("#ov-c4m", t(0));
  dim(0.82, t(0));
  show("#ov-modules", t(0.2));
  tl.from("#ov-modules .mn.root", { opacity: 0, y: 10 }, t(0.4));
  tl.from("#ov-modules .mn.agg", { opacity: 0, y: 10, stagger: 0.12 }, t(0.7));
  tl.from("#ov-modules .mn.leaf:not(.yours)", { opacity: 0, y: 10, stagger: 0.08 }, t(1.1));
  tl.from("#ov-modules .mn.yours", { opacity: 0, scale: 0.6, ease: "back.out(2)" }, t(1.8));
  tl.from(".s-lat", { opacity: 0, y: 12 }, t(2.2));
});

/* CHAPTER III: trust and calibration */
beat("d1", t => {
  hide("#ov-modules", t(0));
  dim(0, t(0.1));
  mood(C.gold, C.orange, C.yellow, t(0), [0.16, 0.12, 0.1]);
  cam("screenR", t(0.1), 2);
  tl.to("#room", { opacity: 0.35, duration: 1 }, t(0.4));
  tl.to(".ln.late", { opacity: 1, duration: 0.3, stagger: 0.1 }, t(1.8));
  tl.set("#c14", { visibility: "visible" }, t(2.0));
  const e = typeLine("ty14", t(2.1));
  tl.set("#c14", { visibility: "hidden" }, e + 0.1);
  tl.to(".s2 .ghost", { opacity: 1, stagger: 0.1, duration: 0.25 }, e + 0.3);
  tl.to("#conf", { opacity: 1, duration: 0.3 }, e + 0.8);
  tl.from("#conf", { scale: 0.6, duration: 0.4, ease: "back.out(2.5)" }, e + 0.8);
});

beat("d2", t => {
  dim(0.82, t(0));
  show("#ov-rel", t(0.2));
  tl.to(".rel-raw", { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, t(0.6));
  tl.to(".rel-raw-pt", { opacity: 1, stagger: 0.08, duration: 0.25 }, t(0.8));
  tl.to(".rel-cal", { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, t(2.0));
  tl.to(".rel-cal-pt", { opacity: 1, stagger: 0.08, duration: 0.25 }, t(2.2));
  tl.to(".rel-raw, .rel-raw-pt", { opacity: 0.3, duration: 0.5 }, t(2.4));
  tl.from("#ov-rel .facts > div", { opacity: 0, x: 16, stagger: 0.15 }, t(2.8));
});

beat("d3", t => {
  hide("#ov-rel", t(0));
  show("#ov-bss", t(0.2));
  $$(".bss-bar").forEach((b, i) => tl.to(b, { attr: { y: +b.dataset.y, height: +b.dataset.h }, duration: 0.7, ease: "power3.out" }, t(0.6 + (i < 3 ? i * 0.35 : 1.6 + (i - 3) * 0.25))));
  $$(".bss-val").forEach((v, i) => tl.to(v, { opacity: 1, duration: 0.3 }, t(1.0 + (i < 3 ? i * 0.35 : 1.6 + (i - 3) * 0.25))));
});

beat("d4", t => {
  hide("#ov-bss", t(0));
  dim(0, t(0.1));
  tl.to(".s2 .ghost, #conf", { opacity: 0, duration: 0.3 }, t(0.4));
  tl.to(".s2 .real", { opacity: 1, duration: 0.3 }, t(0.4));
  tl.to(".ln.rel-good", { "--rel": 1, duration: 0.5 }, t(0.9));
  tl.to(".ln.rel-warn", { "--rel": 1, duration: 0.5 }, t(1.2));
  tl.to("#reltip", { opacity: 1, duration: 0.3 }, t(1.6));
  show("#ov-survey", t(2.0));
  tl.to(".stack i", { scaleX: 1, stagger: 0.2, duration: 0.6, ease: "power3.out" }, t(2.2));
});

/* CHAPTER IV: personalization */
beat("e1", t => {
  hide("#ov-survey", t(0));
  dim(0.85, t(0));
  mood(C.pink, C.purple, C.dpink, t(0), [0.2, 0.14, 0.12]);
  show("#ov-spread", t(0.2));
  tl.to(".sp-band", { attr: { width: +$(".sp-band").dataset.w }, duration: 0.9, ease: "power3.inOut" }, t(0.5));
  tl.from(".sp-lab", { opacity: 0, stagger: 0.1 }, t(1.2));
  tl.to(".sp-dot", { opacity: 0.85, duration: 0.2, stagger: { each: 0.012, from: "random" } }, t(1.3));
  tl.to(".sp-mark", { opacity: 1, duration: 0.4 }, t(2.6));
  tl.from(".s-nine", { opacity: 0, y: 12 }, t(2.9));
});

beat("e2", t => {
  hide("#ov-spread", t(0));
  show("#ov-exp", t(0.2));
  $$(".exp-bar").forEach((b, i) => tl.to(b, { attr: { width: +b.dataset.w }, duration: 0.6, ease: "power3.out" }, t(0.6 + i * 0.22)));
  tl.to(".exp-bar-line", { opacity: 1, duration: 0.4 }, t(0.6 + 6 * 0.22));
  tl.to(".exp-val", { opacity: 1, stagger: 0.22, duration: 0.3 }, t(0.9));
  tl.from(".exp-note", { opacity: 0, y: 12 }, t(2.8));
});

beat("e2b", t => {
  hide("#ov-exp", t(0));
  show("#ov-loop", t(0.2));
  tl.to(".lp, .lp-arr", { opacity: 1, stagger: 0.15, duration: 0.35 }, t(0.4));
  tl.to(".loop-back", { opacity: 1, duration: 0.4 }, t(1.5));
  tl.to(".frozen", { opacity: 1, duration: 0.4 }, t(1.8));
  tl.to(".champ", { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut" }, t(2.2));
  tl.from(".champ-lab", { opacity: 0 }, t(2.5));
  const counter = { v: 0 };
  tl.to(counter, { v: 300, duration: 2.6, ease: "power1.inOut", onUpdate: () => { $("#gen-count").textContent = Math.round(counter.v); } }, t(2.7));
  tl.to(".gen-pt", { opacity: 0.75, duration: 0.05, stagger: 2.6 / 300 }, t(2.7));
  tl.from(".gens .g2, .gens .g3", { opacity: 0, y: 12, stagger: 0.2 }, t(5.1));
});

beat("e3", t => {
  hide("#ov-loop", t(0));
  show("#ov-stream", t(0.2));
  tl.to(".tick", { opacity: 1, duration: 0.05, stagger: { amount: 1.2 } }, t(0.4));
  tl.to(".tick:not(.keep)", { opacity: 0.12, duration: 0.6 }, t(2.0));
  tl.to(".tick.keep", { stroke: C.pink, strokeWidth: 2.5, duration: 0.4 }, t(2.0));
  tl.to(".kept", { opacity: 1, duration: 0.4, stagger: 0.03 }, t(2.4));
  tl.to(".st-lab2", { opacity: 1, duration: 0.4 }, t(2.4));
  tl.from("#ov-stream .facts > div", { opacity: 0, y: 14, stagger: 0.2 }, t(3.0));
});

/* CHAPTER V: agents */
beat("f1", t => {
  hide("#ov-stream", t(0));
  dim(0, t(0.1));
  mood(C.violet, C.purple, C.blue, t(0), [0.24, 0.16, 0.18]);
  tl.set("#ai-title", { textContent: "✦ Agent" }, t(0.1));
  tl.set("#ai-ph", { textContent: "Describe a task…" }, t(0.1));
  tl.set("#chat", { autoAlpha: 0 }, t(0.1));
  tl.set("#agent", { autoAlpha: 1 }, t(0.1));
  tl.set("#st-ai", { textContent: "✦ Agent working" }, t(0.1));
  tl.to("#ide-ai", { width: 470, duration: 0.8, ease: "power3.inOut" }, t(0.2));
  tl.to(".pl", { opacity: 1, stagger: 0.1, duration: 0.3 }, t(1.0));
  const st = (id, s, at) => tl.set(id, { attr: { "data-st": s } }, at);
  st("#p1", "run", t(1.6)); st("#p1", "done", t(2.2));
  st("#p2", "run", t(2.2));
  tl.set("#t-test", { display: "flex" }, t(2.3));
  tl.set("#tab-test", { display: "flex" }, t(2.3));
  tl.to("#t-test .mk", { opacity: 1, duration: 0.2 }, t(2.3));
  tab("test", t(2.3));
  tl.to(".ln.ag", { opacity: 1, stagger: 0.12, duration: 0.15 }, t(2.5));
  st("#p2", "done", t(4.5)); st("#p3", "run", t(4.5));
  tl.to("#ide-bottom", { height: 200, duration: 0.6, ease: "power3.inOut" }, t(4.5));
  tl.to("#term1", { opacity: 1, duration: 0.1 }, t(5.0));
  tl.to("#term2", { opacity: 1, duration: 0.1 }, t(5.6));
  st("#p3", "done", t(5.8)); st("#p4", "run", t(5.8));
  tl.to("#t-stats .mk", { opacity: 1, duration: 0.2 }, t(6.4));
  st("#p4", "done", t(6.9)); st("#p5", "run", t(6.9));
  tl.to("#term3", { opacity: 1, duration: 0.1 }, t(7.0));
  tl.to("#term4", { opacity: 1, duration: 0.1 }, t(7.6));
  st("#p5", "done", t(7.8));
  tl.to("#review", { opacity: 1, duration: 0.4 }, t(8.0));
  tl.from("#review", { y: 12, duration: 0.4 }, t(8.0));
});

beat("f2", t => {
  cam("worldR", t(0), 2.2);
  tl.to("#room", { opacity: 1, duration: 1.2 }, t(0.4));
  tl.to("#window", { opacity: 0.3, duration: 1 }, t(0.6));
  tl.to("#armsType", { opacity: 0, duration: 0.4 }, t(0.8));
  tl.to("#armsRest", { opacity: 1, duration: 0.4 }, t(0.8));
  tl.to("#head", { rotation: -5, svgOrigin: "385 740", duration: 0.8, ease: "power2.inOut" }, t(0.8));
  tl.to("#dev", { y: 8, duration: 0.8 }, t(0.8));
  tl.to(".aw", { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 1.1, stagger: 0.25, ease: "power3.out" }, t(1.8));
  show("#ov-timeline", t(2.0));
  tl.to(".era.e1, .era-line", { opacity: 1, duration: 0.4 }, t(2.2));
  tl.to(".era-line i", { width: "50%", duration: 0.6 }, t(2.4));
  tl.to(".era.e2", { opacity: 1, duration: 0.4 }, t(2.7));
  tl.to(".era-line i", { width: "100%", duration: 0.6 }, t(3.0));
  tl.to(".era.e3", { opacity: 1, duration: 0.4 }, t(3.4));
});

beat("f3", t => {
  hide("#ov-timeline", t(0));
  tl.to("#lamp, #mug", { opacity: 0.25, duration: 0.6 }, t(0.1));
  show("#ov-c4ma", t(0.3), { duration: 0.3 });
  tl.to(".n-c4ma", { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, t(0.5));
});

/* CHAPTER VI: assurance */
beat("g0", t => {
  hide("#ov-c4ma", t(0));
  dim(0.85, t(0));
  mood(C.red, C.orange, C.dpink, t(0), [0.18, 0.12, 0.12]);
  show("#ov-fail", t(0.2), { duration: 0.9, ease: "power3.out" });
  tl.to(".fl", { opacity: 1, stagger: 0.3, duration: 0.2 }, t(1.0));
  tl.to(".t-loop", { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, t(2.4));
  tl.to(".t-game", { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, t(3.4));
  tl.to(".fl-foot", { opacity: 1, duration: 0.4 }, t(3.9));
});

beat("g1", t => {
  hide("#ov-fail", t(0));
  show("#ov-mdp", t(0.2));
  tl.to("#trace span", { opacity: 1, stagger: 0.14, duration: 0.3 }, t(0.5));
  tl.to(".mdp-n", { opacity: 1, stagger: 0.12, duration: 0.4 }, t(1.7));
  tl.to(".mdp-e", { strokeDashoffset: 0, stagger: 0.1, duration: 0.5 }, t(2.1));
  tl.to(".mdp-p", { opacity: 1, stagger: 0.06, duration: 0.3 }, t(2.9));
  tl.to("#query", { opacity: 1, duration: 0.4 }, t(3.5));
  tl.to(".mdp-loop", { stroke: C.red, strokeWidth: 3, duration: 0.4 }, t(4.2));
  tl.to("#qres", { opacity: 1, duration: 0.4 }, t(4.2));
});

beat("g2", t => {
  hide("#ov-mdp", t(0));
  dim(0.9, t(0));
  show("#ov-lineage", t(0.2), { duration: 0.2 });
  tl.to(".lg-line i", { height: "100%", duration: 2.0, ease: "power1.inOut" }, t(0.3));
  tl.to(".lg", { opacity: 1, x: 0, stagger: 0.5, duration: 0.5, ease: "power3.out" }, t(0.4));
});

/* CHAPTER VII: bets */
beat("h0", t => {
  hide("#ov-lineage", t(0));
  dim(0.85, t(0));
  mood(C.gold, C.pink, C.violet, t(0), [0.34, 0.3, 0.3]);
});

beat("h1", t => {
  dim(0, t(0));
  mood(C.pink, C.lpink, C.violet, t(0), [0.2, 0.14, 0.14]);
  hide(".aw", t(0));
  tl.to("#lamp, #mug", { opacity: 1, duration: 0.6 }, t(0.1));
  show("#ov-profile", t(0.4));
  tl.to(".profile .pi", { opacity: 1, x: 0, stagger: 0.2, duration: 0.5 }, t(0.9));
});

beat("h2", t => {
  hide("#ov-profile", t(0));
  mood(C.blue, C.cyan, C.violet, t(0), [0.2, 0.16, 0.16]);
  tl.to("#armsType", { opacity: 1, duration: 0.4 }, t(0.2));
  tl.to("#armsRest", { opacity: 0, duration: 0.4 }, t(0.2));
  tl.to("#head", { rotation: 0, svgOrigin: "385 740", duration: 0.6 }, t(0.2));
  tl.to("#dev", { y: 0, duration: 0.6 }, t(0.2));
  show("#ov-modal", t(0.3), { duration: 0.3 });
  tl.to(".mo", { opacity: 1, scale: 1, stagger: 0.15, duration: 0.6, ease: "back.out(1.6)" }, t(0.5));
});

beat("h3", t => {
  hide("#ov-modal", t(0));
  dim(0.88, t(0));
  mood(C.orange, C.gold, C.red, t(0), [0.2, 0.14, 0.12]);
  show("#ov-rails", t(0.2));
  tl.to("#railL, #railR", { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" }, t(0.5));
  tl.from("#posts line", { opacity: 0, stagger: 0.03, duration: 0.2 }, t(0.9));
});

beat("close", t => {
  hide("#ov-rails", t(0));
  dim(0.9, t(0));
  mood(C.blue, C.pink, C.violet, t(0), [0.26, 0.24, 0.2]);
  show("#ov-recap", t(0.2), { duration: 0.2 });
  tl.to(".rc", { x: 0, opacity: 1, duration: 0.9, stagger: 0.15, ease: "power3.out" }, t(0.3));
  tl.to(".r1 .ri", { opacity: 1, stagger: 0.18, duration: 0.35 }, t(1.0));
  tl.to(".r2 .ri", { opacity: 1, stagger: 0.18, duration: 0.35 }, t(1.6));
});

beat("thanks", t => {
  hide("#ov-recap", t(0));
  cam("worldC", t(0), 1.8);
  dim(0.86, t(0.2));
  mood(C.violet, C.pink, C.blue, t(0), [0.38, 0.28, 0.3]);
});

/* ------------------------------ ambient loops ------------------------------ */
// Loops run outside the master timeline and are switched on per beat.
const loops = {
  particles: {
    beats: ["c1"],
    make() {
      const pts = $$("#particles .pt");
      const tws = pts.map((p, i) => gsap.fromTo(p, { attr: { cx: 850 }, opacity: 1 },
        { attr: { cx: 1305 }, duration: 2.4, ease: "none", repeat: -1, delay: i * 0.34 }));
      return { kill() { tws.forEach(t => t.kill()); gsap.set(pts, { opacity: 0 }); } };
    },
  },
  cars: {
    beats: ["h3"],
    make() {
      const g = $("#cars"), cols = [C.violet, C.pink, C.cyan];
      g.innerHTML = "";
      const spark = svg("circle", { r: 16, fill: "none", stroke: C.yellow, "stroke-width": 4, opacity: 0 }, g);
      const tw = gsap.timeline({ repeat: -1 });
      cols.forEach((col, i) => {
        const car = svg("rect", { width: 40, height: 26, rx: 6, fill: col }, g);
        const lane = i === 1 ? -1 : i === 0 ? 1 : 0.2;
        const p = { t: 0 };
        const place = () => {
          const t = p.t, s = 0.25 + t * 1.4, y = 40 + t * 640;
          // road half-width at this depth; the pink agent drifts into the left rail and is pushed back
          const hw = 45 + t * 395;
          let off = lane * hw * 0.45;
          if (i === 1) {
            off = -hw * 0.82 * Math.sin(Math.PI * Math.min(t / 0.7, 1));
            spark.setAttribute("transform", `translate(${500 - hw} ${y + 13 * s}) scale(${s})`);
            spark.setAttribute("opacity", Math.max(0, 1 - Math.abs(t - 0.35) * 14));
          }
          car.setAttribute("transform", `translate(${500 + off - 20 * s} ${y}) scale(${s})`);
          car.setAttribute("opacity", Math.min(1, t * 6));
        };
        place();
        tw.to(p, { t: 1, duration: 4.2, ease: "power1.in", onUpdate: place }, i * 1.4);
      });
      return tw;
    },
  },
};
const running = {};
function syncLoops(beatName) {
  for (const k in loops) {
    const on = loops[k].beats.includes(beatName);
    if (on && !running[k]) running[k] = loops[k].make();
    if (!on && running[k]) { running[k].kill(); running[k] = null; }
  }
  document.body.classList.toggle("typing", ["dev", "zoom", "a1", "a2", "c1", "d1", "h2"].includes(beatName));
}

/* ------------------------------ navigation ------------------------------ */
const steps = $$(".step");
const labels = steps.map(s => s.dataset.beat);
labels.forEach(l => { if (!(l in tl.labels)) console.warn("missing label", l); });
let cur = -1, playing = null, navLock = true, navTimer = null; // locked until init completes

function activate(i, instant = false) {
  if (i === cur || i < 0 || i >= steps.length) return;
  const prev = cur; cur = i;
  const label = labels[i];
  steps.forEach((s, j) => s.classList.toggle("active", j === i));
  document.body.dataset.beat = label;
  const rushing = playing && playing.isActive(); // presenter clicked again mid-animation
  playing && playing.kill();
  if (instant || prev < 0) {
    tl.seek(tl.labels[label], false);
  } else {
    const from = tl.time(), to = tl.labels[label], dist = Math.abs(to - from);
    let dur = to >= from ? dist : dist * 0.45;
    if (Math.abs(i - prev) > 1 || rushing) dur = Math.min(dur, 1.4);
    playing = tl.tweenTo(to, { duration: Math.max(Math.min(dur, 12), 0.05), ease: "none" });
  }
  syncLoops(label);
  $("#prog").style.width = (i / (steps.length - 1)) * 100 + "%";
  $("#hud-ch").textContent = steps[i].dataset.ch || "";
  $("#hud-num").textContent = `${i + 1} / ${steps.length}`;
  history.replaceState(null, "", "#" + label);
}

function stepY(i) {
  const s = steps[i];
  return s.offsetTop + s.offsetHeight / 2 - innerHeight / 2;
}
function go(i, smooth = true) {
  i = Math.max(0, Math.min(steps.length - 1, i));
  navLock = true;
  clearTimeout(navTimer);
  activate(i);
  window.scrollTo({ top: stepY(i), behavior: smooth ? "smooth" : "auto" });
  navTimer = setTimeout(() => { navLock = false; }, 1100);
}

steps.forEach((s, i) => {
  ScrollTrigger.create({
    trigger: s, start: "top 55%", end: "bottom 55%",
    onToggle: self => { if (self.isActive && !navLock) activate(i); },
  });
});

addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) { e.preventDefault(); go(cur + 1); }
  else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); go(cur - 1); }
  else if (k === "Home") { e.preventDefault(); go(0, false); }
  else if (k === "End") { e.preventDefault(); go(steps.length - 1, false); }
  else if (k === "f" || k === "F") { document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen(); }
  else if (k === "t" || k === "T") toggleTimer();
});

/* presenter timer */
let t0 = null, timerInt = null;
function toggleTimer() {
  if (timerInt) { clearInterval(timerInt); timerInt = null; $("#timer").textContent = ""; return; }
  t0 = Date.now();
  const tick = () => {
    const s = Math.floor((Date.now() - t0) / 1000);
    $("#timer").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  tick(); timerInt = setInterval(tick, 1000);
}

/* ------------------------------ start ------------------------------ */
history.scrollRestoration = "manual";
ScrollTrigger.refresh();
const start = Math.max(0, labels.indexOf(initialHash));
window.scrollTo(0, stepY(start));
activate(start, true);
setTimeout(() => { navLock = false; }, 300);
if (start === 0) gsap.from(".cover .card > *", { y: 26, opacity: 0, stagger: 0.12, duration: 1.1, ease: "power3.out", delay: 0.15 });
window.__tl = tl; window.__go = go;
}

Promise.all(["20px Inter", "22px JBMono", "italic 22px JBMono"].map(f => document.fonts.load(f)))
  .catch(() => {}).then(main);
