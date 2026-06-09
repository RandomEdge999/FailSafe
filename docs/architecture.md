# Architecture

FailSafe is a local-first TypeScript monorepo for defensive agent safety testing. The primary product flow is Microsoft Foundry-style manifest import, reviewed recorded evidence import, trust-boundary mapping, local crash-test evaluation, Patch Coach handoff, regression capture, fixture replay, and Safety Card export.

```mermaid
flowchart LR
  Studio[Studio Web Console] --> API[Orchestrator API]
  API --> Foundry[Foundry Manifest Adapter]
  API --> Evidence[Recorded Evidence Adapter]
  API --> Engine[Scenario Engine]
  API --> Store[.failsafe-data]
  Foundry --> Trust[Trust Map]
  Evidence --> Trust
  Engine --> Timeline[Timeline Evidence]
  Engine --> Finding[Findings]
  Finding --> Patch[Patch Coach]
  Engine --> Regression[Regression Artifact]
  Regression --> Replay[Reviewed Fixture Replay]
  Replay --> Report[Safety Card]
```

## Apps

`apps/studio-web` is the Next.js Studio. It uses a Fluent-inspired operations shell with a command bar, left navigation rail, primary workspace, and right evidence inspector. The first workflow is Foundry evidence: readiness, manifest import, recorded evidence import, agent inventory, trust map, and crash-test actions.

`apps/orchestrator-api` is the Fastify API. It owns health, Foundry readiness, connected validation, manifest import, evidence import, agents, trust maps, projects, scenarios, runs, findings, regressions, fixture replay, Patch Coach, reports, runner dry-run, and reset routes.

## Packages

`packages/schemas` contains the shared Zod contracts. The release path validates Foundry manifests, recorded evidence captures, trust maps, crash-test runs, regressions, fixture replay, sandbox plans, Patch Coach plans, and Safety Cards.

`packages/scenario-engine` creates deterministic local crash-test evidence, replay comparison, reviewed fixture replay, Patch Coach guidance, dry-run runner decisions, and reviewed sandbox plans. It does not call external systems.

`packages/attack-packs` contains defensive starter scenarios for tool metadata poisoning, indirect prompt injection, and approval bypass.

`packages/scoring-engine` contains the FailSafe score heuristic. It is a prioritization aid, not a formal standard.

## Evidence modes

FailSafe separates evidence modes explicitly:

- `recorded_agent_evidence`: reviewed JSON-body evidence imported locally and evaluated without credentials, paths, URLs, tools, or network.
- `foundry_manifest`: reviewed Foundry-style manifest analysis and modeled crash test.
- `reviewed_fixture_replay`: local replay against app-owned fixture IDs after a regression is saved.
- `sample_lab_fallback`: deterministic local fallback exposed through compatibility route names.

## Foundry workflow

1. `GET /foundry/readiness` checks optional environment variable readiness.
2. `POST /foundry/manifest/import` imports a reviewed manifest body or the app-owned sample manifest.
3. `POST /foundry/evidence/import` imports reviewed JSON-body evidence.
4. `GET /agents` lists imported manifest-backed agents.
5. `GET /agents/:id/trust-map` maps user input, instructions, tools, identity/RBAC, approval gates, and policy boundaries.
6. `POST /agents/:id/crash-test` creates local trace evidence and findings from the reviewed manifest.
7. `POST /foundry/evidence/:id/crash-test` creates local trace evidence and findings from recorded evidence.
8. `POST /agents/:id/fixture-replay` creates local passed fixture evidence for a reviewed manifest.
9. `POST /runs/:id/report` exports the Safety Card.

Connected Foundry validation remains readiness-only. It validates local configuration presence and does not call Foundry.

## Compatibility routes

These route names remain for earlier scripts and compatibility:

- `POST /runs/mock`
- `POST /regressions/mock`
- `POST /regressions/:id/replay-mock`

The Studio and docs call this path Sample Lab compatibility. It is deterministic local fallback only.

## Persistence

The API persists user-created local evidence in `.failsafe-data`, which is ignored by git. It stores runs, Foundry imports, recorded evidence captures, regressions, sandbox plans, fixture replay results, and reports. Reset clears only this app-owned store and preserves seeded fixtures.

## Safety model

The current architecture blocks arbitrary shell execution, arbitrary path access, credential storage, live Foundry calls, live MCP execution, live model calls, email/database side effects, and external target testing. All high-risk activity is represented as reviewed local evidence, typed policy decisions, or blocked capabilities.
