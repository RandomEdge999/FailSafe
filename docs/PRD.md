# Product Requirements Summary

## Product

FailSafe is a local crash-test studio for AI agents. It helps Microsoft Foundry and Copilot-style agent builders review trust boundaries before shipping.

## Primary users

- Agent developers.
- AI platform engineers.
- Security reviewers.
- Hackathon judges evaluating a working Creative Apps submission.

## Primary job

Given a reviewed Foundry manifest or reviewed recorded agent evidence, FailSafe should show what the agent can do, where it crosses trust boundaries, what can fail, what mitigation is recommended, and what evidence should be preserved for review.

## Must have

- Foundry readiness screen.
- Manifest import.
- Recorded evidence import.
- Agent inventory.
- Agent detail and trust map.
- Local crash-test runner.
- Timeline and findings.
- Patch Coach handoff.
- Regression save.
- Reviewed fixture replay.
- Replay comparison.
- Safety Card export.
- CLI and API smoke coverage.
- Honest limitations and AI assistance disclosure.

## Must not

- Claim live Foundry execution without implementing and verifying it.
- Claim live GitHub Copilot usage from the app.
- Store credentials.
- Execute arbitrary shell commands.
- Read arbitrary paths.
- Call live tools, MCP servers, model providers, email, databases, or external targets.
- Present Sample Lab compatibility as real live data.

## Success criteria

- A judge understands the product in two minutes.
- The Studio flow works end to end in the browser.
- API and CLI smoke tests pass.
- Screenshots match the final UI.
- Docs map the project to official Microsoft Agents League requirements.
- Final git status is clean except private `FailSafe_PRD.md`.
