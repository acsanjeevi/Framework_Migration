from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt
import copy

# ─── Brand Colors ────────────────────────────────────────────────────────────
DARK_BG      = RGBColor(0x0D, 0x1B, 0x2A)   # Deep navy
ACCENT_BLUE  = RGBColor(0x00, 0x78, 0xD4)   # Microsoft blue
ACCENT_CYAN  = RGBColor(0x00, 0xBC, 0xF2)   # Bright cyan
WHITE        = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY   = RGBColor(0xE8, 0xF0, 0xFE)
CARD_BG      = RGBColor(0x13, 0x27, 0x3F)   # Slightly lighter navy
GOLD         = RGBColor(0xFF, 0xB9, 0x00)   # Amber / gold
GREEN        = RGBColor(0x10, 0xB9, 0x81)   # Emerald green
RED_ACCENT   = RGBColor(0xEF, 0x44, 0x44)

SLIDE_W = Inches(13.33)
SLIDE_H = Inches(7.5)

prs = Presentation()
prs.slide_width  = SLIDE_W
prs.slide_height = SLIDE_H

blank_layout = prs.slide_layouts[6]  # completely blank


# ─── Helper Functions ─────────────────────────────────────────────────────────

def add_rect(slide, left, top, width, height, fill_color=None, line_color=None, line_width=Pt(0)):
    shape = slide.shapes.add_shape(1, left, top, width, height)  # MSO_SHAPE_TYPE.RECTANGLE = 1
    fill = shape.fill
    if fill_color:
        fill.solid()
        fill.fore_color.rgb = fill_color
    else:
        fill.background()
    line = shape.line
    if line_color:
        line.color.rgb = line_color
        line.width = line_width
    else:
        line.fill.background()
    return shape


def add_textbox(slide, text, left, top, width, height,
                font_size=Pt(18), bold=False, color=WHITE,
                align=PP_ALIGN.LEFT, italic=False, word_wrap=True):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = word_wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = font_size
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    return txBox


def add_para(tf, text, font_size=Pt(16), bold=False, color=WHITE,
             align=PP_ALIGN.LEFT, space_before=Pt(6), italic=False):
    p = tf.add_paragraph()
    p.alignment = align
    p.space_before = space_before
    run = p.add_run()
    run.text = text
    run.font.size = font_size
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    return p


def slide_background(slide, color=DARK_BG):
    bg = add_rect(slide, 0, 0, SLIDE_W, SLIDE_H, fill_color=color)
    bg.name = "Background"


def accent_stripe(slide):
    """Bottom accent stripe."""
    add_rect(slide, 0, SLIDE_H - Inches(0.08), SLIDE_W, Inches(0.08), fill_color=ACCENT_BLUE)


def header_bar(slide, title_text, subtitle_text=None):
    """Top gradient-style header bar."""
    add_rect(slide, 0, 0, SLIDE_W, Inches(1.4), fill_color=CARD_BG)
    add_rect(slide, 0, Inches(1.35), SLIDE_W, Inches(0.05), fill_color=ACCENT_CYAN)
    add_textbox(slide, title_text,
                Inches(0.5), Inches(0.18), Inches(12), Inches(0.7),
                font_size=Pt(34), bold=True, color=WHITE)
    if subtitle_text:
        add_textbox(slide, subtitle_text,
                    Inches(0.5), Inches(0.82), Inches(12), Inches(0.45),
                    font_size=Pt(16), color=ACCENT_CYAN)


def slide_number(slide, num, total=9):
    text = f"{num} / {total}"
    add_textbox(slide, text,
                SLIDE_W - Inches(1.3), SLIDE_H - Inches(0.45), Inches(1.1), Inches(0.35),
                font_size=Pt(11), color=ACCENT_CYAN, align=PP_ALIGN.RIGHT)


def icon_bullet(slide, items, left, top, width, spacing=Inches(0.55),
                font_size=Pt(17), icon="▶", icon_color=ACCENT_CYAN, text_color=WHITE):
    y = top
    for item in items:
        add_textbox(slide, icon, left, y, Inches(0.35), spacing,
                    font_size=font_size, color=icon_color, bold=True)
        add_textbox(slide, item, left + Inches(0.38), y, width - Inches(0.4), spacing,
                    font_size=font_size, color=text_color, word_wrap=True)
        y += spacing
    return y


