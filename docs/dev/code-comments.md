# Code comments: the house style

Every source file in this repo opens with a header comment written for someone who is
**not a developer** — a policy analyst, a ministry officer, a reviewer checking whether the
numbers can be trusted. If you add a file, add one.

This is a deliberate choice for this project. The app's whole claim is that its figures are
traceable, so the code that produces them should be readable by the people who have to
defend those figures in a meeting.

## What a header should say

Answer these, in plain English, in a few sentences:

1. **What is this file for?** Not its name restated — its job.
2. **Why does it matter?** What breaks, or what becomes untrustworthy, without it.
3. **What should a reader know before changing it?** Only if there is something
   non-obvious.

Route files also list their endpoints with a one-line description each.

### Good

```js
/**
 * Builds year-by-year emissions histories from Climate TRACE.
 *
 * Climate TRACE publishes emissions under its own category names ("slugs"). Uganda's NDC
 * groups things differently, into sectors like AFOLU and Energy. This module is the
 * translator.
 *
 * Two rules matter for accuracy:
 *  - A year with no data stays empty. It is never filled in by guessing, so a gap on a
 *    chart is a real gap.
 *  - If any slug making up a sector is missing, the whole sector total is left empty
 *    rather than reported as a smaller, misleading number.
 */
```

A reader who has never opened this codebase now knows what the file does and, more
usefully, what it deliberately refuses to do.

### Not useful

```js
/**
 * ClimateTraceTimeseries service.
 *
 * Exports getUiSectorTimeseries, getSlugBreakdownForYear, warmSlugYears.
 */
```

The file already says this. A comment that restates the code is worse than none, because it
has to be kept in step for no benefit.

## Vocabulary

Spell out the domain terms the first time they appear in a file — AFOLU, MRV, BAU, NDC,
slug, net flux. Assume the reader knows climate policy but not this codebase, or the
reverse, but not both.

Prefer "million tonnes of CO₂ equivalent (MtCO₂e)" on first use over the bare unit.

## Inline comments

Reserve them for the *why*, especially where the code looks wrong but is not, or where an
earlier version was wrong:

```js
// Bound magnitude in both directions: a net-flux sector can be negative, but a sink far
// beyond the sector ceiling is still a unit error worth surfacing.
if (value !== null && Math.abs(value) > ceiling) {
```

Do not narrate what the next line does.

## Where the different docs live

| Audience | Where |
| -------- | ----- |
| Someone using the app | `/docs` inside the app, and `docs/guide/` |
| Someone reading the code | The file headers described here |
| Someone setting it up | `README.md` |
| Someone changing the architecture | `docs/dev/` |
