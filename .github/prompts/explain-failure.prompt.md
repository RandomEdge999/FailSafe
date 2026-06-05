# Explain Crash-Test Failure

Purpose: explain a FailSafe crash-test failure from trace events.

## Inputs

- Scenario pack summary.
- `ScenarioRun` JSON.
- Relevant `TraceEvent` records.
- Existing `Finding` records, if any.

## Task

Explain what failed, why it failed, and which trust boundary was crossed. Keep the explanation defensive, bounded, and grounded in the provided trace evidence.

## Output

Return:

1. One-paragraph executive summary.
2. Timeline-based root cause.
3. Evidence event IDs.
4. Trust-boundary violation labels.
5. Severity and confidence rationale.
6. Defensive mitigation candidates.
7. Open questions for human review.

## Constraints

- Do not invent events that are not present in the trace.
- Do not provide real exploit deployment instructions.
- Do not target live systems.
- Prefer synthetic examples and local mock context.
- State uncertainty clearly when evidence is incomplete.