def card(slide, left, top, width, height, title, body_lines,
         title_color=ACCENT_CYAN, body_color=LIGHT_GRAY,
         title_size=Pt(16), body_size=Pt(14)):
    add_rect(slide, left, top, width, height, fill_color=CARD_BG,
             line_color=ACCENT_BLUE, line_width=Pt(1.2))
    add_textbox(slide, title, left + Inches(0.18), top + Inches(0.12),
                width - Inches(0.36), Inches(0.38),
                font_size=title_size, bold=True, color=title_color)
    y = top + Inches(0.52)
    for line in body_lines:
        add_textbox(slide, f"  {line}", left + Inches(0.14), y,
                    width - Inches(0.28), Inches(0.38),
                    font_size=body_size, color=body_color, word_wrap=True)
        y += Inches(0.38)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 1 — TITLE SLIDE
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(blank_layout)
slide_background(slide)

# Large decorative circle top-right
circ = slide.shapes.add_shape(9, SLIDE_W - Inches(3.8), Inches(-1.5), Inches(5.5), Inches(5.5))
circ.fill.solid(); circ.fill.fore_color.rgb = RGBColor(0x00, 0x50, 0x8A)
circ.line.fill.background()

# Second smaller circle
circ2 = slide.shapes.add_shape(9, SLIDE_W - Inches(2.2), Inches(2.5), Inches(3.0), Inches(3.0))
circ2.fill.solid(); circ2.fill.fore_color.rgb = ACCENT_CYAN
circ2.line.fill.background()
circ2.fill.fore_color.theme_color

# Bottom stripe
add_rect(slide, 0, SLIDE_H - Inches(0.08), SLIDE_W, Inches(0.08), fill_color=ACCENT_BLUE)
add_rect(slide, 0, SLIDE_H - Inches(0.18), SLIDE_W, Inches(0.08), fill_color=GOLD)

# Left accent line
add_rect(slide, Inches(0.35), Inches(1.6), Inches(0.06), Inches(3.2), fill_color=ACCENT_CYAN)

# Main title
add_textbox(slide, "AI-Powered Test\nAutomation Migration",
            Inches(0.65), Inches(1.5), Inches(8.5), Inches(2.2),
            font_size=Pt(48), bold=True, color=WHITE)

# Subtitle
add_textbox(slide, "An Intelligent Migration Agentic Tool for QA Automation Teams",
            Inches(0.65), Inches(3.75), Inches(8.2), Inches(0.7),
            font_size=Pt(20), color=ACCENT_CYAN, italic=True)

# Tag line chips
add_rect(slide, Inches(0.65), Inches(4.7), Inches(2.6), Inches(0.42), fill_color=ACCENT_BLUE)
add_textbox(slide, "  Hackathon 2026",
            Inches(0.65), Inches(4.7), Inches(2.6), Inches(0.42),
            font_size=Pt(14), color=WHITE, bold=True)

add_rect(slide, Inches(3.45), Inches(4.7), Inches(2.8), Inches(0.42), fill_color=CARD_BG,
         line_color=ACCENT_CYAN, line_width=Pt(1))
add_textbox(slide, "  Claude Haiku + Sonnet",
            Inches(3.45), Inches(4.7), Inches(2.8), Inches(0.42),
            font_size=Pt(14), color=ACCENT_CYAN)

# Presenter
add_textbox(slide, "Presenter: [Your Name]  |  Team: [Your Team]",
            Inches(0.65), Inches(6.6), Inches(7), Inches(0.5),
            font_size=Pt(14), color=LIGHT_GRAY)

slide_number(slide, 1)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 2 — THE PROBLEM
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(blank_layout)
slide_background(slide)
accent_stripe(slide)
header_bar(slide, "The Challenge", "Why do QA teams struggle with legacy automation?")
slide_number(slide, 2)

