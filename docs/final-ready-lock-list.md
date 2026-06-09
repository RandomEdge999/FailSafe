# Final Ready Lock List

Date: 2026-06-09

This checklist is the repo-level lock list for preparing FailSafe for a public GitHub hackathon submission. It tracks what is implemented, what is verified locally, what is intentionally mocked, and what remains submitter-owned.

## Current Product Lock

- Product: FailSafe, a local defensive crash-test studio for AI agents.
- Tagline: Crash-test AI agents before production does.
- Current product mode: API-backed Crash Lab Studio with reviewed Microsoft Foundry manifest import, agent trust-boundary maps, Foundry manifest crash tests, Foundry fixture replay, Sample Lab scenarios, deterministic replay, reviewed fixture-only replay, Patch Coach, Safety Card export, and safe CLI.
- Persistence: app-owned `.failsafe-data`, ignored by Git.
- Protected local context file: `FailSafe_PRD.md`, intentionally untracked and not part of the public repo.

## GitHub Push Checklist

- [x] Public-facing README explains product, setup, endpoints, CLI, Copilot usage, screenshots, safety boundaries, and limitations.
- [x] MIT license is present.
- [x] GitHub Actions CI is present and runs `pnpm install --frozen-lockfile`, `pnpm check`, and `pnpm build`.
- [x] `.gitignore` excludes local logs, build outputs, node modules, local env files, and `.failsafe-data` while preserving `.env.example`.
- [x] Copilot instructions, prompt files, and custom agents are tracked.
- [x] Safety Card prompt is tracked.
- [x] Demo screenshots are tracked under `docs/assets/screenshots`.
- [x] Original generated brand assets are tracked under `docs/assets/brand` and `apps/studio-web/public/brand`.
- [x] Microsoft Foundry adapter contracts, API routes, CLI commands, and Studio panel are implemented without live tool execution.
- [x] No live integrations, real credentials, arbitrary execution, deployment infra, or auth are introduced.

## Local Verification Commands

These are the required lock commands for the final implementation pass:

```bash
pnpm install
pnpm check
pnpm build
```

Expected result: all pass.

Final pass evidence:

- `pnpm install`: passed. Lockfile was up to date.
- `pnpm check`: passed. Dev check validated scenario packs, seeded run, deterministic engine runs, replay schema, fixture replay, Patch Coach, report schema, comparison schema, runner dry-run policy, sandbox plan, CLI help, readiness artifacts, and safety guardrails. Workspace typechecks passed.
- Current pass addition: `pnpm check` also validates the Foundry sample manifest, Foundry readiness schema, agent trust-boundary schema, Foundry CLI help, and tracked brand assets.
- `pnpm build`: passed. All TypeScript packages built and the Next.js Studio production build completed.

## Required API Smoke

Run `pnpm dev:api`, then verify:

- `GET /health`
- `GET /foundry/readiness`
- `POST /foundry/manifest/import`
- `GET /agents`
- `GET /agents/:id/trust-map`
- `POST /agents/:id/crash-test`
- `POST /agents/:id/fixture-replay`
- `GET /projects`
- `GET /scenarios`
- `GET /runs`
- `POST /runs/mock`
- `GET /runs/:id`
- `POST /regressions/mock`
- `POST /regressions/:id/replay-mock`
- `GET /runs/:id/comparison`
- `POST /regressions/:id/sandbox-plan`
- `POST /regressions/:id/fixture-replay`
- `POST /runs/:id/patch-coach`
- `POST /runs/:id/report`
- `GET /reports`
- `POST /runner/dry-run`
- `POST /demo/reset`

Expected result: all return typed local defensive evidence or expected successful reset output.

Final pass evidence:

- API smoke passed against `http://localhost:4000`.
- Fresh mock run: `run-demo-tool-poisoning-c790aea4`, status `needs_review`.
- Saved regression: `regression-tool-poisoning-pack-regression-tool-poisoning-9db319`.
- Mock replay: `run-replay-tool-poisoning-a5187de2`, status `needs_review`.
- Comparison returned `mockOnly: true`.
- Sandbox plan returned `reviewStatus: human_review_required`.
- Fixture replay returned replay status `passed`.
- Patch Coach returned 3 Copilot prompt payloads.
- Safety report export returned `report-run-demo-tool-poisoning-c790aea4-20260609082136`.
- Dry-run runner returned `executed: false`.
- Demo reset returned `mode: local_demo_reset` and reset only app-owned data.
- Foundry readiness returns manifest-only mode unless optional env vars are configured.
- Foundry sample import returns a reviewed `microsoft_foundry` manifest with no stored credentials.
- Agent trust map returns typed user, instruction, tool, identity, and approval boundaries.
- Foundry crash test returns a persisted local run with trace evidence and findings.
- Foundry fixture replay returns a persisted passed local run without live tool execution.

