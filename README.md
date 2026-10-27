# India Capability Ledger

A product-by-product audit of industrial capability: **257 foreign incumbents, 2,271 product
lines, 25 industries** — each line mapped against who in India actually competes, and at what
depth. Plus **87 recurring chokepoints** and, behind each one, **the specific core technology
that is actually hard**.

It is a single self-contained HTML file. No build chain, no dependencies, no server. Open
`index.html` in a browser, or serve the repo as a GitHub Pages site.

---

## The question it answers

Most industrial-policy writing stops at the sector. "India should make semiconductors" is not a
statement anyone can act on. This ledger goes down to the product line and then one level
further, to the technology inside the product:

- A chokepoint called **EDA software** is really *timing-closure engines certified by a foundry*.
  The barrier is the certification relationship, not the algorithms.
- A chokepoint called **rare-earth magnets** is really *grain-boundary diffusion of dysprosium*.
  The barrier is a process chain, not an ore deposit.
- A chokepoint called **tool brand consolidation** is not a technology barrier at all. It is
  shelf space.

Those three need completely different responses. Naming the layer that is actually hard is the
point of the register.

---

## What is in it

| Tab | What it holds |
| --- | --- |
| **Industries** | 25 industries, each opening into its incumbents, chokepoints, gaps and champions |
| **Companies** | Every incumbent, with its product lines grouped by tier inside the card |
| **Gap register** | 450 gaps, 363 of them with no credible entrant |
| **Indian champions** | 115 Indian firms that genuinely compete on technology |
| **Tier B traps** | 35 entities that read as Indian and are not |
| **Mittelstand / Keiretsu / Chaebol** | The three industrial-organisation models, read against the Indian business house |
| **Could build it** | 94 Indian firms with the adjacent capability, each tagged by what is actually stopping it |
| **Chokepoints** | 87 dependencies that recur across more than one incumbent |
| **Core technologies** | The 87 chokepoints restated as the specific technology, classed by what kind of hard thing it is |
| **Regions** | North America, Europe and East Asia, each read against India |
| **Indian manufacturing** | India's own position rolled up |

Every card opens a drill-down with breadcrumbs. Search covers all of it.

---

## The taxonomies

Four classifications carry the argument. Each one exists because it changes what a response
would have to be.

### Tier — who holds the technology

| | |
| --- | --- |
| **A** | Indian-owned with Indian IP. India competes on the technology itself. |
| **B** | Foreign-controlled, regardless of an Indian listing, an Indian name or an Indian plant. |
| **C** | Indian-owned, foreign technology. The company is Indian; the IP that matters is licensed. |
| **Z** | No Indian presence at any tier. |

An exchange listing does not make a company Tier A. This is the distinction most industry
lists blur, and it is the one that decides whether a capability survives a change in somebody
else's export policy.

### Criticality — what breaks without it

`3` chokepoint · `2` important · `1` substitutable with effort · `0` commodity

### Market structure — how many suppliers exist

`M` monopoly · `D` duopoly · `O` oligopoly · `C` competitive

### Barrier — what is actually stopping an Indian firm

Applied to the 94 firms in **Could build it**, because the response to each is different.

| | | |
| --- | --- | --- |
| **DECISION** | 25 firms | Has the technology, here or in an immediately adjacent application. A commercial choice, an unplaced order, or an unwillingness to compete with a customer stands in the way. |
| **QUALIFICATION** | 7 firms | The engineering is in hand or nearly so. Certification, evidence and track record are the barrier. |
| **CAPITAL** | 15 firms | Technology adjacent and the process understood. The barrier is a plant no board or ministry has funded. |
| **TECHNOLOGY** | 47 firms | A genuine capability gap. Something real would have to be developed, not merely funded or decided. |

### Technology class — what kind of hard thing the core technology is

Applied to all 87 entries in **Core technologies**.

| | | |
| --- | --- | --- |
| **Process** | 18 | A sequence of steps whose yield is learned, not specified. The recipe is the technology and it does not transfer with the equipment. |
| **Material** | 12 | A substance made to a purity, morphology or formulation nobody writes down. Chemistry plus decades of qualification. |
| **Precision** | 27 | A machine or part held to a tolerance. Needs metrology, thermal control and assembly discipline more than novel science. |
| **Design** | 15 | Architecture and calibration accumulated over product generations. Reproducible in principle, expensive in engineer-years. |
| **Software** | 5 | Algorithms plus a validated model library plus an ecosystem that assumes it. The code is the small part. |
| **Standard** | 10 | Not a capability gap. A patent pool, a certification, a design authority or a distribution channel somebody else holds. |

