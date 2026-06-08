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

Status: implemented in the Phase 2 pass.

- Added `packages/scenario-engine` as a typed deterministic mock execution layer.
- Moved scenario-specific trace, finding, and score generation out of the API run service.
- Added shared execution schemas for mock scenario execution results.
- Extended regression artifacts with agent target ID, seed, source run status, mock replayability, scenario version, expected finding categories, and expected trace event types.
- Added `POST /regressions/:id/replay-mock` to create safe in-memory mock replay runs.
- Added a Studio `Replay Mock` affordance for saved regression artifacts.
- Extended `scripts/dev-check.ts` to validate all starter packs through the scenario engine and verify mock replay safety checks.

Implemented notes:

- Replay runs use the saved deterministic seed and set `baselineRunId` to the source run.
- The engine never executes real tools, file operations, shell commands, network calls, LLM calls, MCP calls, Copilot calls, email, or database actions.
- Runs and regression artifacts remain in memory for the API process only.

## Phase 2.5: Safe Mock Replay CLI And Replay Comparison

Status: implemented in the current Phase 2.5 pass.

- Added `pnpm failsafe` with `--help`, `replay --help`, `regressions`, and `replay <regression-id>`.
- CLI replay calls the running mock API, polls the replay run with a bounded timeout, and prints a concise mock-only summary.
- CLI supports `FAILSAFE_API_BASE_URL` and fails with actionable text when the API is unavailable.
- Added shared `ReplayComparison` schema.
- Added deterministic `compareMockReplayRuns` helper in `packages/scenario-engine`.
- Added `GET /runs/:id/comparison` for replay runs with `baselineRunId`.
- Added a Studio Baseline vs Replay panel after mock replay.
- Extended `scripts/dev-check.ts` to validate comparison output and CLI help.

Implemented notes:

- CLI replay requires a running API process.
- CLI and Studio replay both use in-memory regression artifacts only.
- The comparison panel compares synthetic mock runs only and does not prove real mitigation success.
- No persistence, sandbox runner, real Copilot invocation, live LLM call, MCP execution, file operation, shell execution, email action, network action, or database action was added.

## Phase 3A: Reviewed Dry-Run Runner Contract And Policy Preview

Status: implemented in the current Phase 3A pass.

- Added shared runner schemas for modes, action kinds, action risk, policy decisions, intended actions, policy violations, dry-run results, trace-like evidence, and capability manifest.
- Added a deny-by-default dry-run runner policy helper in `packages/scenario-engine`.
- Added `POST /runner/dry-run` to validate intended actions and return typed policy decisions.
- Added `pnpm failsafe runner --help` and `pnpm failsafe runner preview`.
- Added a Studio Runner Readiness panel that states real sandbox execution is not implemented.
- Extended `scripts/dev-check.ts` to validate runner schemas, capability manifest, deny-by-default behavior, blocked actions, not-implemented MCP/model calls, `executed: false`, `dryRunOnly: true`, and CLI help.

Implemented notes:

- The dry-run result never executes actions.
- Synthetic low-risk file-read intent can be modeled as policy-preview allowed without reading arbitrary files.
- File writes, shell commands, network requests, email sends, and database queries are blocked.
- MCP tool calls and model calls are marked not implemented.
- Dry-run policy preview is not runtime isolation and does not prove a patched agent is safe.
- No Docker, gVisor, background worker, live LLM call, MCP execution, file operation, shell execution, network action, email action, database action, persistence, auth, Redis, PostgreSQL, or deployment infrastructure was added.

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
- Patched-agent before/after comparison from a reviewed sandbox runner.
- Persistent regression storage.

## Phase 3B: Reviewed Local Sandbox Replay Plan Foundation

Status: implemented in the current Phase 3B pass.

- Added shared sandbox schemas for reviewed replay mode, plan, steps, safety boundaries, review status, blocked capabilities, not-implemented capabilities, and result shape.
- Added `createReviewedSandboxReplayPlan` in `packages/scenario-engine`.
- Added `POST /regressions/:id/sandbox-plan`.
- Added `pnpm failsafe sandbox --help` and `pnpm failsafe sandbox plan <regression-id>`.
- Added a Studio Sandbox Planning panel that generates and displays plan-only sandbox readiness from saved in-memory regressions.
- Extended `scripts/dev-check.ts` to validate the sandbox plan schema, review-required status, non-executable steps, blocked capability set, not-implemented capability set, and CLI sandbox help.

Implemented notes:

- Sandbox planning is `plan_only`, `mockOnly: true`, `fixtureOnly: true`, and `reviewStatus: human_review_required`.
- The plan endpoint looks up the in-memory regression, baseline run, project, scenario pack, and agent target; it does not read files or call external services.
- Allowed fixture IDs are synthetic allowlist metadata for future review only.
- Shell commands, arbitrary file reads/writes, network requests, live targets, MCP calls, model calls, email sends, database queries, destructive operations, secret access, background workers, and persistence writes remain blocked or not implemented.
- No fixture replay endpoint, isolated worker, Docker, gVisor, background worker, live LLM call, MCP execution, file operation, shell execution, network action, email action, database action, persistence, auth, Redis, PostgreSQL, or deployment infrastructure was added.

## Phase 3C: Reviewed Fixture-Only Replay

Build next:

- A hardcoded in-memory fixture map for reviewed synthetic fixture IDs only.
- A narrow `POST /regressions/:id/sandbox-fixture-replay` endpoint only if it accepts no paths, URLs, commands, tool names, or live targets from the client.
- Typed fixture replay result validation that still reports no arbitrary execution.
- Studio and CLI affordances that clearly say fixture replay only.
- Dev checks that fail if shell, network, MCP, model, email, database, arbitrary file, destructive, persistence, or background-worker paths are introduced.

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

1. Fixture replay agent: turn the Phase 3B plan contract into a reviewed fixture-only replay path using hardcoded synthetic fixtures and no arbitrary execution.
2. Sandbox agent: after fixture-only replay is proven safe, design a reviewed local sandbox prototype with strict isolation, while keeping dry-run defaults.
3. Persistence agent: design durable regression storage without changing the mock-only safety defaults.
4. Patch Coach agent: connect findings to richer Copilot prompt payloads while keeping UI invocation mocked until explicitly promoted.
5. Safety agent: harden safety policy enforcement and add tests for forbidden live targets.
6. Demo agent: create a polished five-minute script, screenshots, and presentation outline.
