# FailSafe: A Crash-Test Studio for AI Agents

Crash-test AI agents before production does.

FailSafe is a visual crash-test studio for AI agents and MCP toolchains. It helps developers import an agent project, map tools and trust boundaries, run defensive synthetic scenarios, visualize the failure timeline, score the risk, generate mitigation guidance, rerun the same mock scenario as a regression case, and compare a baseline run against a deterministic mock replay.

## Problem Statement

Agent builders increasingly ship systems that read files, call tools, retrieve content, use MCP servers, browse pages, and perform state-changing actions. These systems can fail in subtle ways when untrusted content, poisoned tool metadata, missing approvals, or over-scoped tools influence the agent. Most teams do not have a practical way to replay those failures, explain the root cause, or prove that a mitigation worked.

## Why It Matters

FailSafe makes invisible agent failure paths visible. Instead of treating prompt injection, tool poisoning, approval bypass, or task drift as abstract risks, the studio turns them into a crash-test workflow with evidence, timeline events, findings, scores, and Copilot-ready remediation prompts.

## Microsoft Agents League Fit

FailSafe is built for the Microsoft Agents League Hackathon, Creative Apps category. The project emphasizes creativity, reasoning, reliability, safety, and polished user experience. GitHub Copilot usage is part of the product surface through repository instructions, prompt files, custom agent roles, mitigation workflows, and regression-generation prompts.

## Core Workflow

1. Import or select an agent project.
2. Detect tools, MCP servers, prompts, trust boundaries, and high-risk actions.
3. Choose a crash-test scenario pack.
4. Run a synthetic mock crash test or preview future runner policy decisions.
5. Watch the failure timeline.
6. Review the risk score and root-cause findings.
7. Generate a bounded mitigation plan.
8. Use Copilot-oriented prompts to patch the issue.
9. Rerun the same scenario.
10. Save the crash as a regression case.

## Current MVP Scope

The current Phase 3B slice includes a runnable API-backed mock studio, mock orchestrator API, shared Zod schemas, starter defensive scenario packs, a deterministic mock scenario engine, a scoring heuristic, example vulnerable-agent inputs, in-memory mock run lifecycle state, in-memory regression artifacts, safe mock replay API support, a local mock replay CLI, baseline-vs-replay comparison schemas and endpoint, a reviewed dry-run runner contract, a deny-by-default runner policy preview endpoint, a CLI runner preview command, a reviewed sandbox replay plan contract, a sandbox plan API endpoint, a CLI sandbox plan command, Studio runner readiness and sandbox planning panels, docs, Copilot instructions, prompt files, and custom agent instruction files.

It does not include real sandbox execution, fixture replay execution, runtime isolation, live LLM calls, real MCP introspection or execution, PostgreSQL persistence, queues, authentication, deployment infrastructure, or destructive tool execution. Dry-run runner decisions and sandbox plans are review artifacts only; they are not proof that untrusted code was isolated or that a real mitigation worked.

## Architecture Overview

```txt
apps/studio-web          Next.js dashboard and mock crash-lab UI
apps/orchestrator-api    Fastify mock API for projects, scenarios, runs, findings, regressions, replay comparison, runner policy preview, and sandbox plan review
packages/schemas         Shared Zod schemas and TypeScript types
packages/attack-packs    Typed starter defensive scenario packs
packages/scenario-engine Deterministic synthetic run, finding, trace, replay, comparison, dry-run policy, and sandbox plan helpers
packages/scoring-engine  Initial crash-score heuristic
packages/trace-model     Trace and timeline helpers
examples/vulnerable-agent Synthetic local target for demos
```

Future targets are PostgreSQL for persistence, Redis/BullMQ for queues, Docker or gVisor-style isolation for the sandbox worker, OpenTelemetry-compatible trace export, Playwright for browser harnesses, and optional MCP server integration.

## Local Setup

Prerequisites:

- Node.js 20 or newer
- pnpm 10 or newer

Install dependencies:

