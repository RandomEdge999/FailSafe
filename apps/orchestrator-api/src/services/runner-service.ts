import { previewDryRunRunner } from "@failsafe/scenario-engine";
import {
  RunnerDryRunInputSchema,
  type RunnerDryRunInput,
  type RunnerDryRunResult
} from "@failsafe/schemas";
import { getProjectById } from "./project-service";
import { getScenarioById } from "./scenario-service";

function requestError(message: string, code: string, statusCode: number) {
  const error = new Error(message);
  Object.assign(error, { code, statusCode });
  return error;
}

export function createRunnerDryRunPreview(
  input: RunnerDryRunInput
): RunnerDryRunResult {
  const parsed = RunnerDryRunInputSchema.parse(input);
  const project = getProjectById(parsed.projectId);

  if (!project) {
    throw requestError(
      `Project ${parsed.projectId} was not found.`,
      "project_not_found",
      404
    );
  }

  const scenarioPack = getScenarioById(parsed.scenarioPackId);

  if (!scenarioPack) {
    throw requestError(
      `Scenario pack ${parsed.scenarioPackId} was not found.`,
      "scenario_not_found",
      404
    );
  }

  return previewDryRunRunner(parsed);
}