# Problem cards
problems = [
    ("⏱  Time & Cost",    ["Manual migration takes weeks", "High risk of human error", "Expensive QA hours wasted"]),
    ("🔧  Tech Debt",      ["Outdated Selenium/WebDriver code", "No modern selector strategies", "Brittle, hard-to-maintain tests"]),
    ("🔀  Complexity",     ["Multiple source frameworks", "Varied coding patterns (POM, BDD)", "No CI/CD integration"]),
]

col_w   = Inches(3.7)
col_gap = Inches(0.28)
col_h   = Inches(4.0)
start_x = Inches(0.5)
top_y   = Inches(1.7)

for i, (title, lines) in enumerate(problems):
    x = start_x + i * (col_w + col_gap)
    card(slide, x, top_y, col_w, col_h, title, lines,
         title_size=Pt(19), body_size=Pt(15))

# Big stat at bottom
add_rect(slide, Inches(0.5), Inches(6.0), Inches(12.3), Inches(0.88), fill_color=ACCENT_BLUE)
add_textbox(slide, "  On average, manual migration of 100 test files takes 3–6 WEEKS and introduces 30%+ regressions.",
            Inches(0.6), Inches(6.05), Inches(12.1), Inches(0.75),
            font_size=Pt(16), bold=True, color=WHITE)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 3 — OUR SOLUTION
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(blank_layout)
slide_background(slide)
accent_stripe(slide)
header_bar(slide, "Our Solution", "The Migration Agentic Tool")
slide_number(slide, 3)

# Big hero statement
add_rect(slide, Inches(0.5), Inches(1.7), Inches(12.3), Inches(1.1), fill_color=CARD_BG,
         line_color=ACCENT_CYAN, line_width=Pt(1.5))
add_textbox(slide, "Upload legacy tests → Get fully migrated Playwright suites in minutes.",
            Inches(0.7), Inches(1.82), Inches(11.9), Inches(0.88),
            font_size=Pt(22), bold=True, color=ACCENT_CYAN, align=PP_ALIGN.CENTER)

bullets = [
    "Supports Cypress, Selenium, Robot Framework, WebdriverIO as source",
    "Migrates to Playwright in TypeScript, JavaScript, Java, or Python",
    "Self-healing selectors automatically generated for every test locator",
    "CI/CD pipeline config (Azure DevOps, GitLab, Jenkins) auto-generated",
    "Real-time per-file progress dashboard with live WebSocket updates",
    "AI confidence scoring — auto-escalates to higher model if needed",
]
icon_bullet(slide, bullets, Inches(0.7), Inches(3.0), Inches(11.9),
            spacing=Inches(0.58), font_size=Pt(17))


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 4 — KEY FEATURES
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(blank_layout)
slide_background(slide)
accent_stripe(slide)
header_bar(slide, "Core Features", "What makes this tool powerful?")
slide_number(slide, 4)

features = [
    ("🤖  AI Code Transform",    ACCENT_BLUE,  ["Claude Haiku 4.5 (fast, cost-effective)", "Claude Sonnet 4.6 (high-accuracy fallback)", "Zero hallucination via structured prompts"]),
    ("🔧  Self-Healing Engine",  GREEN,         ["6 fallback selector strategies", "data-testid → ARIA → CSS → XPath chain", "Inline [SELF-HEAL] annotations in output"]),
    ("⚙️  CI/CD Generation",     GOLD,          ["Azure Pipelines, GitLab CI, Jenkinsfile", "Coverage thresholds enforced (90% / 85%)", "Ready-to-commit pipeline configs"]),
    ("📊  Live Progress Tracker", ACCENT_CYAN,  ["WebSocket real-time updates per file", "7-step progress with status badges", "Amber → Green → Red status system"]),
]

fw = Inches(5.9)
fh = Inches(4.1)
positions = [(Inches(0.4), Inches(1.65)), (Inches(6.55), Inches(1.65)),
             (Inches(0.4), Inches(4.1)),   (Inches(6.55), Inches(4.1))]

