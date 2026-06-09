# Five-Minute Hackathon Demo Script

## 0:00 - Problem Intro

Agents can read files, call tools, retrieve documents, and use MCP servers. That power creates new failure paths: poisoned tool metadata, indirect prompt injection, missing approvals, and task drift. FailSafe crash-tests agents before production does.

## 0:30 - Import Reviewed Foundry Agent

Open the FailSafe Crash Lab console. Point out the generated FailSafe logo, crash-lab visual treatment, Foundry readiness, missing optional Foundry env vars, and blocked operations. Click Import Foundry Manifest. Explain that this imports an app-owned reviewed Microsoft Foundry-style manifest with model, instructions, tools, identity/RBAC, observability, and runtime safety metadata. No credentials, live tools, MCP servers, shell commands, arbitrary files, email, databases, or external targets are executed.

Show the imported `Foundry Invoice Review Agent`, then open the trust-boundary map preview. Point out user input, reviewed instructions, tool calls, MCP metadata, identity, observability, and human approval gates.

## 1:00 - Run Crash Test

Select the Tool Poisoning Pack and click Crash-Test Foundry Agent or Run Crash Test. Explain that this is a defensive Foundry manifest crash test using reviewed agent metadata and local evidence. The run is created through `POST /agents/:id/crash-test`, persisted in `.failsafe-data`, and rendered through the same typed timeline as every FailSafe run.

## 1:30 - Watch Failure Timeline

Walk through the timeline:

- Reviewed Foundry manifest imported.
- Trust boundaries mapped from tools, MCP metadata, identity, and approval gates.
- Prompt assembled with explicit trusted and untrusted sections.
- Policy blocks connected execution and live tools.
- Finding is created from the modeled Foundry boundary.
- Mitigation prompt is prepared without invoking Copilot or executing a patch.

Highlight the trust-boundary labels. Click a timeline event and show event ID, actor, input source, parent event, metadata, and pretty-printed raw evidence.

## 2:20 - Show Scorecard

Show the FailSafe score and factor breakdown. Explain that the score is a product heuristic, not a certification.

## 2:50 - Generate Mitigation

Click a finding card and show the detail panel: category, severity, confidence, status, root cause, evidence event IDs, recommended mitigations, generated Copilot prompt preview, and suggested regression name. Then click Fix with Copilot. Explain that the API generates a typed Patch Coach plan with mitigation steps, Copilot prompt payloads, and a regression checklist. No live Copilot call or code patch is executed from the UI.

## 3:30 - Save, Replay, And Compare Regression

Click Save Regression. The UI calls `POST /regressions/mock`, then displays the saved local artifact with finding count, trace event count, expected safe behavior context, scenario engine version, and replay guidance. Explain that it is persisted under the app-owned `.failsafe-data` store.

Click Run Foundry Fixture Replay. The UI calls `POST /agents/:id/fixture-replay`; the API creates a reviewed local fixture replay run from app-owned evidence. Explain that this proves the local fixture path and evidence rendering, not production safety or live Foundry mitigation.

Then show the Sample Lab fallback controls. Click Replay Mock on a Sample Lab saved artifact. The UI calls `POST /regressions/:id/replay-mock`; the API verifies the artifact is mock replayable and reruns the same deterministic synthetic scenario with the saved seed. The replayed run appears in the same timeline and score panels.

Show the Baseline vs Replay panel. Explain that the UI calls `GET /runs/:id/comparison` for the replay run and compares status, score delta, finding count delta, trace event count delta, matching trace event types, missing expected trace event types, and new replay trace event types. Emphasize that this compares synthetic evidence only.

Click Fixture Replay on the same Sample Lab artifact. The UI calls `POST /regressions/:id/fixture-replay`; the API creates a reviewed fixture-only replay run from app-owned synthetic fixture IDs. Show the improved score and missing expected finding category in Baseline vs Replay. Explain that this is not arbitrary sandbox execution or real patched-agent proof.

## 4:20 - Runner And Sandbox Readiness

Show the Runner Readiness panel. Explain that Phase 3A adds a reviewed dry-run runner contract and deny-by-default policy preview, not real sandbox execution. Point out the current mode:

- mock + dry_run policy preview
- real sandbox execution: not implemented
- file writes: blocked
- shell commands: blocked
- network requests: blocked
- MCP execution: not implemented
- LLM calls: not implemented
- email and database actions: blocked

Explain that `POST /runner/dry-run` can model policy decisions and trace-like evidence for intended actions, but every result returns `executed: false` and `dryRunOnly: true`.

Show the Sandbox Planning panel. Generate a plan for the saved regression and point out:

- mode: plan_only
- review status: human_review_required
- allowed fixture IDs are synthetic allowlist metadata
- no arbitrary execution
- blocked shell, network, MCP, model, email, database, arbitrary file, destructive, secret, and background-worker capabilities
- real sandbox execution is not implemented

Explain that `POST /regressions/:id/sandbox-plan` prepares a reviewed plan from the local regression and baseline run. It does not execute tools, shell commands, file actions, network calls, MCP servers, model calls, email, databases, or external systems.

Export a Safety Card from the Reports and Data panel. Show the `.failsafe-data/reports` path and the Markdown preview. Point out what remains intentionally mocked or future work: no real sandbox isolation, live tools, arbitrary file operations, shell commands, network calls, LLM calls, MCP execution, Copilot invocation, email, database actions, auth, queues, or deployment infrastructure.

Optionally show the safe local CLI while the API is still running:

```bash
pnpm failsafe regressions
pnpm failsafe foundry readiness
pnpm failsafe foundry import-sample
pnpm failsafe agents
pnpm failsafe agent trust-map <agent-id>
pnpm failsafe agent crash-test <agent-id>
pnpm failsafe agent fixture-replay <agent-id>
pnpm failsafe replay <regression-id>
pnpm failsafe sandbox fixture-replay <regression-id>
pnpm failsafe patch-coach <run-id>
pnpm failsafe report <run-id>
pnpm failsafe runner preview
pnpm failsafe sandbox plan <regression-id>
```

Explain that the CLI only calls the local API and app-owned store. It does not execute tools, shell commands, arbitrary file actions, network requests, MCP servers, model calls, email, databases, or external systems. Fixture replay uses reviewed synthetic fixtures only.

## 4:45 - Microsoft and Copilot Angle

Close with the project fit:

- Built for Microsoft agent builders.
- Aligns with Foundry agent concepts: model, instructions, tools, identity, observability, runtime, and safety gates.
- Uses GitHub Copilot instructions, prompt files, and custom agent roles.
- Helps developers reason about reliability and safety before production.
- Turns AI safety from vague advice into a visible, repeatable workflow.

## Demo Screenshots

The tracked screenshots for README and submission prep are captured from the real local Studio:

- `docs/assets/screenshots/dashboard.png`
- `docs/assets/screenshots/timeline-finding-detail.png`
- `docs/assets/screenshots/patch-coach.png`
- `docs/assets/screenshots/fixture-replay-comparison.png`
- `docs/assets/screenshots/safety-card.png`
- `docs/assets/brand/failsafe-logo.png`
- `docs/assets/brand/crash-lab-hero.png`

Use these as backup assets for the final recording and submission page. The final video URL and team/member details are intentionally left to the submitter.
