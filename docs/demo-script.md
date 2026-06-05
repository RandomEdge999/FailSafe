# Five-Minute Hackathon Demo Script

## 0:00 - Problem Intro

Agents can read files, call tools, retrieve documents, and use MCP servers. That power creates new failure paths: poisoned tool metadata, indirect prompt injection, missing approvals, and task drift. FailSafe crash-tests agents before production does.

## 0:30 - Import Vulnerable Agent

Open the FailSafe Studio dashboard. Show the selected `Vulnerable Invoice Agent` demo target. Point out tools, MCP metadata, approval coverage, and mock mode.

## 1:00 - Run Crash Test

Select the Tool Poisoning Pack and click Run Crash Test. Explain that this is a synthetic defensive scenario using mock MCP metadata.

## 1:30 - Watch Failure Timeline

Walk through the timeline:

- Project imported.
- Tool metadata discovered.
- Prompt assembled without enough provenance separation.
- Approval skipped.
- Policy blocks the risky action.
- Finding is created.

Highlight the trust-boundary labels.

## 2:20 - Show Scorecard

Show the FailSafe score and factor breakdown. Explain that the score is a product heuristic, not a certification.

## 2:50 - Generate Mitigation

Open or reference the Fix with Copilot action. Explain that Copilot receives a bounded prompt with trace evidence, root cause, and allowed mitigation patterns.

## 3:30 - Rerun Test

Describe the planned rerun flow: after patching metadata separation and approval gates, rerun the same scenario and compare the timeline.

## 4:10 - Show Regression Saved

Use the Save Regression action as the planned end state. The failed scenario becomes a regression case so the team can prevent reintroducing the same bug.

## 4:40 - Microsoft and Copilot Angle

Close with the project fit:

- Built for agent builders.
- Uses GitHub Copilot instructions, prompt files, and custom agent roles.
- Helps developers reason about reliability and safety.
- Turns AI safety from vague advice into a visible, repeatable workflow.
