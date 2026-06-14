# FailSafe

Crash-test AI agents before production does.

FailSafe is a Microsoft Foundry-ready crash-test studio for agent builders. It imports reviewed Foundry-style manifests or reviewed recorded agent evidence, maps trust boundaries, runs local defensive crash tests, produces findings, prepares Patch Coach prompt payloads, saves regressions, replays reviewed fixtures, and exports Safety Cards without executing live tools or storing credentials.

Launch-mode default: FailSafe starts with an empty evidence store. It does not silently seed sample production data. Reviewed example JSON files are included under `examples/` for onboarding and smoke tests, but they are imported only when a user, CLI command, or test explicitly loads them.

![FailSafe dashboard](docs/assets/screenshots/dashboard.png)

## 2-minute pitch

Agent teams can build powerful Copilot-style and Azure AI Foundry agents quickly, but their pre-release safety checks are often scattered across prompts, logs, manual reviews, and informal red-team notes. FailSafe turns those reviews into a visible operations loop:

1. Import a reviewed Foundry manifest or recorded agent evidence.
2. Map instructions, tools, identity, RBAC, observability, approvals, and trust boundaries.
3. Run local crash tests for prompt injection, tool metadata poisoning, approval bypass, tool-output injection, and data-exfiltration attempts.
4. Inspect timeline evidence and root-cause findings.
5. Generate Patch Coach mitigation prompts for human review.
6. Save a regression, replay reviewed fixtures, compare baseline vs replay evidence, and export a Safety Card.

## Problem

Modern agents read retrieved content, plan tool calls, use MCP metadata, rely on identity scopes, and sometimes perform state-changing actions. Failures often happen at trust boundaries: untrusted content influences planning, tool metadata changes the task, approval state is assumed instead of verified, or RBAC/tool scopes are broader than the task requires.

Teams need a way to test those boundaries before shipping, explain what failed, preserve evidence for review, and rerun the same case after mitigation. FailSafe provides that local product loop.

## Microsoft relevance

FailSafe is aligned to the Microsoft Agents League Creative Apps track and the current Microsoft agent ecosystem:

- Azure AI Foundry-style manifest import for model, instructions, tools, identity, RBAC, observability, approval gates, and runtime blockers.
- Recorded agent evidence import for reviewed Foundry-style traces or agent outputs when credentials are not available.
- Trust-boundary maps that mirror the Foundry need for traceable, reviewable agent behavior.
- Local crash tests and fixture replay that fit the trust lifecycle described by Microsoft Foundry: identify risk, evaluate, apply controls, observe, and improve.
- Patch Coach payloads and repository prompts that support GitHub Copilot-assisted remediation while keeping all code changes under human review.

Official research reflected in this repo:

- Microsoft Agents League rules: https://github.com/microsoft/Agents-League-AISF-Regulations/blob/main/OFFICIAL%20RULES.md
- Creative Apps starter kit: https://github.com/microsoft/agentsleague/tree/main/starter-kits/1-creative-apps
- Fluent 2 design principles: https://fluent2.microsoft.design/design-principles
- Fluent 2 accessibility guidance: https://fluent2.microsoft.design/accessibility
- Microsoft Foundry trust stack blog: https://devblogs.microsoft.com/foundry/build-2026-open-trust-stack-ai-agents/
- Foundry tracing guidance: https://learn.microsoft.com/en-us/azure/ai-foundry/agents/concepts/tracing

## What works now

