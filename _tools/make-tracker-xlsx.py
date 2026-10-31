"""Build /free/tracker/steady-path-job-tracker.xlsx (Steady Path Careers job search tracker).

Same columns as the on-page tracker. Follow-up date (applied + 7 days), the 14-day no-reply flag
and the summary block are live formulas, so they work after File > Import in Google Sheets.

    python3 _tools/make-tracker-xlsx.py [out.xlsx] [--sample]

--sample fills a few example rows (used only for the formula check, never shipped).
"""
import sys
import datetime as dt
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation

NAVY, GOLD, CREAM, MIDNIGHT = "1F3A5F", "C9A227", "FBF6EE", "10213A"
GOLD_SOFT, LINE, BAD_SOFT, OK_SOFT, INK2 = "F6ECC9", "ECE4D2", "FBE2DE", "DFF3E6", "333E52"
STATUSES = ["Applied", "Heard back", "Interview", "Offer", "Closed"]
FIRST, LAST = 5, 304  # 300 rows for jobs
HEAD = ["Company", "Role", "Link", "Date applied", "Follow-up date", "Status", "Next step", "Notes", "Flag"]
WIDTHS = [24, 26, 30, 14, 15, 13, 28, 36, 22]

out = next((a for a in sys.argv[1:] if not a.startswith("--")), "free/tracker/steady-path-job-tracker.xlsx")
sample = "--sample" in sys.argv

wb = Workbook()
ws = wb.active
ws.title = "Tracker"
ws.sheet_properties.tabColor = GOLD
font = "Arial"
thin = Side(style="thin", color=LINE)

ws["A1"] = "Steady Path Careers: Job Search Tracker"
ws["A1"].font = Font(name=font, size=18, bold=True, color=NAVY)
ws["A2"] = ("Fill in Company, Role, Link, Date applied, Status, Next step and Notes. "
            "The follow-up date (7 days after you apply) and the Flag column fill in by themselves. "
            "A job still marked Applied 14 days later is flagged.")
ws["A2"].font = Font(name=font, size=10, color=INK2)
ws["A2"].alignment = Alignment(wrap_text=True, vertical="top")
ws.merge_cells("A2:I2")
ws.row_dimensions[2].height = 30
ws["A3"] = "steadypathcareers.com/free/tracker"
ws["A3"].font = Font(name=font, size=10, color=NAVY, underline="single")
ws["A3"].hyperlink = "https://steadypathcareers.com/free/tracker/"

for i, h in enumerate(HEAD, start=1):
    c = ws.cell(row=4, column=i, value=h)
    c.font = Font(name=font, bold=True, color=CREAM)
    c.fill = PatternFill("solid", fgColor=NAVY)
    c.alignment = Alignment(vertical="center")
    c.border = Border(bottom=Side(style="medium", color=GOLD))
ws.row_dimensions[4].height = 22
for i, w in enumerate(WIDTHS, start=1):
    ws.column_dimensions[chr(64 + i)].width = w

for r in range(FIRST, LAST + 1):
    ws.cell(row=r, column=4).number_format = "mmm d, yyyy"
    e = ws.cell(row=r, column=5, value=f'=IF(D{r}="","",D{r}+7)')
    e.number_format = "mmm d, yyyy"
    e.font = Font(name=font, color=NAVY)
    ws.cell(row=r, column=9,
            value=f'=IF(AND(ISNUMBER(D{r}),OR(F{r}="Applied",F{r}=""),TODAY()-D{r}>=14),"No reply in 14+ days","")'
            ).font = Font(name=font, bold=True, color="8A2A20")
    for col in range(1, 10):
        cell = ws.cell(row=r, column=col)
        cell.border = Border(bottom=thin)
        if col not in (5, 9):
            cell.font = Font(name=font)
        if col in (7, 8):
            cell.alignment = Alignment(wrap_text=True, vertical="top")

dv = DataValidation(type="list", formula1='"' + ",".join(STATUSES) + '"', allow_blank=True,
                    showErrorMessage=True, errorTitle="Status",
                    error="Pick one: " + ", ".join(STATUSES))
dv.add(f"F{FIRST}:F{LAST}")
ws.add_data_validation(dv)
dd = DataValidation(type="date", operator="greaterThan", formula1="DATE(2000,1,1)", allow_blank=True,
                    showErrorMessage=True, errorTitle="Date applied", error="Enter a date, like 10/31/2026.")
