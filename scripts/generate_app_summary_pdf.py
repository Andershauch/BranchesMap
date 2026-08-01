from pathlib import Path
from textwrap import wrap

import fitz
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
TMP_DIR = ROOT / "tmp" / "pdfs"
PDF_PATH = OUTPUT_DIR / "sjaellandskort-app-summary.pdf"
PNG_PATH = TMP_DIR / "sjaellandskort-app-summary-page-1.png"


TITLE = "Sjaellandskort App"
SUBTITLE = "One-page repo summary"

WHAT_IT_IS = (
    "Mobile-first Next.js beta for an interactive map of Zealand municipalities, industries, "
    "and job estimates."
)
WHAT_IT_IS_2 = (
    "It combines a fullscreen map UI, municipality detail sheets, follows, saved searches, "
    "PWA support, kiosk mode, and admin tooling."
)

WHO_ITS_FOR = (
    "Primary user/persona: citizens or job seekers exploring municipalities and local job demand "
    "on Zealand; kiosk visitors can hand off to mobile via QR."
)

FEATURES = [
    "Interactive fullscreen municipality map with preview and expanded bottom sheet.",
    "Locale-based routes plus runtime dictionaries and app-text overrides.",
    "Municipality profiles with top industries, job data, and travel estimate UI.",
    "Saved searches and municipality follows for signed-in users.",
    "Unread follow updates via snapshot-based change detection endpoint.",
    "PWA baseline with manifest, service worker registration, and install support.",
    "Optional kiosk mode with attract loop, idle reset, and QR handoff to mobile.",
]

ARCHITECTURE = [
    "UI: Next.js App Router pages in app/ and client components in components/ render the map, municipality sheet, auth screens, follows, saved searches, and admin pages.",
    "Server: app/api/* exposes auth, jobs, follows, saved-searches, home-state, and Jobindsats discovery routes; lib/server/* adds origin checks, auth, rate limiting, audit, and security logging.",
    "Data: PostgreSQL via Prisma stores municipalities, industries, jobs, source snapshots, users, follows, saved searches, audit events, rate-limit buckets, and translation overrides.",
    "External sources: /api/jobs calls Danmarks Statistik; import and translation scripts reference Jobindsats data and title processing.",
    "Flow: /{locale} loads municipality summaries and runtime dictionary, renders HomeMapExplorer, then the client calls /api/home-state for follow badges while mutations go through form/API routes into Prisma-backed services.",
]

GETTING_STARTED = [
    "Install deps: npm install",
    "Create .env from .env.example and set at least DATABASE_URL, AUTH_SECRET, and APP_BASE_URL.",
    "Provision PostgreSQL, then run: npm run db:push",
    "Start dev server: npm run dev",
    "Open: http://localhost:3000/da",
]


def draw_wrapped_text(pdf: canvas.Canvas, text: str, x: float, y: float, width: float, font: str, size: int, leading: float):
    pdf.setFont(font, size)
    avg_char_width = max(stringWidth("abcdefghijklmnopqrstuvwxyz", font, size) / 26, 4.5)
    max_chars = max(int(width / avg_char_width), 18)
    lines = wrap(text, width=max_chars, break_long_words=False, break_on_hyphens=False)
    for line in lines:
        pdf.drawString(x, y, line)
        y -= leading
    return y


def draw_bullets(pdf: canvas.Canvas, items: list[str], x: float, y: float, width: float, font: str = "Helvetica", size: int = 9, leading: float = 11):
    bullet_indent = 10
    text_width = width - bullet_indent
    avg_char_width = max(stringWidth("abcdefghijklmnopqrstuvwxyz", font, size) / 26, 4.5)
    max_chars = max(int(text_width / avg_char_width), 16)

    pdf.setFont(font, size)
    for item in items:
        lines = wrap(item, width=max_chars, break_long_words=False, break_on_hyphens=False)
        if not lines:
            continue
        pdf.drawString(x, y, "-")
        pdf.drawString(x + bullet_indent, y, lines[0])
        y -= leading
        for line in lines[1:]:
            pdf.drawString(x + bullet_indent, y, line)
            y -= leading
        y -= 1.5
    return y


