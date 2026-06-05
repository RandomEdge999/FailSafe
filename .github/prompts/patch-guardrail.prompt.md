# Patch Guardrail

Purpose: propose a safe, bounded mitigation patch for a FailSafe finding.

## Inputs

- Finding JSON.
- Evidence trace events.
- Relevant source files.
- Current architecture notes.
- Safety policy.

## Task

Propose a minimal defensive patch that addresses the root cause without broad rewrites or offensive behavior.

## Output

Return:

1. Root-cause summary.
2. Proposed patch scope.
3. Files to edit.
4. Implementation steps.
5. Tests or mock validation to add.
6. Regression scenario to rerun.
7. Risks and follow-up checks.

## Preferred Mitigation Patterns

- Approval gates.
- Scope minimization.
- Metadata pinning.
- Provenance separation.
- Trust-boundary labeling.
- Deny-by-default demo behavior.
- Regression tests for synthetic failures.

## Constraints

- Keep all dangerous actions mocked unless sandboxed.
- Do not add live external targets.
- Do not overclaim security guarantees.
- Update docs when architecture changes.
