# Design

The final Studio is designed as an operational product, not a landing page. The layout follows Microsoft Fluent 2 principles: natural on every platform, built for focus, inclusive structure, and a familiar Microsoft product feel without copying Microsoft trademarks.

## Visual system

- Light app background with white command surfaces and dark evidence panels where dense trace data benefits from contrast.
- A restrained brand palette centered on blue, green, orange, and slate instead of a single-hue theme.
- Eight-pixel-or-smaller radii for cards and panels.
- Status badges that include labels, not color alone.
- Clear type hierarchy: product name, workspace heading, panel heading, metadata labels.
- Stable dimensions for command buttons, navigation items, scenario cards, and evidence tiles.

## Studio shell

The shell has four modes:

- Foundry evidence
- Crash test
- Patch and regression
- Safety card

The first viewport starts with the Foundry operations panel: readiness, import actions, recorded evidence, manifest inventory, trust map, and crash-test actions. A right evidence inspector keeps risk profile and report actions available without burying the workflow.

## Trust-boundary visualization

The trust map uses step cards for user input, instructions, tools, identity/RBAC, approval gates, and policy decisions. Each card shows risk level, review state, and the first controls. The visualization is intentionally readable in a screenshot for judges and useful during repeated reviews.

## Empty states

Empty states tell the operator the next action:

- import reviewed manifest;
- load recorded evidence;
- run Sample Lab fallback;
- export a Safety Card;
- save a regression before fixture replay.

They do not imply unavailable live features.

## Accessibility

The design follows Fluent accessibility guidance: scannable headings, predictable navigation, visible focus rings, text contrast targets, keyboard-accessible controls, descriptive button labels, and responsive reflow to mobile widths. `pnpm smoke:studio` checks keyboard focus and mobile horizontal overflow.

## Assets

The product mark and hero visual are app-owned deterministic PNGs:

- `docs/assets/brand/failsafe-logo.png`
- `docs/assets/brand/crash-lab-hero.png`
- `apps/studio-web/public/brand/failsafe-logo.png`
- `apps/studio-web/public/brand/crash-lab-hero.png`

They use shield and trust-boundary lattice motifs to support the product story without decorative filler.
