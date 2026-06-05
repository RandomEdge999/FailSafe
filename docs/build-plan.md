# Build Plan

## Phase 0: Foundation

Status: current phase.

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

Next agent should build:

- API-backed studio data loading.
- Run state transitions: queued, running, needs_review, passed.
- Mock run creation tied to selected scenario pack.
- Event detail drawer for raw trace evidence.
- Finding-to-Copilot prompt handoff UI.
- Save regression mock artifact.
- Lightweight component tests or Playwright smoke test.

## Phase 2: Scenario Engine

Build:

- Scenario pack runner contract.
- Deterministic seeded execution mode.
- Scenario step evaluator.
- Expected safe behavior checks.
- Finding generation rules.
- Mock agent adapter.
- Regression artifact format.

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

1. Frontend agent: wire the dashboard to the Fastify API and add event detail interactions.
2. Backend agent: add mock run lifecycle state and regression artifact endpoints.
3. Scenario agent: define a scenario execution interface and implement deterministic mock checks.
4. Safety agent: harden safety policy enforcement and add tests for forbidden live targets.
5. Demo agent: create a polished five-minute script, screenshots, and presentation outline.
