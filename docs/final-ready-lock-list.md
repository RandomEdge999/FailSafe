# Final Ready Lock List

Date: 2026-06-09

## Locked product claim

FailSafe is a local defensive crash-test studio for Microsoft Foundry and Copilot-style AI agents. It supports reviewed Foundry manifests, reviewed recorded agent evidence, trust-boundary maps, local crash tests, Patch Coach prompt payloads, regression artifacts, reviewed fixture replay, and Safety Card reports.

FailSafe remains defensive, local, typed, and reviewed.

## Locked non-claims

- No live Foundry execution.
- No live MCP execution.
- No live model calls.
- No app-invoked Copilot session.
- No arbitrary shell execution.
- No arbitrary file access.
- No credential storage.
- No email/database side effects.
- No external target testing.
- No security certification claim.

## Required commands

```bash
pnpm install
pnpm check
pnpm build
pnpm release:check
pnpm smoke:api
pnpm smoke:cli
pnpm smoke:studio
```

## Required screenshots

- `docs/assets/screenshots/dashboard.png`
- `docs/assets/screenshots/foundry-operations.png`
- `docs/assets/screenshots/agent-trust-map.png`
- `docs/assets/screenshots/evidence-readiness.png`
- `docs/assets/screenshots/crash-test-result.png`
- `docs/assets/screenshots/timeline-finding-detail.png`
- `docs/assets/screenshots/patch-coach.png`
- `docs/assets/screenshots/fixture-replay-comparison.png`
- `docs/assets/screenshots/safety-card.png`

## Required public materials

- README with pitch, problem, solution, architecture, setup, tests, API/CLI examples, screenshots, limitations, and AI assistance disclosure.
- `docs/demo-script.md` for a five-minute video.
- `docs/submission-checklist.md` for official-rule mapping.
- `docs/architecture.md`, `docs/design.md`, and `docs/safety-policy.md`.
- `.env.example` with no active secrets.

## Submitter-owned items

- Public repository URL.
- Final video URL, maximum five minutes.
- Project description in the hackathon platform.
- Team/member information and Microsoft Learn usernames, if applicable.

## Protected local file

`FailSafe_PRD.md` is private local direction. It must remain untracked and unstaged.