## Required CLI Smoke

Run while the API is active:

```bash
pnpm failsafe --help
pnpm failsafe runs
pnpm failsafe regressions
pnpm failsafe replay --help
pnpm failsafe runner --help
pnpm failsafe runner preview
pnpm failsafe sandbox --help
pnpm failsafe sandbox plan <regression-id>
pnpm failsafe sandbox fixture-replay <regression-id>
pnpm failsafe patch-coach <run-id>
pnpm failsafe report <run-id>
pnpm failsafe reports
pnpm failsafe foundry --help
pnpm failsafe foundry readiness
pnpm failsafe foundry import-sample
pnpm failsafe agents
pnpm failsafe agent --help
pnpm failsafe agent trust-map <agent-id>
pnpm failsafe agent crash-test <agent-id>
pnpm failsafe agent fixture-replay <agent-id>
pnpm failsafe reset-demo-data
```

Expected result: commands succeed gracefully, print local evidence, and do not execute tools, shell commands, arbitrary file actions, network calls, MCP servers, model calls, Copilot, email, databases, or external systems.

Final pass evidence:

- All listed CLI smoke commands exited successfully while the API was running.
- `pnpm failsafe reset-demo-data` completed and preserved seed projects, seed scenarios, and the seeded run.

## Required Studio Smoke

Run `pnpm dev:api` and `pnpm dev:web`, then verify:

- Scenario packs load.
- Foundry readiness renders.
- Reviewed Foundry manifest imports.
- Agent trust-boundary map renders.
- Foundry crash test works.
- Foundry fixture replay works.
- Seeded timeline and event evidence render.
- Run Crash Test works.
- Finding detail opens.
- Fix with Copilot shows Patch Coach output.
- Save Regression works.
- Replay Mock works.
- Baseline vs Replay appears.
- Fixture Replay works.
- Sandbox Plan works.
- Safety Card export works.
- Runner Readiness renders.
- API-unavailable state remains friendly.
- Screenshots are captured from the real local Studio.

Final pass evidence:

- Browser smoke passed against `http://localhost:3000`.
- Verified scenario packs, event evidence, finding detail, Patch Coach, regression save, mock replay comparison, fixture replay, sandbox plan, Safety Card export, and Runner Readiness.
- Verified API-unavailable state renders friendly retry/setup copy when the API is stopped.
- Captured screenshots:
  - `docs/assets/screenshots/dashboard.png`
  - `docs/assets/screenshots/timeline-finding-detail.png`
  - `docs/assets/screenshots/patch-coach.png`
  - `docs/assets/screenshots/fixture-replay-comparison.png`
  - `docs/assets/screenshots/safety-card.png`
  - `docs/assets/brand/failsafe-logo.png`
  - `docs/assets/brand/crash-lab-hero.png`
- Stopped dev servers and confirmed ports `3000` and `4000` were clear.

## Submission Checklist

- [x] Working project in local repo.
- [x] Architecture diagram in README and `docs/architecture.md`.
- [x] Microsoft Foundry adapter and trust-boundary flow documented.
- [x] Demo script in `docs/demo-script.md`.
- [x] Screenshots in `docs/assets/screenshots`.
- [x] Defensive-only safety policy in `docs/safety-policy.md`.
- [x] Copilot usage is visible through `.github/copilot-instructions.md`, prompt files, custom agents, Patch Coach, and README.
- [ ] Final demo video URL added to hackathon submission.
- [ ] Team/member information added to hackathon submission form.
- [ ] Public repository URL submitted before the deadline.

## Intentional Future Work

- Real sandbox isolation with Docker, gVisor, or equivalent.
- Live MCP execution or introspection.
- Live Foundry agent execution beyond local opt-in readiness validation.
- Live model/provider integration.
- Live Copilot invocation from the app.
- OpenTelemetry export.
- Browser harness automation beyond local manual/browser smoke.
- Auth, queues, deployment infrastructure, and external persistence.

## Safety Lock

FailSafe remains defensive, local, typed, and reviewed. Foundry manifest mode, Sample Lab replay, and fixture replay are evidence for local product behavior only. They are not security certification, arbitrary sandbox execution, live Foundry execution, or proof that a real patched agent is safe.