- Fluent-inspired Studio shell with command bar, navigation rail, Foundry operations panel, crash timeline, evidence inspector, patch/regression workspace, and Safety Card workspace.
- Fastify orchestrator API with typed Zod contracts.
- Foundry readiness validation for optional environment configuration.
- Reviewed Foundry-style manifest import from user-provided JSON.
- Reviewed recorded agent evidence import from user-provided JSON request bodies or browser file upload.
- Explicit app-owned sample buttons for the reviewed Foundry manifest and reviewed recorded evidence. Samples are loaded only after a user action.
- Agent inventory and detail view.
- Trust-boundary map across user input, instructions, tools, identity/RBAC, approval gates, and policy decisions.
- Foundry manifest crash tests and fixture replay.
- Recorded-evidence crash tests.
- Gated connected Foundry probe/run endpoints that stay disabled by default and report that no live call was attempted.
- Sample Lab compatibility routes are disabled by default and require `FAILSAFE_ENABLE_SAMPLE_DATA=1`.
- Scenario packs for tool metadata poisoning, indirect prompt injection, approval bypass, tool-output injection, and data exfiltration.
- Findings, trace timeline, risk score, Patch Coach plans, regression artifacts, replay comparison, sandbox plan, fixture replay, and Safety Card reports.
- CLI coverage for readiness, manifest import, evidence import, trust maps, crash tests, fixture replay, Patch Coach, reports, runner dry-run, and reset.
- Azure Container Apps deployment scaffold through Azure Developer CLI.
- Release, API, CLI, and Studio smoke checks.

## Architecture

```mermaid
flowchart LR
  Studio[Next.js Studio] --> API[Fastify Orchestrator API]
  API --> Schemas[Shared Zod Schemas]
  API --> Foundry[Foundry Manifest and Evidence Adapter]
  API --> Engine[Scenario Engine]
  API --> Store[.failsafe-data Local Store]
  Foundry --> Trust[Trust-boundary Map]
  Engine --> Timeline[Trace Timeline]
  Engine --> Findings[Findings and Score]
  Engine --> Replay[Regression and Fixture Replay]
  Findings --> Patch[Patch Coach Prompt Payloads]
  Replay --> Report[Safety Card Markdown Export]
  Studio --> Azure[Azure Container Apps Deployment]
```

Repository layout:

```txt
apps/studio-web             Next.js Studio UI
apps/orchestrator-api       Fastify local orchestrator API
packages/schemas            Shared Zod schemas and TypeScript types
packages/attack-packs       Defensive scenario packs
packages/scenario-engine    Local crash-test, replay, Patch Coach, and sandbox-plan helpers
packages/scoring-engine     Crash-score heuristic
packages/trace-model        Trace and timeline helpers
examples/vulnerable-agent   Local Sample Lab fixture target
examples/foundry-manifests  Reviewed manifest JSON import examples
examples/foundry-evidence   Reviewed evidence JSON import examples
docs/                       Architecture, design, safety, demo, and submission materials
```

## Safety boundaries

FailSafe is defensive and local-first. The current product does not:

- execute arbitrary shell commands;
- read or write arbitrary user paths;
- store credentials;
- call live Foundry agents;
- call live LLM providers;
- execute MCP tools;
- test live external targets;
- send email;
- query or mutate databases;
- invoke GitHub Copilot from the app;
- claim fixture replay is production proof.

Sample Lab endpoints such as `POST /runs/sample-lab` and `POST /regressions/:id/replay-sample-lab` remain for deterministic local test coverage. Older `/mock` aliases are preserved for compatibility. These routes are disabled unless `FAILSAFE_ENABLE_SAMPLE_DATA=1` is set. Launch deployments should leave that flag disabled.

## Run locally

Prerequisites:

- Node.js 20 or newer
- pnpm 10 or newer

```bash
pnpm install
pnpm dev
```

Default local URLs:

- Studio: http://localhost:3000
- API health: http://localhost:4000/health

Run services separately:

```bash
pnpm dev:api
pnpm dev:web
```

Git Bash one-command local launch:

```bash
./start.sh
```

## Environment

`.env.example` contains local defaults only. Foundry variables are optional and commented because this repo performs manifest/evidence checks by default. Live Foundry remains disabled unless the backend flag is explicitly set for a reviewed local probe.

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
ORCHESTRATOR_API_BASE_URL=http://localhost:4000
ORCHESTRATOR_API_PORT=4000
FAILSAFE_ENABLE_SAMPLE_DATA=0
FAILSAFE_ENABLE_LIVE_FOUNDRY=0

