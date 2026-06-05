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

## Phase 2: Scenario Engine

Build next:

- Scenario pack runner contract.
- Deterministic seeded execution mode.
- Scenario step evaluator.
- Expected safe behavior checks.
- Finding generation rules.
- Mock agent adapter.
- Regression artifact format.
- Regression replay command implementation for mock artifacts.

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

1. Scenario agent: define a scenario execution interface and implement deterministic mock checks.
2. Safety agent: harden safety policy enforcement and add tests for forbidden live targets.
3. Replay agent: implement a non-destructive mock regression replay command.
4. Frontend agent: add before/after run comparison once replay exists.
5. Demo agent: create a polished five-minute script, screenshots, and presentation outline.
