
(function () {
  var DEPTH = [
    { l: "Absent", d: "India has essentially no presence in this company's core business." },
    { l: "Component", d: "India supplies parts or assembles; the design and value-dense layers are foreign." },
    { l: "System", d: "Indian firms build and sell the finished system, on foreign components." },
    { l: "Full stack", d: "Indian firms compete with their own IP through the value chain." }
  ];
  var TIERLBL = { A: "Tier A", B: "Tier B", C: "Tier C", Z: "None" };
  var CRITLBL = { 3: "Critical", 2: "High", 1: "Standard" };
  var STAND = { A: "India competes", B: "Foreign-controlled", C: "Assembly only", Z: "No Indian presence" };
  var MKT = { M: "Monopoly", D: "Duopoly", O: "Few suppliers", C: "Competitive" };
  var STANDSHORT = { A: "competes", B: "foreign-controlled", C: "assembly", Z: "absent" };
  var $ = function (s) { return document.querySelector(s); };
  var all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var rxEsc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
  var hl = function (s, q) {
    var e = esc(s);
    if (!q) return e;
    return e.replace(new RegExp("(" + rxEsc(q) + ")", "ig"), "<mark>$1</mark>");
  };
  var hit = function (q) {
    var lq = q.toLowerCase();
    return function (s) { return String(s).toLowerCase().indexOf(lq) > -1; };
  };

  var allGaps = [];
  COMPANIES.forEach(function (c, idx) {
    (c.gaps || []).forEach(function (g) { allGaps.push({ co: c.n, g: g[0], e: g[1], s: g[2], i: idx }); });
  });
  var order = { open: 0, closing: 1, closed: 2, none: 3 };
  allGaps.sort(function (a, b) { return order[a.s] - order[b.s]; });

  // ---------- counters ----------
  $("#counters").innerHTML = [
    [COMPANIES.length, "Incumbents reviewed"],
    [COMPANIES.filter(function (c) { return c.depth >= 2; }).length, "India competes at system level"],
    [COMPANIES.filter(function (c) { return c.depth === 0; }).length, "India absent entirely"],
    [allGaps.filter(function (g) { return g.s === "open"; }).length, "Gaps with no credible entrant"],
    [allGaps.filter(function (g) { return g.s === "closing"; }).length, "Gaps someone is closing"],
    [CHOKES.length, "Recurring chokepoints"]
  ].map(function (x) {
    return '<div class="ctr"><div class="n">' + x[0] + '</div><div class="l">' + x[1] + "</div></div>";
  }).join("");

  var countries = COMPANIES.map(function (c) { return c.c; })
    .filter(function (v, i, a) { return v && a.indexOf(v) === i; })
    .sort(function (a, b) {
      var na = COMPANIES.filter(function (c) { return c.c === a; }).length,
          nb = COMPANIES.filter(function (c) { return c.c === b; }).length;
      return nb - na || a.localeCompare(b);
    });
  if ($("#ctry")) $("#ctry").innerHTML = '<option value="">All countries</option>' +
    countries.map(function (s) {
      var n = COMPANIES.filter(function (c) { return c.c === s; }).length;
      return '<option value="' + esc(s) + '">' + esc(s) + " (" + n + ")</option>";
    }).join("");
  if ($("#ctry")) $("#ctry").addEventListener("change", function () { ctryFilter = $("#ctry").value; renderAll(); });

  var regions = COMPANIES.map(function (c) { return c.reg; })
    .filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
  if ($("#regn")) $("#regn").innerHTML = '<option value="">All regions</option>' +
    regions.map(function (s) {
      var n = COMPANIES.filter(function (c) { return c.reg === s; }).length;
      return '<option value="' + esc(s) + '">' + esc(s) + " (" + n + ")</option>";
    }).join("");
  if ($("#regn")) $("#regn").addEventListener("change", function () { regFilter = $("#regn").value; renderAll(); renderRegions(); });

  var sectors = COMPANIES.map(function (c) { return c.sec; })
    .filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
  if ($("#sect")) $("#sect").innerHTML = '<option value="">All industries</option>' +
    sectors.map(function (s) {
      var n = COMPANIES.filter(function (c) { return c.sec === s; }).length;
      return '<option value="' + esc(s) + '">' + esc(s) + " (" + n + ")</option>";
    }).join("");

  // ---------- matchers ----------
  function mCompany(c, h) {
    return h(c.n) || h(c.s) || h(c.sec) || h(c.c) || h(c.reg) || h(c.champ) || h(c.exp) ||
      (c.prod || []).some(function (p) { return h(p[0]) || h(p[1]); }) ||
      (c.gaps || []).some(function (g) { return h(g[0]) || h(g[1]); }) ||
      (c.prod || []).some(function (p, j) {
        var idx = COMPANIES.indexOf(c), k = CRIT[idx + "|" + j],
            m = typeof STRUCT !== "undefined" ? STRUCT[idx + "|" + j] : null;
        return (k && h(k[1])) || (m && (h(m[1]) || h(m[2]) || h(MKT[m[0]])));
      });
  }
  var mGap = function (g, h) { return h(g.g) || h(g.e) || h(g.co) || h(g.s); };
  var mChamp = function (c, h) { return h(c.n) || h(c.vs) || h(c.holds); };
  var mTrap = function (t, h) { return h(t.n) || h(t.by) || h(t.why); };
  var mChoke = function (k, h) { return h(k.n) || h(k.by) || h(k.blocks) || h(k.in); };
  // BUILDERS and SECOND are matched inline in renderAll

  // ---------- card builders ----------
  function spine(d) {
    var segs = "", cls = d === 3 ? "s3" : d === 2 ? "s2" : "s1";
    for (var i = 0; i < 3; i++) segs += '<div class="seg' + (i < d ? " on " + cls : "") + '"></div>';
    return '<div class="spine"><div class="spine-track">' + segs +
      '</div><div class="spine-lab"><span>Material</span><span>Component</span><span>System</span></div></div>';
  }
  function cardHTML(c, q) {
    var i = COMPANIES.indexOf(c), none = c.champ.indexOf("none") > -1;
    return '<button class="card d' + c.depth + (c.mit ? ' mit' : '') + (c.kei ? ' kei' : '') + (c.chae ? ' chae' : '') + '" data-nav="company" data-key="' + esc(c.n) + '">' +
      '<div class="top"><h3>' + hl(c.n, q) + '</h3><span class="pill">' + esc(c.c) + "</span></div>" +
      '<div class="sector">' + hl(c.s, q) + "</div>" +
      '<div class="rev">' + esc(c.rev) + " <span>&middot; " + esc(c.fy) + "</span></div>" +
      spine(c.depth) +
      '<div class="champ' + (none ? " none" : "") + '"><span class="dot"></span><span>Indian counterpart <b>' +
      hl(c.champ, q) + "</b></span></div>" +
      (function () {
        var t = TIERCOUNT[i];
        return '<div class="tiercount">' + ["A", "B", "C", "Z"].filter(function (k) { return t[k]; })
          .map(function (k) { return '<span class="' + k + '">' + t[k] + " " + STANDSHORT[k] + "</span>"; }).join("") + "</div>";
      })() + "</button>";
  }
  function gapCard(g, q) {
    return '<button class="icard" data-i="' + g.i + '">' +
      '<div class="ihead"><h4>' + hl(g.g, q) + '</h4><span class="status ' + g.s + '">' + g.s + "</span></div>" +
      '<p class="body">' + hl(g.e, q) + '</p><div class="foot"><span>' + hl(g.co, q) + "</span></div></button>";
  }
  function champCard(c, q) {
    return '<div class="icard navcard" data-nav="champion" data-key="' + esc(c.n) + '"><div class="ihead"><h4>' + hl(c.n, q) +
      '</h4><span class="status tA">Tier A</span></div><p class="body">' + hl(c.holds, q) +
      '</p><div class="foot"><span>Competes with ' + hl(c.vs, q) + "</span></div></div>";
  }
  function trapCard(t, q) {
    return '<div class="icard"><div class="ihead"><h4>' + hl(t.n, q) +
      '</h4><span class="status ctrl">Tier B</span></div><p class="body">' + hl(t.why, q) +
      '</p><div class="foot"><span>Controlled by ' + hl(t.by, q) + "</span></div></div>";
  }
  var mTech = function (t, h) { return h(t.n) || h(t.k) || h(t.what) || h(t.hard) || h(t.ind); };
  function clsTag(c) {
    if (!c || !TECHCLASS[c]) return "";
    return '<span class="tcls c' + c + '">' + esc(TECHCLASS[c].l) + "</span>";
  }
  function techOf(chokeName) {
    return TECHS.filter(function (t) { return t.k === chokeName; })[0] || null;
  }
  function techCard(t, q) {
    return '<div class="icard tcard navcard" data-nav="tech" data-key="' + esc(t.n) + '">' +
      '<div class="ihead"><h4>' + hl(t.n, q) + "</h4>" + clsTag(t.cls) + "</div>" +
      '<div class="tmeta"><span class="sectag">' + esc(t.sec || "") + "</span></div>" +
      '<p class="body">' + hl(t.what, q) + "</p>" +
      '<div class="foot"><span>Behind ' + hl(t.k, q) + "</span></div></div>";
  }
  function chokeCard(k, q) {
    return '<div class="icard navcard" data-nav="choke" data-key="' + esc(k.n) + '"><div class="ihead"><h4>' + hl(k.n, q) +
      '</h4><span class="sectag">' + esc(k.sec || "") + '</span></div><p class="body">' + hl(k.blocks, q) +
      '</p><div class="foot"><span>Held by ' + hl(k.by, q) + '</span><span>Seen in ' + hl(k.in, q) + "</span></div></div>";
  }
  function barTag(b) {
    if (!b.bar) return "";
    return '<span class="bar b' + b.bar.charAt(0) + '">' + esc(BARRIER[b.bar].l) + "</span>";
  }
  function buildCard(b, q) {
    return '<div class="icard build navcard" data-nav="builder" data-key="' + esc(b.n) + '"><div class="ihead"><h4>' + hl(b.n, q) +
      '</h4>' + barTag(b) + '</div>' +
      '<div class="where">' + hl(b.where, q) + ' &middot; ' + esc(b.sec || "") + '</div>' +
      '<p class="could">' + hl(b.could, q) + '</p>' +
      '<p class="body">' + hl(b.why, q) + '</p>' +
      (b.barwhy ? '<p class="barwhy"><b>What is stopping them:</b> ' + hl(b.barwhy, q) + "</p>" : "") +
      "</div>";
  }
  function secondCard(r, q) {
    return '<div class="icard"><div class="ihead"><h4>' + hl(r[0], q) +
      '</h4><span class="sectag">' + esc(r[5] || "") + '</span></div>' +
      '<p class="could">' + hl(r[1], q) + '</p>' +
      (r[4] ? '<p class="body">' + hl(r[4], q) + "</p>" : "") +
      '<div class="foot"><span>India: ' + hl(r[2], q) + '</span><span>Closest: ' + hl(r[3], q) + "</span></div></div>";
  }
  function mirrorCard(r, q) {
    var s = r[3], cls = /^Present/i.test(s) ? "yes" : (/^Absent/i.test(s) ? "no" : "part");
    var lbl = /^Present/i.test(s) ? "Present" : (/^Absent/i.test(s) ? "Absent" : (/^Weak/i.test(s) ? "Weak" : /^Shallow/i.test(s) ? "Shallow" : "Partial"));
    return '<div class="icard mir"><div class="ihead"><h4>' + hl(r[0], q) +
      '</h4><span class="st ' + cls + '">' + lbl + "</span></div>" +
      '<p class="jp">Japan: <b>' + hl(r[1], q) + '</b></p>' +
      '<p class="body">India: ' + hl(r[2], q) + '</p>' +
      '<div class="foot"><span>' + hl(s, q) + "</span></div></div>";
  }
  function none(q, what) {
    return '<div class="empty">No ' + what + " match &ldquo;" + esc(q) +
      "&rdquo;. The search runs across every view &mdash; check the tab badges above to see where it did land.</div>";
  }

  // ---------- render all five views for a query ----------
  var depthFilter = null, mitFilter = null, keiFilter = null, chaeFilter = null, ctryFilter = "", regFilter = "", tierFilter = null;
  var TIERCOUNT = COMPANIES.map(function (c) {
    var t = { A: 0, B: 0, C: 0, Z: 0 };
    c.prod.forEach(function (p) { t[p[2]] = (t[p[2]] || 0) + 1; });
    return t;
  });
  var INDS = (function () {
    var s = {};
    BUILDERS.forEach(function (b) { if (b.sec) s[b.sec] = 1; });
    SECOND.forEach(function (r) { if (r[5]) s[r[5]] = 1; });
    CHOKES.forEach(function (k) { if (k.sec) s[k.sec] = 1; });
    return Object.keys(s).sort();
  })();
  function fillInd(id) {
    var el = $(id); if (!el) return;
    el.innerHTML = '<option value="">All industries</option>' +
      INDS.map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("");
    el.addEventListener("change", renderAll);
  }
  var state = { q: "", counts: {} };

  function renderAll() {
    var q = state.q, h = hit(q), searching = q.length >= 2;

    // companies (also honours sector + depth filters)
    var sec = $("#sect") ? $("#sect").value : "";
    var co = COMPANIES.filter(function (c) {
      if (sec && c.sec !== sec) return false;
      if (depthFilter !== null && c.depth !== depthFilter) return false;
      if (mitFilter !== null && !!c.mit !== mitFilter) return false;
      if (keiFilter !== null && !!c.kei !== keiFilter) return false;
      if (chaeFilter !== null && !!c.chae !== chaeFilter) return false;
      if (ctryFilter && c.c !== ctryFilter) return false;
      if (regFilter && c.reg !== regFilter) return false;
      if (tierFilter && !TIERCOUNT[COMPANIES.indexOf(c)][tierFilter]) return false;
      return !searching || mCompany(c, h);
    });
    var giants = co.filter(function (c) { return !c.mit; });
    var mits = co.filter(function (c) { return c.mit; });
    $("#grid").innerHTML = co.map(function (c) { return cardHTML(c, q); }).join("") ||
      (searching ? none(q, "incumbents")
        : '<div class="empty">No companies match this combination of filters. Clear the industry, region, country, tier, depth, Mittelstand or Keiretsu filter to see all ' + COMPANIES.length + ".</div>");
    $("#count").textContent = co.length + " of " + COMPANIES.length;

    var mitAll = COMPANIES.filter(function (c) { return c.mit; });
    var mitList = searching ? mitAll.filter(function (c) { return mCompany(c, h); }) : mitAll;
    $("#mitgrid").innerHTML = mitList.map(function (c) { return cardHTML(c, q); }).join("") ||
      none(q, "chokepoint holders");
    $("#countm").textContent = mitList.length + (searching ? " of " + mitAll.length : "") + " chokepoint holders";

    var keiAll = COMPANIES.filter(function (c) { return c.kei; });
    var keiList = searching ? keiAll.filter(function (c) { return mCompany(c, h); }) : keiAll;
    $("#keigrid").innerHTML = keiList.map(function (c) { return cardHTML(c, q); }).join("") || none(q, "keiretsu groups");
    $("#countk2").textContent = keiList.length + (searching ? " of " + keiAll.length : "") + " groups";
    var chaeAll = COMPANIES.filter(function (c) { return c.chae; });
    var chaeList = searching ? chaeAll.filter(function (c) { return mCompany(c, h); }) : chaeAll;
    $("#chaegrid").innerHTML = chaeList.map(function (c) { return cardHTML(c, q); }).join("") || none(q, "chaebol groups");
    $("#countce").textContent = chaeList.length + (searching ? " of " + chaeAll.length : "") + " groups";

    var mr = searching ? MIRROR.filter(function (r) { return r.some(function (x) { return h(x); }); }) : MIRROR;
    $("#mirrorgrid").innerHTML = mr.map(function (r) { return mirrorCard(r, q); }).join("") || "";

    var indB = $("#indB") ? $("#indB").value : "";
    var bd = (searching ? BUILDERS.filter(function (b) { return h(b.n) || h(b.could) || h(b.why) || h(b.where) || h(b.sec) || h(b.barwhy); }) : BUILDERS)
      .filter(function (b) { return !barFilter || b.bar === barFilter; })
      .filter(function (b) { return !indB || b.sec === indB; });
    var BORD = { DECISION: 0, QUALIFICATION: 1, CAPITAL: 2, TECHNOLOGY: 3 };
    function bord(v) { return v in BORD ? BORD[v] : 9; }
    bd = bd.slice().sort(function (x, y) { return bord(x.bar) - bord(y.bar); });
    $("#buildgrid").innerHTML = bd.map(function (b) { return buildCard(b, q); }).join("") ||
      '<div class="empty">No Indian builders in this industry. Clear the filter to see all ' + BUILDERS.length + ".</div>";
    var sc = (searching ? SECOND.filter(function (r) { return r.some(function (x) { return h(x); }); }) : SECOND)
      .filter(function (r) { return !indB || r[5] === indB; });
    $("#secondgrid").innerHTML = sc.map(function (r) { return secondCard(r, q); }).join("") ||
      '<div class="empty">No second-tier holders in this industry.</div>';
    if ($("#countb")) $("#countb").textContent = bd.length + " builders \u00b7 " + sc.length + " chokepoint holders";

    var gp = searching ? allGaps.filter(function (g) { return mGap(g, h); }) : allGaps;
    $("#gapgrid").innerHTML = gp.map(function (g) { return gapCard(g, q); }).join("") || none(q, "gaps");
    $("#countg").textContent = gp.length + (searching ? " of " + allGaps.length : "") + " gaps";

    var ch = searching ? CHAMPIONS.filter(function (c) { return mChamp(c, h); }) : CHAMPIONS;
    $("#champgrid").innerHTML = ch.map(function (c) { return champCard(c, q); }).join("") || none(q, "champions");
    $("#countc").textContent = ch.length + (searching ? " of " + CHAMPIONS.length : "") + " firms";

    var tr = searching ? TRAPS.filter(function (t) { return mTrap(t, h); }) : TRAPS;
    $("#trapgrid").innerHTML = tr.map(function (t) { return trapCard(t, q); }).join("") || none(q, "entries");
    $("#countt").textContent = tr.length + (searching ? " of " + TRAPS.length : "") + " entries";

    var indK = $("#indK") ? $("#indK").value : "";
    var ck = (searching ? CHOKES.filter(function (k) { return mChoke(k, h) || h(k.sec); }) : CHOKES)
      .filter(function (k) { return !indK || k.sec === indK; });
    $("#chokegrid").innerHTML = ck.map(function (k) { return chokeCard(k, q); }).join("") ||
      '<div class="empty">No chokepoints in this industry. Clear the filter to see all ' + CHOKES.length + ".</div>";
    $("#countk").textContent = ck.length + (indK || searching ? " of " + CHOKES.length : "") + " chokepoints";

    var indT = $("#indT") ? $("#indT").value : "";
    var tc = (searching ? TECHS.filter(function (t) { return mTech(t, h) || h(t.sec); }) : TECHS)
      .filter(function (t) { return !indT || t.sec === indT; })
      .filter(function (t) { return !clsFilter || t.cls === clsFilter; });
    if ($("#techgrid")) {
      $("#techgrid").innerHTML = tc.map(function (t) { return techCard(t, q); }).join("") ||
        '<div class="empty">Nothing matches that filter. Clear it to see all ' + TECHS.length + ".</div>";
      $("#countT").textContent = tc.length +
        (indT || clsFilter || searching ? " of " + TECHS.length : "") + " core technologies";
    }

    // combined view
    var total = co.length + gp.length + ch.length + tr.length + ck.length + bd.length + sc.length + keiList.length + mr.length + chaeList.length + tc.length;
    if (searching) {
      var out = "";
      function grp(t, n, body, cls) {
        return '<div class="resgrp"><h3>' + t + "<span>" + n + ' matched</span></h3><div class="grid' +
          (cls || " wide") + '">' + body + "</div></div>";
      }
      if (co.length) out += grp("Incumbents", co.length, co.map(function (c) { return cardHTML(c, q); }).join(""), "");
      if (gp.length) out += grp("Gaps &amp; who is entering", gp.length, gp.map(function (g) { return gapCard(g, q); }).join(""));
      if (ch.length) out += grp("Indian champions", ch.length, ch.map(function (c) { return champCard(c, q); }).join(""));
      if (tr.length) out += grp("Tier B traps", tr.length, tr.map(function (t) { return trapCard(t, q); }).join(""));
      if (ck.length) out += grp("Chokepoints", ck.length, ck.map(function (k) { return chokeCard(k, q); }).join(""));
      if (tc.length) out += grp("Core technologies", tc.length, tc.map(function (t) { return techCard(t, q); }).join(""));
      if (keiList.length) out += grp("Keiretsu groups", keiList.length, keiList.map(function (c) { return cardHTML(c, q); }).join(""));
      if (chaeList.length) out += grp("Chaebol groups", chaeList.length, chaeList.map(function (c) { return cardHTML(c, q); }).join(""));
      if (mr.length) out += grp("Zaibatsu mechanisms vs the Indian business house", mr.length, mr.map(function (r) { return mirrorCard(r, q); }).join(""));
      if (bd.length) out += grp("Indian firms that could build it", bd.length, bd.map(function (b) { return buildCard(b, q); }).join(""));
      if (sc.length) out += grp("Second-tier chokepoint holders", sc.length, sc.map(function (r) { return secondCard(r, q); }).join(""));
      $("#resLede").innerHTML = total
        ? "<b>" + total + "</b> result" + (total === 1 ? "" : "s") + " for &ldquo;" + esc(q) +
          "&rdquo; across every view. Each tab is filtered to the same search &mdash; the badges show where the matches are."
        : "";
      $("#resBody").innerHTML = out ||
        '<div class="empty">Nothing anywhere for &ldquo;' + esc(q) +
        '&rdquo;. This searches company names, product lines, Indian firms, gaps, entrants, chokepoints and control notes &mdash; try a shorter term, or a sector like <b>semiconductor</b> or <b>dialysis</b>.</div>';
    }

    state.counts = { companies: co.length, gaps: gp.length, champions: ch.length, traps: tr.length,
      chokes: ck.length, industries: 0, india: 0, regions: 0, mittelstand: mitList.length, keiretsu: keiList.length + mr.length, chaebol: chaeList.length,
      builders: bd.length + sc.length, results: total };
    updateTabs(searching);
  }

  function updateTabs(searching) {
    $("#tabAll").hidden = !searching;
    all(".tab").forEach(function (t) {
      var v = t.dataset.view, n = state.counts[v];
      var label = t.textContent.replace(/\s*\d+$/, "").trim();
      if (!t.dataset.label) t.dataset.label = t.querySelector(".bdg")
        ? t.childNodes[0].textContent.trim() : label;
      t.innerHTML = t.dataset.label + (searching ? ' <span class="bdg">' + n + "</span>" : "");
      t.classList.toggle("dim", searching && !n);
    });
  }

  // ---------- filters ----------
  if ($("#sect")) $("#sect").addEventListener("change", function () { renderAll(); renderRegions(); });
  all(".chip[data-depth]").forEach(function (b) {
    b.addEventListener("click", function () {
      var d = +b.dataset.depth, on = depthFilter === d;
      depthFilter = on ? null : d;
      all(".chip[data-depth]").forEach(function (x) {
        x.setAttribute("aria-pressed", String(!on && +x.dataset.depth === d));
      });
      renderAll();
    });
  });

  all(".chip[data-tier]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.dataset.tier, on = tierFilter === t;
      tierFilter = on ? null : t;
      all(".chip[data-tier]").forEach(function (x) {
        x.setAttribute("aria-pressed", String(!on && x.dataset.tier === t));
      });
      renderAll();
    });
  });

  if ($("#chaeChip")) $("#chaeChip").addEventListener("click", function () {
    chaeFilter = chaeFilter === true ? null : true;
    if (chaeFilter) {
      mitFilter = null; keiFilter = null;
      ($("#mitChip") || { setAttribute: function () {} }).setAttribute("aria-pressed", "false");
      ($("#keiChip") || { setAttribute: function () {} }).setAttribute("aria-pressed", "false");
    }
    ($("#chaeChip") || { setAttribute: function () {} }).setAttribute("aria-pressed", String(chaeFilter === true));
    renderAll();
  });

  if ($("#keiChip")) $("#keiChip").addEventListener("click", function () {
    keiFilter = keiFilter === true ? null : true;
    if (keiFilter) { mitFilter = null; chaeFilter = null; ($("#mitChip") || { setAttribute: function () {} }).setAttribute("aria-pressed", "false"); ($("#chaeChip") || { setAttribute: function () {} }).setAttribute("aria-pressed", "false"); }
    ($("#keiChip") || { setAttribute: function () {} }).setAttribute("aria-pressed", String(keiFilter === true));
    renderAll();
  });

  if ($("#mitChip")) $("#mitChip").addEventListener("click", function () {
    mitFilter = mitFilter === true ? null : true;
    if (mitFilter) { keiFilter = null; chaeFilter = null; ($("#keiChip") || { setAttribute: function () {} }).setAttribute("aria-pressed", "false"); ($("#chaeChip") || { setAttribute: function () {} }).setAttribute("aria-pressed", "false"); }
    ($("#mitChip") || { setAttribute: function () {} }).setAttribute("aria-pressed", String(mitFilter === true));
    renderAll();
  });

  // ---------- core technology filters ----------
  var clsFilter = null;
  (function () {
    var box = $("#clschips");
    if (box) {
      var order = ["PROCESS", "MATERIAL", "PRECISION", "DESIGN", "SOFTWARE", "STANDARD"];
      box.innerHTML = order.map(function (k) {
        var n = TECHS.filter(function (t) { return t.cls === k; }).length;
        return '<button class="chip cls" data-cls="' + k + '" aria-pressed="false" title="' +
          esc(TECHCLASS[k].d) + '">' + esc(TECHCLASS[k].l) + " <b>" + n + "</b></button>";
      }).join("");
      box.addEventListener("click", function (e) {
        var b = e.target.closest("[data-cls]");
        if (!b) return;
        clsFilter = clsFilter === b.dataset.cls ? null : b.dataset.cls;
        all("#clschips .chip").forEach(function (x) {
          x.setAttribute("aria-pressed", String(x.dataset.cls === clsFilter));
          x.classList.toggle("on", x.dataset.cls === clsFilter);
        });
        renderAll();
      });
    }
    var sel = $("#indT");
    if (sel) {
      var secs = [];
      TECHS.forEach(function (t) { if (secs.indexOf(t.sec) < 0) secs.push(t.sec); });
      secs.sort();
      sel.innerHTML = '<option value="">All industries</option>' +
        secs.map(function (s) {
          var n = TECHS.filter(function (t) { return t.sec === s; }).length;
          return '<option value="' + esc(s) + '">' + esc(s) + " (" + n + ")</option>";
        }).join("");
      sel.addEventListener("change", renderAll);
    }
  })();

  // ---------- tabs ----------
  var activeTab = "industries";
  function showTab(v) {
    activeTab = v;
    all(".tab").forEach(function (x) { x.setAttribute("aria-selected", String(x.dataset.view === v)); });
    all(".view").forEach(function (s) { s.hidden = s.id !== "view-" + v; });
  }
  all(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      navStack = []; $("#detailLayer").hidden = true;
      showTab(t.dataset.view);
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  });

  // ---------- search ----------
  $("#gq").addEventListener("input", function () {
    var prev = state.q;
    state.q = $("#gq").value.trim();
    $("#clearQ").hidden = !state.q;
    renderAll();
    // first keystroke of a search jumps to the combined view; after that stay put
    if (state.q.length >= 2 && prev.length < 2) showTab("results");
    if (state.q.length < 2 && activeTab === "results") showTab("industries");
  });
  $("#clearQ").addEventListener("click", function () {
    $("#gq").value = ""; state.q = ""; $("#clearQ").hidden = true;
    renderAll(); showTab("industries"); $("#gq").focus();
  });

  // ---------- India roll-up ----------
  var LEAGUE = (function () {
    function rx(f) {
      return new RegExp("(^|[^A-Za-z0-9&.-])" + f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^A-Za-z0-9&.-]|$)", "i");
    }
    var R = {}, t = {};
    INDIAN_FIRMS.forEach(function (f) { R[f] = rx(f); t[f] = { lines: 0, cos: {}, crit: 0 }; });
    COMPANIES.forEach(function (c, i) {
      c.prod.forEach(function (p, j) {
        var cr = CRIT[i + "|" + j];
        INDIAN_FIRMS.forEach(function (f) {
          if (R[f].test(p[1] || "")) {
            t[f].lines++; t[f].cos[c.n] = 1;
            if (cr && cr[0] === 3) t[f].crit++;
          }
        });
      });
    });
    return INDIAN_FIRMS.map(function (f) {
      return { n: f, lines: t[f].lines, cos: Object.keys(t[f].cos).length, crit: t[f].crit };
    }).filter(function (r) { return r.lines > 0; })
      .sort(function (a, b) { return b.crit - a.crit || b.lines - a.lines; });
  })();

  var SECROLL = (function () {
    var m = {};
    COMPANIES.forEach(function (c, i) {
      var s = c.s;
      if (!m[s]) m[s] = { A: 0, B: 0, C: 0, Z: 0, crit: 0, n: 0 };
      c.prod.forEach(function (p, j) {
        m[s][p[2]] = (m[s][p[2]] || 0) + 1; m[s].n++;
        var cr = CRIT[i + "|" + j]; if (cr && cr[0] === 3) m[s].crit++;
      });
    });
    return Object.keys(m).map(function (k) { var o = m[k]; o.s = k; o.pct = o.A / o.n; return o; })
      .sort(function (a, b) { return b.n - a.n; });
  })();

  // ---------- industry index ----------
  var INDUSTRY = (function () {
    var m = {};
    function slot(s) {
      return m[s] || (m[s] = { sec: s, cos: [], lines: 0, A: 0, B: 0, C: 0, Z: 0,
        crit: 0, critA: 0, mono: [], gaps: [], champs: {} });
    }
    COMPANIES.forEach(function (c, i) {
      var o = slot(c.sec);
      o.cos.push({ c: c, i: i });
      c.prod.forEach(function (p, j) {
        o.lines++; o[p[2]]++;
        var cr = CRIT[i + "|" + j], st = STRUCT[i + "|" + j];
        if (cr && cr[0] === 3) { o.crit++; if (p[2] === "A") o.critA++; }
        if (st && (st[0] === "M" || st[0] === "D")) {
          o.mono.push({ co: c.n, p: p[0], k: st[0], who: st[1] });
        }
        if (p[1]) {
          CHAMPIONS.forEach(function (ch) {
            var base = ch.n.split(" (")[0].split(" / ")[0];
            if (base.length > 3 && p[1].indexOf(base) >= 0) o.champs[ch.n] = ch;
          });
        }
      });
      (c.gaps || []).forEach(function (g) { o.gaps.push({ co: c.n, g: g[0], e: g[1], s: g[2], i: i }); });
    });
    Object.keys(m).forEach(function (k) {
      var o = m[k];
      o.chokes = CHOKES.filter(function (x) { return x.sec === k; });
      o.builders = BUILDERS.filter(function (x) { return x.sec === k; });
      o.second = SECOND.filter(function (r) { return r[5] === k; });
      o.champions = Object.keys(o.champs).map(function (n) { return o.champs[n]; });
      o.pctCrit = o.crit ? o.critA / o.crit : 0;
      o.pctA = o.lines ? o.A / o.lines : 0;
      o.open = o.gaps.filter(function (x) { return x.s === "open"; }).length;
    });
    return m;
  })();

  var indSort = "crit", barFilter = "";

  function indCard(o) {
    var pc = Math.round(o.pctCrit * 100),
        cls = pc >= 45 ? "hi" : (pc >= 25 ? "mid" : "lo");
    return '<div class="icard ind navcard" data-nav="industry" data-key="' + esc(o.sec) + '">' +
      '<div class="ihead"><h4>' + esc(o.sec) + '</h4><span class="sectag">' + o.cos.length + " firms</span></div>" +
      '<div class="big ' + cls + '">' + pc + "%</div>" +
      '<div class="sub">of ' + o.crit + " critical lines India holds</div>" +
      '<div class="bar">' + ["A", "C", "B", "Z"].filter(function (k) { return o[k]; })
        .map(function (k) { return '<i class="' + k + '" style="width:' + (o[k] / o.lines * 100) + '%"></i>'; }).join("") +
      "</div>" +
      '<div class="mini"><span>Lines <b>' + o.lines + "</b></span>" +
      "<span>Competes <b>" + Math.round(o.pctA * 100) + "%</b></span>" +
      "<span>Chokepoints <b>" + o.chokes.length + "</b></span>" +
      "<span>Open gaps <b>" + o.open + "</b></span>" +
      "<span>Builders <b>" + o.builders.length + "</b></span></div></div>";
  }

  function renderIndustries() {
    var list = Object.keys(INDUSTRY).map(function (k) { return INDUSTRY[k]; });
    list.sort(indSort === "crit"
      ? function (a, b) { return a.pctCrit - b.pctCrit || b.crit - a.crit; }
      : function (a, b) { return b.lines - a.lines; });
    $("#countind").textContent = list.length + " industries \u00b7 " +
      COMPANIES.length + " incumbents \u00b7 " +
      list.reduce(function (s, o) { return s + o.lines; }, 0) + " product lines";
    $("#indgrid").innerHTML = list.map(indCard).join("");
  }

  function openIndustryHTML(sec) {
    var o = INDUSTRY[sec]; if (!o) return "<p>Not found.</p>";
    function sect(t, n) { return '<h3 class="sect">' + esc(t) + "<span>" + n + "</span></h3>"; }

    var html = '<div class="dhead"><h2>' + esc(sec) + '</h2><div class="meta">Industry &middot; ' +
      o.cos.length + " incumbents &middot; " + o.lines + " product lines</div></div>";

    html += '<div class="statrow">' + [
      [o.cos.length, "Incumbents"], [o.lines, "Product lines"],
      [Math.round(o.pctA * 100) + "%", "India competes"],
      [o.crit, "Critical lines"],
      [Math.round(o.pctCrit * 100) + "%", "Critical held"],
      [o.mono.length, "Monopoly / duopoly"],
      [o.open, "Open gaps"]
    ].map(function (x) { return '<div class="s"><div class="v">' + x[0] + '</div><div class="k">' + x[1] + "</div></div>"; }).join("") + "</div>";

    if (o.chokes.length) {
      html += sect("Chokepoints", o.chokes.length) + '<div class="grid wide">' +
        o.chokes.map(function (k) { return chokeCard(k, ""); }).join("") + "</div>";
    }
    var ctl = TECHS.filter(function (t) { return t.sec === sec; });
    if (ctl.length) {
      html += sect("Core technologies behind them", ctl.length) + '<div class="grid wide">' +
        ctl.map(function (t) { return techCard(t, ""); }).join("") + "</div>";
    }
    if (o.mono.length) {
      html += sect("Monopoly & duopoly lines", o.mono.length) + '<div class="icard">' +
        o.mono.map(function (x) {
          return '<div class="monoline"><b>' + esc(x.co) + "</b> \u2014 " + esc(x.p) +
            '<i class="' + x.k + '">' + (x.k === "M" ? "Monopoly" : "Duopoly") + "</i></div>";
        }).join("") + "</div>";
    }
    html += sect("Incumbents", o.cos.length) + '<div class="grid">' +
      o.cos.map(function (x) { return cardHTML(x.c, ""); }).join("") + "</div>";

    var gopen = o.gaps.filter(function (x) { return x.s === "open"; }),
        gclose = o.gaps.filter(function (x) { return x.s !== "open"; });
    if (o.gaps.length) {
      html += sect("Gaps", o.gaps.length + " \u00b7 " + gopen.length + " open") + '<div class="grid wide">' +
        gopen.concat(gclose).map(function (x) { return gapCard(x, ""); }).join("") + "</div>";
    }
    if (o.champions.length) {
      html += sect("Indian champions", o.champions.length) + '<div class="grid wide">' +
        o.champions.map(function (c) { return champCard(c, ""); }).join("") + "</div>";
    }
    if (o.builders.length) {
      html += sect("Could build it", o.builders.length) + '<div class="grid wide">' +
        o.builders.map(function (b) { return buildCard(b, ""); }).join("") + "</div>";
    }
    if (o.second.length) {
      html += sect("Second-tier chokepoint holders", o.second.length) + '<div class="grid wide">' +
        o.second.map(function (r) { return secondCard(r, ""); }).join("") + "</div>";
    }
    return html;
  }


  function regionStats(pred) {
    var lines = 0, t = { A: 0, B: 0, C: 0, Z: 0 }, crit = 0, critA = 0, mono = 0, cos = 0;
    COMPANIES.forEach(function (c, i) {
      if (!pred(c)) return;
      cos++;
      c.prod.forEach(function (p, j) {
        lines++; t[p[2]]++;
        var cr = CRIT[i + "|" + j], st = STRUCT[i + "|" + j];
        if (cr && cr[0] === 3) { crit++; if (p[2] === "A") critA++; }
        if (st && (st[0] === "M" || st[0] === "D")) mono++;
      });
    });
    return { cos: cos, lines: lines, A: t.A, C: t.C, B: t.B, Z: t.Z, crit: crit, critA: critA, mono: mono };
  }

  function regCard(title, sub, s, navKey) {
    if (!s.lines) return "";
    return '<div class="icard regcard' + (navKey ? ' navcard" data-nav="region" data-key="' + esc(navKey) : '') +
      '"><div class="ihead"><h4>' + esc(title) +
      '</h4><span class="sectag">' + s.cos + " companies</span></div>" +
      '<div class="big">' + Math.round(s.critA / (s.crit || 1) * 100) + "%</div>" +
      '<div class="sub">of critical lines India holds</div>' +
      '<div class="kv2"><span>' + esc(sub) + '</span><b></b>' +
      "<span>Product lines</span><b>" + s.lines + "</b>" +
      "<span>India competes</span><b>" + s.A + " (" + Math.round(s.A / s.lines * 100) + "%)</b>" +
      "<span>No Indian presence</span><b>" + s.Z + " (" + Math.round(s.Z / s.lines * 100) + "%)</b>" +
      "<span>Critical lines</span><b>" + s.crit + "</b>" +
      "<span>Monopoly / duopoly lines</span><b>" + s.mono + "</b></div></div>";
  }



  function renderRegions() {
    var regs = COMPANIES.map(function (c) { return c.reg; })
      .filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
    var ORDER = ["North America", "Europe", "East Asia"];
    var ordered = ORDER.filter(function (r) { return regs.indexOf(r) >= 0; })
      .concat(regs.filter(function (r) { return ORDER.indexOf(r) < 0; }));
    $("#regiongrid").innerHTML =
      ordered.map(function (r) {
        return regCard(r, "Incumbents headquartered in " + r, regionStats(function (c) { return c.reg === r; }), r);
      }).join("");

    var split = [
      ["Large corporations", "Diversified groups — many ordinary fronts to attack", function (c) { return !c.mit && !c.kei && !c.chae; }],
      ["Mittelstand & niche firms", "Single-specialisation firms — no ordinary line to win", function (c) { return c.mit; }],
      ["Japanese keiretsu", "Cross-held groups with supplier pyramids", function (c) { return c.kei; }],
      ["Korean chaebol", "Family-controlled, vertically integrated", function (c) { return c.chae; }],
      ["European large corporations", "The DAX and CAC names", function (c) { return c.reg === "Europe" && !c.mit; }],
      ["European niche firms", "The layer holding most of the ledger's chokepoints", function (c) { return c.reg === "Europe" && c.mit; }]
    ];
    $("#modelsplitgrid").innerHTML = split.map(function (x) {
      return regCard(x[0], x[1], regionStats(x[2]));
    }).join("");

    var rk = COMPANIES.map(function (c, i) {
      var t = TIERCOUNT[i], crit = 0, critA = 0;
      c.prod.forEach(function (p, j) {
        var cr = CRIT[i + "|" + j];
        if (cr && cr[0] === 3) { crit++; if (p[2] === "A") critA++; }
      });
      return { n: c.n, reg: c.reg, sec: c.sec, mit: !!c.mit, lines: c.prod.length,
               A: t.A, crit: crit, critA: critA, pct: t.A / c.prod.length };
    });
    var regF = $("#regn") ? $("#regn").value : "", secF = $("#sect") ? $("#sect").value : "";
    rk = rk.filter(function (r) { return (!regF || r.reg === regF) && (!secF || r.sec === secF); })
           .sort(function (a, b) { return a.pct - b.pct; });
    $("#countrk").textContent = rk.length + " incumbents \u00b7 sorted weakest first";
    $("#ranktbl").innerHTML = "<thead><tr><th>Incumbent</th><th>Region</th><th>Type</th><th>Lines India competes on</th><th>Critical held</th></tr></thead><tbody>" +
      rk.map(function (r) {
        return '<tr><td class="co">' + esc(r.n) + "</td><td>" + esc(r.reg) + "</td><td>" +
          (r.mit ? "Niche" : "Large") + '</td><td class="num">' + r.A + " of " + r.lines +
          "  (" + Math.round(r.pct * 100) + '%)</td><td class="num crit">' + r.critA + " of " + r.crit + "</td></tr>";
      }).join("") + "</tbody>";

    var byReg = {};
    COMPANIES.forEach(function (c, i) {
      c.prod.forEach(function (p, j) {
        var st = STRUCT[i + "|" + j];
        if (st && (st[0] === "M" || st[0] === "D")) {
          (byReg[c.reg] = byReg[c.reg] || []).push({ co: c.n, p: p[0], k: st[0], who: st[1] });
        }
      });
    });
    $("#monogrid").innerHTML = Object.keys(byReg).sort(function (a, b) {
      return byReg[b].length - byReg[a].length;
    }).map(function (r) {
      return '<div class="icard"><div class="ihead"><h4>' + esc(r) +
        '</h4><span class="sectag">' + byReg[r].length + " lines</span></div>" +
        byReg[r].map(function (x) {
          return '<div class="monoline"><b>' + esc(x.co) + "</b> \u2014 " + esc(x.p) +
            '<i class="' + x.k + '">' + (x.k === "M" ? "Monopoly" : "Duopoly") + "</i></div>";
        }).join("") + "</div>";
    }).join("");
  }

  function renderIndia() {
    var tot = 0, A = 0, Z = 0, crit = 0, critA = 0;
    COMPANIES.forEach(function (c, i) {
      c.prod.forEach(function (p, j) {
        tot++; if (p[2] === "A") A++; if (p[2] === "Z") Z++;
        var cr = CRIT[i + "|" + j];
        if (cr && cr[0] === 3) { crit++; if (p[2] === "A") critA++; }
      });
    });
    $("#indiaCounters").innerHTML = [
      [tot, "Product lines audited"],
      [A + " (" + Math.round(A / tot * 100) + "%)", "India competes with its own IP"],
      [Z + " (" + Math.round(Z / tot * 100) + "%)", "No Indian presence at all"],
      [crit, "Lines rated critical"],
      [critA + " (" + Math.round(critA / crit * 100) + "%)", "Critical lines India holds"],
      [LEAGUE.length, "Distinct Indian firms named"]
    ].map(function (x) {
      return '<div class="ctr"><div class="n">' + x[0] + '</div><div class="l">' + x[1] + "</div></div>";
    }).join("");

    $("#modelgrid").innerHTML = MODELS.map(function (r) {
      var st = r[5], cls = st === "Present" ? "yes" : (st === "Absent" ? "no" : "part");
      return '<div class="icard mdl"><div class="ihead"><h4>' + esc(r[0]) +
        '</h4><span class="st ' + cls + '">' + esc(st) + "</span></div>" +
        (r[1] !== "\u2014" ? '<p class="col"><b>Germany</b>' + esc(r[1]) + "</p>" : "") +
        (r[2] !== "\u2014" ? '<p class="col"><b>Japan</b>' + esc(r[2]) + "</p>" : "") +
        (r[3] !== "\u2014" ? '<p class="col"><b>France</b>' + esc(r[3]) + "</p>" : "") +
        '<p class="col ind"><b>India</b>' + esc(r[4]) + "</p></div>";
    }).join("");

    var top = LEAGUE.slice(0, 40);
    $("#countl").textContent = LEAGUE.length + " Indian firms named across the ledger \u00b7 top 40 shown";
    $("#leaguetbl").innerHTML = "<thead><tr><th>Indian firm</th><th>Product lines</th><th>Foreign incumbents faced</th><th>Critical lines held</th></tr></thead><tbody>" +
      top.map(function (r) {
        return '<tr><td class="co">' + esc(r.n) + '</td><td class="num">' + r.lines +
          '</td><td class="num">' + r.cos + '</td><td class="num crit">' + r.crit + "</td></tr>";
      }).join("") + "</tbody>";

    $("#sectorgrid").innerHTML = SECROLL.map(function (o) {
      var seg = ["A", "B", "C", "Z"].filter(function (k) { return o[k]; })
        .map(function (k) { return '<i class="' + k + '" style="width:' + (o[k] / o.n * 100) + '%"></i>'; }).join("");
      return '<div class="icard"><div class="ihead"><h4>' + esc(o.s) +
        '</h4><span class="sectag">' + o.n + " lines</span></div>" +
        '<div class="bar">' + seg + "</div>" +
        '<p class="body">' + o.A + " competes \u00b7 " + o.C + " assembly only \u00b7 " + o.B +
        " foreign-controlled \u00b7 " + o.Z + " absent</p>" +
        '<div class="foot"><span>' + o.crit + " critical lines</span><span>India holds " +
        Math.round(o.pct * 100) + "%</span></div></div>";
    }).join("");
  }

  // ---------- drill-down router ----------
  var navStack = [];

  function coIndex(name) { return COMPANIES.findIndex(function (c) { return c.n === name; }); }
  function firmMentions(name) {
    var base = name.split(" (")[0].split(" \u2014 ")[0], out = [];
    if (base.length < 4) return out;
    COMPANIES.forEach(function (c, i) {
      c.prod.forEach(function (p, j) {
        var st = STRUCT[i + "|" + j];
        if ((p[1] && p[1].indexOf(base) >= 0) || (st && st[2] && st[2].indexOf(base) >= 0)) {
          out.push({ co: c, i: i, p: p, j: j, cr: CRIT[i + "|" + j], st: st });
        }
      });
    });
    return out;
  }
  function navBtns(items) {
    if (!items.length) return "";
    return '<div class="linkrow">' + items.map(function (x) {
      return '<button data-nav="' + x[0] + '" data-key="' + esc(x[1]) + '">' + esc(x[2]) + "</button>";
    }).join("") + "</div>";
  }
  function sect2(t, n) { return '<h3 class="sect">' + esc(t) + (n !== undefined ? "<span>" + n + "</span>" : "") + "</h3>"; }

  function prodRow(x) {
    var cr = x.cr || [], st = x.st || [];
    return '<div class="prow"><div class="pt"><h5>' + esc(x.p[0]) +
      '</h5><span class="status ' + (x.p[2] === "A" ? "closing" : "open") + '">' + esc(STAND[x.p[2]]) + "</span></div>" +
      '<dl class="kv3"><dt>Indian side</dt><dd>' + esc(x.p[1] || "\u2014") + "</dd>" +
      (cr[0] ? "<dt>Criticality</dt><dd>" + esc(CRITLBL[cr[0]]) + " \u2014 " + esc(cr[1]) + "</dd>" : "") +
      (st[0] ? "<dt>Market</dt><dd>" + esc(MKT[st[0]]) + (st[1] ? " \u2014 " + esc(st[1]) : "") + "</dd>" : "") +
      (st[2] ? "<dt>Entrants</dt><dd>" + esc(st[2]) + "</dd>" : "") + "</dl></div>";
  }

  function detailCompany(name) {
    var i = coIndex(name); if (i < 0) return "<p>Not found.</p>";
    var c = COMPANIES[i], t = TIERCOUNT[i], crit = 0, critA = 0;
    c.prod.forEach(function (p, j) { var k = CRIT[i + "|" + j]; if (k && k[0] === 3) { crit++; if (p[2] === "A") critA++; } });
    var ck = CHOKES.filter(function (k) { return (k.in || "").indexOf(c.n.split(" (")[0]) >= 0; });
    var h = '<div class="dhead"><h2>' + esc(c.n) + "</h2>" +
      '<div class="meta">' + esc(c.sec) + " &middot; " + esc(c.c) + " &middot; " + esc(c.rev) + " (" + esc(c.fy) + ")" +
      " &middot; " + esc(DEPTH[c.depth].l) + '</div><p class="lead">' + esc(c.exp) + "</p></div>";
    h += navBtns([["industry", c.sec, "\u2192 " + c.sec], ["region", c.reg, "\u2192 " + c.reg]]);
    h += '<div class="statrow" style="margin-top:18px">' + [
      [c.prod.length, "Product lines"], [t.A, "India competes"], [t.C, "Assembly only"], [t.Z, "Absent"],
      [crit, "Critical lines"], [critA + " / " + crit, "Critical held"], [c.gaps.length, "Gaps"]
    ].map(function (x) { return '<div class="s"><div class="v">' + x[0] + '</div><div class="k">' + x[1] + "</div></div>"; }).join("") + "</div>";
    var TIERINFO = {
      A: ["Tier A", "Indian-owned with Indian IP \u2014 India competes on the technology itself."],
      C: ["Tier C", "Indian-owned, foreign technology \u2014 the company is Indian, the IP that matters is licensed."],
      B: ["Tier B", "Foreign-controlled \u2014 an Indian name and presence under foreign ownership."],
      Z: ["Tier Z", "No Indian presence at any tier."]
    };
    ["A", "C", "B", "Z"].forEach(function (t) {
      var rows = [];
      c.prod.forEach(function (p, j) { if (p[2] === t) rows.push({ p: p, cr: CRIT[i + "|" + j], st: STRUCT[i + "|" + j] }); });
      if (!rows.length) return;
      h += '<h3 class="sect tier' + t + '">' + esc(TIERINFO[t][0]) + "<span>" + rows.length + "</span></h3>" +
        '<p class="tierlede">' + esc(TIERINFO[t][1]) + "</p>" +
        rows.map(function (x) { return prodRow(x); }).join("");
    });
    if (c.gaps.length) h += sect2("Gaps", c.gaps.length) + '<div class="grid wide">' +
      c.gaps.map(function (g) { return gapCard({ co: c.n, g: g[0], e: g[1], s: g[2], i: i }, ""); }).join("") + "</div>";
    if (ck.length) h += sect2("Chokepoints it sits on", ck.length) + '<div class="grid wide">' +
      ck.map(function (k) { return '<div class="icard navcard" data-nav="choke" data-key="' + esc(k.n) + '">' +
        '<div class="ihead"><h4>' + esc(k.n) + '</h4><span class="sectag">' + esc(k.sec || "") + "</span></div>" +
        '<p class="body">' + esc(k.blocks) + "</p></div>"; }).join("") + "</div>";
    return h;
  }

  function detailChoke(name) {
    var k = CHOKES.filter(function (x) { return x.n === name; })[0];
    if (!k) return "<p>Not found.</p>";
    var seen = (k.in || "").split("\u00b7").map(function (s) { return s.trim(); }).filter(Boolean);
    var lines = [];
    COMPANIES.forEach(function (c, i) {
      c.prod.forEach(function (p, j) {
        var st = STRUCT[i + "|" + j], cr = CRIT[i + "|" + j];
        if (cr && cr[0] === 3 && st && (st[0] === "M" || st[0] === "D" || st[0] === "O") &&
            seen.some(function (s) { return s && c.n.indexOf(s.split(" (")[0]) >= 0; })) {
          lines.push({ co: c, p: p, cr: cr, st: st });
        }
      });
    });
    var bd = BUILDERS.filter(function (b) { return b.sec === k.sec; });
    var h = '<div class="dhead"><h2>' + esc(k.n) + "</h2>" +
      '<div class="meta">Chokepoint &middot; ' + esc(k.sec || "") + '</div>' +
      '<p class="lead">' + esc(k.blocks) + "</p></div>";
    h += '<div class="prow" style="margin-top:18px"><dl class="kv3"><dt>Held by</dt><dd>' + esc(k.by) +
      "</dd><dt>Recurs in</dt><dd>" + esc(k.in) + "</dd></dl></div>";
    var ct = techOf(k.n);
    if (ct) {
      h += '<div class="corebox"><div class="cb-k">The specific core technology</div>' +
        '<div class="cb-n"><button data-nav="tech" data-key="' + esc(ct.n) + '">' + esc(ct.n) +
        "</button></div>" +
        '<div class="tmeta">' + clsTag(ct.cls) + "</div>" +
        '<div class="tblk"><h5>What it actually is</h5><p>' + esc(ct.what) + "</p></div>" +
        '<div class="tblk"><h5>Why it is hard</h5><p>' + esc(ct.hard) + "</p></div>" +
        '<div class="tblk indpos"><h5>Where India stands on it</h5><p>' + esc(ct.ind) + "</p></div></div>";
    }
    h += navBtns(seen.filter(function (s) { return coIndex(s) >= 0 || COMPANIES.some(function (c) { return c.n.indexOf(s) === 0; }); })
      .map(function (s) {
        var m = COMPANIES.filter(function (c) { return c.n.indexOf(s) === 0; })[0];
        return m ? ["company", m.n, "\u2192 " + m.n] : null;
      }).filter(Boolean).concat([["industry", k.sec, "\u2192 " + k.sec]]));
    if (lines.length) h += sect2("Critical lines behind it", lines.length) +
      lines.slice(0, 20).map(function (x) { return prodRow(x); }).join("");
    if (bd.length) h += sect2("Who could build it", bd.length) + '<div class="grid wide">' +
      bd.map(function (b) { return '<div class="icard build navcard" data-nav="builder" data-key="' + esc(b.n) + '">' +
        '<div class="ihead"><h4>' + esc(b.n) + '</h4><span class="sectag">' + esc(b.where) + "</span></div>" +
        '<p class="body">' + esc(b.could) + "</p></div>"; }).join("") + "</div>";
    return h;
  }

  function detailTech(name) {
    var t = TECHS.filter(function (x) { return x.n === name; })[0] ||
            TECHS.filter(function (x) { return x.n.indexOf(name) === 0; })[0];
    if (!t) return "<p>Not found.</p>";
    var k = CHOKES.filter(function (x) { return x.n === t.k; })[0];
    var bd = BUILDERS.filter(function (b) { return b.sec === t.sec; });
    var ch = CHAMPIONS.filter(function (c) { return c.sec === t.sec; });

    var h = '<div class="dhead"><h2>' + esc(t.n) + "</h2>" +
      '<div class="meta">Core technology &middot; ' + esc(TECHCLASS[t.cls].l) + " &middot; " +
      esc(t.sec) + "</div>" +
      '<div class="tmeta" style="margin-top:12px">' + clsTag(t.cls) + "</div>" +
      '<p class="clsnote">' + esc(TECHCLASS[t.cls].d) + "</p></div>";

    h += '<div class="tblk"><h5>What it actually is</h5><p>' + esc(t.what) + "</p></div>";
    h += '<div class="tblk"><h5>Why it is hard</h5><p>' + esc(t.hard) + "</p></div>";
    h += '<div class="tblk indpos"><h5>Where India stands on this specific technology</h5><p>' +
      esc(t.ind) + "</p></div>";

    if (k) {
      h += '<div class="corebox"><div class="cb-k">The chokepoint it sits under</div>' +
        '<div class="cb-n"><button data-nav="choke" data-key="' + esc(k.n) + '">' + esc(k.n) +
        "</button></div>" +
        '<dl class="kv3"><dt>Held by</dt><dd>' + esc(k.by) + "</dd>" +
        "<dt>Recurs in</dt><dd>" + esc(k.in) + "</dd></dl></div>";
    }
    h += navBtns([["industry", t.sec, "\u2192 " + t.sec]].concat(k ? [["choke", k.n, "\u2192 chokepoint detail"]] : []));

    var sameCls = TECHS.filter(function (x) { return x.cls === t.cls && x.n !== t.n; });
    if (ch.length) h += sect2("Indian champions in this industry", ch.length) + '<div class="grid wide">' +
      ch.slice(0, 12).map(function (c) { return champCard(c, ""); }).join("") + "</div>";
    if (bd.length) h += sect2("Who could build in this industry", bd.length) + '<div class="grid wide">' +
      bd.map(function (b) { return buildCard(b, ""); }).join("") + "</div>";
    if (sameCls.length) h += sect2("Other " + TECHCLASS[t.cls].l.toLowerCase() + " technologies", sameCls.length) +
      '<div class="grid wide">' + sameCls.slice(0, 12).map(function (x) { return techCard(x, ""); }).join("") + "</div>";
    return h;
  }

  function detailFirm(name, kind) {
    var pool = kind === "champion" ? CHAMPIONS : BUILDERS;
    var rec = pool.filter(function (x) { return x.n === name; })[0] ||
              pool.filter(function (x) { return x.n.indexOf(name) === 0; })[0] ||
              pool.filter(function (x) { return x.n.indexOf(name) >= 0; })[0];
    if (!rec) return "<p>Not found.</p>";
    var m = firmMentions(name);
    var h = '<div class="dhead"><h2>' + esc(name) + "</h2>" +
      '<div class="meta">' + (kind === "champion" ? "Indian champion" : "Could build it \u00b7 " + esc(rec.where || "")) + "</div>" +
      '<p class="lead">' + esc(kind === "champion" ? rec.holds : rec.why) + "</p></div>";
    h += '<div class="prow" style="margin-top:18px"><dl class="kv3">' +
      (kind === "champion" ? "<dt>Competes with</dt><dd>" + esc(rec.vs) + "</dd>"
                           : "<dt>Could build</dt><dd>" + esc(rec.could) + "</dd><dt>Industry</dt><dd>" + esc(rec.sec || "") + "</dd>" +
                             (rec.bar ? "<dt>Barrier</dt><dd><b>" + esc(BARRIER[rec.bar].l) + "</b> \u2014 " + esc(BARRIER[rec.bar].d) + "</dd>" +
                                        "<dt>In this case</dt><dd>" + esc(rec.barwhy || "") + "</dd>" : "")) +
      "</dl></div>";
    if (m.length) {
      h += sect2("Where it appears in the ledger", m.length);
      h += m.slice(0, 24).map(function (x) {
        return '<div class="prow navcard" data-nav="company" data-key="' + esc(x.co.n) + '">' +
          '<div class="pt"><h5>' + esc(x.p[0]) + '</h5><span class="sectag">' + esc(x.co.n) + "</span></div>" +
          '<dl class="kv3"><dt>Standing</dt><dd>' + esc(STAND[x.p[2]]) + "</dd>" +
          (x.cr && x.cr[0] ? "<dt>Criticality</dt><dd>" + esc(CRITLBL[x.cr[0]]) + "</dd>" : "") + "</dl></div>";
      }).join("");
    }
    return h;
  }

  function detailRegion(name) {
    var s = regionStats(function (c) { return c.reg === name; });
    var cos = COMPANIES.filter(function (c) { return c.reg === name; });
    var idx = cos.map(function (c) { return COMPANIES.indexOf(c); });
    var h = '<div class="dhead"><h2>' + esc(name) + '</h2><div class="meta">Region &middot; ' +
      cos.length + " incumbents &middot; " + s.lines + " product lines</div></div>";
    h += '<div class="statrow" style="margin-top:18px">' + [
      [cos.length, "Incumbents"], [s.lines, "Product lines"],
      [Math.round(s.A / s.lines * 100) + "%", "India competes"],
      [s.crit, "Critical lines"], [Math.round(s.critA / (s.crit || 1) * 100) + "%", "Critical held"],
      [s.mono, "Monopoly / duopoly"]
    ].map(function (x) { return '<div class="s"><div class="v">' + x[0] + '</div><div class="k">' + x[1] + "</div></div>"; }).join("") + "</div>";

    // countries within the region
    var byC = {};
    cos.forEach(function (c) {
      var k = c.c, o = byC[k] = byC[k] || { n: 0, lines: 0, crit: 0, critA: 0 };
      var i = COMPANIES.indexOf(c); o.n++;
      c.prod.forEach(function (p, j) { o.lines++; var cr = CRIT[i + "|" + j];
        if (cr && cr[0] === 3) { o.crit++; if (p[2] === "A") o.critA++; } });
    });
    var ck = Object.keys(byC).sort(function (x, y) {
      return (byC[x].critA / (byC[x].crit || 1)) - (byC[y].critA / (byC[y].crit || 1)); });
    h += sect2("Countries, weakest first", ck.length) + '<div class="grid wide">' +
      ck.map(function (k) { var o = byC[k], pc = Math.round(o.critA / (o.crit || 1) * 100);
        return '<div class="icard"><div class="ihead"><h4>' + esc(k) + '</h4><span class="status ' +
          (pc < 20 ? "open" : pc < 45 ? "closing" : "closed") + '">' + pc + "% critical held</span></div>" +
          '<p class="body">' + o.n + " firm" + (o.n > 1 ? "s" : "") + " &middot; " + o.lines +
          " lines &middot; " + o.crit + " critical, India holds " + o.critA + ".</p></div>"; }).join("") + "</div>";

    // industries this region dominates
    var bySec = {};
    cos.forEach(function (c) { bySec[c.sec] = (bySec[c.sec] || 0) + 1; });
    var sk = Object.keys(bySec).sort(function (x, y) { return bySec[y] - bySec[x]; });
    h += sect2("Industries it sits in", sk.length) + '<div class="grid wide">' +
      sk.map(function (k) {
        return '<div class="icard ind navcard" data-nav="industry" data-key="' + esc(k) + '">' +
          '<div class="ihead"><h4>' + esc(k) + '</h4><span class="sectag">' + bySec[k] + " firms</span></div>" +
          '<p class="body">' + (INDUSTRY[k] ? Math.round(INDUSTRY[k].pctCrit * 100) + "% of critical lines held across the whole industry." : "") +
          "</p></div>"; }).join("") + "</div>";

    // chokepoints anchored here
    var names = cos.map(function (c) { return c.n.split(" (")[0]; });
    var ck2 = CHOKES.filter(function (k) { return names.some(function (n) { return (k.in || "").indexOf(n) >= 0; }); });
    if (ck2.length) h += sect2("Chokepoints anchored here", ck2.length) + '<div class="grid wide">' +
      ck2.map(function (k) { return '<div class="icard navcard" data-nav="choke" data-key="' + esc(k.n) + '">' +
        '<div class="ihead"><h4>' + esc(k.n) + '</h4><span class="sectag">' + esc(k.sec || "") + "</span></div>" +
        '<p class="body">' + esc(k.blocks) + "</p></div>"; }).join("") + "</div>";

    h += sect2("Incumbents, weakest Indian position first", cos.length) + '<div class="grid">' +
      cos.slice().sort(function (x, y) {
        var a1 = TIERCOUNT[COMPANIES.indexOf(x)], b1 = TIERCOUNT[COMPANIES.indexOf(y)];
        return (a1.A / x.prod.length) - (b1.A / y.prod.length); })
        .map(function (c) { return cardHTML(c, ""); }).join("") + "</div>";
    return h;
  }

  var TABLABEL = {
    industries: "industries", companies: "companies", gaps: "the gap register",
    champions: "Indian champions", traps: "Tier B traps", mittelstand: "Mittelstand",
    keiretsu: "keiretsu", chaebol: "chaebol", builders: "who could build it",
    chokes: "chokepoints", techs: "core technologies", regions: "regions",
    india: "Indian manufacturing", results: "all matches"
  };
  function renderDetail() {
    var top = navStack[navStack.length - 1];
    if (!top) { $("#detailLayer").hidden = true; all(".view").forEach(function (v) { v.hidden = v.id !== "view-" + activeTab; }); return; }
    all(".view").forEach(function (v) { v.hidden = true; });
    $("#detailLayer").hidden = false;
    $("#crumbs").innerHTML =
      '<button data-crumb="-1">\u2190 Back to ' + esc(TABLABEL[activeTab] || activeTab) + "</button>" +
      navStack.map(function (n, i) {
        var last = i === navStack.length - 1;
        return '<span class="sep">/</span>' + (last
          ? '<span class="here">' + esc(n.key) + "</span>"
          : '<button data-crumb="' + i + '">' + esc(n.key) + "</button>");
      }).join("");
    var html = top.type === "company" ? detailCompany(top.key)
      : top.type === "industry" ? (openIndustryHTML(top.key))
      : top.type === "choke" ? detailChoke(top.key)
      : top.type === "champion" ? detailFirm(top.key, "champion")
      : top.type === "builder" ? detailFirm(top.key, "builder")
      : top.type === "tech" ? detailTech(top.key)
      : top.type === "region" ? detailRegion(top.key)
      : "<p>Nothing here.</p>";
    $("#detailBody").innerHTML = html;
    window.scrollTo(0, 0);
  }
  function pushDetail(type, key) { navStack.push({ type: type, key: key }); renderDetail(); }
  function popTo(i) { navStack = i < 0 ? [] : navStack.slice(0, i + 1); renderDetail(); }

  document.addEventListener("click", function (e) {
    var cr = e.target.closest && e.target.closest("[data-crumb]");
    if (cr) { popTo(+cr.dataset.crumb); return; }
    var nv = e.target.closest && e.target.closest("[data-nav]");
    if (nv && nv.dataset.key) { pushDetail(nv.dataset.nav, nv.dataset.key); return; }
  });

  // ---------- drawer ----------
  var lastFocus = null;
  function openSheet(i) {
    var c = COMPANIES[i];
    lastFocus = document.activeElement;
    $("#sheet").innerHTML =
      '<div class="sheet-hd"><div><h2 id="sheetName">' + esc(c.n) + "</h2>" +
      '<div class="sector" style="margin:7px 0 0">' + esc(c.sec || c.s) + " &middot; " + esc(c.s) + " &middot; " + esc(c.c) + "</div></div>" +
      '<button class="close" id="closeBtn">Close</button></div><div class="sheet-body">' +
      '<div class="blk"><dl class="kv"><dt>Revenue</dt><dd>' + esc(c.rev) +
      ' <span style="color:var(--ink-faint)">(' + esc(c.fy) + ")</span></dd>" +
      "<dt>India reaches</dt><dd><b>" + DEPTH[c.depth].l + "</b> &mdash; " + DEPTH[c.depth].d + "</dd>" +
      "<dt>Counterpart</dt><dd>" + esc(c.champ) + "</dd></dl></div>" +
      (function () {
        var pr = c.prod || [], n = pr.length;
        var cnt = { A: 0, B: 0, C: 0, Z: 0 };
        pr.forEach(function (p) { cnt[p[2]] = (cnt[p[2]] || 0) + 1; });
        var bar = ["A", "B", "C", "Z"].filter(function (t) { return cnt[t]; })
          .map(function (t) { return '<i class="' + t + '" style="width:' + (cnt[t] / n * 100) + '%"></i>'; }).join("");
        var key = [["A", "India competes", "--tierA"], ["B", "Foreign-controlled", "--tierB"],
                   ["C", "Assembly only", "--mat"], ["Z", "No Indian presence", "--gap"]]
          .filter(function (x) { return cnt[x[0]]; })
          .map(function (x) {
            return '<span><em style="background:var(' + x[2] + ')"></em><b>' + cnt[x[0]] + "</b> " + x[1] + "</span>";
          }).join("");
        return '<div class="blk"><h3>Products &amp; services<span class="pcount">' + n +
          ' lines</span></h3><div class="tierbar">' + bar + '</div><div class="tierkey">' + key + "</div>" +
          '<div class="critkey"><span><i style="background:var(--gap)"></i><b>Critical</b> \u2014 chokepoint</span>' +
          '<span><i style="background:var(--tierB)"></i><b>High</b> \u2014 value capture</span>' +
          '<span><i style="background:var(--ink-faint)"></i><b>Standard</b> \u2014 substitutable</span></div>' +
          pr.map(function (p, j) {
            var k = CRIT[i + "|" + j];
            return '<div class="prow"><div class="ptop"><span class="pl">' + esc(p[0]) +
              '</span><span class="pr">' + esc(p[1]) + '<span class="stand ' + p[2] + '">' + STAND[p[2]] +
              "</span></span></div>" +
              (k ? '<div class="crit c' + k[0] + '"><span class="clabel">' + CRITLBL[k[0]] +
                '</span><span class="cwhy">' + esc(k[1]) + "</span></div>" : "") +
              (function () {
                var m = typeof STRUCT !== "undefined" ? STRUCT[i + "|" + j] : null;
                if (!m) return "";
                return '<div class="mkt"><span class="ml ' + m[0] + '">' + MKT[m[0]] + "</span>" + esc(m[1]) +
                  (m[2] ? '<span class="ent"><b>Indian entrants:</b> ' + esc(m[2]) + "</span>"
                        : '<span class="noent">No Indian MSME, SME or startup found under this line.</span>') + "</div>";
              })() + "</div>";
          }).join("") + "</div>";
      })() +
      '<div class="blk"><h3>Gaps and who is entering</h3>' +
      (c.gaps || []).map(function (g) {
        return '<div class="gitem"><div class="gt"><b>' + esc(g[0]) + '</b><span class="status ' + g[2] + '">' +
          g[2] + '</span></div><p class="note">' + esc(g[1]) + "</p></div>";
      }).join("") + "</div>" +
      '<div class="blk"><h3>Control &amp; exposure</h3><p class="note">' + esc(c.exp) + "</p></div></div>";
    $("#drawer").hidden = false;
    document.body.style.overflow = "hidden";
    $("#closeBtn").focus();
    $("#closeBtn").addEventListener("click", closeSheet);
  }
  function closeSheet() {
    $("#drawer").hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-i]");
    if (b && !e.target.closest("[data-nav]")) {
      var g = allGaps[0] && COMPANIES[+b.dataset.i];
      if (g) pushDetail("company", COMPANIES[+b.dataset.i].n);
    }
  });
  $("#drawer").addEventListener("click", function (e) { if (e.target.id === "drawer") closeSheet(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!$("#drawer").hidden) closeSheet();
      else if ($("#gq").value) $("#clearQ").click();
    }
    if (e.key === "/" && document.activeElement !== $("#gq")) { e.preventDefault(); $("#gq").focus(); }
  });

  // ---------- live counts in the static ledes ----------
  (function () {
    var w = ["none", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
             "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
             "nineteen", "twenty"];
    function word(n) {
      if (n <= 20) return w[n];
      var tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? "-" + w[n % 10] : "");
      return String(n);
    }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function put(id, txt) { var el = $("#" + id); if (el) el.textContent = txt; }
    function nbar(k) { return BUILDERS.filter(function (b) { return b.bar === k; }).length; }
    put("bDec", cap(word(nbar("DECISION"))));
    put("bTot", word(BUILDERS.length));
    put("bTech", cap(word(nbar("TECHNOLOGY"))));
    put("bCap", word(nbar("CAPITAL")));
    put("bQual", word(nbar("QUALIFICATION")));
    put("secN", cap(word(SECOND.length)));
  })();

  $("#foot").textContent =
    "Tier A = Indian-owned with Indian IP. Tier B = foreign-controlled regardless of Indian listing. " +
    "Tier C = Indian-owned, foreign technology. Figures are as reported by each company for the fiscal year shown; " +
    "verify before relying on any single number. Press / to search, Esc to clear.";

  renderIndustries();
  $("#sortCrit").addEventListener("click", function () {
    indSort = "crit"; $("#sortCrit").setAttribute("aria-pressed", "true");
    $("#sortSize").setAttribute("aria-pressed", "false"); renderIndustries();
  });
  $("#sortSize").addEventListener("click", function () {
    indSort = "size"; $("#sortSize").setAttribute("aria-pressed", "true");
    $("#sortCrit").setAttribute("aria-pressed", "false"); renderIndustries();
  });
  renderIndia();
  (function () {
    var host = $("#barchips"); if (!host) return;
    var counts = {}; BUILDERS.forEach(function (b) { counts[b.bar] = (counts[b.bar] || 0) + 1; });
    host.innerHTML = '<button class="chip on" data-bar="">All ' + BUILDERS.length + "</button>" +
      ["DECISION", "QUALIFICATION", "CAPITAL", "TECHNOLOGY"].map(function (k) {
        return '<button class="chip b' + k.charAt(0) + '" data-bar="' + k + '" title="' + esc(BARRIER[k].d) + '">' +
          esc(BARRIER[k].l) + " " + (counts[k] || 0) + "</button>";
      }).join("");
    host.addEventListener("click", function (e) {
      var c = e.target.closest("[data-bar]"); if (!c) return;
      barFilter = c.dataset.bar;
      all("#barchips .chip").forEach(function (x) { x.classList.toggle("on", x.dataset.bar === barFilter); });
      renderAll();
    });
  })();
  renderRegions();
  fillInd("#indB");
  fillInd("#indK");
  renderAll();
  showTab("industries");
})();

