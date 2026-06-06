# Five-Minute Hackathon Demo Script

## 0:00 - Problem Intro

Agents can read files, call tools, retrieve documents, and use MCP servers. That power creates new failure paths: poisoned tool metadata, indirect prompt injection, missing approvals, and task drift. FailSafe crash-tests agents before production does.

## 0:30 - Import Vulnerable Agent

Open the FailSafe Studio dashboard. The page loads the `Vulnerable Invoice Agent`, starter scenario packs, seeded run, findings, trace, score, and saved regressions from the Fastify mock API. Point out tools, MCP metadata, approval coverage, and mock mode.

## 1:00 - Run Crash Test

Select the Tool Poisoning Pack and click Run Crash Test. Explain that this is a synthetic defensive scenario using mock MCP metadata. The new run is created through `POST /runs/mock`, the API calls the deterministic mock scenario engine, and the UI polls `GET /runs/:id` while it moves from queued to running to needs_review.

## 1:30 - Watch Failure Timeline

Walk through the timeline:

- Project imported.
- Tool metadata discovered or untrusted content loaded, depending on the selected pack.
- Prompt assembled with trust-boundary labels.
- Policy checks the synthetic unsafe plan.
- Policy blocks the risky action in mock mode.
- Finding is created.
- Mitigation prompt is prepared without executing a patch.

Highlight the trust-boundary labels. Click a timeline event and show event ID, actor, input source, parent event, metadata, and pretty-printed raw evidence.

## 2:20 - Show Scorecard

Show the FailSafe score and factor breakdown. Explain that the score is a product heuristic, not a certification.

## 2:50 - Generate Mitigation

Click a finding card and show the detail panel: category, severity, confidence, status, root cause, evidence event IDs, recommended mitigations, generated Copilot prompt preview, and suggested regression name. Then click Fix with Copilot. Explain that the panel previews a bounded payload for `.github/prompts/patch-guardrail.prompt.md` with trace evidence and allowed mitigation patterns. No live code patch is executed from the UI in Phase 2.

## 3:30 - Save, Replay, And Compare Regression

Click Save Regression. The UI calls `POST /regressions/mock`, then displays the saved in-memory artifact with finding count, trace event count, expected safe behavior context, scenario engine version, and a local mock replay endpoint.

Click Replay Mock on the saved artifact. The UI calls `POST /regressions/:id/replay-mock`; the API verifies the artifact is mock replayable and reruns the same deterministic synthetic scenario with the saved seed. The replayed run appears in the same timeline and score panels.

Show the Baseline vs Replay panel. Explain that the UI calls `GET /runs/:id/comparison` for the replay run and compares status, score delta, finding count delta, trace event count delta, matching trace event types, missing expected trace event types, and new replay trace event types. Emphasize that this compares two synthetic mock runs. It does not prove a real mitigation worked, and no patched-agent sandbox execution exists yet.

## 4:20 - Boundaries And Limitations

Point out what remains intentionally mocked: no real tools, file operations, shell commands, network calls, LLM calls, MCP execution, Copilot invocation, email, database actions, persistence, auth, queues, or deployment infrastructure.

Optionally show the safe local CLI while the API is still running:

```bash
pnpm failsafe regressions
pnpm failsafe replay <regression-id>
```

Explain that the CLI only calls the mock API, only works with in-memory regressions from the current API process, and does not execute tools or shell commands.

## 4:40 - Microsoft and Copilot Angle

Close with the project fit:

- Built for agent builders.
- Uses GitHub Copilot instructions, prompt files, and custom agent roles.
- Helps developers reason about reliability and safety.
- Turns AI safety from vague advice into a visible, repeatable workflow.