# Optional server-side Foundry probe metadata:
# AZURE_FOUNDRY_PROJECT_ENDPOINT=
# AZURE_FOUNDRY_AGENT_ID=
# AZURE_TENANT_ID=
# AZURE_FOUNDRY_MODEL_DEPLOYMENT=
```

Do not commit `.env`, credentials, or live service endpoints.

## Azure deployment

The repo includes Azure Container Apps deployment scaffolding:

- `azure.yaml`
- `infra/main.bicep`
- `apps/orchestrator-api/Dockerfile`
- `apps/studio-web/Dockerfile`
- `.azure/deployment-plan.md`

Expected deploy path after installing Azure Developer CLI:

```bash
azd auth login
azd env new failsafe
azd env set AZURE_LOCATION <region>
azd up
```

Hosted launch mode should keep `FAILSAFE_ENABLE_SAMPLE_DATA=0`. The web container calls the API through same-origin `/api/failsafe/*`; `ORCHESTRATOR_API_BASE_URL` is injected into the web container at runtime by the infrastructure template.

Hosted mode is a hackathon demo scaffold, not a production SaaS deployment. The API has no authentication, app-owned local JSON persistence is ephemeral in Container Apps, and live Foundry execution remains blocked unless a reviewed server-side integration is promoted.

## Verification

```bash
pnpm install
pnpm check
pnpm build
pnpm release:check
pnpm smoke:api
pnpm smoke:cli
pnpm smoke:studio
```

`pnpm release:check` validates required docs/assets, local markdown links, screenshot references, secret patterns, active `.env` absence, and product-facing copy guardrails. `pnpm smoke:studio` starts the local API and Studio, drives the real browser flow with Playwright, checks keyboard focus and mobile overflow, and refreshes tracked screenshots.

## CLI examples

Start the API first:

```bash
pnpm dev:api
```

Then run:

```bash
pnpm failsafe foundry readiness
pnpm failsafe foundry import-sample
pnpm failsafe agents
pnpm failsafe agent trust-map <agent-id>
pnpm failsafe agent crash-test <agent-id> pack-tool-poisoning
pnpm failsafe agent fixture-replay <agent-id> pack-tool-poisoning
pnpm failsafe evidence import-sample
pnpm failsafe evidence list
pnpm failsafe evidence crash-test <evidence-id> pack-tool-poisoning
pnpm failsafe runs
pnpm failsafe regressions
pnpm failsafe replay <regression-id>
pnpm failsafe sandbox plan <regression-id>
pnpm failsafe sandbox fixture-replay <regression-id>
pnpm failsafe patch-coach <run-id>
pnpm failsafe report <run-id>
pnpm failsafe reports
pnpm failsafe runner preview
pnpm failsafe reset-demo-data
```

`import-sample` commands are explicit onboarding shortcuts. Production-style browser use should import reviewed JSON files through the Studio or post validated JSON to the API.

## API examples

Import the reviewed Foundry-style manifest:

```bash
curl -s http://localhost:4000/foundry/manifest/import \
  -H "content-type: application/json" \
  --data-binary @examples/foundry-manifests/invoice-review-agent.json
```

Import reviewed recorded agent evidence:

```bash
curl -s http://localhost:4000/foundry/evidence/import \
  -H "content-type: application/json" \
  --data-binary @examples/foundry-evidence/invoice-review-recording.json
```

Run a local crash test for an imported agent:

```bash
curl -s http://localhost:4000/agents/<agent-id>/crash-test \
  -H "content-type: application/json" \
  -d "{\"scenarioPackId\":\"pack-tool-poisoning\"}"
```

Run a local recorded-evidence crash test:

```bash
curl -s http://localhost:4000/foundry/evidence/<evidence-id>/crash-test \
  -H "content-type: application/json" \
  -d "{\"scenarioPackId\":\"pack-tool-poisoning\"}"
```

Check the disabled connected Foundry gate:

```bash
curl -s http://localhost:4000/foundry/connected/probe
curl -s http://localhost:4000/foundry/connected/run \
  -H "content-type: application/json" \
  -d "{}"
```

Export a Safety Card:

```bash
curl -s http://localhost:4000/runs/<run-id>/report \
  -H "content-type: application/json" \
  -d "{}"
```

## Screenshots

![Foundry operations](docs/assets/screenshots/foundry-operations.png)

![Agent trust map](docs/assets/screenshots/agent-trust-map.png)

![Evidence readiness](docs/assets/screenshots/evidence-readiness.png)

![Crash-test result](docs/assets/screenshots/crash-test-result.png)

![Timeline and finding detail](docs/assets/screenshots/timeline-finding-detail.png)

![Patch Coach](docs/assets/screenshots/patch-coach.png)

![Fixture replay comparison](docs/assets/screenshots/fixture-replay-comparison.png)

![Safety Card export](docs/assets/screenshots/safety-card.png)

App-owned brand assets:

![FailSafe product mark](docs/assets/brand/failsafe-logo.png)

![FailSafe trust-boundary visual](docs/assets/brand/crash-lab-hero.png)

## Demo flow

1. Open the Studio.
2. Import the reviewed Foundry manifest or click Use sample manifest.
3. Load recorded evidence or click Use sample evidence.
4. Show readiness and blocked capabilities.
5. Show the trust-boundary map.
6. Run a recorded-evidence crash test.
7. Inspect the timeline and finding detail.
8. Open Fix with Copilot and show the Patch Coach prompt payload.
9. Save a regression.
10. Run reviewed fixture replay and show comparison evidence.
11. Export the Safety Card.
12. Run one or two CLI commands to prove the same API-backed flow works outside the browser.

The full five-minute script is in `docs/demo-script.md`.

## Hackathon judging criteria mapping

The official rules list Accuracy and Relevance, Reasoning and Multi-step Thinking, Creativity and Originality, User Experience and Presentation, Reliability and Safety, and Community Vote. FailSafe maps to those criteria in `docs/submission-checklist.md`.

Required submitter-owned items are not invented in this repo:

- public GitHub repository URL;
- demo video URL, maximum five minutes;
- architecture diagram in the submission;
- project description;
- team/member information and Microsoft Learn usernames, if applicable.

## How GitHub Copilot was used

FailSafe is designed for a real Copilot-assisted remediation moment in the submission video:

1. Run a crash test and open Fix with Copilot.
2. Copy the Patch Coach payload for the selected finding.
3. Paste that payload into VS Code with GitHub Copilot Chat.
4. Ask Copilot to draft a guardrail or regression test from the payload.
5. Show the human review step before accepting or adapting the suggestion.

Repository support for this workflow is included in `.github/copilot-instructions.md`, `.github/prompts/`, `agents/`, and the Patch Coach payloads generated by the Studio and CLI. FailSafe prepares Copilot-ready context; the app does not call Copilot or claim that Copilot authored code.

## AI assistance disclosure

This repository contains GitHub Copilot-ready instructions, prompt files, custom agent instruction files, and Patch Coach payloads. Those artifacts show how a submitter can use Copilot for bounded defensive remediation.

This final completion pass was implemented with Codex in a local repository. FailSafe itself does not invoke GitHub Copilot, does not prove Copilot authored code, and does not fabricate Copilot usage. The final hackathon submitter should disclose the actual Copilot usage performed during their own development and video recording.

## Known intentional limits

- Live Foundry execution is not implemented.
- Foundry connected validation, `GET /foundry/connected/probe`, and `POST /foundry/connected/run` are gated readiness paths. They make no network call and report `attemptedLiveCall: false` by default.
- Recorded evidence import accepts reviewed JSON only.
- Fixture replay uses reviewed app-owned fixtures only.
- Sample Lab compatibility routes require explicit opt-in and are not enabled in launch deployments.
- Patch Coach generates prompt payloads only.
- Safety Cards are local evidence summaries, not certifications.
- Authentication, external persistence, live MCP tools, live model calls, and real sandbox isolation are future work.

## License

MIT. See `LICENSE`.
