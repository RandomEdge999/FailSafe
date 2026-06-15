# Build Plan

FailSafe is now in final launch-readiness mode for a Microsoft Agents League Creative Apps submission. It runs locally, includes Azure Container Apps deployment assets, and starts with an empty evidence store unless reviewed JSON data is explicitly imported.

## Completed

- Monorepo structure with Next.js Studio, Fastify API, shared schemas, scenario engine, scoring engine, and trace helpers.
- Fluent-inspired Studio redesign.
- App-owned product mark and trust-boundary visual.
- Foundry readiness validation.
- Gated connected Foundry probe/run metadata endpoints, disabled by default.
- Foundry manifest import.
- Recorded agent evidence import.
- User-provided reviewed JSON import through Studio file controls.
- Explicit Studio sample import buttons for reviewed app-owned manifest/evidence examples.
- Agent inventory and detail surfaces.
- Trust-boundary map.
- Foundry manifest crash test.
- Recorded-evidence crash test.
- Reviewed fixture replay.
- Sample Lab compatibility routes gated behind `FAILSAFE_ENABLE_SAMPLE_DATA=1`.
- Five defensive scenario packs: tool metadata poisoning, indirect prompt injection, approval bypass, tool-output injection, and data-exfiltration attempt.
- Findings, timeline evidence, scoring, Patch Coach, regressions, replay comparison, sandbox plans, and Safety Cards.
- CLI for the same API-backed workflows.
- Release check, API smoke, CLI smoke, and Studio browser smoke.
- Azure Developer CLI deployment assets: `azure.yaml`, `infra/main.bicep`, and service Dockerfiles.
- README, video script, architecture, design, safety, PRD summary, final lock list, and submission checklist.

## Verification gates

```bash
pnpm install
pnpm check
pnpm build
pnpm release:check
pnpm smoke:api
pnpm smoke:cli
pnpm smoke:studio
```

## Intentional future work

- Real sandbox isolation with explicit review.
- Live Foundry execution with credential-free storage, no tools, no MCP, no arbitrary targets, and verifiable no-side-effect behavior.
- OpenTelemetry export.
- Authentication, managed multi-user persistence, and production identity.
- Optional external persistence.

These are future work because the final submission must not overclaim live execution.
