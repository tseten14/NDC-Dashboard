# NDC Data Explorer visual system

The interface uses a plain, institutional presentation so data, provenance, and actions remain easy to scan. This is an application-specific system informed by USWDS, GOV.UK, and GC Design System conventions; it does not use their branding.

## Principles

- Put the page title, purpose, data status, and primary action before supporting detail.
- Use text labels for controls and chart series. Color reinforces meaning but does not carry it alone.
- Keep content on white or neutral surfaces with visible borders. Avoid gradients, glass, shadows, ornamental backgrounds, and decorative motion.
- Preserve clear browser behavior: links look like links, buttons look like buttons, disabled controls state why they are unavailable, and focus is always visible.
- Use the same components and spacing across all routes. Keep map interaction and the satellite basemap where they communicate geographic data.

## Tokens

The source of truth is `frontend/src/index.css`. Tailwind maps its semantic utilities to those CSS variables in `frontend/config/tailwind.config.ts`.

| Use | Light | Dark |
| --- | --- | --- |
| Page and card | `#fff` | near-black neutral |
| Body text | near-black (`hsl(210 13% 12%)`) | near-white |
| Primary action and focus | `#245a81` | light blue |
| Borders | neutral gray | neutral gray |
| Positive status | dark green | light green |
| Caution status | dark amber | light amber |
| Negative status | dark red | light red |

The normal body size is 16 px with a system sans-serif stack and 1.5 line height. Small labels have a 14 px minimum. Corners are at most 4 px. Layout spacing uses Tailwind's 4 px scale, with 16–24 px internal padding for most panels.

## Components and content

- Header and breadcrumbs identify the current location. The All tools control exposes the complete navigation on narrow screens.
- Buttons, fields, tabs, tables, alerts, and dialogs use a visible border, concise label, and immediate state change. Inputs have an associated label. Tables retain headings and use horizontal scrolling when required by dense data.
- Charts use the muted categorical palette in the CSS tokens and `frontend/src/lib/visual-palette.ts`. Every chart needs a title, units, series names, and a nearby text summary, values, or table. Maps need a labeled legend and a text summary of the displayed data.
- Light is the default. The theme switch remains available; dark mode uses the same hierarchy and semantic status roles.
- Loading and progress states are static. Only map interaction and resize scheduling retain animation frames for functionality.

## Accessibility and output

Interactive controls need visible keyboard focus, usable accessible names, and at least 44 px target height where practical. Text and action contrast should meet WCAG AA; status colors should be paired with words or symbols. Browser checks in `frontend/tests/e2e` cover route rendering, representative viewport widths, keyboard interaction, and axe accessibility checks.

Print rules in `frontend/src/index.css` use white backgrounds, dark text, static headers, repeating table headings, and hide controls that do not make sense on paper. When adding a page, check it at phone, tablet, desktop, and wide widths and test print layout for any view intended as a report.