```bash
pnpm install
```

Run frontend and backend together:

```bash
pnpm dev
```

Run only the web studio:

```bash
pnpm dev:web
```

Run only the API:

```bash
pnpm dev:api
```

Validate the foundation:

```bash
pnpm check
pnpm build
```

Run the safe local mock CLI:

```bash
pnpm failsafe --help
pnpm failsafe regressions
pnpm failsafe replay <regression-id>
pnpm failsafe runner --help
pnpm failsafe runner preview
pnpm failsafe sandbox --help
pnpm failsafe sandbox plan <regression-id>
```

The CLI defaults to `http://localhost:4000`. Set `FAILSAFE_API_BASE_URL` to point it at another running FailSafe mock API. CLI replay and sandbox planning require the API process that created the in-memory regression artifact; artifacts are not persisted across API restarts. `pnpm failsafe runner preview` calls the dry-run policy preview endpoint with synthetic intended actions and prints decisions; it does not execute those actions. `pnpm failsafe sandbox plan <regression-id>` calls the reviewed sandbox plan endpoint and prints a plan-only safety summary; it does not execute tools, shell commands, file actions, network calls, MCP servers, model calls, email, databases, or external systems.

Default local URLs:

- Studio: http://localhost:3000
- API health: http://localhost:4000/health
- Mock scenarios: http://localhost:4000/scenarios

## Mock API Endpoints

The studio loads data from the Fastify API by default at `http://localhost:4000`. Set `NEXT_PUBLIC_API_BASE_URL` to point the web app at a different mock API origin.

Implemented mock API endpoints:

- `GET /health`
- `GET /projects`
- `GET /projects/:id`
- `GET /scenarios`
- `GET /scenarios/:id`
- `GET /runs`
- `GET /runs/:id`
- `GET /runs/:id/comparison`
- `POST /runs/mock`
- `GET /findings`
- `GET /findings/:id`
- `GET /regressions`
- `GET /regressions/:id`
- `POST /regressions/mock`
- `POST /regressions/:id/replay-mock`
- `POST /regressions/:id/sandbox-plan`
- `POST /runner/dry-run`

`POST /runs/mock` accepts:

```json
{
  "projectId": "project-vulnerable-agent",
  "scenarioPackId": "pack-tool-poisoning",
  "agentTargetId": "agent-invoice-reviewer"
}
```

It creates an in-memory mock run that moves from `queued` to `running` to `needs_review` when polled through `GET /runs/:id`.

`POST /regressions/mock` accepts a completed run ID and creates an in-memory mock regression artifact. Phase 2 artifacts include the agent target ID, deterministic mock seed, source run status, scenario engine version, expected finding categories, expected trace event types, and a local replay endpoint string such as:

```txt
POST /regressions/regression-tool-poisoning-pack-tool-poisoning-guardrail-a1b2c3/replay-mock
```

`POST /regressions/:id/replay-mock` looks up the in-memory artifact, verifies it is marked mock replayable, reruns the deterministic synthetic scenario with the saved seed, stores a new in-memory replay run, and returns a typed `ScenarioRun`. It does not execute real tools, files, shell commands, network calls, LLM calls, MCP calls, Copilot calls, email, or database actions.

`POST /regressions/:id/sandbox-plan` looks up the in-memory artifact, baseline run, project, scenario pack, and agent target, then returns a typed reviewed sandbox replay plan. The plan is `plan_only`, `mockOnly: true`, `fixtureOnly: true`, and `reviewStatus: human_review_required`. It lists allowlisted synthetic fixture IDs for future review, blocked capabilities, safety boundaries, expected trace event types, expected finding categories, limitations, and not-implemented capabilities. The endpoint does not execute actions, read files, write files, call tools, start workers, make network requests, call MCP servers, call models, send email, query databases, or contact external systems.

