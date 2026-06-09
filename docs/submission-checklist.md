# Submission Checklist

This checklist maps FailSafe to the official Microsoft Agents League requirements and judging rubric researched on June 9, 2026.

## Official deliverables

Source: https://github.com/microsoft/Agents-League-AISF-Regulations/blob/main/OFFICIAL%20RULES.md

- Public GitHub repository: submitter-owned URL.
- Project description: use the README pitch/problem/solution sections.
- Demo video: maximum five minutes, use `docs/demo-script.md`.
- Architecture diagram: README Mermaid diagram and `docs/architecture.md`.
- Team/member information: submitter-owned, including Microsoft Learn usernames if applicable.

## Track fit

Source: https://github.com/microsoft/agentsleague/tree/main/starter-kits/1-creative-apps

FailSafe fits Creative Apps because it turns hidden agent safety review into an interactive, visual, developer-facing product. It includes GitHub Copilot-ready repository instructions, prompt files, custom agent instruction files, and Patch Coach payloads, while truthfully disclosing that the app does not invoke Copilot itself.

## Rubric mapping

- Accuracy and Relevance, 20 percent: addresses agent safety testing for Foundry/Copilot-style builders and runs as a working local product.
- Reasoning and Multi-step Thinking, 20 percent: maps manifests/evidence to trust boundaries, evaluates scenarios, creates findings, suggests mitigation, saves regressions, replays fixtures, and exports reports.
- Creativity and Originality, 15 percent: crash-test studio metaphor, timeline evidence, trust-boundary visualization, Patch Coach handoff, and Safety Card.
- User Experience and Presentation, 15 percent: Fluent-inspired Studio, responsive shell, keyboard-visible controls, refreshed screenshots, and five-minute script.
- Reliability and Safety, 20 percent: explicit blocked capabilities, local-only execution, schema validation, release checks, API smoke, CLI smoke, Studio smoke, and honest limitations.
- Community Vote, 10 percent: submitter-owned.

## AI assistance disclosure

Do not fabricate Copilot usage. The repo includes Copilot-ready prompts and Patch Coach payloads. The final submitter should disclose the real Copilot workflow used during development and video recording. This final completion pass used Codex locally.

## Final before submission

- Run all verification commands from `docs/final-ready-lock-list.md`.
- Confirm screenshots are refreshed.
- Confirm no `.env`, credentials, or `.failsafe-data` are tracked.
- Confirm `FailSafe_PRD.md` remains untracked.
- Confirm README limitations do not claim live Foundry execution.