The ten **Standard** entries matter most to read carefully: they are the places where India
already has the capability and is held out by something that is not technical.

---

## Scope

Manufacturing, design, equipment, construction, heavy engineering, electronics and machines.

Deliberately excluded: finance, and agriculture other than agricultural processing machinery.

---

## Using it

### Open it

```bash
git clone https://github.com/<you>/india-capability-ledger.git
cd india-capability-ledger
open index.html          # macOS;  xdg-open on Linux;  start on Windows
```

`index.html` is self-contained — you can also email it, drop it on a share, or open it offline.

### Build it

Edit the sources in `src/`, then:

```bash
node build.js            # inlines src/* into index.html
node test.js             # parses both scripts, runs the app against a strict DOM stub,
                         # and checks dataset integrity
```

The build is reproducible: the stamp on the page is derived from `VERSION` and a hash of
`src/`, never from the clock, so rebuilding unchanged sources gives a byte-identical
`index.html`. `build.js` refuses to write a file whose scripts do not parse. `test.js` returns a non-zero exit
code on any missing DOM node or data problem, so it works as a pre-commit or CI gate.

### Get the data out

```bash
node export.js           # -> data/*.csv and data/ledger.json
python3 powerbi.py       # -> india-capability-ledger-powerbi.xlsx  (needs openpyxl)
```

The workbook carries one named Excel table per sheet, so Power BI picks each up as a clean
query, plus a `Read_Me` sheet that defines every code.

### Publish it

Settings → Pages → Build from branch → `main` / root. The ledger is served from
`index.html` with nothing else required.

---

## Layout

```
index.html                           built, self-contained, the thing you open
src/shell.html                       markup, CSS, tab structure
src/data.js                          the dataset
src/app.js                           rendering, search, drill-down router
VERSION                              version number and the date the data is good as of
build.js                             src/* -> index.html (reproducible)
test.js                              parse, runtime and dataset checks
export.js                            -> data/*.csv, data/ledger.json
powerbi.py                           data/*.csv -> .xlsx
data/                                flat exports
india-capability-ledger-powerbi.xlsx the workbook
```

`src/data.js` exports `COMPANIES`, `CHOKES`, `TECHS`, `TECHCLASS`, `CHAMPIONS`, `BUILDERS`,
`TRAPS`, `SECOND`, `MIRROR`, `MODELS`, `INDIAN_FIRMS`, `BARRIER`, `CRIT` and `STRUCT`.
`CRIT` and `STRUCT` are keyed `"companyIndex|productIndex"`, which is why `test.js` checks for
orphaned keys after every edit.

---

## Corrections

Corrections are the most useful contribution. The ledger makes falsifiable claims about
ownership, technology and who holds what, and some of them will be wrong or will go stale.

Particularly worth challenging:

- **A tier call.** If a company listed Tier C holds genuine Indian IP, say which IP.
- **A "no Indian entrant" claim.** These go stale fastest. Indian MSMEs and startups enter
  these spaces quietly, and the ledger has already been corrected several times this way.
- **A barrier tag.** Calling something DECISION rather than TECHNOLOGY is a strong claim about
  a named company and should be argued.
- **An ownership change.** Acquisitions move a firm between the champion, trap and builder
  lists — a Tier A entrant that gets bought is a Tier B trap the next morning.

Open an issue naming the specific line and what it should say, with a source.

---

## Caveats

Revenue figures are as reported by each company for the fiscal year shown on the card, and
fiscal years do not align across countries. Verify before relying on any single number.

Tier calls are judgements about where the IP sits, not about company quality. A Tier C firm
may be excellently run.

The dataset is a point-in-time compilation. Ownership, export controls and supplier
concentration all move.

---

## Licence

Code under the MIT licence. The dataset — the compilation, the tier calls, the barrier tags
and the core technology register — is released under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Use it, build on it, cite it.
