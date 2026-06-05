# Generate Regression Case

Purpose: turn a failed FailSafe scenario into a regression test.

## Inputs

- Failed `ScenarioRun` JSON.
- Finding details.
- Scenario pack definition.
- Expected safe behavior.
- Current project test conventions.

## Task

Create a regression case that reproduces the failure with synthetic inputs and asserts the expected safe behavior.

## Output

Return:

1. Regression test name.
2. Fixture data required.
3. Test steps.
4. Assertions.
5. Mocking strategy.
6. Files to add or update.
7. Notes for deterministic execution.

## Constraints

- Use synthetic inputs only.
- Do not touch real secrets or external systems.
- Do not execute destructive actions.
- Keep the test narrow and reproducible.
- Use shared schemas when validating trace, run, finding, or score data.
