import { createPatchCoachPlan } from "@failsafe/scenario-engine";
import type { PatchCoachPlan } from "@failsafe/schemas";
import { getRunById } from "./run-service";
import { getScenarioById } from "./scenario-service";

function requestError(message: string, code: string, statusCode: number) {
  const error = new Error(message);
  Object.assign(error, { code, statusCode });
  return error;
}

export function createPatchCoachForRun(
  runId: string,
  findingId?: string
): PatchCoachPlan {
  const run = getRunById(runId);

  if (!run) {
    throw requestError(`Run ${runId} was not found.`, "run_not_found", 404);
  }

  const finding = findingId
    ? run.findings.find((item) => item.id === findingId)
    : run.findings[0];

  if (!finding) {
    throw requestError(
      `Run ${runId} has no finding available for Patch Coach.`,
      "finding_not_found",
      404
    );
  }

  const scenarioPack = getScenarioById(run.scenarioPackId);

  if (!scenarioPack) {
    throw requestError(
      `Scenario pack ${run.scenarioPackId} was not found.`,
      "scenario_not_found",
      404
    );
  }

  return createPatchCoachPlan({
    run,
    finding,
    scenarioPack,
    createdAt: new Date().toISOString()
  });
}
