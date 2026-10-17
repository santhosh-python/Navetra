# Design notes

Navetra uses a quiet, Apple-inspired layout: light neutral surfaces, generous spacing, minimal shadows and clear typography. The interface is for staff under time pressure, so the risk meaning must be obvious at a glance.

## Palette

| Role | Hex |
| --- | --- |
| Background | `#F7F8FA` |
| Surface | `#FFFFFF` |
| Text | `#191D23` |
| Secondary text | `#68717D` |
| Border | `#E6E9ED` |
| Accent | `#D97732` |
| Critical | `#C83D43` |
| Warning | `#D99A25` |
| Safe | `#278568` |
| Info | `#3978B7` |

The accent is orange. Avoid purple and blue "AI" styling for product surfaces. Blue is reserved for informational states.

## Risk is never colour alone

Every risk appears as a coloured badge with a text label (Critical, Warning, Safe) and an icon. Charts use labelled legends and text counts, and each chart has a text summary for screen readers.

## Typography and numerals

- Inter, bundled through `@fontsource-variable/inter` so the app makes no font requests.
- Tabular numerals in tables and figures, so columns align.
- Radii of 8–14 px. Shadows are minimal or absent.

## Layout

- Collapsible sidebar on desktop; state is remembered in the browser.
- On narrow screens the sidebar becomes a drawer. It closes after navigation and on Escape.
- A skip link goes to the main content. On route change, focus moves to the page's main heading.
- Compact density is available in Settings for dense tables.

## Motion

Animations respect `prefers-reduced-motion`. When it is set, transitions are removed.

## Accessibility status

Built in: semantic headings, labelled controls, keyboard support for the search palette and segmented controls, live regions for toasts, and text alternatives for charts.

Checked: secondary text colours meet WCAG AA on the page background (4.65:1 for `#68717D`). Headless-Chromium screenshots of each route were reviewed at desktop and phone widths.

Not yet done: a formal audit with a screen reader, a contrast audit of every state (including chart colours), or testing with real users. Treat these as open work.
