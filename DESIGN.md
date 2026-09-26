# DESIGN.md — JEV Resume Analyzer

> v0.2. Derived from a reference screenshot of JEV's own "how it answers"
> explainer graphic. This look is distinctive enough to double as product
> identity, not just a style reference — carry it into the app itself.

## 1. Personality

Technical, high-contrast, "printed spec sheet" — not soft SaaS. The product
is a scoring engine, and the visual language should look like it's showing
you a real computed result, not decorating one. Confidence through
restraint: sharp corners, thick black rules, one accent color used
sparingly and only to mark "this is the answer."

## 2. Color tokens

| Token | Value | Rationale |
|---|---|---|
| `--color-bg` | `#F4F1E8` | Cream page background — warmer than white, reads as paper/print rather than "app" |
| `--color-surface` | `#FFFFFF` | Card/panel background, sits above the cream |
| `--color-border` | `#000000` | Pure black, used at full weight (1.5–2px), never a soft gray hairline |
| `--color-accent` | `#F2B518` | Amber/yellow — the ONLY accent color. Marks the winning result, key numbers, and section numbering. Never used decoratively. |
| `--color-highlight-bg` | `#FBE9B8` | Pale yellow wash behind emphasized inline text (a quoted question, a key phrase) |
| `--color-text-primary` | `#0A0A0A` | Headers and primary content |
| `--color-text-secondary` | `#6B6B68` | Captions, sourcing, metadata — always lowercase |
| `--color-fill-primary` | `#0A0A0A` | Solid black fill for the top/selected bar in a scored list |

Rule: accent yellow appears in at most 2–3 places per screen (the numbered
badge, the winning score, one callout number). If everything is yellow,
nothing reads as "the answer."

## 3. Typography

- Font: monospace throughout — `"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace`
- Headers/labels: bold, UPPERCASE (e.g. "HOW JEV ANSWERS", "YOUR APP", "FRAUD")
- Body/quoted content and captions: lowercase, regular weight
- No italics. Weight does the emphasis work, not style.
- Section headers get a black underline rule directly beneath them (see
  component rules below), not just size/weight for hierarchy.

## 4. Shape and borders

- **Corner radius: 0 everywhere.** No rounded corners on cards, buttons,
  badges, or inputs. This is the single most important rule to preserve —
  softening any corner breaks the identity.
- Borders are solid black, 1.5–2px, always full-weight — never a faint gray
  line. A card is defined by a visible black rule, not a shadow.
- No drop shadows, no gradients, no blur — flat fills and hard edges only.

## 5. Component rules

- **Section label**: small solid-yellow numbered badge ("02") in bold black
  monospace, followed by a bold uppercase title, with a black underline
  rule beneath the whole header.
- **Scored list / comparison rows** (e.g. score breakdown by category):
  each row is a bordered black-outline label box + a horizontal bar with a
  black border. The top-ranked row gets its label box filled solid yellow
  and its bar filled solid black; all other rows keep white label boxes and
  a thin unfilled bar outline. Never more than one row highlighted at once.
- **Metric callout**: a bold number in a solid yellow box, high contrast,
  used for the single most important number on screen (e.g. overall match
  score, response time).
- **Inline highlight**: pale yellow background (`--color-highlight-bg`)
  behind a short quoted phrase or key input, black bold text on top.
- **Caption/attribution**: small, gray, lowercase monospace — always the
  quietest element on the screen.
- **Panel header**: a bordered card's title row is separated from its body
  by a full-width black rule, not padding alone.

## 6. Applying this to the resume analyzer specifically

- The overall score (0–100) is the metric callout — bold number, yellow box,
  most prominent element on the dashboard.
- If you show a score breakdown (keyword match, experience match, education
  match, etc. — see JEV Scoring in the build spec), render it as the scored
  list pattern above: each dimension is a row, the highest-scoring dimension
  gets the yellow label + black bar, the rest stay outlined.
- Resume/JD upload panels use the bordered card pattern with a plain
  monospace label ("YOUR RESUME", "JOB DESCRIPTION"), not a soft card.
- Keep every corner square. This is the easiest rule for Claude Code to
  accidentally drift from — call it out explicitly if a rounded corner
  shows up in review.

## 7. Explicit don'ts

- No rounded corners, anywhere
- No soft gray borders — black or nothing
- No second accent color alongside the yellow
- No drop shadows or gradients
- No sans-serif or proportional fonts — monospace only
- No Title Case — headers are UPPERCASE, body is lowercase, nothing in
  between

## 8. References

- Reference 1: JEV "how JEV answers" explainer graphic (screenshot provided)
  — take: color palette, monospace type, scored-list bar pattern, sharp
  corners, single-accent discipline.
- [ ] Reference 2 (optional — a full app screen, not just a marketing
  graphic, would help confirm how this holds up in a dashboard with more
  UI chrome: nav, forms, buttons): ___

