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

- The initial Phase 1 implementation stored runs and regressions in memory. The current product now persists non-seed runs and regressions in the app-owned `.failsafe-data` store.
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
- Added `POST /regressions/:id/replay-mock` to create safe local mock replay runs.
- Added a Studio `Replay Mock` affordance for saved regression artifacts.
- Extended `scripts/dev-check.ts` to validate all starter packs through the scenario engine and verify mock replay safety checks.

Implemented notes:

- Replay runs use the saved deterministic seed and set `baselineRunId` to the source run.
- The engine never executes real tools, file operations, shell commands, network calls, LLM calls, MCP calls, Copilot calls, email, or database actions.
- Runs and regression artifacts are persisted locally in `.failsafe-data` after Phase 3D.

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
- CLI and Studio replay use the local app-owned regression store.
- The comparison panel compares synthetic mock runs only and does not prove real mitigation success.
- No real sandbox runner, real Copilot invocation, live LLM call, MCP execution, file operation, shell execution, email action, network action, or database action was added.

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
- No Docker, gVisor, background worker, live LLM call, MCP execution, file operation, shell execution, network action, email action, database action, auth, Redis, PostgreSQL, or deployment infrastructure was added.

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
- Added a Studio Sandbox Planning panel that generates and displays plan-only sandbox readiness from saved local regressions.
- Extended `scripts/dev-check.ts` to validate the sandbox plan schema, review-required status, non-executable steps, blocked capability set, not-implemented capability set, and CLI sandbox help.

Implemented notes:

- Sandbox planning is `plan_only`, `mockOnly: true`, `fixtureOnly: true`, and `reviewStatus: human_review_required`.
- The plan endpoint looks up the persisted local regression, baseline run, project, scenario pack, and agent target; it does not read arbitrary files or call external services.
- Allowed fixture IDs are synthetic allowlist metadata for reviewed fixture-only replay.
- Shell commands, arbitrary file reads/writes, network requests, live targets, MCP calls, model calls, email sends, database queries, destructive operations, secret access, and background workers remain blocked or not implemented.
- No isolated worker, Docker, gVisor, background worker, live LLM call, MCP execution, arbitrary file operation, shell execution, network action, email action, database action, auth, Redis, PostgreSQL, or deployment infrastructure was added.

## Phase 3C: Reviewed Fixture-Only Replay

Status: implemented in the PRD completion pass.

- Added shared `FixtureReplayResult` schemas.
- Added a deterministic reviewed fixture replay helper in `packages/scenario-engine`.
- Added `POST /regressions/:id/fixture-replay` and `GET /regressions/:id/fixture-replay`.
- Added a Studio `Fixture Replay` action on saved regressions.
- Added `pnpm failsafe sandbox fixture-replay <regression-id>`.
- Extended `scripts/dev-check.ts` to validate fixture replay status, score improvement, trace evidence, blocked capabilities, CLI help, and safety checks.

Implemented notes:

- Fixture replay uses app-owned synthetic fixture IDs derived from the reviewed sandbox plan.
- The endpoint accepts no client-provided paths, URLs, commands, tool names, MCP targets, model targets, email targets, database targets, secrets, or live targets.
- Fixture replay creates a typed synthetic replay run with `status: passed` and comparison evidence.
- Fixture replay is not arbitrary sandbox execution and is not runtime isolation proof.

## Phase 3D: App-Owned Local Persistence

Status: implemented in the PRD completion pass.

- Added `.failsafe-data/` to `.gitignore`.
- Added a versioned local JSON store at `.failsafe-data/store.json`.
- Persisted non-seed runs, regressions, sandbox plans, fixture replay results, and report metadata.
- Added `POST /demo/reset` and `pnpm failsafe reset-demo-data`.
- Added Studio reset support in the Safety Card panel.

Implemented notes:

- The API writes only under the app-owned `.failsafe-data` directory.
- No client-supplied filesystem paths are accepted for persistence.
- Seed projects, scenario packs, and the seeded demo run remain tracked source data.

## Phase 4: Patch Coach

Status: implemented in the PRD completion pass.

- Added shared Patch Coach schemas.
- Added a finding-to-mitigation mapper and Copilot prompt payload generator.
- Added `POST /runs/:id/patch-coach`.
- Added Studio Patch Coach rendering in the Fix with Copilot panel.
- Added `pnpm failsafe patch-coach <run-id> [finding-id]`.
- Extended `scripts/dev-check.ts` to validate Patch Coach prompt generation and safety boundaries.

Implemented notes:

- Patch Coach generates prompt payloads only.
- It does not call Copilot, modify files, run tools, or prove a patch worked.

## Phase 5: Reports, CLI Completion, And Demo Polish

Status: implemented in the PRD completion pass.

- Added shared Safety Report schemas.
- Added `POST /runs/:id/report`, `GET /reports`, and `GET /reports/:id`.
- Added local Markdown Safety Card export under `.failsafe-data/reports`.
- Added Studio Safety Card export panel.
- Added `pnpm failsafe runs`, `pnpm failsafe report <run-id>`, and `pnpm failsafe reports`.
- Updated README, architecture, demo, and safety docs for the completed local product.

Still future work:

1. Real sandbox isolation with Docker, gVisor, or equivalent.
2. Live MCP introspection/execution through reviewed mock or fixture adapters.
3. Optional live model/provider integration behind explicit opt-in config.
4. Optional Copilot invocation from outside the app through a reviewed workflow.
5. Browser harnesses, OpenTelemetry export, screenshots/GIFs, and final demo video assets.
