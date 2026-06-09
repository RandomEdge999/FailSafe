# Product Requirements Document

## Product Vision

FailSafe is a crash-test studio for AI agents. It makes agent failures visible, replayable, explainable, and fixable by turning adversarial safety scenarios into a guided developer workflow.

The product should feel like a crash lab for agent systems: import a target, select a scenario pack, run a controlled crash test, inspect the timeline, understand the score, generate a mitigation, rerun, and save the case as a regression.

## Target Users

- Developers building AI agents with tool use, retrieval, MCP, browser automation, or code execution.
- AI safety and platform teams responsible for agent readiness reviews.
- Hackathon judges evaluating creativity, reliability, practical reasoning, and meaningful Copilot usage.
- Developer advocates who need a short, visual demo of agent safety failure modes.

## Hackathon Alignment

FailSafe fits the Microsoft Agents League Hackathon Creative Apps category because it is a polished developer-facing application, not a raw script. It uses GitHub Copilot visibly through repository instructions, reusable prompt files, custom agent roles, mitigation workflows, and planned patch-generation loops.

## MVP Scope

The MVP should demonstrate one complete mock crash-test flow:

1. Select a synthetic vulnerable agent.
2. Choose one of three starter packs.
3. Run a controlled mock crash test.
4. Show a visual timeline with trust-boundary labels.
5. Display a FailSafe score and root-cause finding.
6. Provide Copilot-ready mitigation prompts.
7. Save or describe a regression case.

## Current Local Product Scope

The current PRD-grade local build extends the MVP with:

- App-owned local persistence for non-seed runs, regressions, sandbox plans, fixture replay results, and Safety Card metadata under `.failsafe-data`.
- Deterministic mock replay for saved regressions.
- Reviewed fixture-only replay from FailSafe-owned synthetic fixture IDs.
- Baseline-vs-replay comparison evidence.
- Patch Coach plans with Copilot prompt payloads and regression checklists.
- Local Markdown Safety Card export.
- CLI commands for runs, regressions, mock replay, fixture replay, Patch Coach, reports, runner preview, sandbox planning, and demo reset.

These flows remain local, synthetic, typed, defensive, and bounded. They are not arbitrary sandbox execution, live MCP execution, live model invocation, live Copilot invocation, or production security certification.

## Non-Goals

- No live offensive testing against real systems.
- No real exploit deployment guidance.
- No real secret handling in demos.
- No destructive file, shell, email, network, or database actions.
- No formal security certification claims.
- No arbitrary sandbox runner.
- No live LLM API integration unless explicitly requested and made opt-in.
- No live Copilot invocation from the app.

## Core Workflows

### Import Agent Project

The user selects an agent project. FailSafe detects candidate agent targets, instruction files, tools, MCP servers, trust boundaries, and approval settings.

### Choose Scenario Pack

The user selects a defensive scenario pack such as tool poisoning, indirect prompt injection, or approval bypass. Scenario packs define threat model, synthetic inputs, expected safe behavior, unsafe behavior examples, and mitigation patterns.

### Run Crash Test

The orchestrator creates a run, passes scenario inputs to a controlled target, records trace events, blocks dangerous demo actions, and emits findings.

### Inspect Failure

The studio shows a timeline of trace events, trust boundaries, actor labels, risk score, root cause, evidence event IDs, and recommended mitigations.

### Patch and Regress

The user sends a finding into a Copilot prompt, applies a bounded mitigation, reruns the same scenario, and saves the result as a regression case.

## Functional Requirements

- List projects and project details.
- List scenario packs and scenario details.
- Start a mock run.
- List runs and run details.
- List findings and finding details.
- Render a dashboard with scenario library, crash timeline, risk inspector, scorecard, findings, and primary actions.
- Share core data models between frontend, backend, scenario packs, and scoring.
- Validate starter packs with Zod schemas.
- Provide Copilot instructions, prompt files, and custom agent instruction files.

## Non-Functional Requirements

- TypeScript-first implementation.
- Strong shared schemas with Zod.
- No real secrets in source control.
- Defensive-only language and synthetic examples.
- Clear local setup.
- Responsive, readable UI.
- Extensible monorepo structure.
- Mock mode must be obvious.
- Future sandbox execution must be isolated, observable, and deny-by-default.

## Data Model Summary

Core entities:

- `Project`: imported repository, risk profile, targets, MCP servers, and tools.
- `AgentTarget`: runnable or mock target for a crash test.
- `Tool`: capability metadata, scopes, risk level, and approval requirement.
- `ScenarioPack`: defensive scenario collection with expected safe behavior.
- `ScenarioRun`: execution record containing score, findings, and trace.
- `TraceEvent`: typed event with actor, trust boundary, source, raw evidence, and metadata.
- `Finding`: root-cause analysis with category, severity, confidence, evidence, and mitigations.
- `CrashScore`: numeric score and factor breakdown.
- `RegressionArtifact`: saved local replay context for deterministic mock and fixture-only replay.
- `FixtureReplayResult`: reviewed synthetic fixture replay result with comparison evidence.
- `PatchCoachPlan`: mitigation steps and Copilot-ready prompt payloads for human review.
- `SafetyReport`: local Markdown Safety Card export metadata and content.

## Risk Scoring Summary

The initial scoring engine is a product heuristic:

```txt
overall = 100
  - 35 * attackSuccessRate
  - 25 * severity
  - 20 * (1 - taskUtility)
  - 10 * scopeBreach
  - 10 * repeatabilityPenalty
```

The result is clamped between 0 and 100. This is not a formal security standard. It exists to make demo risk understandable and to guide prioritization.

## Demo Requirements

- Demo in under five minutes.
- Show the product name, tagline, and dashboard immediately.
- Run a synthetic crash test.
- Show a timeline with trust-boundary labels.
- Show a score and root-cause finding.
- Show where Copilot helps explain, patch, and regress the issue.
- Avoid live secrets, external targets, or destructive actions.

## Acceptance Criteria

- `pnpm install` succeeds.
- `pnpm dev` starts frontend and backend.
- Frontend renders the FailSafe Studio mock dashboard.
- Backend returns mock API responses.
- Shared schemas typecheck.
- Attack packs exist as typed mock objects.
- Scoring engine works with mock data.
- Saved regressions persist locally under the app-owned `.failsafe-data` store.
- Mock replay, fixture replay, Patch Coach, and Safety Card export work without live external dependencies.
- Docs are useful and specific.
- Copilot instructions and prompt files exist.
- Custom agent files exist.
- Repository is defensive and hackathon-compliant.
