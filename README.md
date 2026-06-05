# FailSafe: A Crash-Test Studio for AI Agents

Crash-test AI agents before production does.

FailSafe is a visual crash-test studio for AI agents and MCP toolchains. It helps developers import an agent project, map tools and trust boundaries, run defensive adversarial scenarios, visualize the failure timeline, score the risk, generate mitigation guidance, and rerun the same scenario as a regression case.

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
4. Run the agent in a controlled sandbox.
5. Watch the failure timeline.
6. Review the risk score and root-cause findings.
7. Generate a bounded mitigation plan.
8. Use Copilot-oriented prompts to patch the issue.
9. Rerun the same scenario.
10. Save the crash as a regression case.

## Current MVP Scope

The current Phase 1 slice includes a runnable API-backed mock studio, mock orchestrator API, shared Zod schemas, starter defensive scenario packs, a scoring heuristic, example vulnerable-agent inputs, in-memory mock run lifecycle state, in-memory regression artifacts, docs, Copilot instructions, prompt files, and custom agent instruction files.

It does not include real sandbox execution, live LLM calls, real MCP introspection or execution, PostgreSQL persistence, queues, authentication, deployment infrastructure, or destructive tool execution.

## Architecture Overview

```txt
apps/studio-web          Next.js dashboard and mock crash-lab UI
apps/orchestrator-api    Fastify mock API for projects, scenarios, runs, findings, and regressions
packages/schemas         Shared Zod schemas and TypeScript types
packages/attack-packs    Typed starter defensive scenario packs
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

Default local URLs:

- Studio: http://localhost:3000
- API health: http://localhost:4000/health
- Mock scenarios: http://localhost:4000/scenarios

## Mock API Endpoints

The studio loads data from the Fastify API by default at `http://localhost:4000`. Set `NEXT_PUBLIC_API_BASE_URL` to point the web app at a different mock API origin.

Implemented Phase 1 endpoints:

- `GET /health`
- `GET /projects`
- `GET /projects/:id`
- `GET /scenarios`
- `GET /scenarios/:id`
- `GET /runs`
- `GET /runs/:id`
- `POST /runs/mock`
- `GET /findings`
- `GET /findings/:id`
- `GET /regressions`
- `GET /regressions/:id`
- `POST /regressions/mock`

`POST /runs/mock` accepts:

```json
{
  "projectId": "project-vulnerable-agent",
  "scenarioPackId": "pack-tool-poisoning",
  "agentTargetId": "agent-invoice-reviewer"
}
```

It creates an in-memory mock run that moves from `queued` to `running` to `needs_review` when polled through `GET /runs/:id`.

`POST /regressions/mock` accepts a completed run ID and creates an in-memory mock regression artifact with a future replay command such as:

```bash
pnpm failsafe replay tool-poisoning-pack-tool-poisoning-guardrail
```

The replay CLI is not implemented yet.

## Demo Narrative

Open the studio and show the FailSafe dashboard. The page loads the demo project, starter scenario packs, seeded run, findings, score, trace, and saved regressions from the API. Select a starter pack, click Run Crash Test, and watch the run move through queued and running states before it reaches needs_review. Click timeline events to inspect raw evidence, click finding cards to inspect root cause and mitigations, open Fix with Copilot to preview the bounded prompt payload, then Save Regression to create an in-memory mock regression artifact.

## Safety Disclaimer

FailSafe is defensive-use-only software. This repository uses synthetic examples and local mock agents. Do not use it against unauthorized systems, real secrets, real customer data, or live external targets. Dangerous actions must remain mocked unless an explicitly reviewed sandbox runner is available.

The current score is an initial product heuristic for demos and prioritization. It is not a formal security standard and must not be presented as a guarantee of safety.

## Roadmap

- Phase 0: repository foundation, docs, schemas, mock UI, mock API.
- Phase 1: API-backed mock studio vertical slice with run lifecycle, evidence inspection, Copilot prompt preview, and regression artifacts.
- Phase 2: scenario engine for deterministic defensive crash-test execution.
- Phase 3: sandbox runner with strict isolation and dry-run defaults.
- Phase 4: Patch Coach with Copilot prompts, mitigation plans, and regression generation.
- Phase 5: hackathon demo polish, architecture diagram, video script, and public repo cleanup.
