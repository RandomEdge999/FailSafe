# Safety Policy

## Defensive Use Only

FailSafe is a defensive crash-test studio for agent builders. It is intended to help developers find and fix safety failures in systems they own or are explicitly authorized to test.

## No Real Secrets

Do not commit, paste, upload, or run tests with real secrets, tokens, customer data, credentials, private keys, or production configuration.

## No Live Unauthorized Targets

FailSafe scenarios must not target live external systems without explicit authorization. The foundation project uses synthetic local examples only.

## No Destructive Tool Execution in Demo Mode

Demo mode must not perform destructive file, shell, email, network, database, or account actions. High-risk actions must remain mocked or blocked.

## App-Owned Local Persistence

FailSafe may persist local demo evidence only under the app-owned `.failsafe-data` directory. The API must not accept client-provided filesystem paths for persistence, report export, replay fixtures, or reset behavior.

Current persistence policy:

- Non-seed runs, regressions, sandbox plans, fixture replay results, and report metadata can be stored in `.failsafe-data/store.json`.
- Markdown Safety Cards can be written to `.failsafe-data/reports`.
- `POST /demo/reset` may reset only `.failsafe-data` state.
- No source files, arbitrary user paths, secrets, external databases, shell commands, or network resources may be touched by persistence flows.

## Dry-Run Runner Contract

Phase 3A dry-run runner output is a policy preview only. It must always report `executed: false` and `dryRunOnly: true`.

Current dry-run policy:

- Synthetic low-risk file-read intent may be modeled without reading local files.
- Non-synthetic file-read intent requires explicit approval before any future execution path.
- File writes, shell commands, network requests, email sends, and database queries are blocked.
- MCP tool calls and model calls are not implemented.
- Dry-run policy decisions are not runtime isolation proof.

Do not convert dry-run preview decisions into real execution unless an explicitly reviewed sandbox runner, authorization model, and approval gate exist.

## Reviewed Sandbox Replay Plan And Fixture Replay

Phase 3B sandbox replay output is a reviewed plan only. It must report `mode: plan_only`, `mockOnly: true`, `fixtureOnly: true`, `reviewStatus: human_review_required`, and `requiresHumanReview: true`.

Current sandbox plan policy:

- The plan endpoint may look up only the local FailSafe regression, baseline run, project, scenario pack, and agent target context.
- Allowed fixture IDs are synthetic allowlist metadata.
- No arbitrary file paths, URLs, shell commands, tool names, MCP calls, model calls, email targets, database targets, secrets, or live targets may be accepted from the client.
- Arbitrary file reads, arbitrary file writes, shell commands, network requests, live target access, MCP tool calls, model calls, email sends, database queries, destructive operations, secret access, and background workers remain blocked or not implemented.
- Sandbox plans are not runtime isolation proof and are not evidence that a real code mitigation worked.

Current fixture replay policy:

- Fixture replay may run only from a saved local regression and generated sandbox plan.
- Fixture replay must use FailSafe-owned synthetic fixture IDs only.
- Fixture replay must not accept paths, URLs, commands, arbitrary tool names, live targets, MCP servers, models, email destinations, database targets, or secrets from the client.
- Fixture replay may create a typed synthetic replay run, comparison evidence, and reportable local evidence.
- Fixture replay is not arbitrary sandbox execution, patched-agent execution, or runtime isolation proof.

Do not convert sandbox plans or fixture replay into real sandbox execution unless the authorization model, isolation layer, approval gate, fixture allowlist, and audit trail are explicitly reviewed and validated first.

## Patch Coach And Reports

Patch Coach may generate Copilot-ready prompt payloads, mitigation steps, and regression checklists. It must not invoke Copilot, modify files, call models, or apply patches from the app.

Safety Cards may summarize typed local run evidence and write Markdown under `.failsafe-data/reports`. They must state limitations and must not claim certification, full coverage, or real mitigation proof.

## Synthetic Examples Only

Starter scenario packs must use synthetic examples:

- Fake invoices.
- Fake tool metadata.
- Fake approval requests.
- Mock MCP servers.
- Mock agent targets.

Scenario packs must not include real exploit deployment steps or instructions for attacking real systems.

## Human Approval for Dangerous Actions

Any future dangerous or irreversible action must require explicit human approval and must emit trace evidence. Approval cannot be implied by untrusted content.

## Responsible Disclosure

If FailSafe is later used to discover a real vulnerability, follow responsible disclosure practices, respect scope and authorization, and avoid publishing operational details that enable misuse.

## Contest Content Compliance

Hackathon demos must remain defensive, safe, and synthetic. Do not show real secrets, live unauthorized targets, destructive execution, or offensive operational guidance.
