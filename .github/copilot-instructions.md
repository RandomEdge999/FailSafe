# GitHub Copilot Instructions for FailSafe

FailSafe is a defensive crash-test studio for AI agents and MCP toolchains. Keep all work aligned with the tagline: "Crash-test AI agents before they reach production."

## Safety and Scope

- Keep FailSafe defensive and safety-focused.
- Never generate real exploit deployment instructions against real systems.
- Prefer synthetic examples, local review agents, local fixtures, and dry-run behavior.
- Keep dangerous actions mocked unless an explicitly reviewed sandbox runner exists.
- Do not add real credentials, tokens, customer data, or live external targets.
- Do not implement destructive file, shell, email, network, or database actions in local review mode.
- Do not describe the product as an offensive hacking toolkit.
- Do not overclaim security guarantees.

## Engineering Standards

- Use TypeScript, strong types, and Zod schemas.
- Keep `packages/schemas` as the source of truth for core entity contracts.
- Validate new scenario packs with schemas.
- Add tests, dev checks, or mock validation when adding scenario logic.
- Keep route handlers thin and put orchestration logic in services.
- Keep UI polished, readable, responsive, and presentation-ready.
- Prefer clear trust-boundary labels and root-cause evidence over generic warnings.
- Update docs when architecture or workflows change.

## Copilot Visibility

GitHub Copilot usage must be meaningful and visible for the Microsoft Agents League Hackathon. When adding mitigation or regression workflows, prefer reusing the prompt files in `.github/prompts/` and the custom agents in `agents/`.

Useful Copilot workflows:

- Explain a failure from trace events.
- Generate a regression case from a failed scenario.
- Propose a safe bounded guardrail patch.
- Create a synthetic defensive scenario pack.
- Update architecture docs after implementation changes.