for (x, y), (title, color, lines) in zip(positions, features):
    add_rect(slide, x, y, fw, fh * 0.5, fill_color=CARD_BG,
             line_color=color, line_width=Pt(2))
    add_textbox(slide, title, x + Inches(0.15), y + Inches(0.08),
                fw - Inches(0.3), Inches(0.38),
                font_size=Pt(17), bold=True, color=color)
    yy = y + Inches(0.52)
    for line in lines:
        add_textbox(slide, f"  • {line}", x + Inches(0.12), yy,
                    fw - Inches(0.2), Inches(0.36),
                    font_size=Pt(13), color=LIGHT_GRAY, word_wrap=True)
        yy += Inches(0.36)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 5 — TECH STACK
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(blank_layout)
slide_background(slide)
accent_stripe(slide)
header_bar(slide, "Technology Stack", "Modern, scalable, production-grade tools")
slide_number(slide, 5)

stacks = [
    ("Frontend",  ACCENT_CYAN,  ["React 18  +  TypeScript 5", "Vite 5  (build tool)", "Tailwind CSS  +  shadcn/ui", "Zustand (state management)", "Axios  +  WebSocket (native)"]),
    ("Backend",   ACCENT_BLUE,  ["Node.js 20  +  Express", "TypeScript 5  (strict)", "Multer  (file uploads)", "Bull  +  Redis  (job queue)", "Handlebars  (CI/CD templates)"]),
    ("AI Models", GOLD,         ["Claude Haiku 4.5  (0.33x cost)", "Claude Sonnet 4.6  (1x — fallback)", "Anthropic Node.js SDK", "Confidence scoring engine", "Zod validation on all inputs"]),
    ("Coverage",  GREEN,        ["Istanbul / nyc  (TS / JS)", "JaCoCo  (Java)", "Coverage.py  (Python)", "90% line / 85% branch enforced", "Cobertura XML reports"]),
]

col_w = Inches(2.9)
col_h = Inches(4.45)
gap   = Inches(0.25)
sx    = Inches(0.45)
sy    = Inches(1.72)

for i, (title, color, lines) in enumerate(stacks):
    x = sx + i * (col_w + gap)
    add_rect(slide, x, sy, col_w, col_h, fill_color=CARD_BG,
             line_color=color, line_width=Pt(2))
    # Title pill
    add_rect(slide, x, sy, col_w, Inches(0.45), fill_color=color)
    add_textbox(slide, f"  {title}", x, sy + Inches(0.03), col_w, Inches(0.42),
                font_size=Pt(16), bold=True, color=DARK_BG)
    yy = sy + Inches(0.55)
    for line in lines:
        add_textbox(slide, f"  {line}", x + Inches(0.1), yy, col_w - Inches(0.2), Inches(0.38),
                    font_size=Pt(13), color=LIGHT_GRAY, word_wrap=True)
        yy += Inches(0.38)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 6 — ARCHITECTURE
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(blank_layout)
slide_background(slide)
accent_stripe(slide)
header_bar(slide, "System Architecture", "End-to-end data flow overview")
slide_number(slide, 6)

# Draw architecture boxes with arrows
boxes = [
    (Inches(0.35),  Inches(2.5),  Inches(2.4),  Inches(1.5), "USER\nBROWSER", "React SPA\nWebSocket client", ACCENT_BLUE),
    (Inches(3.55),  Inches(2.5),  Inches(2.6),  Inches(1.5), "BACKEND\nAPI GATEWAY", "REST Routes\nZod Validation", ACCENT_CYAN),
    (Inches(6.8),   Inches(2.5),  Inches(2.6),  Inches(1.5), "MIGRATION\nORCHESTRATOR", "7-Step Pipeline\nBull Queue", GOLD),
    (Inches(10.05), Inches(2.5),  Inches(2.6),  Inches(1.5), "AI MODELS\n(Anthropic)", "Haiku → Sonnet\nFallback logic", GREEN),
    (Inches(3.55),  Inches(5.0),  Inches(2.6),  Inches(1.3), "REDIS QUEUE", "Bull job per batch\nAsync processing", RGBColor(0xDC, 0x26, 0x26)),
    (Inches(6.8),   Inches(5.0),  Inches(2.6),  Inches(1.3), "CI/CD OUTPUT", "Azure / GitLab\nJenkins YAMLs", RGBColor(0x79, 0x40, 0xD4)),
    (Inches(10.05), Inches(5.0),  Inches(2.6),  Inches(1.3), "COVERAGE\nENGINE", "Istanbul / JaCoCo\nCoverage.py", RGBColor(0x0F, 0x96, 0x6B)),
]

