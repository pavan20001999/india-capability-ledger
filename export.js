#!/usr/bin/env node
/**
 * India Capability Ledger — data export.
 * Writes the ledger out as flat CSV and JSON for anyone who wants the data
 * without the dashboard: spreadsheets, Power BI, a notebook, another tool.
 *
 *   node export.js            -> data/*.csv, data/ledger.json
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = __dirname;
const OUT = path.join(ROOT, "data");
fs.mkdirSync(OUT, { recursive: true });

const src = fs.readFileSync(path.join(ROOT, "src", "data.js"), "utf8");

// Version the export from VERSION and a hash of the dataset, not from the clock:
// a timestamp here would make every export differ and defeat the CI drift check.
const [version, asOf] = fs
  .readFileSync(path.join(ROOT, "VERSION"), "utf8")
  .trim().split(/\r?\n/).map((s) => s.trim());
const digest = require("crypto").createHash("sha256").update(src).digest("hex").slice(0, 12);
const ctx = vm.createContext({});
vm.runInContext(src + "\n;globalThis.__D={COMPANIES,TRAPS,CHOKES,CHAMPIONS,SECOND,BUILDERS,MIRROR,MODELS,INDIAN_FIRMS,BARRIER,CRIT,STRUCT,TECHS,TECHCLASS};", ctx);
const D = ctx.__D;

const TIER = {
  A: "Indian-owned with Indian IP",
  B: "Foreign-controlled",
  C: "Indian-owned, foreign technology",
  Z: "No Indian presence"
};
const STRUCTL = { M: "Monopoly", D: "Duopoly", O: "Oligopoly", C: "Competitive" };
const CRITL = { 3: "Critical", 2: "Important", 1: "Substitutable", 0: "Commodity" };
const BARRANK = { DECISION: 1, QUALIFICATION: 2, CAPITAL: 3, TECHNOLOGY: 4 };

function csv(rows) {
  const cell = (v) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
}
function write(name, rows) {
  fs.writeFileSync(path.join(OUT, name), csv(rows));
  console.log("  data/" + name + "  " + (rows.length - 1) + " rows");
}

// ---- product lines: the spine of the ledger, one row per line
const lines = [[
  "Company", "Country", "Region", "Industry", "Segment", "Revenue", "FiscalYear",
  "ProductLine", "IndianSide", "Tier", "TierMeaning",
  "Criticality", "CriticalityLabel", "CriticalityWhy",
  "MarketStructure", "MarketStructureLabel", "KnownSuppliers", "IndianEntrants"
]];
D.COMPANIES.forEach((c, i) => {
  c.prod.forEach((p, j) => {
    const cr = D.CRIT[i + "|" + j] || [];
    const st = D.STRUCT[i + "|" + j] || [];
    lines.push([
      c.n, c.c, c.reg, c.sec, c.s, c.rev, c.fy,
      p[0], p[1], p[2], TIER[p[2]] || "",
      cr[0] === undefined ? "" : cr[0], CRITL[cr[0]] || "", cr[1] || "",
      st[0] || "", STRUCTL[st[0]] || "", st[1] || "", st[2] || ""
    ]);
  });
});

// ---- companies
const cos = [["Company", "Country", "Region", "Industry", "Segment", "Revenue", "FiscalYear",
  "Depth", "ProductLines", "IndianChampion", "ExportControlNote"]];
D.COMPANIES.forEach((c) => cos.push([
  c.n, c.c, c.reg, c.sec, c.s, c.rev, c.fy, c.depth, c.prod.length, c.champ || "", c.exp || ""
]));

// ---- chokepoints joined to their core technology
const techByChoke = {};
D.TECHS.forEach((t) => { techByChoke[t.k] = t; });
const chk = [["Chokepoint", "Industry", "HeldBy", "WhatItBlocks", "RecursIn",
  "CoreTechnology", "TechnologyClass", "TechnologyClassMeaning",
  "WhatItActuallyIs", "WhyItIsHard", "WhereIndiaStands"]];
D.CHOKES.forEach((k) => {
  const t = techByChoke[k.n] || {};
  chk.push([k.n, k.sec, k.by, k.blocks, k.in,
    t.n || "", t.cls || "", t.cls ? D.TECHCLASS[t.cls].d : "",
    t.what || "", t.hard || "", t.ind || ""]);
});

// ---- the core technology register on its own
const tch = [["CoreTechnology", "Chokepoint", "Industry", "Class", "ClassMeaning",
  "WhatItActuallyIs", "WhyItIsHard", "WhereIndiaStands"]];
D.TECHS.forEach((t) => tch.push([
  t.n, t.k, t.sec, t.cls, D.TECHCLASS[t.cls].d, t.what, t.hard, t.ind
]));

// ---- who could build it, ranked by what is actually stopping them
const bld = [["IndianFirm", "Industry", "WhatItCouldBuild", "AdjacentCapability",
  "Barrier", "BarrierRank", "BarrierMeaning", "WhatIsStoppingThem"]];
D.BUILDERS.slice()
  .sort((a, b) => (BARRANK[a.bar] || 9) - (BARRANK[b.bar] || 9))
  .forEach((b) => bld.push([
    b.n, b.sec, b.could, b.where, b.bar || "", BARRANK[b.bar] || "",
    b.bar ? D.BARRIER[b.bar].d : "", b.barwhy || ""
  ]));

// ---- champions and traps
const chp = [["IndianFirm", "Industry", "CompetesWith", "What"]];
D.CHAMPIONS.forEach((c) => chp.push([c.n, c.sec, c.vs, c.what]));

const trp = [["Entity", "ControlledBy", "Why"]];
D.TRAPS.forEach((t) => trp.push([t.n, t.by, t.why]));

console.log("exporting:");
write("product-lines.csv", lines);
write("companies.csv", cos);
write("chokepoints.csv", chk);
write("core-technologies.csv", tch);
write("could-build-it.csv", bld);
write("indian-champions.csv", chp);
write("tier-b-traps.csv", trp);

fs.writeFileSync(path.join(OUT, "ledger.json"), JSON.stringify({
  version: version,
  dataAsOf: asOf,
  datasetDigest: digest,
  taxonomy: { tier: TIER, criticality: CRITL, marketStructure: STRUCTL,
              barrier: D.BARRIER, technologyClass: D.TECHCLASS },
  companies: D.COMPANIES.map((c, i) => ({
    name: c.n, country: c.c, region: c.reg, industry: c.sec, segment: c.s,
    revenue: c.rev, fiscalYear: c.fy, depth: c.depth, indianChampion: c.champ || null,
    exportControlNote: c.exp || null,
    productLines: c.prod.map((p, j) => {
      const cr = D.CRIT[i + "|" + j] || [], st = D.STRUCT[i + "|" + j] || [];
      return {
        line: p[0], indianSide: p[1], tier: p[2],
        criticality: cr[0] === undefined ? null : cr[0], criticalityWhy: cr[1] || null,
        marketStructure: st[0] || null, knownSuppliers: st[1] || null, indianEntrants: st[2] || null
      };
    })
  })),
  chokepoints: D.CHOKES.map((k) => ({
    name: k.n, industry: k.sec, heldBy: k.by, blocks: k.blocks, recursIn: k.in,
    coreTechnology: techByChoke[k.n] ? techByChoke[k.n].n : null
  })),
  coreTechnologies: D.TECHS.map((t) => ({
    name: t.n, chokepoint: t.k, industry: t.sec, class: t.cls,
    whatItActuallyIs: t.what, whyItIsHard: t.hard, whereIndiaStands: t.ind
  })),
  couldBuildIt: D.BUILDERS.map((b) => ({
    firm: b.n, industry: b.sec, couldBuild: b.could, adjacentCapability: b.where,
    barrier: b.bar || null, whatIsStoppingThem: b.barwhy || null
  })),
  indianChampions: D.CHAMPIONS.map((c) => ({ firm: c.n, industry: c.sec, competesWith: c.vs, what: c.what })),
  tierBTraps: D.TRAPS.map((t) => ({ entity: t.n, controlledBy: t.by, why: t.why }))
}, null, 1));
console.log("  data/ledger.json");