`GET /runs/:id/comparison` accepts a replay run ID, follows its `baselineRunId`, and returns a typed baseline-vs-replay summary. The comparison includes status, score, finding count, trace event count, matching trace event types, missing expected trace event types, new trace event types, and a `mockOnly: true` flag. It compares two synthetic mock runs only; it does not prove that a real mitigation worked.

`pnpm failsafe replay <regression-id>` calls the running mock API, polls the replay run until it leaves `queued` or `running`, then prints the replay run ID, status, baseline run ID, scenario pack ID, score, finding count, trace event count, and a mock-only safety statement. `pnpm failsafe regressions` lists in-memory artifacts so demo users can discover the exact regression ID to replay.

`POST /runner/dry-run` accepts a project ID, scenario pack ID, and a typed list of intended runner actions. It returns `executed: false`, `dryRunOnly: true`, per-action policy decisions, trace-like evidence, blocked action counts, approval requirements, not-implemented counts, and safety notes. The endpoint validates input but does not inspect arbitrary local files, run shell commands, make network calls, call MCP servers, call LLMs, send email, or touch databases. File writes, shell commands, network requests, email sends, and database queries are blocked. MCP tool calls and model calls are marked not implemented. Synthetic low-risk file-read intent can be modeled as policy-preview allowed without reading a file.

## Demo Narrative

Open the studio and show the FailSafe dashboard. The page loads the demo project, starter scenario packs, seeded run, findings, score, trace, and saved regressions from the API. Select a starter pack, click Run Crash Test, and watch the run move through queued and running states before it reaches needs_review. Click timeline events to inspect raw evidence, click finding cards to inspect root cause and mitigations, open Fix with Copilot to preview the bounded prompt payload, then Save Regression to create an in-memory mock regression artifact. Click Replay Mock on a saved artifact to rerun the same deterministic synthetic scenario through the safe mock replay endpoint. After replay completes, show the Baseline vs Replay panel and explain that it compares synthetic mock evidence only. Show the Runner Readiness panel and point out that Phase 3A can model deny-by-default policy decisions but cannot execute untrusted code. Show the Sandbox Planning panel, create a reviewed plan for the saved regression, and point out the blocked capabilities, fixture allowlist metadata, human-review requirement, and no-arbitrary-execution copy. Optionally run `pnpm failsafe regressions`, `pnpm failsafe replay <regression-id>`, `pnpm failsafe runner preview`, and `pnpm failsafe sandbox plan <regression-id>` while the API is running to show the same mock replay, dry-run policy preview, and plan-only sandbox review paths from the local CLI.

## Safety Disclaimer

FailSafe is defensive-use-only software. This repository uses synthetic examples and local mock agents. Do not use it against unauthorized systems, real secrets, real customer data, or live external targets. Dangerous actions must remain mocked unless an explicitly reviewed sandbox runner is available. Phase 3B sandbox plans are review artifacts only; they do not execute arbitrary code or prove runtime isolation.

The current score is an initial product heuristic for demos and prioritization. It is not a formal security standard and must not be presented as a guarantee of safety.

## Roadmap

- Phase 0: repository foundation, docs, schemas, mock UI, mock API.
- Phase 1: API-backed mock studio vertical slice with run lifecycle, evidence inspection, Copilot prompt preview, and regression artifacts.
- Phase 2: deterministic mock scenario engine and safe mock regression replay API.
- Phase 2.5: safe mock replay CLI plus baseline-vs-replay comparison endpoint and Studio panel.
- Phase 3A: reviewed dry-run runner contract, deny-by-default policy preview endpoint, CLI preview, and Studio readiness panel.
- Phase 3B: reviewed local sandbox replay plan foundation, API/CLI plan surfaces, and Studio sandbox planning panel.
- Phase 3C: reviewed fixture-only replay executor using hardcoded synthetic fixtures, still without arbitrary paths, shell, network, MCP, model, email, or database access.
- Phase 4: Patch Coach with Copilot prompts, mitigation plans, and regression generation.
- Phase 5: hackathon demo polish, architecture diagram, video script, and public repo cleanup.
