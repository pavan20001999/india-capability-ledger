#!/usr/bin/env node
/**
 * India Capability Ledger — self test.
 * Runs the built page's scripts against a strict DOM stub: any element that is
 * NOT in the markup returns null, so a renderer reaching for a missing node
 * throws here instead of silently blanking a tab in the browser.
 *
 *   node test.js [index.html]
 */
const fs = require("fs");
const path = require("path");

const file = path.isAbsolute(process.argv[2] || "")
  ? process.argv[2]
  : path.join(__dirname, process.argv[2] || "index.html");
const html = fs.readFileSync(file, "utf8");

const parts = [];
const re = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html))) parts.push(m[1]);
if (parts.length < 2) { console.error("test: expected two inline scripts"); process.exit(1); }

// ids and classes actually present in the markup (scripts stripped first)
const markup = html.replace(/<script>[\s\S]*?<\/script>/g, "");
const ids = new Set();
let im;
const idre = /\sid="([^"]+)"/g;
while ((im = idre.exec(markup))) ids.add(im[1]);

// Elements deliberately absent from the markup. Every lookup of these is
// guarded in app.js (`if ($("#x"))` or `|| {setAttribute}`), because the
// filters they belonged to were removed from the Companies and Groups tabs.
const OPTIONAL = new Set(["ctry", "regn", "sect", "mitChip", "keiChip", "chaeChip"]);

const fails = [];
const made = new Set();

function node(tag, id) {
  const el = {
    _tag: tag, _id: id, _html: "", _text: "",
    style: {}, dataset: {}, hidden: false, value: "",
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute() {}, getAttribute: () => null, removeAttribute() {},
    addEventListener() {}, removeEventListener() {},
    appendChild() {}, focus() {}, blur() {}, click() {},
    closest: () => null, contains: () => false,
    querySelector: () => null, querySelectorAll: () => [],
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 0, height: 0 }),
    scrollIntoView() {}
  };
  Object.defineProperty(el, "innerHTML", {
    get() { return el._html; },
    set(v) { el._html = String(v); }
  });
  Object.defineProperty(el, "textContent", {
    get() { return el._text; },
    set(v) { el._text = String(v); }
  });
  Object.defineProperty(el, "children", { get: () => [] });
  return el;
}

const byId = {};
const doc = {
  getElementById(id) {
    if (!ids.has(id)) {
      if (!OPTIONAL.has(id)) fails.push("getElementById('" + id + "') — not in markup");
      return null;
    }
    if (!byId[id]) { byId[id] = node("div", id); made.add(id); }
    return byId[id];
  },
  querySelector(sel) {
    if (sel.charAt(0) === "#") return doc.getElementById(sel.slice(1));
    return node("div", sel);
  },
  querySelectorAll(sel) {
    // return a representative element so forEach bodies execute
    return [node("div", sel)];
  },
  createElement: (t) => node(t, null),
  addEventListener() {},
  body: node("body", null),
  documentElement: node("html", null),
  activeElement: null,
  readyState: "complete"
};

const win = {
  document: doc,
  location: { hash: "", search: "", href: "file://" + file },
  addEventListener() {}, removeEventListener() {},
  scrollTo() {}, matchMedia: () => ({ matches: false, addEventListener() {} }),
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  requestAnimationFrame(f) { f(0); },
  setTimeout(f) { try { f(); } catch (e) { fails.push("setTimeout: " + e.message); } return 0; },
  clearTimeout() {}, console
};
win.window = win;
win.self = win;

const vm = require("vm");
const ctx = vm.createContext(win);
Object.defineProperty(win, "global", { value: win });

let exported = null;
try {
  vm.runInContext(parts[0] + "\n;globalThis.__D={COMPANIES,CHOKES,CHAMPIONS,BUILDERS,TRAPS,SECOND,MIRROR,MODELS,CRIT,STRUCT,TECHS,TECHCLASS,BARRIER,INDIAN_FIRMS};", ctx, { filename: "data.js" });
  exported = win.__D;
} catch (e) {
  console.error("FAIL data.js: " + e.message);
  process.exit(1);
}
try {
  vm.runInContext(parts[1], ctx, { filename: "app.js" });
} catch (e) {
  console.error("FAIL app.js at runtime: " + e.message);
  console.error(e.stack.split("\n").slice(0, 6).join("\n"));
  process.exit(1);
}

