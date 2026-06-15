# Final Ready Lock List

Date: 2026-06-11

## Locked product claim

FailSafe is a local defensive crash-test studio for Microsoft Foundry and Copilot-style AI agents. It supports reviewed Foundry manifests, reviewed recorded agent evidence, trust-boundary maps, local crash tests, Patch Coach prompt payloads, regression artifacts, reviewed fixture replay, and Safety Card reports.

FailSafe remains defensive, local, typed, and reviewed.

Launch-mode state starts empty. Reviewed example fixtures exist for onboarding and smoke tests, but the app does not automatically seed sample production data.

The Studio exposes user-clicked `Use example manifest` and `Use example evidence` actions for the reviewed examples. These are explicit onboarding actions, not silent launch seeding.

## Locked non-claims

- No live Foundry execution.
- No connected Foundry run unless `FAILSAFE_ENABLE_LIVE_FOUNDRY=1` is intentionally set, local Azure credentials exist, and a reviewed integration is promoted.
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

Azure Developer CLI validation/deploy commands when `azd` is installed:

```bash
azd auth login
azd env new failsafe
azd up
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

- README with pitch, problem, solution, architecture, setup, tests, API/CLI examples, screenshots, evidence boundaries, and AI assistance disclosure.
- `docs/video-walkthrough.md` for a five-minute video.
- `docs/submission-checklist.md` for official-rule mapping.
- `docs/architecture.md`, `docs/design.md`, and `docs/safety-policy.md`.
- `.env.example` with no active secrets.
- Azure deployment assets: `azure.yaml`, `infra/main.bicep`, `.azure/deployment-plan.md`, and service Dockerfiles.
- Reviewed import examples: `examples/foundry-manifests/invoice-review-agent.json` and `examples/foundry-evidence/invoice-review-recording.json`.

## Submitter-owned items

- Public repository URL.
- Final video URL, maximum five minutes.
- Project description in the hackathon platform.
- Team/member information and Microsoft Learn usernames, if applicable.

## Protected local file

`FailSafe_PRD.md` is private local direction. It must remain untracked and unstaged.

## Final submission gates

- Confirm README includes `FAILSAFE_ENABLE_LIVE_FOUNDRY`, `/foundry/connected/probe`, and the hosted deployment review profile.
- Confirm hosted deployments keep `FAILSAFE_ENABLE_SAMPLE_DATA=0`.
- Confirm the video includes a real VS Code/GitHub Copilot Chat step using the Patch Coach payload.
