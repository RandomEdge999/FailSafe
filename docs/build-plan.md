# Build Plan

## Phase 0: Foundation

Status: complete in foundation commit.

Deliver:

- Monorepo structure.
- Root package scripts.
- Shared Zod schemas.
- Starter defensive scenario packs.
- Scoring heuristic.
- Fastify mock API.
- Next.js mock studio dashboard.
- Example vulnerable-agent target.
- Documentation system.
- Copilot instructions, prompt files, and custom agent files.

## Phase 1: Mock Studio Vertical Slice

Status: implemented in the current Phase 1 pass.

- API-backed studio data loading.
- Run state transitions: queued, running, needs_review.
- Mock run creation tied to selected scenario pack.
- Event detail drawer for raw trace evidence.
- Finding-to-Copilot prompt handoff UI.
- Save regression mock artifact.
- Lightweight dev check coverage for the regression artifact schema.

Implemented notes:

- Runs and regressions are stored in memory for the API server process only.
- `POST /runs/mock` accepts selected project, scenario pack, and optional agent target context.
- `GET /runs/:id` materializes a short synthetic lifecycle for frontend polling.
- `POST /regressions/mock` creates a typed artifact from completed run trace and findings.
- The studio does not execute Copilot, live LLM calls, real MCP tools, real file operations, or replay commands.

## Phase 2: Deterministic Mock Scenario Engine And Replay

Status: implemented in the current Phase 2 pass.

- Added `packages/scenario-engine` as a typed deterministic mock execution layer.
- Moved scenario-specific trace, finding, and score generation out of the API run service.
- Added shared execution schemas for mock scenario execution results.
- Extended regression artifacts with agent target ID, seed, source run status, mock replayability, scenario version, expected finding categories, and expected trace event types.
- Added `POST /regressions/:id/replay-mock` to create safe in-memory mock replay runs.
- Added a Studio `Replay Mock` affordance for saved regression artifacts.
- Extended `scripts/dev-check.ts` to validate all starter packs through the scenario engine and verify mock replay safety checks.

Implemented notes:

- Mock replay is API-only. The `pnpm failsafe replay ...` CLI remains unimplemented.
- Replay runs use the saved deterministic seed and set `baselineRunId` to the source run.
- The engine never executes real tools, file operations, shell commands, network calls, LLM calls, MCP calls, Copilot calls, email, or database actions.
- Runs and regression artifacts remain in memory for the API process only.

## Phase 2 Original Target

Delivered:

- Scenario pack runner contract.
- Deterministic seeded execution mode.
- Scenario step to trace/finding mapping for the three starter packs.
- Expected safe behavior context in regression artifacts.
- Finding generation rules.
- Mock scenario engine adapter used by the API.
- Regression artifact replay context.
- API mock replay implementation for mock artifacts.

Still deferred:

- Full scenario step evaluator.
- Real mock-agent adapter process.
- CLI replay command.
- Before/after run comparison.

## Phase 3: Sandbox Runner

Build:

- Isolated worker process.
- Docker or gVisor-style sandbox prototype.
- Deny-by-default file, shell, network, email, and database policies.
- Tool invocation proxy.
- Approval gate proxy.
- Trace capture for model messages, tool calls, and policy decisions.
- Local-only demo harness.

## Phase 4: Patch Coach

Build:

- Finding-to-mitigation mapper.
- Copilot prompt payload generator.
- Guardrail pattern library.
- Regression test generator.
- Before/after run comparison.
- Human review checklist.

## Phase 5: Demo Polish

Build:

- Five-minute demo flow.
- Public GitHub repo cleanup.
- Architecture diagram export.
- Demo video script.
- Seed data reset command.
- Responsive UI polish.
- README screenshots or GIFs.

## What Each Future Agent Should Build Next

1. Replay agent: implement a non-destructive CLI that calls the running mock API and fails gracefully when the API is unavailable.
2. Frontend agent: add before/after run comparison for baseline and replay timelines.
3. Safety agent: harden safety policy enforcement and add tests for forbidden live targets.
4. Scenario agent: expand the deterministic step evaluator without adding real runner behavior.
5. Demo agent: create a polished five-minute script, screenshots, and presentation outline.
