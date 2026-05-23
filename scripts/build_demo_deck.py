#!/usr/bin/env python3
"""Generate June 17 NDC Data Explorer demo PowerPoint."""

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_AUTO_SHAPE_TYPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "Uganda-NDC-Data-Explorer-Demo-June-17-2026.pptx"
OUT.parent.mkdir(parents=True, exist_ok=True)

# Theme (app greens)
DARK = RGBColor(30, 42, 36)
ACCENT = RGBColor(57, 107, 79)
LIGHT = RGBColor(247, 249, 248)
WHITE = RGBColor(255, 255, 255)
MUTED = RGBColor(95, 110, 100)
PALE = RGBColor(220, 228, 224)
SUBTITLE = RGBColor(180, 200, 190)

# Standard 16:9 (Keynote / PowerPoint default)
SLIDE_W = Inches(10)
SLIDE_H = Inches(5.625)

MARGIN_L = Inches(0.5)
MARGIN_R = Inches(0.5)
CONTENT_W = SLIDE_W - MARGIN_L - MARGIN_R  # 9"

HEADER_H = Inches(0.72)
FOOTER_TOP = Inches(5.18)
FOOTER_H = Inches(0.405)
BODY_TOP = Inches(0.82)
BODY_BOTTOM = FOOTER_TOP - Inches(0.08)


def new_prs():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    return prs


def blank_slide(prs):
    return prs.slides.add_slide(prs.slide_layouts[6])


