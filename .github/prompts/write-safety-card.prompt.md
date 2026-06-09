# Write FailSafe Safety Card

Use this prompt to turn a completed FailSafe run, replay, or fixture replay into a concise Safety Card for human review.

## Inputs

- FailSafe run ID, project name, agent target, and scenario pack.
- Score, finding summary, trace evidence, replay comparison, and Patch Coach mitigation plan.
- Any saved regression ID or reviewed fixture replay result.

## Output

Write a Markdown Safety Card with:

- Project, agent target, scenario pack, run ID, and mode.
- What was tested.
- Key finding or pass result.
- Evidence from trace events.
- Mitigation guidance and regression checklist.
- Replay or fixture replay comparison summary.
- Safety boundaries and limitations.

## Guardrails

- Keep the card defensive, local, and evidence-based.
- Do not claim certification, full coverage, real runtime isolation, or real mitigation proof.
- Do not include secrets, customer data, live targets, external URLs, exploit steps, or destructive instructions.
- State when evidence is synthetic, mock-only, or reviewed fixture-only.
- Keep all recommendations bounded for human review before any patch is applied.
