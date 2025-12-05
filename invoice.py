#!/usr/bin/env python3
"""
generate_invoice.py
Create a clean, professional PDF invoice from a JSON file.

Requires:
  pip install reportlab python-dateutil
"""

import json
import argparse
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from dateutil import parser as dateparser
from reportlab.lib.pagesizes import LETTER
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

def money(n):
    return f"${Decimal(n).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):,.2f}"

def hours_fmt(h):
    # Accept "9" or "9.5" or numeric
    try:
        d = Decimal(str(h))
    except Exception:
        d = Decimal(0)
    # show trailing .0? Keep one decimal if .5, else integer
    if d == d.to_integral():
        return f"{int(d)}"
    return f"{d.normalize()}"

def parse_args():
    ap = argparse.ArgumentParser(description="Generate a PDF invoice from JSON.")
    ap.add_argument("json_path", help="Path to input JSON file.")
    ap.add_argument("--output", "-o", default=None, help="Output PDF filename (default: derived from invoice number or client).")
    ap.add_argument("--rate", type=Decimal, default=Decimal("0"), help="Hourly rate in USD (e.g. 150).")
    ap.add_argument("--invoice-number", default=None, help="Invoice number (e.g., INV-2025-009).")
    ap.add_argument("--invoice-date", default=None, help="Invoice date (YYYY-MM-DD). Defaults to today.")
    ap.add_argument("--due-days", type=int, default=14, help="Net terms in days (default: 14).")
    ap.add_argument("--issuer", default="Your Company, LLC", help="Your company/name.")
    ap.add_argument("--issuer-email", default="", help="Your billing email.")
    ap.add_argument("--issuer-phone", default="", help="Your phone.")
    ap.add_argument("--issuer-addr1", default="", help="Address line 1.")
    ap.add_argument("--issuer-addr2", default="", help="Address line 2.")
    ap.add_argument("--description", default=None, help="Work description (defaults to project name).")
    return ap.parse_args()