dd.add(f"D{FIRST}:D{LAST}")
ws.add_data_validation(dd)

rng = f"A{FIRST}:I{LAST}"
ws.conditional_formatting.add(rng, FormulaRule(formula=[f'$I{FIRST}<>""'], fill=PatternFill("solid", fgColor=BAD_SOFT)))
ws.conditional_formatting.add(rng, FormulaRule(formula=[f'OR($F{FIRST}="Interview",$F{FIRST}="Offer")'], fill=PatternFill("solid", fgColor=OK_SOFT)))
ws.conditional_formatting.add(rng, FormulaRule(formula=[f'$F{FIRST}="Heard back"'], fill=PatternFill("solid", fgColor=GOLD_SOFT)))

# Summary block, to the right of the table
ws.column_dimensions["J"].width = 3
ws.column_dimensions["K"].width = 24
ws.column_dimensions["L"].width = 12
ws["K4"] = "Your numbers"
ws["L4"] = ""
for c in ("K4", "L4"):
    ws[c].font = Font(name=font, bold=True, color=MIDNIGHT)
    ws[c].fill = PatternFill("solid", fgColor=GOLD)
A, F = f"A{FIRST}:A{LAST}", f"F{FIRST}:F{LAST}"
summary = [
    ("Applications", f'=COUNTIF({A},"?*")', "0"),
    ("Replies", f'=COUNTIF({F},"Heard back")+COUNTIF({F},"Interview")+COUNTIF({F},"Offer")', "0"),
    ("Interviews", f'=COUNTIF({F},"Interview")+COUNTIF({F},"Offer")', "0"),
    ("Offers", f'=COUNTIF({F},"Offer")', "0"),
    ("Reply rate", '=IF(L5=0,"",L6/L5)', "0%"),
    ("Flagged (no reply 14+ days)", f'=COUNTIF(I{FIRST}:I{LAST},"No reply*")', "0"),
]
for i, (label, formula, fmt) in enumerate(summary):
    r = 5 + i
    k, l = ws.cell(row=r, column=11, value=label), ws.cell(row=r, column=12, value=formula)
    k.font = Font(name=font, color=INK2)
    l.font = Font(name=font, bold=True, color=NAVY)
    l.number_format = fmt
    l.alignment = Alignment(horizontal="right")
    for c in (k, l):
        c.fill = PatternFill("solid", fgColor=CREAM)
        c.border = Border(bottom=thin)
ws["K12"] = "Replies count Heard back, Interview and Offer."
ws["K13"] = "Saved in your own file. I never see it."
for c in ("K12", "K13"):
    ws[c].font = Font(name=font, size=9, italic=True, color=INK2)

ws.freeze_panes = f"A{FIRST}"
ws.auto_filter.ref = f"A4:I{LAST}"
ws.sheet_view.zoomScale = 110

if sample:
    today = dt.date.today()
    rows = [
        ("Acme Health", "Medical Assistant", "https://example.com/1", today - dt.timedelta(days=20), "Applied", "", ""),
        ("Shore Bank", "Teller", "", today - dt.timedelta(days=3), "Applied", "", ""),
        ("Route 9 Tech", "IT Support", "", today - dt.timedelta(days=15), "Heard back", "Phone screen", ""),
        ("Monmouth Co", "Analyst", "", today - dt.timedelta(days=30), "Interview", "", ""),
        ("Garden State Inc", "Payroll Clerk", "", today - dt.timedelta(days=40), "Offer", "", ""),
        ("Old Lead", "Clerk", "", today - dt.timedelta(days=60), "Closed", "", ""),
        ("Blank Status Co", "Driver", "", today - dt.timedelta(days=14), "", "", ""),
    ]
    for i, (co, role, link, d, s, n, notes) in enumerate(rows):
        r = FIRST + i
        ws.cell(row=r, column=1, value=co)
        ws.cell(row=r, column=2, value=role)
        ws.cell(row=r, column=3, value=link or None)
        ws.cell(row=r, column=4, value=d)
        ws.cell(row=r, column=6, value=s or None)

wb.properties.title = "Steady Path Job Search Tracker"
wb.properties.creator = "Steady Path Careers"
wb.save(out)
print("wrote", out)
