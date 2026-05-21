import io
import uuid

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
)
from sqlalchemy.ext.asyncio import AsyncSession

from backend.schemas.session import SessionReport
from backend.services.report_service import generate_session_report


async def generate_session_pdf(session_id: uuid.UUID, db: AsyncSession) -> io.BytesIO:
    """Build an in-memory PDF report for the given session and return a seeked BytesIO buffer."""
    report: SessionReport = await generate_session_report(session_id, db)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=18,
        spaceAfter=6,
        textColor=HexColor("#1e3a5f"),
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=11,
        spaceBefore=10,
        spaceAfter=4,
        textColor=HexColor("#1e40af"),
    )
    normal_style = styles["Normal"]
    normal_style.fontSize = 9

    story = []

    # ── Title ──────────────────────────────────────────────────────────────────
    title_text = f"Session Report — {report.session_id}"
    story.append(Paragraph(title_text, title_style))
    story.append(Spacer(1, 4 * mm))

    # ── Session metadata ───────────────────────────────────────────────────────
    story.append(Paragraph("Session Details", heading_style))

    started_fmt = report.started_at.strftime("%Y-%m-%d %H:%M:%S UTC")
    ended_fmt = report.ended_at.strftime("%Y-%m-%d %H:%M:%S UTC") if report.ended_at else "Ongoing"

    meta_data = [
        ["Started", started_fmt],
        ["Ended", ended_fmt],
        ["Duration (minutes)", str(report.duration_minutes)],
        ["Class Average Score", f"{report.class_avg:.1f}"],
        ["At-Risk Students", str(report.at_risk_count)],
    ]

    meta_table = Table(meta_data, colWidths=[55 * mm, 100 * mm])
    meta_table.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (0, 0), (0, -1), HexColor("#374151")),
            ("BACKGROUND", (0, 0), (-1, -1), HexColor("#f9fafb")),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [HexColor("#f9fafb"), HexColor("#ffffff")]),
            ("GRID", (0, 0), (-1, -1), 0.25, HexColor("#e5e7eb")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ])
    )
    story.append(meta_table)
    story.append(Spacer(1, 6 * mm))

    # ── Student breakdown table ────────────────────────────────────────────────
    story.append(Paragraph("Student Breakdown", heading_style))

    header_row = ["Name", "Avg Score", "Min Score", "Alerts", "Top Flags"]
    table_data = [header_row]

    for s in report.student_stats:
        top_flags_str = ", ".join(s.top_flags) if s.top_flags else "—"
        table_data.append([
            s.student_name,
            f"{s.avg_score:.1f}",
            str(s.min_score),
            str(s.alert_count),
            top_flags_str,
        ])

    col_widths = [60 * mm, 25 * mm, 25 * mm, 20 * mm, 45 * mm]
    student_table = Table(table_data, colWidths=col_widths, repeatRows=1)

    # Alternate row shading; alerts column highlighted in red when > 0
    row_styles: list = [
        # Header row
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1e40af")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.25, HexColor("#d1d5db")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#f0f4ff"), HexColor("#ffffff")]),
    ]

    # Highlight rows where avg_score < 60 (at-risk) in a faint orange tint
    for i, s in enumerate(report.student_stats, start=1):
        if s.avg_score < 60:
            row_styles.append(("BACKGROUND", (0, i), (-1, i), HexColor("#fff7ed")))
        if s.alert_count > 0:
            row_styles.append(("TEXTCOLOR", (3, i), (3, i), HexColor("#dc2626")))
            row_styles.append(("FONTNAME", (3, i), (3, i), "Helvetica-Bold"))

    student_table.setStyle(TableStyle(row_styles))
    story.append(student_table)

    # ── Footer note ────────────────────────────────────────────────────────────
    story.append(Spacer(1, 8 * mm))
    story.append(
        Paragraph(
            "Generated by Student Attention Monitor. Attention scores range from 0 (fully distracted) to 100 (fully attentive).",
            ParagraphStyle("Footer", parent=normal_style, fontSize=7, textColor=HexColor("#9ca3af")),
        )
    )

    doc.build(story)
    buffer.seek(0)
    return buffer
