# Five-Minute Hackathon Demo Script

## 0:00 - Problem Intro

Agents can read files, call tools, retrieve documents, and use MCP servers. That power creates new failure paths: poisoned tool metadata, indirect prompt injection, missing approvals, and task drift. FailSafe crash-tests agents before production does.

## 0:30 - Import Vulnerable Agent

Open the FailSafe Studio dashboard. The page loads the `Vulnerable Invoice Agent`, starter scenario packs, seeded run, findings, trace, score, and saved regressions from the Fastify mock API. Point out tools, MCP metadata, approval coverage, and mock mode.

## 1:00 - Run Crash Test

Select the Tool Poisoning Pack and click Run Crash Test. Explain that this is a synthetic defensive scenario using mock MCP metadata. The new run is created through `POST /runs/mock` and the UI polls `GET /runs/:id` while it moves from queued to running to needs_review.

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

Click a finding card and show the detail panel: category, severity, confidence, status, root cause, evidence event IDs, recommended mitigations, generated Copilot prompt preview, and suggested regression name. Then click Fix with Copilot. Explain that the panel previews a bounded payload for `.github/prompts/patch-guardrail.prompt.md` with trace evidence and allowed mitigation patterns. No live code patch is executed from the UI in Phase 1.

## 3:30 - Rerun Test

Describe the planned rerun flow: after a developer reviews and applies a bounded mitigation, a future replay command will rerun the saved scenario and compare the timeline. The replay command is not implemented yet.

## 4:10 - Show Regression Saved

Click Save Regression. The UI calls `POST /regressions/mock`, then displays the saved in-memory artifact with finding count, trace event count, expected safe behavior, and a mock future replay command such as `pnpm failsafe replay tool-poisoning-pack-tool-poisoning-guardrail`.

## 4:40 - Microsoft and Copilot Angle

Close with the project fit:

- Built for agent builders.
- Uses GitHub Copilot instructions, prompt files, and custom agent roles.
- Helps developers reason about reliability and safety.
- Turns AI safety from vague advice into a visible, repeatable workflow.
