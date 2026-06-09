# Build Plan

FailSafe is now in final local launch mode for a Microsoft Agents League Creative Apps submission.

## Completed

- Monorepo scaffold with Next.js Studio, Fastify API, shared schemas, scenario engine, scoring engine, and trace helpers.
- Fluent-inspired Studio redesign.
- App-owned product mark and trust-boundary visual.
- Foundry readiness validation.
- Foundry manifest import.
- Recorded agent evidence import.
- Agent inventory and detail surfaces.
- Trust-boundary map.
- Foundry manifest crash test.
- Recorded-evidence crash test.
- Reviewed fixture replay.
- Sample Lab compatibility route.
- Findings, timeline evidence, scoring, Patch Coach, regressions, replay comparison, sandbox plans, and Safety Cards.
- CLI for the same API-backed workflows.
- Release check, API smoke, CLI smoke, and Studio browser smoke.
- README, demo script, architecture, design, safety, PRD summary, final lock list, and submission checklist.

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
- Authentication and deployment infrastructure.
- Optional external persistence.

These are future work because the final submission must not overclaim live execution.