for (bx, by, bw, bh, title, sub, color) in boxes:
    add_rect(slide, bx, by, bw, bh, fill_color=CARD_BG, line_color=color, line_width=Pt(2))
    add_textbox(slide, title, bx + Inches(0.1), by + Inches(0.1), bw - Inches(0.2), Inches(0.52),
                font_size=Pt(14), bold=True, color=color, align=PP_ALIGN.CENTER)
    add_textbox(slide, sub, bx + Inches(0.1), by + Inches(0.65), bw - Inches(0.2), Inches(0.7),
                font_size=Pt(12), color=LIGHT_GRAY, align=PP_ALIGN.CENTER)

# Horizontal arrows (row 1)
arrows = [
    (Inches(2.78), Inches(3.1), Inches(0.75), "REST API"),
    (Inches(6.18), Inches(3.1), Inches(0.60), "Queue"),
    (Inches(9.43), Inches(3.1), Inches(0.60), "LLM Call"),
]
for (ax, ay, aw, label) in arrows:
    add_rect(slide, ax, ay + Inches(0.12), aw, Inches(0.04), fill_color=ACCENT_CYAN)
    add_textbox(slide, label, ax, ay - Inches(0.12), aw, Inches(0.3),
                font_size=Pt(10), color=ACCENT_CYAN, align=PP_ALIGN.CENTER)

# WebSocket arrow back (curved manually with a label)
add_textbox(slide, "⬅  WebSocket real-time progress events",
            Inches(0.35), Inches(4.2), Inches(5.5), Inches(0.35),
            font_size=Pt(11), color=GOLD, italic=True)

# Vertical arrows (to row 2)
for x in [Inches(4.85), Inches(8.1), Inches(11.35)]:
    add_rect(slide, x, Inches(4.02), Inches(0.04), Inches(0.96), fill_color=ACCENT_BLUE)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 7 — AI AGENT PIPELINE
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(blank_layout)
slide_background(slide)
accent_stripe(slide)
header_bar(slide, "AI Agent Pipeline", "7-Step Migration Orchestration + Confidence Routing")
slide_number(slide, 7)

steps = [
    ("1", "Framework\nDetector",    ACCENT_CYAN,  "Identifies Cypress,\nSelenium, Robot…"),
    ("2", "Pattern\nIdentifier",    ACCENT_BLUE,  "POM / BDD / Mocha\nPage Factory…"),
    ("3", "Code\nTransformer",      GOLD,          "LLM converts code\nHaiku → Sonnet"),
    ("4", "Self-Healing\nEngine",   GREEN,         "6-strategy fallback\nselectors written"),
    ("5", "CI/CD\nGenerator",       RGBColor(0x79, 0x40, 0xD4), "YAML config\ngenerated"),
    ("6", "Coverage\nAnalyzer",     RGBColor(0xDC, 0x26, 0x26), "90%/85% threshold\nenforced"),
    ("7", "Verifier &\nScorer",     ACCENT_CYAN,  "Final syntax check\n≥ 85% confidence"),
]

sw = Inches(1.6)
sh = Inches(2.2)
sy2 = Inches(1.85)
gap = Inches(0.225)
sx2 = Inches(0.3)

