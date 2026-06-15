# Five-minute Video Walkthrough

Goal: show FailSafe as a Microsoft Foundry-ready crash-test studio that produces reviewed local evidence without claiming live Foundry execution or silently seeding production data.

## 0:00 to 0:30 - Set up the problem

"Agent builders can create Foundry and Copilot-style agents quickly, but trust-boundary failures still hide in logs: untrusted content influences planning, tool metadata changes intent, and approvals are assumed. FailSafe turns that into a crash-test workflow."

Show the Studio dashboard.

## 0:30 to 1:15 - Foundry evidence workflow

Click `Import manifest` and choose `examples/foundry-manifests/invoice-review-agent.json`, or click `Use example manifest` to load the same reviewed app-owned example.

Click `Load recorded evidence` and choose `examples/foundry-evidence/invoice-review-recording.json`, or click `Use example evidence` to load the same reviewed app-owned example.

Show readiness:

- manifest mode if Foundry env vars are absent;
- blocked capabilities include live tools, MCP execution, shell, arbitrary files, email, database, and external targets;
- recorded evidence is reviewed JSON import only.

Show agent inventory and recorded evidence cards.

## 1:15 to 2:00 - Trust map

Show the trust-boundary map.

Narration:

"FailSafe maps the agent like an operations review: user input, reviewed instructions, tool metadata, identity/RBAC, approval gate, and policy decision. This is why it is useful for Foundry and Copilot-style builders: it converts agent configuration into reviewable runtime boundaries."

## 2:00 to 2:50 - Crash test and finding

Click `Run Crash Test` for the recorded evidence path. If both manifest and evidence are loaded, the manifest card also has `Crash-test manifest` for the manifest-only path.

Open the crash timeline and finding detail.

Narration:

"This is not a live attack. It is reviewed recorded evidence evaluated locally. The timeline shows exactly where untrusted content, tool intent, or approval state crossed a boundary. The finding explains root cause and mitigation."

## 2:50 to 3:30 - Patch Coach

Click `Fix with Copilot`.

Show the Patch Coach plan and prompt payload.

Narration:

"FailSafe does not invoke Copilot or edit files. It prepares a bounded Copilot-ready prompt payload with evidence, constraints, and regression expectations. A developer reviews and applies any real patch."

Video proof moment: paste the Patch Coach payload into VS Code with GitHub Copilot Chat and show Copilot helping draft one guardrail or regression. Keep the narration clear that this is the real Copilot interaction; FailSafe only prepared the bounded context.

## 3:30 to 4:15 - Regression and replay

Click `Save Regression`.

Click `Fixture Replay`.

Show replay comparison.

Narration:

"The regression captures trace IDs, finding IDs, expected behavior, and engine version. Fixture replay uses reviewed app-owned fixtures only, so the team can show before/after evidence without executing live tools."

## 4:15 to 4:45 - Safety Card

Open `Safety card`.

Click `Export Safety Card`.

Show the report path and content.

Narration:

"The Safety Card states evidence mode, manifest or evidence IDs, boundaries, blocked capabilities, active controls, and human review requirements. It is a review artifact, not a certification."

## 4:45 to 5:00 - CLI evidence

Run one command while the API is active:

```bash
pnpm failsafe foundry readiness
pnpm failsafe evidence list
pnpm failsafe runs
```

Close:

"FailSafe fills the gap between building an agent and trusting it enough to ship: visible boundaries, local crash tests, regression evidence, and reviewable safety controls."
