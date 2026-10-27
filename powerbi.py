#!/usr/bin/env python3
"""
India Capability Ledger -> Power BI / Excel workbook.

Reads the CSVs written by export.js and builds one workbook with a named
Excel table per sheet, so Power BI picks each up as a clean query.

    node export.js && python3 powerbi.py
    -> india-capability-ledger-powerbi.xlsx
"""
import csv, io, os, sys

try:
    from openpyxl import Workbook
    from openpyxl.worksheet.table import Table, TableStyleInfo
    from openpyxl.styles import Font, Alignment, PatternFill
    from openpyxl.utils import get_column_letter
except ImportError:
    sys.exit("openpyxl is required:  pip install --break-system-packages openpyxl")

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
OUT = os.path.join(HERE, "india-capability-ledger-powerbi.xlsx")

# sheet name -> (csv file, excel table name, column widths by header keyword)
SHEETS = [
    ("Product_Lines",     "product-lines.csv",     "ProductLines"),
    ("Companies",         "companies.csv",         "Companies"),
    ("Chokepoints",       "chokepoints.csv",       "Chokepoints"),
    ("Core_Technologies", "core-technologies.csv", "CoreTechnologies"),
    ("Could_Build_It",    "could-build-it.csv",    "CouldBuildIt"),
    ("Indian_Champions",  "indian-champions.csv",  "IndianChampions"),
    ("Tier_B_Traps",      "tier-b-traps.csv",      "TierBTraps"),
]

NARROW = ("Tier", "Criticality", "Class", "Depth", "Region", "Country",
          "FiscalYear", "MarketStructure", "Barrier", "BarrierRank", "ProductLines")
WIDE = ("Why", "What", "Where", "Blocks", "Meaning", "Note", "Stopping", "Capability")

HEAD_FILL = PatternFill("solid", fgColor="1F2937")
HEAD_FONT = Font(color="FFFFFF", bold=True, size=10)


def load(name):
    p = os.path.join(DATA, name)
    if not os.path.exists(p):
        sys.exit("missing %s — run `node export.js` first" % p)
    with io.open(p, encoding="utf-8", newline="") as f:
        return list(csv.reader(f))


def width_for(header):
    if any(k.lower() in header.lower() for k in WIDE):
        return 70
    if header in NARROW:
        return 14
    return 34


def main():
    wb = Workbook()
    wb.remove(wb.active)
    total = 0

    for sheet, fname, table in SHEETS:
        rows = load(fname)
        ws = wb.create_sheet(sheet)
        for r in rows:
            ws.append(r)
        n = len(rows) - 1
        total += n

        for c in range(1, len(rows[0]) + 1):
            cell = ws.cell(row=1, column=c)
            cell.fill = HEAD_FILL
            cell.font = HEAD_FONT
            cell.alignment = Alignment(vertical="center")
            ws.column_dimensions[get_column_letter(c)].width = width_for(rows[0][c - 1])

        ref = "A1:%s%d" % (get_column_letter(len(rows[0])), len(rows))
        t = Table(displayName=table, ref=ref)
        t.tableStyleInfo = TableStyleInfo(
            name="TableStyleMedium2", showRowStripes=True, showColumnStripes=False)
        ws.add_table(t)
        ws.freeze_panes = "A2"
        ws.auto_filter.ref = ref
        print("  %-18s %5d rows" % (sheet, n))

    # a short README sheet so the workbook explains its own codes
    ws = wb.create_sheet("Read_Me", 0)
    notes = [
        ["India Capability Ledger", ""],
        ["", ""],
        ["Tier A", "Indian-owned with Indian IP - India competes on the technology itself"],
        ["Tier B", "Foreign-controlled, regardless of an Indian listing or an Indian name"],
        ["Tier C", "Indian-owned, foreign technology - the company is Indian, the IP is licensed"],
        ["Tier Z", "No Indian presence at any tier"],
        ["", ""],
        ["Criticality 3", "Chokepoint - nothing downstream moves without it"],
        ["Criticality 2", "Important - substitution is slow and costly"],
        ["Criticality 1", "Substitutable with effort"],
        ["Criticality 0", "Commodity"],
        ["", ""],
        ["Structure M / D / O / C", "Monopoly / duopoly / oligopoly / competitive"],
        ["", ""],
        ["Barrier DECISION", "Has the technology, here or in an adjacent application. A commercial choice stands in the way."],
        ["Barrier QUALIFICATION", "Engineering in hand. Certification, evidence and track record are the barrier."],
        ["Barrier CAPITAL", "Technology adjacent and understood. The barrier is a plant nobody has funded."],
        ["Barrier TECHNOLOGY", "A genuine capability gap. Something real would have to be developed."],
        ["", ""],
        ["Class PROCESS", "A sequence of steps whose yield is learned, not specified"],
        ["Class MATERIAL", "A substance made to a purity or formulation nobody writes down"],
        ["Class PRECISION", "A machine or part held to a tolerance"],
        ["Class DESIGN", "Architecture and calibration accumulated over product generations"],
        ["Class SOFTWARE", "Algorithms plus a validated model library plus an ecosystem"],
        ["Class STANDARD", "Not a capability gap - a pool, a certification or a channel somebody else holds"],
        ["", ""],
        ["Figures", "As reported by each company for the fiscal year shown. Verify before relying on any single number."],
    ]
    for r in notes:
        ws.append(r)
    ws.column_dimensions["A"].width = 26
    ws.column_dimensions["B"].width = 110
    ws["A1"].font = Font(bold=True, size=14)
    for row in ws.iter_rows(min_row=1, max_row=len(notes), min_col=2, max_col=2):
        for cell in row:
            cell.alignment = Alignment(wrap_text=True, vertical="top")

    wb.save(OUT)
    print("\nwrote %s  (%d rows across %d sheets)" % (os.path.basename(OUT), total, len(SHEETS)))


if __name__ == "__main__":
    main()
