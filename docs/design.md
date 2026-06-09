# Design Document

## Product Feel

FailSafe should feel like a crash lab for AI agents: precise, visual, serious, and fast to understand. The interface should make invisible reasoning failures tangible without becoming a generic security dashboard or a stock AI landing page.

The visual direction is an original Crash Lab identity: dark instrument panels, generated FailSafe shield/impact imagery, cyan safety signals, amber hazard accents, and dense operational surfaces. It should feel polished enough for a Microsoft-oriented developer audience without copying Microsoft product marks.

The product tone is pragmatic and evidence-driven. It should help builders understand what happened, why it matters, what Foundry agent boundary was involved, and what to do next.

## UX Principles

- Show the crash path, not just the final score.
- Separate trusted instructions from untrusted data visually.
- Keep demo actions obvious and reversible.
- Prefer concrete evidence over abstract warnings.
- Make Copilot usage visible at the moment a developer needs help.
- Make Microsoft Foundry alignment visible through manifest import, readiness, trust-boundary maps, identity/RBAC notes, and reviewed fixture replay.
- Avoid offensive framing. Use defensive scenario language.
- Keep the first screen useful; no marketing landing page.

## Main Dashboard Layout

The dashboard has three primary regions:

- Left: scenario library with starter packs and active selection.
- Center: Foundry/agent operations panel, crash timeline, scorecard, and finding cards.
- Right: risk inspector with target, runner readiness, Safety Card export, sandbox plan, and regression controls.

The header contains the product name, tagline, and primary actions:

- Run Crash Test
- Fix with Copilot
- Save Regression

The first screen must show the working Crash Lab console. The generated hero asset can appear as a restrained operational background, but not as a marketing hero that hides the workflow.

## Crash Timeline Behavior

Timeline events should be ordered by timestamp and show:

- Event summary.
- Event type.
- Actor.
- Trust boundary.
- Input source.
- Parent-child relationship when available.

Trust-boundary labels must be visually prominent. The most important demo moment is when untrusted content or MCP metadata influences an agent action.

Future timeline interactions:

- Click event to inspect raw evidence.
- Filter by actor, boundary, or finding.
- Highlight events referenced by a finding.
- Compare baseline and rerun timelines.

## Risk Inspector Behavior

The agent operations panel should summarize Microsoft Foundry readiness, imported reviewed manifests, selected agent mode, missing optional env vars, blocked operations, trust-boundary count, and high-risk review points. It should offer:

- Import Foundry Manifest
- Crash-Test Foundry Agent
- Run Foundry Fixture Replay
- Trust-boundary map preview

The risk inspector should summarize the active target and explain why the selected pack matters. It should show:

- Agent target count.
- Tool count.
- Highest tool risk.
- Approval coverage.
- Active threat model.
- Finding count.
- Sample Lab, Foundry manifest, Foundry connected readiness, or fixture replay mode.

The inspector should avoid pretending the product has performed live Foundry execution or real static analysis. Foundry manifest mode is reviewed modeling and local evidence, not production certification.

## Safety Score Visualization

The scorecard should display:

- Overall FailSafe score from 0 to 100.
- Attack success rate.
- Task utility.
- Severity.
- Scope breach.
- Repeatability penalty.
- Explanation confidence.
- A clear note that the score is an initial product heuristic.

Scores below 55 should feel urgent. Scores above 80 should feel safer but never guaranteed.

## Color and Label System

Trust-boundary labels:

- `system`: teal.
- `developer`: light cyan.
- `user`: blue.
- `repository`: violet.
- `mcp_metadata`: amber.
- `retrieved_content`: orange.
- `tool_output`: lime.
- `external_network`: red.
- `sandbox_runtime`: white.

Severity labels:

- info: teal.
- low: green.
- medium: amber.
- high: red.
- critical: red background with white text.

## Empty States

Empty states should be short, useful, and action-oriented. They should never imply missing real test coverage before it exists.

Examples:

- No crash trace loaded: "Run a starter pack to load the predefined mock timeline."
- No findings yet: "A clean run will still save trace evidence for future regression checks."

## Copywriting Tone

Use clear product language:

- "untrusted content"
- "trust boundary"
- "approval gate"
- "synthetic crash test"
- "Foundry manifest"
- "reviewed fixture replay"
- "Sample Lab fallback"
- "root cause"
- "regression case"

Avoid:

- Offensive claims.
- Guarantees of safety.
- Fear-based copy.
- Vague "AI magic" language.
- Claims that FailSafe invoked live Copilot, live Foundry tools, or proved a production mitigation unless that actually happened.

## Accessibility Notes

- Maintain keyboard-accessible buttons and scenario selection.
- Provide visible focus states.
- Keep contrast high on dark surfaces.
- Do not rely on color alone for severity or boundary meaning.
- Use semantic headings for dashboard regions.
- Keep text sizes readable on mobile and desktop.