for i, (num, title, color, desc) in enumerate(steps):
    x = sx2 + i * (sw + gap)
    # Step box
    add_rect(slide, x, sy2, sw, sh, fill_color=CARD_BG, line_color=color, line_width=Pt(2))
    # Number circle
    circ = slide.shapes.add_shape(9, x + Inches(0.55), sy2 - Inches(0.22), Inches(0.5), Inches(0.5))
    circ.fill.solid(); circ.fill.fore_color.rgb = color; circ.line.fill.background()
    add_textbox(slide, num, x + Inches(0.55), sy2 - Inches(0.21), Inches(0.5), Inches(0.48),
                font_size=Pt(14), bold=True, color=DARK_BG, align=PP_ALIGN.CENTER)
    add_textbox(slide, title, x + Inches(0.05), sy2 + Inches(0.1), sw - Inches(0.1), Inches(0.8),
                font_size=Pt(13), bold=True, color=color, align=PP_ALIGN.CENTER)
    add_textbox(slide, desc, x + Inches(0.08), sy2 + Inches(0.9), sw - Inches(0.15), Inches(1.1),
                font_size=Pt(11), color=LIGHT_GRAY, align=PP_ALIGN.CENTER)
    # Arrow
    if i < len(steps) - 1:
        ax = x + sw + Inches(0.03)
        add_textbox(slide, "▶", ax, sy2 + Inches(0.75), Inches(0.22), Inches(0.4),
                    font_size=Pt(14), color=ACCENT_CYAN, align=PP_ALIGN.CENTER)

# Confidence routing box
add_rect(slide, Inches(0.3), Inches(4.4), Inches(12.73), Inches(2.5), fill_color=CARD_BG,
         line_color=ACCENT_BLUE, line_width=Pt(1))
add_textbox(slide, "⚡  Confidence Routing Logic (Step 3)",
            Inches(0.5), Inches(4.5), Inches(5), Inches(0.42),
            font_size=Pt(16), bold=True, color=GOLD)

routing = [
    ("Score ≥ 85%",  GREEN,       "Haiku output accepted & pipeline continues automatically."),
    ("Score < 85%",  GOLD,        "Auto-escalates to Claude Sonnet 4.6 for higher accuracy."),
    ("Both < 85%",   RED_ACCENT,  "HALT — File flagged for mandatory human review. No auto-commit."),
]
yy = Inches(5.0)
for label, color, desc in routing:
    add_rect(slide, Inches(0.5), yy, Inches(1.5), Inches(0.32), fill_color=color)
    add_textbox(slide, f"  {label}", Inches(0.5), yy + Inches(0.01),
                Inches(1.5), Inches(0.3), font_size=Pt(12), bold=True, color=DARK_BG)
    add_textbox(slide, desc, Inches(2.15), yy, Inches(10.7), Inches(0.35),
                font_size=Pt(13), color=LIGHT_GRAY)
    yy += Inches(0.45)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 8 — DEMO WORKFLOW
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(blank_layout)
slide_background(slide)
accent_stripe(slide)
header_bar(slide, "Live Demo Walkthrough", "End-to-end migration in one clean flow")
slide_number(slide, 8)

demo_steps = [
    (ACCENT_CYAN,  "1",  "Upload",     "Drag & drop a .zip of legacy tests onto the Upload page."),
    (ACCENT_BLUE,  "2",  "Configure",  "Select source framework, target language & CI/CD platform."),
    (GOLD,         "3",  "Migrate",    "Click 'Migrate' — the backend queues and processes all files."),
    (GREEN,        "4",  "Track",      "Watch the Progress Dashboard — live status for each file."),
    (ACCENT_CYAN,  "5",  "Review",     "Inspect migrated code, [SELF-HEAL] annotations & CI/CD YAML."),
    (RGBColor(0xDC, 0x26, 0x26), "6", "Download", "Click Download to get the full migrated project as a ZIP."),
]

sw2 = Inches(3.9)
sh2 = Inches(1.6)
gap2 = Inches(0.24)
positions2 = [
    (Inches(0.35), Inches(1.72)), (Inches(4.5), Inches(1.72)),  (Inches(8.65), Inches(1.72)),
    (Inches(0.35), Inches(3.5)),  (Inches(4.5), Inches(3.5)),   (Inches(8.65), Inches(3.5)),
]

for (x, y), (color, num, title, desc) in zip(positions2, demo_steps):
    add_rect(slide, x, y, sw2, sh2, fill_color=CARD_BG, line_color=color, line_width=Pt(2))
    # Step number
    add_rect(slide, x, y, Inches(0.46), sh2, fill_color=color)
    add_textbox(slide, num, x + Inches(0.03), y + Inches(0.55), Inches(0.4), Inches(0.5),
                font_size=Pt(22), bold=True, color=DARK_BG, align=PP_ALIGN.CENTER)
    add_textbox(slide, title, x + Inches(0.56), y + Inches(0.12), sw2 - Inches(0.66), Inches(0.5),
                font_size=Pt(17), bold=True, color=color)
    add_textbox(slide, desc, x + Inches(0.56), y + Inches(0.65), sw2 - Inches(0.7), Inches(0.8),
                font_size=Pt(13), color=LIGHT_GRAY, word_wrap=True)