def load_payload(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # minimal sanity checks
    for k in ["client", "contact", "project", "hours"]:
        if k not in data:
            raise ValueError(f"Missing '{k}' in JSON.")
    if not isinstance(data["hours"], list) or not data["hours"]:
        raise ValueError("'hours' must be a non-empty list.")
    return data

def compute_totals(hours_list):
    total_hours = Decimal("0")
    normalized = []
    for row in hours_list:
        date = row.get("date")
        hrs = Decimal(str(row.get("hours", "0")))
        desc = row.get("description", "")
        total_hours += hrs
        # parse & keep ISO for sorting
        dt = dateparser.parse(date).date()
        normalized.append({"date": dt, "hours": hrs, "description": desc})
    # sort by date descending by default
    normalized.sort(key=lambda r: r["date"], reverse=True)
    return total_hours, normalized

def date_range_str(dates):
    if not dates:
        return ""
    dmin = min(dates)
    dmax = max(dates)
    if dmin == dmax:
        return dmin.strftime("%b %d, %Y")
    # same month/year compression
    if dmin.year == dmax.year and dmin.month == dmax.month:
        return f"{dmin.strftime('%b %d')}–{dmax.strftime('%d, %Y')}"
    if dmin.year == dmax.year:
        return f"{dmin.strftime('%b %d')} – {dmax.strftime('%b %d, %Y')}"
    return f"{dmin.strftime('%b %d, %Y')} – {dmax.strftime('%b %d, %Y')}"

def register_fonts():
    # Use built-in Helvetica; optionally register a nicer font if you have TTFs.
    # Example (uncomment if you add files):
    # pdfmetrics.registerFont(TTFont("Inter", "Inter-Regular.ttf"))
    # pdfmetrics.registerFont(TTFont("Inter-Bold", "Inter-Bold.ttf"))
    return

def build_pdf(payload, args):
    # Prepare meta
    today = datetime.today().date()
    invoice_date = dateparser.parse(args.invoice_date).date() if args.invoice_date else today
    due_date = invoice_date.fromordinal(invoice_date.toordinal() + args.due_days)

    total_hours, normalized = compute_totals(payload["hours"])
    rate = args.rate
    subtotal_amount = (total_hours * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Derive defaults
    invoice_no = args.invoice_number or f"INV-{invoice_date.strftime('%Y%m%d')}"
    work_desc = args.description or payload["project"].get("name", "Engineering Services")
    period = date_range_str([r["date"] for r in normalized])

    # Output path
    out_path = args.output or f"{invoice_no}-{payload['client'].get('name','Client')}.pdf".replace(" ", "_")

    # Styles
    register_fonts()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="H1", fontName="Helvetica-Bold", fontSize=16, leading=20, spaceAfter=6))
    styles.add(ParagraphStyle(name="H2", fontName="Helvetica-Bold", fontSize=11, leading=14, spaceAfter=4, textColor=colors.HexColor("#222222")))
    styles.add(ParagraphStyle(name="Body", fontName="Helvetica", fontSize=9.5, leading=13))
    styles.add(ParagraphStyle(name="Tiny", fontName="Helvetica", fontSize=8, leading=11, textColor=colors.grey))

    doc = SimpleDocTemplate(
        out_path,
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title=f"Invoice {invoice_no}",
        author=args.issuer,
        subject=f"Invoice for {work_desc}",
    )

    elems = []

    # Header: Issuer (left) + Invoice box (right)
    issuer_lines = [args.issuer]
    if args.issuer_addr1: issuer_lines.append(args.issuer_addr1)
    if args.issuer_addr2: issuer_lines.append(args.issuer_addr2)
    if args.issuer_email: issuer_lines.append(args.issuer_email)
    if args.issuer_phone: issuer_lines.append(args.issuer_phone)

    header_table = Table(
        [
            [
                Paragraph("<b>INVOICE</b>", styles["H1"]),
                Paragraph(f"<b>Invoice #:</b> {invoice_no}<br/><b>Date:</b> {invoice_date.strftime('%b %d, %Y')}<br/><b>Due:</b> {due_date.strftime('%b %d, %Y')}", styles["Body"]),
            ],
            [
                Paragraph("<br/>".join(issuer_lines), styles["Body"]),
                Paragraph(f"<b>Bill To</b><br/>{payload['client'].get('name','')}"
                          f"<br/>{payload['client'].get('address','').replace(chr(10), '<br/>')}"
                          f"<br/>{payload['contact'].get('name','')}"
                          f"<br/>{payload['contact'].get('email','')}"
                          f"<br/>{payload['contact'].get('phone','')}", styles["Body"]),
            ],
        ],
        colWidths=[3.6 * inch, 3.6 * inch],
        hAlign="LEFT",
    )
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elems.append(header_table)
    elems.append(Spacer(1, 10))
    elems.append(HRFlowable(width="100%", color=colors.black, thickness=0.6, spaceBefore=6, spaceAfter=12, lineCap="round"))

    # Project & description block
    proj_name = payload["project"].get("name", "")
    proj_url = payload["project"].get("url", "")
    desc_lines = [f"<b>Project:</b> {proj_name}"]
    if proj_url:
        desc_lines.append(f"<b>URL:</b> {proj_url}")
    desc_lines.append(f"<b>Description:</b> {work_desc}")
    if period:
        desc_lines.append(f"<b>Work Period:</b> {period}")

    elems.append(Paragraph("<br/>".join(desc_lines), styles["Body"]))
    elems.append(Spacer(1, 8))

    # Hours table
    table_data = [["Date", "Description", "Hours"]]
    for r in normalized:
        # Wrap description text in Paragraph for proper text wrapping
        # Use smaller font for description to fit better
        desc_style = ParagraphStyle(
            'DescriptionStyle',
            parent=styles['Body'],
            fontSize=8.5,
            leading=10
        )
        desc_paragraph = Paragraph(r["description"], desc_style)
        table_data.append([
            r["date"].strftime("%Y-%m-%d (%a)"), 
            desc_paragraph, 
            hours_fmt(r["hours"])
        ])

    tbl = Table(table_data, colWidths=[1.4 * inch, 4.0 * inch, 1.2 * inch], hAlign="LEFT")
    tbl.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("ALIGN", (2, 1), (2, -1), "RIGHT"),  # Hours column right-aligned
                ("ALIGN", (0, 1), (1, -1), "LEFT"),   # Date and Description left-aligned
                ("ALIGN", (0, 0), (-1, 0), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),  # Align all cells to top
                ("LINEBEFORE", (0, 0), (0, -1), 0.0, colors.white),
                ("LINEABOVE", (0, 0), (-1, 0), 0.75, colors.black),
                ("LINEBELOW", (0, 0), (-1, 0), 0.75, colors.black),
                ("LINEBELOW", (0, -1), (-1, -1), 0.25, colors.black),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.Color(1,1,1)]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elems.append(tbl)
    elems.append(Spacer(1, 6))

    # Totals summary (right aligned)
    totals_rows = [
        ["Total Hours", hours_fmt(total_hours)],
        ["Rate", money(rate)],
        ["Amount Due", money(subtotal_amount)],
    ]
    totals_tbl = Table(totals_rows, colWidths=[2.4 * inch, 1.2 * inch], hAlign="RIGHT")
    totals_tbl.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, -2), "Helvetica"),
                ("FONT", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("ALIGN", (0, 0), (0, -1), "RIGHT"),
                ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.black),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    elems.append(totals_tbl)
    elems.append(Spacer(1, 12))

    # Notes / payment terms
    notes = [
        "<b>Payment</b>: ACH or check preferred. Please include invoice number with payment.",
        f"<b>Terms</b>: Net {args.due_days} days.",
        "Questions? Reply to this email/phone.",
    ]
    elems.append(Paragraph("<br/>".join(notes), styles["Tiny"]))
    elems.append(Spacer(1, 6))
    elems.append(Paragraph("Thank you for your business.", styles["Tiny"]))

    # Footer (tiny)
    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        footer_text = f"{args.issuer} • Invoice {invoice_no} • Generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        canvas.setFillColor(colors.grey)
        canvas.drawRightString(doc.pagesize[0] - doc.rightMargin, 0.5 * inch, footer_text)
        canvas.restoreState()

    doc.build(elems, onFirstPage=footer, onLaterPages=footer)
    return out_path

def main():
    args = parse_args()
    payload = load_payload(args.json_path)
    out = build_pdf(payload, args)
    print(f"Invoice written to: {out}")

if __name__ == "__main__":
    main()