const D = exported;

// ---- dataset integrity
const problems = [];

// orphaned CRIT / STRUCT keys
let orphan = 0;
for (const K of [D.CRIT, D.STRUCT]) {
  for (const key of Object.keys(K)) {
    const [i, j] = key.split("|").map(Number);
    if (!D.COMPANIES[i] || !D.COMPANIES[i].prod[j]) orphan++;
  }
}
if (orphan) problems.push(orphan + " orphaned CRIT/STRUCT keys");

// duplicate company names
const seen = {}, dupes = [];
D.COMPANIES.forEach((c) => { if (seen[c.n]) dupes.push(c.n); seen[c.n] = 1; });
if (dupes.length) problems.push("duplicate companies: " + dupes.join(", "));

// tier values
const badTier = [];
D.COMPANIES.forEach((c) => c.prod.forEach((p) => {
  if (["A", "B", "C", "Z"].indexOf(p[2]) < 0) badTier.push(c.n + " / " + p[0]);
}));
if (badTier.length) problems.push("bad tier codes: " + badTier.slice(0, 5).join("; "));

// core technology register: 1:1 with chokepoints, consistent industry, valid class
const chokeNames = new Set(D.CHOKES.map((k) => k.n));
const chokeSec = {}; D.CHOKES.forEach((k) => { chokeSec[k.n] = k.sec; });
const unmatched = D.TECHS.filter((t) => !chokeNames.has(t.k)).map((t) => t.k);
if (unmatched.length) problems.push("TECHS pointing at no chokepoint: " + unmatched.join(", "));
const covered = new Set(D.TECHS.map((t) => t.k));
const uncovered = D.CHOKES.filter((k) => !covered.has(k.n)).map((k) => k.n);
if (uncovered.length) problems.push("chokepoints with no core technology: " + uncovered.join(", "));
const secMismatch = D.TECHS.filter((t) => chokeSec[t.k] !== t.sec).map((t) => t.k);
if (secMismatch.length) problems.push("TECHS industry mismatch: " + secMismatch.join(", "));
const badCls = D.TECHS.filter((t) => !D.TECHCLASS[t.cls]).map((t) => t.n);
if (badCls.length) problems.push("bad technology class: " + badCls.join(", "));
const thin = D.TECHS.filter((t) => !t.what || !t.hard || !t.ind ||
  t.what.length < 60 || t.hard.length < 40 || t.ind.length < 40).map((t) => t.n);
if (thin.length) problems.push("thin core-technology entries: " + thin.join(" | "));

// builders carry a barrier
const noBar = D.BUILDERS.filter((b) => !b.bar || !D.BARRIER[b.bar]).map((b) => b.n);
if (noBar.length) problems.push("builders with no valid barrier: " + noBar.join(", "));

// ---- report
const lines = D.COMPANIES.reduce((n, c) => n + c.prod.length, 0);
const secs = new Set(D.COMPANIES.map((c) => c.sec));
const clsCount = {};
D.TECHS.forEach((t) => { clsCount[t.cls] = (clsCount[t.cls] || 0) + 1; });
const barCount = {};
D.BUILDERS.forEach((b) => { barCount[b.bar] = (barCount[b.bar] || 0) + 1; });

console.log("companies          " + D.COMPANIES.length);
console.log("product lines      " + lines);
console.log("industries         " + secs.size);
console.log("chokepoints        " + D.CHOKES.length);
console.log("core technologies  " + D.TECHS.length + "  " + JSON.stringify(clsCount));
console.log("champions          " + D.CHAMPIONS.length);
console.log("builders           " + D.BUILDERS.length + "  " + JSON.stringify(barCount));
console.log("traps              " + D.TRAPS.length);
console.log("elements rendered  " + made.size);

if (fails.length) {
  console.error("\nMISSING DOM NODES (" + fails.length + "):");
  [...new Set(fails)].forEach((f) => console.error("  " + f));
}
if (problems.length) {
  console.error("\nDATA PROBLEMS (" + problems.length + "):");
  problems.forEach((p) => console.error("  " + p));
}
if (fails.length || problems.length) process.exit(1);
console.log("\nall checks passed");