# Bottom tip
add_rect(slide, Inches(0.35), Inches(5.35), Inches(12.63), Inches(0.7), fill_color=ACCENT_BLUE)
add_textbox(slide, "  💡  Demo Tip: Upload a Cypress .spec.ts file as the ZIP and show the full output including GitLab CI/CD pipeline config.",
            Inches(0.5), Inches(5.42), Inches(12.4), Inches(0.58),
            font_size=Pt(14), bold=True, color=WHITE)


# ══════════════════════════════════════════════════════════════════════════════
# SLIDE 9 — CLOSING
# ══════════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(blank_layout)
slide_background(slide)

# Decorative circles
for (cx, cy, cw, col) in [
    (SLIDE_W + Inches(-2), Inches(-1), Inches(4), RGBColor(0x00, 0x50, 0x8A)),
    (Inches(-1.5), SLIDE_H - Inches(2.5), Inches(3.5), RGBColor(0x13, 0x27, 0x3F)),
]:
    c = slide.shapes.add_shape(9, cx, cy, cw, cw)
    c.fill.solid(); c.fill.fore_color.rgb = col; c.line.fill.background()

add_rect(slide, 0, SLIDE_H - Inches(0.08), SLIDE_W, Inches(0.08), fill_color=ACCENT_BLUE)
add_rect(slide, 0, SLIDE_H - Inches(0.18), SLIDE_W, Inches(0.08), fill_color=GOLD)

# Left accent
add_rect(slide, Inches(0.35), Inches(1.0), Inches(0.06), Inches(4.5), fill_color=ACCENT_CYAN)

# Heading
add_textbox(slide, "Thank You",
            Inches(0.65), Inches(0.9), Inches(10), Inches(1.3),
            font_size=Pt(58), bold=True, color=WHITE)

add_textbox(slide, "Questions & Answers",
            Inches(0.65), Inches(2.1), Inches(9), Inches(0.65),
            font_size=Pt(28), color=ACCENT_CYAN, italic=True)

# Summary pillars
pillars = [
    ("Migrates Legacy Tests", "Cypress, Selenium, Robot → Playwright",   ACCENT_CYAN),
    ("Self-Healing Selectors", "6-strategy fallback chains, zero TODOs",  GREEN),
    ("AI Confidence Routing",  "Haiku fast-path, Sonnet accuracy fallback", GOLD),
    ("Full CI/CD Output",      "Azure, GitLab, Jenkins configs ready",    ACCENT_BLUE),
]
px = Inches(0.65)
for (title, sub, color) in pillars:
    add_rect(slide, px, Inches(3.1), Inches(2.85), Inches(0.9), fill_color=CARD_BG,
             line_color=color, line_width=Pt(1.5))
    add_textbox(slide, title, px + Inches(0.1), Inches(3.13), Inches(2.65), Inches(0.38),
                font_size=Pt(14), bold=True, color=color)
    add_textbox(slide, sub, px + Inches(0.1), Inches(3.5), Inches(2.65), Inches(0.38),
                font_size=Pt(12), color=LIGHT_GRAY)
    px += Inches(3.05)

# Contact
add_textbox(slide, "GitHub / Contact:  [Your GitHub URL]  |  Team:  [Your Team Name]",
            Inches(0.65), Inches(6.55), Inches(10), Inches(0.5),
            font_size=Pt(13), color=LIGHT_GRAY)

slide_number(slide, 9)


# ─── Save ────────────────────────────────────────────────────────────────────
output_path = r"d:\GEN AI-2026\Codebase-Hackathon\Migration_Agent_Presentation.pptx"
prs.save(output_path)
print(f"✅  Presentation saved → {output_path}")
