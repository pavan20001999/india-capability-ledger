#!/usr/bin/env node
/**
 * India Capability Ledger — build.
 * Inlines src/data.js and src/app.js into src/shell.html and writes a single
 * self-contained HTML file. No dependencies, no network, no build chain.
 *
 *   node build.js            -> index.html
 *   node build.js out.html   -> out.html
 */
const fs = require("fs");
const path = require("path");

const SRC = fs.existsSync(path.join(__dirname, "src"))
  ? path.join(__dirname, "src")
  : __dirname;

const read = (f) => fs.readFileSync(path.join(SRC, f), "utf8");

const shell = read("shell.html");
const data = read("data.js");
const app = read("app.js");

// --- parse checks: a syntax error here is a blank page in the browser.
for (const [name, body] of [["data.js", data], ["app.js", app]]) {
  try {
    new Function(body);
  } catch (e) {
    console.error("SYNTAX ERROR in " + name + ": " + e.message);
    process.exit(1);
  }
}

// The stamp is derived from the sources, never from the clock: a wall-clock
// stamp would make every rebuild differ and defeat the CI drift check.
// VERSION holds two lines: the version number, and the date the data is good as of.
const [version, asOf] = fs
  .readFileSync(path.join(__dirname, "VERSION"), "utf8")
  .trim().split(/\r?\n/).map((s) => s.trim());
const hash = require("crypto")
  .createHash("sha256").update(shell).update(data).update(app)
  .digest("hex").slice(0, 7);
const stamp = asOf + " &middot; v" + version + " &middot; " + hash;

// Function replacements, not string ones: both sources contain "$&" (inside a
// regex-escape helper), which a string replacement would expand to the match.
let out = shell
  .replace('<script src="data.js"></script>', () => "<script>\n" + data + "\n</script>")
  .replace('<script src="app.js"></script>', () => "<script>\n" + app + "\n</script>");

if (out.indexOf("<script src=") >= 0) {
  console.error("build: a script tag was not inlined — check the shell markup");
  process.exit(1);
}

out = out.replace(/__BUILD_STAMP__/g, stamp);

const arg = process.argv[2] || "index.html";
const target = path.isAbsolute(arg) ? arg : path.join(__dirname, arg);
fs.writeFileSync(target, out);

console.log("built " + path.basename(target) + "  " + (out.length / 1024).toFixed(0) + " KB  v" + version + "  " + hash + "  data as of " + asOf);