def section_header(pdf: canvas.Canvas, label: str, x: float, y: float, width: float):
    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont("Helvetica-Bold", 10.5)
    pdf.drawString(x, y, label.upper())
    line_y = y - 3
    pdf.setStrokeColor(colors.HexColor("#cbd5e1"))
    pdf.setLineWidth(0.8)
    pdf.line(x, line_y, x + width, line_y)
    return y - 14


def generate():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    pdf = canvas.Canvas(str(PDF_PATH), pagesize=A4)
    page_w, page_h = A4

    margin = 14 * mm
    gap = 8 * mm
    col_w = (page_w - (2 * margin) - gap) / 2

    left_x = margin
    right_x = margin + col_w + gap
    top_y = page_h - margin

    pdf.setTitle("Sjaellandskort App Summary")
    pdf.setAuthor("OpenAI Codex")
    pdf.setSubject("Repo summary")

    pdf.setFillColor(colors.HexColor("#0f172a"))
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(left_x, top_y, TITLE)

    pdf.setFillColor(colors.HexColor("#334155"))
    pdf.setFont("Helvetica", 10)
    pdf.drawString(left_x, top_y - 14, SUBTITLE)

    pdf.setStrokeColor(colors.HexColor("#94a3b8"))
    pdf.setLineWidth(1)
    pdf.line(left_x, top_y - 20, page_w - margin, top_y - 20)

    left_y = top_y - 36
    right_y = top_y - 36

    left_y = section_header(pdf, "What It Is", left_x, left_y, col_w)
    left_y = draw_wrapped_text(pdf, WHAT_IT_IS, left_x, left_y, col_w, "Helvetica", 9, 11)
    left_y -= 1
    left_y = draw_wrapped_text(pdf, WHAT_IT_IS_2, left_x, left_y, col_w, "Helvetica", 9, 11)
    left_y -= 8

    left_y = section_header(pdf, "Who It's For", left_x, left_y, col_w)
    left_y = draw_wrapped_text(pdf, WHO_ITS_FOR, left_x, left_y, col_w, "Helvetica", 9, 11)
    left_y -= 8

    left_y = section_header(pdf, "What It Does", left_x, left_y, col_w)
    left_y = draw_bullets(pdf, FEATURES, left_x, left_y, col_w, size=8.7, leading=10.5)

    right_y = section_header(pdf, "How It Works", right_x, right_y, col_w)
    right_y = draw_bullets(pdf, ARCHITECTURE, right_x, right_y, col_w, size=8.5, leading=10.2)
    right_y -= 6

    right_y = section_header(pdf, "How To Run", right_x, right_y, col_w)
    right_y = draw_bullets(pdf, GETTING_STARTED, right_x, right_y, col_w, size=8.9, leading=10.6)

    footer_y = 12 * mm
    pdf.setStrokeColor(colors.HexColor("#e2e8f0"))
    pdf.setLineWidth(0.8)
    pdf.line(left_x, footer_y + 8, page_w - margin, footer_y + 8)
    pdf.setFillColor(colors.HexColor("#64748b"))
    pdf.setFont("Helvetica", 7.5)
    pdf.drawString(left_x, footer_y, "Source basis: README, app/, components/, lib/server/, prisma/schema.prisma, package.json, .env.example")

    min_y = min(left_y, right_y)
    if min_y < footer_y + 14:
        raise RuntimeError(f"Layout overflow detected before PDF save: lowest y={min_y:.2f}")

    pdf.showPage()
    pdf.save()

    reader = PdfReader(str(PDF_PATH))
    if len(reader.pages) != 1:
        raise RuntimeError(f"Expected exactly 1 page, found {len(reader.pages)}")

    document = fitz.open(str(PDF_PATH))
    page = document.load_page(0)
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
    pix.save(str(PNG_PATH))
    document.close()

    print(PDF_PATH)
    print(PNG_PATH)


if __name__ == "__main__":
    generate()
