# Safety Policy

## Defensive Use Only

FailSafe is a defensive crash-test studio for agent builders. It is intended to help developers find and fix safety failures in systems they own or are explicitly authorized to test.

## No Real Secrets

Do not commit, paste, upload, or run tests with real secrets, tokens, customer data, credentials, private keys, or production configuration.

## No Live Unauthorized Targets

FailSafe scenarios must not target live external systems without explicit authorization. The foundation project uses synthetic local examples only.

## No Destructive Tool Execution in Demo Mode

Demo mode must not perform destructive file, shell, email, network, database, or account actions. High-risk actions must remain mocked or blocked.

## Dry-Run Runner Contract

Phase 3A dry-run runner output is a policy preview only. It must always report `executed: false` and `dryRunOnly: true`.

Current dry-run policy:

- Synthetic low-risk file-read intent may be modeled without reading local files.
- Non-synthetic file-read intent requires explicit approval before any future execution path.
- File writes, shell commands, network requests, email sends, and database queries are blocked.
- MCP tool calls and model calls are not implemented.
- Dry-run policy decisions are not runtime isolation proof.

Do not convert dry-run preview decisions into real execution unless an explicitly reviewed sandbox runner, authorization model, and approval gate exist.

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