def add_rect(slide, left, top, width, height, fill, line=None):
    shape = slide.shapes.add_shape(
        MSO_AUTO_SHAPE_TYPE.RECTANGLE, left, top, width, height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if line:
        shape.line.color.rgb = line
    else:
        shape.line.fill.background()
    return shape


def styled_textbox(slide, left, top, width, height, text, *, size=12, bold=False, color=DARK, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    tf.vertical_anchor = MSO_ANCHOR.TOP
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.alignment = align
    p.line_spacing = 1.15
    return box


def add_header(slide, title, subtitle=None):
    add_rect(slide, Inches(0), Inches(0), SLIDE_W, HEADER_H, DARK)
    styled_textbox(
        slide, MARGIN_L, Inches(0.14), CONTENT_W, Inches(0.34),
        title, size=20, bold=True, color=WHITE,
    )
    if subtitle:
        styled_textbox(
            slide, MARGIN_L, Inches(0.44), CONTENT_W, Inches(0.22),
            subtitle, size=10, color=SUBTITLE,
        )


def add_footer(slide, num):
    add_rect(slide, Inches(0), FOOTER_TOP, SLIDE_W, FOOTER_H, DARK)
    styled_textbox(
        slide, MARGIN_L, FOOTER_TOP + Inches(0.06), Inches(7.5), Inches(0.28),
        "Uganda NDC Data Explorer  ·  Demo 17 June 2026",
        size=8, color=SUBTITLE,
    )
    styled_textbox(
        slide, Inches(8.85), FOOTER_TOP + Inches(0.06), Inches(0.65), Inches(0.28),
        f"{num:02d}", size=9, bold=True, color=WHITE, align=PP_ALIGN.RIGHT,
    )


def content_slide(prs, title, subtitle, num):
    slide = blank_slide(prs)
    add_header(slide, title, subtitle)
    add_footer(slide, num)
    return slide


def col_widths(n: int, gap=Inches(0.22)):
    total_gap = gap * (n - 1)
    w = (CONTENT_W - total_gap) / n
    lefts = [MARGIN_L + i * (w + gap) for i in range(n)]
    return lefts, w, gap


def add_three_cards(slide, cards, top=BODY_TOP, card_h=None):
    """cards: list of (header, body)"""
    lefts, w, _ = col_widths(3)
    if card_h is None:
        card_h = BODY_BOTTOM - top
    for left, (head, body) in zip(lefts, cards):
        add_rect(slide, left, top, w, card_h, WHITE, PALE)
        add_rect(slide, left, top, w, Inches(0.38), ACCENT)
        styled_textbox(
            slide, left + Inches(0.12), top + Inches(0.07), w - Inches(0.24), Inches(0.28),
            head, size=11, bold=True, color=WHITE,
        )
        styled_textbox(
            slide, left + Inches(0.12), top + Inches(0.48), w - Inches(0.24), card_h - Inches(0.56),
            body, size=9, color=DARK,
        )


def add_numbered_cards(slide, cards, top=BODY_TOP):
    """cards: list of (num, title, body)"""
    lefts, w, _ = col_widths(3)
    card_h = Inches(3.55)
    for left, (num, title, body) in zip(lefts, cards):
        add_rect(slide, left, top, w, card_h, WHITE, PALE)
        # number badge
        badge = slide.shapes.add_shape(
            MSO_AUTO_SHAPE_TYPE.OVAL, left + Inches(0.12), top + Inches(0.12),
            Inches(0.28), Inches(0.28),
        )
        badge.fill.solid()
        badge.fill.fore_color.rgb = ACCENT
        badge.line.fill.background()
        styled_textbox(
            slide, left + Inches(0.12), top + Inches(0.14), Inches(0.28), Inches(0.24),
            str(num), size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER,
        )
        styled_textbox(
            slide, left + Inches(0.48), top + Inches(0.1), w - Inches(0.6), Inches(0.32),
            title, size=11, bold=True, color=DARK,
        )
        styled_textbox(
            slide, left + Inches(0.12), top + Inches(0.48), w - Inches(0.24), card_h - Inches(0.58),
            body, size=9, color=MUTED,
        )


def add_bullet_list(slide, items, top=BODY_TOP, size=11):
    styled_textbox(
        slide, MARGIN_L + Inches(0.08), top, CONTENT_W - Inches(0.16),
        BODY_BOTTOM - top,
        "\n\n".join(f"•  {item}" for item in items),
        size=size, color=DARK,
    )


def add_table_rows(slide, rows, top=BODY_TOP):
    row_h = Inches(0.62)
    col1_w = Inches(1.55)
    col2_w = Inches(3.35)
    col3_w = CONTENT_W - col1_w - col2_w - Inches(0.16)
    x1 = MARGIN_L + Inches(0.08)
    x2 = x1 + col1_w
    x3 = x2 + col2_w
    y = top
    for layer, tech, role in rows:
        add_rect(slide, MARGIN_L, y, CONTENT_W, row_h, WHITE, PALE)
        styled_textbox(slide, x1, y + Inches(0.1), col1_w, row_h - Inches(0.12), layer, size=10, bold=True)
        styled_textbox(slide, x2, y + Inches(0.1), col2_w, row_h - Inches(0.12), tech, size=9, color=MUTED)
        styled_textbox(slide, x3, y + Inches(0.1), col3_w, row_h - Inches(0.12), role, size=9, color=MUTED)
        y += row_h + Inches(0.06)


def add_path_rows(slide, rows, top=BODY_TOP):
    row_h = Inches(0.58)
    y = top
    for path, desc in rows:
        add_rect(slide, MARGIN_L, y, CONTENT_W, row_h, WHITE, PALE)
        styled_textbox(
            slide, MARGIN_L + Inches(0.1), y + Inches(0.08), Inches(3.5), row_h - Inches(0.1),
            path, size=8, bold=True, color=ACCENT,
        )
        styled_textbox(
            slide, MARGIN_L + Inches(3.65), y + Inches(0.08), Inches(5.2), row_h - Inches(0.1),
            desc, size=9, color=DARK,
        )
        y += row_h + Inches(0.05)


def add_challenge_rows(slide, rows, top=BODY_TOP):
    row_h = Inches(0.58)
    y = top
    for title, fix in rows:
        add_rect(slide, MARGIN_L, y, CONTENT_W, row_h, WHITE, PALE)
        styled_textbox(
            slide, MARGIN_L + Inches(0.1), y + Inches(0.1), Inches(2.4), row_h - Inches(0.12),
            title, size=10, bold=True,
        )
        styled_textbox(
            slide, MARGIN_L + Inches(2.55), y + Inches(0.1), Inches(6.3), row_h - Inches(0.12),
            fix, size=9, color=MUTED,
        )
        y += row_h + Inches(0.06)


def add_demo_placeholder(slide, label, caption, num):
    add_header(slide, "Live demo", label)
    add_rect(slide, MARGIN_L, BODY_TOP, CONTENT_W, BODY_BOTTOM - BODY_TOP, LIGHT, ACCENT)
    styled_textbox(
        slide, MARGIN_L, Inches(2.35), CONTENT_W, Inches(0.6),
        f"[ Screenshot: {caption} ]",
        size=14, color=MUTED, align=PP_ALIGN.CENTER,
    )
    styled_textbox(
        slide, MARGIN_L, Inches(4.75), CONTENT_W, Inches(0.3),
        "Replace with capture from npm run dev before presenting.",
        size=8, color=MUTED, align=PP_ALIGN.CENTER,
    )
    add_footer(slide, num)


def build():
    prs = new_prs()

    # 01 Title
    s = blank_slide(prs)
    add_rect(s, Inches(0), Inches(0), SLIDE_W, SLIDE_H, DARK)
    add_rect(s, Inches(0), Inches(4.05), SLIDE_W, Inches(1.575), ACCENT)
    styled_textbox(s, MARGIN_L, Inches(1.35), CONTENT_W, Inches(0.7),
                   "Uganda NDC Data Explorer", size=32, bold=True, color=WHITE)
    styled_textbox(s, MARGIN_L, Inches(2.05), CONTENT_W, Inches(0.45),
                   "Decision-support cockpit for NDC implementation", size=14, color=SUBTITLE)
    styled_textbox(s, MARGIN_L, Inches(4.25), CONTENT_W, Inches(0.9),
                   "Date: 17 June 2026\nPresented by: Tseten Sherpa  ·  [Team member]",
                   size=11, color=WHITE)

    # 02 Three pillars
    s = content_slide(prs, "Uganda NDC Data Explorer", "One workspace for climate delivery", 2)
    add_numbered_cards(s, [
        (1, "NDC Layer (Home)",
         "Five linked columns:\nTargets → Activities → Observed data → Progress → Mitigation options.\n\nFilter by sector and geography."),
        (2, "Delivery cockpit",
         "Executive Overview\nDelivery & Accountability\nEvidence & MRV\nFinance & Investment"),
        (3, "Climate Risk",
         "District hotspots\nScreening map\nDrill-down\n\nConnect adaptation risk to programme geography."),
    ])
    styled_textbox(
        s, MARGIN_L, Inches(4.48), CONTENT_W, Inches(0.55),
        "From NDC commitments to delivery, evidence, and risk — in one place.\n"
        "Supports coordination and briefing; does not replace official UNFCCC submissions.",
        size=9, color=DARK,
    )

    # 03 Motivation
    s = content_slide(prs, "Motivation & user needs", "Uganda NDC Data Explorer", 3)
    add_three_cards(s, [
        ("The problem",
         "NDC targets, strategies, indicators, and MRV evidence live in PDFs and siloed spreadsheets.\n\n"
         "Hard to answer:\n• Are we on track?\n• What must change?\n• Who owns what?"),
        ("The solution",
         "A web cockpit linking:\n• What Uganda committed\n• What is being delivered\n• What evidence exists\n• How progress looks\n\n"
         "Optional Climate TRACE observed signals."),
        ("User impact",
         "Ministry staff — coordinated delivery\n\n"
         "MRV focal points — indicators in one place\n\n"
         "Decision-makers — executive tiles & risk hotspots"),
    ])

    # 04 Tech stack
    s = content_slide(prs, "Technology stack", "Uganda NDC Data Explorer", 4)
    add_table_rows(s, [
        ("Frontend", "Vite + React + TypeScript", "UI, maps, charts, exports"),
        ("Backend", "Express API", "Climate TRACE v7 + bundled catalog"),
        ("Emissions API", "Express + Climate TRACE v7", "Timeseries, provenance"),
        ("Uganda data", "Curated NDC / strategy layers", "Targets, districts, risk"),
        ("Demo mode", "USE_MOCK_DATA=true", "Reliable demo without live API"),
    ])
    styled_textbox(s, MARGIN_L, Inches(4.82), CONTENT_W, Inches(0.28),
                   "Climate TRACE v7: CC BY 4.0 · District via /v7/sources (GADM2)", size=8, color=MUTED)

    # 05 Architecture
    s = content_slide(prs, "Where the application lives", "Repository layout", 5)
    add_path_rows(s, [
        ("NDCLayer.tsx", "Home — five-column cockpit"),
        ("ExecutiveOverview.tsx", "Leadership tiles + what must change"),
        ("pages/risk/*", "Map, screening, drilldown"),
        ("server.js / emissions.js", "API: timeseries, progress, provenance"),
        ("database/migrations/", "Postgres schema"),
        ("seed_emissions.js", "Climate TRACE seed script"),
    ])

    # 06–09 Demos
    for num, label, cap in [
        (6, "NDC Layer (Home)", "Five columns + sector filter"),
        (7, "Observed & progress", "Live banner + Climate TRACE charts"),
        (8, "Executive Overview", "Four tiles + what must change"),
        (9, "Climate Risk", "Hotspots + district map"),
    ]:
        s = blank_slide(prs)
        add_demo_placeholder(s, label, cap, num)

    # 10 Challenges
    s = content_slide(prs, "Challenges & mitigations", "Uganda NDC Data Explorer", 10)
    add_challenge_rows(s, [
        ("Mixed data sources", "State curated vs API-backed panels clearly"),
        ("Climate TRACE scope", "National sectors only for that source"),
        ("Demo reliability", "Pre-login, migrations, mock or seeded API"),
        ("Many modules", "Demo Cockpit + Risk; Advanced = roadmap"),
        ("Official reporting", "Briefing tool — not UNFCCC submission"),
    ])

    # 11 Policy
    s = content_slide(prs, "Policy context", "Why an NDC data explorer?", 11)
    add_bullet_list(s, [
        "Paris Agreement — countries publish NDCs: targets and implementation measures.",
        "Uganda aligns NDC with NDP IV, Vision 2040, and sector strategies.",
        "Many actors need a shared picture: ministries, districts, MRV, partners.",
        "App navigates commitments, activities, indicators, and risk — not a new policy doc.",
        "Users: coordinators, MRV focal points, programme managers, executive briefings.",
    ], size=10)

    # 12 Data sources
    s = content_slide(prs, "Data sources & trust", "Transparency for technical audiences", 12)
    add_three_cards(s, [
        ("In-app Uganda data",
         "NDC targets & sectors\nStrategy library\nDistrict geography\nIndicator registry"),
        ("Climate TRACE",
         "Open API v7\nMtCO₂e in Postgres\nCC BY 4.0\n≠ national inventory"),
        ("Operations",
         "/api/v1/provenance\nExcel & PDF exports\nLocal activity storage\nGaps, not guesses"),
    ], card_h=Inches(3.9))

    # 13 Reflections
    s = content_slide(prs, "What we built & learned", "Project reflections", 13)
    add_three_cards(s, [
        ("Delivered",
         "• NDC cockpit\n• Executive pages\n• Climate risk map\n• Role switcher\n• TRACE API pipeline"),
        ("Challenges",
         "• 20+ routes\n• Climate TRACE v7 wiring\n• Policy UX depth\n• Demo stability"),
        ("Learned",
         "• Columns > tables\n• Commitment / delivery / evidence\n• Provenance builds trust"),
    ], card_h=Inches(3.9))

    # 14 Q&A
    s = blank_slide(prs)
    add_rect(s, Inches(0), Inches(0), SLIDE_W, SLIDE_H, DARK)
    styled_textbox(s, MARGIN_L, Inches(1.5), CONTENT_W, Inches(0.8),
                   "Questions?", size=36, bold=True, color=WHITE)
    styled_textbox(s, MARGIN_L, Inches(2.45), CONTENT_W, Inches(2.5),
                   "Repository: ndc-data-explorer-e051f914\n\n"
                   "npm install → cp .env.example .env → npm run dev\n"
                   "http://localhost:8080\n\n"
                   "Optional: npm run start:api",
                   size=12, color=SUBTITLE)

    prs.save(OUT)
    import shutil
    downloads = Path.home() / "Downloads" / OUT.name
    shutil.copy(OUT, downloads)
    print(f"Saved: {OUT}")
    print(f"Copied: {downloads}")


if __name__ == "__main__":
    build()
